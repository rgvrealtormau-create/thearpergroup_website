import test from 'node:test';
import assert from 'node:assert/strict';

// Made-up stand-ins for the two hosting settings; the real values are never in this repository.
process.env.PORTAL_SUPABASE_URL = 'https://portal-db.example';
process.env.PORTAL_SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key';

const { toCard, importableListings } = await import('../lib/listings.js');
const {
  cleanSignIn, phoneDigits, phonePretty, phoneTel, joinsFollowUp, isTestSignIn, answerLines, leadNote, sheetRow,
  recordVisitor, qrUrl, calculatorPath, signInPath,
} = await import('../lib/openHouse.js');
const { thanksEmail, alertEmail, firstText } = await import('../lib/openHouseEmail.js');

const LISTING = 'f1fc39e9-860b-47ed-b566-ba0fc13e427f';
const row = (over = {}) => ({
  id: LISTING, address: '1402 Tierra Encantada, Weslaco, TX 78596, USA', name: null,
  status: 'Active', list_date: '2026-09-02', for_sale: true, for_rent: false, price: 417000, rent_price: null,
  property_type: 'Single-family home', property_type_es: 'Casa unifamiliar', category: 'homes', mls_number: '514101',
  photo_path: `${LISTING}/1.jpg`, photo_kind: 'photo', tag_en: null, tag_es: null,
  facts_en: '4 bed · 3 bath · 2,980 sq ft', facts_es: '4 recámaras · 3 baños · 2,980 pies²',
  blurb_en: 'Single-story.', blurb_es: 'De una planta.', promos_en: [], promos_es: [], cso_en: null, cso_es: null,
  title_en: null, title_es: null, city_line: null, alt_en: null, alt_es: null, ask_en: null, ask_es: null,
  community: null, latitude: null, longitude: null, annual_taxes: null, updated_at: '2026-10-06T23:36:27+00:00', ...over,
});
const visitor = (over = {}) => ({ listing: LISTING, lang: 'en', name: 'Ana Garza', phone: '(956) 555-0100', email: '', hasAgent: 'no', timeline: 'm3', ownsHome: 'sell', consent: true, ...over });

test('a listing carries its yearly taxes to the calculators only when the portal has them', () => {
  assert.equal(toCard(row()).taxes, null);
  assert.equal(toCard(row({ annual_taxes: 9412.6 })).taxes, 9413);
  assert.equal(toCard(row({ annual_taxes: '8800.00' })).taxes, 8800);
  assert.equal(toCard(row({ annual_taxes: 0 })).taxes, null);
  assert.equal(toCard(row({ annual_taxes: 'n/a' })).taxes, null);
  const [offered] = importableListings([toCard(row({ annual_taxes: 9412.6 }))]);
  assert.equal(offered.price, 417000);
  assert.equal(offered.taxes, 9413);
  assert.equal(offered.citySlug, 'weslaco');
  // A lease has no purchase price, so it brings no taxes either.
  assert.equal(toCard(row({ for_sale: false, for_rent: true, price: null, rent_price: 2400, category: 'rentals', annual_taxes: 9000 })).taxes, null);
});

test('phone numbers are kept as digits, a leading 1 dropped, other countries left whole', () => {
  assert.equal(phoneDigits('(956) 555-0100'), '9565550100');
  assert.equal(phoneDigits('+1 956.555.0100'), '9565550100');
  assert.equal(phoneDigits('+52 899 555 0100'), '528995550100');
  assert.equal(phoneDigits('555-0100'), '');
  assert.equal(phonePretty('9565550100'), '(956) 555-0100');
  assert.equal(phoneTel('9565550100'), '+19565550100');
  assert.equal(phoneTel('528995550100'), '+528995550100');
});

test('a sign-in is tidied, and refused without a listing, a name or a way to reach them', () => {
  const s = cleanSignIn(visitor({ name: '  Ana   Garza ', email: ' Ana@Example.com ', lang: 'es' }));
  assert.deepEqual(s, { listing: LISTING, lang: 'es', name: 'Ana Garza', phone: '9565550100', email: 'ana@example.com', hasAgent: false, agentName: '', timeline: 'm3', ownsHome: 'sell', consent: true });
  assert.equal(cleanSignIn(visitor({ listing: 'not-an-id' })).error, 'listing');
  assert.equal(cleanSignIn(visitor({ name: 'A' })).error, 'name');
  assert.equal(cleanSignIn(visitor({ name: 'see https://spam.example' })).error, 'name');
  assert.equal(cleanSignIn(visitor({ phone: '555', email: 'nope' })).error, 'contact');
  assert.equal(cleanSignIn(null).error, 'listing');
  // An email alone is enough; answers that are not on the list are dropped, not kept as typed.
  const emailOnly = cleanSignIn(visitor({ phone: '', email: 'a@b.co', timeline: 'tomorrow', ownsHome: 'castle', hasAgent: 'maybe', lang: 'fr' }));
  assert.equal(emailOnly.phone, '');
  assert.equal(emailOnly.timeline, null);
  assert.equal(emailOnly.ownsHome, null);
  assert.equal(emailOnly.hasAgent, null);
  assert.equal(emailOnly.lang, 'en');
  // An agent's name is only kept when they said they have one; markup never survives.
  assert.equal(cleanSignIn(visitor({ hasAgent: 'no', agentName: 'Someone' })).agentName, '');
  assert.equal(cleanSignIn(visitor({ hasAgent: true, agentName: '<b>Rosa</b> Peña' })).agentName, 'b Rosa /b Peña');
});

test('a buyer who already has an agent, and our own test sign-ins, stay out of the sheet and Brivity', () => {
  assert.equal(joinsFollowUp(cleanSignIn(visitor())), true);
  assert.equal(joinsFollowUp(cleanSignIn(visitor({ hasAgent: null }))), true);
  assert.equal(joinsFollowUp(cleanSignIn(visitor({ hasAgent: 'yes' }))), false);
  assert.equal(isTestSignIn(cleanSignIn(visitor({ name: 'zz-test Visitor' }))), true);
  assert.equal(joinsFollowUp(cleanSignIn(visitor({ name: 'ZZ-Test Visitor' }))), false);
});

test('the sheet row, the Brivity note and the answers read in plain English', () => {
  const s = cleanSignIn(visitor({ lang: 'es', email: 'ana@example.com' }));
  const home = '1402 Tierra Encantada, Weslaco';
  assert.equal(leadNote(s, home), 'Open house sign-in at 1402 Tierra Encantada, Weslaco — buying within 3 months — owns a home and would sell to buy (ES)');
  const sheet = sheetRow(s, home, '10/9/2026, 1:15:00 PM');
  assert.equal(sheet.length, 16, 'the sheet has sixteen columns');
  assert.deepEqual(sheet.slice(0, 7), ['Ana Garza', 'Active Lead', 'Open house — 1402 Tierra Encantada, Weslaco', '(956) 555-0100', 'ana@example.com', '', 'Spanish']);
  assert.match(sheet[13], /signed in 10\/9\/2026, 1:15:00 PM CT$/);
  assert.deepEqual(answerLines(cleanSignIn(visitor({ hasAgent: 'yes', agentName: 'Rosa Peña', timeline: null, ownsHome: 'no' }))), [
    'Working with an agent: YES (Rosa Peña)', 'Buying: not answered', 'Home now: rents / does not own',
  ]);
});

test('links: the sign has no language in it, and the calculator opens on the listing', () => {
  assert.equal(qrUrl(LISTING), `https://www.thearpergroup.com/open-house/${LISTING}`);
  assert.equal(signInPath('es', LISTING), `/es/open-house/${LISTING}`);
  assert.equal(calculatorPath('fr', LISTING), `/en/resources/mortgage-calculator?listing=${LISTING}`);
});

test('the portal is asked to keep the sign-in, and its answer is passed on', async () => {
  const s = cleanSignIn(visitor({ email: 'ana@example.com' }));
  let sent;
  const answer = (body, status = 200) => async (url, options) => { sent = { url, options }; return { ok: status < 400, status, json: async () => body }; };
  assert.deepEqual(await recordVisitor(s, { fetchImpl: answer({ ok: true, id: 'abc', again: false }) }), { ok: true, id: 'abc', again: false });
  assert.equal(sent.url, 'https://portal-db.example/rest/v1/rpc/open_house_sign_in');
  assert.equal(sent.options.headers.apikey, 'test-publishable-key');
  assert.deepEqual(JSON.parse(sent.options.body), {
    listing: LISTING, full_name: 'Ana Garza', phone: '9565550100', email: 'ana@example.com', language: 'en',
    has_agent: false, agent_name: null, timeline: 'm3', owns_home: 'sell', consent: true,
  });
  assert.deepEqual(await recordVisitor(s, { fetchImpl: answer({ error: 'listing' }) }), { error: 'listing' });
  assert.deepEqual(await recordVisitor(s, { fetchImpl: answer({ error: 'full' }) }), { error: 'full' });
  assert.equal((await recordVisitor(s, { fetchImpl: answer({ message: 'no' }, 500) })).error, 'unreachable');
  assert.equal((await recordVisitor(s, { fetchImpl: async () => { throw new Error('offline'); } })).error, 'unreachable');
});

test('the thank-you email is in the visitor\'s language and opens the calculator on the listing', () => {
  const card = toCard(row());
  const es = thanksEmail({ signIn: cleanSignIn(visitor({ lang: 'es', email: 'ana@example.com' })), card, home: '1402 Tierra Encantada, Weslaco' });
  assert.equal(es.subject, 'Gracias por visitar 1402 Tierra Encantada, Weslaco');
  assert.match(es.text, /Hola Ana:/);
  assert.match(es.text, new RegExp(`https://www\\.thearpergroup\\.com/es/resources/mortgage-calculator\\?listing=${LISTING}`));
  assert.match(es.text, /\$417,000 · 4 recámaras · 3 baños · 2,980 pies² · MLS #514101/);
  assert.doesNotMatch(es.text, /Ya trabajas con un agente/);
  const withAgent = thanksEmail({ signIn: cleanSignIn(visitor({ hasAgent: 'yes', email: 'ana@example.com' })), card, home: 'x' });
  assert.match(withAgent.text, /Working with an agent\? Send them this email/);
  assert.match(withAgent.html, /Estimate your monthly payment/);
  // A name is never trusted as markup.
  const odd = thanksEmail({ signIn: { ...cleanSignIn(visitor({ email: 'a@b.co' })), name: 'A&B "Q"' }, card, home: 'x' });
  assert.match(odd.html, /Hi A&amp;B,/);
});

test('the team alert says who, what they answered, where it was saved, and offers a text', () => {
  const home = '1402 Tierra Encantada, Weslaco';
  const s = cleanSignIn(visitor({ lang: 'es' }));
  const a = alertEmail({ signIn: s, home, submittedAt: '10/9/2026, 1:15:00 PM', saved: { portal: true, sheet: true, brivity: false } });
  assert.equal(a.subject, 'Open house sign-in: Ana Garza — 1402 Tierra Encantada, Weslaco');
  assert.match(a.text, /Saved in the portal/);
  assert.match(a.text, /Added to the Sphere Nurture sheet/);
  assert.match(a.text, /Could not be sent to Brivity/);
  assert.match(a.text, /They left no email/);
  assert.match(a.html, /sms:\+19565550100\?&amp;body=/);
  assert.match(firstText(s, home, 'https://x.example/c'), /^¡Hola Ana! Gracias por visitar la casa abierta en 1402 Tierra Encantada, Weslaco hoy\./);

  const represented = cleanSignIn(visitor({ hasAgent: 'yes', agentName: 'Rosa Peña' }));
  const b = alertEmail({ signIn: represented, home, submittedAt: 'now', saved: { portal: true, sheet: null, brivity: null } });
  assert.match(b.subject, /— HAS AGENT$/);
  assert.match(b.text, /Go through their agent/);
  assert.match(b.text, /Not added to the Sphere sheet or Brivity: they already have an agent/);
  assert.doesNotMatch(b.html, /sms:/);

  const lost = alertEmail({ signIn: s, home, submittedAt: 'now', saved: { portal: false, sheet: true, brivity: true } });
  assert.match(lost.text, /NOT saved in the portal/);
  const check = alertEmail({ signIn: cleanSignIn(visitor({ name: 'zz-test Visitor' })), home, submittedAt: 'now', saved: { portal: true, sheet: null, brivity: null } });
  assert.match(check.subject, /^TEST · /);
  assert.match(check.text, /A test sign-in: not added/);
});
