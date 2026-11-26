import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

// Same resolver as the other route tests: the route imports lib files without extensions.
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
process.env.PORTAL_SUPABASE_URL = 'https://portal-db.example';
process.env.PORTAL_SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key';
delete process.env.LEAD_ALERT_EMAILS;

const { POST } = await import('../app/api/lead/route.js');

function network() {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({ url: String(url), body });
    if (String(url).includes('/rpc/website_lead')) return { ok: true, status: 200, json: async () => ({ ok: true, id: 'lead-9', again: false }) };
    if (String(url).startsWith('https://api.resend.com')) return { ok: true, status: 200, json: async () => ({ id: 'email-1' }), text: async () => '' };
    return { ok: false, status: 500, json: async () => ({}), text: async () => '' };
  };
  const emails = () => calls.filter((c) => c.url.startsWith('https://api.resend.com')).map((c) => c.body);
  return {
    calls,
    brivity: () => emails().find((e) => String(e.to).includes('brivity.com')),
    alerts: () => emails().filter((e) => !String(e.to).includes('brivity.com')),
    portal: () => calls.find((c) => c.url.includes('/rpc/website_lead'))?.body,
  };
}
const meta = (html, name) => {
  const raw = (html.match(new RegExp(`<meta name="${name}" content="([^"]*)">`)) || [])[1];
  return raw === undefined ? raw : raw.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
};
const post = (body) => POST(new Request('https://www.thearpergroup.com/api/lead', { method: 'POST', body: JSON.stringify(body) }));
const DETAIL = 'Source: Contact page\nInterested in: Selling\nMessage: Thinking of listing in spring';

test('a seller on the contact form is filed as a seller lead, in the portal and Brivity alike', async () => {
  const net = network();
  const res = await post({ formType: 'contact', lang: 'en', name: 'Rosa Treviño', phone: '9565550123', email: 'rosa@example.com', interest: 'selling', detail: DETAIL });
  assert.equal(res.status, 200);
  const brivity = net.brivity();
  assert.equal(meta(brivity.html, 'lead_source'), 'ARPER Website - Seller EN');
  assert.equal(meta(brivity.html, 'lead_type'), 'Seller');
  assert.ok(meta(brivity.html, 'lead_message').startsWith('Contact form — Selling (EN)'));
  assert.ok(!/home valuation/i.test(brivity.html + brivity.text));
  const portal = net.portal();
  assert.equal(portal.source, 'ARPER Website - Seller EN');
  assert.ok(portal.message.includes('Thinking of listing in spring'), 'the inbox keeps what they wrote');
  const alerts = net.alerts();
  assert.equal(alerts.length, 1, 'one new-lead alert to the team');
  assert.equal(alerts[0].subject, 'New lead: Rosa Treviño — ARPER Website - Seller EN');
});

test('a Spanish buyer gets the ES buyer source; an unknown interest is ignored', async () => {
  const net = network();
  await post({ formType: 'contact', lang: 'es', name: 'Luis Peña', phone: '9565550101', interest: 'buying', detail: 'Source: Home page\nInterested in: Buying' });
  assert.equal(meta(net.brivity().html, 'lead_source'), 'ARPER Website - Buyer ES');
  assert.equal(meta(net.brivity().html, 'lead_type'), 'Buyer');

  const net2 = network();
  await post({ formType: 'contact', lang: 'en', name: 'Ana Garza', email: 'ana@example.com', interest: '<script>', detail: 'x' });
  assert.equal(meta(net2.brivity().html, 'lead_source'), 'ARPER Website - Buyer EN');
  assert.equal(meta(net2.brivity().html, 'lead_message'), 'Contact form (EN)');
});

test('the honeypot answers ok and sends nothing anywhere', async () => {
  const net = network();
  const res = await post({ formType: 'contact', lang: 'en', name: 'Bot', email: 'bot@example.com', interest: 'buying', botcheck: 'on' });
  assert.equal(res.status, 200);
  assert.equal(net.calls.length, 0);
});

test('a contact form with neither phone nor email is refused', async () => {
  network();
  const res = await post({ formType: 'contact', lang: 'en', name: 'No Contact', interest: 'buying' });
  assert.equal(res.status, 400);
});

const PITCH = "Source: Contact page\nInterested in: Buying\nMessage: Hi, you guys list homes right?\n\nIf you're still doing a lot of work like that there might be a very interesting conversation we could have about backing you guys.\n\nIt would be better to talk before Thanksgiving. Could I give you a call today? Just reply here with the best number to reach you.\n\nTalk soon,\nDaniel — New York Savings, NYC";

test('a sales pitch on the contact form is held: one marked email to the team, nothing to Brivity or the portal', async () => {
  const net = network();
  const res = await post({ formType: 'contact', lang: 'en', name: 'Daniel Edwards', phone: '6075550100', email: 'daniel@example.com', interest: 'buying', detail: PITCH });
  assert.equal(res.status, 200);
  assert.equal(net.brivity(), undefined, 'not sent to Brivity');
  assert.equal(net.portal(), undefined, 'not sent to the portal');
  const alerts = net.alerts();
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].subject, 'Held as possible spam: Daniel Edwards — ARPER Website - Buyer EN');
  assert.ok(alerts[0].text.includes('Not sent to Brivity'));
  assert.ok(alerts[0].text.includes('backing you guys'), 'the team still sees every word');
  assert.ok(!alerts[0].html.includes('Open in the portal'));
});

test('ordinary buyer messages are not held', async () => {
  for (const words of [
    'Do you guys have anything in Mission under 250k? Please call me after 5.',
    'Saw your listing on Zillow https://www.zillow.com/homedetails/123 and want a showing this weekend.',
    'Estamos buscando casa en McAllen, ¿me puedes llamar? Tenemos pre-aprobación del banco.',
    'Is your team available Saturday for a tour? We have a lender already.',
  ]) {
    const net = network();
    await post({ formType: 'contact', lang: 'en', name: 'Real Buyer', phone: '9565550144', interest: 'buying', detail: `Source: Contact page\nInterested in: Buying\nMessage: ${words}` });
    assert.ok(net.brivity(), `sent to Brivity: ${words}`);
  }
});
