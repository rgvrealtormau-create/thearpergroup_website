'use client';

import { useEffect, useMemo, useState } from 'react';
import { cities, citySlugs } from '../lib/content';
import { WEB3FORMS_ACCESS_KEY } from '../lib/site';
import { AREA_TAX_RATES, taxRateFor, defaultClosingDate, sellerNetProceeds } from '../lib/calc';
import { readHandoff, handoffHref, shareParams, applyShared, scrollToResults } from '../lib/calcHandoff';
import ShareLink from './ShareLink';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function round1(n) {
  return Math.round(n * 10) / 10;
}

function num(v) {
  return parseFloat(v) || 0;
}

export default function SellerNetProceeds({ lang, copy }) {
  const L = copy.labels;
  const R = copy.results;

  const [salePrice, setSalePrice] = useState('300000');
  const [loanPayoff, setLoanPayoff] = useState('0');
  const [commissionPercent, setCommissionPercent] = useState('6');
  const [city, setCity] = useState('mcallen');
  const [closingDate, setClosingDate] = useState('');
  const [buyerPaysTitle, setBuyerPaysTitle] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [annualTax, setAnnualTax] = useState(() => String(Math.round(300000 * taxRateFor('mcallen'))));
  const [taxTouched, setTaxTouched] = useState(false);
  const [hoaFee, setHoaFee] = useState('0');
  const [homeWarranty, setHomeWarranty] = useState('0');
  const [closingFees, setClosingFees] = useState('350');
  const [sellerConcessions, setSellerConcessions] = useState('0');

  // Closing date defaults to ~45 days out, set client-side only to avoid a
  // build-time vs. render-time date mismatch.
  useEffect(() => {
    if (!closingDate) setClosingDate(defaultClosingDate());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!taxTouched) setAnnualTax(String(Math.round(num(salePrice) * taxRateFor(city))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salePrice, city]);

  // Everything a "share a link to these numbers" link carries (lib/calcHandoff.js).
  const shareFields = {
    price: { value: salePrice, set: setSalePrice, def: '300000' },
    payoff: { value: loanPayoff, set: setLoanPayoff, def: '0' },
    comm: { value: commissionPercent, set: setCommissionPercent, def: '6' },
    city: { value: city, set: setCity, def: 'mcallen', oneOf: Object.keys(AREA_TAX_RATES) },
    close: { value: closingDate, set: setClosingDate, def: defaultClosingDate(), type: 'date' },
    btitle: { value: buyerPaysTitle, set: setBuyerPaysTitle, type: 'bool' },
    tax: { value: taxTouched ? annualTax : '', set: (v) => { setAnnualTax(v); setTaxTouched(true); } },
    hoaFee: { value: hoaFee, set: setHoaFee, def: '0' },
    warranty: { value: homeWarranty, set: setHomeWarranty, def: '0' },
    fees: { value: closingFees, set: setClosingFees, def: '350' },
    conc: { value: sellerConcessions, set: setSellerConcessions, def: '0' },
  };
  const shareHref = handoffHref(lang, 'resources/seller-net-proceeds', shareParams(shareFields));

  // Arriving on a shared link: fill in whatever it carried. Declared after the estimates
  // above on purpose — effects run in order, and a carried figure must win.
  useEffect(() => {
    const h = readHandoff();
    if (!Object.keys(h).length) return;
    applyShared(h, shareFields);
    scrollToResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cityName = city === 'other' ? L.otherCity : cities[city]?.[lang]?.name ?? city;
  const { titlePremium, titleCost, taxCredit, commissionCost, net: netProceeds } = useMemo(
    () => sellerNetProceeds({
      salePrice: num(salePrice), loanPayoff: num(loanPayoff), commissionPercent: num(commissionPercent), buyerPaysTitle,
      annualTax: num(annualTax), closingDate, hoaFee: num(hoaFee), homeWarranty: num(homeWarranty),
      closingFees: num(closingFees), sellerConcessions: num(sellerConcessions),
    }),
    [salePrice, loanPayoff, commissionPercent, buyerPaysTitle, annualTax, closingDate, hoaFee, homeWarranty, closingFees, sellerConcessions]
  );
  const isShort = netProceeds < 0;
  const resultLabel = isShort ? R.cashNeeded : R.net;
  const resultValue = usd.format(Math.abs(netProceeds));

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
      `Sale price: ${usd.format(num(salePrice))}`,
      `Loan payoff: ${usd.format(num(loanPayoff))}`,
      `Commission: ${usd.format(commissionCost)} (${round1(num(commissionPercent))}%)`,
      `City: ${cityName}`,
      `Closing date: ${closingDate}`,
      `Owner's title policy: ${buyerPaysTitle ? 'buyer-paid' : usd.format(titlePremium)}`,
      `Property tax credit to buyer: ${usd.format(taxCredit)}`,
      `HOA fee: ${usd.format(num(hoaFee))}, Home warranty: ${usd.format(num(homeWarranty))}, Closing/recording fees: ${usd.format(num(closingFees))}`,
      `Seller concessions: ${usd.format(num(sellerConcessions))}`,
      `${isShort ? 'Estimated cash needed to close' : 'Estimated net proceeds'}: ${resultValue}`,
    ].join('\n');
    if (!data.get('botcheck')) {
      fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formType: 'seller_net_proceeds_calculator',
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
          subject: 'Seller net proceeds calculator lead',
          from_name: 'The Arper Group website',
          page: 'Seller net proceeds calculator',
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
        </label>

        <label className="grid gap-1 text-sm">
          <span>{L.loanPayoff}</span>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
            <input
              inputMode="decimal"
              value={loanPayoff}
              onChange={(e) => setLoanPayoff(e.target.value.replace(/[^0-9.]/g, ''))}
              className="w-full rounded-sm border border-black/20 bg-white py-2 pl-7 pr-3"
            />
          </div>
        </label>

        <label className="grid gap-1 text-sm">
          <span>{L.commission}</span>
          <div className="relative max-w-[10rem]">
            <input
              inputMode="decimal"
              value={commissionPercent}
              onChange={(e) => setCommissionPercent(e.target.value.replace(/[^0-9.]/g, ''))}
              className="w-full rounded-sm border border-black/20 bg-white py-2 pl-3 pr-7"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink/50">%</span>
          </div>
          <span className="text-xs text-ink/50">{copy.commissionNote}</span>
        </label>

        <label className="grid gap-1 text-sm">
          <span>{L.city}</span>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-sm border border-black/20 bg-white px-3 py-2"
          >
            {citySlugs.map((slug) => (
              <option key={slug} value={slug}>{cities[slug][lang].name}</option>
            ))}
            <option value="other">{L.otherCity}</option>
          </select>
        </label>

        <label className="grid gap-1 text-sm">
          <span>{L.closingDate}</span>
          <input
            type="date"
            value={closingDate}
            onChange={(e) => setClosingDate(e.target.value)}
            className="w-full max-w-[14rem] rounded-sm border border-black/20 bg-white px-3 py-2"
          />
        </label>

        <div className="grid gap-2 rounded-sm border border-ink/10 bg-cream/40 p-4 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span>{L.titleInsurance}</span>
            <span className="font-medium text-ink">{buyerPaysTitle ? usd.format(0) : usd.format(titlePremium)}</span>
          </div>
          <span className="text-xs text-ink/50">{copy.titleNote.replace('{price}', usd.format(num(salePrice)))}</span>
          <label className="mt-1 flex items-center gap-2 text-xs text-ink/70">
            <input
              type="checkbox"
              checked={buyerPaysTitle}
              onChange={(e) => setBuyerPaysTitle(e.target.checked)}
              className="h-4 w-4"
            />
            {L.buyerPaysTitle}
          </label>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-sm font-medium text-petrol link-underline"
          >
            {showAdvanced ? L.advancedHide : L.advancedShow}
          </button>

          {showAdvanced && (
            <div className="mt-4 grid gap-4 border-t border-ink/10 pt-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span>{L.annualTax}</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
                  <input
                    inputMode="decimal"
                    value={annualTax}
                    onChange={(e) => {
                      setAnnualTax(e.target.value.replace(/[^0-9.]/g, ''));
                      setTaxTouched(true);
                    }}
                    className="w-full rounded-sm border border-black/20 bg-white py-2 pl-7 pr-3"
                  />
                </div>
                {!taxTouched && (
                  <span className="text-xs text-ink/50">{copy.taxNote.replace('{city}', cityName)}</span>
                )}
              </label>

              <label className="grid gap-1 text-sm">
                <span>{L.hoaFee}</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
                  <input
                    inputMode="decimal"
                    value={hoaFee}
                    onChange={(e) => setHoaFee(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="w-full rounded-sm border border-black/20 bg-white py-2 pl-7 pr-3"
                  />
                </div>
              </label>

              <label className="grid gap-1 text-sm">
                <span>{L.homeWarranty}</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
                  <input
                    inputMode="decimal"
                    value={homeWarranty}
                    onChange={(e) => setHomeWarranty(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="w-full rounded-sm border border-black/20 bg-white py-2 pl-7 pr-3"
                  />
                </div>
                <span className="text-xs text-ink/50">{copy.warrantyNote}</span>
              </label>

              <label className="grid gap-1 text-sm">
                <span>{L.closingFees}</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
                  <input
                    inputMode="decimal"
                    value={closingFees}
                    onChange={(e) => setClosingFees(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="w-full rounded-sm border border-black/20 bg-white py-2 pl-7 pr-3"
                  />
                </div>
                <span className="text-xs text-ink/50">{copy.closingFeesNote}</span>
              </label>

              <label className="grid gap-1 text-sm">
                <span>{L.sellerConcessions}</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
                  <input
                    inputMode="decimal"
                    value={sellerConcessions}
                    onChange={(e) => setSellerConcessions(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="w-full rounded-sm border border-black/20 bg-white py-2 pl-7 pr-3"
                  />
                </div>
                <span className="text-xs text-ink/50">{copy.concessionsNote}</span>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div id="calc-results" className="scroll-mt-24 lg:sticky lg:top-24">
        <div className="rounded-sm border border-ink/10 bg-cream p-6 shadow-sm md:p-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-petrol">{resultLabel}</p>
          <p className="mt-3 font-display text-4xl md:text-5xl">{resultValue}</p>
          {isShort && <p className="mt-2 text-sm text-red-700">{copy.costsExceedNote}</p>}

          <div className="mt-6 divide-y divide-ink/10 text-sm">
            <Row label={R.salePrice} value={usd.format(num(salePrice))} />
            {num(loanPayoff) > 0 && <Row label={`– ${R.loanPayoff}`} value={usd.format(num(loanPayoff))} />}
            {commissionCost > 0 && <Row label={`– ${R.commission}`} value={usd.format(commissionCost)} />}
            {titleCost > 0 && <Row label={`– ${R.titleInsurance}`} value={usd.format(titleCost)} />}
            {taxCredit > 0 && <Row label={`– ${R.taxCredit}`} value={usd.format(taxCredit)} />}
            {num(hoaFee) > 0 && <Row label={`– ${R.hoaFee}`} value={usd.format(num(hoaFee))} />}
            {num(homeWarranty) > 0 && <Row label={`– ${R.homeWarranty}`} value={usd.format(num(homeWarranty))} />}
            {num(closingFees) > 0 && <Row label={`– ${R.closingFees}`} value={usd.format(num(closingFees))} />}
            {num(sellerConcessions) > 0 && <Row label={`– ${R.sellerConcessions}`} value={usd.format(num(sellerConcessions))} />}
          </div>

          <div className="mt-6 border-t border-ink/10 pt-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium text-ink">{resultLabel}</span>
              <span className="font-display text-xl text-petrol">{resultValue}</span>
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
