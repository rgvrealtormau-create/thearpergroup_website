'use client';

import { useEffect, useState } from 'react';
import { featuredPage } from '../lib/content';
import { WEB3FORMS_ACCESS_KEY, BUSINESS } from '../lib/site';
import { SELECT_LISTING_EVENT } from './FeaturedListings';

// Inquiry form on the Featured listings page. The "Which listing?" dropdown is
// pre-selected when a visitor clicks an "Ask about this…" link on a card.
// `options` is the list for that dropdown, built by the page from the communities and
// the portal's listings: [{ slug, label, labelEn }].
// Leads go to /api/lead (Google Sheet + Brivity) and Web3Forms (email alert),
// the same two destinations as every other form on the site.
export default function ListingInquiryForm({ lang, options }) {
  const c = featuredPage[lang].contact.form;

  const [listing, setListing] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    function onSelect(e) {
      if (options.some((o) => o.slug === e.detail)) setListing(e.detail);
    }
    window.addEventListener(SELECT_LISTING_EVENT, onSelect);
    return () => window.removeEventListener(SELECT_LISTING_EVENT, onSelect);
  }, [options]);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setFailed(false);
    const data = new FormData(e.target);
    if (data.get('botcheck')) { setBusy(false); return; }

    const name = String(data.get('name') || '').trim();
    const phone = String(data.get('phone') || '').trim();
    const email = String(data.get('email') || '').trim();
    const message = String(data.get('message') || '').trim();
    // Always report the listing in English so leads read the same in the sheet and in Brivity.
    const label = options.find((o) => o.slug === listing)?.labelEn || 'Not sure yet';

    const detail = [
      'Source: Featured listings page',
      `Listing: ${label}`,
      message ? `Message: ${message}` : null,
    ].filter(Boolean).join('\n');

    const [api, w3f] = await Promise.allSettled([
      fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formType: 'featured_listings', lang, name, phone, email, detail, listing: listing || null }),
      }).then((r) => r.ok),
      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_ACCESS_KEY,
          subject: `Featured listing lead — ${label}`,
          from_name: 'The Arper Group website',
          page: 'Featured listings page',
          name, phone, email,
          language: lang === 'es' ? 'Spanish' : 'English',
          message: detail,
        }),
      }).then((r) => r.json()).then((j) => !!j.success),
    ]);

    const ok = (api.status === 'fulfilled' && api.value) || (w3f.status === 'fulfilled' && w3f.value);
    setBusy(false);
    if (!ok) { setFailed(true); return; }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="bg-paper p-7 text-ink">
        <p className="font-display text-2xl">{c.thanksTitle}</p>
        <p className="mt-2 text-ink/75">{c.thanksBody}</p>
      </div>
    );
  }

  const inputCls = 'mt-1 w-full rounded-sm border border-ink/25 bg-white px-3 py-2.5 text-ink focus:border-petrol focus:outline-none';

  return (
    <form onSubmit={onSubmit} className="grid gap-4 bg-paper p-7 text-ink">
      <label className="block text-sm">
        {c.listing}
        <select name="listing" value={listing} onChange={(e) => setListing(e.target.value)} className={inputCls}>
          <option value="">{c.notSure}</option>
          {options.map((o) => (
            <option key={o.slug} value={o.slug}>{o.label}</option>
          ))}
        </select>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          {c.name}
          <input required name="name" autoComplete="name" className={inputCls} />
        </label>
        <label className="block text-sm">
          {c.phone}
          <input required type="tel" name="phone" autoComplete="tel" className={inputCls} />
        </label>
      </div>
      <label className="block text-sm">
        {c.email}
        <input type="email" name="email" autoComplete="email" className={inputCls} />
      </label>
      <label className="block text-sm">
        {c.message}
        <textarea name="message" rows={3} className={inputCls} />
      </label>
      <input type="checkbox" name="botcheck" className="hidden" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
      <button disabled={busy} className="mt-1 min-h-[44px] justify-self-start rounded-sm bg-petrol px-6 text-sm font-medium text-cream hover:bg-[#243b49] disabled:opacity-60">
        {busy ? c.sending : c.submit}
      </button>
      {failed && (
        <p className="text-sm text-red-700">
          {c.error}
          <a className="link-underline" href={`tel:${BUSINESS.phone}`}>{BUSINESS.phoneDisplay}</a>.
        </p>
      )}
      <p className="text-xs text-ink/70">{c.consent}</p>
    </form>
  );
}
