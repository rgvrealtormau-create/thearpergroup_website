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
  instagram: 'https://instagram.com/realtor.mau',
  facebook: 'https://facebook.com/',        // TODO: real page
  googleBusiness: 'https://www.google.com/maps/search/?api=1&query=Alliance+Real+Estate+Group+Mauricio+Arredondo+McAllen',
};

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
