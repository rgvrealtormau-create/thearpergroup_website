import test from 'node:test';
import assert from 'node:assert/strict';
import { geocodeQuery, readCensus, geocode, withPins, inValley } from '../lib/geocode.js';
import { toCard } from '../lib/listings.js';

// The shape the Census geocoder answers with (coordinates here are made up for the test).
const census = (lat, lng) => ({ result: { addressMatches: [{ matchedAddress: 'SAMPLE', coordinates: { x: lng, y: lat } }] } });
const answering = (json, seen = []) => async (url, init) => { seen.push({ url, init }); return { ok: true, json: async () => json }; };

test('the lookup uses the street and city, without unit or suite numbers', () => {
  assert.equal(geocodeQuery('1615 Gloria Ann Dr, Edinburg, TX 78539, USA'), '1615 Gloria Ann Dr, Edinburg, TX 78539');
  assert.equal(geocodeQuery('901 E Yuma Ave #1002, McAllen, TX'), '901 E Yuma Ave, McAllen, TX');
  assert.equal(geocodeQuery('2608 Pecan Blvd Ste A, McAllen, TX 78501'), '2608 Pecan Blvd, McAllen, TX 78501');
  assert.equal(geocodeQuery('11413 N 25th St Unit 4, McAllen, TX'), '11413 N 25th St, McAllen, TX');
  assert.equal(geocodeQuery('3100 Santa Clarita, Weslaco, TX'), '3100 Santa Clarita, Weslaco, TX');
});

test('an address with no house number or no city is not looked up', () => {
  assert.equal(geocodeQuery('San Sebastian Lots'), null);
  assert.equal(geocodeQuery('Rueda Vittoria, Weslaco, TX'), null);
  assert.equal(geocodeQuery(''), null);
  assert.equal(geocodeQuery(null), null);
});

test('the answer is read as latitude and longitude, and only trusted inside the Valley', () => {
  assert.deepEqual(readCensus(census(26.3017123456, -98.1633412345)), { lat: 26.301712, lng: -98.163341 });
  assert.equal(readCensus(census(29.7604, -95.3698)), null, 'a match in Houston is not a Valley listing');
  assert.equal(readCensus({ result: { addressMatches: [] } }), null);
  assert.equal(readCensus({}), null);
  assert.equal(readCensus(null), null);
  assert.ok(inValley({ lat: 25.9, lng: -97.5 }) && !inValley({ lat: 27.5, lng: -97.5 }) && !inValley(null));
});

test('one lookup: the public geocoder, kept for a month, never an error', async () => {
  const seen = [];
  assert.deepEqual(await geocode('901 E Yuma Ave #1002, McAllen, TX', { fetchImpl: answering(census(26.19, -98.21), seen) }), { lat: 26.19, lng: -98.21 });
  assert.ok(seen[0].url.includes('address=901+E+Yuma+Ave%2C+McAllen%2C+TX') && seen[0].url.includes('format=json'));
  assert.equal(seen[0].init.next.revalidate, 60 * 60 * 24 * 30);
  assert.equal(await geocode('1 Sample St, McAllen, TX', { fetchImpl: async () => ({ ok: false, status: 500 }) }), null);
  assert.equal(await geocode('1 Sample St, McAllen, TX', { fetchImpl: async () => { throw new Error('offline'); } }), null);
  let asked = false;
  assert.equal(await geocode('San Sebastian Lots', { fetchImpl: async () => { asked = true; } }), null);
  assert.equal(asked, false, 'nothing to look up means no request at all');
});

test('a pin from the portal is used as it is; the rest are looked up', async () => {
  const row = (over) => ({
    id: 'a', address: '1615 Gloria Ann Dr, Edinburg, TX 78539, USA', name: null, status: 'Active', for_sale: true, for_rent: false, price: 259000, rent_price: null,
    property_type: 'Single-family home', property_type_es: 'Casa unifamiliar', category: 'homes', photo_path: 'https://www.thearpergroup.com/photos/listings/gloria-ann.jpg', photo_kind: 'photo',
    blurb_en: 'Text.', blurb_es: 'Texto.', promos_en: [], promos_es: [], ...over,
  });
  const fromPortal = toCard(row({ id: 'p', latitude: '26.300001', longitude: '-98.160001' }));
  const fromAddress = toCard(row({ id: 'g' }));
  const unnamed = toCard(row({ id: 'n', address: 'Rueda Vittoria' }));
  assert.deepEqual(fromPortal.pin, { lat: 26.300001, lng: -98.160001 });
  assert.equal(fromAddress.pin, null);
  assert.equal(fromAddress.geo, '1615 Gloria Ann Dr, Edinburg, TX 78539');

  const seen = [];
  const cards = await withPins([fromPortal, fromAddress, unnamed], { fetchImpl: answering(census(26.3, -98.16), seen) });
  assert.deepEqual(cards.map((c) => c.pin), [{ lat: 26.300001, lng: -98.160001 }, { lat: 26.3, lng: -98.16 }, null]);
  assert.equal(seen.length, 1, 'only the listing without a pin and with a real address is looked up');
});
