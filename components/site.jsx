'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BUSINESS, SOCIAL, searchUrl, otherLang, swapLangInPath, WEB3FORMS_ACCESS_KEY } from '../lib/site';
import { nav, ui, footer as footerCopy, communitiesHub } from '../lib/content';
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

export function LangToggle({ lang, className = '' }) {
  const pathname = usePathname();
  return (
    <div className={`flex items-center gap-1 text-xs font-medium tracking-wide ${className}`}>
      <Link
        href={swapLangInPath(pathname, 'en')}
        prefetch={false}
        aria-current={lang === 'en' ? 'true' : undefined}
        className={lang === 'en' ? 'text-ink' : 'text-petrol/50 hover:text-petrol'}
      >
        EN
      </Link>
      <span className="text-petrol/30">/</span>
      <Link
        href={swapLangInPath(pathname, 'es')}
        prefetch={false}
        aria-current={lang === 'es' ? 'true' : undefined}
        className={lang === 'es' ? 'text-ink' : 'text-petrol/50 hover:text-petrol'}
      >
        ES
      </Link>
    </div>
  );
}

function ChevronIcon({ open }) {
  return (
    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
      <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Desktop: click-opened dropdown listing each community, so "Communities"
// goes straight into a subdivision's page instead of a middle hub page
// the visitor has to pick from.
function CommunitiesDropdown({ lang, label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);
  const cards = communitiesHub[lang].cards;
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="flex items-center gap-1.5 whitespace-nowrap text-sm text-petrol hover:text-ink"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {label}
        <ChevronIcon open={open} />
      </button>
      {open && (
        <div className="absolute left-0 top-full w-56 pt-2">
          <div className="overflow-hidden rounded-sm border border-black/10 bg-cream shadow-lg">
            {cards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-3 text-sm text-petrol hover:bg-black/5 hover:text-ink"
              >
                <span className="block font-medium">{card.name}</span>
                <span className="block text-xs text-ink/50">{card.location}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Mobile equivalent: an inline accordion instead of a hover panel.
function CommunitiesAccordion({ lang, label, onNavigate }) {
  const [open, setOpen] = useState(false);
  const cards = communitiesHub[lang].cards;
  return (
    <div>
      <button
        type="button"
        className="flex w-full items-center justify-between text-sm text-petrol"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {label}
        <ChevronIcon open={open} />
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-2 border-l border-black/10 pl-4">
          {cards.map((card) => (
            <Link key={card.href} href={card.href} className="text-sm text-petrol/80" onClick={onNavigate}>
              {card.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function Header({ lang }) {
  const [open, setOpen] = useState(false);
  const items = nav[lang];
  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-cream/95 backdrop-blur">
      <div className="wrap-wide flex items-center justify-between gap-4 py-3">
        <Link href={`/${lang}`} aria-label="The Arper Group" className="shrink-0">
          <Logo className="h-7 w-auto" priority />
        </Link>
        <nav className="hidden items-center gap-5 xl:flex">
          {items.map((it) =>
            it.href.endsWith('/communities') ? (
              <CommunitiesDropdown key={it.href} lang={lang} label={it.label} />
            ) : (
              <Link key={it.href} href={it.href} className="whitespace-nowrap text-sm text-petrol hover:text-ink">{it.label}</Link>
            )
          )}
          <SearchButton lang={lang} variant="petrol" className="whitespace-nowrap" />
          <LangToggle lang={lang} />
        </nav>
        <button className="text-sm text-petrol xl:hidden" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? ui[lang].close : ui[lang].menu}
        </button>
      </div>
      {open && (
        <div className="border-t border-black/10 bg-cream xl:hidden">
          <div className="wrap-wide flex flex-col gap-3 py-4">
            {items.map((it) =>
              it.href.endsWith('/communities') ? (
                <CommunitiesAccordion key={it.href} lang={lang} label={it.label} onNavigate={() => setOpen(false)} />
              ) : (
                <Link key={it.href} href={it.href} className="text-sm text-petrol" onClick={() => setOpen(false)}>{it.label}</Link>
              )
            )}
            <div className="flex items-center gap-4 pt-2">
              <SearchButton lang={lang} variant="petrol" />
              <LangToggle lang={lang} />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function SocialGroup({ person }) {
  return (
    <div>
      <div className="text-cream/70">{person.name}</div>
      <ul className="mt-1 space-y-1">
        <li><a className="link-underline" href={person.instagram} target="_blank" rel="noopener noreferrer">Instagram</a></li>
        <li><a className="link-underline" href={person.facebook} target="_blank" rel="noopener noreferrer">Facebook</a></li>
        <li><a className="link-underline" href={person.tiktok} target="_blank" rel="noopener noreferrer">TikTok</a></li>
      </ul>
    </div>
  );
}

export function Footer({ lang }) {
  const pathname = usePathname();
  const f = footerCopy[lang];
  // Cedar Ridge Reserve carries its own developer credit alongside the shared brokerage attribution.
  const extraCredit = pathname?.includes('/communities/cedar-ridge-reserve')
    ? (lang === 'es' ? 'Desarrollado por REA Contractors' : 'Developed by REA Contractors')
    : null;
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
          <div className="mt-3 grid grid-cols-2 gap-6">
            <SocialGroup person={SOCIAL.mau} />
            <SocialGroup person={SOCIAL.pam} />
          </div>
          <p className="mt-4">
            <a className="link-underline" href={BUSINESS.googleBusiness} target="_blank" rel="noopener noreferrer">Google Business Profile</a>
          </p>
          <p className="mt-6 text-cream/60">{BUSINESS.city}, {BUSINESS.region}</p>
        </div>
      </div>
      <div className="border-t border-cream/15">
        <div className="wrap py-4 text-xs text-cream/60">
          © {new Date().getFullYear()} The Arper Group · Alliance Real Estate Group{extraCredit ? ` · ${extraCredit}` : ''}. {f.rights}
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
    if (!data.get('botcheck')) {
      fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formType: 'home_valuation',
          lang,
          name: data.get('name'),
          email: data.get('email'),
          phone: data.get('phone'),
          address: data.get('address'),
        }),
      }).catch(() => {});
    }
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
