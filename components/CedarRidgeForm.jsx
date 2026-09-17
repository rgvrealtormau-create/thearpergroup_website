'use client';

import { useState } from 'react';
import { WEB3FORMS_ACCESS_KEY } from '../lib/site';

export default function CedarRidgeForm({ lang, copy }) {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const c = copy.fields;

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
          message: data.get('message'),
          botcheck: data.get('botcheck'),
          subject: 'New Cedar Ridge Reserve inquiry',
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
