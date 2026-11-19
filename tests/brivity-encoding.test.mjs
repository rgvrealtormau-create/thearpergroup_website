import test from 'node:test';
import assert from 'node:assert/strict';
import { brivityLeadHtml } from '../lib/brivity.js';

test('Brivity lead HTML is pure ASCII: accents and dashes become numeric entities', () => {
  const html = brivityLeadHtml({ id: 'x', firstName: 'María José', lastName: 'García', note: '1402 Tierra Encantada Meta lead ad — plan: Hot — agente: todavía no; 1–3 meses', source: 'ARPER Meta Listing - Hot ES' });
  assert.ok(/^[\x00-\x7f]*$/.test(html), 'no raw non-ASCII bytes');
  assert.ok(html.includes('<meta charset="utf-8">'));
  assert.ok(html.includes('Mar&#237;a Jos&#233;'));
  assert.ok(html.includes('&#8212; plan: Hot'));
  assert.ok(html.includes('todav&#237;a no; 1&#8211;3 meses'));
  // decodes back to the original text
  const note = html.match(/<meta name="lead_message" content="([^"]*)">/)[1].replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
  assert.equal(note, '1402 Tierra Encantada Meta lead ad — plan: Hot — agente: todavía no; 1–3 meses');
});

test('long names: the last name travels as one word so Brivity keeps all of it', () => {
  const html = brivityLeadHtml({ id: 'x', firstName: 'María', lastName: 'José García López' });
  assert.ok(html.includes('<meta name="lead_name" content="Mar&#237;a Jos&#233;&#160;Garc&#237;a&#160;L&#243;pez">'), html);
});
