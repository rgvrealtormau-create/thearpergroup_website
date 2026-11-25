// Muse (Meta's agent) leads: one row from the "To Brivity" tab of the Muse lead log,
// posted here by a Zap, becomes a Brivity lead through the lead-parsing email.
//
// Brivity starts an auto plan from the lead's SOURCE (it must match a source in
// Brivity > Settings > Sources exactly), so the plan is picked by intent and language:
//   ARPER Muse - Buyer EN, ARPER Muse - Buyer ES, ARPER Muse - Renter EN, ARPER Muse - Renter ES
// The listing they asked about travels in the parser's property fields and in the note,
// together with the listing-alert wishes, so the evening Brivity run can set the alert.

const clean = (value, max = 200) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

const INTENTS = { buyer: 'Buyer', buying: 'Buyer', tenant: 'Renter', renter: 'Renter', renting: 'Renter' };
const LANGS = { en: 'EN', english: 'EN', es: 'ES', spanish: 'ES', 'español': 'ES', espanol: 'ES' };

export const MUSE_SOURCES = ['ARPER Muse - Buyer EN', 'ARPER Muse - Buyer ES', 'ARPER Muse - Renter EN', 'ARPER Muse - Renter ES'];

function digits(value) {
  const d = String(value ?? '').replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) return d.slice(1);
  return d;
}

function prettyPhone(value) {
  const d = digits(value);
  return d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : '';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Returns { lead } ready for sendBrivityEmail, or { error } for a row that must not go in.
export function museLead(row = {}) {
  const intent = INTENTS[clean(row.intent || row.leadIntent, 20).toLowerCase()];
  const lang = LANGS[clean(row.language || row.lang, 20).toLowerCase()];
  const firstName = clean(row.firstName, 60);
  const lastName = clean(row.lastName, 80);
  const email = clean(row.email, 120);
  const phone = prettyPhone(row.phone);

  if (!intent) return { error: 'Lead intent must be Buyer or Tenant' };
  if (!lang) return { error: 'Language must be English or Spanish' };
  if (!firstName) return { error: 'Missing first name' };
  if (!phone && !EMAIL_RE.test(email)) return { error: 'Needs a 10-digit phone or an email' };

  const channel = clean(row.channel, 40);
  const listing = clean(row.listingAddress, 120);
  const city = clean(row.listingCity, 60);
  const price = clean(row.listingPrice, 30);
  const beds = clean(row.listingBeds, 10);
  const description = clean(row.description, 600);

  const asked = listing
    ? `asked about ${[listing, city].filter(Boolean).join(', ')}${price ? ` · ${price}` : ''}${beds ? ` · ${beds} bd` : ''}`
    : '';
  const alertParts = [
    clean(row.alertAreas, 120) && `areas: ${clean(row.alertAreas, 120)}`,
    (clean(row.alertMinPrice, 20) || clean(row.alertMaxPrice, 20)) && `price: ${clean(row.alertMinPrice, 20) || 'any'} to ${clean(row.alertMaxPrice, 20) || 'any'}`,
    clean(row.alertMinBeds, 10) && `beds: ${clean(row.alertMinBeds, 10)}+`,
  ].filter(Boolean);
  const alert = alertParts.length ? `listing alert wanted (${alertParts.join('; ')})` : '';

  const note = [`Muse ${channel || 'chat'} lead (${lang})`, asked, description, alert].filter(Boolean).join(' — ');

  return {
    lead: {
      firstName,
      lastName,
      email: EMAIL_RE.test(email) ? email : '',
      phone,
      type: intent === 'Buyer' ? 'Buyer' : 'Tenant',
      source: `ARPER Muse - ${intent} ${lang}`,
      note,
      propertyAddress: listing || undefined,
      propertyCity: city || undefined,
      propertyPrice: price || undefined,
    },
  };
}
