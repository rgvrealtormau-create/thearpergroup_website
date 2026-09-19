'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { WEB3FORMS_ACCESS_KEY } from '../lib/site';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOT_COPY = {
  en: { heading: 'Inquiry about', phase: 'Phase', status: 'Status', price: 'Price' },
  es: { heading: 'Consulta sobre', phase: 'Fase', status: 'Estatus', price: 'Precio' },
};

function money(value) {
  if (value == null) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

export default function CedarRidgeForm({ lang, copy, inventory }) {
  const searchParams = useSearchParams();
  const initialLotId = searchParams.get('lot');
  const [selectedLotId, setSelectedLotId] = useState(UUID_RE.test(initialLotId || '') ? initialLotId : null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const c = copy.fields;
  const lotCopy = LOT_COPY[lang] || LOT_COPY.en;
  const selectedLot = inventory?.lots?.find((lot) => lot.id === selectedLotId) || null;

  useEffect(() => {
    function receive(event) {
      const lotId = event.detail?.lotId;
      setSelectedLotId(typeof lotId === 'string' && UUID_RE.test(lotId) ? lotId : null);
    }
    window.addEventListener('cedar-ridge:lot-selected', receive);
    return () => window.removeEventListener('cedar-ridge:lot-selected', receive);
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setFailed(false);
    const data = new FormData(e.target);
    if (!data.get('botcheck')) {
      fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formType: 'cedar_ridge_reserve',
          lang,
          name: data.get('name'),
          email: data.get('email'),
          phone: data.get('phone'),
          detail: data.get('message'),
          lotId: selectedLot?.id || null,
        }),
      }).catch(() => {});
    }
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_ACCESS_KEY,
          name: data.get('name'),
          email: data.get('email'),
          phone: data.get('phone'),
          message: selectedLot
            ? `Cedar Ridge Reserve — Lot ${selectedLot.lot_number}\nLot UUID: ${selectedLot.id}\nPhase: ${selectedLot.phase || 'Not provided'}\nStatus: ${selectedLot.public_status || 'Not provided'}\nCurrent public price: ${money(selectedLot.price) || 'Not published'}\n\nBuyer message:\n${data.get('message') || ''}`
            : data.get('message'),
          botcheck: data.get('botcheck'),
          subject: selectedLot ? `Cedar Ridge Reserve — Lot ${selectedLot.lot_number} inquiry` : 'New Cedar Ridge Reserve inquiry',
          from_name: 'Cedar Ridge Reserve — thearpergroup.com',
          replyto: data.get('email'),
          page: 'Cedar Ridge Reserve',
        }),
      });
      const result = await res.json();
      if (result.success) setSent(true);
      else setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-sm border border-crbrass/40 bg-crivory p-6 text-crnavy">
        {copy.success}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {selectedLot && <div className="rounded-sm border border-crbrass/45 bg-crbrass/10 p-4" aria-live="polite">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-crbrass">{lotCopy.heading}</p>
        <p className="mt-1 font-crserif text-2xl">Cedar Ridge Reserve — Lot {selectedLot.lot_number}</p>
        <p className="mt-2 text-sm text-crslate">{[
          selectedLot.phase ? `${lotCopy.phase} ${selectedLot.phase}` : null,
          selectedLot.public_status ? `${lotCopy.status}: ${selectedLot.public_status}` : null,
          selectedLot.price != null ? `${lotCopy.price}: ${money(selectedLot.price)}` : null,
        ].filter(Boolean).join(' · ')}</p>
      </div>}
      <input type="hidden" name="lot_id" value={selectedLot?.id || ''} />
      <input type="hidden" name="lot_number" value={selectedLot?.lot_number || ''} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span>{c.name}</span>
          <input required name="name" className="rounded-sm border border-crnavy/20 bg-white px-3 py-2" />
        </label>
        <label className="grid gap-1 text-sm">
          <span>{c.email}</span>
          <input required type="email" name="email" className="rounded-sm border border-crnavy/20 bg-white px-3 py-2" />
        </label>
      </div>
      <label className="grid gap-1 text-sm">
        <span>{c.phone}</span>
        <input name="phone" type="tel" className="rounded-sm border border-crnavy/20 bg-white px-3 py-2" />
      </label>
      <label className="grid gap-1 text-sm">
        <span>{c.message}</span>
        <textarea name="message" rows={4} placeholder={c.messagePlaceholder} className="rounded-sm border border-crnavy/20 bg-white px-3 py-2" />
      </label>
      <label className="flex items-start gap-2 text-xs text-crslate">
        <input required type="checkbox" name="consent" className="mt-0.5" />
        <span>{copy.consent}</span>
      </label>
      <input type="checkbox" name="botcheck" className="hidden" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
      <button
        disabled={busy}
        className="mt-1 justify-self-start rounded-sm bg-crnavy px-6 py-2.5 text-sm font-medium text-crivory transition-colors hover:bg-[#28405a] disabled:opacity-60"
      >
        {busy ? c.sending : copy.submit}
      </button>
      {failed && <p className="text-sm text-red-700">{copy.error}</p>}
    </form>
  );
}
