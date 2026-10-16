'use client';

import { useEffect, useMemo, useState } from 'react';
import { cities, citySlugs } from '../lib/content';
import { WEB3FORMS_ACCESS_KEY } from '../lib/site';
import { taxRateFor, TWIA_CITIES, HIDALGO_CITIES, insuranceNoteFor, titleBasicPremium } from '../lib/calc';

// A vacant property mid-rehab usually isn't covered by a standard landlord
// policy — lenders typically require a separate vacant/renovation (builder's
// risk) policy, roughly $150-$400/mo statewide; TWIA-eligible coastal
// counties trend toward the top of that range.
function insuranceDefaultFor(city) {
  if (TWIA_CITIES.has(city)) return 350;
  if (HIDALGO_CITIES.has(city)) return 200;
  return 250;
}

const DEFAULT_CONTINGENCY = 15;
const DEFAULT_MAX_LTV = 70;
const DEFAULT_RATE = 11;
const DEFAULT_POINTS = 2;
const DEFAULT_HOLD_MONTHS = 6;
const DEFAULT_UTILITIES_HOA = 250;
const DEFAULT_COMMISSION = 6;
const DEFAULT_OTHER_BUY_COSTS = 1000;
const DEFAULT_OTHER_SELL_COSTS = 750;
const DEFAULT_MAO_PERCENT = 70;

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const pct1 = new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });

function num(v) {
  return parseFloat(v) || 0;
}

export default function FlipCalculator({ lang, copy }) {
  const L = copy.labels;
  const R = copy.results;
  const M = copy.mao;

  const [purchasePrice, setPurchasePrice] = useState('200000');
  const [rehabBudget, setRehabBudget] = useState('50000');
  const [arv, setArv] = useState('310000');
  const [contingencyPercent, setContingencyPercent] = useState(String(DEFAULT_CONTINGENCY));
  const [holdMonths, setHoldMonths] = useState(String(DEFAULT_HOLD_MONTHS));
  const [city, setCity] = useState('mcallen');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [maxLtvPercent, setMaxLtvPercent] = useState(String(DEFAULT_MAX_LTV));
  const [ratePercent, setRatePercent] = useState(String(DEFAULT_RATE));
  const [pointsPercent, setPointsPercent] = useState(String(DEFAULT_POINTS));

  const [tax, setTax] = useState(() => String(Math.round(200000 * taxRateFor('mcallen'))));
  const [taxTouched, setTaxTouched] = useState(false);
  const [insurance, setInsurance] = useState(() => String(insuranceDefaultFor('mcallen')));
  const [insuranceTouched, setInsuranceTouched] = useState(false);
  const [utilitiesHoa, setUtilitiesHoa] = useState(String(DEFAULT_UTILITIES_HOA));

  const [commissionPercent, setCommissionPercent] = useState(String(DEFAULT_COMMISSION));
  const [buyerPaysTitle, setBuyerPaysTitle] = useState(false);
  const [otherBuyClosingCosts, setOtherBuyClosingCosts] = useState(String(DEFAULT_OTHER_BUY_COSTS));
  const [otherSellClosingCosts, setOtherSellClosingCosts] = useState(String(DEFAULT_OTHER_SELL_COSTS));
  const [maoPercent, setMaoPercent] = useState(String(DEFAULT_MAO_PERCENT));

  useEffect(() => {
    if (!taxTouched) setTax(String(Math.round(num(purchasePrice) * taxRateFor(city))));
    if (!insuranceTouched) setInsurance(String(insuranceDefaultFor(city)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city]);

  useEffect(() => {
    if (!taxTouched) setTax(String(Math.round(num(purchasePrice) * taxRateFor(city))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchasePrice]);

  const cityName = city === 'other' ? L.otherCity : cities[city]?.[lang]?.name ?? city;

  const rehabWithContingency = useMemo(
    () => num(rehabBudget) * (1 + num(contingencyPercent) / 100),
    [rehabBudget, contingencyPercent]
  );
  const acquisitionRehabCost = num(purchasePrice) + rehabWithContingency;
  const loanAmount = Math.max(Math.min(num(arv) * (num(maxLtvPercent) / 100), acquisitionRehabCost), 0);
  const cashToClose = Math.max(acquisitionRehabCost - loanAmount, 0);
  const loanPoints = loanAmount * (num(pointsPercent) / 100);
  const buyClosingCosts = loanPoints + num(otherBuyClosingCosts);

  const monthlyInterest = (loanAmount * (num(ratePercent) / 100)) / 12;
  const monthlyTax = num(tax) / 12;
  const monthlyInsurance = num(insurance);
  const monthlyUtilities = num(utilitiesHoa);
  const totalMonthlyHolding = monthlyInterest + monthlyTax + monthlyInsurance + monthlyUtilities;
  const holdingCosts = totalMonthlyHolding * num(holdMonths);

  const titlePremium = useMemo(() => titleBasicPremium(num(arv)), [arv]);
  const titleCost = buyerPaysTitle ? 0 : titlePremium;
  const commissionCost = num(arv) * (num(commissionPercent) / 100);
  const sellSideCosts = commissionCost + titleCost + num(otherSellClosingCosts);

  const totalProjectCost = acquisitionRehabCost + buyClosingCosts + holdingCosts + sellSideCosts;
  const profit = num(arv) - totalProjectCost;
  const isLoss = profit < 0;
  const totalCashInvested = cashToClose + buyClosingCosts + holdingCosts;
  const roi = totalCashInvested > 0 ? profit / totalCashInvested : 0;
  const profitMargin = num(arv) > 0 ? profit / num(arv) : 0;

  const maoAmount = num(arv) * (num(maoPercent) / 100) - num(rehabBudget);
  const maoDiff = num(purchasePrice) - maoAmount;

  const taxNoteText = !taxTouched ? copy.taxNote.replace('{city}', cityName) : null;
  const insuranceNoteText = !insuranceTouched ? insuranceNoteFor(city, copy, cityName) : null;

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
      `Purchase price: ${usd.format(num(purchasePrice))}, Rehab budget: ${usd.format(num(rehabBudget))} (+${num(contingencyPercent)}% contingency), ARV: ${usd.format(num(arv))}`,
      `City: ${cityName}, Hold period: ${num(holdMonths)} months`,
      `Loan: ${usd.format(loanAmount)} at ${num(ratePercent)}% / ${num(pointsPercent)} pts (max ${num(maxLtvPercent)}% of ARV)`,
      `Cash to close (purchase+rehab): ${usd.format(cashToClose)}, Buy-side closing costs: ${usd.format(buyClosingCosts)}`,
      `Holding costs (${num(holdMonths)} mo): ${usd.format(holdingCosts)} — interest ${usd.format(monthlyInterest)}/mo, tax ${usd.format(monthlyTax)}/mo, insurance ${usd.format(monthlyInsurance)}/mo, utilities/HOA ${usd.format(monthlyUtilities)}/mo`,
      `Sell-side costs: ${usd.format(sellSideCosts)} — commission ${usd.format(commissionCost)}, Owner's Policy ${buyerPaysTitle ? 'buyer-paid' : usd.format(titlePremium)}, other ${usd.format(num(otherSellClosingCosts))}`,
      `Total project cost: ${usd.format(totalProjectCost)}`,
      `${isLoss ? 'Estimated loss' : 'Estimated profit'}: ${usd.format(Math.abs(profit))}, ROI: ${pct1.format(roi)}, Margin: ${pct1.format(profitMargin)}`,
      `Suggested max offer (${num(maoPercent)}% rule): ${usd.format(maoAmount)}`,
    ].join('\n');
    if (!data.get('botcheck')) {
      fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formType: 'flip_calculator',
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
          subject: 'Flip calculator lead',
          from_name: 'The Arper Group website',
          page: 'Flip calculator',
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
      <div className="grid gap-8">
        <div className="grid gap-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink/50">{copy.sectionPurchaseRehab}</p>

          <label className="grid gap-1 text-sm">
            <span>{L.purchasePrice}</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
              <input
                inputMode="decimal"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value.replace(/[^0-9.]/g, ''))}
                className="w-full rounded-sm border border-black/20 bg-white py-2 pl-7 pr-3"
              />
            </div>
          </label>

          <label className="grid gap-1 text-sm">
            <span>{L.rehabBudget}</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
              <input
                inputMode="decimal"
                value={rehabBudget}
                onChange={(e) => setRehabBudget(e.target.value.replace(/[^0-9.]/g, ''))}
                className="w-full rounded-sm border border-black/20 bg-white py-2 pl-7 pr-3"
              />
            </div>
            <span className="text-xs text-ink/50">{copy.rehabBudgetNote}</span>
          </label>

          <label className="grid gap-1 text-sm">
            <span>{L.arv}</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
              <input
                inputMode="decimal"
                value={arv}
                onChange={(e) => setArv(e.target.value.replace(/[^0-9.]/g, ''))}
                className="w-full rounded-sm border border-black/20 bg-white py-2 pl-7 pr-3"
              />
            </div>
            <span className="text-xs text-ink/50">{copy.arvNote}</span>
          </label>

          <label className="grid gap-1 text-sm">
            <span>{L.holdMonths}</span>
            <input
              inputMode="decimal"
              value={holdMonths}
              onChange={(e) => setHoldMonths(e.target.value.replace(/[^0-9.]/g, ''))}
              className="w-full max-w-[8rem] rounded-sm border border-black/20 bg-white py-2 px-3"
            />
            <span className="text-xs text-ink/50">{copy.holdMonthsNote}</span>
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
            <div className="mt-4 grid gap-8 border-t border-ink/10 pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink/50 sm:col-span-2">{copy.sectionFinancing}</p>

                <label className="grid gap-1 text-sm">
                  <span>{L.contingency}</span>
                  <div className="relative max-w-[10rem]">
                    <input
                      inputMode="decimal"
                      value={contingencyPercent}
                      onChange={(e) => setContingencyPercent(e.target.value.replace(/[^0-9.]/g, ''))}
                      className="w-full rounded-sm border border-black/20 bg-white py-2 pl-3 pr-7"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink/50">%</span>
                  </div>
                  <span className="text-xs text-ink/50">{copy.contingencyNote}</span>
                </label>

                <label className="grid gap-1 text-sm">
                  <span>{L.maxLtv}</span>
                  <div className="relative max-w-[10rem]">
                    <input
                      inputMode="decimal"
                      value={maxLtvPercent}
                      onChange={(e) => setMaxLtvPercent(e.target.value.replace(/[^0-9.]/g, ''))}
                      className="w-full rounded-sm border border-black/20 bg-white py-2 pl-3 pr-7"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink/50">%</span>
                  </div>
                  <span className="text-xs text-ink/50">{copy.maxLtvNote}</span>
                </label>

                <label className="grid gap-1 text-sm">
                  <span>{L.interestRate}</span>
                  <div className="relative max-w-[10rem]">
                    <input
                      inputMode="decimal"
                      value={ratePercent}
                      onChange={(e) => setRatePercent(e.target.value.replace(/[^0-9.]/g, ''))}
                      className="w-full rounded-sm border border-black/20 bg-white py-2 pl-3 pr-7"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink/50">%</span>
                  </div>
                  <span className="text-xs text-ink/50">{copy.interestRateNote}</span>
                </label>

                <label className="grid gap-1 text-sm">
                  <span>{L.points}</span>
                  <div className="relative max-w-[10rem]">
                    <input
                      inputMode="decimal"
                      value={pointsPercent}
                      onChange={(e) => setPointsPercent(e.target.value.replace(/[^0-9.]/g, ''))}
                      className="w-full rounded-sm border border-black/20 bg-white py-2 pl-3 pr-7"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink/50">%</span>
                  </div>
                  <span className="text-xs text-ink/50">{copy.pointsNote}</span>
                </label>

                <label className="grid gap-1 text-sm sm:col-span-2">
                  <span>{L.otherBuyClosingCosts}</span>
                  <div className="relative max-w-[14rem]">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
                    <input
                      inputMode="decimal"
                      value={otherBuyClosingCosts}
                      onChange={(e) => setOtherBuyClosingCosts(e.target.value.replace(/[^0-9.]/g, ''))}
                      className="w-full rounded-sm border border-black/20 bg-white py-2 pl-7 pr-3"
                    />
                  </div>
                  <span className="text-xs text-ink/50">{copy.otherBuyClosingCostsNote}</span>
                </label>
              </div>

              <div className="grid gap-4 border-t border-ink/10 pt-4 sm:grid-cols-2">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink/50 sm:col-span-2">{copy.sectionHolding}</p>

                <label className="grid gap-1 text-sm">
                  <span>{L.propertyTax}</span>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
                    <input
                      inputMode="decimal"
                      value={tax}
                      onChange={(e) => {
                        setTax(e.target.value.replace(/[^0-9.]/g, ''));
                        setTaxTouched(true);
                      }}
                      className="w-full rounded-sm border border-black/20 bg-white py-2 pl-7 pr-3"
                    />
                  </div>
                  {taxNoteText && <span className="text-xs text-ink/50">{taxNoteText}</span>}
                </label>

                <label className="grid gap-1 text-sm">
                  <span>{L.insurance}</span>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
                    <input
                      inputMode="decimal"
                      value={insurance}
                      onChange={(e) => {
                        setInsurance(e.target.value.replace(/[^0-9.]/g, ''));
                        setInsuranceTouched(true);
                      }}
                      className="w-full rounded-sm border border-black/20 bg-white py-2 pl-7 pr-3"
                    />
                  </div>
                  {insuranceNoteText && <span className="text-xs text-ink/50">{insuranceNoteText}</span>}
                </label>

                <label className="grid gap-1 text-sm sm:col-span-2">
                  <span>{L.utilitiesHoa}</span>
                  <div className="relative max-w-[14rem]">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
                    <input
                      inputMode="decimal"
                      value={utilitiesHoa}
                      onChange={(e) => setUtilitiesHoa(e.target.value.replace(/[^0-9.]/g, ''))}
                      className="w-full rounded-sm border border-black/20 bg-white py-2 pl-7 pr-3"
                    />
                  </div>
                  <span className="text-xs text-ink/50">{copy.utilitiesHoaNote}</span>
                </label>
              </div>

              <div className="grid gap-4 border-t border-ink/10 pt-4 sm:grid-cols-2">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink/50 sm:col-span-2">{copy.sectionResale}</p>

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
                  <span>{L.otherSellClosingCosts}</span>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
                    <input
                      inputMode="decimal"
                      value={otherSellClosingCosts}
                      onChange={(e) => setOtherSellClosingCosts(e.target.value.replace(/[^0-9.]/g, ''))}
                      className="w-full rounded-sm border border-black/20 bg-white py-2 pl-7 pr-3"
                    />
                  </div>
                  <span className="text-xs text-ink/50">{copy.otherSellClosingCostsNote}</span>
                </label>

                <label className="flex items-start gap-2 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={buyerPaysTitle}
                    onChange={(e) => setBuyerPaysTitle(e.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block">{L.buyerPaysTitle}</span>
                    {!buyerPaysTitle && <span className="mt-1 block text-sm font-medium text-ink">{usd.format(titlePremium)}</span>}
                    <span className="mt-1 block text-xs text-ink/50">{copy.titleNote}</span>
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="lg:sticky lg:top-24">
        <div className="rounded-sm border border-ink/10 bg-cream p-6 shadow-sm md:p-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-petrol">{R.title}</p>
          <p className={`mt-3 font-display text-4xl md:text-5xl ${isLoss ? 'text-red-700' : ''}`}>
            {usd.format(Math.abs(profit))}
          </p>
          {isLoss && <p className="mt-2 text-xs text-red-700">{R.lossNote}</p>}

          <div className="mt-6 grid grid-cols-2 gap-4 text-sm text-ink/70">
            <div>
              <div className="text-xs uppercase tracking-wide text-ink/45">{R.roi}</div>
              <div className="mt-1 font-medium text-ink">{pct1.format(roi)}</div>
              <div className="mt-1 text-xs text-ink/50">{R.roiNote}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-ink/45">{R.profitMargin}</div>
              <div className="mt-1 font-medium text-ink">{pct1.format(profitMargin)}</div>
            </div>
            <div className="col-span-2">
              <div className="text-xs uppercase tracking-wide text-ink/45">{R.totalCashInvested}</div>
              <div className="mt-1 font-medium text-ink">{usd.format(totalCashInvested)}</div>
            </div>
          </div>

          <div className="mt-6 divide-y divide-ink/10 text-sm">
            <Row label={R.acquisitionRehab} value={usd.format(acquisitionRehabCost)} />
            <Row label={`  ${R.loanAmount}`} value={usd.format(loanAmount)} muted />
            <Row label={`  ${R.cashToClose}`} value={usd.format(cashToClose)} muted />
            <Row label={R.buyClosingCosts} value={usd.format(buyClosingCosts)} />
            <Row label={`  ${R.loanPoints}`} value={usd.format(loanPoints)} muted />
            <Row label={`  ${R.otherBuyClosingCosts}`} value={usd.format(num(otherBuyClosingCosts))} muted />
            <Row label={R.holdingCosts} value={usd.format(holdingCosts)} />
            <Row label={`  ${R.monthlyInterest}`} value={usd.format(monthlyInterest)} muted />
            <Row label={`  ${R.propertyTax}`} value={usd.format(monthlyTax)} muted />
            <Row label={`  ${R.insurance}`} value={usd.format(monthlyInsurance)} muted />
            <Row label={`  ${R.utilitiesHoa}`} value={usd.format(monthlyUtilities)} muted />
            <Row label={R.sellSideCosts} value={usd.format(sellSideCosts)} />
            <Row label={`  ${R.commission}`} value={usd.format(commissionCost)} muted />
            <Row label={`  ${R.titleInsurance}`} value={usd.format(titleCost)} muted />
            <Row label={`  ${R.otherSellClosingCosts}`} value={usd.format(num(otherSellClosingCosts))} muted />
            <Row label={R.totalProjectCost} value={usd.format(totalProjectCost)} bold />
            <Row label={R.arv} value={usd.format(num(arv))} bold />
          </div>

          <div className="mt-6 grid gap-2 border-t border-ink/10 pt-4 text-sm">
            <p className="font-medium text-ink">{M.title}</p>
            <p className="text-xs text-ink/60">{M.intro}</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-ink/70">{L.maoPercent}</span>
              <div className="relative w-20">
                <input
                  inputMode="decimal"
                  value={maoPercent}
                  onChange={(e) => setMaoPercent(e.target.value.replace(/[^0-9.]/g, ''))}
                  className="w-full rounded-sm border border-black/20 bg-white py-1.5 pl-2 pr-6 text-sm"
                />
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink/50">%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink/70">{M.amount}</span>
              <span className="font-display text-xl text-petrol">{usd.format(Math.max(maoAmount, 0))}</span>
            </div>
            <p className="text-xs text-ink/60">
              {(maoDiff > 0 ? M.aboveNote : M.belowNote).replace('{amount}', usd.format(Math.abs(maoDiff)))}
            </p>
          </div>

          <p className="mt-6 text-xs text-ink/50">{copy.disclaimer}</p>
          <p className="mt-3 text-xs text-ink/50">{copy.dealerTaxNote}</p>

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

function Row({ label, value, bold, muted }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className={muted ? 'text-ink/50' : 'text-ink/70'}>{label}</span>
      <span className={bold ? 'font-medium text-ink' : muted ? 'text-ink/60' : 'font-medium text-ink'}>{value}</span>
    </div>
  );
}
