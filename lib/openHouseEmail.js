// Server-only: the two emails an open house sign-in sends, through Resend from the verified
// thearpergroup.com domain (the same setup as lib/vittoriaEmail.js).
//
//   thanks  to the visitor, when they left an email: the listing, a button that opens the
//           payment calculator on it, and how to reach us. Replies go to Mauricio.
//   alert   to the team, for every sign-in: who, how to reach them, their three answers,
//           where the sign-in was saved, and a "Text them" link that opens the agent's own
//           Messages app with a first message written in the visitor's language. Nothing
//           texts a visitor automatically.

import { BUSINESS } from './site.js';
import { answerLines, calculatorPath, phonePretty, phoneTel, isTestSignIn } from './openHouse.js';

const REPLY_TO = 'rgvrealtormau@gmail.com';
const DEFAULT_ALERT_TO = 'rgvrealtormau@gmail.com,pamelaperezrealtor@gmail.com'; // Mauricio + Pamela
const ADDRESS = '4900 N 10th St Ste. B4, McAllen, TX 78504';

function fromAddress() {
  const env = process.env.LEAD_FROM_EMAIL || 'leads@thearpergroup.com';
  const match = env.match(/<([^>]+)>/);
  return `The Arper Group <${match ? match[1] : env}>`;
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || '';

const COPY = {
  en: {
    subject: (home) => `Thanks for visiting ${home}`,
    hi: (first) => `Hi ${first},`,
    intro: (home) => `Thank you for coming to the open house at ${home}. Here is everything in one place so you don’t have to hunt for it later.`,
    calc: 'Estimate your monthly payment',
    calcNote: 'Opens on this home’s price with 3.5% down. Change any number to match your plans.',
    listing: 'See the listing again',
    mls: 'MLS #',
    withAgent: 'Working with an agent? Send them this email. They are welcome to call us about the home.',
    questions: 'Questions, or want a second look? Reply to this email, or call or text us:',
    sign: 'Mauricio & Pamela — The Arper Group',
    footer: 'You’re receiving this because you signed in at our open house. Payment figures are estimates for planning, not a loan offer; a lender can give you exact numbers.',
  },
  es: {
    subject: (home) => `Gracias por visitar ${home}`,
    hi: (first) => `Hola ${first}:`,
    intro: (home) => `Gracias por venir a la casa abierta en ${home}. Aquí tienes todo en un solo lugar para que no lo andes buscando después.`,
    calc: 'Calcula tu pago mensual',
    calcNote: 'Abre con el precio de esta casa y 3.5% de enganche. Cambia cualquier número según tus planes.',
    listing: 'Ver la propiedad otra vez',
    mls: 'MLS #',
    withAgent: '¿Ya trabajas con un agente? Reenvíale este correo. Con gusto nos puede llamar por la casa.',
    questions: '¿Tienes preguntas o quieres volver a verla? Responde este correo, o llámanos o mándanos mensaje:',
    sign: 'Mauricio y Pamela — The Arper Group',
    footer: 'Recibes este correo porque te registraste en nuestra casa abierta. Los pagos son estimados para planear, no una oferta de préstamo; un prestamista te da los números exactos.',
  },
};

// The first text an agent sends a visitor, in the visitor's language. It is only ever a
// draft in the agent's own Messages app (an sms: link in the alert email).
export function firstText(signIn, home, calcUrl) {
  const first = firstName(signIn.name);
  return signIn.lang === 'es'
    ? `¡Hola ${first}! Gracias por visitar la casa abierta en ${home} hoy. Aquí puedes calcular el pago mensual de esta casa: ${calcUrl} ¿Qué te pareció? — The Arper Group`
    : `Hi ${first}! Thanks for stopping by the open house at ${home} today. Here’s the monthly payment calculator for this home: ${calcUrl} What did you think of it? — The Arper Group`;
}

// What the thank-you email says. `card` is the listing's card (lib/listings.js#toCard).
// Returned as { subject, text, html } so it can be checked without sending anything.
export function thanksEmail({ signIn, card, home }) {
  const L = signIn.lang === 'es' ? 'es' : 'en';
  const c = COPY[L];
  const first = firstName(signIn.name);
  const calcUrl = `${BUSINESS.url}${calculatorPath(L, signIn.listing)}`;
  const listingUrl = `${BUSINESS.url}/${L}/listings#listing-${signIn.listing}`;
  const facts = [card?.price, card?.facts?.[L], card?.mls ? `${c.mls}${card.mls}` : null].filter(Boolean).join(' · ');

  const text = [
    c.hi(first), '',
    c.intro(home), '',
    facts, '',
    `${c.calc}: ${calcUrl}`,
    c.calcNote,
    `${c.listing}: ${listingUrl}`, '',
    signIn.hasAgent === true ? `${c.withAgent}\n` : null,
    c.questions,
    `Mauricio ${BUSINESS.phoneDisplay} · Pamela ${BUSINESS.phonePam}`, '',
    c.sign,
    'The Arper Group · Alliance Real Estate Group',
    ADDRESS, '',
    c.footer,
  ].filter((line) => line !== null).join('\n');

  const html = `<!doctype html><html><body style="margin:0;background:#F7F3EC;font-family:Helvetica,Arial,sans-serif;color:#2A2626">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3EC"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e6dfd2">
<tr><td style="background:#2B4555;padding:22px 28px;color:#ECE5D7;font-size:13px;letter-spacing:2px;text-transform:uppercase">The Arper Group · ${esc(home)}</td></tr>
<tr><td style="padding:28px">
<p style="margin:0 0 14px;font-size:16px">${esc(c.hi(first))}</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.55">${esc(c.intro(home))}</p>
${facts ? `<p style="margin:0 0 22px;font-size:13px;color:#946443">${esc(facts)}</p>` : ''}
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#2B4555"><a href="${esc(calcUrl)}" style="display:inline-block;padding:13px 22px;color:#ECE5D7;text-decoration:none;font-size:15px">${esc(c.calc)} →</a></td></tr></table>
<p style="margin:10px 0 0;font-size:12px;line-height:1.5;color:#777">${esc(c.calcNote)}</p>
<p style="margin:16px 0 0;font-size:14px"><a href="${esc(listingUrl)}" style="color:#2B4555">${esc(c.listing)}</a></p>
${signIn.hasAgent === true ? `<p style="margin:22px 0 0;font-size:14px;line-height:1.5">${esc(c.withAgent)}</p>` : ''}
<p style="margin:26px 0 6px;font-size:14px;line-height:1.5">${esc(c.questions)}</p>
<p style="margin:0;font-size:14px;line-height:1.6">Mauricio <a href="tel:${BUSINESS.phone}" style="color:#2B4555">${BUSINESS.phoneDisplay}</a> · Pamela <a href="tel:${BUSINESS.phonePamTel}" style="color:#2B4555">${BUSINESS.phonePam}</a></p>
<p style="margin:22px 0 0;font-size:14px">${esc(c.sign)}</p>
</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #eee;font-size:11px;line-height:1.5;color:#777">The Arper Group · Alliance Real Estate Group · ${ADDRESS}<br>${esc(c.footer)}</td></tr>
</table></td></tr></table></body></html>`;

  return { subject: c.subject(home), text, html };
}

// What the team's alert says. `saved` is where the sign-in went: { portal, sheet, brivity },
// each true, false, or null when it was not meant to go there.
export function alertEmail({ signIn, home, submittedAt, saved }) {
  const represented = signIn.hasAgent === true;
  const test = isTestSignIn(signIn);
  const calcUrl = `${BUSINESS.url}${calculatorPath(signIn.lang, signIn.listing)}`;
  const smsHref = signIn.phone ? `sms:${phoneTel(signIn.phone)}?&body=${encodeURIComponent(firstText(signIn, home, calcUrl))}` : null;
  const answers = answerLines(signIn);
  const where = (value, yes, no, skipped) => (value === true ? yes : value === false ? no : skipped);
  const savedLines = [
    where(saved.portal, 'Saved in the portal, on the listing’s page.', 'NOT saved in the portal (it could not be reached). This email is the record.', ''),
    where(saved.sheet, 'Added to the Sphere Nurture sheet.', 'Could not be added to the Sphere Nurture sheet.', represented ? 'Not added to the Sphere sheet or Brivity: they already have an agent.' : test ? 'A test sign-in: not added to the Sphere sheet or Brivity.' : ''),
    where(saved.brivity, 'Sent to Brivity.', 'Could not be sent to Brivity.', ''),
  ].filter(Boolean);
  const subject = `${test ? 'TEST · ' : ''}Open house sign-in: ${signIn.name} — ${home}${represented ? ' — HAS AGENT' : ''}`;
  const lead = represented
    ? 'Open house sign-in — already working with an agent. Go through their agent.'
    : 'Open house sign-in — send a personal text today.';

  const rows = [
    ['Name', esc(signIn.name)],
    ['Phone', signIn.phone ? `<a href="tel:${phoneTel(signIn.phone)}">${esc(phonePretty(signIn.phone))}</a>` : '—'],
    ['Email', signIn.email ? `<a href="mailto:${esc(signIn.email)}">${esc(signIn.email)}</a>` : '—'],
    ['Language', signIn.lang === 'es' ? 'Spanish' : 'English'],
    ['Open house', esc(home)],
    ...answers.map((line) => { const at = line.indexOf(': '); return [esc(line.slice(0, at)), represented && line.startsWith('Working') ? `<b>${esc(line.slice(at + 2))}</b>` : esc(line.slice(at + 2))]; }),
    ['Signed in', `${esc(submittedAt)} CT`],
  ];
  const html = `<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;color:#2A2626;max-width:560px">
<p style="margin:0 0 12px;font-size:17px"><b>${esc(lead)}</b></p>
<table cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px">${rows.map(([k, v]) => `<tr><td style="color:#777;vertical-align:top;padding-right:14px">${k}</td><td>${v}</td></tr>`).join('')}</table>
${smsHref && !represented ? `<p style="margin:18px 0 0"><a href="${esc(smsHref)}" style="display:inline-block;background:#2B4555;color:#ECE5D7;text-decoration:none;padding:12px 20px;font-size:15px">Text ${esc(firstName(signIn.name))} from your phone →</a></p>
<p style="font-size:12px;color:#888;margin:8px 0 0">Opens your own Messages app with a first message in ${signIn.lang === 'es' ? 'Spanish' : 'English'}, ready to edit. Nothing has been texted to them.</p>` : ''}
<p style="font-size:12px;color:#888;margin-top:14px">${savedLines.map(esc).join('<br>')}${signIn.email ? '<br>They were emailed the listing and its payment calculator. Reply to this email to write to them.' : '<br>They left no email, so nothing was emailed to them.'}</p></div>`;
  const text = [
    lead, '',
    `Name: ${signIn.name}`, `Phone: ${phonePretty(signIn.phone) || '—'}`, `Email: ${signIn.email || '—'}`,
    `Language: ${signIn.lang === 'es' ? 'Spanish' : 'English'}`, `Open house: ${home}`,
    ...answers, `Signed in: ${submittedAt} CT`, '',
    ...savedLines,
    signIn.email ? 'They were emailed the listing and its payment calculator.' : 'They left no email, so nothing was emailed to them.',
  ].join('\n');
  return { subject, text, html };
}

async function send(message) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('Missing RESEND_API_KEY');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: fromAddress(), ...message }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Resend send failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function sendOpenHouseThanks({ signIn, card, home }) {
  return send({ to: signIn.email, reply_to: REPLY_TO, ...thanksEmail({ signIn, card, home }) });
}

// LEAD_ALERT_EMAILS (comma-separated) overrides who is told, as for the Vittoria alerts.
export async function sendOpenHouseAlert({ signIn, home, submittedAt, saved }) {
  const to = (process.env.LEAD_ALERT_EMAILS || DEFAULT_ALERT_TO).split(',').map((s) => s.trim()).filter(Boolean);
  return send({ to, ...(signIn.email ? { reply_to: signIn.email } : {}), ...alertEmail({ signIn, home, submittedAt, saved }) });
}
