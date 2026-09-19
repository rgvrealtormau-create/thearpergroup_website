'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const BUILDHERE_ORIGIN = 'https://subdivision-plat-app.vercel.app';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUS_ORDER = ['available', 'pre-sale', 'reserved', 'sold'];

const COPY = {
  en: {
    total: 'Total lots', shown: 'matching lots', status: 'Status', phase: 'Phase', allPhases: 'All phases',
    price: 'Price', anyPrice: 'Any price', size: 'Lot size', anySize: 'Any size', clear: 'Clear filters',
    select: 'Select a lot', selectHelp: 'Click a lot on the map or choose a card below to see current details.',
    matching: 'Matching lots', noMatches: 'No lots match these filters.', ask: 'Ask about this lot',
    sqFt: 'sq ft', under: 'Under', plus: '+', available: 'Available', 'pre-sale': 'Pre-sale', reserved: 'Reserved', sold: 'Sold',
    phaseLabel: 'Phase', priceLabel: 'List price', sizeLabel: 'Lot size', address: 'Address', builder: 'Builder',
  },
  es: {
    total: 'Lotes totales', shown: 'lotes encontrados', status: 'Estatus', phase: 'Fase', allPhases: 'Todas las fases',
    price: 'Precio', anyPrice: 'Cualquier precio', size: 'Tamaño', anySize: 'Cualquier tamaño', clear: 'Limpiar filtros',
    select: 'Selecciona un lote', selectHelp: 'Haz clic en el mapa o elige una tarjeta para ver los detalles actuales.',
    matching: 'Lotes encontrados', noMatches: 'Ningún lote coincide con estos filtros.', ask: 'Preguntar por este lote',
    sqFt: 'pies²', under: 'Menos de', plus: '+', available: 'Disponible', 'pre-sale': 'Preventa', reserved: 'Apartado', sold: 'Vendido',
    phaseLabel: 'Fase', priceLabel: 'Precio', sizeLabel: 'Tamaño', address: 'Dirección', builder: 'Constructor',
  },
};

function statusKey(status) {
  return (status || 'available').trim().toLowerCase();
}

function money(value) {
  if (value == null) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function updateLotUrl(pathname, lotId) {
  const url = new URL(window.location.href);
  if (lotId) url.searchParams.set('lot', lotId);
  else url.searchParams.delete('lot');
  url.pathname = pathname;
  url.hash = 'availability';
  window.history.replaceState(null, '', url);
  window.dispatchEvent(new CustomEvent('cedar-ridge:lot-selected', { detail: { lotId } }));
}

export default function CedarRidgeAvailabilityMap({ baseUrl, embedTitle, inventory, lang = 'en' }) {
  const copy = COPY[lang] || COPY.en;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const iframeRef = useRef(null);
  const detailRef = useRef(null);
  const cardRefs = useRef(new Map());
  const initialLot = searchParams.get('lot');
  const initialLotId = initialLot && UUID_RE.test(initialLot) ? initialLot : null;
  const lots = inventory?.lots || [];
  const statuses = useMemo(() => STATUS_ORDER.filter((status) => lots.some((lot) => statusKey(lot.public_status) === status)), [lots]);
  const [activeStatuses, setActiveStatuses] = useState(() => new Set(statuses));
  const [phase, setPhase] = useState('all');
  const [price, setPrice] = useState('all');
  const [size, setSize] = useState('all');
  const [selectedId, setSelectedId] = useState(() => lots.some((lot) => lot.id === initialLotId) ? initialLotId : null);
  const phases = useMemo(() => Array.from(new Set(lots.map((lot) => lot.phase).filter(Boolean))).sort(), [lots]);
  const counts = useMemo(() => Object.fromEntries(STATUS_ORDER.map((status) => [status, lots.filter((lot) => statusKey(lot.public_status) === status).length])), [lots]);
  const selected = lots.find((lot) => lot.id === selectedId) || null;

  const visibleLots = useMemo(() => lots.filter((lot) => {
    if (!activeStatuses.has(statusKey(lot.public_status))) return false;
    if (phase !== 'all' && lot.phase !== phase) return false;
    if (price !== 'all' && (lot.price == null || lot.price > Number(price))) return false;
    if (size === 'small' && (lot.sqft == null || lot.sqft >= 7000)) return false;
    if (size === 'medium' && (lot.sqft == null || lot.sqft < 7000 || lot.sqft > 9000)) return false;
    if (size === 'large' && (lot.sqft == null || lot.sqft <= 9000)) return false;
    return true;
  }), [activeStatuses, lots, phase, price, size]);

  const iframeSrc = useMemo(() => {
    const url = new URL(baseUrl);
    url.searchParams.set('embed', '1');
    url.searchParams.set('view', 'map');
    if (initialLotId) url.searchParams.set('lot', initialLotId);
    return url.toString();
  }, [baseUrl, initialLotId]);

  function send(type, payload = {}) {
    iframeRef.current?.contentWindow?.postMessage({ source: 'BUILDHERE_PARENT', version: 1, type, ...payload }, BUILDHERE_ORIGIN);
  }

  function selectLot(lot, fromMap = false) {
    const nextId = lot?.id || null;
    setSelectedId(nextId);
    updateLotUrl(pathname, nextId);
    if (!fromMap) send(lot ? 'BUILDHERE_SELECT_LOT' : 'BUILDHERE_CLEAR_SELECTION', lot ? { lotId: lot.id } : {});
    if (lot && fromMap && window.matchMedia('(max-width: 1023px)').matches) {
      window.setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
  }

  function applyStatuses(next) {
    setActiveStatuses(next);
    send('BUILDHERE_SET_STATUS_FILTER', { statuses: Array.from(next) });
  }

  function toggleStatus(status) {
    const next = new Set(activeStatuses);
    if (next.has(status)) next.delete(status); else next.add(status);
    applyStatuses(next);
  }

  function clearFilters() {
    applyStatuses(new Set(statuses));
    setPhase('all'); setPrice('all'); setSize('all');
  }

  useEffect(() => {
    function receive(event) {
      if (event.origin !== BUILDHERE_ORIGIN || event.source !== iframeRef.current?.contentWindow) return;
      const message = event.data;
      if (!message || message.source !== 'BUILDHERE' || message.version !== 1) return;
      if (message.type === 'BUILDHERE_READY') {
        send('BUILDHERE_SET_STATUS_FILTER', { statuses: Array.from(activeStatuses) });
        if (selectedId) send('BUILDHERE_SELECT_LOT', { lotId: selectedId });
      }
      if (message.type === 'BUILDHERE_LOT_SELECTED') {
        selectLot(lots.find((lot) => lot.id === message.lotId) || null, true);
      }
      if (message.type === 'BUILDHERE_FILTER_CHANGED' && Array.isArray(message.statuses)) {
        setActiveStatuses(new Set(message.statuses));
      }
    }
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [activeStatuses, lots, pathname, selectedId]);

  useEffect(() => {
    if (!initialLotId) return undefined;
    const timer = window.setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250);
    return () => window.clearTimeout(timer);
  }, [initialLotId]);

  if (!inventory || !lots.length) {
    return <div className="mt-8 rounded-sm border border-crivory/20 bg-crivory/5 p-8 text-center text-crivory/70">{copy.noMatches}</div>;
  }

  return <div className="mt-8">
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      <div className="rounded-sm border border-crivory/15 bg-crivory/5 p-4"><strong className="block font-crserif text-2xl">{lots.length}</strong><span className="text-xs uppercase tracking-wide text-crivory/60">{copy.total}</span></div>
      {STATUS_ORDER.map((status) => <div key={status} className="rounded-sm border border-crivory/15 bg-crivory/5 p-4"><strong className="block font-crserif text-2xl">{counts[status] || 0}</strong><span className="text-xs uppercase tracking-wide text-crivory/60">{copy[status]}</span></div>)}
    </div>

    <div className="mt-4 rounded-sm border border-crivory/15 bg-crivory/5 p-4" aria-label="Filter lots">
      <div className="flex flex-wrap items-end gap-3">
        <fieldset className="min-w-full sm:min-w-0"><legend className="mb-2 text-xs uppercase tracking-wide text-crivory/60">{copy.status}</legend><div className="flex flex-wrap gap-2">{statuses.map((status) => <button type="button" aria-pressed={activeStatuses.has(status)} key={status} onClick={() => toggleStatus(status)} className={`rounded-full border px-3 py-2 text-xs font-medium transition ${activeStatuses.has(status) ? 'border-crbrass bg-crbrass text-crnavy' : 'border-crivory/25 text-crivory/70 hover:border-crivory/60'}`}>{copy[status]} · {counts[status]}</button>)}</div></fieldset>
        <label className="grid gap-1 text-xs uppercase tracking-wide text-crivory/60">{copy.phase}<select value={phase} onChange={(event) => setPhase(event.target.value)} className="min-w-36 rounded-sm border border-crivory/20 bg-crnavy px-3 py-2.5 text-sm normal-case text-crivory"><option value="all">{copy.allPhases}</option>{phases.map((value) => <option key={value} value={value}>{copy.phaseLabel} {value}</option>)}</select></label>
        <label className="grid gap-1 text-xs uppercase tracking-wide text-crivory/60">{copy.price}<select value={price} onChange={(event) => setPrice(event.target.value)} className="min-w-36 rounded-sm border border-crivory/20 bg-crnavy px-3 py-2.5 text-sm normal-case text-crivory"><option value="all">{copy.anyPrice}</option><option value="80000">{copy.under} $80,000</option><option value="100000">{copy.under} $100,000</option><option value="125000">{copy.under} $125,000</option></select></label>
        <label className="grid gap-1 text-xs uppercase tracking-wide text-crivory/60">{copy.size}<select value={size} onChange={(event) => setSize(event.target.value)} className="min-w-40 rounded-sm border border-crivory/20 bg-crnavy px-3 py-2.5 text-sm normal-case text-crivory"><option value="all">{copy.anySize}</option><option value="small">{copy.under} 7,000 {copy.sqFt}</option><option value="medium">7,000–9,000 {copy.sqFt}</option><option value="large">9,000 {copy.sqFt}{copy.plus}</option></select></label>
        <button type="button" onClick={clearFilters} className="px-2 py-2.5 text-sm text-crivory/65 underline decoration-crbrass/70 underline-offset-4 hover:text-crivory">{copy.clear}</button>
      </div>
    </div>

    <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <iframe ref={iframeRef} src={iframeSrc} title={embedTitle} loading="eager" allowFullScreen width="100%" height={720} className="h-[560px] w-full rounded-sm border border-crivory/15 bg-white lg:h-[720px]" />

      <div ref={detailRef} className="scroll-mt-20">
        {selected ? (
          <aside className="rounded-sm border border-crbrass/40 bg-crivory p-5 text-crnavy lg:sticky lg:top-20" aria-live="polite">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-crbrass">{copy[statusKey(selected.public_status)] || selected.public_status}</span>
                <h3 className="mt-1 font-crserif text-3xl">Lot {selected.lot_number}</h3>
              </div>
              <button type="button" onClick={() => selectLot(null)} className="text-sm text-crslate underline underline-offset-4">{copy.clear}</button>
            </div>
            <dl className="mt-5 grid gap-4">
              {selected.phase ? <div><dt className="text-xs uppercase tracking-wide text-crslate">{copy.phaseLabel}</dt><dd className="mt-1 font-medium">{selected.phase}</dd></div> : null}
              {selected.price != null ? <div><dt className="text-xs uppercase tracking-wide text-crslate">{copy.priceLabel}</dt><dd className="mt-1 font-medium">{money(selected.price)}</dd></div> : null}
              {selected.sqft != null ? <div><dt className="text-xs uppercase tracking-wide text-crslate">{copy.sizeLabel}</dt><dd className="mt-1 font-medium">{selected.sqft.toLocaleString()} {copy.sqFt}{selected.acres != null ? ` · ${selected.acres} ac` : ''}</dd></div> : null}
              {selected.address ? <div><dt className="text-xs uppercase tracking-wide text-crslate">{copy.address}</dt><dd className="mt-1 font-medium">{selected.address}</dd></div> : null}
              {selected.builder ? <div><dt className="text-xs uppercase tracking-wide text-crslate">{copy.builder}</dt><dd className="mt-1 font-medium">{selected.builder}</dd></div> : null}
            </dl>
            <a href="#contact" className="mt-6 block rounded-sm bg-crnavy px-4 py-3 text-center text-sm font-medium text-crivory hover:bg-crslate">{copy.ask}</a>
          </aside>
        ) : (
          <div className="rounded-sm border border-dashed border-crivory/20 p-6 text-crivory/65">
            <strong className="font-crserif text-xl text-crivory">{copy.select}</strong>
            <p className="mt-1 text-sm">{copy.selectHelp}</p>
          </div>
        )}
      </div>
    </div>

    <div className="mt-10 flex items-end justify-between gap-4">
      <div><p className="text-xs uppercase tracking-[0.2em] text-crbrass">{visibleLots.length} {copy.shown}</p><h3 className="mt-2 font-crserif text-3xl">{copy.matching}</h3></div>
    </div>

    {visibleLots.length ? (
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visibleLots.map((lot) => (
          <article ref={(node) => { if (node) cardRefs.current.set(lot.id, node); else cardRefs.current.delete(lot.id); }} key={lot.id} className={`rounded-sm border p-4 transition [content-visibility:auto] ${selectedId === lot.id ? 'border-crbrass bg-crbrass/15 ring-1 ring-crbrass' : 'border-crivory/15 bg-crivory/5 hover:border-crivory/40'}`}>
            <div className="flex items-start justify-between gap-3">
              <div><span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-crbrass">{copy[statusKey(lot.public_status)] || lot.public_status}</span><h4 className="mt-1 font-crserif text-2xl">Lot {lot.lot_number}</h4></div>
              {lot.price != null ? <strong className="text-sm">{money(lot.price)}</strong> : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-crivory/65">
              {lot.phase ? <span>{copy.phaseLabel} {lot.phase}</span> : null}
              {lot.sqft != null ? <span>{lot.sqft.toLocaleString()} {copy.sqFt}</span> : null}
              {lot.acres != null ? <span>{lot.acres} ac</span> : null}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => selectLot(lot)} className="rounded-sm border border-crivory/30 px-3 py-2 text-xs font-medium text-crivory hover:border-crivory">{copy.select}</button>
              <a href="#contact" onClick={() => selectLot(lot)} className="rounded-sm bg-crbrass px-3 py-2 text-xs font-semibold text-crnavy hover:bg-[#c49a5e]">{copy.ask}</a>
            </div>
          </article>
        ))}
      </div>
    ) : <div className="mt-5 rounded-sm border border-dashed border-crivory/20 p-8 text-center text-crivory/65">{copy.noMatches}</div>}
  </div>;
}
