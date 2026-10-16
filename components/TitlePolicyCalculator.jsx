'use client';

import { useEffect, useMemo, useState } from 'react';
import { WEB3FORMS_ACCESS_KEY } from '../lib/site';
import { titleBasicPremium as basicPremium, loanPolicyPremium } from '../lib/calc';
import { readHandoff, handoffHref, shareParams, applyShared, scrollToResults } from '../lib/calcHandoff';
import ShareLink from './ShareLink';
import ListingImport from './ListingImport';

// Rate Rule R-16 (amendment of the area & boundary / survey exception):
// always $0 on a Loan Policy, but 5% of the Owner's Policy basic premium
// (minimum $20) for residential property to add the same protection there —
// assuming a satisfactory survey. Non-residential land rates at 15% instead.
// tdi.texas.gov/title/titlem3b.html#r16
const AREA_AMENDMENT_RATE_RESIDENTIAL = 0.05;
const AREA_AMENDMENT_MIN = 20;

function areaAmendmentPremium(ownerPremium) {
  if (ownerPremium <= 0) return 0;
  return Math.max(Math.round(ownerPremium * AREA_AMENDMENT_RATE_RESIDENTIAL), AREA_AMENDMENT_MIN);
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function num(v) {
  return parseFloat(v) || 0;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

export default function TitlePolicyCalculator({ lang, copy, listings = [] }) {
  const L = copy.labels;
  const R = copy.results;

  const [salePrice, setSalePrice] = useState('300000');
  const [downPercent, setDownPercent] = useState(20);
  const [downStr, setDownStr] = useState('20');
  const [downMode, setDownMode] = useState('percent');
  const [amendArea, setAmendArea] = useState(false);

  // Everything a "share a link to these numbers" link carries (lib/calcHandoff.js).
  const shareFields = {
    price: { value: salePrice, set: setSalePrice, def: '300000' },
    dp: {
      value: Number(downPercent.toFixed(6)),
      def: 20,
      set: (v) => {
        setDownPercent(num(v));
        setDownStr(String(round1(num(v))));
        setDownMode('percent');
      },
    },
    area: { value: amendArea, set: setAmendArea, type: 'bool' },
  };
  const shareHref = handoffHref(lang, 'resources/title-policy-calculator', shareParams(shareFields));

  // Arriving on a shared link: fill in whatever it carried.
  useEffect(() => {
    const h = readHandoff();
    if (!Object.keys(h).length) return;
    applyShared(h, shareFields);
    scrollToResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const downDollar = useMemo(() => Math.round((num(salePrice) * downPercent) / 100), [salePrice, downPercent]);
  const loanAmount = Math.max(num(salePrice) - downDollar, 0);

  const ownerPremium = useMemo(() => basicPremium(num(salePrice)), [salePrice]);
  const loanPremium = useMemo(() => loanPolicyPremium(loanAmount, num(salePrice)), [loanAmount, salePrice]);
  const standaloneLoanPremium = useMemo(() => basicPremium(loanAmount), [loanAmount]);
  const areaAmendment = useMemo(() => (amendArea ? areaAmendmentPremium(ownerPremium) : 0), [amendArea, ownerPremium]);
  const totalPremiums = ownerPremium + loanPremium + areaAmendment;

  const savingsNote = loanAmount > 0 && standaloneLoanPremium > loanPremium
    ? R.loanPolicySavingsNote.replace('{actual}', usd.format(loanPremium)).replace('{standalone}', usd.format(standaloneLoanPremium))
    : null;

  const [showLead, setShowLead] = useState(false);
  const [leadSent, setLeadSent] = useState(false);
  const [leadBusy, setLeadBusy] = useState(false);
  const [leadFailed, setLeadFailed] = useState(false);

  async function onLeadSubmit(e) {
    e.preventDefault();
    setLeadBusy(true);
    setLeadFailed(false);
    const data = new FormData(e.target);
    const message = [
      `Sales price: ${usd.format(num(salePrice))}`,
      `Down payment: ${usd.format(downDollar)} (${round1(downPercent)}%)`,
      `Loan amount: ${usd.format(loanAmount)}`,
      `Owner's Policy premium: ${usd.format(ownerPremium)}`,
      loanAmount > 0 ? `Loan Policy premium: ${usd.format(loanPremium)}` : `Loan Policy: none (cash purchase)`,
      ...(amendArea ? [`Area & boundary amendment: ${usd.format(areaAmendment)}`] : []),
      `Total title insurance premiums: ${usd.format(totalPremiums)}`,
    ].join('\n');
    if (!data.get('botcheck')) {
      fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formType: 'title_policy_calculator',
          lang,
          name: data.get('name'),
          phone: data.get('phone'),
          detail: message,
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
          phone: data.get('phone'),
          botcheck: data.get('botcheck'),
          subject: 'Title policy calculator lead',
          from_name: 'The Arper Group website',
          page: 'Title policy calculator',
          message,
        }),
      });
      const result = await res.json();
      if (result.success) setLeadSent(true);
      else setLeadFailed(true);
    } catch {
      setLeadFailed(true);
    } finally {
      setLeadBusy(false);
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-start">
      {/* Inputs */}
      <div className="grid gap-6">
        <ListingImport lang={lang} listings={listings} onImport={(listing) => setSalePrice(String(listing.price))} usesArea={false} />
        <label className="grid gap-1 text-sm">
          <span>{L.salePrice}</span>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
            <input
              inputMode="decimal"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value.replace(/[^0-9.]/g, ''))}
              className="w-full rounded-sm border border-black/20 bg-white py-2 pl-7 pr-3"
            />
          </div>
          <span className="text-xs text-ink/50">{copy.rateSetNote}</span>
        </label>

        <div className="grid gap-1 text-sm">
          <span>{L.downPayment}</span>
          <div className="flex gap-2">
            <div className="relative flex-1">
              {downMode === 'dollar' && (
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
              )}
              <input
                inputMode="decimal"
                value={downStr}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9.]/g, '');
                  setDownStr(raw);
                  const v = num(raw);
                  if (downMode === 'percent') setDownPercent(v);
                  else setDownPercent(num(salePrice) > 0 ? (v / num(salePrice)) * 100 : 0);
                }}
                className={`w-full rounded-sm border border-black/20 bg-white py-2 pr-3 ${downMode === 'dollar' ? 'pl-7' : 'pl-3'}`}
              />
              {downMode === 'percent' && (
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink/50">%</span>
              )}
            </div>
            <div className="flex overflow-hidden rounded-sm border border-black/20 text-xs font-medium">
              <button
                type="button"
                onClick={() => {
                  setDownMode('percent');
                  setDownStr(String(round1(downPercent)));
                }}
                className={`px-3 ${downMode === 'percent' ? 'bg-petrol text-cream' : 'bg-white text-ink/60 hover:bg-black/5'}`}
              >
                %
              </button>
              <button
                type="button"
                onClick={() => {
                  setDownMode('dollar');
                  setDownStr(String(downDollar));
                }}
                className={`px-3 ${downMode === 'dollar' ? 'bg-petrol text-cream' : 'bg-white text-ink/60 hover:bg-black/5'}`}
              >
                $
              </button>
            </div>
          </div>
          <span className="text-xs text-ink/50">{usd.format(downDollar)} · {round1(downPercent)}%</span>
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={amendArea}
            onChange={(e) => setAmendArea(e.target.checked)}
            className="mt-1"
          />
          <span>
            <span className="block">{L.amendArea}</span>
            {amendArea && <span className="mt-1 block text-sm font-medium text-ink">{usd.format(areaAmendment)}</span>}
            <span className="mt-1 block text-xs text-ink/50">{copy.amendAreaNote}</span>
          </span>
        </label>
      </div>

      {/* Results */}
      <div id="calc-results" className="scroll-mt-24 lg:sticky lg:top-24">
        <div className="rounded-sm border border-ink/10 bg-cream p-6 shadow-sm md:p-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-petrol">{R.title}</p>
          <p className="mt-3 font-display text-4xl md:text-5xl">{usd.format(totalPremiums)}</p>

          <div className="mt-6 grid grid-cols-2 gap-4 text-sm text-ink/70">
            <div>
              <div className="text-xs uppercase tracking-wide text-ink/45">{R.loanAmount}</div>
              <div className="mt-1 font-medium text-ink">{usd.format(loanAmount)}</div>
            </div>
          </div>

          <div className="mt-6 divide-y divide-ink/10 text-sm">
            <Row label={R.ownerPolicy} value={usd.format(ownerPremium)} />
            {loanAmount > 0 ? (
              <div>
                <Row label={R.loanPolicy} value={usd.format(loanPremium)} />
                {savingsNote && <p className="-mt-1 pb-2.5 text-xs text-ink/50">{savingsNote}</p>}
              </div>
            ) : (
              <p className="py-2.5 text-xs text-ink/50">{R.cashNote}</p>
            )}
            {amendArea && <Row label={R.areaAmendment} value={usd.format(areaAmendment)} />}
          </div>

          <div className="mt-6 grid gap-2 border-t border-ink/10 pt-4 text-sm text-ink/70">
            <div className="flex items-center justify-between">
              <span className="font-medium text-ink">{R.total}</span>
              <span className="font-display text-xl text-petrol">{usd.format(totalPremiums)}</span>
            </div>
          </div>

          <ShareLink lang={lang} href={shareHref} className="mt-6" />

          <p className="mt-6 text-xs text-ink/50">{copy.disclaimer}</p>

          <div className="mt-6 border-t border-ink/10 pt-6">
            {!showLead && !leadSent && (
              <button
                type="button"
                onClick={() => setShowLead(true)}
                className="w-full rounded-sm bg-gold px-5 py-3 text-sm font-medium text-ink hover:bg-[#c9a96b]"
              >
                {copy.lead.cta}
              </button>
            )}

            {showLead && !leadSent && (
              <form onSubmit={onLeadSubmit} className="grid gap-3">
                <label className="grid gap-1 text-sm">
                  <span>{copy.lead.name}</span>
                  <input required name="name" className="rounded-sm border border-black/20 bg-white px-3 py-2" />
                </label>
                <label className="grid gap-1 text-sm">
                  <span>{copy.lead.phone}</span>
                  <input required name="phone" type="tel" className="rounded-sm border border-black/20 bg-white px-3 py-2" />
                </label>
                <input type="checkbox" name="botcheck" className="hidden" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
                <p className="text-xs text-ink/50">{copy.lead.consent}</p>
                <button
                  disabled={leadBusy}
                  className="justify-self-start rounded-sm bg-petrol px-5 py-2.5 text-sm font-medium text-cream hover:bg-[#243b49] disabled:opacity-60"
                >
                  {leadBusy ? copy.lead.sending : copy.lead.submit}
                </button>
                {leadFailed && <p className="text-sm text-red-700">{copy.lead.error}</p>}
              </form>
            )}

            {leadSent && (
              <div className="rounded-sm border border-forest/30 bg-paper p-4 text-sm text-forest">
                {copy.lead.success}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-ink/70">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}
