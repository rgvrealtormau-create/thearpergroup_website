'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { featuredListings, featuredPage, FEATURED_CATEGORIES } from '../lib/content';
import { searchUrl } from '../lib/site';

// The filterable grid of individual listings on the Featured listings page.
// Listings and copy live in lib/content.js (featuredListings / featuredPage).

// "Ask about this…" links pre-select the listing in the inquiry form further down
// the page. The form (ListingInquiryForm) listens for this event; the link's own
// href="#contact" does the scrolling, so it still works without JavaScript.
export const SELECT_LISTING_EVENT = 'arper:select-listing';

export function AskLink({ slug, className = '', children }) {
  return (
    <a
      href="#contact"
      onClick={() => window.dispatchEvent(new CustomEvent(SELECT_LISTING_EVENT, { detail: slug }))}
      className={className}
    >
      {children}
    </a>
  );
}

const text = (value, lang) => (typeof value === 'string' ? value : value?.[lang]);

function ListingCard({ listing: l, lang, c }) {
  const promos = l.promos?.[lang] ?? [];
  return (
    <article id={l.slug} className="flex scroll-mt-24 flex-col border border-ink/15 bg-paper">
      <div className="relative aspect-[3/2] bg-petrol">
        <Image
          src={l.img}
          alt={text(l.alt, lang)}
          fill
          sizes="(min-width: 1024px) 346px, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
        <span className="absolute left-0 top-3.5 bg-petrol px-2.5 py-1 text-xs font-medium text-cream">
          {text(l.tag, lang)}
        </span>
        {l.rendering && (
          <span className="absolute bottom-2 right-2 rounded-sm bg-ink/80 px-1.5 py-0.5 text-[11px] text-cream">
            {c[l.rendering]}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col px-5 pb-4 pt-5">
        <p className="text-[11px] uppercase tracking-[0.14em] text-clay">{text(l.type, lang)}</p>
        <p className="mt-2 text-3xl leading-tight">
          {l.price}
          {l.priceSuffix && <span className="text-base text-ink/75"> {text(l.priceSuffix, lang)}</span>}
        </p>
        <h3 className="mt-2.5 text-[17px] font-medium leading-snug">{text(l.address, lang)}</h3>
        <p className="text-sm text-ink/75">{l.city}</p>
        <p className="mt-3 text-sm font-medium text-petrol">{text(l.facts, lang)}</p>
        {l.community && (
          <Link href={`/${lang}/${l.community.path}`} className="mt-1 w-fit text-sm text-petrol link-underline">
            {text(l.community.label, lang)}
          </Link>
        )}
        <p className="mt-2 flex-1 text-sm text-ink/80">{text(l.blurb, lang)}</p>
        <ul className="mt-3.5 flex flex-wrap gap-1.5 text-xs">
          <li className="rounded-sm border border-petrol/60 px-2 py-[3px] font-medium text-petrol">{text(l.cso, lang)}</li>
          {promos.map((p) => (
            <li key={p} className="rounded-sm bg-gold/35 px-2 py-1">{p}</li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-ink/10 pt-1.5">
          <span className="text-xs text-ink/70">{c.mls}{l.mls}</span>
          <AskLink slug={l.slug} className="inline-flex min-h-[44px] items-center text-right text-sm font-medium text-petrol link-underline">
            {text(l.ask, lang)}
          </AskLink>
        </div>
      </div>
    </article>
  );
}

export default function FeaturedListings({ lang }) {
  const c = featuredPage[lang].listings;
  const [filter, setFilter] = useState('all');

  const total = featuredListings.length;
  const counts = Object.fromEntries(
    FEATURED_CATEGORIES.map((cat) => [cat, featuredListings.filter((l) => l.category === cat).length])
  );
  // Only offer a filter when there is something behind it.
  const chips = [['all', total], ...FEATURED_CATEGORIES.filter((cat) => counts[cat] > 0).map((cat) => [cat, counts[cat]])];
  const shown = filter === 'all' ? featuredListings : featuredListings.filter((l) => l.category === filter);

  return (
    <>
      <div className="mt-7 flex flex-wrap items-center justify-between gap-x-6 gap-y-3.5">
        <div role="group" aria-label={c.filterLabel} className="flex flex-wrap gap-2">
          {chips.map(([id, n]) => {
            const on = filter === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={on}
                onClick={() => setFilter(id)}
                className={`min-h-[44px] rounded-sm border px-4 text-sm transition-colors ${
                  on ? 'border-petrol bg-petrol text-cream' : 'border-petrol/45 text-petrol hover:border-petrol'
                }`}
              >
                {c.filters[id]} · {n}
              </button>
            );
          })}
        </div>
        <p aria-live="polite" className="text-sm text-ink/75">
          {filter === 'all' ? c.showingAll(total) : c.showingSome(shown.length, total)}
        </p>
      </div>

      <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((l) => (
          <ListingCard key={l.slug} listing={l} lang={lang} c={c} />
        ))}
      </div>

      <p className="mt-7 text-sm text-ink/80">
        {c.searchLead}{' '}
        <a href={searchUrl('featured_listings')} className="font-medium text-petrol link-underline">
          {c.searchCta}
        </a>
      </p>
    </>
  );
}
