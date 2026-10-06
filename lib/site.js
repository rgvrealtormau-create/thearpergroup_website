// Central brand + business constants and helpers.

// Web3Forms is a public, client-side access key by design (not a secret).
export const WEB3FORMS_ACCESS_KEY = 'd934d97b-2a31-4978-948c-c15bd5f0b072';

export const BUSINESS = {
  name: 'The Arper Group',
  broker: 'Alliance Real Estate Group',
  phone: '+1-956-517-5223',        // Mauricio
  phoneDisplay: '(956) 517-5223',  // Mauricio
  phonePam: '(956) 414-6128',      // Pamela
  phonePamTel: '+1-956-414-6128',  // Pamela
  email: 'hello@thearpergroup.com',// TODO: confirm real inbox
  street: '4900 N 10th St Ste. B4',
  city: 'McAllen',
  region: 'TX',
  postalCode: '78504',
  areaServed: ['McAllen', 'Edinburg', 'Pharr', 'Mission', 'Weslaco', 'Rio Grande Valley'],
  url: 'https://www.thearpergroup.com',
  googleBusiness: 'https://www.google.com/maps/search/?api=1&query=Alliance+Real+Estate+Group+Mauricio+Arredondo+McAllen',
};

// Per-agent social profiles.
export const SOCIAL = {
  mau: {
    name: 'Mauricio',
    instagram: 'https://www.instagram.com/realtor.mau/',
    facebook: 'https://www.facebook.com/profile.php?id=61572522041262',
    tiktok: 'https://www.tiktok.com/@realtor.mau',
  },
  pam: {
    name: 'Pamela',
    instagram: 'https://www.instagram.com/pamelarealtor.tx/',
    facebook: 'https://www.facebook.com/pamelarealtor.tx',
    tiktok: 'https://www.tiktok.com/@pameluv_',
  },
};

// Full sameAs list for the RealEstateAgent/LocalBusiness JSON-LD.
export const SAME_AS = [
  SOCIAL.mau.instagram, SOCIAL.mau.facebook, SOCIAL.mau.tiktok,
  SOCIAL.pam.instagram, SOCIAL.pam.facebook, SOCIAL.pam.tiktok,
  BUSINESS.googleBusiness,
].filter(Boolean);

// Brivity IDX subdomain (leads registered here route to Mauricio).
const SEARCH_BASE = 'https://thearpergroup.aregtx.com/search.php';

export function searchUrl(campaign = 'search', city) {
  const p = new URLSearchParams({
    status: '1|3',
    view: 'hybrid_view',
    utm_source: 'arpersite',
    utm_medium: 'cta',
    utm_campaign: campaign,
  });
  if (city) {
    p.set('multi_search', city);
    p.set('multi_cat', 'Address');
  }
  return `${SEARCH_BASE}?${p.toString()}`;
}

// The private portal for clients and agents (a separate app with its own sign-in).
export const PORTAL_URL = 'https://portal.thearpergroup.com';
export function portalUrl(lang) { return `${PORTAL_URL}/${lang === 'es' ? 'es' : 'en'}`; }

export const LANGS = ['en', 'es'];
export function otherLang(l) { return l === 'es' ? 'en' : 'es'; }

// Swap the leading locale segment of a path for language toggling.
export function swapLangInPath(pathname, target) {
  if (!pathname) return `/${target}`;
  const parts = pathname.split('/');
  if (parts[1] === 'en' || parts[1] === 'es') { parts[1] = target; return parts.join('/') || `/${target}`; }
  return `/${target}${pathname}`;
}

// Canonical + hreflang for a page, given its language-agnostic path (e.g. '', 'about', `rgv/${slug}`).
// Called from each page's own generateMetadata so every route gets correct, page-specific
// canonical/alternate tags instead of inheriting the layout's default.
export function pageAlternates(lang, path = '') {
  const suffix = path ? `/${path}` : '';
  const en = `${BUSINESS.url}/en${suffix}`;
  const es = `${BUSINESS.url}/es${suffix}`;
  return {
    canonical: lang === 'es' ? es : en,
    languages: { en, es, 'x-default': en },
  };
}

// Stable @id's so multiple JSON-LD blocks (layout + reviews page) can reference
// the same nodes instead of declaring duplicate entities.
export const BUSINESS_ID = `${BUSINESS.url}/#business`;
export const WEBSITE_ID = `${BUSINESS.url}/#website`;
export const MAU_ID = `${BUSINESS.url}/#mauricio`;
export const PAM_ID = `${BUSINESS.url}/#pamela`;

export function breadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// Alliance agents who host the Vittoria model home. A lead submitted through the
// model-home check-in (or the public Vittoria form) credits the agent picked here,
// and that name is written to the lead sheet as the referral source. Edit this list
// to add/remove hosts; the API rejects names that aren't on it.
export const VITTORIA_MODEL_HOME_AGENTS = [
  'Diana Cerecedo',
  'Perla Cristerna',
  'Shellia Gowins',
  'William Milan',
  'Francisco Pacheco',
  'Daniela Pacheco',
  'Esteban Sanchez',
  'Fernando Pacheco',
  'David Peña',
  'Huincar Peña',
  'Marisol Ruiz',
  'Marissa Rea',
  'Zandra Maldonado',
  'Griselda Quintero',
].sort((a, b) => a.localeCompare(b, 'es'));

// BuildHere's "Ask about this home" CTA links to the Vittoria page with
// ?lot=<human-readable lot number>&lotId=<uuid>&community=<name>&subject=home#contact.
// Treated as untrusted input (anyone can craft this URL): trimmed, length-limited, and
// lotId/subject validated against a strict shape/allowlist. Shared by the page (parsing
// the URL, server-side, via the searchParams prop — no client useSearchParams/Suspense
// needed) and the lead API route (re-validating the same fields from the POST body,
// since that endpoint is public and could otherwise be called directly with junk values).
const VITTORIA_LOT_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const VITTORIA_LOT_SUBJECTS = ['home'];

function firstOf(value) {
  return Array.isArray(value) ? value[0] : value;
}

function cleanLotText(value, maxLen) {
  const str = firstOf(value);
  if (typeof str !== 'string') return '';
  return str.replace(/[\u0000-\u001F\u007F<>]/g, '').trim().slice(0, maxLen);
}

export function parseVittoriaLotParams(source) {
  const src = source || {};
  const lot = cleanLotText(src.lot, 20);
  const lotIdRaw = cleanLotText(src.lotId, 60);
  const lotId = VITTORIA_LOT_UUID_RE.test(lotIdRaw) ? lotIdRaw.toLowerCase() : '';
  const community = cleanLotText(src.community, 60) || 'Vittoria';
  const subjectRaw = cleanLotText(src.subject, 20).toLowerCase();
  const subject = VITTORIA_LOT_SUBJECTS.includes(subjectRaw) ? subjectRaw : 'home';

  if (!lot && !lotId) return null; // no usable BuildHere lot link — fall back to the general form
  return { lot, lotId, community, subject };
}
