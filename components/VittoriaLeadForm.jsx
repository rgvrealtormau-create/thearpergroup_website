'use client';

import { useRef, useState } from 'react';
import { WEB3FORMS_ACCESS_KEY, BUSINESS, VITTORIA_MODEL_HOME_AGENTS } from '../lib/site';

// Vittoria lead capture, two modes (logic + bilingual copy co-located):
// - "checkin": the model-home check-in page. A host agent (or the buyer) fills it in on
//   a phone; the agent picked is credited as the referral source in the lead sheet.
//   The confirmation screen is the agent's receipt and can text the buyer the page link
//   from the agent's own Messages app (sms: link — no texting service involved).
// - "public": the inquiry form on the Vittoria page itself, with an optional
//   "which agent helped you at the model home?" question.
// Leads go to /api/lead (Google Sheet + Brivity) and Web3Forms (email alert).

const PAGE_PATH = (lang) => `/${lang}/communities/vittoria`;

const COPY = {
  en: {
    checkinTitle: 'Vittoria model home check-in',
    checkinLede: 'Agents: fill this in with your buyer so they get the details and you get credit for the visit. Buyers are welcome to fill it in themselves too.',
    publicTitle: 'Get pricing, availability and a tour',
    publicLede: 'Leave your info and we’ll reach out — or call or text us directly below.',
    agentLabel: 'Alliance agent who helped at the model home',
    agentPlaceholderCheckin: 'Select your name',
    agentPlaceholderPublic: 'No one / not sure',
    buyerName: 'Buyer’s full name',
    yourName: 'Your full name',
    phone: 'Mobile phone',
    email: 'Email (optional)',
    language: 'Preferred language',
    langEn: 'English',
    langEs: 'Spanish',
    hasAgent: 'Is the buyer already working with a real estate agent?',
    hasAgentPublic: 'Are you already working with a real estate agent?',
    no: 'No',
    yes: 'Yes',
    buyerAgent: 'Their agent’s name and brokerage',
    buyerAgentPublic: 'Your agent’s name and brokerage',
    notes: 'Notes (optional)',
    notesPh: 'Timeline, financing, questions…',
    consentCheckin: 'Buyer: by checking this box, I agree to be contacted by The Arper Group by call or text about Vittoria. Msg/data rates may apply.',
    consentPublic: 'By submitting, you agree to be contacted by call or text about your inquiry. Msg/data rates may apply.',
    handOff: 'Hand the phone to the buyer to check this box themselves.',
    submit: 'Submit',
    sending: 'Sending…',
    error: 'Something went wrong. Please try again, or call us at ',
    receiptTitle: 'Checked in',
    receiptAgent: 'Agent credited',
    receiptBuyer: 'Buyer',
    receiptTime: 'Time',
    receiptTip: 'Screenshot this screen as your referral receipt.',
    textBuyer: 'Text the buyer this page',
    openPage: 'Open the Vittoria page',
    another: 'Check in another buyer',
    thanksTitle: 'Thank you — we’ll be in touch soon.',
    thanksBody: 'In the meantime, you can download the brochure above or call us anytime.',
    smsBody: (first, agent, url) => `Hi ${first}, great meeting you at the Vittoria model home! Here are the townhome details, floor plans and brochure: ${url}${agent ? ` — ${agent}` : ''}`,
  },
  es: {
    checkinTitle: 'Registro de visita — casa modelo Vittoria',
    checkinLede: 'Agentes: llénenlo con su comprador para que reciba la información y ustedes reciban el crédito por la visita. El comprador también lo puede llenar.',
    publicTitle: 'Precios, disponibilidad y visitas',
    publicLede: 'Déjanos tus datos y te contactamos — o llámanos o mándanos mensaje abajo.',
    agentLabel: 'Agente de Alliance que te atendió en la casa modelo',
    agentPlaceholderCheckin: 'Selecciona tu nombre',
    agentPlaceholderPublic: 'Nadie / no estoy seguro',
    buyerName: 'Nombre completo del comprador',
    yourName: 'Tu nombre completo',
    phone: 'Celular',
    email: 'Correo (opcional)',
    language: 'Idioma preferido',
    langEn: 'Inglés',
    langEs: 'Español',
    hasAgent: '¿El comprador ya trabaja con un agente de bienes raíces?',
    hasAgentPublic: '¿Ya trabajas con un agente de bienes raíces?',
    no: 'No',
    yes: 'Sí',
    buyerAgent: 'Nombre y compañía de su agente',
    buyerAgentPublic: 'Nombre y compañía de tu agente',
    notes: 'Notas (opcional)',
    notesPh: 'Tiempos, financiamiento, preguntas…',
    consentCheckin: 'Comprador: al marcar esta casilla, acepto que The Arper Group me contacte por llamada o mensaje de texto sobre Vittoria. Pueden aplicar tarifas de mensajes/datos.',
    consentPublic: 'Al enviar, aceptas que te contactemos por llamada o mensaje de texto sobre tu consulta. Pueden aplicar tarifas de mensajes/datos.',
    handOff: 'Pásale el teléfono al comprador para que marque esta casilla.',
    submit: 'Enviar',
    sending: 'Enviando…',
    error: 'Algo salió mal. Intenta de nuevo o llámanos al ',
    receiptTitle: 'Registrado',
    receiptAgent: 'Agente con crédito',
    receiptBuyer: 'Comprador',
    receiptTime: 'Hora',
    receiptTip: 'Toma captura de pantalla como comprobante de tu referido.',
    textBuyer: 'Mandarle esta página por mensaje',
    openPage: 'Abrir la página de Vittoria',
    another: 'Registrar otro comprador',
    thanksTitle: 'Gracias — te contactamos muy pronto.',
    thanksBody: 'Mientras tanto, puedes descargar el folleto arriba o llamarnos cuando quieras.',
    smsBody: (first, agent, url) => `¡Hola ${first}! Qué gusto conocerte en la casa modelo de Vittoria. Aquí está la información de los townhomes, los planos y el folleto: ${url}${agent ? ` — ${agent}` : ''}`,
  },
};

export default function VittoriaLeadForm({ lang, mode = 'public' }) {
  const c = COPY[lang] ?? COPY.en;
  const checkin = mode === 'checkin';

  const [agent, setAgent] = useState('');
  const [hasAgent, setHasAgent] = useState('no');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [formKey, setFormKey] = useState(0);
  const topRef = useRef(null);
  const scrollUp = () => requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setFailed(false);
    const data = new FormData(e.target);
    if (data.get('botcheck')) { setBusy(false); return; }

    const name = String(data.get('name') || '').trim();
    const phone = String(data.get('phone') || '').trim();
    const email = String(data.get('email') || '').trim();
    const buyerLang = data.get('buyerLang') || lang;
    const buyerAgent = hasAgent === 'yes' ? String(data.get('buyerAgent') || '').trim() || 'Yes (name not given)' : '';
    const notes = String(data.get('notes') || '').trim();
    const submittedAt = new Date();

    const detail = [
      checkin ? 'Source: Vittoria model home check-in' : 'Source: Vittoria page',
      `Referred by (Alliance model-home host): ${agent || 'None selected'}`,
      `Buyer already has an agent: ${hasAgent === 'yes' ? `YES — ${buyerAgent}` : 'No'}`,
      notes ? `Notes: ${notes}` : null,
    ].filter(Boolean).join('\n');

    const [api, w3f] = await Promise.allSettled([
      fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formType: checkin ? 'vittoria_model_home' : 'vittoria',
          lang: buyerLang,
          name, phone, email, detail,
          referralAgent: agent || null,
          buyerAgent: buyerAgent || null,
        }),
      }).then((r) => r.ok),
      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_ACCESS_KEY,
          subject: `Vittoria lead${agent ? ` — referred by ${agent}` : ''}${hasAgent === 'yes' ? ' — HAS AGENT' : ''}`,
          from_name: 'The Arper Group website',
          page: checkin ? 'Vittoria model home check-in' : 'Vittoria page',
          name, phone, email,
          language: buyerLang === 'es' ? 'Spanish' : 'English',
          message: detail,
        }),
      }).then((r) => r.json()).then((j) => !!j.success),
    ]);

    const ok = (api.status === 'fulfilled' && api.value) || (w3f.status === 'fulfilled' && w3f.value);
    setBusy(false);
    if (!ok) { setFailed(true); return; }
    setReceipt({ name, phone, agent, buyerLang, time: submittedAt });
    scrollUp();
  }

  function reset() {
    setReceipt(null);
    setHasAgent('no');
    setFormKey((k) => k + 1); // keep the agent selected for the next check-in
    scrollUp();
  }

  const inputCls = 'mt-1 w-full border border-ink/20 bg-paper px-3 py-2.5 text-ink focus:border-petrol focus:outline-none';

  if (receipt) {
    if (!checkin) {
      return (
        <div ref={topRef} className="scroll-mt-24 border border-ink/15 bg-paper p-6">
          <p className="font-display text-2xl">{c.thanksTitle}</p>
          <p className="mt-2 text-ink/75">{c.thanksBody}</p>
        </div>
      );
    }
    const bc = COPY[receipt.buyerLang] ?? c;
    const url = `${BUSINESS.url}${PAGE_PATH(receipt.buyerLang)}`;
    const first = receipt.name.split(' ')[0];
    const agentFirst = receipt.agent ? receipt.agent.split(' ')[0] : '';
    const digits = receipt.phone.replace(/[^0-9+]/g, '');
    // "?&body=" is the form that works on both iOS and Android Messages.
    const smsHref = `sms:${digits}?&body=${encodeURIComponent(bc.smsBody(first, agentFirst, url))}`;
    const time = receipt.time.toLocaleString(lang === 'es' ? 'es-MX' : 'en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Chicago' });
    return (
      <div ref={topRef} className="scroll-mt-24 border border-ink/15 bg-paper p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-clay">✓ {c.receiptTitle}</p>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-ink/60">{c.receiptAgent}</dt><dd className="text-right font-medium">{receipt.agent || '—'}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-ink/60">{c.receiptBuyer}</dt><dd className="text-right font-medium">{receipt.name}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-ink/60">{c.receiptTime}</dt><dd className="text-right font-medium">{time}</dd></div>
        </dl>
        <p className="mt-3 text-xs text-ink/55">{c.receiptTip}</p>
        <div className="mt-6 flex flex-col gap-3">
          <a href={smsHref} className="bg-petrol px-5 py-3 text-center text-sm text-cream hover:bg-ink">{c.textBuyer}</a>
          <a href={PAGE_PATH(lang)} className="border border-petrol px-5 py-3 text-center text-sm text-petrol">{c.openPage}</a>
          <button type="button" onClick={reset} className="mt-1 text-sm text-petrol link-underline">{c.another}</button>
        </div>
      </div>
    );
  }

  const agentSelect = (
      <div>
        <label className="text-sm text-ink/70" htmlFor="vl-agent">{c.agentLabel}</label>
        <select id="vl-agent" required={checkin} value={agent} onChange={(e) => setAgent(e.target.value)} className={inputCls}>
          <option value="">{checkin ? c.agentPlaceholderCheckin : c.agentPlaceholderPublic}</option>
          {VITTORIA_MODEL_HOME_AGENTS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
  );

  return (
    <form key={formKey} ref={topRef} onSubmit={onSubmit} className="scroll-mt-24 space-y-5">
      {checkin && agentSelect}

      <div>
        <label className="text-sm text-ink/70" htmlFor="vl-name">{checkin ? c.buyerName : c.yourName}</label>
        <input id="vl-name" name="name" required autoComplete={checkin ? 'off' : 'name'} className={inputCls} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="text-sm text-ink/70" htmlFor="vl-phone">{c.phone}</label>
          <input id="vl-phone" name="phone" type="tel" required inputMode="tel" autoComplete={checkin ? 'off' : 'tel'} className={inputCls} />
        </div>
        <div>
          <label className="text-sm text-ink/70" htmlFor="vl-email">{c.email}</label>
          <input id="vl-email" name="email" type="email" autoComplete={checkin ? 'off' : 'email'} className={inputCls} />
        </div>
      </div>

      <fieldset>
        <legend className="text-sm text-ink/70">{c.language}</legend>
        <div className="mt-2 flex gap-5 text-sm">
          <label className="flex items-center gap-2"><input type="radio" name="buyerLang" value="en" defaultChecked={lang !== 'es'} className="accent-petrol" /> {c.langEn}</label>
          <label className="flex items-center gap-2"><input type="radio" name="buyerLang" value="es" defaultChecked={lang === 'es'} className="accent-petrol" /> {c.langEs}</label>
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm text-ink/70">{checkin ? c.hasAgent : c.hasAgentPublic}</legend>
        <div className="mt-2 flex gap-5 text-sm">
          <label className="flex items-center gap-2"><input type="radio" name="hasAgent" value="no" checked={hasAgent === 'no'} onChange={() => setHasAgent('no')} className="accent-petrol" /> {c.no}</label>
          <label className="flex items-center gap-2"><input type="radio" name="hasAgent" value="yes" checked={hasAgent === 'yes'} onChange={() => setHasAgent('yes')} className="accent-petrol" /> {c.yes}</label>
        </div>
        {hasAgent === 'yes' && (
          <input name="buyerAgent" required placeholder={checkin ? c.buyerAgent : c.buyerAgentPublic} aria-label={checkin ? c.buyerAgent : c.buyerAgentPublic} className={inputCls} />
        )}
      </fieldset>

      <div>
        <label className="text-sm text-ink/70" htmlFor="vl-notes">{c.notes}</label>
        <textarea id="vl-notes" name="notes" rows={2} placeholder={c.notesPh} className={inputCls} />
      </div>

      {!checkin && agentSelect}

      <input type="checkbox" name="botcheck" className="hidden" tabIndex={-1} autoComplete="off" />

      <div>
        {checkin && <p className="mb-2 text-xs font-medium text-clay">{c.handOff}</p>}
        <label className="flex items-start gap-3 text-xs text-ink/70">
          <input required type="checkbox" name="consent" className="mt-0.5 h-4 w-4 accent-petrol" />
          <span>{checkin ? c.consentCheckin : c.consentPublic}</span>
        </label>
      </div>

      <button type="submit" disabled={busy} className="w-full bg-petrol px-6 py-3 text-sm text-cream hover:bg-ink disabled:opacity-60 sm:w-auto">
        {busy ? c.sending : c.submit}
      </button>
      {failed && (
        <p className="text-sm text-clay">{c.error}<a href={`tel:${BUSINESS.phone}`} className="underline">{BUSINESS.phoneDisplay}</a>.</p>
      )}
    </form>
  );
}
