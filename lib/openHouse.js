// Open house sign-in: the rules.
//
// A sign at an open house carries a QR code for /open-house/<listing id>. The page it opens
// (app/[lang]/open-house/[id]) takes a name, a mobile number, an optional email and three
// one-tap answers, and posts them to /api/open-house. That one sign-in then goes to:
//
//   - the Arper portal, which keeps it against the listing. This is the record: the agents
//     see the day's visitors on the listing's page, and the listing's "Open House" activity
//     (which the seller's weekly report is drafted from) carries the count;
//   - the sphere nurture sheet and Brivity, the same way every other form on this site does,
//     but only for a visitor who is NOT already working with an agent (we do not put another
//     agent's buyer into our own follow-up);
//   - an email to the team to follow up, and, when the visitor left an email, a thank-you
//     to the visitor with the listing and its payment calculator (lib/openHouseEmail.js).
//
// This file has no network in it except recordVisitor(), which asks the portal to keep the
// sign-in. The portal offers one function for that (open_house_sign_in), which only ever
// adds a visitor to a listing the website shows. It is called with the same two hosting
// settings the listings feed uses (PORTAL_SUPABASE_URL, PORTAL_SUPABASE_PUBLISHABLE_KEY).

import { BUSINESS } from './site.js';
import { portal } from './listings.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isListingId = (v) => typeof v === 'string' && UUID_RE.test(v);

// The three one-tap answers, as stored. The words shown are in components/OpenHouseSignIn.jsx.
export const TIMELINES = ['m3', 'm6', 'm12', 'looking'];
export const OWNS = ['no', 'yes', 'sell'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001F\u007F<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '');

// A phone number as its digits. A US number typed with its leading 1 is its ten digits.
// '' when what was typed is not a phone number.
export function phoneDigits(v) {
  let d = String(v ?? '').replace(/[^0-9]/g, '');
  if (d.length === 11 && d.startsWith('1')) d = d.slice(1);
  return d.length >= 10 && d.length <= 15 ? d : '';
}
// For a tel: or sms: link. Ten digits are a US number; anything longer already carries its
// country code (a Mexican mobile, for example).
export const phoneTel = (d) => (d ? (d.length === 10 ? `+1${d}` : `+${d}`) : '');
// "(956) 555-0100" for a ten-digit number; other lengths as typed digits.
export const phonePretty = (d) => (d && d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : d || '');

// Tidies what the page sent. This endpoint is public, so nothing is trusted: every value is
// trimmed, length-limited and checked against what it is allowed to be. Returns the tidy
// sign-in, or { error } with one of: listing, name, contact.
export function cleanSignIn(body) {
  const b = body && typeof body === 'object' ? body : {};
  if (!isListingId(b.listing)) return { error: 'listing' };
  const name = text(b.name, 80);
  if (name.length < 2 || /https?:|www\./i.test(name)) return { error: 'name' };
  const phone = phoneDigits(b.phone);
  const emailRaw = text(b.email, 254).toLowerCase();
  const email = EMAIL_RE.test(emailRaw) ? emailRaw : '';
  if (!phone && !email) return { error: 'contact' };
  const hasAgent = b.hasAgent === true || b.hasAgent === 'yes' ? true : b.hasAgent === false || b.hasAgent === 'no' ? false : null;
  return {
    listing: b.listing.toLowerCase(),
    lang: b.lang === 'es' ? 'es' : 'en',
    name, phone, email,
    hasAgent,
    agentName: hasAgent ? text(b.agentName, 80) : '',
    timeline: TIMELINES.includes(b.timeline) ? b.timeline : null,
    ownsHome: OWNS.includes(b.ownsHome) ? b.ownsHome : null,
    // The page shows the consent line above its button; pressing the button is the agreement.
    consent: b.consent === true,
  };
}

// Sign-ins whose name starts with "zz-test" are our own checks of the page. They are kept in
// the portal and emailed to the team like any other, so the whole path is exercised, but
// they are not added to the sphere sheet or sent to Brivity.
export const isTestSignIn = (signIn) => /^zz-test/i.test(signIn.name);

// Whether this visitor goes into our own follow-up (the sphere sheet and Brivity). A buyer
// who says they already work with an agent does not: they stay their agent's client.
export const joinsFollowUp = (signIn) => signIn.hasAgent !== true && !isTestSignIn(signIn);

// The answers in plain English, for the team (the sheet, Brivity and the alert email are
// always in English, whatever language the visitor used).
const TIMELINE_EN = { m3: 'within 3 months', m6: 'in 3 to 6 months', m12: 'in 6 to 12 months', looking: 'just looking' };
const OWNS_EN = { no: 'rents / does not own', yes: 'owns a home', sell: 'owns a home and would sell to buy' };
export function answerLines(signIn) {
  return [
    `Working with an agent: ${signIn.hasAgent === true ? `YES${signIn.agentName ? ` (${signIn.agentName})` : ''}` : signIn.hasAgent === false ? 'No' : 'not answered'}`,
    `Buying: ${TIMELINE_EN[signIn.timeline] || 'not answered'}`,
    `Home now: ${OWNS_EN[signIn.ownsHome] || 'not answered'}`,
  ];
}

// One line for Brivity's note and the sheet's Notes column.
export function leadNote(signIn, listingName) {
  const bits = [`Open house sign-in at ${listingName}`];
  if (signIn.timeline) bits.push(`buying ${TIMELINE_EN[signIn.timeline]}`);
  if (signIn.ownsHome) bits.push(OWNS_EN[signIn.ownsHome]);
  return `${bits.join(' — ')} (${signIn.lang.toUpperCase()})`;
}

// The row for the sphere nurture sheet. Column order matches its header row (see
// app/api/lead/route.js): Name, Contact Type, How I Know Them, Phone, Email, Preferred
// Channel, Language, Home Purchase/Sale Date, Birthday, Kids, Work, Interests,
// Last Contacted, Notes, Synced, ListingID.
export function sheetRow(signIn, listingName, submittedAt) {
  return [
    signIn.name,
    'Active Lead',
    `Open house — ${listingName}`,
    phonePretty(signIn.phone),
    signIn.email,
    '',
    signIn.lang === 'es' ? 'Spanish' : 'English',
    '', '', '', '', '', '',
    `${leadNote(signIn, listingName)} — signed in ${submittedAt} CT`,
    '',
    '',
  ];
}

// Where the page's links go. The calculator opens on this listing (its price, its taxes
// when the portal has them, and 3.5% down): see components/MortgageCalculator.jsx.
export const signInPath = (lang, listingId) => `/${lang === 'es' ? 'es' : 'en'}/open-house/${listingId}`;
export const calculatorPath = (lang, listingId) => `/${lang === 'es' ? 'es' : 'en'}/resources/mortgage-calculator?listing=${listingId}`;
// What the QR code on the sign holds: no language in it, so one sign serves both (the
// address answers in the language of the visitor's phone; app/open-house/[id]/route.js).
export const qrUrl = (listingId) => `${BUSINESS.url}/open-house/${listingId}`;

// Asks the portal to keep the sign-in. Answers what the portal answered: { ok, id, again }
// or { error } ('listing': not a listing the website shows; 'name'; 'contact'; 'full': the
// day's limit was reached), or { error: 'unreachable' } when the portal could not be asked.
export async function recordVisitor(signIn, { fetchImpl = fetch, timeoutMs = 8000 } = {}) {
  const { url, key } = portal();
  if (!url || !key) return { error: 'unreachable' };
  try {
    const res = await fetchImpl(`${url}/rest/v1/rpc/open_house_sign_in`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        listing: signIn.listing, full_name: signIn.name, phone: signIn.phone || null, email: signIn.email || null,
        language: signIn.lang, has_agent: signIn.hasAgent, agent_name: signIn.agentName || null,
        timeline: signIn.timeline, owns_home: signIn.ownsHome, consent: signIn.consent,
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return { error: 'unreachable', status: res.status };
    const answer = await res.json();
    if (answer && answer.ok === true) return { ok: true, id: answer.id || null, again: answer.again === true };
    return { error: ['listing', 'name', 'contact', 'full'].includes(answer?.error) ? answer.error : 'unreachable' };
  } catch {
    return { error: 'unreachable' };
  }
}
