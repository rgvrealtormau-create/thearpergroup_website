# The Arper Group — Content Site (Phase 1)

Bilingual (EN/ES) Next.js content/authority site for the Rio Grande Valley,
built to be found via SEO/AEO/GEO and hand high-intent search traffic to the
Brivity subdomain. Deploys on Vercel.

## Run locally
```bash
npm install
npm run dev        # http://localhost:3000  (/ redirects to /en)
npm run build      # production build
```

## Routes
- `/en`, `/es` (root `/` redirects to `/en`)
- `/{lang}/about`
- `/{lang}/buy/first-time-buyers`
- `/{lang}/home-valuation`
- `/{lang}/rgv/mcallen`, `/{lang}/rgv/edinburg`

## Before production (not needed for preview)
- [ ] Real phone / email / Google Business Profile link in `lib/site.js`
- [ ] Exact Brivity IDX search path in `lib/site.js` (`SEARCH_BASE`)
- [ ] Swap Fraunces/Hanken for licensed Adobe fonts (Halyard/Larken) in `app/[lang]/layout.jsx`
- [ ] Wire the valuation form to route leads to Mauricio (`components/site.jsx` -> `ValuationForm`)
- [ ] Decide English-at-root vs. `/en` before pointing www.thearpergroup.com over

## Content
All copy lives in `lib/content.js` (EN + ES). Guardrails and the full site
architecture are documented separately in the architecture map.
