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

const { nextTextingWindow } = await import('../lib/textingHours.js');
const { sendBrivityEmail } = await import('../lib/brivity.js');
const { POST } = await import('../app/api/lead/route.js');

const at = (iso) => new Date(iso);
const iso = (d) => (d ? d.toISOString() : null);

test('texting window: Mon–Sat 9 am–9 pm, Sun noon–9 pm, McAllen time', () => {
  // Tue Dec 1 2026, 10:30 pm CST -> Wed 9:00 am CST
  assert.equal(iso(nextTextingWindow(at('2026-12-02T04:30:00Z'))), '2026-12-02T15:00:00.000Z');
  // Sat Dec 5 2026, 11 pm CST -> Sun noon CST
  assert.equal(iso(nextTextingWindow(at('2026-12-06T05:00:00Z'))), '2026-12-06T18:00:00.000Z');
  // Sun Dec 6 2026, 8 am CST -> Sun noon CST, the same day
  assert.equal(iso(nextTextingWindow(at('2026-12-06T14:00:00Z'))), '2026-12-06T18:00:00.000Z');
  // Mon Dec 7 2026, 2 pm CST -> now
  assert.equal(nextTextingWindow(at('2026-12-07T20:00:00Z')), null);
  // Edges: 9:00 am Monday is open, 8:59 pm is open, 9:00 pm is closed (Tue 9 am next)
  assert.equal(nextTextingWindow(at('2026-12-07T15:00:00Z')), null);
  assert.equal(nextTextingWindow(at('2026-12-08T02:59:00Z')), null);
  assert.equal(iso(nextTextingWindow(at('2026-12-08T03:00:00Z'))), '2026-12-08T15:00:00.000Z');
  // Mon 3 am -> Mon 9 am; Fri 11:30 pm -> Sat 9 am; Sun 11:59 am held, Sun noon open
  assert.equal(iso(nextTextingWindow(at('2026-12-07T09:00:00Z'))), '2026-12-07T15:00:00.000Z');
  assert.equal(iso(nextTextingWindow(at('2026-12-05T05:30:00Z'))), '2026-12-05T15:00:00.000Z');
  assert.equal(iso(nextTextingWindow(at('2026-12-06T17:59:00Z'))), '2026-12-06T18:00:00.000Z');
  assert.equal(nextTextingWindow(at('2026-12-06T18:00:00Z')), null);
});

test('texting window follows daylight saving time', () => {
  // Summer (CDT): Tue Jun 1 2027, 10:30 pm -> Wed 9:00 am CDT (14:00 UTC)
  assert.equal(iso(nextTextingWindow(at('2027-06-02T03:30:00Z'))), '2027-06-02T14:00:00.000Z');
  // Clocks spring forward Sun Mar 14 2027: Sat 10 pm CST -> Sun noon CDT (17:00 UTC)
  assert.equal(iso(nextTextingWindow(at('2027-03-14T04:00:00Z'))), '2027-03-14T17:00:00.000Z');
  // Clocks fall back Sun Nov 7 2027: Sat 10 pm CDT -> Sun noon CST (18:00 UTC)
  assert.equal(iso(nextTextingWindow(at('2027-11-07T03:00:00Z'))), '2027-11-07T18:00:00.000Z');
  // Sun Nov 1 2026 (fall back day), 1:30 am CST second pass -> noon CST
  assert.equal(iso(nextTextingWindow(at('2026-11-01T07:30:00Z'))), '2026-11-01T18:00:00.000Z');
});

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

test('the Brivity email is scheduled outside the window and sent at once inside it', async () => {
  const net = network();
  const night = await sendBrivityEmail({ firstName: 'ZZ', lastName: 'Test Night', email: 'zz@example.com', note: 'n', source: 'ARPER Website - Buyer EN', now: at('2026-12-02T04:30:00Z') });
  assert.equal(net.brivity().scheduled_at, '2026-12-02T15:00:00.000Z', 'test names wait too');
  assert.equal(night.scheduledAt, '2026-12-02T15:00:00.000Z');

  const net2 = network();
  await sendBrivityEmail({ firstName: 'Ana', lastName: 'Garza', email: 'ana@example.com', note: 'n', source: 'ARPER Website - Buyer EN', now: at('2026-12-07T20:00:00Z') });
  assert.equal(net2.brivity().scheduled_at, undefined);
});

test('a lead after hours: only the Brivity email waits; the portal says when it arrives', async () => {
  const RealDate = Date;
  const fixed = Date.parse('2026-12-02T04:30:00Z'); // Tue 10:30 pm CST
  globalThis.Date = class extends Date { constructor(...a) { super(...(a.length ? a : [fixed])); } static now() { return fixed; } };
  try {
    const net = network();
    await post({ formType: 'contact', lang: 'en', name: 'Rosa Treviño', phone: '9565550123', email: 'rosa@example.com', interest: 'buying', detail: 'Source: Contact page\nInterested in: Buying\nMessage: hi' });
    assert.equal(net.brivity().scheduled_at, '2026-12-02T15:00:00.000Z');
    for (const alert of net.alerts()) assert.equal(alert.scheduled_at, undefined, 'the team alert goes now');
    assert.ok(net.portal().message.includes('Reaches Brivity Wed 9:00 AM CT'), net.portal().message);
    assert.ok(net.calls.some((c) => c.url.includes('/rpc/website_lead')), 'the portal row is written now');
  } finally {
    globalThis.Date = RealDate;
  }
});

test('investment and flip calculators get the Investor source; others keep theirs', async () => {
  for (const [formType, lang, source] of [
    ['investment_property_calculator', 'en', 'ARPER Website - Investor EN'],
    ['flip_calculator', 'es', 'ARPER Website - Investor ES'],
    ['mortgage_calculator', 'en', 'ARPER Website - Buyer EN'],
    ['seller_net_proceeds_calculator', 'es', 'ARPER Website - Seller ES'],
    ['closing_cost_estimator', 'en', 'ARPER Website - Buyer EN'],
  ]) {
    const net = network();
    await post({ formType, lang, name: 'Calc User', phone: '9565550111' });
    assert.equal(meta(net.brivity().html, 'lead_source'), source, formType);
    assert.equal(net.portal().source, source);
  }
});

test('Vittoria forms carry the move timeline to Brivity, the portal and the team alert', async () => {
  const net = network();
  await post({ formType: 'vittoria', lang: 'en', name: 'Ana Garza', phone: '9565550123', email: 'ana@example.com', detail: 'Source: Vittoria page', moveTimeline: '1_3_months' });
  const note = meta(net.brivity().html, 'lead_message');
  assert.ok(note.endsWith('when are you hoping to move: In 1-3 months'), note);
  assert.ok(/1-3 months/i.test(note));
  assert.ok(net.portal().message.includes('when are you hoping to move: In 1-3 months'));
  const alert = net.alerts().find((a) => a.subject.startsWith('New Vittoria lead'));
  assert.ok(alert.text.includes('Hoping to move: In 1-3 months'));

  const es = network();
  await post({ formType: 'vittoria_brochure', lang: 'es', name: 'Luis Peña', phone: '9565550101', moveTimeline: 'just_looking' });
  const html = es.brivity().html;
  assert.ok(/^[\x00-\x7f]*$/.test(html), 'the Brivity email stays ASCII');
  assert.ok(meta(html, 'lead_message').endsWith('¿cuándo te gustaría mudarte: Solo estoy viendo'));
  assert.ok(/solo estoy viendo/i.test(meta(html, 'lead_message')));

  const mh = network();
  await post({ formType: 'vittoria_model_home', lang: 'es', name: 'Eva Ruiz', phone: '9565550102', moveTimeline: 'next_30_days' });
  assert.ok(meta(mh.brivity().html, 'lead_message').endsWith('¿cuándo te gustaría mudarte: En los próximos 30 días'));

  // Unknown values and the co-op agent form carry nothing.
  const odd = network();
  await post({ formType: 'vittoria', lang: 'en', name: 'Odd Value', phone: '9565550103', moveTimeline: '<b>soon</b>' });
  assert.ok(!/hoping to move/.test(meta(odd.brivity().html, 'lead_message')));
  const agent = network();
  await post({ formType: 'vittoria_agent', lang: 'en', name: 'Co Op', phone: '9565550104', moveTimeline: '1_3_months' });
  assert.ok(!/hoping to move/.test(meta(agent.brivity().html, 'lead_message')));
});
