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
- [ ] Set the lead-pipeline env vars (see `.env.example`) in Vercel: `RESEND_API_KEY`,
      `LEAD_FROM_EMAIL` (verified sending domain in Resend), `GOOGLE_SERVICE_ACCOUNT_EMAIL`,
      `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEET_ID`, `GOOGLE_SHEET_RANGE` — and share the sphere
      sheet with the service account email as an Editor

## Lead pipeline
`app/api/lead/route.js` runs alongside Web3Forms (unchanged) on the home-valuation and
mortgage-calculator forms: it appends a row to the sphere nurture Google Sheet and emails
Brivity's lead-parsing address, in parallel, best-effort (failures are logged, never block
the form's Web3Forms confirmation). See `lib/googleSheets.js` and `lib/brivity.js`.

## Open house sign-in
A sign at an open house carries a QR code for `/open-house/<listing id>` (the id is the
listing's id in the Arper portal; the portal's listing page shows the code to print). That
address answers in the language of the visitor's phone and opens
`/{lang}/open-house/<listing id>`: a name, a mobile number, an optional email and three
one-tap questions. It exists for exactly the listings the portal shows on the website.

`app/api/open-house/route.js` sends one sign-in to:
- the Arper portal, which keeps it against the listing (the portal's `open_house_sign_in`
  function, called with the same two hosting settings as the listings feed). The agents see
  the day's visitors on the listing's page there, and the listing's "Open House" activity,
  which the seller's weekly report is drafted from, carries the count;
- the sphere nurture sheet and Brivity, unless the visitor says they already work with an
  agent;
- an email to the team with a "Text them" link (it opens the agent's own Messages app;
  nothing texts a visitor automatically), and, when the visitor left an email, a thank-you
  with the listing and its payment calculator.

After signing in the visitor is offered the mortgage calculator opened on that listing
(`?listing=<id>`): its price, 3.5% down, and its own yearly property taxes when the portal
has them ("Property taxes" in the listing's Website section there), otherwise the area
estimate. A listing card's "Estimate the payment" link opens the same way. The calculator on
its own still opens at 20% down.

A sign-in whose name starts with `zz-test` is for checking the page: it is kept in the
portal and emailed to the team, but not added to the sheet or Brivity. Rules in
`lib/openHouse.js`, emails in `lib/openHouseEmail.js`, checks in `tests/open-house.test.mjs`
(`node --test tests/*.test.mjs`).

## Content
All copy lives in `lib/content.js` (EN + ES). Guardrails and the full site
architecture are documented separately in the architecture map.
