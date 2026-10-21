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

// ---------- the team's alert for a new lead ----------
// Vittoria (and its Meta ad) and open house sign-ins already have their own alerts
// (lib/vittoriaEmail.js, lib/openHouseEmail.js). Every other form on the site sends this one:
// who, how to reach them, the source, what they wrote, and a button that opens the lead in the
// portal's inbox. Same recipients and sender as the Vittoria alert (LEAD_ALERT_EMAILS overrides).
const PORTAL_URL = 'https://portal.thearpergroup.com';
const DEFAULT_ALERT_TO = 'rgvrealtormau@gmail.com,pamelaperezrealtor@gmail.com';
const escHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

export function newLeadAlert({ name, phone, email, lang, source, message, portalId, submittedAt }) {
  const digits = String(phone || '').replace(/[^0-9]/g, '');
  const link = portalId ? `${PORTAL_URL}/en/leads/${portalId}` : `${PORTAL_URL}/en/leads`;
  const subject = `New lead: ${name} — ${source}`;
  const rows = [
    ['Name', escHtml(name)],
    ['Phone', digits ? `<a href="tel:+1${digits.slice(-10)}">${escHtml(phone)}</a> · <a href="sms:+1${digits.slice(-10)}">text</a>` : '—'],
    ['Email', email ? `<a href="mailto:${escHtml(email)}">${escHtml(email)}</a>` : '—'],
    ['Language', lang === 'es' ? 'Spanish' : 'English'],
    ['Source', escHtml(source)],
    ['Submitted', `${escHtml(submittedAt)} CT`],
  ];
  const html = `<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;color:#2A2626;max-width:560px">
<p style="margin:0 0 12px;font-size:17px"><b>New website lead — follow up now.</b></p>
<table cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px">${rows.map(([k, v]) => `<tr><td style="color:#777;vertical-align:top;padding-right:14px">${k}</td><td>${v}</td></tr>`).join('')}</table>
${message ? `<pre style="white-space:pre-wrap;font-family:inherit;font-size:13px;color:#555;background:#F7F3EC;padding:12px;margin-top:14px">${escHtml(message)}</pre>` : ''}
<p style="margin:18px 0"><a href="${link}" style="background:#2B4555;color:#ECE5D7;padding:10px 16px;border-radius:2px;text-decoration:none">Open in the portal</a></p>
<p style="font-size:12px;color:#888">Also sent to Brivity and the Sphere Nurture sheet. Reply to this email to answer the lead directly${email ? '' : ' (no email given — call or text)'}.</p></div>`;
  const text = [
    'New website lead — follow up now.', '',
    `Name: ${name}`, `Phone: ${phone || '—'}`, `Email: ${email || '—'}`,
    `Language: ${lang === 'es' ? 'Spanish' : 'English'}`, `Source: ${source}`, `Submitted: ${submittedAt} CT`, '',
    message || '', '', `Open in the portal: ${link}`,
  ].join('\n');
  return { subject, html, text };
}

export async function sendNewLeadAlert(lead, { fetchImpl = fetch } = {}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('Missing RESEND_API_KEY');
  if (isTestName(lead.name)) return { skipped: 'test' };
  const to = (process.env.LEAD_ALERT_EMAILS || DEFAULT_ALERT_TO).split(',').map((s) => s.trim()).filter(Boolean);
  const env = process.env.LEAD_FROM_EMAIL || 'leads@thearpergroup.com';
  const from = `The Arper Group <${(env.match(/<([^>]+)>/) || [])[1] || env}>`;
  const { subject, html, text } = newLeadAlert(lead);
  const res = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, ...(lead.email ? { reply_to: lead.email } : {}), subject, text, html }),
  });
  if (!res.ok) throw new Error(`Resend new-lead alert failed: ${res.status}`);
  return res.json();
}
