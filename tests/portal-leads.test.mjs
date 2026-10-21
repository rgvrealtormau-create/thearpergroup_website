import test from 'node:test';
import assert from 'node:assert/strict';

// Made-up stand-ins for the two hosting settings; the real values are never in this repository.
process.env.PORTAL_SUPABASE_URL = 'https://portal-db.example';
process.env.PORTAL_SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key';
const { sendToPortal, isTestName } = await import('../lib/portalLeads.js');

const answer = (body, { ok = true, status = 200 } = {}) => {
  const calls = [];
  const f = async (url, init) => { calls.push({ url, init }); return { ok, status, json: async () => body }; };
  f.calls = calls;
  return f;
};
const lead = { name: 'Maria Lopez', phone: '9565550100', email: null, lang: 'es', source: 'ARPER Meta - Vittoria ES', message: 'Vittoria pre-sale Meta lead ad (ES)', listing: null };

test('a lead is handed to the portal with its exact Brivity source', async () => {
  const f = answer({ ok: true, id: 'abc', again: false });
  assert.deepEqual(await sendToPortal(lead, { fetchImpl: f }), { ok: true, id: 'abc', again: false });
  assert.equal(f.calls[0].url, 'https://portal-db.example/rest/v1/rpc/website_lead');
  const body = JSON.parse(f.calls[0].init.body);
  assert.equal(body.source, 'ARPER Meta - Vittoria ES');
  assert.equal(body.language, 'es');
  assert.equal(body.full_name, 'Maria Lopez');
  assert.equal(f.calls[0].init.headers.apikey, 'test-publishable-key');
});

test('test names never reach the portal', async () => {
  const f = answer({ ok: true });
  assert.deepEqual(await sendToPortal({ ...lead, name: 'zz-test Ana' }, { fetchImpl: f }), { skipped: 'test' });
  assert.deepEqual(await sendToPortal({ ...lead, name: 'ZZ Trigger Test' }, { fetchImpl: f }), { skipped: 'test' });
  assert.equal(f.calls.length, 0);
  assert.equal(isTestName('Zoe Zamora'), false);
});

test('only ARPER sources are sent', async () => {
  const f = answer({ ok: true });
  assert.deepEqual(await sendToPortal({ ...lead, source: 'Zillow' }, { fetchImpl: f }), { error: 'source' });
  assert.equal(f.calls.length, 0);
});

test('a repeat is reported as one, and the portal saying no is passed on', async () => {
  assert.deepEqual(await sendToPortal(lead, { fetchImpl: answer({ ok: true, id: 'abc', again: true }) }), { ok: true, id: 'abc', again: true });
  assert.deepEqual(await sendToPortal(lead, { fetchImpl: answer({ error: 'contact' }) }), { error: 'contact' });
});

test('an unreachable portal never throws', async () => {
  assert.deepEqual(await sendToPortal(lead, { fetchImpl: answer({}, { ok: false, status: 503 }) }), { error: 'unreachable', status: 503 });
  assert.deepEqual(await sendToPortal(lead, { fetchImpl: async () => { throw new Error('down'); } }), { error: 'unreachable' });
});

test('the new-lead alert names the lead and opens it in the portal', async () => {
  const { newLeadAlert } = await import('../lib/portalLeads.js');
  const a = newLeadAlert({ name: 'Ana <b>Garza</b>', phone: '9565550100', email: 'ana@x.co', lang: 'es', source: 'ARPER Website - Seller ES', message: 'Home valuation request — 123 Main', portalId: 'abc', submittedAt: '10/20/2026, 9:00 PM' });
  assert.equal(a.subject, 'New lead: Ana <b>Garza</b> — ARPER Website - Seller ES');
  assert.ok(a.html.includes('https://portal.thearpergroup.com/en/leads/abc'));
  assert.ok(a.html.includes('Ana &lt;b&gt;Garza&lt;/b&gt;') && !a.html.includes('<b>Garza</b>'), 'what a visitor typed is escaped');
  assert.ok(a.html.includes('tel:+19565550100') && a.text.includes('Spanish'));
});

test('test names never trigger an alert', async () => {
  process.env.RESEND_API_KEY = 'x';
  const { sendNewLeadAlert } = await import('../lib/portalLeads.js');
  let called = false;
  assert.deepEqual(await sendNewLeadAlert({ name: 'zz-test Ana', source: 'ARPER Website - Buyer EN' }, { fetchImpl: async () => { called = true; } }), { skipped: 'test' });
  assert.equal(called, false);
});
