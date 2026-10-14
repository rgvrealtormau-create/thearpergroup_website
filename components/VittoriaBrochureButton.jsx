'use client';

// The Vittoria "Download the brochure" button, softly gated: a tap opens a short, optional
// box (name + phone). Filling it in sends the visitor to /api/lead (Brivity, the sphere sheet,
// the team alert) and then downloads the PDF; "No thanks, just download" downloads it at once.
// Every download is counted, either way, through /api/brochure-download. Agents downloading
// for a client tick a box and are logged as co-op agents, not buyers.

import { useEffect, useRef, useState } from 'react';
import { VITTORIA_MODEL_HOME_AGENTS } from '../lib/site';

const BOOKLET = '/downloads/vittoria-townhomes-booklet.pdf';

const COPY = {
  en: {
    title: 'Your brochure is ready',
    lede: 'Want pricing updates and availability? Leave your name and number and we’ll keep you posted. Totally optional.',
    name: 'Full name',
    phone: 'Mobile phone',
    email: 'Email (optional)',
    agentLabel: 'Saw the model home with an agent? (optional)',
    agentNone: 'No / not sure',
    isAgent: 'I’m a real estate agent sharing this with a client',
    consent: 'By submitting, you agree to be contacted by call or text about Vittoria. Msg/data rates may apply.',
    submit: 'Download & keep me posted',
    sending: 'Sending…',
    skip: 'No thanks, just download',
    close: 'Close',
  },
  es: {
    title: 'Tu folleto está listo',
    lede: '¿Quieres saber de precios y disponibilidad? Déjanos tu nombre y número y te mantenemos al tanto. Es opcional.',
    name: 'Nombre completo',
    phone: 'Celular',
    email: 'Correo (opcional)',
    agentLabel: '¿Viste la casa modelo con un agente? (opcional)',
    agentNone: 'No / no estoy seguro',
    isAgent: 'Soy agente de bienes raíces y lo comparto con un cliente',
    consent: 'Al enviar, aceptas que te contactemos por llamada o mensaje de texto sobre Vittoria. Pueden aplicar tarifas de mensajes/datos.',
    submit: 'Descargar y mantenerme al tanto',
    sending: 'Enviando…',
    skip: 'No gracias, solo descargar',
    close: 'Cerrar',
  },
};

function countDownload(lang, outcome) {
  try {
    const body = JSON.stringify({ lang, outcome });
    if (navigator.sendBeacon) navigator.sendBeacon('/api/brochure-download', new Blob([body], { type: 'application/json' }));
    else fetch('/api/brochure-download', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true });
  } catch { /* counting never blocks the download */ }
}

function startDownload() {
  const a = document.createElement('a');
  a.href = BOOKLET;
  a.download = '';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export default function VittoriaBrochureButton({ lang, label, tone = 'light' }) {
  const c = COPY[lang] ?? COPY.en;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isAgent, setIsAgent] = useState(false);
  const dialogRef = useRef(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const cls = tone === 'light' ? 'bg-gold text-ink hover:bg-cream' : 'bg-petrol text-cream hover:bg-ink';
  const inputCls = 'mt-1 w-full border border-ink/20 bg-paper px-3 py-2.5 text-ink focus:border-petrol focus:outline-none';

  function skip() {
    countDownload(lang, 'skip');
    setOpen(false);
    // The link itself downloads the PDF (see the <a> below).
  }

  async function onSubmit(e) {
    e.preventDefault();
    const data = new FormData(e.target);
    if (data.get('botcheck')) { setOpen(false); return; }
    setBusy(true);
    const name = String(data.get('name') || '').trim();
    const phone = String(data.get('phone') || '').trim();
    const email = String(data.get('email') || '').trim();
    const agent = isAgent ? '' : String(data.get('agent') || '');
    const detail = [
      'Source: Vittoria brochure download',
      isAgent ? 'Real estate agent downloading for a client' : `Saw the model home with: ${agent || 'No one selected'}`,
    ].join('\n');

    // The PDF downloads whether or not saving the contact works.
    try {
      await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formType: isAgent ? 'vittoria_agent' : 'vittoria_brochure',
          lang, name, phone, email, detail,
          referralAgent: agent || null,
        }),
      });
    } catch { /* the download still happens */ }
    countDownload(lang, isAgent ? 'agent' : 'lead');
    setBusy(false);
    setOpen(false);
    startDownload();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium ${cls}`}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M7 1v8m0 0L3.5 5.5M7 9l3.5-3.5M1.5 12.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {label}
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(e) => { if (e.target === dialogRef.current) setOpen(false); }}
        className="w-[calc(100%-2rem)] max-w-md bg-paper p-0 text-ink backdrop:bg-ink/60"
      >
        <form onSubmit={onSubmit} className="relative p-6">
          <button type="button" onClick={() => setOpen(false)} aria-label={c.close} className="absolute right-3 top-3 px-2 text-xl leading-none text-ink/50 hover:text-ink">×</button>
          <p className="font-display text-2xl">{c.title}</p>
          <p className="mt-2 text-sm text-ink/75">{c.lede}</p>

          <input type="checkbox" name="botcheck" className="hidden" tabIndex={-1} autoComplete="off" />

          <label className="mt-4 block text-sm">{c.name}
            <input required name="name" autoComplete="name" className={inputCls} />
          </label>
          <label className="mt-3 block text-sm">{c.phone}
            <input required name="phone" type="tel" autoComplete="tel" className={inputCls} />
          </label>
          <label className="mt-3 block text-sm">{c.email}
            <input name="email" type="email" autoComplete="email" className={inputCls} />
          </label>

          {!isAgent && (
            <label className="mt-3 block text-sm">{c.agentLabel}
              <select name="agent" defaultValue="" className={inputCls}>
                <option value="">{c.agentNone}</option>
                {VITTORIA_MODEL_HOME_AGENTS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>
          )}

          <label className="mt-3 flex items-start gap-2 text-sm">
            <input type="checkbox" checked={isAgent} onChange={(e) => setIsAgent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-petrol" />
            <span>{c.isAgent}</span>
          </label>

          <p className="mt-3 text-xs text-ink/60">{c.consent}</p>

          <button type="submit" disabled={busy} className="mt-4 w-full bg-petrol px-6 py-3 text-sm font-medium text-cream hover:bg-ink disabled:opacity-60">
            {busy ? c.sending : c.submit}
          </button>
          <a href={BOOKLET} download onClick={skip} className="mt-3 block text-center text-sm text-petrol underline underline-offset-4">
            {c.skip}
          </a>
        </form>
      </dialog>
    </>
  );
}
