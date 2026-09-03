import { BUSINESS } from '../lib/site';

export default function robots() {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${BUSINESS.url}/sitemap.xml`,
  };
}
