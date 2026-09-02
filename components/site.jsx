'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BUSINESS, searchUrl, otherLang, swapLangInPath } from '../lib/site';
import { nav, ui, footer as footerCopy } from '../lib/content';

export function SearchButton({ lang, campaign = 'nav', className = '' }) {
  return (
    <a
      href={searchUrl(campaign)}
      className={`inline-flex items-center justify-center rounded-sm bg-gold px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-[#c9a96b] ${className}`}
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
    <header className="sticky top-0 z-40 border-b border-black/10 bg-paper/95 backdrop-blur">
      <div className="wrap flex items-center justify-between gap-4 py-3">
        <Link href={`/${lang}`} className="font-display text-xl tracking-tight">
          The Arper Group
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {items.map((it) => (
            <Link key={it.href} href={it.href} className="text-sm hover:text-petrol">{it.label}</Link>
          ))}
          <LangToggle lang={lang} />
          <SearchButton lang={lang} />
        </nav>
        <button className="md:hidden text-sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? ui[lang].close : ui[lang].menu}
        </button>
      </div>
      {open && (
        <div className="border-t border-black/10 bg-paper md:hidden">
          <div className="wrap flex flex-col gap-3 py-4">
            {items.map((it) => (
              <Link key={it.href} href={it.href} className="text-sm" onClick={() => setOpen(false)}>{it.label}</Link>
            ))}
            <div className="flex items-center gap-4 pt-2">
              <LangToggle lang={lang} />
              <SearchButton lang={lang} />
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
    <footer className="mt-24 bg-petrol text-cream">
      <div className="wrap grid gap-10 py-14 md:grid-cols-3">
        <div>
          <div className="font-display text-2xl">The Arper Group</div>
          <p className="mt-2 max-w-xs text-sm text-cream/80 font-display italic">{f.tagline}</p>
        </div>
        <div className="text-sm">
          <p className="text-cream/90">{f.brokerLine}</p>
          <p className="mt-4 text-cream/70">{f.trec}</p>
          <ul className="mt-2 space-y-1">
            <li><a className="link-underline" href="https://www.trec.texas.gov/forms/information-about-brokerage-services" target="_blank" rel="noopener">{f.iab}</a></li>
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
  const c = copy.fields;

  function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    // TODO: wire to CRM/email (routes to Mauricio). Preview build shows confirmation only.
    setTimeout(() => { setBusy(false); setSent(true); }, 400);
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
      <button disabled={busy} className="mt-2 justify-self-start rounded-sm bg-petrol px-5 py-2.5 text-sm font-medium text-cream hover:bg-[#243b49] disabled:opacity-60">
        {busy ? c.sending : c.submit}
      </button>
      <p className="text-xs text-ink/60">{copy.compliance}</p>
    </form>
  );
}
