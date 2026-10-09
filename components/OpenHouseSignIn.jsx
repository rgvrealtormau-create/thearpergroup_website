'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { WEB3FORMS_ACCESS_KEY, BUSINESS } from '../lib/site';

// The open house sign-in form and the screen a visitor sees after it (logic and bilingual
// copy co-located, as for the other forms on this site).
//
// The form is built for a phone at a front door: a name, a mobile number, an optional email
// and three questions answered with one tap each. It posts to /api/open-house, which keeps
// the sign-in in the Arper portal and hands it on (lib/openHouse.js). If that cannot be
// reached at all, the sign-in is emailed to the team through Web3Forms instead, so a visitor
// at the door is never lost to a bad connection on our side.
//
// After signing in, the visitor gets what they came for: the payment calculator opened on
// this home, the listing, a search for similar homes, and, for someone who owns a home, what
// theirs is worth. "Sign in another guest" clears the form for the next person on the same phone.

const COPY = {
  en: {
    name: 'Full name',
    phone: 'Mobile phone',
    email: 'Email (optional)',
    emailHint: 'We’ll send you this home’s details.',
    agentQ: 'Are you working with a real estate agent?',
    no: 'No',
    yes: 'Yes',
    agentName: 'Your agent’s name (optional)',
    whenQ: 'When are you hoping to buy?',
    when: { m3: '0–3 months', m6: '3–6 months', m12: '6–12 months', looking: 'Just looking' },
    ownQ: 'Do you own a home now?',
    own: { no: 'No', yes: 'Yes', sell: 'Yes, and I’d sell to buy' },
    consent: 'By signing in, you agree that The Arper Group may contact you by call or text about this home and your home search. Msg/data rates may apply. Consent is not a condition of any purchase.',
    submit: 'Sign in',
    sending: 'Signing in…',
    needContact: 'Please enter a 10-digit mobile number.',
    error: 'Something went wrong. Please try again, or tell the agent at the door. You can also call ',
    full: 'This sign-in sheet is full for today. Please give your name to the agent at the door.',
    thanks: (first) => `Thank you, ${first}. Enjoy the home.`,
    thanksBody: 'Take your time looking around. Here’s what most visitors ask for next:',
    sent: 'We also emailed this to you.',
    calc: 'Estimate the monthly payment',
    calcNote: 'This home’s price with 3.5% down. Change any number.',
    listing: 'See the photos and details',
    search: (city) => (city ? `See similar homes in ${city}` : 'See similar homes'),
    worth: 'What is my home worth?',
    withAgent: (mls) => `Glad you’re here with an agent. They can find this home${mls ? ` as MLS #${mls}` : ''} and are welcome to call us.`,
    text: 'Text us a question',
    smsBody: (home) => `Hi, I’m at the open house at ${home} and have a question:`,
    another: 'Sign in another guest',
  },
  es: {
    name: 'Nombre completo',
    phone: 'Celular',
    email: 'Correo (opcional)',
    emailHint: 'Te mandamos la información de esta casa.',
    agentQ: '¿Ya trabajas con un agente de bienes raíces?',
    no: 'No',
    yes: 'Sí',
    agentName: 'Nombre de tu agente (opcional)',
    whenQ: '¿Cuándo te gustaría comprar?',
    when: { m3: '0–3 meses', m6: '3–6 meses', m12: '6–12 meses', looking: 'Solo estoy viendo' },
    ownQ: '¿Ya tienes casa propia?',
    own: { no: 'No', yes: 'Sí', sell: 'Sí, y la vendería para comprar' },
    consent: 'Al registrarte, aceptas que The Arper Group te contacte por llamada o mensaje de texto sobre esta casa y tu búsqueda de casa. Pueden aplicar tarifas de mensajes/datos. Tu consentimiento no es condición de ninguna compra.',
    submit: 'Registrarme',
    sending: 'Registrando…',
    needContact: 'Escribe un celular de 10 dígitos.',
    error: 'Algo salió mal. Intenta de nuevo o avísale al agente en la entrada. También puedes llamar al ',
    full: 'La lista de registro de hoy está llena. Por favor dale tu nombre al agente en la entrada.',
    thanks: (first) => `Gracias, ${first}. Disfruta la casa.`,
    thanksBody: 'Recórrela con calma. Esto es lo que más nos piden después:',
    sent: 'También te lo mandamos por correo.',
    calc: 'Calcula el pago mensual',
    calcNote: 'El precio de esta casa con 3.5% de enganche. Cambia cualquier número.',
    listing: 'Ver las fotos y los detalles',
    search: (city) => (city ? `Ver casas parecidas en ${city}` : 'Ver casas parecidas'),
    worth: '¿Cuánto vale mi casa?',
    withAgent: (mls) => `Qué bueno que vienes con tu agente. Puede encontrar esta casa${mls ? ` con el MLS #${mls}` : ''} y con gusto nos puede llamar.`,
    text: 'Mándanos tu pregunta por mensaje',
    smsBody: (home) => `Hola, estoy en la casa abierta de ${home} y tengo una pregunta:`,
    another: 'Registrar a otra persona',
  },
};

const digits = (v) => {
  let d = String(v || '').replace(/[^0-9]/g, '');
  if (d.length === 11 && d.startsWith('1')) d = d.slice(1);
  return d;
};

// One question answered with a single tap. Tapping the chosen answer again clears it:
// none of the three is required.
function Taps({ legend, name, options, value, onChange }) {
  return (
    <fieldset>
      <legend className="text-sm text-ink/70">{legend}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map(([key, label]) => (
          <button
            key={key} type="button" aria-pressed={value === key} data-answer={`${name}:${key}`}
            onClick={() => onChange(value === key ? null : key)}
            className={`min-h-[44px] rounded-sm border px-4 py-2 text-sm ${value === key ? 'border-petrol bg-petrol text-cream' : 'border-ink/25 bg-paper text-ink hover:border-petrol'}`}
          >
            {label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export default function OpenHouseSignIn({ lang, listing }) {
  const c = COPY[lang] ?? COPY.en;
  const [hasAgent, setHasAgent] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [ownsHome, setOwnsHome] = useState(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);
  const [done, setDone] = useState(null);
  const [formKey, setFormKey] = useState(0);
  const topRef = useRef(null);
  const scrollUp = () => requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  const home = [listing.title, listing.cityName].filter(Boolean).join(', ');

  async function onSubmit(e) {
    e.preventDefault();
    if (busy) return;
    const data = new FormData(e.target);
    const name = String(data.get('name') || '').trim();
    const phone = digits(data.get('phone'));
    const email = String(data.get('email') || '').trim();
    const agentName = hasAgent === 'yes' ? String(data.get('agentName') || '').trim() : '';
    if (phone.length < 10) { setProblem('contact'); return; }
    setBusy(true);
    setProblem(null);

    const payload = {
      listing: listing.id, lang, name, phone, email, agentName, timeline, ownsHome,
      hasAgent: hasAgent === 'yes' ? true : hasAgent === 'no' ? false : null,
      consent: true, botcheck: data.get('botcheck') ? '1' : '',
    };

    let ok = false;
    let reason = 'failed';
    try {
      const res = await fetch('/api/open-house', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const answer = await res.json().catch(() => ({}));
      ok = res.ok && answer.ok === true;
      if (!ok && ['full', 'contact', 'name'].includes(answer.error)) reason = answer.error;
    } catch { /* fall through to the backup below */ }

    // Our own endpoint could not be reached or could not keep the sign-in anywhere: email it
    // to the team instead, so the visitor still counts. (Not when the sheet is full or the
    // answers themselves were refused: there is nothing a second route would fix.)
    if (!ok && reason === 'failed' && !payload.botcheck) {
      try {
        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_key: WEB3FORMS_ACCESS_KEY,
            subject: `Open house sign-in (backup): ${name} — ${home}`,
            from_name: 'The Arper Group website',
            page: `Open house sign-in — ${home}`,
            name, phone, email,
            language: lang === 'es' ? 'Spanish' : 'English',
            message: [
              'The sign-in could not be saved the normal way, so it was emailed here instead. It is NOT in the portal, the Sphere sheet or Brivity.',
              `Working with an agent: ${hasAgent === 'yes' ? `YES${agentName ? ` (${agentName})` : ''}` : hasAgent === 'no' ? 'No' : 'not answered'}`,
              `Buying: ${timeline || 'not answered'}`,
              `Owns a home: ${ownsHome || 'not answered'}`,
            ].join('\n'),
          }),
        });
        ok = Boolean((await res.json()).success);
      } catch { /* both routes failed */ }
    }

    setBusy(false);
    if (!ok) { setProblem(reason); return; }
    setDone({ first: name.split(/\s+/)[0], email: Boolean(email), hasAgent: hasAgent === 'yes', owns: ownsHome === 'yes' || ownsHome === 'sell' });
    scrollUp();
  }

  function reset() {
    setDone(null);
    setHasAgent(null);
    setTimeline(null);
    setOwnsHome(null);
    setProblem(null);
    setFormKey((k) => k + 1);
    scrollUp();
  }

  const inputCls = 'mt-1 w-full border border-ink/20 bg-paper px-3 py-3 text-base text-ink focus:border-petrol focus:outline-none';
  const primary = 'bg-petrol px-5 py-3.5 text-center text-base text-cream hover:bg-ink';
  const secondary = 'border border-petrol px-5 py-3 text-center text-sm text-petrol hover:bg-petrol hover:text-cream';

  if (done) {
    // "?&body=" is the form that works on both iOS and Android Messages.
    const smsHref = `sms:${BUSINESS.phone.replace(/[^0-9+]/g, '')}?&body=${encodeURIComponent(c.smsBody(home))}`;
    return (
      <div ref={topRef} className="scroll-mt-24 border border-ink/15 bg-paper p-6" data-signed-in>
        <p className="text-xs uppercase tracking-[0.18em] text-clay">✓ {listing.title}</p>
        <h2 className="mt-3 text-2xl leading-snug">{c.thanks(done.first)}</h2>
        <p className="mt-2 text-sm text-ink/75">{c.thanksBody}{done.email ? ` ${c.sent}` : ''}</p>
        <div className="mt-6 flex flex-col gap-3">
          {listing.calcHref && (
            <div>
              <Link href={listing.calcHref} className={`block ${primary}`}>{c.calc}</Link>
              <p className="mt-1.5 text-center text-xs text-ink/60">{c.calcNote}</p>
            </div>
          )}
          <Link href={listing.listingHref} className={secondary}>{c.listing}</Link>
          {done.owns && <Link href={`/${lang}/home-valuation`} className={secondary}>{c.worth}</Link>}
          {done.hasAgent
            ? <p className="border-l-2 border-gold pl-3 text-sm text-ink/80">{c.withAgent(listing.mls)}</p>
            : <a href={listing.searchHref} className={secondary}>{c.search(listing.cityName)}</a>}
          <a href={smsHref} className={secondary}>{c.text} · {BUSINESS.phoneDisplay}</a>
        </div>
        <button type="button" onClick={reset} className="mt-6 text-sm text-petrol link-underline">{c.another}</button>
      </div>
    );
  }

  return (
    <form key={formKey} ref={topRef} onSubmit={onSubmit} className="scroll-mt-24 space-y-5" noValidate={false}>
      <div>
        <label className="text-sm text-ink/70" htmlFor="oh-name">{c.name}</label>
        <input id="oh-name" name="name" required minLength={2} maxLength={80} autoComplete="name" autoCapitalize="words" className={inputCls} />
      </div>
      <div>
        <label className="text-sm text-ink/70" htmlFor="oh-phone">{c.phone}</label>
        <input id="oh-phone" name="phone" type="tel" required inputMode="tel" autoComplete="tel" maxLength={24} className={inputCls} aria-describedby={problem === 'contact' ? 'oh-problem' : undefined} />
      </div>
      <div>
        <label className="text-sm text-ink/70" htmlFor="oh-email">{c.email}</label>
        <input id="oh-email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" maxLength={254} className={inputCls} />
        <p className="mt-1 text-xs text-ink/55">{c.emailHint}</p>
      </div>

      <Taps legend={c.agentQ} name="agent" value={hasAgent} onChange={setHasAgent} options={[['no', c.no], ['yes', c.yes]]} />
      {hasAgent === 'yes' && (
        <input name="agentName" maxLength={80} placeholder={c.agentName} aria-label={c.agentName} className={inputCls} />
      )}
      <Taps legend={c.whenQ} name="when" value={timeline} onChange={setTimeline} options={Object.entries(c.when)} />
      <Taps legend={c.ownQ} name="own" value={ownsHome} onChange={setOwnsHome} options={Object.entries(c.own)} />

      <input type="checkbox" name="botcheck" className="hidden" tabIndex={-1} autoComplete="off" />

      <div>
        <button type="submit" disabled={busy} className={`w-full ${primary} disabled:opacity-60`}>
          {busy ? c.sending : c.submit}
        </button>
        <p className="mt-3 text-xs leading-relaxed text-ink/60">{c.consent}</p>
      </div>
      {problem && (
        <p id="oh-problem" role="alert" className="text-sm text-clay">
          {problem === 'contact' ? c.needContact : problem === 'full' ? c.full : (
            <>{c.error}<a href={`tel:${BUSINESS.phone}`} className="underline">{BUSINESS.phoneDisplay}</a>.</>
          )}
        </p>
      )}
    </form>
  );
}
