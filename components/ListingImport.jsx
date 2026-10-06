'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// "Import from an Arper Group listing": a dropdown at the top of a calculator that fills
// in a listing's price and area, so a visitor can see the numbers for a real property.
//
// `listings` come from the Arper portal by way of the calculator's page
// (lib/listings.js#getImportableListings): only listings that are for sale and that the
// calculators make sense for. With none to offer, this renders nothing.
//
// A listing card links here with ?listing=<id>, which picks that listing on arrival.
// Copy is co-located (site convention for calculators).

const COPY = {
  en: {
    label: 'Import from an Arper Group listing',
    choose: 'Choose a listing',
    filled: 'Filled in the price and area for',
    filledPrice: 'Filled in the price for',
    change: 'Change any number below.',
    see: 'See the listing',
  },
  es: {
    label: 'Importar de una propiedad de The Arper Group',
    choose: 'Elige una propiedad',
    filled: 'Llenamos el precio y la zona de',
    filledPrice: 'Llenamos el precio de',
    change: 'Cambia cualquier número abajo.',
    see: 'Ver la propiedad',
  },
};

// `usesArea`: false for a calculator with no area picker (the note then mentions only the price).
// `note`: an extra sentence shown after importing (for example, what was NOT filled in).
export default function ListingImport({ lang, listings = [], onImport, usesArea = true, note = null }) {
  const c = COPY[lang] ?? COPY.en;
  const [picked, setPicked] = useState('');
  const name = (l) => (lang === 'es' && l.labelEs) || l.label;

  function pick(id) {
    setPicked(id);
    const listing = listings.find((l) => l.id === id);
    if (listing) onImport(listing);
  }

  // Arriving from a listing card: ?listing=<id>.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get('listing');
    if (wanted && listings.some((l) => l.id === wanted)) pick(wanted);
    // Runs once on arrival; picking again is the visitor's choice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!listings.length) return null;
  const current = listings.find((l) => l.id === picked);

  return (
    <div className="border border-ink/15 bg-cream/40 p-4">
      <label className="grid gap-1 text-sm">
        <span className="font-medium">{c.label}</span>
        <select
          value={picked}
          onChange={(e) => pick(e.target.value)}
          className="w-full rounded-sm border border-black/20 bg-white px-3 py-2"
        >
          <option value="">{c.choose}</option>
          {listings.map((l) => (
            <option key={l.id} value={l.id}>{name(l)} · {l.priceText}</option>
          ))}
        </select>
      </label>
      {current && (
        <p aria-live="polite" className="mt-2 text-xs text-ink/70">
          {usesArea && current.citySlug ? c.filled : c.filledPrice} {name(current)}. {c.change}
          {note ? ` ${note}` : ''}{' '}
          <Link href={`/${lang}/listings#listing-${current.id}`} className="text-petrol link-underline">{c.see}</Link>
        </p>
      )}
    </div>
  );
}
