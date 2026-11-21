'use client';

import { useState } from 'react';
import { contactCopy } from '../lib/content';
import { WEB3FORMS_ACCESS_KEY, BUSINESS } from '../lib/site';

const INTERESTS = ['buying', 'selling', 'both', 'other'];

// The site-wide contact form: name, phone, email, buying/selling and a message.
// Leads go to /api/lead (Brivity, the portal's leads inbox, the Sphere Nurture sheet and the
// team's alert email) and to Web3Forms, the same two destinations as every other form on the
// site. A seller is filed as a seller lead. The hidden "botcheck" box is the honeypot.
export default function ContactForm({ lang, page = 'Contact page' }) {
  const c = contactCopy[lang].form;
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [needContact, setNeedContact] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    const data = new FormData(e.target);
    if (data.get('botcheck')) { setSent(true); return; }

    const name = String(data.get('name') || '').trim();
    const phone = String(data.get('phone') || '').trim();
    const email = String(data.get('email') || '').trim();
    const interest = INTERESTS.includes(data.get('interest')) ? data.get('interest') : 'other';
    const message = String(data.get('message') || '').trim().slice(0, 2000);
    if (!phone && !email) { setNeedContact(true); return; }
    setNeedContact(false);
    setBusy(true);
    setFailed(false);

    // Always in English, so leads read the same in the sheet, the portal and Brivity.
    const interestEn = contactCopy.en.form.interests[interest];
    const detail = [
      `Source: ${page}`,
      `Interested in: ${interestEn}`,
      message ? `Message: ${message}` : null,
    ].filter(Boolean).join('\n');

    const [api, w3f] = await Promise.allSettled([
      fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formType: 'contact', lang, name, phone, email, interest, detail }),
      }).then((r) => r.ok),
      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_ACCESS_KEY,
          subject: `Contact form lead — ${interestEn}`,
          from_name: 'The Arper Group website',
          page,
          name, phone, email,
          replyto: email || undefined,
          language: lang === 'es' ? 'Spanish' : 'English',
          message: detail,
        }),
      }).then((r) => r.json()).then((j) => !!j.success),
    ]);

    const ok = (api.status === 'fulfilled' && api.value) || (w3f.status === 'fulfilled' && w3f.value);
    setBusy(false);
    if (!ok) { setFailed(true); return; }
    setSent(true);
  }

  const call = <a className="link-underline" href={`tel:${BUSINESS.phone}`}>{BUSINESS.phoneDisplay}</a>;

  if (sent) {
    return (
      <div className="bg-paper p-7 text-ink" role="status">
        <p className="font-display text-2xl">{c.thanksTitle}</p>
        <p className="mt-2 text-ink/75">{c.thanksBody}{call}.</p>
      </div>
    );
  }

  const inputCls = 'mt-1 w-full rounded-sm border border-ink/25 bg-white px-3 py-2.5 text-ink focus:border-petrol focus:outline-none';

  return (
    <form onSubmit={onSubmit} className="grid gap-4 bg-paper p-7 text-ink">
      <label className="block text-sm">
        {c.name}
        <input required name="name" autoComplete="name" maxLength={120} className={inputCls} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          {c.phone}
          <input type="tel" name="phone" autoComplete="tel" maxLength={40} className={inputCls} />
        </label>
        <label className="block text-sm">
          {c.email}
          <input type="email" name="email" autoComplete="email" maxLength={200} className={inputCls} />
        </label>
      </div>
      <fieldset className="text-sm">
        <legend>{c.interest}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {INTERESTS.map((key, i) => (
            <label key={key} className="cursor-pointer">
              <input type="radio" name="interest" value={key} defaultChecked={i === 0} className="peer sr-only" />
              <span className="inline-flex min-h-[44px] items-center rounded-sm border border-ink/25 bg-white px-4 text-ink peer-checked:border-petrol peer-checked:bg-petrol peer-checked:text-cream peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-petrol">
                {c.interests[key]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block text-sm">
        {c.message}
        <textarea name="message" rows={3} maxLength={2000} className={inputCls} />
      </label>
      <input type="checkbox" name="botcheck" className="hidden" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <button disabled={busy} className="mt-1 min-h-[44px] justify-self-start rounded-sm bg-petrol px-6 text-sm font-medium text-cream hover:bg-[#243b49] disabled:opacity-60">
        {busy ? c.sending : c.submit}
      </button>
      {needContact && <p className="text-sm text-red-700">{c.needContact}</p>}
      {failed && <p className="text-sm text-red-700">{c.error}{call}.</p>}
      <p className="text-xs text-ink/70">{c.consent} {c.eho}</p>
    </form>
  );
}
