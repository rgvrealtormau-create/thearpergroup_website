import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(specifier, context, next) {
  if (specifier === 'next/server') return next('next/server.js', context);
  if (/^\\.{1,2}\\//.test(specifier) && !/\\.[cm]?js$/.test(specifier)) {
    try { return await next(specifier + '.js', context); } catch {}
  }
  return next(specifier, context);
}`));

// Made-up stand-ins for the hosting settings; the real values are never in this repository.
process.env.RESEND_API_KEY = 'test-resend-key';
delete process.env.MUSE_LEAD_TOKEN;

const { POST } = await import('../app/api/muse-lead/route.js');
const { museLead, MUSE_SOURCES } = await import('../lib/museLeads.js');

function network() {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), body: init.body ? JSON.parse(init.body) : null });
    return { ok: true, status: 200, json: async () => ({ id: 'email-1' }), text: async () => '' };
  };
  return { brivity: () => calls.find((c) => c.url.startsWith('https://api.resend.com'))?.body, calls };
}
const meta = (html, name) => {
  const raw = (html.match(new RegExp(`<meta name="${name}" content="([^"]*)">`)) || [])[1];
  return raw === undefined ? raw : raw.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
};
const post = (body, headers = {}) => POST(new Request('https://www.thearpergroup.com/api/muse-lead', { method: 'POST', headers, body: JSON.stringify(body) }));

const ROW = {
  firstName: 'Ana', lastName: 'Garza', phone: '(956) 555-0100', email: 'ana@example.com',
  intent: 'Tenant', language: 'Spanish', channel: 'FB Marketplace',
  listingAddress: '123 Test St', listingCity: 'McAllen', listingPrice: '$1,900/mo', listingBeds: '3',
  description: 'Financing. Lender: no. Realtor: no. Timeline: next month.',
  alertAreas: 'McAllen, Edinburg', alertMinPrice: '$1,500', alertMaxPrice: '$2,000', alertMinBeds: '3',
};

test('a Muse renter row reaches Brivity with its plan source and the listing they asked about', async () => {
  const net = network();
  const res = await post(ROW);
  assert.equal(res.status, 200);
  const email = net.brivity();
  assert.ok(String(email.to).includes('brivity.com'));
  assert.equal(meta(email.html, 'lead_source'), 'ARPER Muse - Renter ES');
  assert.equal(meta(email.html, 'lead_type'), 'Tenant');
  assert.equal(meta(email.html, 'lead_phone'), '956-555-0100');
  assert.equal(meta(email.html, 'lead_property_address'), '123 Test St');
  assert.equal(meta(email.html, 'lead_property_city'), 'McAllen');
  assert.equal(meta(email.html, 'lead_property_price'), '$1,900/mo');
  const note = meta(email.html, 'lead_message');
  assert.ok(note.startsWith('Muse FB Marketplace lead (ES) — asked about 123 Test St, McAllen · $1,900/mo · 3 bd'), note);
  assert.ok(note.includes('listing alert wanted (areas: McAllen, Edinburg; price: $1,500 to $2,000; beds: 3+)'), note);
});

test('each intent and language picks one of the four Muse sources', () => {
  const got = [['Buyer', 'English'], ['Buyer', 'Spanish'], ['Tenant', 'English'], ['Tenant', 'Spanish']]
    .map(([intent, language]) => museLead({ ...ROW, intent, language }).lead.source);
  assert.deepEqual(got, MUSE_SOURCES);
});

test('a row without a phone or email, or with an unknown intent, is turned away and nothing is sent', async () => {
  const net = network();
  assert.equal((await post({ ...ROW, phone: '', email: '' })).status, 400);
  assert.equal((await post({ ...ROW, intent: 'Seller' })).status, 400);
  assert.equal(net.calls.length, 0);
});

test('with a token set, only a request carrying it gets through', async () => {
  process.env.MUSE_LEAD_TOKEN = 'made-up-test-token';
  try {
    const net = network();
    assert.equal((await post(ROW)).status, 401);
    assert.equal((await post(ROW, { 'x-muse-token': 'wrong' })).status, 401);
    assert.equal(net.calls.length, 0);
    assert.equal((await post(ROW, { 'x-muse-token': 'made-up-test-token' })).status, 200);
  } finally {
    delete process.env.MUSE_LEAD_TOKEN;
  }
});
