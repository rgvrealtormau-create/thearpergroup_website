import test from 'node:test';
import assert from 'node:assert/strict';
import {publicCedarRidgeInventory, BUILDHERE_EMBED_URL, BUILDHERE_INVENTORY_URL} from '../lib/cedar-ridge-inventory.js';

test('map common areas never become homesite cards or inquiry options', () => {
  const source = {lots: [
    {id: 'sold-uuid', lot_number: '1', public_status: 'Sold', price: 109200, sqft: 10400},
    {id: 'presale-uuid', lot_number: '58', public_status: 'Pre-Sale', price: 63787.5, sqft: 6075},
    {id: 'area', lot_number: 'Common Area', public_status: 'Sold'},
  ]};
  const result = publicCedarRidgeInventory(source);
  assert.deepEqual(result.lots.map(l => l.id), ['sold-uuid','presale-uuid']);
  assert.equal(result.lots[0].price, null);
  assert.equal(result.lots[0].sqft, 10400);
  assert.equal(result.lots[1].price, 6075 * 10.5);
  assert.equal(source.lots[0].price, 109200);
});
test('empty and unavailable inventory remain safe', () => {
  assert.equal(publicCedarRidgeInventory(null), null);
  assert.deepEqual(publicCedarRidgeInventory({lots: []}).lots, []);
});
test('map and inventory use the same canonical BuildHere origin', () => {
  assert.equal(new URL(BUILDHERE_EMBED_URL).origin, 'https://www.buildhere.app');
  assert.equal(new URL(BUILDHERE_INVENTORY_URL).origin, new URL(BUILDHERE_EMBED_URL).origin);
});
