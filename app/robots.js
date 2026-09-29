import { BUSINESS } from '../lib/site';

export default function robots() {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/en/communities/vittoria/check-in', '/es/communities/vittoria/check-in'] },
    sitemap: `${BUSINESS.url}/sitemap.xml`,
  };
}
