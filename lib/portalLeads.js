// Website leads -> the Arper portal's shared leads inbox.
//
// Every form on this site that sends a lead to Brivity also hands it to the portal, so Mauricio
// and Pam see it in their inbox (portal.thearpergroup.com/leads) the moment it comes in, with the
// exact Brivity source it was sent under. The portal offers one function for that,
// website_lead(), which only ever adds (or tops up) a lead from an "ARPER ..." source: it cannot
// read anything. It is called with the same two hosting settings the listings feed uses
// (PORTAL_SUPABASE_URL, PORTAL_SUPABASE_PUBLISHABLE_KEY).
//
// The portal's 7:00 pm run then matches it in Brivity (where the email has already created it)
// and writes the Brivity link back on the lead. Names starting "zz-test" or "ZZ" are our own
// tests: they are not sent (the portal would also refuse to keep them).
//
// A failure here never fails the form: Brivity, the sheet and the alert emails still go.

import { portal } from './listings.js';

export const isTestName = (name) => /^(zz-test|zz)/i.test(String(name || '').trim());

// Answers { ok, id, again } | { ok, test } | { skipped: 'test' } | { error }.
export async function sendToPortal({ name, phone, email, lang, source, message, listing }, { fetchImpl = fetch, timeoutMs = 6000 } = {}) {
  if (isTestName(name)) return { skipped: 'test' };
  if (!/^ARPER /.test(String(source || ''))) return { error: 'source' };
  const { url, key } = portal();
  if (!url || !key) return { error: 'unreachable' };
  try {
    const res = await fetchImpl(`${url}/rest/v1/rpc/website_lead`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        full_name: name, phone: phone || null, email: email || null, language: lang === 'es' ? 'es' : 'en',
        source, message: message ? String(message).slice(0, 2000) : null, listing: listing || null,
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return { error: 'unreachable', status: res.status };
    const answer = await res.json();
    if (answer?.ok === true) return answer.test ? { ok: true, test: true } : { ok: true, id: answer.id || null, again: answer.again === true };
    return { error: ['source', 'name', 'contact', 'full'].includes(answer?.error) ? answer.error : 'unreachable' };
  } catch {
    return { error: 'unreachable' };
  }
}
