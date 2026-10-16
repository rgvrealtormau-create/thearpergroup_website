import { BUSINESS } from '../lib/site';

export default function robots() {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/en/communities/vittoria/check-in', '/es/communities/vittoria/check-in', '/open-house/', '/en/open-house/', '/es/open-house/'] },
    sitemap: `${BUSINESS.url}/sitemap.xml`,
  };
}
