'use client';

import { useEffect, useRef, useState } from 'react';

// Vittoria's live BuildHere lot map (explorer view). Vittoria is a multi-builder
// subdivision: BuildHere is set to show details only for the lots The Arper Group
// represents; every other lot renders gray as "Shown for reference" (no price or CTA).
// The iframe reports its content height via postMessage (BUILDHERE_HEIGHT_CHANGED)
// once www.thearpergroup.com is an approved origin on the Vittoria community.
// Copy is co-located here (site convention).

const BUILDHERE_ORIGIN = 'https://www.buildhere.app';
const EMBED_SRC = `${BUILDHERE_ORIGIN}/c/vittoria?embed=1&view=explorer`;

const COPY = {
  en: {
    eyebrow: 'Find your home',
    title: 'See where the homes sit in Vittoria',
    lede: 'Tap a highlighted lot for the home’s current status and price, then ask about it right from the map.',
    legend: 'Highlighted homes are represented by The Arper Group. Other homes in Vittoria are shown in gray for reference only.',
    frameTitle: 'Vittoria lot availability map',
    openFull: 'Open the map full screen',
  },
  es: {
    eyebrow: 'Encuentra tu casa',
    title: 'Mira dónde están las casas en Vittoria',
    lede: 'Toca un lote resaltado para ver el estatus y precio actual de la casa, y pregunta por ella desde el mismo mapa.',
    legend: 'Las casas resaltadas las representa The Arper Group. Las demás casas de Vittoria aparecen en gris solo como referencia.',
    frameTitle: 'Mapa de disponibilidad de lotes en Vittoria',
    openFull: 'Abrir el mapa en pantalla completa',
  },
};

export default function VittoriaMapEmbed({ lang = 'en' }) {
  const c = COPY[lang] ?? COPY.en;
  const frameRef = useRef(null);
  const [height, setHeight] = useState(620);

  useEffect(() => {
    function receive(event) {
      if (event.origin !== BUILDHERE_ORIGIN || event.source !== frameRef.current?.contentWindow) return;
      const m = event.data;
      if (!m || m.source !== 'BUILDHERE' || m.version !== 1) return;
      if (m.type === 'BUILDHERE_HEIGHT_CHANGED' && Number.isFinite(m.height)) {
        setHeight(Math.min(Math.max(Math.round(m.height), 420), 1400));
      }
    }
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, []);

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-clay">{c.eyebrow}</p>
      <h2 className="mt-3 font-display text-3xl md:text-4xl">{c.title}</h2>
      <p className="mt-4 max-w-2xl text-ink/80">{c.lede}</p>
      <div className="mt-8 overflow-hidden rounded-xl border border-ink/10 bg-paper">
        <iframe
          ref={frameRef}
          src={EMBED_SRC}
          title={c.frameTitle}
          width="100%"
          height={height}
          style={{ border: 0, display: 'block' }}
          loading="lazy"
          allowFullScreen
        />
      </div>
      <div className="mt-3 flex flex-col gap-2 text-xs text-ink/60 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-2xl">{c.legend}</p>
        <a href={`${BUILDHERE_ORIGIN}/c/vittoria`} target="_blank" rel="noopener" className="shrink-0 text-petrol link-underline">
          {c.openFull} ↗
        </a>
      </div>
    </div>
  );
}
