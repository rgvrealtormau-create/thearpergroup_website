// Server-only: the team's alert for a North Park fourplex Meta lead (11501 N 25th St, McAllen).
// Sent instead of the generic new-lead alert, with the call time on top and every answer from
// the Meta form, plus a button to the lead in the portal. The lead gets no email from us: the
// Brivity "North Park OM – Call First" plan handles first contact.

import { isTestName } from './portalLeads.js';
import { metaAdAnswers, splitAnswers, callTimeAnswer } from './metaLeadAds.js';

const PORTAL_URL = 'https://portal.thearpergroup.com';
const DEFAULT_ALERT_TO = 'rgvrealtormau@gmail.com,pamelaperezrealtor@gmail.com';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

export function northParkLeadAlert({ name, phone, email, lang, source, detail, portalId, submittedAt }) {
  const digits = String(phone || '').replace(/[^0-9]/g, '').slice(-10);
  const link = portalId ? `${PORTAL_URL}/en/leads/${portalId}` : `${PORTAL_URL}/en/leads`;
  const answers = splitAnswers(metaAdAnswers('northpark_meta_ad', detail));
  const callTime = callTimeAnswer(answers);
  const language = lang === 'es' ? 'Spanish' : 'English';
  const subject = `New North Park lead: ${name}`;

  const rows = [
    ['Name', esc(name)],
    ['Phone', digits ? `<a href="tel:+1${digits}">${esc(phone)}</a> · <a href="sms:+1${digits}">text</a>` : '—'],
    ['Email', email ? `<a href="mailto:${esc(email)}">${esc(email)}</a>` : '—'],
    ['Language', language],
    ['Call time', callTime ? `<b>${esc(callTime)}</b>` : '—'],
    ['Source', esc(source)],
    ['Submitted', `${esc(submittedAt)} CT`],
  ];
  const answerRows = answers.map(([label, value]) => `<tr><td style="color:#777;vertical-align:top;padding-right:14px">${esc(label || 'Answer')}</td><td>${esc(value)}</td></tr>`).join('');
  const html = `<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;color:#2A2626;max-width:560px">
<p style="margin:0 0 4px;font-size:17px"><b>New North Park lead — call first.</b></p>
<p style="margin:0 0 12px;font-size:13px;color:#946443">North Park fourplex · 11501 N 25th St, McAllen · Meta lead ad</p>
<table cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px">${rows.map(([k, v]) => `<tr><td style="color:#777;vertical-align:top;padding-right:14px">${k}</td><td>${v}</td></tr>`).join('')}</table>
${answers.length ? `<p style="margin:16px 0 4px;font-size:14px"><b>Their answers</b></p><table cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px;background:#F7F3EC">${answerRows}</table>` : '<p style="margin:16px 0 4px;font-size:14px;color:#777">No answers came with this lead.</p>'}
<p style="margin:18px 0"><a href="${link}" style="background:#2B4555;color:#ECE5D7;padding:10px 16px;border-radius:2px;text-decoration:none">Open in the portal</a></p>
<p style="font-size:12px;color:#888">Also sent to Brivity and the Sphere Nurture sheet, and linked to 11501 N 25th St in the portal. Reply to this email to answer the lead directly${email ? '' : ' (no email given — call or text)'}.</p></div>`;
  const text = [
    'New North Park lead — call first.',
    'North Park fourplex · 11501 N 25th St, McAllen · Meta lead ad', '',
    `Name: ${name}`, `Phone: ${phone || '—'}`, `Email: ${email || '—'}`, `Language: ${language}`,
    `Call time: ${callTime || '—'}`, `Source: ${source}`, `Submitted: ${submittedAt} CT`, '',
    'Their answers:',
    ...(answers.length ? answers.map(([label, value]) => `- ${label ? `${label}: ` : ''}${value}`) : ['- none came with this lead']),
    '', `Open in the portal: ${link}`,
  ].join('\n');
  return { subject, html, text };
}

export async function sendNorthParkLeadAlert(lead, { fetchImpl = fetch } = {}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('Missing RESEND_API_KEY');
  if (isTestName(lead.name)) return { skipped: 'test' };
  const to = (process.env.LEAD_ALERT_EMAILS || DEFAULT_ALERT_TO).split(',').map((s) => s.trim()).filter(Boolean);
  const env = process.env.LEAD_FROM_EMAIL || 'leads@thearpergroup.com';
  const from = `The Arper Group <${(env.match(/<([^>]+)>/) || [])[1] || env}>`;
  const { subject, html, text } = northParkLeadAlert(lead);
  const res = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, ...(lead.email ? { reply_to: lead.email } : {}), subject, text, html }),
  });
  if (!res.ok) throw new Error(`Resend North Park alert failed: ${res.status}`);
  return res.json();
}
