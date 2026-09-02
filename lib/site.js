// Central brand + business constants and helpers.

export const BUSINESS = {
  name: 'The Arper Group',
  broker: 'Alliance Real Estate Group',
  phone: '+1-956-000-0000',        // TODO: real number
  phoneDisplay: '(956) 000-0000',  // TODO
  email: 'hello@thearpergroup.com',// TODO
  city: 'McAllen',
  region: 'TX',
  areaServed: ['McAllen', 'Edinburg', 'Pharr', 'Mission', 'Weslaco', 'Rio Grande Valley'],
  url: 'https://www.thearpergroup.com',
  instagram: 'https://instagram.com/realtor.mau',
  facebook: 'https://facebook.com/',        // TODO
  googleBusiness: 'https://maps.google.com/',// TODO: GBP link
};

// Brivity IDX subdomain (leads registered here route to Mauricio).
const SEARCH_BASE = 'https://thearpergroup.aregtx.com';

export function searchUrl(campaign = 'search') {
  const p = new URLSearchParams({
    utm_source: 'arpersite',
    utm_medium: 'cta',
    utm_campaign: campaign,
  });
  return `${SEARCH_BASE}/?${p.toString()}`;
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
