import test from 'node:test';
import assert from 'node:assert/strict';
import { toCard, toCards, inquiryOptions, lastUpdated, fetchPortalRows, getFeaturedListings } from '../lib/listings.js';

// Where the portal is and the key to ask it come from two hosting settings. These are
// made-up stand-ins: the real values are never written in this repository.
const FAKE_URL = 'https://portal-db.example';
const FAKE_KEY = 'test-publishable-key';
process.env.PORTAL_SUPABASE_URL = FAKE_URL;
process.env.PORTAL_SUPABASE_PUBLISHABLE_KEY = FAKE_KEY;

// A row as the portal's website_listings() returns it.
const row = (over = {}) => ({
  id: '05cf1d2b-92e4-4b9c-8351-77535e034ccb', address: '1615 Gloria Ann Dr, Edinburg, TX 78539, USA', name: null,
  status: 'Active', list_date: '2026-05-11', for_sale: true, for_rent: false, price: 259000, rent_price: null,
  property_type: 'Single-family home', property_type_es: 'Casa unifamiliar', category: 'homes', mls_number: '509055',
  photo_path: '05cf1d2b-92e4-4b9c-8351-77535e034ccb/1791320000000.jpg', photo_kind: 'photo',
  tag_en: 'Renovated', tag_es: 'Remodelada', facts_en: '3 bed · 2 bath', facts_es: '3 recámaras · 2 baños',
  blurb_en: 'Quartz kitchen.', blurb_es: 'Cocina de cuarzo.', promos_en: ['Owner financing available'], promos_es: ['Financiamiento directo'],
  cso_en: '2% buyer’s agent CSO', cso_es: 'CSO de 2%',
  title_en: null, title_es: null, city_line: null, alt_en: null, alt_es: null, ask_en: null, ask_es: null,
  community: null, latitude: null, longitude: null, updated_at: '2026-10-06T22:42:48.179424+00:00', ...over,
});

test('a portal row becomes a card with the price, address and both languages', () => {
  const card = toCard(row());
  assert.equal(card.price, '$259,000');
  assert.equal(card.priceSuffix, null);
  assert.equal(card.address, '1615 Gloria Ann Dr');
  assert.equal(card.city, 'Edinburg, TX 78539');
  assert.deepEqual(card.type, { en: 'Single-family home', es: 'Casa unifamiliar' });
  assert.deepEqual(card.tag, { en: 'Renovated', es: 'Remodelada' });
  assert.deepEqual(card.promos, { en: ['Owner financing available'], es: ['Financiamiento directo'] });
  assert.equal(card.ask.es, 'Pregunta por esta casa');
  assert.equal(card.rendering, null);
});

test('photos: the portal folder, a file still on this site, or another https address', () => {
  assert.equal(toCard(row()).img, `${FAKE_URL}/storage/v1/object/public/listing-photos/05cf1d2b-92e4-4b9c-8351-77535e034ccb/1791320000000.jpg`);
  assert.equal(toCard(row({ photo_path: 'https://www.thearpergroup.com/photos/listings/gloria-ann.jpg' })).img, '/photos/listings/gloria-ann.jpg');
  assert.equal(toCard(row({ photo_path: 'https://example.com/a.jpg' })).img, 'https://example.com/a.jpg');
});

test('reserved and under contract stay on the page, labelled by their status', () => {
  assert.deepEqual(toCard(row({ status: 'Reserved' })).tag, { en: 'Reserved', es: 'Reservada' });
  assert.deepEqual(toCard(row({ status: 'Under Contract', tag_en: null, tag_es: null })).tag, { en: 'Under contract', es: 'Bajo contrato' });
  assert.equal(toCard(row({ tag_en: null, tag_es: null })).tag, null);
});

test('a rental shows its monthly rent; a listing offered both ways shows both prices', () => {
  const lease = toCard(row({ for_sale: false, for_rent: true, price: null, rent_price: 1900, category: 'commercial' }));
  assert.equal(lease.price, '$1,900');
  assert.deepEqual(lease.priceSuffix, { en: '/ month', es: '/ mes' });
  const both = toCard(row({ for_rent: true, rent_price: 2000 }));
  assert.equal(both.price, '$259,000');
  assert.equal(both.priceSuffix, null);
  assert.deepEqual(both.also, { en: 'Also for rent at $2,000 / month', es: 'También en renta por $2,000 al mes' });
  assert.equal(toCard(row()).also, null);
  assert.equal(lease.also, null);
});

test('wording typed in the portal is used as given; a blank box is worked out', () => {
  const plain = toCard(row());
  assert.equal(plain.address, '1615 Gloria Ann Dr');
  assert.equal(plain.city, 'Edinburg, TX 78539');
  assert.deepEqual(plain.alt, { en: 'Single-family home: 1615 Gloria Ann Dr', es: 'Casa unifamiliar: 1615 Gloria Ann Dr' });
  assert.equal(plain.community, null);

  const same = toCard(row({ title_en: '1615 Gloria Ann Drive', city_line: 'Edinburg, TX 78539' }));
  assert.equal(same.address, '1615 Gloria Ann Drive', 'blank Spanish falls back to English');

  const yuma = toCard(row({
    address: '901 E Yuma Ave #1002, McAllen, TX', category: 'condos',
    title_en: '901 E Yuma Avenue, Units 1002 and 1003', title_es: '901 E Yuma Avenue, unidades 1002 y 1003',
    city_line: 'McAllen, TX 78503', alt_en: 'Living room', alt_es: 'Sala', ask_en: 'Ask about these units', ask_es: 'Pregunta por estas unidades',
  }));
  assert.deepEqual(yuma.address, { en: '901 E Yuma Avenue, Units 1002 and 1003', es: '901 E Yuma Avenue, unidades 1002 y 1003' });
  assert.equal(yuma.city, 'McAllen, TX 78503');
  assert.deepEqual(yuma.alt, { en: 'Living room', es: 'Sala' });
  assert.deepEqual(yuma.ask, { en: 'Ask about these units', es: 'Pregunta por estas unidades' });
  assert.equal(yuma.geo, '901 E Yuma Ave #1002, McAllen, TX', 'the map still uses the real street address');
  assert.equal(inquiryOptions('es', [yuma]).at(-1).label, '901 E Yuma Avenue, unidades 1002 y 1003 · McAllen');
  assert.equal(inquiryOptions('es', [yuma]).at(-1).labelEn, '901 E Yuma Avenue, Units 1002 and 1003 · McAllen');
});

test('a listing in one of our communities links to that community when it has a page', () => {
  assert.equal(toCard(row({ community: 'vittoria' })).community.path, 'communities/vittoria');
  assert.equal(toCard(row({ community: 'vittoria' })).community.label.es, 'Ver la comunidad Vittoria');
  assert.equal(toCard(row({ community: 'san-sebastian' })).community, null);
  assert.equal(toCard(row({ community: 'somewhere-else' })).community, null);
});

test('a map pin needs both numbers', () => {
  assert.deepEqual(toCard(row({ latitude: 26.3, longitude: -98.16 })).pin, { lat: 26.3, lng: -98.16 });
  assert.equal(toCard(row({ latitude: 26.3 })).pin, null);
  assert.equal(toCard(row()).pin, null);
});

test('renderings and staged photos are labelled; optional pieces can be missing', () => {
  assert.equal(toCard(row({ photo_kind: 'concept' })).rendering, 'concept');
  assert.equal(toCard(row({ photo_kind: 'staged' })).rendering, 'staged');
  const bare = toCard(row({ facts_en: null, facts_es: null, cso_en: null, cso_es: null, mls_number: null, promos_en: null, promos_es: null }));
  assert.equal(bare.facts, null);
  assert.equal(bare.cso, null);
  assert.equal(bare.mls, null);
  assert.deepEqual(bare.promos, { en: [], es: [] });
});

test('a listing with a name of its own leads with the name', () => {
  const card = toCard(row({ name: 'Unit 4', address: '11413 N 25th St, McAllen, TX' }));
  assert.equal(card.address, 'Unit 4');
  assert.equal(card.city, '11413 N 25th St, McAllen, TX');
  assert.equal(toCard(row({ address: 'Rueda Vittoria' })).city, '');
});

test('a row the page cannot show is skipped instead of breaking the page', () => {
  assert.equal(toCard(null), null);
  assert.equal(toCard(row({ price: null })), null);
  assert.equal(toCard(row({ category: 'castles' })), null);
  assert.equal(toCard(row({ photo_path: null })), null);
  assert.equal(toCards('nonsense').length, 0);
  assert.equal(toCards([row(), null, row({ category: 'castles' })]).length, 1);
});

test('cards are ordered by filter, then lowest price first', () => {
  const cards = toCards([
    row({ id: 'c', category: 'commercial', for_sale: false, for_rent: true, price: null, rent_price: 1900 }),
    row({ id: 'h2', price: 417000 }),
    row({ id: 'l', category: 'lots', price: 75000 }),
    row({ id: 'h1', price: 259000 }),
  ]);
  assert.deepEqual(cards.map((c) => c.slug), ['h1', 'h2', 'l', 'c']);
});

test('the inquiry dropdown lists the communities, then the listings', () => {
  const options = inquiryOptions('es', toCards([row()]));
  assert.deepEqual(options.map((o) => o.slug), ['cedar-ridge-reserve', 'vittoria', 'san-sebastian', '05cf1d2b-92e4-4b9c-8351-77535e034ccb']);
  assert.equal(options[1].label, 'Townhomes en Vittoria · Weslaco');
  assert.equal(options[1].labelEn, 'Vittoria townhomes · Weslaco');
  assert.equal(options[3].labelEn, '1615 Gloria Ann Dr · Edinburg');
});

test('the last-updated date is the newest change among the cards', () => {
  const cards = toCards([row({ id: 'a', updated_at: '2026-10-01T10:00:00Z' }), row({ id: 'b', updated_at: '2026-10-06T22:42:48Z' })]);
  assert.equal(lastUpdated(cards).toISOString(), '2026-10-06T22:42:48.000Z');
  assert.equal(lastUpdated([]), null);
});

test('asking the portal: one read-only call, and a failure is an error, never an empty page', async () => {
  let seen;
  const ok = async (url, init) => { seen = { url, init }; return { ok: true, json: async () => [row()] }; };
  const cards = await getFeaturedListings({ fetchImpl: ok });
  assert.equal(cards.length, 1);
  assert.equal(seen.url, `${FAKE_URL}/rest/v1/rpc/website_listings`);
  assert.equal(seen.init.method, 'POST');
  assert.equal(seen.init.headers.apikey, FAKE_KEY);
  assert.equal(seen.init.headers.Authorization, `Bearer ${FAKE_KEY}`);
  await assert.rejects(fetchPortalRows({ fetchImpl: async () => ({ ok: false, status: 503 }) }), /503/);
  await assert.rejects(fetchPortalRows({ fetchImpl: async () => ({ ok: true, json: async () => ({ message: 'paused' }) }) }), /unexpected shape/);
});

test('without the two hosting settings nothing is asked and nothing is guessed', async () => {
  const saved = { url: process.env.PORTAL_SUPABASE_URL, key: process.env.PORTAL_SUPABASE_PUBLISHABLE_KEY };
  let asked = 0;
  const spy = async () => { asked += 1; return { ok: true, json: async () => [] }; };
  try {
    delete process.env.PORTAL_SUPABASE_PUBLISHABLE_KEY;
    await assert.rejects(fetchPortalRows({ fetchImpl: spy }), /PORTAL_SUPABASE_PUBLISHABLE_KEY/);
    process.env.PORTAL_SUPABASE_PUBLISHABLE_KEY = saved.key;
    delete process.env.PORTAL_SUPABASE_URL;
    await assert.rejects(fetchPortalRows({ fetchImpl: spy }), /PORTAL_SUPABASE_URL/);
    assert.equal(asked, 0);
    assert.equal(toCard(row()), null, 'a photo in the portal folder cannot be shown without knowing where the portal is');
    assert.ok(toCard(row({ photo_path: 'https://www.thearpergroup.com/photos/listings/gloria-ann.jpg' })));
  } finally {
    process.env.PORTAL_SUPABASE_URL = saved.url;
    process.env.PORTAL_SUPABASE_PUBLISHABLE_KEY = saved.key;
  }
});

test('cards link to the calculator that fits: homes and condos to the mortgage one, multifamily to the investment one', async () => {
  const { importableListings, getImportableListings } = await import('../lib/listings.js');
  const cards = toCards([
    row({ id: 'home' }),
    row({ id: 'four', category: 'multifamily', price: 545000, address: '11501 N 25th St, McAllen, TX' }),
    row({ id: 'lot', category: 'lots', price: 75000 }),
    row({ id: 'lease', category: 'commercial', for_sale: false, for_rent: true, price: null, rent_price: 1900 }),
    row({ id: 'odd', address: '12 Sample Rd, Raymondville, TX' }),
  ]);
  const by = Object.fromEntries(cards.map((c) => [c.slug, c]));
  assert.equal(by.home.calc.path, 'resources/mortgage-calculator');
  assert.equal(by.four.calc.path, 'resources/investment-property-calculator');
  assert.equal(by.lot.calc, null);
  assert.equal(by.lease.calc, null);

  const offered = importableListings(cards);
  assert.deepEqual(offered.map((l) => l.id).sort(), ['four', 'home', 'odd']);
  const home = offered.find((l) => l.id === 'home');
  assert.deepEqual({ price: home.price, priceText: home.priceText, citySlug: home.citySlug, label: home.label },
    { price: 259000, priceText: '$259,000', citySlug: 'edinburg', label: '1615 Gloria Ann Dr · Edinburg' });
  assert.equal(offered.find((l) => l.id === 'odd').citySlug, null, 'a city the calculators do not know leaves the area alone');
  assert.deepEqual(importableListings(cards, ['multifamily']).map((l) => l.id), ['four']);
  const yuma = importableListings(toCards([row({ id: 'y', category: 'condos', title_en: 'Units 1002 and 1003', title_es: 'Unidades 1002 y 1003', city_line: 'McAllen, TX 78503' })]))[0];
  assert.equal(yuma.label, 'Units 1002 and 1003 · McAllen');
  assert.equal(yuma.labelEs, 'Unidades 1002 y 1003 · McAllen');

  // The calculators still work when the portal cannot be reached: nothing to import, no error.
  assert.deepEqual(await getImportableListings(null, { fetchImpl: async () => ({ ok: false, status: 503 }) }), []);
});
