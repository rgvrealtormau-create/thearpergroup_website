import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

// The route imports its lib files (and next/server) without extensions, which Next resolves;
// teach Node the same so the real route can run here.
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
const { northParkLeadAlert } = await import('../lib/northParkEmail.js');
const { metaAdAnswers, splitAnswers, callTimeAnswer } = await import('../lib/metaLeadAds.js');

const LISTING = 'c1fc085a-ef46-4ca6-aa8e-01437bcb26f7';
const DETAIL = 'North Park fourplex Meta lead ad (EN) — 11501 N 25th St — cash or financing: financing; pre-approved / proof of funds: yes, pre-approved; income or live-in: live in one unit; timeline: 1-3 months; call time: weekday evenings; consent: yes';

// Every outside call the route makes, answered and recorded.
function network() {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({ url: String(url), body });
    if (String(url).includes('/rpc/website_lead')) return { ok: true, status: 200, json: async () => ({ ok: true, id: 'lead-123', again: false }) };
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
const meta = (html, name) => (html.match(new RegExp(`<meta name="${name}" content="([^"]*)">`)) || [])[1];
const post = (body) => POST(new Request('https://www.thearpergroup.com/api/lead', { method: 'POST', body: JSON.stringify(body) }));

test('a North Park Meta lead is filed under its own source, linked to 11501 N 25th St, never as a home valuation', async () => {
  const net = network();
  const res = await post({ formType: 'northpark_meta_ad', lang: 'en', name: 'Ana Garza', email: 'ana@example.com', phone: '+19565550100', detail: DETAIL, listing: LISTING });
  assert.equal(res.status, 200);

  const brivity = net.brivity();
  assert.ok(brivity, 'the lead is emailed to Brivity');
  assert.equal(meta(brivity.html, 'lead_source'), 'ARPER Meta - North Park EN');
  assert.equal(meta(brivity.html, 'lead_type'), 'Buyer');
  assert.equal(meta(brivity.html, 'lead_email'), 'ana@example.com');
  assert.equal(meta(brivity.html, 'lead_property_address'), undefined, 'no home-valuation address');
  const note = meta(brivity.html, 'lead_message');
  assert.ok(note.startsWith('North Park fourplex Meta lead ad (11501 N 25th St) (EN) — cash or financing: financing;'), note);
  for (const answer of ['pre-approved / proof of funds: yes, pre-approved', 'income or live-in: live in one unit', 'timeline: 1-3 months', 'call time: weekday evenings', 'consent: yes']) {
    assert.ok(note.includes(answer), `note carries "${answer}"`);
  }
  assert.ok(!/home valuation/i.test(brivity.html + brivity.text));

  const portal = net.portal();
  assert.equal(portal.source, 'ARPER Meta - North Park EN');
  assert.equal(portal.listing, LISTING);
  assert.equal(portal.email, 'ana@example.com');
  assert.equal(portal.message, note, 'the inbox gets the note once, answers not repeated');

  const alerts = net.alerts();
  assert.equal(alerts.length, 1, 'one alert, and no Vittoria welcome or Vittoria alert');
  assert.equal(alerts[0].subject, 'New North Park lead: Ana Garza');
  assert.deepEqual(alerts[0].to, ['rgvrealtormau@gmail.com', 'pamelaperezrealtor@gmail.com']);
  assert.equal(alerts[0].reply_to, 'ana@example.com');
  assert.ok(alerts[0].html.includes('https://portal.thearpergroup.com/en/leads/lead-123'));
  assert.ok(alerts[0].text.includes('Call time: weekday evenings'));
  assert.ok(!/vittoria/i.test(JSON.stringify(alerts)));
});

test('the Spanish North Park form gets the ES source', async () => {
  const net = network();
  await post({ formType: 'northpark_meta_ad', lang: 'es', name: 'Luis Peña', phone: '9565550101', detail: 'North Park fourplex Meta lead ad (ES) — 11501 N 25th St — contado o financiamiento: financiamiento', listing: LISTING });
  assert.equal(meta(net.brivity().html, 'lead_source'), 'ARPER Meta - North Park ES');
  assert.equal(net.portal().source, 'ARPER Meta - North Park ES');
  assert.equal(net.alerts()[0].subject, 'New North Park lead: Luis Peña');
});

test('the Vittoria Meta ad is unchanged', async () => {
  const net = network();
  const detail = '¿cuándo te gustaría mudarte: en 1 a 3 meses; ¿ya trabajas con un agente de bienes raíces: no';
  await post({ formType: 'vittoria_meta_ad', lang: 'es', name: 'Maria Lopez', email: 'maria@example.com', phone: '9565550102', detail });
  const brivity = net.brivity();
  assert.equal(meta(brivity.html, 'lead_source'), 'ARPER Meta - Vittoria ES');
  assert.equal(meta(brivity.html, 'lead_message'), `Vittoria pre-sale Meta lead ad (ES) — ${detail}`);
  assert.equal(net.portal().message, `Vittoria pre-sale Meta lead ad (ES) — ${detail}`);
  const subjects = net.alerts().map((a) => a.subject);
  assert.ok(subjects.includes('New Vittoria lead: Maria Lopez'), 'Vittoria alert still sent');
  assert.equal(subjects.length, 2, 'Vittoria alert + welcome, nothing else');
  assert.ok(!subjects.some((s) => /North Park|New lead:/.test(s)));
});

test('an unknown form still falls back to home valuation (unchanged)', async () => {
  const net = network();
  await post({ formType: 'something_new', lang: 'en', name: 'Joe Smith', phone: '9565550103' });
  assert.equal(meta(net.brivity().html, 'lead_message'), 'Home valuation request (EN)');
});

test('the North Park alert lists every answer and handles a missing email and answers', () => {
  const pairs = splitAnswers(metaAdAnswers('northpark_meta_ad', DETAIL));
  assert.equal(pairs.length, 6);
  assert.deepEqual(pairs[0], ['cash or financing', 'financing']);
  assert.equal(callTimeAnswer(pairs), 'weekday evenings');
  const a = northParkLeadAlert({ name: 'Ana <b>G</b>', phone: '(956) 555-0100', email: null, lang: 'es', source: 'ARPER Meta - North Park ES', detail: DETAIL, portalId: null, submittedAt: '11/3/2026, 5:00 PM' });
  assert.ok(a.html.includes('Ana &lt;b&gt;G&lt;/b&gt;') && !a.html.includes('<b>G</b>'));
  assert.ok(a.html.includes('tel:+19565550100') && a.text.includes('Language: Spanish') && a.text.includes('Email: —'));
  assert.ok(a.html.includes('https://portal.thearpergroup.com/en/leads"'));
  assert.ok(northParkLeadAlert({ name: 'X Y', detail: '' }).text.includes('none came with this lead'));
});
