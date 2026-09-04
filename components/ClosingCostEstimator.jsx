'use client';

import { useEffect, useMemo, useState } from 'react';
import { cities, citySlugs } from '../lib/content';
import { WEB3FORMS_ACCESS_KEY } from '../lib/site';

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

// Texas' promulgated simultaneous-issue rate for a buyer's loan policy
// issued alongside a seller-paid owner's policy (Rate Rule R-5): a flat
// $100 whenever the loan amount does not exceed the owner's policy amount
// — true for virtually every purchase-money loan, since the loan can't
// exceed the sale price. tdi.texas.gov/title/titlem3b.html
const SIMULTANEOUS_LOAN_POLICY_RATE = 100;

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const usd2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

function round1(n) {
  return Math.round(n * 10) / 10;
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

export default function ClosingCostEstimator({ lang, copy, rates }) {
  const L = copy.labels;
  const R = copy.results;

  const [salePrice, setSalePrice] = useState(300000);
  const [downPercent, setDownPercent] = useState(20);
  const [downMode, setDownMode] = useState('percent');
  const [rate, setRate] = useState(rates.rate30);
  const [rateTouched, setRateTouched] = useState(false);
  const [city, setCity] = useState('mcallen');
  const [closingDate, setClosingDate] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [originationPercent, setOriginationPercent] = useState(1);
  const [appraisalFee, setAppraisalFee] = useState(550);
  const [lenderFees, setLenderFees] = useState(600);
  const [recordingFees, setRecordingFees] = useState(75);
  const [homeInsurance, setHomeInsurance] = useState(DEFAULT_ANNUAL_INSURANCE);
  const [escrowMonths, setEscrowMonths] = useState(3);
  const [annualTax, setAnnualTax] = useState(() => Math.round(300000 * taxRateFor('mcallen')));
  const [taxTouched, setTaxTouched] = useState(false);
  const [hoaFee, setHoaFee] = useState(0);
  const [surveyFee, setSurveyFee] = useState(0);

  useEffect(() => {
    if (!closingDate) setClosingDate(defaultClosingDate());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!taxTouched) setAnnualTax(Math.round(salePrice * taxRateFor(city)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salePrice, city]);

  const downDollar = useMemo(() => Math.round((salePrice * downPercent) / 100), [salePrice, downPercent]);
  const loanAmount = Math.max(salePrice - downDollar, 0);
  const cityName = city === 'other' ? L.otherCity : cities[city]?.[lang]?.name ?? city;

  const originationCost = Math.round((loanAmount * originationPercent) / 100);
  const interestCost = useMemo(
    () => prepaidInterest(loanAmount, rate, closingDate),
    [loanAmount, rate, closingDate]
  );
  const escrowReserve = Math.round(((annualTax + homeInsurance) / 12) * escrowMonths);

  const closingCostsSubtotal =
    originationCost + appraisalFee + lenderFees + SIMULTANEOUS_LOAN_POLICY_RATE + recordingFees +
    homeInsurance + interestCost + escrowReserve + hoaFee + surveyFee;
  const totalCashToClose = downDollar + closingCostsSubtotal;

  const rateNoteText = rates.live && !rateTouched ? copy.rateNote.replace('{date}', formatDate(rates.asOfDate, lang)) : null;
  const taxNoteText = !taxTouched ? copy.taxNote.replace('{city}', cityName) : null;

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
      `Purchase price: ${usd.format(salePrice)}`,
      `Down payment: ${usd.format(downDollar)} (${round1(downPercent)}%)`,
      `Loan amount: ${usd.format(loanAmount)} at ${rate}%`,
      `City: ${cityName}`,
      `Closing date: ${closingDate}`,
      `Origination: ${usd.format(originationCost)}, Appraisal: ${usd.format(appraisalFee)}, Other lender fees: ${usd.format(lenderFees)}`,
      `Loan title policy: ${usd.format(SIMULTANEOUS_LOAN_POLICY_RATE)}, Recording: ${usd.format(recordingFees)}`,
      `Homeowners insurance: ${usd.format(homeInsurance)}, Prepaid interest: ${usd2.format(interestCost)}, Escrow reserve: ${usd.format(escrowReserve)}`,
      `HOA fee: ${usd.format(hoaFee)}, Survey: ${usd.format(surveyFee)}`,
      `Estimated closing costs subtotal: ${usd.format(closingCostsSubtotal)}`,
      `Estimated total cash to close: ${usd.format(totalCashToClose)}`,
    ].join('\n');
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
        <label className="grid gap-1 text-sm">
          <span>{L.salePrice}</span>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
            <input
              type="number"
              min="0"
              step="1000"
              value={salePrice}
              onChange={(e) => setSalePrice(Math.max(Number(e.target.value) || 0, 0))}
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
                type="number"
                min="0"
                step={downMode === 'percent' ? '1' : '1000'}
                value={downMode === 'percent' ? round1(downPercent) : downDollar}
                onChange={(e) => {
                  const v = Math.max(Number(e.target.value) || 0, 0);
                  if (downMode === 'percent') setDownPercent(v);
                  else setDownPercent(salePrice > 0 ? (v / salePrice) * 100 : 0);
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
                onClick={() => setDownMode('percent')}
                className={`px-3 ${downMode === 'percent' ? 'bg-petrol text-cream' : 'bg-white text-ink/60 hover:bg-black/5'}`}
              >
                %
              </button>
              <button
                type="button"
                onClick={() => setDownMode('dollar')}
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
              type="number"
              min="0"
              step="0.01"
              value={rate}
              onChange={(e) => {
                setRate(Math.max(Number(e.target.value) || 0, 0));
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
                    type="number"
                    min="0"
                    step="0.1"
                    value={originationPercent}
                    onChange={(e) => setOriginationPercent(Math.max(Number(e.target.value) || 0, 0))}
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
                    type="number"
                    min="0"
                    value={appraisalFee}
                    onChange={(e) => setAppraisalFee(Math.max(Number(e.target.value) || 0, 0))}
                    className="w-full rounded-sm border border-black/20 bg-white py-2 pl-7 pr-3"
                  />
                </div>
              </label>

              <label className="grid gap-1 text-sm">
                <span>{L.lenderFees}</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
                  <input
                    type="number"
                    min="0"
                    value={lenderFees}
                    onChange={(e) => setLenderFees(Math.max(Number(e.target.value) || 0, 0))}
                    className="w-full rounded-sm border border-black/20 bg-white py-2 pl-7 pr-3"
                  />
                </div>
              </label>

              <label className="grid gap-1 text-sm">
                <span>{L.recordingFees}</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
                  <input
                    type="number"
                    min="0"
                    value={recordingFees}
                    onChange={(e) => setRecordingFees(Math.max(Number(e.target.value) || 0, 0))}
                    className="w-full rounded-sm border border-black/20 bg-white py-2 pl-7 pr-3"
                  />
                </div>
              </label>

              <label className="grid gap-1 text-sm">
                <span>{L.homeInsurance}</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
                  <input
                    type="number"
                    min="0"
                    value={homeInsurance}
                    onChange={(e) => setHomeInsurance(Math.max(Number(e.target.value) || 0, 0))}
                    className="w-full rounded-sm border border-black/20 bg-white py-2 pl-7 pr-3"
                  />
                </div>
              </label>

              <label className="grid gap-1 text-sm">
                <span>{L.escrowMonths}</span>
                <input
                  type="number"
                  min="0"
                  max="12"
                  value={escrowMonths}
                  onChange={(e) => setEscrowMonths(Math.max(Number(e.target.value) || 0, 0))}
                  className="w-full max-w-[8rem] rounded-sm border border-black/20 bg-white py-2 px-3"
                />
                <span className="text-xs text-ink/50">{copy.escrowNote}</span>
              </label>

              <label className="grid gap-1 text-sm sm:col-span-2">
                <span>{L.titlePolicy}</span>
                <span className="text-sm font-medium text-ink">{usd.format(SIMULTANEOUS_LOAN_POLICY_RATE)}</span>
                <span className="text-xs text-ink/50">{copy.titlePolicyNote}</span>
              </label>

              <label className="grid gap-1 text-sm">
                <span>{L.hoaFee}</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
                  <input
                    type="number"
                    min="0"
                    value={hoaFee}
                    onChange={(e) => setHoaFee(Math.max(Number(e.target.value) || 0, 0))}
                    className="w-full rounded-sm border border-black/20 bg-white py-2 pl-7 pr-3"
                  />
                </div>
              </label>

              <label className="grid gap-1 text-sm">
                <span>{L.surveyFee}</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
                  <input
                    type="number"
                    min="0"
                    value={surveyFee}
                    onChange={(e) => setSurveyFee(Math.max(Number(e.target.value) || 0, 0))}
                    className="w-full rounded-sm border border-black/20 bg-white py-2 pl-7 pr-3"
                  />
                </div>
                <span className="text-xs text-ink/50">{copy.surveyNote}</span>
              </label>

              {taxNoteText && (
                <p className="text-xs text-ink/50 sm:col-span-2">{taxNoteText}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="lg:sticky lg:top-24">
        <div className="rounded-sm border border-ink/10 bg-cream p-6 shadow-sm md:p-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-petrol">{R.title}</p>
          <p className="mt-3 font-display text-4xl md:text-5xl">{usd.format(totalCashToClose)}</p>

          <div className="mt-6 divide-y divide-ink/10 text-sm">
            <Row label={R.downPayment} value={usd.format(downDollar)} />
            {originationCost > 0 && <Row label={R.origination} value={usd.format(originationCost)} />}
            {appraisalFee > 0 && <Row label={R.appraisal} value={usd.format(appraisalFee)} />}
            {lenderFees > 0 && <Row label={R.lenderFees} value={usd.format(lenderFees)} />}
            <Row label={R.titlePolicy} value={usd.format(SIMULTANEOUS_LOAN_POLICY_RATE)} />
            {recordingFees > 0 && <Row label={R.recordingFees} value={usd.format(recordingFees)} />}
            {homeInsurance > 0 && <Row label={R.homeInsurance} value={usd.format(homeInsurance)} />}
            {interestCost > 0 && <Row label={R.prepaidInterest} value={usd2.format(interestCost)} />}
            {escrowReserve > 0 && <Row label={R.escrowReserve} value={usd.format(escrowReserve)} />}
            {hoaFee > 0 && <Row label={R.hoaFee} value={usd.format(hoaFee)} />}
            {surveyFee > 0 && <Row label={R.surveyFee} value={usd.format(surveyFee)} />}
          </div>

          <div className="mt-6 grid gap-2 border-t border-ink/10 pt-4 text-sm text-ink/70">
            <div className="flex items-center justify-between">
              <span>{R.closingCostsSubtotal}</span>
              <span className="font-medium text-ink">{usd.format(closingCostsSubtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-ink">{R.total}</span>
              <span className="font-display text-xl text-petrol">{usd.format(totalCashToClose)}</span>
            </div>
          </div>

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
