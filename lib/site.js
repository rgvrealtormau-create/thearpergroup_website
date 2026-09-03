// Central brand + business constants and helpers.

// Web3Forms is a public, client-side access key by design (not a secret).
export const WEB3FORMS_ACCESS_KEY = 'd934d97b-2a31-4978-948c-c15bd5f0b072';

export const BUSINESS = {
  name: 'The Arper Group',
  broker: 'Alliance Real Estate Group',
  phone: '+1-956-517-5223',        // Mauricio
  phoneDisplay: '(956) 517-5223',  // Mauricio
  phonePam: '(956) 414-6128',      // Pamela
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

// Stable @id for the business entity, so multiple JSON-LD blocks (layout + reviews page)
// can reference the same node instead of declaring duplicate entities.
export const BUSINESS_ID = `${BUSINESS.url}/#business`;

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
