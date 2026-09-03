'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BUSINESS, searchUrl, otherLang, swapLangInPath, WEB3FORMS_ACCESS_KEY } from '../lib/site';
import { nav, ui, footer as footerCopy } from '../lib/content';
import { Logo, LogoLockup, AllianceLogo } from './Logo';

export function SearchButton({ lang, campaign = 'nav', className = '', variant = 'gold' }) {
  const variants = {
    gold: 'bg-gold text-ink hover:bg-[#c9a96b]',
    petrol: 'bg-petrol text-cream hover:bg-[#243b49]',
  };
  return (
    <a
      href={searchUrl(campaign)}
      className={`inline-flex items-center justify-center rounded-sm px-4 py-2 text-sm font-medium transition-colors ${variants[variant]} ${className}`}
    >
      {ui[lang].search}
    </a>
  );
}

export function LangToggle({ lang }) {
  const pathname = usePathname();
  const target = otherLang(lang);
  return (
    <Link href={swapLangInPath(pathname, target)} className="text-sm link-underline" prefetch={false}>
      {ui[lang].lang}
    </Link>
  );
}

export function Header({ lang }) {
  const [open, setOpen] = useState(false);
  const items = nav[lang];
  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-cream/95 backdrop-blur">
      <div className="wrap flex items-center justify-between gap-4 py-3">
        <Link href={`/${lang}`} aria-label="The Arper Group">
          <Logo className="h-7 w-auto" priority />
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {items.map((it) => (
            <Link key={it.href} href={it.href} className="text-sm text-petrol hover:text-ink">{it.label}</Link>
          ))}
          <LangToggle lang={lang} />
          <SearchButton lang={lang} variant="petrol" />
        </nav>
        <button className="md:hidden text-sm text-petrol" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? ui[lang].close : ui[lang].menu}
        </button>
      </div>
      {open && (
        <div className="border-t border-black/10 bg-cream md:hidden">
          <div className="wrap flex flex-col gap-3 py-4">
            {items.map((it) => (
              <Link key={it.href} href={it.href} className="text-sm text-petrol" onClick={() => setOpen(false)}>{it.label}</Link>
            ))}
            <div className="flex items-center gap-4 pt-2">
              <LangToggle lang={lang} />
              <SearchButton lang={lang} variant="petrol" />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export function Footer({ lang }) {
  const f = footerCopy[lang];
  return (
    <footer className="mt-24 bg-ink text-cream">
      <div className="wrap grid gap-10 py-14 md:grid-cols-3">
        <div>
          <LogoLockup className="h-20 w-auto" />
          <p className="mt-4 max-w-xs text-sm text-cream/80 italic">{f.tagline}</p>
        </div>
        <div className="text-sm">
          <AllianceLogo className="h-12 w-auto" />
          <p className="mt-3 text-cream/90">{f.brokerLine}</p>
          <p className="mt-4 text-cream/70">{f.trec}</p>
          <ul className="mt-2 space-y-1">
            <li><a className="link-underline" href="https://drive.google.com/file/d/1FjegoP-dupXJXuQMlJKE_MTZPcXdjy4r/view" target="_blank" rel="noopener noreferrer">{f.iab}</a></li>
            <li><a className="link-underline" href="https://www.trec.texas.gov/forms/consumer-protection-notice" target="_blank" rel="noopener">{f.cpn}</a></li>
          </ul>
        </div>
        <div className="text-sm">
          <div className="text-cream/90">{f.followUs}</div>
          <ul className="mt-2 space-y-1">
            <li><a className="link-underline" href={BUSINESS.instagram} target="_blank" rel="noopener">Instagram @realtor.mau</a></li>
            <li><a className="link-underline" href={BUSINESS.googleBusiness} target="_blank" rel="noopener">Google Business Profile</a></li>
          </ul>
          <p className="mt-6 text-cream/60">{BUSINESS.city}, {BUSINESS.region}</p>
        </div>
      </div>
      <div className="border-t border-cream/15">
        <div className="wrap py-4 text-xs text-cream/60">
          © {new Date().getFullYear()} The Arper Group · Alliance Real Estate Group. {f.rights}
        </div>
      </div>
    </footer>
  );
}

export function ValuationForm({ lang, copy }) {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const c = copy.fields;

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setFailed(false);
    const data = new FormData(e.target);
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_ACCESS_KEY,
          address: data.get('address'),
          name: data.get('name'),
          email: data.get('email'),
          phone: data.get('phone'),
          botcheck: data.get('botcheck'),
          subject: 'New home valuation lead — Arper site',
          from_name: 'The Arper Group website',
          replyto: data.get('email'),
          page: 'Home valuation form',
        }),
      });
      const result = await res.json();
      if (result.success) {
        setSent(true);
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-sm border border-forest/30 bg-cream p-6 text-forest">
        {copy.success}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <label className="grid gap-1 text-sm">
        <span>{c.address}</span>
        <input required name="address" className="rounded-sm border border-black/20 bg-white px-3 py-2" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span>{c.name}</span>
          <input required name="name" className="rounded-sm border border-black/20 bg-white px-3 py-2" />
        </label>
        <label className="grid gap-1 text-sm">
          <span>{c.email}</span>
          <input required type="email" name="email" className="rounded-sm border border-black/20 bg-white px-3 py-2" />
        </label>
      </div>
      <label className="grid gap-1 text-sm">
        <span>{c.phone}</span>
        <input name="phone" className="rounded-sm border border-black/20 bg-white px-3 py-2" />
      </label>
      <input type="checkbox" name="botcheck" className="hidden" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
      <button disabled={busy} className="mt-2 justify-self-start rounded-sm bg-petrol px-5 py-2.5 text-sm font-medium text-cream hover:bg-[#243b49] disabled:opacity-60">
        {busy ? c.sending : c.submit}
      </button>
      {failed && <p className="text-sm text-red-700">{copy.error}</p>}
      <p className="text-xs text-ink/60">{copy.compliance}</p>
    </form>
  );
}
