'use client';

import { useEffect, useMemo, useState } from 'react';
import { cities, citySlugs } from '../lib/content';
import { WEB3FORMS_ACCESS_KEY } from '../lib/site';
import { readHandoff, handoffHref, handoffNumber, shareParams, applyShared, scrollToResults } from '../lib/calcHandoff';
import ListingImport from './ListingImport';
import ShareLink from './ShareLink';

// Typical combined property-tax rate by area (annual, as a fraction of price).
// Kept in sync with the same constants in MortgageCalculator.jsx / SellerNetProceeds.jsx.
const AREA_TAX_RATES = {
  mcallen: 0.023, edinburg: 0.023, mission: 0.023, pharr: 0.023, weslaco: 0.023, mercedes: 0.023,
  harlingen: 0.02, 'san-benito': 0.02, brownsville: 0.02, 'south-padre-island': 0.02,
  other: 0.022,
};

function taxRateFor(city) {
  return AREA_TAX_RATES[city] ?? AREA_TAX_RATES.other;
}

// A default first-year homeowners insurance estimate, matching the
// default already used in MortgageCalculator.jsx for consistency.
const DEFAULT_ANNUAL_INSURANCE = 1800;

// Starting values for the fee fields. Links to this calculator only carry the ones that
// were changed, which keeps them short. Keys are the link's parameter names.
const FEE_DEFAULTS = { orig: '1', appr: '550', lfee: '600', rec: '75', esc: '3', hoaFee: '0', survey: '0', conc: '0' };

// Texas' promulgated simultaneous-issue rate for a buyer's loan policy
// issued alongside a seller-paid owner's policy (Rate Rule R-5): a flat
// $100 whenever the loan amount does not exceed the owner's policy amount
// — true for virtually every purchase-money loan, since the loan can't
// exceed the sale price. tdi.texas.gov/title/titlem3b.html
const SIMULTANEOUS_LOAN_POLICY_RATE = 100;

// Texas' promulgated (state-set) basic premium rate for an owner's title
// policy, effective March 1, 2026 (tdi.texas.gov/title/titlerates2026.html).
// Only relevant here if the buyer is also covering the seller's customary
// owner's policy — kept in sync with the same formula in SellerNetProceeds.jsx.
function ownerTitlePremium(amount) {
  if (amount <= 0) return 0;
  if (amount <= 25000) return 308;
  if (amount <= 100000) return Math.round(308 + (amount - 25000) * ((780 - 308) / 75000));
  if (amount <= 1000000) return Math.round(780 + (amount - 100000) * 0.00494);
  if (amount <= 5000000) return Math.round(5226 + (amount - 1000000) * 0.00406);
  return Math.round(21466 + (amount - 5000000) * 0.00335);
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const usd2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

function round1(n) {
  return Math.round(n * 10) / 10;
}

function num(v) {
  return parseFloat(v) || 0;
}

function defaultClosingDate() {
  const d = new Date();
  d.setDate(d.getDate() + 45);
  return d.toISOString().slice(0, 10);
}

// Per-diem interest from the closing date through the end of that month —
// what most Texas lenders collect at closing before the first regular payment.
function prepaidInterest(loanAmount, ratePercent, closingDateStr) {
  if (!closingDateStr || loanAmount <= 0 || ratePercent <= 0) return 0;
  const closing = new Date(`${closingDateStr}T00:00:00`);
  if (isNaN(closing.getTime())) return 0;
  const year = closing.getFullYear();
  const month = closing.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayOfMonth = closing.getDate();
  const daysRemaining = Math.max(daysInMonth - dayOfMonth + 1, 0);
  const dailyRate = ratePercent / 100 / 365;
  return Math.round(loanAmount * dailyRate * daysRemaining);
}

export default function ClosingCostEstimator({ lang, copy, rates, listings = [] }) {
  const L = copy.labels;
  const R = copy.results;

  const [salePrice, setSalePrice] = useState('300000');
  const [downPercent, setDownPercent] = useState(20);
  const [downStr, setDownStr] = useState('20');
  const [downMode, setDownMode] = useState('percent');
  const [rate, setRate] = useState(String(rates.rate30));
  const [rateTouched, setRateTouched] = useState(false);
  const [city, setCity] = useState('mcallen');
  const [closingDate, setClosingDate] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [originationPercent, setOriginationPercent] = useState(FEE_DEFAULTS.orig);
  const [appraisalFee, setAppraisalFee] = useState(FEE_DEFAULTS.appr);
  const [lenderFees, setLenderFees] = useState(FEE_DEFAULTS.lfee);
  const [recordingFees, setRecordingFees] = useState(FEE_DEFAULTS.rec);
  const [homeInsurance, setHomeInsurance] = useState(String(DEFAULT_ANNUAL_INSURANCE));
  const [escrowMonths, setEscrowMonths] = useState(FEE_DEFAULTS.esc);
  const [annualTax, setAnnualTax] = useState(() => String(Math.round(300000 * taxRateFor('mcallen'))));
  const [taxTouched, setTaxTouched] = useState(false);
  const [hoaFee, setHoaFee] = useState(FEE_DEFAULTS.hoaFee);
  const [surveyFee, setSurveyFee] = useState(FEE_DEFAULTS.survey);
  const [concessions, setConcessions] = useState(FEE_DEFAULTS.conc);
  const [buyerPaysOwnerPolicy, setBuyerPaysOwnerPolicy] = useState(false);
  // Whatever the link we arrived on carried, kept so the mortgage calculator's own fields go back to it.
  const [carried, setCarried] = useState({});

  // Annual property tax defaults to price x the area rate until it's edited by hand
  // (e.g. the actual bill for a specific property). Clearing the override re-estimates.
  useEffect(() => {
    if (!taxTouched) setAnnualTax(String(Math.round(num(salePrice) * taxRateFor(city))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salePrice, city, taxTouched]);

  // Everything a link to this calculator carries (lib/calcHandoff.js). The first six keys are
  // shared with the mortgage calculator; the rest are this calculator's own.
  const shareFields = {
    price: { value: salePrice, set: setSalePrice },
    dp: {
      value: Number(downPercent.toFixed(6)),
      set: (v) => {
        setDownPercent(num(v));
        setDownStr(String(round1(num(v))));
        setDownMode('percent');
      },
    },
    rate: { value: rateTouched ? rate : '', set: (v) => { setRate(v); setRateTouched(true); } },
    city: { value: city, set: setCity, oneOf: Object.keys(AREA_TAX_RATES) },
    tax: { value: taxTouched ? annualTax : '', set: (v) => { setAnnualTax(v); setTaxTouched(true); } },
    ins: { value: homeInsurance, set: setHomeInsurance },
    close: { value: closingDate, set: setClosingDate, def: defaultClosingDate(), type: 'date' },
    orig: { value: originationPercent, set: setOriginationPercent, def: FEE_DEFAULTS.orig },
    appr: { value: appraisalFee, set: setAppraisalFee, def: FEE_DEFAULTS.appr },
    lfee: { value: lenderFees, set: setLenderFees, def: FEE_DEFAULTS.lfee },
    rec: { value: recordingFees, set: setRecordingFees, def: FEE_DEFAULTS.rec },
    esc: { value: escrowMonths, set: setEscrowMonths, def: FEE_DEFAULTS.esc },
    hoaFee: { value: hoaFee, set: setHoaFee, def: FEE_DEFAULTS.hoaFee },
    survey: { value: surveyFee, set: setSurveyFee, def: FEE_DEFAULTS.survey },
    conc: { value: concessions, set: setConcessions, def: FEE_DEFAULTS.conc },
    own: { value: buyerPaysOwnerPolicy, set: setBuyerPaysOwnerPolicy, type: 'bool' },
  };

  // On load: the default closing date, then whatever a shared link (or the mortgage
  // calculator's "see cash to close for these numbers") carried. Declared after the tax
  // estimate above on purpose — effects run in order, and a carried tax bill must win.
  useEffect(() => {
    const h = readHandoff();
    setClosingDate(defaultClosingDate());
    if (!Object.keys(h).length) return;
    setCarried(h);
    applyShared(h, shareFields);
    // No hand-typed rate, but a 15- or 20-year term from the mortgage calculator: use
    // today's average for that term, the same figure the mortgage calculator shows.
    if (!handoffNumber(h, 'rate') && h.term === '15') setRate(String(rates.rate15));
    if (!handoffNumber(h, 'rate') && h.term === '20') setRate(String(Math.round(((rates.rate30 + rates.rate15) / 2) * 100) / 100));
    scrollToResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "Import from an Arper Group listing": the listing's price and area; taxes follow from both.
  function applyListing(listing) {
    setSalePrice(String(listing.price));
    setTaxTouched(false);
    if (listing.citySlug) setCity(listing.citySlug);
  }

  const downDollar = useMemo(() => Math.round((num(salePrice) * downPercent) / 100), [salePrice, downPercent]);
  const loanAmount = Math.max(num(salePrice) - downDollar, 0);
  const cityName = city === 'other' ? L.otherCity : cities[city]?.[lang]?.name ?? city;

  const originationCost = Math.round((loanAmount * num(originationPercent)) / 100);
  const interestCost = useMemo(
    () => prepaidInterest(loanAmount, num(rate), closingDate),
    [loanAmount, rate, closingDate]
  );
  const escrowReserve = Math.round(((num(annualTax) + num(homeInsurance)) / 12) * num(escrowMonths));
  const ownerPolicyPremium = useMemo(() => ownerTitlePremium(num(salePrice)), [salePrice]);

  const closingCostsSubtotal =
    originationCost + num(appraisalFee) + num(lenderFees) + SIMULTANEOUS_LOAN_POLICY_RATE + num(recordingFees) +
    num(homeInsurance) + interestCost + escrowReserve + num(hoaFee) + num(surveyFee) +
    (buyerPaysOwnerPolicy ? ownerPolicyPremium : 0);
  const netClosingCosts = closingCostsSubtotal - num(concessions);
  const isCredit = netClosingCosts < 0;
  const closingCostsLabel = isCredit ? R.creditBack : R.closingCostsSubtotal;
  const closingCostsValue = usd.format(Math.abs(netClosingCosts));
  const totalCashToClose = downDollar + netClosingCosts;

  const rateNoteText = rates.live && !rateTouched && num(rate) === rates.rate30 ? copy.rateNote.replace('{date}', formatDate(rates.asOfDate, lang)) : null;
  const taxNoteText = !taxTouched ? copy.taxNote.replace('{city}', cityName) : null;

  // One set of parameters, two links: this calculator (to share) and the mortgage
  // calculator ("see monthly payment for these numbers").
  const linkParams = { ...carried, ...shareParams(shareFields) };
  const shareHref = handoffHref(lang, 'resources/closing-cost-estimator', linkParams);
  const mortgageHref = handoffHref(lang, 'resources/mortgage-calculator', linkParams);

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
      `Purchase price: ${usd.format(num(salePrice))}`,
      `Down payment: ${usd.format(downDollar)} (${round1(downPercent)}%)`,
      `Loan amount: ${usd.format(loanAmount)} at ${num(rate)}%`,
      `City: ${cityName}`,
      `Closing date: ${closingDate}`,
      `Origination: ${usd.format(originationCost)}, Appraisal: ${usd.format(num(appraisalFee))}, Other lender fees: ${usd.format(num(lenderFees))}`,
      `Loan title policy: ${usd.format(SIMULTANEOUS_LOAN_POLICY_RATE)}, Recording: ${usd.format(num(recordingFees))}`,
      ...(buyerPaysOwnerPolicy ? [`Owner's title policy (buyer-paid): ${usd.format(ownerPolicyPremium)}`] : []),
      `Property tax (annual): ${usd.format(num(annualTax))} (${taxTouched ? 'entered by visitor' : 'area estimate'})`,
      `Homeowners insurance: ${usd.format(num(homeInsurance))}, Prepaid interest: ${usd2.format(interestCost)}, Escrow reserve: ${usd.format(escrowReserve)}`,
      `HOA fee: ${usd.format(num(hoaFee))}, Survey: ${usd.format(num(surveyFee))}`,
      ...(num(concessions) > 0 ? [`Seller concessions: ${usd.format(num(concessions))}`] : []),
      `${isCredit ? 'Seller credit exceeds closing costs' : 'Estimated closing costs subtotal'}: ${closingCostsValue}`,
      `Estimated total cash to close: ${usd.format(totalCashToClose)}`,
    ].join('\n');
    if (!data.get('botcheck')) {
      fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formType: 'closing_cost_estimator',
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
          subject: 'Closing cost estimator lead',
          from_name: 'The Arper Group website',
          page: 'Closing cost estimator',
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
        <ListingImport lang={lang} listings={listings} onImport={applyListing} />
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

        <label className="grid gap-1 text-sm">
          <span>{L.interestRate}</span>
          <div className="relative max-w-[10rem]">
            <input
              inputMode="decimal"
              value={rate}
              onChange={(e) => {
                setRate(e.target.value.replace(/[^0-9.]/g, ''));
                setRateTouched(true);
              }}
              className="w-full rounded-sm border border-black/20 bg-white py-2 pl-3 pr-7"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink/50">%</span>
          </div>
          {rateNoteText && <span className="text-xs text-ink/50">{rateNoteText}</span>}
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
                <span>{L.originationPercent}</span>
                <div className="relative max-w-[10rem]">
                  <input
                    inputMode="decimal"
                    value={originationPercent}
                    onChange={(e) => setOriginationPercent(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="w-full rounded-sm border border-black/20 bg-white py-2 pl-3 pr-7"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink/50">%</span>
                </div>
                <span className="text-xs text-ink/50">{copy.originationNote}</span>
              </label>

              <label className="grid gap-1 text-sm">
                <span>{L.appraisalFee}</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
                  <input
                    inputMode="decimal"
                    value={appraisalFee}
                    onChange={(e) => setAppraisalFee(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="w-full rounded-sm border border-black/20 bg-white py-2 pl-7 pr-3"
                  />
                </div>
              </label>

              <label className="grid gap-1 text-sm">
                <span>{L.lenderFees}</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
                  <input
                    inputMode="decimal"
                    value={lenderFees}
                    onChange={(e) => setLenderFees(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="w-full rounded-sm border border-black/20 bg-white py-2 pl-7 pr-3"
                  />
                </div>
              </label>

              <label className="grid gap-1 text-sm">
                <span>{L.recordingFees}</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
                  <input
                    inputMode="decimal"
                    value={recordingFees}
                    onChange={(e) => setRecordingFees(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="w-full rounded-sm border border-black/20 bg-white py-2 pl-7 pr-3"
                  />
                </div>
              </label>

              <label className="grid gap-1 text-sm">
                <span>{L.homeInsurance}</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
                  <input
                    inputMode="decimal"
                    value={homeInsurance}
                    onChange={(e) => setHomeInsurance(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="w-full rounded-sm border border-black/20 bg-white py-2 pl-7 pr-3"
                  />
                </div>
              </label>

              <div className="grid gap-1 text-sm">
                <label htmlFor="cce-annual-tax">{L.propertyTax}</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
                  <input
                    id="cce-annual-tax"
                    inputMode="decimal"
                    value={annualTax}
                    onChange={(e) => {
                      setAnnualTax(e.target.value.replace(/[^0-9.]/g, ''));
                      setTaxTouched(true);
                    }}
                    className="w-full rounded-sm border border-black/20 bg-white py-2 pl-7 pr-3"
                  />
                </div>
                {taxNoteText ? (
                  <span className="text-xs text-ink/50">{taxNoteText}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setTaxTouched(false)}
                    className="justify-self-start text-xs font-medium text-petrol link-underline"
                  >
                    {L.taxReset}
                  </button>
                )}
              </div>

              <label className="grid gap-1 text-sm">
                <span>{L.escrowMonths}</span>
                <input
                  inputMode="decimal"
                  value={escrowMonths}
                  onChange={(e) => setEscrowMonths(e.target.value.replace(/[^0-9.]/g, ''))}
                  className="w-full max-w-[8rem] rounded-sm border border-black/20 bg-white py-2 px-3"
                />
                <span className="text-xs text-ink/50">{copy.escrowNote}</span>
              </label>

              <label className="grid gap-1 text-sm sm:col-span-2">
                <span>{L.titlePolicy}</span>
                <span className="text-sm font-medium text-ink">{usd.format(SIMULTANEOUS_LOAN_POLICY_RATE)}</span>
                <span className="text-xs text-ink/50">{copy.titlePolicyNote}</span>
              </label>

              <label className="flex items-start gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={buyerPaysOwnerPolicy}
                  onChange={(e) => setBuyerPaysOwnerPolicy(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  <span className="block">{L.buyerPaysOwnerPolicy}</span>
                  {buyerPaysOwnerPolicy && (
                    <span className="mt-1 block text-sm font-medium text-ink">{usd.format(ownerPolicyPremium)}</span>
                  )}
                  <span className="mt-1 block text-xs text-ink/50">{copy.ownerPolicyNote}</span>
                </span>
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
                <span>{L.surveyFee}</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
                  <input
                    inputMode="decimal"
                    value={surveyFee}
                    onChange={(e) => setSurveyFee(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="w-full rounded-sm border border-black/20 bg-white py-2 pl-7 pr-3"
                  />
                </div>
                <span className="text-xs text-ink/50">{copy.surveyNote}</span>
              </label>

              <label className="grid gap-1 text-sm sm:col-span-2">
                <span>{L.concessions}</span>
                <div className="relative max-w-[14rem]">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
                  <input
                    inputMode="decimal"
                    value={concessions}
                    onChange={(e) => setConcessions(e.target.value.replace(/[^0-9.]/g, ''))}
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
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-petrol">{R.title}</p>
          <p className="mt-3 font-display text-4xl md:text-5xl">{usd.format(totalCashToClose)}</p>

          <div className="mt-6 divide-y divide-ink/10 text-sm">
            <Row label={R.downPayment} value={usd.format(downDollar)} />
            {originationCost > 0 && <Row label={R.origination} value={usd.format(originationCost)} />}
            {num(appraisalFee) > 0 && <Row label={R.appraisal} value={usd.format(num(appraisalFee))} />}
            {num(lenderFees) > 0 && <Row label={R.lenderFees} value={usd.format(num(lenderFees))} />}
            <Row label={R.titlePolicy} value={usd.format(SIMULTANEOUS_LOAN_POLICY_RATE)} />
            {buyerPaysOwnerPolicy && <Row label={R.ownerPolicyPremium} value={usd.format(ownerPolicyPremium)} />}
            {num(recordingFees) > 0 && <Row label={R.recordingFees} value={usd.format(num(recordingFees))} />}
            {num(homeInsurance) > 0 && <Row label={R.homeInsurance} value={usd.format(num(homeInsurance))} />}
            {interestCost > 0 && <Row label={R.prepaidInterest} value={usd2.format(interestCost)} />}
            {escrowReserve > 0 && <Row label={R.escrowReserve} value={usd.format(escrowReserve)} />}
            {num(hoaFee) > 0 && <Row label={R.hoaFee} value={usd.format(num(hoaFee))} />}
            {num(surveyFee) > 0 && <Row label={R.surveyFee} value={usd.format(num(surveyFee))} />}
            {num(concessions) > 0 && <Row label={`– ${R.concessions}`} value={usd.format(num(concessions))} />}
          </div>

          <div className="mt-6 grid gap-2 border-t border-ink/10 pt-4 text-sm text-ink/70">
            <div className="flex items-center justify-between">
              <span>{closingCostsLabel}</span>
              <span className="font-medium text-ink">{closingCostsValue}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-ink">{R.total}</span>
              <span className="font-display text-xl text-petrol">{usd.format(totalCashToClose)}</span>
            </div>
          </div>

          <a href={mortgageHref} className="mt-6 inline-block text-sm font-medium text-petrol link-underline">
            {copy.handoff}
          </a>
          <ShareLink lang={lang} href={shareHref} className="mt-3" />

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

function formatDate(isoDate, lang) {
  if (!isoDate) return '';
  const d = new Date(`${isoDate}T00:00:00`);
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-MX' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(d);
}
