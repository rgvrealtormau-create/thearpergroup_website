// Server-only: automatic welcome email to a Vittoria buyer after they (or a model-home
// agent on their behalf) submit the Vittoria form. Sent via Resend from the verified
// thearpergroup.com domain (same setup as lib/brivity.js). Replies go to Mauricio.

import { BUSINESS } from './site';

const REPLY_TO = 'rgvrealtormau@gmail.com';

function fromAddress() {
  const env = process.env.LEAD_FROM_EMAIL || 'leads@thearpergroup.com';
  const match = env.match(/<([^>]+)>/);
  return `The Arper Group <${match ? match[1] : env}>`;
}

const COPY = {
  en: {
    subject: 'Your Vittoria townhome details',
    hi: (first) => `Hi ${first},`,
    intro: (agent) =>
      `Thank you for visiting Vittoria${agent ? ` with ${agent}` : ''}! Here’s everything in one place — renderings, floor plans, pricing, and a calculator to estimate your cash to close and monthly payment.`,
    button: 'See the Vittoria townhomes',
    brochure: 'Download the brochure (PDF)',
    facts: '1,767 sq. ft. · 3 bed + flex · 3 baths · pre-sale at $235,000',
    questions: 'Questions or ready to tour again? Just reply to this email, or call or text us:',
    sign: 'Mauricio & Pamela — The Arper Group',
    footer: 'You’re receiving this because you asked for information about Vittoria. Pricing and availability are set by the builder and subject to change.',
  },
  es: {
    subject: 'La información de los townhomes en Vittoria',
    hi: (first) => `Hola ${first}:`,
    intro: (agent) =>
      `¡Gracias por visitar Vittoria${agent ? ` con ${agent}` : ''}! Aquí tienes todo en un solo lugar — imágenes, planos, precios y una calculadora para estimar cuánto necesitas para cerrar y tu pago mensual.`,
    button: 'Ver los townhomes en Vittoria',
    brochure: 'Descargar el folleto (PDF)',
    facts: '1,767 pies² · 3 recámaras + flex · 3 baños · preventa en $235,000',
    questions: '¿Tienes preguntas o quieres volver a verlos? Responde este correo, o llámanos o mándanos mensaje:',
    sign: 'Mauricio y Pamela — The Arper Group',
    footer: 'Recibes este correo porque pediste información sobre Vittoria. Los precios y la disponibilidad los define el constructor y pueden cambiar.',
  },
};

const esc = (s) => String(s || '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

export async function sendVittoriaWelcomeEmail({ to, name, lang, referralAgent }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('Missing RESEND_API_KEY');
  const L = lang === 'es' ? 'es' : 'en';
  const c = COPY[L];
  const first = (name || '').trim().split(/\s+/)[0] || '';
  const agentFirst = referralAgent ? referralAgent.split(' ')[0] : '';
  const pageUrl = `${BUSINESS.url}/${L}/communities/vittoria?utm_source=welcome-email&utm_medium=email&utm_campaign=vittoria`;
  const pdfUrl = `${BUSINESS.url}/downloads/vittoria-townhomes-booklet.pdf`;
  const address = '4900 N 10th St Ste. B4, McAllen, TX 78504';

  const text = [
    c.hi(first), '',
    c.intro(agentFirst), '',
    c.facts, '',
    `${c.button}: ${pageUrl}`,
    `${c.brochure}: ${pdfUrl}`, '',
    c.questions,
    `Mauricio ${BUSINESS.phoneDisplay} · Pamela ${BUSINESS.phonePam}`, '',
    c.sign,
    'The Arper Group · Alliance Real Estate Group',
    address, '',
    c.footer,
  ].join('\n');

  const html = `<!doctype html><html><body style="margin:0;background:#F7F3EC;font-family:Helvetica,Arial,sans-serif;color:#2A2626">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3EC"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e6dfd2">
<tr><td style="background:#2B4555;padding:22px 28px;color:#ECE5D7;font-size:13px;letter-spacing:2px;text-transform:uppercase">The Arper Group · Vittoria</td></tr>
<tr><td style="padding:28px">
<p style="margin:0 0 14px;font-size:16px">${esc(c.hi(first))}</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.55">${esc(c.intro(agentFirst))}</p>
<p style="margin:0 0 22px;font-size:13px;color:#946443">${esc(c.facts)}</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#2B4555"><a href="${pageUrl}" style="display:inline-block;padding:13px 22px;color:#ECE5D7;text-decoration:none;font-size:15px">${esc(c.button)} →</a></td></tr></table>
<p style="margin:16px 0 0;font-size:14px"><a href="${pdfUrl}" style="color:#2B4555">${esc(c.brochure)}</a></p>
<p style="margin:26px 0 6px;font-size:14px;line-height:1.5">${esc(c.questions)}</p>
<p style="margin:0;font-size:14px;line-height:1.6">Mauricio <a href="tel:${BUSINESS.phone}" style="color:#2B4555">${BUSINESS.phoneDisplay}</a> · Pamela <a href="tel:${BUSINESS.phonePamTel}" style="color:#2B4555">${BUSINESS.phonePam}</a></p>
<p style="margin:22px 0 0;font-size:14px">${esc(c.sign)}</p>
</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #eee;font-size:11px;line-height:1.5;color:#777">The Arper Group · Alliance Real Estate Group · ${address}<br>${esc(c.footer)}</td></tr>
</table></td></tr></table></body></html>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: fromAddress(), to, reply_to: REPLY_TO, subject: c.subject, text, html }),
  });
  if (!res.ok) throw new Error(`Resend welcome send failed: ${res.status} ${await res.text()}`);
  return res.json();
}
