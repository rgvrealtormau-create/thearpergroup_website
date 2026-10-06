// The individual listings on the Featured listings page.
//
// They are not kept in this repository. They come from the Arper portal
// (portal.thearpergroup.com), where each listing has a "Website" section with a
// "Show on the website" tick box. The portal offers one public feed that answers:
// "which listings are ticked, complete, and still Active, Reserved or Under Contract?"
// This file asks that question and turns each answer into a card.
//
// So: to add, change or remove a listing here, do it in the portal. A listing marked
// Closed, Leased, Expired, Withdrawn or Terminated there stops being returned, and the
// page drops it within about a minute (LISTING_REFRESH_SECONDS). Nothing to deploy.
//
// The three community cards at the top of the page are still hand-built (lib/content.js).
//
// SERVER ONLY. This file runs on the server (pages, the lead API), never in a visitor's
// browser. Where the portal is and the key to ask it are NOT written in this repository:
// they are two settings on the hosting account (Vercel > Settings > Environment Variables):
//   PORTAL_SUPABASE_URL
//   PORTAL_SUPABASE_PUBLISHABLE_KEY
// There are no fallback values. If either is missing, the feed cannot be read.

import { BUSINESS } from './site.js';
import { featuredCommunities, FEATURED_CATEGORIES, citySlugs } from './content.js';

const PHOTO_BUCKET = 'listing-photos';

// How long the site keeps an answer before asking the portal again.
export const LISTING_REFRESH_SECONDS = 60;

// The two hosting settings, read when needed. `url` is null when it is not set.
function portal() {
  const url = (process.env.PORTAL_SUPABASE_URL || '').trim().replace(/\/$/, '');
  const key = (process.env.PORTAL_SUPABASE_PUBLISHABLE_KEY || '').trim();
  return { url: url || null, key: key || null };
}

// Reserved and Under Contract listings stay on the page; their status replaces the
// label on the photo so nobody mistakes them for available.
const STATUS_TAGS = {
  Reserved: { en: 'Reserved', es: 'Reservada' },
  'Under Contract': { en: 'Under contract', es: 'Bajo contrato' },
};

// The button under each card, when the portal does not give its own wording.
const ASK = {
  homes: { en: 'Ask about this home', es: 'Pregunta por esta casa' },
  condos: { en: 'Ask about this condo', es: 'Pregunta por este condominio' },
  multifamily: { en: 'Ask about this property', es: 'Pregunta por esta propiedad' },
  lots: { en: 'Ask about this lot', es: 'Pregunta por este lote' },
  rentals: { en: 'Ask about this rental', es: 'Pregunta por esta renta' },
  commercial: { en: 'Ask about this space', es: 'Pregunta por este local' },
};
const PER_MONTH = { en: '/ month', es: '/ mes' };

// A listing that belongs to one of our communities gets a link to that community's page.
// Only communities that have a page on this site are listed here.
const COMMUNITY_LINKS = {
  vittoria: { path: 'communities/vittoria', label: { en: 'See the Vittoria community', es: 'Ver la comunidad Vittoria' } },
  'cedar-ridge-reserve': {
    path: 'communities/cedar-ridge-reserve',
    label: { en: 'See the Cedar Ridge Reserve community', es: 'Ver la comunidad Cedar Ridge Reserve' },
  },
};

// The calculator a listing can be opened in. Only for-sale listings the calculators make
// sense for: a lot is not financed like a home, and a lease has no purchase price.
const CALCULATORS = {
  homes: { path: 'resources/mortgage-calculator', label: { en: 'Estimate the payment', es: 'Calcula el pago' } },
  condos: { path: 'resources/mortgage-calculator', label: { en: 'Estimate the payment', es: 'Calcula el pago' } },
  multifamily: { path: 'resources/investment-property-calculator', label: { en: 'Run the numbers', es: 'Haz las cuentas' } },
};

const money = (n) => `$${Math.round(Number(n)).toLocaleString('en-US')}`;
const clean = (v) => (typeof v === 'string' ? v.trim() : '');
// English and Spanish side by side. Blank Spanish falls back to English; blank English means "none".
const pair = (en, es) => (clean(en) ? { en: clean(en), es: clean(es) || clean(en) } : null);

// "1615 Gloria Ann Dr, Edinburg, TX 78539, USA" -> ["1615 Gloria Ann Dr", "Edinburg, TX 78539"]
function splitAddress(address) {
  const whole = String(address || '').replace(/,\s*(USA|United States)\s*$/i, '').trim();
  const at = whole.indexOf(',');
  return at === -1 ? [whole, ''] : [whole.slice(0, at).trim(), whole.slice(at + 1).trim()];
}

// Where a listing's photo is. Normally a file in the portal's photo folder. The first
// listings were moved over with their photos still in this site's own /photos folder;
// those arrive as a full address on this site and are served as local files.
function photoSrc(path) {
  const p = String(path || '');
  if (p.startsWith(`${BUSINESS.url}/`)) return p.slice(BUSINESS.url.length);
  if (/^https:\/\//i.test(p)) return p;
  const { url } = portal();
  return url ? `${url}/storage/v1/object/public/${PHOTO_BUCKET}/${p}` : null;
}

// One row from the portal -> one card. Returns null for a row the page cannot show
// (no price, no photo, an unknown filter), so one odd listing never breaks the page.
//
// The portal may send its own wording for the heading, the city line, the photo
// description and the button (title, city_line, alt, ask). When it does, that wording is
// used as given. When a box was left blank there, the card works it out from the address
// and the kind of listing.
export function toCard(row) {
  if (!row || typeof row !== 'object' || !row.id || !row.photo_path || !row.blurb_en) return null;
  const category = FEATURED_CATEGORIES.includes(row.category) ? row.category : null;
  if (!category) return null;
  const img = photoSrc(row.photo_path);
  if (!img) return null;

  const forSale = Boolean(row.for_sale) && row.price != null;
  const forRent = Boolean(row.for_rent) && row.rent_price != null;
  if (!forSale && !forRent) return null;
  // A listing offered both ways leads with its sale price and shows the rent on a second line.
  const amount = Number(forSale ? row.price : row.rent_price);
  const rent = forRent ? money(row.rent_price) : null;
  const also = forSale && forRent
    ? { en: `Also for rent at ${rent} / month`, es: `También en renta por ${rent} al mes` }
    : null;

  const [street, city] = splitAddress(row.address);
  // A listing with a name of its own (a unit, a subdivision) leads with the name.
  const plainTitle = clean(row.name) || street;
  const plainCity = clean(row.name) ? [street, city].filter(Boolean).join(', ') : city;
  const title = pair(row.title_en, row.title_es);
  const type = pair(row.property_type, row.property_type_es) || { en: '', es: '' };
  // A map pin set in the portal: both numbers or neither.
  const lat = row.latitude == null ? NaN : Number(row.latitude);
  const lng = row.longitude == null ? NaN : Number(row.longitude);

  return {
    slug: String(row.id),
    category,
    status: row.status,
    img,
    alt: pair(row.alt_en, row.alt_es) || { en: `${type.en}: ${plainTitle}`, es: `${type.es}: ${plainTitle}` },
    // 'rendering', 'concept' or 'staged' put a label on the photo; a plain photo has none.
    rendering: ['rendering', 'concept', 'staged'].includes(row.photo_kind) ? row.photo_kind : null,
    price: money(amount),
    amount,
    priceSuffix: forSale ? null : PER_MONTH,
    also,
    // The card heading. A plain string when it reads the same in both languages.
    address: title && title.en !== title.es ? title : (title ? title.en : plainTitle),
    city: clean(row.city_line) || plainCity,
    // For looking the listing up on a map: always the real street address.
    geo: [street, city].filter(Boolean).join(', '),
    pin: Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null,
    mls: clean(row.mls_number) || null,
    type,
    tag: STATUS_TAGS[row.status] || pair(row.tag_en, row.tag_es),
    facts: pair(row.facts_en, row.facts_es),
    community: COMMUNITY_LINKS[clean(row.community)] || null,
    blurb: pair(row.blurb_en, row.blurb_es),
    promos: { en: Array.isArray(row.promos_en) ? row.promos_en : [], es: Array.isArray(row.promos_es) ? row.promos_es : [] },
    cso: pair(row.cso_en, row.cso_es),
    ask: pair(row.ask_en, row.ask_es) || ASK[category],
    // Which calculator this listing can be opened in (see ListingImport).
    calc: forSale ? CALCULATORS[category] || null : null,
    updatedAt: row.updated_at || null,
  };
}

// The heading as plain text in one language.
export const cardTitle = (card, lang = 'en') => (typeof card.address === 'string' ? card.address : card.address[lang] || card.address.en);

// Cards in page order: by filter (homes first), then lowest price first.
export function toCards(rows) {
  return (Array.isArray(rows) ? rows : []).map(toCard).filter(Boolean)
    .sort((a, b) => FEATURED_CATEGORIES.indexOf(a.category) - FEATURED_CATEGORIES.indexOf(b.category)
      || a.amount - b.amount || cardTitle(a).localeCompare(cardTitle(b)));
}

// Asks the portal. Throws when it cannot be reached, answers oddly, or the two hosting
// settings are missing: the page then keeps showing the last good answer instead of going
// empty (and a deploy made while the portal is down fails rather than publishing a page
// with no listings).
export async function fetchPortalRows({ fetchImpl = fetch } = {}) {
  const { url, key } = portal();
  if (!url || !key) {
    throw new Error('The portal listings cannot be read: PORTAL_SUPABASE_URL and PORTAL_SUPABASE_PUBLISHABLE_KEY must be set in the hosting settings.');
  }
  const res = await fetchImpl(`${url}/rest/v1/rpc/website_listings`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: '{}',
    next: { revalidate: LISTING_REFRESH_SECONDS, tags: ['portal-listings'] },
  });
  if (!res.ok) throw new Error(`The portal's listings could not be read (HTTP ${res.status}).`);
  const rows = await res.json();
  if (!Array.isArray(rows)) throw new Error("The portal's listings came back in an unexpected shape.");
  return rows;
}

export async function getFeaturedListings(options) {
  return toCards(await fetchPortalRows(options));
}

// "Which listing?" in the inquiry form: the communities, then the listings, in page order.
// `labelEn` is what a lead is filed under, whatever language the visitor used.
const cityName = (line) => String(line || '').split(',').slice(-2, -1)[0]?.trim() || String(line || '').split(',')[0].trim();
const listingLabel = (card, lang = 'en') => [cardTitle(card, lang), cityName(card.city)].filter(Boolean).join(' · ');
export function inquiryOptions(lang, cards) {
  return [
    ...featuredCommunities.map((c) => ({
      slug: c.slug,
      label: `${c.name[lang]} · ${c.location.split(',')[0]}`,
      labelEn: `${c.name.en} · ${c.location.split(',')[0]}`,
    })),
    ...cards.map((card) => ({ slug: card.slug, label: listingLabel(card, lang), labelEn: listingLabel(card, 'en') })),
  ];
}

// The newest change among the cards, for the "last updated" line. Null when there are none.
export function lastUpdated(cards) {
  const times = cards.map((c) => Date.parse(c.updatedAt)).filter((t) => !Number.isNaN(t));
  return times.length ? new Date(Math.max(...times)) : null;
}

// ---- listings a calculator can import ----
// What "Import from an Arper Group listing" offers: for-sale homes, condos and
// multifamily, each with its price and, when the calculators know the city, its area
// (which sets the property-tax estimate). `only` narrows it to some filters.
const areaSlug = (cityLine) => {
  const slug = cityName(cityLine).toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
  return citySlugs.includes(slug) ? slug : null;
};
export function importableListings(cards, only = null) {
  return cards.filter((card) => card.calc && (!only || only.includes(card.category))).map((card) => ({
    id: card.slug,
    label: listingLabel(card),
    // The same name in Spanish, when the portal gave the listing a Spanish heading.
    labelEs: listingLabel(card, 'es'),
    price: card.amount,
    priceText: card.price,
    citySlug: areaSlug(card.city),
    category: card.category,
  }));
}

// For the calculator pages. Importing is a convenience: if the portal cannot be reached
// the calculator simply shows no import box, and still works.
export async function getImportableListings(only = null, options) {
  try {
    return importableListings(await getFeaturedListings(options), only);
  } catch {
    return [];
  }
}
