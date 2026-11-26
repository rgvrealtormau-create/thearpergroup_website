import test from 'node:test';
import assert from 'node:assert/strict';
import { screenPitch } from '../lib/spamScreen.js';

test('funding, SEO and marketing pitches are held', () => {
  assert.ok(screenPitch('We can get your business funding of up to $250k in 24 hours.'));
  assert.ok(screenPitch('I noticed your site is not on the first page of Google. Our SEO team can help.'));
  assert.ok(screenPitch('Quick question: are you open to a guest post with backlinks?'));
  assert.ok(screenPitch('Check https://a.example and https://b.example for details'));
});

test('buyers and sellers are not held', () => {
  assert.equal(screenPitch(''), null);
  assert.equal(screenPitch('Thinking of listing in spring. What is my home worth?'), null);
  assert.equal(screenPitch('Do you guys show homes on Sundays?'), null);
  assert.equal(screenPitch('Necesito vender mi casa en Edinburg, ¿me pueden ayudar?'), null);
  assert.equal(screenPitch('We are pre-approved and want to see 1402 Tierra Encantada.'), null);
});
