'use client';

import { useMemo, useState } from 'react';
import { WEB3FORMS_ACCESS_KEY } from '../lib/site';

// Texas Department of Insurance promulgated basic premium rates, effective
// March 1, 2026 (tdi.texas.gov/title/titlerates2026.html). Below $25,000 the
// minimum premium applies; from $25,000 to $100,000 the state publishes a
// bracket schedule in $500 increments (not a continuous formula), keyed here
// by each bracket's upper bound. Verified row-for-row against the published
// PDF before shipping.
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

// Above $100,000, TDI publishes a per-bracket formula instead of a lookup
// table: premium = round((amount - subtract) * rate) + add.
const FORMULA_TIERS = [
  { upTo: 1_000_000, subtract: 100_000, rate: 0.00494, add: 780 },
  { upTo: 5_000_000, subtract: 1_000_000, rate: 0.00406, add: 5_226 },
  { upTo: 15_000_000, subtract: 5_000_000, rate: 0.00335, add: 21_466 },
  { upTo: 25_000_000, subtract: 15_000_000, rate: 0.00238, add: 54_966 },
  { upTo: 50_000_000, subtract: 25_000_000, rate: 0.00143, add: 78_766 },
  { upTo: 100_000_000, subtract: 50_000_000, rate: 0.00129, add: 114_516 },
  { upTo: Infinity, subtract: 100_000_000, rate: 0.00116, add: 179_016 },
];

// The basic premium for an owner's policy of a given face amount — also used
// as the "standalone" rate for a loan policy under Rate Rule R-5 below.
function basicPremium(amount) {
  if (amount <= 0) return 0;
  if (amount <= 25000) return MIN_PREMIUM;
  if (amount <= 100000) return BRACKET_TABLE[Math.ceil(amount / 500) * 500];
  const tier = FORMULA_TIERS.find((t) => amount <= t.upTo);
  return Math.round((amount - tier.subtract) * tier.rate) + tier.add;
}

// Rate Rule R-5 (simultaneous issuance): when a Loan Policy issues alongside
// an Owner's Policy on the same property (true for virtually every
// purchase), the Loan Policy is a flat $100 if the loan doesn't exceed the
// owner's policy amount, or the incremental basic rate plus $100 above that.
// tdi.texas.gov/title/titlem3b.html
function loanPolicyPremium(loanAmount, ownerAmount) {
  if (loanAmount <= 0) return 0;
  if (loanAmount <= ownerAmount) return 100;
  return basicPremium(loanAmount) - basicPremium(ownerAmount) + 100;
}

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

export default function TitlePolicyCalculator({ copy }) {
  const L = copy.labels;
  const R = copy.results;

  const [salePrice, setSalePrice] = useState('300000');
  const [downPercent, setDownPercent] = useState(20);
  const [downStr, setDownStr] = useState('20');
  const [downMode, setDownMode] = useState('percent');
  const [amendArea, setAmendArea] = useState(false);

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
      <div className="lg:sticky lg:top-24">
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
