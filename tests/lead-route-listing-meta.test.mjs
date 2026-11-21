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

process.env.RESEND_API_KEY = 'test-resend-key';
process.env.PORTAL_SUPABASE_URL = 'https://portal-db.example';
process.env.PORTAL_SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key';
delete process.env.LEAD_ALERT_EMAILS;

const { POST } = await import('../app/api/lead/route.js');
const { listingTrack, listingIntroEmail, META_LISTING_CAMPAIGNS } = await import('../lib/metaListingLeads.js');

const LISTING_1402 = 'f1fc39e9-860b-47ed-b566-ba0fc13e427f';
const answers = (o) => Object.entries(o).map(([k, v]) => `${k}: ${v}`).join('; ');
const EN = (o = {}) => answers({ 'cash or financing': 'Financing', 'pre-approved / proof of funds': 'Not yet', agent: 'No', timeline: '3–6 months', 'call time': 'Evening 5–7', consent: 'Yes', ...o });

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
    brivity: () => emails().find((e) => String(e.to).includes('brivity.com')),
    intro: () => emails().find((e) => Array.isArray(e.to) && e.to.length === 1 && !String(e.to[0]).includes('brivity.com') && !/rgvrealtormau/.test(e.to[0])),
    alerts: () => emails().filter((e) => Array.isArray(e.to) && e.to.includes('rgvrealtormau@gmail.com')),
    portal: () => calls.find((c) => c.url.includes('/rpc/website_lead'))?.body,
  };
}
// Brivity HTML is ASCII-only (non-ASCII sent as numeric entities); decode them back for assertions.
const meta = (html, name) => {
  const raw = (html.match(new RegExp(`<meta name="${name}" content="([^"]*)">`)) || [])[1];
  return raw === undefined ? raw : raw.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
};
const post = (body) => POST(new Request('https://www.thearpergroup.com/api/lead', { method: 'POST', body: JSON.stringify(body) }));

test('routing: agent first, then timeline, then cash or pre-approval, else nurture', () => {
  assert.equal(listingTrack(EN({ agent: 'Yes', timeline: 'Ready now (0–30 days)' })), 'agent');
  assert.equal(listingTrack(EN({ agent: 'Not yet, still looking for one' })), 'nurture');
  assert.equal(listingTrack(EN({ timeline: 'Ready now (0–30 days)' })), 'hot');
  assert.equal(listingTrack(EN({ timeline: '1–3 months' })), 'hot');
  assert.equal(listingTrack(EN({ timeline: 'Just researching', 'pre-approved / proof of funds': 'Yes, proof of funds' })), 'hot');
  assert.equal(listingTrack(EN({ 'cash or financing': 'Cash' })), 'hot');
  assert.equal(listingTrack(EN({ timeline: 'Just researching', 'cash or financing': 'Not sure yet' })), 'nurture');
  assert.equal(listingTrack(EN({ consent: 'No' })), 'no_consent');
  assert.equal(listingTrack(answers({ timeline: '1–3 months' })), 'no_consent', 'missing consent = no plan');
  // Meta's own exported values and the Spanish form
  assert.equal(listingTrack(EN({ timeline: '1-3_months' })), 'hot');
  assert.equal(listingTrack(answers({ 'cash or financing': 'Financiamiento', 'pre-approved / proof of funds': 'Todavía no', agent: 'Sí', timeline: 'En 1 a 3 meses', consent: 'Sí' })), 'agent');
  assert.equal(listingTrack(answers({ 'cash or financing': 'Contado', 'pre-approved / proof of funds': 'Todavía no', agent: 'Todavía no, estoy buscando uno', timeline: 'En 3 a 6 meses', consent: 'Sí' })), 'hot');
  assert.equal(listingTrack(answers({ 'cash or financing': 'Todavía no sé', 'pre-approved / proof of funds': 'Todavía no', agent: 'No', timeline: 'Nomás estoy investigando', consent: 'Sí' })), 'nurture');
});

test('a Hot 1402 lead: Hot source, answers in the note, linked listing, intro email and a call-first alert', async () => {
  const net = network();
  const res = await post({ formType: 'listing_meta_ad', campaign: 'tierra-encantada-1402', lang: 'en', name: 'Ana Garza', email: 'ana@example.com', phone: '(956) 555-0100', detail: EN({ timeline: '1–3 months' }) });
  assert.equal(res.status, 200);
  const brivity = net.brivity();
  assert.equal(meta(brivity.html, 'lead_source'), 'ARPER Meta Listing - Hot EN');
  const note = meta(brivity.html, 'lead_message');
  assert.ok(note.startsWith('1402 Tierra Encantada Meta lead ad — plan: Hot — lender for intros: Cross Country Mortgage (EN) — cash or financing: Financing;'), note);
  assert.ok(!/Angela|Salazar|Mortgage Pros/.test(JSON.stringify(net.alerts()) + net.intro().text), 'no Angela on 1402');
  assert.ok(note.includes('consent: Yes'));
  assert.equal(net.portal().listing, LISTING_1402);
  assert.equal(net.portal().source, 'ARPER Meta Listing - Hot EN');

  const intro = net.intro();
  assert.deepEqual(intro.to, ['ana@example.com']);
  assert.equal(intro.reply_to, 'rgvrealtormau@gmail.com');
  assert.equal(intro.subject, '1402 Tierra Encantada: details + private tour');
  for (const s of ['$405,000', 'Tierra Santa Golf Club', 'Alliance Real Estate Group', '4900 N 10th St Ste B4, McAllen, TX 78504', '(956) 201-8002', 'mauricio@thearpergroup.com', 'Licensed Texas Real Estate Sales Agent', 'https://www.thearpergroup.com/en/listings', 'Information About Brokerage Services', 'TREC Consumer Protection Notice']) {
    assert.ok(intro.text.includes(s), `intro has ${s}`);
  }
  assert.ok(!/broker\b/i.test(intro.text), 'never calls Mauricio a broker');

  const alerts = net.alerts();
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].subject, 'New 1402 Tierra Encantada lead (Hot): Ana Garza');
  assert.ok(alerts[0].text.startsWith('Hot plan — call within 5 minutes'));
  assert.ok(alerts[0].text.includes('Call time: Evening 5–7'));
  assert.ok(alerts[0].text.includes('Lender for intros: Cross Country Mortgage'));
});

test('a Spanish lead with an agent gets the Agent source and the showing-info email in Spanish, no call link', async () => {
  const net = network();
  await post({ formType: 'listing_meta_ad', campaign: 'tierra-encantada-1402', lang: 'es', name: 'Luis Peña', email: 'luis@example.com', phone: '9565550101', detail: answers({ agent: 'Sí', timeline: 'En 1 a 3 meses', consent: 'Sí' }) });
  assert.equal(meta(net.brivity().html, 'lead_source'), 'ARPER Meta Listing - Agent ES');
  const intro = net.intro();
  assert.equal(intro.subject, '1402 Tierra Encantada: información para ti y tu agente');
  assert.ok(intro.text.includes('ShowingTime') && intro.text.includes('Agente de bienes raíces con licencia en Texas'));
  assert.ok(!/visita privada|tour/i.test(intro.subject));
  const alert = net.alerts()[0];
  assert.ok(alert.text.startsWith('Has an agent'));
  assert.ok(!alert.html.includes('tel:'), 'no tap-to-call for a lead with an agent');
});

test('no consent: own source, no intro email, alert says do not call or text', async () => {
  const net = network();
  await post({ formType: 'listing_meta_ad', campaign: 'tierra-encantada-1402', lang: 'en', name: 'Joe Smith', email: 'joe@example.com', phone: '9565550103', detail: EN({ consent: 'No' }) });
  assert.equal(meta(net.brivity().html, 'lead_source'), 'ARPER Meta Listing - No Consent EN');
  assert.equal(net.intro(), undefined);
  assert.ok(net.alerts()[0].text.startsWith('No call/text consent'));
});

test('an unknown campaign still saves the lead with a plan source, but sends no intro email', async () => {
  const net = network();
  await post({ formType: 'listing_meta_ad', campaign: 'nope', lang: 'en', name: 'Kim Lee', email: 'kim@example.com', phone: '9565550104', detail: EN() });
  assert.equal(meta(net.brivity().html, 'lead_source'), 'ARPER Meta Listing - Nurture EN');
  assert.ok(meta(net.brivity().html, 'lead_message').startsWith('unknown campaign nope Meta lead ad'));
  assert.equal(net.intro(), undefined);
});

test('test leads (ZZ) get no intro email and no alert', async () => {
  const net = network();
  await post({ formType: 'listing_meta_ad', campaign: 'tierra-encantada-1402', lang: 'en', name: 'ZZ Test', email: 'zz@example.com', phone: '9565550105', detail: EN() });
  assert.equal(net.intro(), undefined);
  assert.equal(net.alerts().length, 0);
});

test('every campaign has both languages filled in', () => {
  for (const [key, c] of Object.entries(META_LISTING_CAMPAIGNS)) {
    for (const L of ['en', 'es']) {
      assert.ok(c.facts[L].length && c.tour[L] && c.agentFacts[L].length, `${key} ${L}`);
      assert.ok(listingIntroEmail({ config: c, track: 'hot', lang: L, name: 'A B' }).text.includes(c.address));
    }
  }
});
