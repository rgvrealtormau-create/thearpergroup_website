// Reusable Meta lead ads for a single listing (buyer leads). One Apps Script per campaign
// sends formType "listing_meta_ad", the campaign key below and the form's answers as
// "label: value; label: value" in `detail`.
//
// The answers pick one of three reusable Brivity plans, so Brivity's triggers never change
// from campaign to campaign:
//
//   agent       Q3 = they already have an agent        -> ARPER Meta Listing - Agent EN|ES
//   hot         timeline 0-3 months, or cash / pre-approved / proof of funds
//                                                       -> ARPER Meta Listing - Hot EN|ES
//   nurture     everyone else                          -> ARPER Meta Listing - Nurture EN|ES
//   no_consent  call/text consent not given             -> ARPER Meta Listing - No Consent EN|ES (no plan)
//
// The listing itself (address, price, features) lives only here: the lead gets its listing
// intro email from this site, and the Brivity plans stay generic. A new campaign = one new
// entry in META_LISTING_CAMPAIGNS plus its Apps Script.

import { isTestName } from './portalLeads.js';
import { splitAnswers, callTimeAnswer } from './metaLeadAds.js';

const PORTAL_URL = 'https://portal.thearpergroup.com';
const SITE_URL = 'https://www.thearpergroup.com';
const REPLY_TO = 'rgvrealtormau@gmail.com';
const DEFAULT_ALERT_TO = 'rgvrealtormau@gmail.com,pamelaperezrealtor@gmail.com';

export const META_LISTING_CAMPAIGNS = {
  'tierra-encantada-1402': {
    name: '1402 Tierra Encantada',
    address: '1402 Tierra Encantada, Weslaco, TX 78596',
    listingId: 'f1fc39e9-860b-47ed-b566-ba0fc13e427f', // the portal's listing
    // Who financing leads on this listing are introduced to (only after they say yes).
    lender: 'Cross Country Mortgage',
    facts: {
      en: [
        '$405,000 (price reduced $12,000 on Nov 16)',
        'Built in 2025, single story: 4 bed, 3 bath, 2,980 sq ft on an 8,250 sq ft lot',
        'Two-story great room with a floor-to-ceiling window wall',
        'Waterfall-edge stone island, split floor plan and a covered patio',
        'Inside the gated Tierra Santa Golf Club: 18-hole course, clubhouse, pool and walking trails',
        'MLS #514101',
      ],
      es: [
        '$405,000 (le bajaron $12,000 el 16 de noviembre)',
        'Construcción 2025, de un solo piso: 4 recámaras, 3 baños, 2,980 pies cuadrados en un terreno de 8,250 pies cuadrados',
        'Sala principal de doble altura con una pared de ventanas de piso a techo',
        'Isla de piedra con caída en cascada, planta dividida y patio techado',
        'Dentro de Tierra Santa Golf Club, con portón: campo de golf de 18 hoyos, casa club, alberca y senderos para caminar',
        'MLS #514101',
      ],
    },
    tour: {
      en: 'The home is vacant, so I can set up a private tour on your schedule, evenings and weekends included. Reply with a day and time, or text me.',
      es: 'La casa está desocupada, así que te la enseño cuando te quede bien, también en las tardes o fines de semana. Contéstame con el día y la hora, o mándame mensaje.',
    },
    agentFacts: {
      en: ['MLS #514101 · $405,000', '4 bed · 3 bath · 2,980 sq ft · single story, built in 2025', 'Vacant; showings are booked through ShowingTime'],
      es: ['MLS #514101 · $405,000', '4 recámaras · 3 baños · 2,980 pies cuadrados · un solo piso, construida en 2025', 'Desocupada; las visitas se agendan por ShowingTime'],
    },
  },
};

export const TRACK_LABEL = { hot: 'Hot', nurture: 'Nurture', agent: 'Agent', no_consent: 'No Consent' };

const norm = (s) => String(s || '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
// No \b here: in JavaScript \b does not see "í" as a letter, so "Sí" would never match.
const YES = /^(yes|s[ií]|true|checked|acepto|i agree)(?!\p{L})/u;

// The answer under the label the Apps Script writes (exact), else the first label that
// looks like it, so a script that passes Meta's own question text still works.
function answer(pairs, key, labelRe) {
  const hit = pairs.find(([label]) => norm(label) === key) || pairs.find(([label]) => labelRe.test(norm(label)));
  return hit ? norm(hit[1]) : null;
}

// Which plan the form's answers call for. First match wins: consent, agent, readiness.
export function listingTrack(detail) {
  const pairs = splitAnswers(detail);
  const consent = answer(pairs, 'consent', /consent|acepto|agree|autoriz|permiso/);
  if (!consent || !YES.test(consent)) return 'no_consent';

  const agent = answer(pairs, 'agent', /agent|agente/);
  if (agent && YES.test(agent) && !/not yet|still|todav[ií]a|a[uú]n no|buscando/.test(agent)) return 'agent';

  const timeline = answer(pairs, 'timeline', /timeline|when|buying|cu[aá]ndo|comprar|mudar/);
  if (timeline && /ready now|0 ?(-|–|to|a) ?30|\b1 ?(-|–|to|a) ?3 ?(months|meses)|ahorita|de inmediato|list[oa] ya|ya estoy/.test(timeline)) return 'hot';

  const funds = answer(pairs, 'pre-approved / proof of funds', /pre-?appro|proof|pre-?aprob|comprobante|fondos/);
  if (funds && YES.test(funds)) return 'hot';

  const cash = answer(pairs, 'cash or financing', /cash|financ|contado/);
  if (cash && /^(cash|contado|efectivo)/.test(cash)) return 'hot';

  return 'nurture';
}

// The Brivity source. Must match a source in Brivity > Settings > Sources exactly; the
// Hot, Nurture and Agent sources each start their ARPER plan, No Consent starts none.
export function listingSource(track, lang) {
  return `ARPER Meta Listing - ${TRACK_LABEL[track] || 'Nurture'} ${lang === 'es' ? 'ES' : 'EN'}`;
}

export function classifyListingLead({ campaign, detail, lang }) {
  const config = META_LISTING_CAMPAIGNS[campaign] || null;
  const track = listingTrack(detail);
  return { config, track, source: listingSource(track, lang) };
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

const SIGNATURE = {
  en: ['Mauricio Arredondo', 'REALTOR® · Licensed Texas Real Estate Sales Agent', 'The Arper Group | Alliance Real Estate Group', '4900 N 10th St Ste B4, McAllen, TX 78504', '(956) 201-8002 · mauricio@thearpergroup.com'],
  es: ['Mauricio Arredondo', 'REALTOR® · Agente de bienes raíces con licencia en Texas', 'The Arper Group | Alliance Real Estate Group', '4900 N 10th St Ste B4, McAllen, TX 78504', '(956) 201-8002 · mauricio@thearpergroup.com'],
};
// TREC links, the same ones the Brivity plan emails carry.
const TREC_LINKS = {
  en: [['Information About Brokerage Services', 'https://drive.google.com/file/d/1FjegoP-dupXJXuQMlJKE_MTZPcXdjy4r/view'], ['TREC Consumer Protection Notice', 'https://www.trec.texas.gov/forms/consumer-protection-notice']],
  es: [['Información sobre servicios de corretaje', 'https://drive.google.com/file/d/1FjegoP-dupXJXuQMlJKE_MTZPcXdjy4r/view'], ['Aviso de protección al consumidor de TREC', 'https://www.trec.texas.gov/forms/consumer-protection-notice']],
};
const OPT_OUT = {
  en: 'Prefer not to get emails like this? Reply and let me know.',
  es: '¿Prefieres no recibir correos como este? Contéstame y me dices.',
};

// The listing intro email: details + private tour for buyers, showing info for buyers who
// already have an agent. No-consent leads get nothing automatic.
export function listingIntroEmail({ config, track, lang, name }) {
  if (!config || track === 'no_consent') return null;
  const L = lang === 'es' ? 'es' : 'en';
  const first = String(name || '').trim().split(/\s+/)[0] || '';
  const listingsUrl = `${SITE_URL}/${L}/listings`;
  let subject; let paragraphs; let bullets; let closing;
  if (track === 'agent') {
    subject = L === 'es' ? `${config.name}: información para ti y tu agente` : `${config.name}: showing info for you and your agent`;
    paragraphs = L === 'es'
      ? [`Gracias por tu interés en la casa en ${config.address}. Como ya trabajas con un agente, aquí está lo que necesita para agendar la visita:`]
      : [`Thanks for your interest in ${config.address}. Since you're already working with an agent, here's what they'll need to set up a showing:`];
    bullets = [...config.agentFacts[L], L === 'es' ? 'Agente del listado: Mauricio Arredondo, (956) 201-8002' : 'Listing agent: Mauricio Arredondo, (956) 201-8002'];
    closing = L === 'es'
      ? ['Tu agente puede pedir la cita por ShowingTime, y con gusto le contesto cualquier pregunta sobre la casa.', 'Gracias de nuevo,']
      : ['Your agent can request a time through ShowingTime, and I\'m glad to answer any questions they have about the home.', 'Thanks again,'];
  } else {
    subject = L === 'es' ? `${config.name}: los detalles y tu visita privada` : `${config.name}: details + private tour`;
    paragraphs = L === 'es'
      ? [`Gracias por preguntar por la casa en ${config.address}. Aquí te va lo principal:`]
      : [`Thanks for asking about ${config.address}. Here's the quick rundown:`];
    bullets = config.facts[L];
    closing = [
      L === 'es' ? `Fotos: ${listingsUrl}` : `Photos: ${listingsUrl}`,
      config.tour[L],
      L === 'es' ? 'Saludos,' : 'Talk soon,',
    ];
  }
  const hi = L === 'es' ? `Hola ${first},` : `Hi ${first},`;
  const sig = SIGNATURE[L];
  const links = TREC_LINKS[L];
  const text = [hi, '', ...paragraphs, '', ...bullets.map((b) => `- ${b}`), '', ...closing.flatMap((c) => [c, '']), ...sig, '', ...links.map(([t, u]) => `${t}: ${u}`), '', OPT_OUT[L]].join('\n');
  const linkify = (s) => esc(s).replace(esc(listingsUrl), `<a href="${listingsUrl}">${esc(listingsUrl)}</a>`);
  const html = `<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#2A2626;max-width:560px">
<p>${esc(hi)}</p>
${paragraphs.map((p) => `<p>${esc(p)}</p>`).join('\n')}
<ul>${bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
${closing.map((c) => `<p>${linkify(c)}</p>`).join('\n')}
<p style="font-size:13px;color:#555;margin-top:20px">${sig.map(esc).join('<br>')}</p>
<p style="font-size:12px">${links.map(([t, u]) => `<a href="${u}">${esc(t)}</a>`).join(' | ')}</p>
<p style="font-size:12px;color:#888">${esc(OPT_OUT[L])}</p></div>`;
  return { subject, html, text };
}

function fromAddress() {
  const env = process.env.LEAD_FROM_EMAIL || 'leads@thearpergroup.com';
  return (env.match(/<([^>]+)>/) || [])[1] || env;
}

export async function sendListingIntroEmail({ to, config, track, lang, name }, { fetchImpl = fetch } = {}) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to || '')) return { skipped: 'no email' };
  if (isTestName(name)) return { skipped: 'test' };
  const email = listingIntroEmail({ config, track, lang, name });
  if (!email) return { skipped: track };
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('Missing RESEND_API_KEY');
  const res = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: `Mauricio Arredondo | The Arper Group <${fromAddress()}>`, to: [to], reply_to: REPLY_TO, ...email }),
  });
  if (!res.ok) throw new Error(`Resend listing intro failed: ${res.status}`);
  return res.json();
}

const NEXT_STEP = {
  hot: 'Hot plan — call within 5 minutes, then send the Day-0 text.',
  nurture: 'Nurture plan — call within 5 minutes, then send the Day-0 text.',
  agent: 'Has an agent — showing-info email sent. Do not call or text.',
  no_consent: 'No call/text consent — no plan started. Do not call or text; email by hand only.',
};

export function listingLeadAlert({ name, phone, email, lang, source, detail, track, config, campaign, portalId, submittedAt }) {
  const digits = String(phone || '').replace(/[^0-9]/g, '').slice(-10);
  const link = portalId ? `${PORTAL_URL}/en/leads/${portalId}` : `${PORTAL_URL}/en/leads`;
  const answers = splitAnswers(detail);
  const callTime = callTimeAnswer(answers);
  const language = lang === 'es' ? 'Spanish' : 'English';
  const listingName = config?.name || `unknown campaign "${campaign}"`;
  const subject = `New ${config?.name || 'Meta listing'} lead (${TRACK_LABEL[track]}): ${name}`;
  const canCall = track === 'hot' || track === 'nurture';
  const rows = [
    ['Name', esc(name)],
    ['Phone', digits && canCall ? `<a href="tel:+1${digits}">${esc(phone)}</a> · <a href="sms:+1${digits}">text</a>` : esc(phone || '—')],
    ['Email', email ? `<a href="mailto:${esc(email)}">${esc(email)}</a>` : '—'],
    ['Language', language],
    ['Call time', callTime ? `<b>${esc(callTime)}</b>` : '—'],
    ['Source', esc(source)],
    ['Lender for intros', esc(config?.lender || '—')],
    ['Submitted', `${esc(submittedAt)} CT`],
  ];
  const answerRows = answers.map(([label, value]) => `<tr><td style="color:#777;vertical-align:top;padding-right:14px">${esc(label || 'Answer')}</td><td>${esc(value)}</td></tr>`).join('');
  const html = `<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;color:#2A2626;max-width:560px">
<p style="margin:0 0 4px;font-size:17px"><b>${esc(NEXT_STEP[track])}</b></p>
<p style="margin:0 0 12px;font-size:13px;color:#946443">${esc(listingName)} · Meta lead ad</p>
<table cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px">${rows.map(([k, v]) => `<tr><td style="color:#777;vertical-align:top;padding-right:14px">${k}</td><td>${v}</td></tr>`).join('')}</table>
${answers.length ? `<p style="margin:16px 0 4px;font-size:14px"><b>Their answers</b></p><table cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px;background:#F7F3EC">${answerRows}</table>` : '<p style="margin:16px 0 4px;font-size:14px;color:#777">No answers came with this lead.</p>'}
<p style="margin:18px 0"><a href="${link}" style="background:#2B4555;color:#ECE5D7;padding:10px 16px;border-radius:2px;text-decoration:none">Open in the portal</a></p>
<p style="font-size:12px;color:#888">Also sent to Brivity and the Sphere Nurture sheet.</p></div>`;
  const text = [
    NEXT_STEP[track], `${listingName} · Meta lead ad`, '',
    `Name: ${name}`, `Phone: ${phone || '—'}`, `Email: ${email || '—'}`, `Language: ${language}`,
    `Call time: ${callTime || '—'}`, `Source: ${source}`, `Lender for intros: ${config?.lender || '—'}`, `Submitted: ${submittedAt} CT`, '',
    'Their answers:',
    ...(answers.length ? answers.map(([label, value]) => `- ${label ? `${label}: ` : ''}${value}`) : ['- none came with this lead']),
    '', `Open in the portal: ${link}`,
  ].join('\n');
  return { subject, html, text };
}

export async function sendListingLeadAlert(lead, { fetchImpl = fetch } = {}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('Missing RESEND_API_KEY');
  if (isTestName(lead.name)) return { skipped: 'test' };
  const to = (process.env.LEAD_ALERT_EMAILS || DEFAULT_ALERT_TO).split(',').map((s) => s.trim()).filter(Boolean);
  const { subject, html, text } = listingLeadAlert(lead);
  const res = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: `The Arper Group <${fromAddress()}>`, to, ...(lead.email ? { reply_to: lead.email } : {}), subject, text, html }),
  });
  if (!res.ok) throw new Error(`Resend listing alert failed: ${res.status}`);
  return res.json();
}
