'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import 'leaflet/dist/leaflet.css';
import AskLink from './AskLink';

// The map view of the Featured listings grid: a price pin for each listing, and beside
// it the same listings as a list. Picking a pin or a row shows that listing's photo and
// links. A listing with no pin (its address could not be placed) is still in the list.
//
// The map is Leaflet drawing OpenStreetMap's tiles: free, no account or key. It loads
// only when a visitor switches to the map, so the grid stays light.

const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_CREDIT = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// "$259k", "$1.2M", or "$1,900/mo" for a rental: short enough to sit on a pin.
function pinLabel(l) {
  if (l.priceSuffix) return `${l.price}/mo`;
  if (l.amount >= 1e6) return `$${(l.amount / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
  return `$${Math.round(l.amount / 1000)}k`;
}

// Leaflet builds each pin from a string, so these class names are written out in full
// here (that is also how Tailwind knows to include them).
// The pin's own box has no size (the label hangs above its point), so the keyboard focus
// outline is drawn on the label instead.
const PIN = 'inline-block -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-sm px-2 py-1 text-xs font-medium shadow-md ring-1 group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-petrol';
const PIN_OFF = 'bg-petrol text-cream ring-cream/60';
const PIN_ON = 'bg-gold text-ink ring-ink/40';

// A card's wording is either one string or an { en, es } pair.
const text = (value, lang) => (typeof value === 'string' ? value : value?.[lang]);

export default function ListingsMap({ lang, listings, c }) {
  const box = useRef(null);
  const leaflet = useRef(null); // { L, map, layer }
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState(null);

  const pinned = listings.filter((l) => l.pin);
  const shownKey = pinned.map((l) => l.slug).join(',');
  const current = listings.find((l) => l.slug === selected) || null;

  // Start the map once.
  useEffect(() => {
    let cancelled = false;
    let map;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !box.current) return;
      map = L.map(box.current, { scrollWheelZoom: false });
      L.tileLayer(TILES, { maxZoom: 19, attribution: TILE_CREDIT }).addTo(map);
      leaflet.current = { L, map, layer: L.layerGroup().addTo(map) };
      setReady(true);
    })();
    return () => { cancelled = true; map?.remove(); leaflet.current = null; };
  }, []);

  // Frame the pins whenever the set of listings changes (a filter was picked).
  useEffect(() => {
    if (!ready || !leaflet.current) return;
    const { L, map } = leaflet.current;
    if (!pinned.length) { map.setView([26.2, -98.0], 9); return; }
    map.fitBounds(L.latLngBounds(pinned.map((l) => [l.pin.lat, l.pin.lng])), { padding: [50, 50], maxZoom: 14 });
    // `pinned` is described by shownKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, shownKey]);

  // Draw the pins; the picked one is gold and on top.
  useEffect(() => {
    if (!ready || !leaflet.current) return;
    const { L, layer } = leaflet.current;
    layer.clearLayers();
    // Units in one building share a spot. Their labels are stacked upward so each can be picked.
    const atSpot = new Map();
    for (const l of pinned) {
      const on = l.slug === selected;
      const spot = `${l.pin.lat},${l.pin.lng}`;
      const nth = atSpot.get(spot) || 0;
      atSpot.set(spot, nth + 1);
      const lift = nth ? ` style="position:relative;top:-${nth * 28}px"` : '';
      const icon = L.divIcon({ className: 'group', iconSize: [0, 0], html: `<span class="${PIN} ${on ? PIN_ON : PIN_OFF}"${lift}>${pinLabel(l)}</span>` });
      L.marker([l.pin.lat, l.pin.lng], { icon, title: `${text(l.address, lang)} · ${l.price}`, alt: text(l.address, lang), zIndexOffset: on ? 1000 : 0 })
        .on('click', () => setSelected(l.slug))
        .addTo(layer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, shownKey, selected, lang]);

  // Picking a pin brings that listing's row into view in the list.
  useEffect(() => {
    if (selected) document.getElementById(`map-row-${selected}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selected]);

  // A filter can remove the picked listing from view.
  useEffect(() => {
    if (selected && !listings.some((l) => l.slug === selected)) setSelected(null);
  }, [listings, selected]);

  function pick(l) {
    setSelected(l.slug);
    if (l.pin && leaflet.current) {
      const { map } = leaflet.current;
      map.flyTo([l.pin.lat, l.pin.lng], Math.max(map.getZoom(), 13), { duration: 0.6 });
    }
  }

  return (
    <div className="mt-7">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div
          ref={box}
          role="region"
          aria-label={c.view.mapLabel}
          className="relative z-0 h-[380px] border border-ink/15 bg-cream md:h-[560px]"
        />

        <ul className="divide-y divide-ink/10 border border-ink/15 bg-paper lg:max-h-[560px] lg:overflow-y-auto">
          {listings.map((l) => {
            const on = l.slug === selected;
            return (
              <li key={l.slug} id={`map-row-${l.slug}`}>
                <button
                  type="button"
                  aria-expanded={on}
                  onClick={() => pick(l)}
                  className={`flex w-full items-baseline justify-between gap-3 px-4 py-3 text-left transition-colors ${on ? 'bg-cream' : 'hover:bg-cream/50'}`}
                >
                  <span>
                    <span className="block text-[11px] uppercase tracking-[0.14em] text-clay">{l.type[lang]}</span>
                    <span className="mt-0.5 block text-[15px] font-medium leading-snug">{text(l.address, lang)}</span>
                    {l.city && <span className="block text-sm text-ink/75">{l.city}</span>}
                    {!l.pin && <span className="mt-0.5 block text-xs text-ink/70">{c.view.noPin}</span>}
                  </span>
                  <span className="whitespace-nowrap text-[15px]">
                    {l.price}
                    {l.priceSuffix && <span className="text-xs text-ink/75"> {l.priceSuffix[lang]}</span>}
                  </span>
                </button>
                {on && (
                  <div className="bg-cream px-4 pb-4">
                    <div className="relative aspect-[3/2] bg-petrol">
                      <Image src={l.img} alt={l.alt[lang]} fill sizes="340px" className="object-cover" />
                      {l.tag && <span className="absolute left-0 top-3 bg-petrol px-2.5 py-1 text-xs font-medium text-cream">{l.tag[lang]}</span>}
                      {l.rendering && <span className="absolute bottom-2 right-2 rounded-sm bg-ink/80 px-1.5 py-0.5 text-[11px] text-cream">{c[l.rendering]}</span>}
                    </div>
                    {l.also && <p className="mt-3 text-sm text-ink/75">{l.also[lang]}</p>}
                    {l.facts && <p className={`${l.also ? 'mt-1' : 'mt-3'} text-sm font-medium text-petrol`}>{l.facts[lang]}</p>}
                    <p className="mt-1.5 text-sm text-ink/80">{l.blurb[lang]}</p>
                    {l.cso && <p className="mt-2.5 w-fit rounded-sm border border-petrol/60 px-2 py-[3px] text-xs font-medium text-petrol">{l.cso[lang]}</p>}
                    <div className="mt-2 flex flex-wrap gap-x-5 text-sm font-medium text-petrol">
                      <AskLink slug={l.slug} className="inline-flex min-h-[44px] items-center link-underline">{l.ask[lang]}</AskLink>
                      {l.community && (
                        <Link href={`/${lang}/${l.community.path}`} className="inline-flex min-h-[44px] items-center link-underline">
                          {l.community.label[lang]}
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      <p className="mt-3 text-sm text-ink/75">{c.view.onMap(pinned.length, listings.length)}</p>
    </div>
  );
}
