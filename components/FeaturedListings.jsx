'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import AskLink from './AskLink';
import { featuredPage, FEATURED_CATEGORIES } from '../lib/content';
import { searchUrl } from '../lib/site';

// The filterable grid of individual listings on the Featured listings page.
// The listings themselves come from the Arper portal (see lib/listings.js) and are
// handed in by the page; the words around them live in lib/content.js (featuredPage).

// The map loads only when a visitor switches to it.
const ListingsMap = dynamic(() => import('./ListingsMap'), { ssr: false, loading: () => <MapLoading /> });
function MapLoading() {
  return <div className="mt-7 h-[380px] animate-pulse border border-ink/15 bg-paper/60 md:h-[560px]" />;
}

const text = (value, lang) => (typeof value === 'string' ? value : value?.[lang]);

// One listing. The layout is the same whether a listing is hand-written or comes from the
// portal; a line simply does not show when the portal left that box blank.
function ListingCard({ listing: l, lang, c }) {
  const promos = l.promos?.[lang] ?? [];
  return (
    <article id={`listing-${l.slug}`} className="flex scroll-mt-24 flex-col border border-ink/15 bg-paper">
      <div className="relative aspect-[3/2] bg-petrol">
        <Image
          src={l.img}
          alt={text(l.alt, lang)}
          fill
          sizes="(min-width: 1024px) 346px, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
        {l.tag && (
          <span className="absolute left-0 top-3.5 bg-petrol px-2.5 py-1 text-xs font-medium text-cream">
            {text(l.tag, lang)}
          </span>
        )}
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
        {l.also && <p className="mt-1 text-sm text-ink/75">{text(l.also, lang)}</p>}
        <h3 className="mt-2.5 text-[17px] font-medium leading-snug">{text(l.address, lang)}</h3>
        {l.city && <p className="text-sm text-ink/75">{l.city}</p>}
        {l.facts && <p className="mt-3 text-sm font-medium text-petrol">{text(l.facts, lang)}</p>}
        {l.community && (
          <Link href={`/${lang}/${l.community.path}`} className="mt-1 w-fit text-sm text-petrol link-underline">
            {text(l.community.label, lang)}
          </Link>
        )}
        <p className="mt-2 flex-1 text-sm text-ink/80">{text(l.blurb, lang)}</p>
        {(l.cso || promos.length > 0) && (
          <ul className="mt-3.5 flex flex-wrap gap-1.5 text-xs">
            {l.cso && <li className="rounded-sm border border-petrol/60 px-2 py-[3px] font-medium text-petrol">{text(l.cso, lang)}</li>}
            {promos.map((p) => (
              <li key={p} className="rounded-sm bg-gold/35 px-2 py-1">{p}</li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-ink/10 pt-1.5">
          <span className="text-xs text-ink/70">{l.mls ? `${c.mls}${l.mls}` : ''}</span>
          <AskLink slug={l.slug} className="inline-flex min-h-[44px] items-center text-right text-sm font-medium text-petrol link-underline">
            {text(l.ask, lang)}
          </AskLink>
        </div>
      </div>
    </article>
  );
}

export default function FeaturedListings({ lang, listings }) {
  const c = featuredPage[lang].listings;
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState('grid');

  const total = listings.length;
  const counts = Object.fromEntries(
    FEATURED_CATEGORIES.map((cat) => [cat, listings.filter((l) => l.category === cat).length])
  );
  // Only offer a filter when there is something behind it.
  const chips = [['all', total], ...FEATURED_CATEGORIES.filter((cat) => counts[cat] > 0).map((cat) => [cat, counts[cat]])];
  // A filter can empty out while someone is on the page (its last listing closed); fall back to All.
  const active = filter === 'all' || counts[filter] > 0 ? filter : 'all';
  const shown = active === 'all' ? listings : listings.filter((l) => l.category === active);
  const hasMap = listings.some((l) => l.pin);

  const search = (
    <p className="mt-7 text-sm text-ink/80">
      {c.searchLead}{' '}
      <a href={searchUrl('featured_listings')} className="font-medium text-petrol link-underline">
        {c.searchCta}
      </a>
    </p>
  );

  if (total === 0) {
    return (
      <>
        <p className="mt-7 border border-dashed border-ink/20 bg-paper/60 px-5 py-6 text-ink/80">{c.none}</p>
        {search}
      </>
    );
  }

  return (
    <>
      <div className="mt-7 flex flex-wrap items-center justify-between gap-x-6 gap-y-3.5">
        <div role="group" aria-label={c.filterLabel} className="flex flex-wrap gap-2">
          {chips.map(([id, n]) => {
            const on = active === id;
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
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <p aria-live="polite" className="text-sm text-ink/75">
            {active === 'all' ? c.showingAll(total) : c.showingSome(shown.length, total)}
          </p>
          {/* The map is only offered when at least one listing could be placed on it. */}
          {hasMap && (
            <div role="group" aria-label={c.view.label} className="flex">
              {['grid', 'map'].map((id) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={view === id}
                  onClick={() => setView(id)}
                  className={`min-h-[44px] border px-4 text-sm transition-colors first:rounded-l-sm last:-ml-px last:rounded-r-sm ${
                    view === id ? 'relative border-petrol bg-petrol text-cream' : 'border-petrol/45 text-petrol hover:border-petrol'
                  }`}
                >
                  {c.view[id]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {view === 'map' && hasMap ? (
        <ListingsMap lang={lang} listings={shown} c={c} />
      ) : (
        <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((l) => (
            <ListingCard key={l.slug} listing={l} lang={lang} c={c} />
          ))}
        </div>
      )}

      {search}
    </>
  );
}
