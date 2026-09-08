'use client';

import { useEffect, useMemo, useState } from 'react';
import { cities, citySlugs } from '../lib/content';
import { WEB3FORMS_ACCESS_KEY } from '../lib/site';

// Typical combined property-tax rate by area (annual, as a fraction of price).
// Kept in sync with the same constants in MortgageCalculator.jsx / ClosingCostEstimator.jsx / SellerNetProceeds.jsx / TitlePolicyCalculator.jsx.
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
// Kept in sync with InvestmentPropertyCalculator.jsx.
const TWIA_CITIES = new Set(['harlingen', 'san-benito', 'brownsville', 'south-padre-island']);
const HIDALGO_CITIES = new Set(['mcallen', 'edinburg', 'mission', 'pharr', 'weslaco', 'mercedes']);

// A vacant property mid-rehab usually isn't covered by a standard landlord
// policy — lenders typically require a separate vacant/renovation (builder's
// risk) policy, roughly $150-$400/mo statewide; TWIA-eligible coastal
// counties trend toward the top of that range.
function insuranceDefaultFor(city) {
  if (TWIA_CITIES.has(city)) return 350;
  if (HIDALGO_CITIES.has(city)) return 200;
  return 250;
}

function insuranceNoteFor(city, copy, cityName) {
  const template = TWIA_CITIES.has(city)
    ? copy.insuranceNoteTwia
    : HIDALGO_CITIES.has(city)
      ? copy.insuranceNoteStandard
      : copy.insuranceNoteOther;
  return template.replace('{city}', cityName);
}

// Texas Department of Insurance promulgated basic premium rates for an
// Owner's Policy, effective March 1, 2026 (tdi.texas.gov/title/titlerates2026.html).
// Same verified table and formula as TitlePolicyCalculator.jsx — reused here
// for the seller-paid Owner's Policy on resale rather than re-derived.
const MIN_PREMIUM = 308;
const BRACKET_TABLE = {
  25000: 308, 25500: 310, 26000: 314, 26500: 317, 27000: 319, 27500: 322,
  28000: 325, 28500: 328, 29000: 333, 29500: 336, 30000: 339, 30500: 341,
  31000: 345, 31500: 348, 32000: 351, 32500: 355, 33000: 357, 33500: 361,
  34000: 364, 34500: 368, 35000: 371, 35500: 373, 36000: 376, 36500: 380,
  37000: 383, 37500: 386, 38000: 390, 38500: 393, 39000: 395, 39500: 399,
  40000: 401, 40500: 406, 41000: 408, 41500: 412, 42000: 415, 42500: 418,
  43000: 420, 43500: 424, 44000: 428, 44500: 431, 45000: 434, 45500: 437,
  46000: 440, 46500: 444, 47000: 446, 47500: 448, 48000: 453, 48500: 457,
  49000: 460, 49500: 462, 50000: 465, 50500: 468, 51000: 470, 51500: 474,
  52000: 478, 52500: 482, 53000: 484, 53500: 488, 54000: 491, 54500: 493,
  55000: 496, 55500: 499, 56000: 504, 56500: 507, 57000: 509, 57500: 513,
  58000: 517, 58500: 519, 59000: 522, 59500: 525, 60000: 529, 60500: 533,
  61000: 536, 61500: 537, 62000: 541, 62500: 545, 63000: 547, 63500: 551,
  64000: 554, 64500: 557, 65000: 560, 65500: 563, 66000: 567, 66500: 571,
  67000: 574, 67500: 575, 68000: 579, 68500: 582, 69000: 585, 69500: 588,
  70000: 592, 70500: 596, 71000: 599, 71500: 601, 72000: 604, 72500: 608,
  73000: 611, 73500: 613, 74000: 617, 74500: 621, 75000: 625, 75500: 627,
  76000: 629, 76500: 632, 77000: 636, 77500: 639, 78000: 643, 78500: 646,
  79000: 650, 79500: 651, 80000: 655, 80500: 658, 81000: 662, 81500: 664,
  82000: 667, 82500: 672, 83000: 675, 83500: 677, 84000: 680, 84500: 684,
  85000: 687, 85500: 689, 86000: 692, 86500: 697, 87000: 701, 87500: 703,
  88000: 705, 88500: 709, 89000: 713, 89500: 715, 90000: 718, 90500: 721,
  91000: 725, 91500: 729, 92000: 731, 92500: 734, 93000: 737, 93500: 741,
  94000: 742, 94500: 747, 95000: 751, 95500: 754, 96000: 755, 96500: 759,
  97000: 763, 97500: 766, 98000: 769, 98500: 773, 99000: 776, 99500: 779,
  100000: 780,
};
const FORMULA_TIERS = [
  { upTo: 1_000_000, subtract: 100_000, rate: 0.00494, add: 780 },
  { upTo: 5_000_000, subtract: 1_000_000, rate: 0.00406, add: 5_226 },
  { upTo: 15_000_000, subtract: 5_000_000, rate: 0.00335, add: 21_466 },
  { upTo: 25_000_000, subtract: 15_000_000, rate: 0.00238, add: 54_966 },
  { upTo: 50_000_000, subtract: 25_000_000, rate: 0.00143, add: 78_766 },
  { upTo: 100_000_000, subtract: 50_000_000, rate: 0.00129, add: 114_516 },
  { upTo: Infinity, subtract: 100_000_000, rate: 0.00116, add: 179_016 },
];

function ownersPolicyPremium(amount) {
  if (amount <= 0) return 0;
  if (amount <= 25000) return MIN_PREMIUM;
  if (amount <= 100000) return BRACKET_TABLE[Math.ceil(amount / 500) * 500];
  const tier = FORMULA_TIERS.find((t) => amount <= t.upTo);
  return Math.round((amount - tier.subtract) * tier.rate) + tier.add;
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

  const titlePremium = useMemo(() => ownersPolicyPremium(num(arv)), [arv]);
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
