'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { cities, citySlugs } from '../lib/content';
import { WEB3FORMS_ACCESS_KEY } from '../lib/site';

// Typical combined property-tax rate by area (annual, as a fraction of price).
// Kept in sync with the same constants in MortgageCalculator.jsx / ClosingCostEstimator.jsx / SellerNetProceeds.jsx.
const AREA_TAX_RATES = {
  mcallen: 0.023, edinburg: 0.023, mission: 0.023, pharr: 0.023, weslaco: 0.023, mercedes: 0.023,
  harlingen: 0.02, 'san-benito': 0.02, brownsville: 0.02, 'south-padre-island': 0.02,
  other: 0.022,
};

function taxRateFor(city) {
  return AREA_TAX_RATES[city] ?? AREA_TAX_RATES.other;
}

// Cameron and Willacy counties (TWIA-designated coastal windstorm zone) vs.
// Hidalgo county (not TWIA-eligible) — tdi.texas.gov / twia.org/coverage-eligibility.
// No city in our list sits in Willacy County, but the same TWIA framing applies there too.
const TWIA_CITIES = new Set(['harlingen', 'san-benito', 'brownsville', 'south-padre-island']);
const HIDALGO_CITIES = new Set(['mcallen', 'edinburg', 'mission', 'pharr', 'weslaco', 'mercedes']);

// Statewide landlord-insurance planning range is roughly $1,500-$3,200/yr;
// TWIA-eligible coastal counties trend toward the top of that range.
function insuranceDefaultFor(city) {
  if (TWIA_CITIES.has(city)) return 2800;
  if (HIDALGO_CITIES.has(city)) return 1800;
  return 2200;
}

function insuranceNoteFor(city, copy, cityName) {
  const template = TWIA_CITIES.has(city)
    ? copy.insuranceNoteTwia
    : HIDALGO_CITIES.has(city)
      ? copy.insuranceNoteStandard
      : copy.insuranceNoteOther;
  return template.replace('{city}', cityName);
}

const CLOSING_COST_ESTIMATE_RATE = 0.03;

// Long-term-rental vacancy default: McAllen HMA overall rental vacancy,
// mid-2025 (HUD PD&R). South Padre Island is overwhelmingly short-term/
// vacation rentals, where occupancy trackers cluster around 47%-53% for
// 2025-2026 — a fundamentally different rental model, so it gets its own
// much higher "vacancy" default (treating monthly rent as the fully-booked
// nightly-rate equivalent).
const LTR_VACANCY_DEFAULT = 10.6;
const STR_VACANCY_DEFAULT = 50;

const DEFAULT_MANAGEMENT = 8.5;
const DEFAULT_MAINTENANCE = 5;

// DSCR/investor loans typically price 0.5-1.5 points above the conventional
// owner-occupied average (Freddie Mac PMMS) this site's rate feed reports —
// this seeds a mid-range spread on top of that average, not a quote.
const INVESTOR_RATE_SPREAD = 0.75;

// Multi-year outlook defaults — all editable planning assumptions, not
// forecasts. Rent growth is deliberately conservative given recent flat/soft
// RGV rent data (HUD); appreciation sits at the low end of the long-term
// 3%-5%/yr national historical range.
const DEFAULT_RENT_GROWTH = 2;
const DEFAULT_APPRECIATION = 3;
const DEFAULT_EXPENSE_INFLATION = 3;

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const usd2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const pct1 = new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });

function num(v) {
  return parseFloat(v) || 0;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// Standard fixed-rate amortization — same formula as MortgageCalculator.jsx,
// reused here for the annual debt service that NOI is compared against.
function monthlyPI(loanAmount, ratePercent, termYears) {
  const monthlyRate = ratePercent / 100 / 12;
  const numPayments = termYears * 12;
  if (!numPayments) return 0;
  if (monthlyRate === 0) return loanAmount / numPayments;
  const factor = (1 + monthlyRate) ** numPayments;
  const pi = factor > 1 ? (loanAmount * (monthlyRate * factor)) / (factor - 1) : loanAmount / numPayments;
  return isFinite(pi) && !isNaN(pi) ? pi : 0;
}

export default function InvestmentPropertyCalculator({ lang, copy, rates }) {
  const L = copy.labels;
  const R = copy.results;

  const [price, setPrice] = useState('275000');
  const [downPercent, setDownPercent] = useState(25);
  const [downStr, setDownStr] = useState('25');
  const [downMode, setDownMode] = useState('percent');
  const [rate, setRate] = useState(() => String(round2(rates.rate30 + INVESTOR_RATE_SPREAD)));
  const [rateTouched, setRateTouched] = useState(false);
  const [term, setTerm] = useState(30);
  const [city, setCity] = useState('mcallen');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [closingCosts, setClosingCosts] = useState(() => String(Math.round(275000 * CLOSING_COST_ESTIMATE_RATE)));
  const [closingCostsTouched, setClosingCostsTouched] = useState(false);
  const [maintenancePercent, setMaintenancePercent] = useState(String(DEFAULT_MAINTENANCE));
  const [hoaMonthly, setHoaMonthly] = useState('0');
  const [tax, setTax] = useState(() => String(Math.round(275000 * taxRateFor('mcallen'))));
  const [taxTouched, setTaxTouched] = useState(false);
  const [insurance, setInsurance] = useState(() => String(insuranceDefaultFor('mcallen')));
  const [insuranceTouched, setInsuranceTouched] = useState(false);

  const [monthlyRent, setMonthlyRent] = useState('2000');
  const [vacancyPercent, setVacancyPercent] = useState(String(LTR_VACANCY_DEFAULT));
  const [vacancyTouched, setVacancyTouched] = useState(false);
  const [managementPercent, setManagementPercent] = useState(String(DEFAULT_MANAGEMENT));

  const [rentGrowthPercent, setRentGrowthPercent] = useState(String(DEFAULT_RENT_GROWTH));
  const [appreciationPercent, setAppreciationPercent] = useState(String(DEFAULT_APPRECIATION));
  const [expenseInflationPercent, setExpenseInflationPercent] = useState(String(DEFAULT_EXPENSE_INFLATION));

  useEffect(() => {
    if (!taxTouched) setTax(String(Math.round(num(price) * taxRateFor(city))));
    if (!insuranceTouched) setInsurance(String(insuranceDefaultFor(city)));
    if (!vacancyTouched) setVacancyPercent(String(city === 'south-padre-island' ? STR_VACANCY_DEFAULT : LTR_VACANCY_DEFAULT));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city]);

  useEffect(() => {
    if (!taxTouched) setTax(String(Math.round(num(price) * taxRateFor(city))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [price]);

  useEffect(() => {
    if (!closingCostsTouched) setClosingCosts(String(Math.round(num(price) * CLOSING_COST_ESTIMATE_RATE)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [price]);

  const downDollar = useMemo(() => Math.round((num(price) * downPercent) / 100), [price, downPercent]);
  const loanAmount = Math.max(num(price) - downDollar, 0);
  const totalCashInvested = downDollar + num(closingCosts);
  const cityName = city === 'other' ? L.otherCity : cities[city]?.[lang]?.name ?? city;

  const gsi = num(monthlyRent) * 12;
  const vacancyLoss = gsi * (num(vacancyPercent) / 100);
  const egi = gsi - vacancyLoss;
  const managementFee = egi * (num(managementPercent) / 100);
  const maintenanceReserve = gsi * (num(maintenancePercent) / 100);
  const hoaAnnual = num(hoaMonthly) * 12;
  const operatingExpenses = num(tax) + num(insurance) + managementFee + maintenanceReserve + hoaAnnual;
  const noi = egi - operatingExpenses;
  const capRate = num(price) > 0 ? noi / num(price) : 0;

  const monthlyDebtService = useMemo(() => monthlyPI(loanAmount, num(rate), term), [loanAmount, rate, term]);
  const annualDebtService = monthlyDebtService * 12;
  const cashFlowAnnual = noi - annualDebtService;
  const cashFlowMonthly = cashFlowAnnual / 12;
  const cashOnCash = totalCashInvested > 0 ? cashFlowAnnual / totalCashInvested : 0;
  const dscr = annualDebtService > 0 ? noi / annualDebtService : null;
  const grm = gsi > 0 ? num(price) / gsi : 0;

  const rateNoteText = rates.live && !rateTouched
    ? copy.rateNote
        .replace('{base}', String(rates.rate30))
        .replace('{spread}', String(INVESTOR_RATE_SPREAD))
        .replace('{date}', formatDate(rates.asOfDate, lang))
    : null;
  const taxNoteText = !taxTouched ? copy.taxNote.replace('{city}', cityName) : null;
  const insuranceNoteText = !insuranceTouched ? insuranceNoteFor(city, copy, cityName) : null;
  const vacancyNoteText = !vacancyTouched ? (city === 'south-padre-island' ? copy.vacancyNoteSpi : copy.vacancyNote) : null;

  // Multi-year outlook: projects rent (compounding at rentGrowthPercent),
  // fixed-dollar expenses (compounding at expenseInflationPercent — the
  // %-of-rent expenses already scale automatically with rent), the fixed-rate
  // loan's amortizing balance, and property value (compounding at
  // appreciationPercent) out to a handful of milestone years, ending at the
  // loan's payoff year.
  const proformaRows = useMemo(() => {
    const rentGrowth = num(rentGrowthPercent) / 100;
    const appreciation = num(appreciationPercent) / 100;
    const expenseInflation = num(expenseInflationPercent) / 100;
    const monthlyRate = num(rate) / 100 / 12;
    const totalPayments = term * 12;
    const fixedExpensesYear1 = num(tax) + num(insurance) + hoaAnnual;

    const milestoneYears = [...new Set([1, 3, 5, 10, term])].filter((y) => y > 0).sort((a, b) => a - b);
    const maxYear = milestoneYears[milestoneYears.length - 1];

    let cumulativeCashFlow = 0;
    const rows = [];
    for (let year = 1; year <= maxYear; year++) {
      const growthFactor = (1 + rentGrowth) ** (year - 1);
      const inflationFactor = (1 + expenseInflation) ** (year - 1);
      const yearGsi = gsi * growthFactor;
      const yearEgi = yearGsi - yearGsi * (num(vacancyPercent) / 100);
      const yearManagement = yearEgi * (num(managementPercent) / 100);
      const yearMaintenance = yearGsi * (num(maintenancePercent) / 100);
      const yearOpEx = yearManagement + yearMaintenance + fixedExpensesYear1 * inflationFactor;
      const yearNoi = yearEgi - yearOpEx;
      const yearCashFlow = yearNoi - annualDebtService;
      cumulativeCashFlow += yearCashFlow;

      if (milestoneYears.includes(year)) {
        const paymentsMade = year * 12;
        let remainingBalance;
        if (loanAmount <= 0) {
          remainingBalance = 0;
        } else if (paymentsMade >= totalPayments) {
          remainingBalance = 0;
        } else if (monthlyRate === 0) {
          remainingBalance = Math.max(loanAmount - monthlyDebtService * paymentsMade, 0);
        } else {
          const factorN = (1 + monthlyRate) ** totalPayments;
          const factorPaid = (1 + monthlyRate) ** paymentsMade;
          remainingBalance = (loanAmount * (factorN - factorPaid)) / (factorN - 1);
        }
        const propertyValue = num(price) * (1 + appreciation) ** year;
        const equity = propertyValue - remainingBalance;
        const totalReturn = cumulativeCashFlow + (equity - downDollar);
        const totalRoi = totalCashInvested > 0 ? totalReturn / totalCashInvested : 0;
        rows.push({
          year,
          paidOff: paymentsMade >= totalPayments,
          cumulativeCashFlow,
          propertyValue,
          remainingBalance,
          equity,
          totalReturn,
          totalRoi,
        });
      }
    }
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    gsi, vacancyPercent, managementPercent, maintenancePercent, tax, insurance, hoaAnnual,
    rentGrowthPercent, appreciationPercent, expenseInflationPercent,
    rate, term, loanAmount, price, downDollar, totalCashInvested, annualDebtService, monthlyDebtService,
  ]);
  const finalProformaRow = proformaRows[proformaRows.length - 1];

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
      `Purchase price: ${usd.format(num(price))}`,
      `Down payment: ${usd.format(downDollar)} (${round1(downPercent)}%)`,
      `Loan: ${usd.format(loanAmount)} at ${num(rate)}% / ${term} yr`,
      `City: ${cityName}`,
      `Monthly rent: ${usd.format(num(monthlyRent))}, Vacancy: ${round1(num(vacancyPercent))}%`,
      `Property tax: ${usd.format(num(tax))}/yr, Insurance: ${usd.format(num(insurance))}/yr, Management: ${usd.format(managementFee)}/yr, Maintenance reserve: ${usd.format(maintenanceReserve)}/yr, HOA: ${usd.format(hoaAnnual)}/yr`,
      `NOI: ${usd.format(noi)}/yr, Cap rate: ${pct1.format(capRate)}`,
      `Annual debt service: ${usd.format(annualDebtService)}`,
      `Cash flow: ${usd.format(cashFlowAnnual)}/yr (${usd2.format(cashFlowMonthly)}/mo)`,
      `Total cash invested: ${usd.format(totalCashInvested)}, Cash-on-cash: ${pct1.format(cashOnCash)}`,
      `DSCR: ${dscr === null ? 'n/a (cash purchase)' : dscr.toFixed(2)}`,
      ...(finalProformaRow ? [`Year ${finalProformaRow.year} projected total return: ${usd.format(finalProformaRow.totalReturn)} (${pct1.format(finalProformaRow.totalRoi)} ROI), assuming ${round1(num(rentGrowthPercent))}% rent growth / ${round1(num(appreciationPercent))}% appreciation / ${round1(num(expenseInflationPercent))}% expense inflation`] : []),
    ].join('\n');
    if (!data.get('botcheck')) {
      fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formType: 'investment_property_calculator',
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
          subject: 'Investment property calculator lead',
          from_name: 'The Arper Group website',
          page: 'Investment property calculator',
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
    <>
    <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-start">
      {/* Inputs */}
      <div className="grid gap-8">
        <div className="grid gap-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink/50">{copy.sectionPurchase}</p>

          <label className="grid gap-1 text-sm">
            <span>{L.purchasePrice}</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
              <input
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))}
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
                    else setDownPercent(num(price) > 0 ? (v / num(price)) * 100 : 0);
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
        </div>

        <div className="grid gap-6 border-t border-ink/10 pt-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink/50">{copy.sectionRental}</p>

          <label className="grid gap-1 text-sm">
            <span>{L.monthlyRent}</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
              <input
                inputMode="decimal"
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(e.target.value.replace(/[^0-9.]/g, ''))}
                className="w-full rounded-sm border border-black/20 bg-white py-2 pl-7 pr-3"
              />
            </div>
          </label>

          <label className="grid gap-1 text-sm">
            <span>{L.vacancyRate}</span>
            <div className="relative max-w-[10rem]">
              <input
                inputMode="decimal"
                value={vacancyPercent}
                onChange={(e) => {
                  setVacancyPercent(e.target.value.replace(/[^0-9.]/g, ''));
                  setVacancyTouched(true);
                }}
                className="w-full rounded-sm border border-black/20 bg-white py-2 pl-3 pr-7"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink/50">%</span>
            </div>
            {vacancyNoteText && <span className="text-xs text-ink/50">{vacancyNoteText}</span>}
          </label>

          <label className="grid gap-1 text-sm">
            <span>{L.managementFee}</span>
            <div className="relative max-w-[10rem]">
              <input
                inputMode="decimal"
                value={managementPercent}
                onChange={(e) => setManagementPercent(e.target.value.replace(/[^0-9.]/g, ''))}
                className="w-full rounded-sm border border-black/20 bg-white py-2 pl-3 pr-7"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink/50">%</span>
            </div>
            <span className="text-xs text-ink/50">{copy.managementNote}</span>
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
                <span>{L.loanTerm}</span>
                <div className="flex gap-2">
                  {[30, 20, 15].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTerm(t)}
                      className={`rounded-sm border px-4 py-2 text-sm font-medium ${
                        term === t ? 'border-petrol bg-petrol text-cream' : 'border-black/20 bg-white text-ink/70 hover:border-petrol'
                      }`}
                    >
                      {t} {L.yr}
                    </button>
                  ))}
                </div>
              </label>

              <label className="grid gap-1 text-sm">
                <span>{L.closingCosts}</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
                  <input
                    inputMode="decimal"
                    value={closingCosts}
                    onChange={(e) => {
                      setClosingCosts(e.target.value.replace(/[^0-9.]/g, ''));
                      setClosingCostsTouched(true);
                    }}
                    className="w-full rounded-sm border border-black/20 bg-white py-2 pl-7 pr-3"
                  />
                </div>
                <span className="text-xs text-ink/50">
                  {copy.closingCostsNote}
                  <Link href={`/${lang}/resources/closing-cost-estimator`} className="text-petrol link-underline">{copy.closingCostsLinkText}</Link>.
                </span>
              </label>

              <label className="grid gap-1 text-sm">
                <span>{L.maintenanceReserve}</span>
                <div className="relative max-w-[10rem]">
                  <input
                    inputMode="decimal"
                    value={maintenancePercent}
                    onChange={(e) => setMaintenancePercent(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="w-full rounded-sm border border-black/20 bg-white py-2 pl-3 pr-7"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink/50">%</span>
                </div>
                <span className="text-xs text-ink/50">{copy.maintenanceNote}</span>
              </label>

              <label className="grid gap-1 text-sm">
                <span>{L.hoaFee}</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
                  <input
                    inputMode="decimal"
                    value={hoaMonthly}
                    onChange={(e) => setHoaMonthly(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="w-full rounded-sm border border-black/20 bg-white py-2 pl-7 pr-3"
                  />
                </div>
              </label>

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
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="lg:sticky lg:top-24">
        <div className="rounded-sm border border-ink/10 bg-cream p-6 shadow-sm md:p-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-petrol">{R.title}</p>
          <p className={`mt-3 font-display text-4xl md:text-5xl ${cashFlowAnnual < 0 ? 'text-red-700' : ''}`}>
            {usd2.format(cashFlowMonthly)}
          </p>
          <p className="mt-1 text-sm text-ink/50">{R.annualEquivalent.replace('{amount}', usd.format(cashFlowAnnual))}</p>
          {cashFlowAnnual < 0 && <p className="mt-2 text-xs text-red-700">{R.negativeCashFlowNote}</p>}

          <div className="mt-6 grid grid-cols-2 gap-4 text-sm text-ink/70">
            <div>
              <div className="text-xs uppercase tracking-wide text-ink/45">{R.capRate}</div>
              <div className="mt-1 font-medium text-ink">{pct1.format(capRate)}</div>
              <div className="mt-1 text-xs text-ink/50">{R.capRateNote}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-ink/45">{R.cashOnCash}</div>
              <div className="mt-1 font-medium text-ink">{pct1.format(cashOnCash)}</div>
              <div className="mt-1 text-xs text-ink/50">{R.cashOnCashNote}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-ink/45">{R.dscr}</div>
              <div className="mt-1 font-medium text-ink">{dscr === null ? R.dscrNa : dscr.toFixed(2)}</div>
              <div className="mt-1 text-xs text-ink/50">{R.dscrNote}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-ink/45">{R.grm}</div>
              <div className="mt-1 font-medium text-ink">{grm.toFixed(1)}×</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-ink/45">{R.totalCashInvested}</div>
              <div className="mt-1 font-medium text-ink">{usd.format(totalCashInvested)}</div>
            </div>
          </div>

          <div className="mt-6 divide-y divide-ink/10 text-sm">
            <Row label={R.grossScheduledIncome} value={usd.format(gsi)} />
            <Row label={`− ${R.vacancyLoss}`} value={usd.format(vacancyLoss)} />
            <Row label={R.effectiveGrossIncome} value={usd.format(egi)} bold />
            <Row label={`  ${R.propertyTax}`} value={usd.format(num(tax))} muted />
            <Row label={`  ${R.insurance}`} value={usd.format(num(insurance))} muted />
            <Row label={`  ${R.managementFee}`} value={usd.format(managementFee)} muted />
            <Row label={`  ${R.maintenanceReserve}`} value={usd.format(maintenanceReserve)} muted />
            {hoaAnnual > 0 && <Row label={`  ${R.hoaFee}`} value={usd.format(hoaAnnual)} muted />}
            <Row label={R.noi} value={usd.format(noi)} bold />
            <Row label={`− ${R.annualDebtService}`} value={usd.format(annualDebtService)} />
            <Row label={R.cashFlowAnnual} value={usd.format(cashFlowAnnual)} bold />
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

    <div className="mt-16 border-t border-ink/10 pt-10">
      <h2 className="font-display text-2xl md:text-3xl">{copy.proforma.title}</h2>
      <p className="mt-3 max-w-3xl text-sm text-ink/70">{copy.proforma.intro}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <label className="grid gap-1 text-sm">
          <span>{L.rentGrowth}</span>
          <div className="relative max-w-[10rem]">
            <input
              inputMode="decimal"
              value={rentGrowthPercent}
              onChange={(e) => setRentGrowthPercent(e.target.value.replace(/[^0-9.]/g, ''))}
              className="w-full rounded-sm border border-black/20 bg-white py-2 pl-3 pr-7"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink/50">%</span>
          </div>
          <span className="text-xs text-ink/50">{copy.proforma.rentGrowthNote}</span>
        </label>

        <label className="grid gap-1 text-sm">
          <span>{L.appreciation}</span>
          <div className="relative max-w-[10rem]">
            <input
              inputMode="decimal"
              value={appreciationPercent}
              onChange={(e) => setAppreciationPercent(e.target.value.replace(/[^0-9.]/g, ''))}
              className="w-full rounded-sm border border-black/20 bg-white py-2 pl-3 pr-7"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink/50">%</span>
          </div>
          <span className="text-xs text-ink/50">{copy.proforma.appreciationNote}</span>
        </label>

        <label className="grid gap-1 text-sm">
          <span>{L.expenseInflation}</span>
          <div className="relative max-w-[10rem]">
            <input
              inputMode="decimal"
              value={expenseInflationPercent}
              onChange={(e) => setExpenseInflationPercent(e.target.value.replace(/[^0-9.]/g, ''))}
              className="w-full rounded-sm border border-black/20 bg-white py-2 pl-3 pr-7"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink/50">%</span>
          </div>
          <span className="text-xs text-ink/50">{copy.proforma.expenseInflationNote}</span>
        </label>
      </div>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-ink/15 text-left text-xs uppercase tracking-wide text-ink/45">
              <th className="py-2 pr-4 font-medium">{copy.proforma.yearHeader}</th>
              <th className="py-2 pr-4 font-medium">{copy.proforma.propertyValueHeader}</th>
              <th className="py-2 pr-4 font-medium">{copy.proforma.loanBalanceHeader}</th>
              <th className="py-2 pr-4 font-medium">{copy.proforma.equityHeader}</th>
              <th className="py-2 pr-4 font-medium">{copy.proforma.cumulativeCashFlowHeader}</th>
              <th className="py-2 pr-4 font-medium">{copy.proforma.totalReturnHeader}</th>
              <th className="py-2 font-medium">{copy.proforma.totalRoiHeader}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {proformaRows.map((row) => (
              <tr key={row.year}>
                <td className="py-2.5 pr-4 text-ink/70">
                  {row.year}{row.paidOff && <span className="text-ink/45">{copy.proforma.paidOffSuffix}</span>}
                </td>
                <td className="py-2.5 pr-4 text-ink">{usd.format(row.propertyValue)}</td>
                <td className="py-2.5 pr-4 text-ink">{usd.format(row.remainingBalance)}</td>
                <td className="py-2.5 pr-4 font-medium text-ink">{usd.format(row.equity)}</td>
                <td className="py-2.5 pr-4 text-ink">{usd.format(row.cumulativeCashFlow)}</td>
                <td className="py-2.5 pr-4 font-medium text-ink">{usd.format(row.totalReturn)}</td>
                <td className="py-2.5 font-medium text-petrol">{pct1.format(row.totalRoi)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {finalProformaRow && (
        <p className="mt-6 max-w-3xl text-sm text-ink/80">
          {copy.proforma.summary
            .replace('{year}', String(finalProformaRow.year))
            .replace('{amount}', usd.format(finalProformaRow.totalReturn))
            .replace('{roi}', pct1.format(finalProformaRow.totalRoi))
            .replace('{invested}', usd.format(totalCashInvested))}
        </p>
      )}

      <p className="mt-4 max-w-3xl text-xs text-ink/50">{copy.proforma.disclaimer}</p>
    </div>
    </>
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

function formatDate(isoDate, lang) {
  if (!isoDate) return '';
  const d = new Date(`${isoDate}T00:00:00`);
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-MX' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(d);
}
