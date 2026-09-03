import { citySlugs } from '../lib/content';
import { BUSINESS } from '../lib/site';

// Every real, crawlable route on the site (language-agnostic paths).
// Adding a new static route here is the only manual step; new cities in
// lib/content.js's `cities` object are picked up automatically below.
const STATIC_PATHS = [
  { path: '', changeFrequency: 'daily', priority: 1.0 },
  { path: 'resources/mortgage-calculator', changeFrequency: 'daily', priority: 0.9 },
  { path: 'home-valuation', changeFrequency: 'monthly', priority: 0.8 },
  { path: 'resources', changeFrequency: 'weekly', priority: 0.7 },
  { path: 'buy/first-time-buyers', changeFrequency: 'monthly', priority: 0.7 },
  { path: 'reviews', changeFrequency: 'weekly', priority: 0.6 },
  { path: 'about', changeFrequency: 'monthly', priority: 0.5 },
];

export default function sitemap() {
  const lastModified = new Date();
  const entries = [];

  function addPair(path, changeFrequency, priority) {
    const suffix = path ? `/${path}` : '';
    const en = `${BUSINESS.url}/en${suffix}`;
    const es = `${BUSINESS.url}/es${suffix}`;
    for (const url of [en, es]) {
      entries.push({ url, lastModified, changeFrequency, priority, alternates: { languages: { en, es } } });
    }
  }

  for (const { path, changeFrequency, priority } of STATIC_PATHS) {
    addPair(path, changeFrequency, priority);
  }

  for (const slug of citySlugs) {
    addPair(`rgv/${slug}`, 'monthly', 0.7);
  }

  return entries;
}
