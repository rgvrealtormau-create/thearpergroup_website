'use client';

import { useMemo, useState } from 'react';

// Vittoria-specific cash-to-close + monthly payment estimator:
// FHA loan, $8,000 seller concession, optional TSAHC down payment assistance.
// Logic and bilingual copy are co-located here (site convention).
//
// Sources (verify before changing):
// - FHA: 3.5% minimum down (580+ credit); upfront MIP 1.75% of the base loan, financed;
//   annual MIP 0.55% for 30-yr loans with <5% down, life of loan. Seller concessions capped at 6%.
// - TSAHC DPA: up to 5% of the loan amount for down payment and/or closing costs, as a grant
//   or a 0% deferred second lien; grant-paired rates typically run ~0.25–0.50% above market.
//   Income limits by county, 620+ credit, homebuyer education. tsahc.org/homebuyer-programs
// - Closing-cost line items mirror ClosingCostEstimator.jsx defaults.

const PRICE = 235000;
const SELLER_CONCESSION = 8000;
const FHA_MIN_DOWN = 0.035;
const FHA_UFMIP = 0.0175;
const FHA_ANNUAL_MIP = 0.0055;
const FHA_CONCESSION_CAP = 0.06;
const DPA_MAX = 5;
const DPA_DEFAULT = 4;
const DPA_RATE_PREMIUM = 0.375; // midpoint of the typical 0.25–0.50% range
const WESLACO_TAX_RATE = 0.023; // same Hidalgo County rate as the mortgage calculator
const TERM_YEARS = 30;

// Buyer closing costs (Closing Cost Estimator defaults)
const ORIGINATION_PCT = 0.01;
const APPRAISAL = 550;
const LENDER_FEES = 600;
const LOAN_TITLE_POLICY = 100; // TX simultaneous-issue rate (R-5); seller customarily pays owner's policy
const RECORDING = 75;
const PREPAID_INTEREST_DAYS = 15;
const ESCROW_MONTHS = 3;

const COPY = {
  en: {
    eyebrow: 'Run the numbers',
    title: 'What it could take to move in',
    lede: 'An FHA loan at the $235,000 pre-sale price, with the builder’s $8,000 seller concession and optional down payment assistance through TSAHC. Adjust the rate and assistance to see how it changes.',
    dpaToggle: 'Use TSAHC down payment assistance',
    dpaAmount: 'Assistance amount',
    dpaOfLoan: 'of the loan amount',
    rate: 'Interest rate',
    rateNoteLive: 'Based on this week’s Freddie Mac 30-year average ({date}).',
    rateNoteFallback: 'Placeholder rate; ask a lender for today’s rate.',
    rateNoteDpa: 'Includes +0.375% — rates paired with a DPA grant typically run 0.25–0.50% higher.',
    insurance: 'Homeowners insurance (per year)',
    hoa: 'HOA dues (per month)',
    cashTitle: 'Estimated cash to close',
    monthlyTitle: 'Estimated monthly payment',
    rows: {
      down: 'Down payment (3.5% FHA minimum)',
      closing: 'Estimated closing costs & prepaids',
      concession: 'Seller concession',
      dpa: 'TSAHC down payment assistance',
      cash: 'Cash to close',
      pi: 'Principal & interest',
      tax: 'Property taxes',
      ins: 'Homeowners insurance',
      mip: 'FHA mortgage insurance',
      hoa: 'HOA dues',
      total: 'Total monthly',
      loan: 'Loan amount (incl. 1.75% upfront MIP)',
    },
    concessionCapped: 'Only {amt} of the concession can be used — it can’t exceed actual closing costs or go toward the down payment.',
    dpaExcess: 'Assistance above what’s needed isn’t paid out; your lender sizes it to your closing.',
    showDetail: 'See the closing-cost breakdown',
    hideDetail: 'Hide the breakdown',
    detail: {
      origination: 'Loan origination (1%)',
      appraisal: 'Appraisal',
      lenderFees: 'Other lender fees',
      title: 'Lender’s title policy (TX promulgated)',
      recording: 'Recording',
      insurance: 'First-year insurance',
      interest: 'Prepaid interest (~15 days)',
      escrow: 'Escrow reserve (3 months taxes & insurance)',
    },
    eligibility: 'TSAHC assistance has county income limits, a 620 minimum credit score and a homebuyer education course. It comes as a grant or a 0% deferred second lien repaid when you sell or refinance — your lender will walk you through which fits.',
    earnest: 'You’ll also put down earnest money when your offer is accepted; it’s credited back to you at closing.',
    cta: 'Talk to us about a lender',
    disclaimer: 'Estimate only — not a loan offer, approval or Loan Estimate. Assumes a 30-year fixed FHA loan with 3.5% down; actual rate, fees, taxes, insurance, mortgage insurance and assistance amounts are set by your lender and the program. Not financial advice.',
  },
  es: {
    eyebrow: 'Haz cuentas',
    title: 'Lo que podrías necesitar para mudarte',
    lede: 'Un préstamo FHA al precio de preventa de $235,000, con los $8,000 de concesión del constructor y ayuda opcional para el enganche de TSAHC. Mueve la tasa y la ayuda para ver cómo cambia.',
    dpaToggle: 'Usar la ayuda para el enganche de TSAHC',
    dpaAmount: 'Monto de la ayuda',
    dpaOfLoan: 'del monto del préstamo',
    rate: 'Tasa de interés',
    rateNoteLive: 'Basada en el promedio de 30 años de Freddie Mac de esta semana ({date}).',
    rateNoteFallback: 'Tasa de referencia; pregúntale a un prestamista la tasa de hoy.',
    rateNoteDpa: 'Incluye +0.375% — las tasas con subsidio de ayuda suelen ser 0.25–0.50% más altas.',
    insurance: 'Seguro de casa (por año)',
    hoa: 'Cuota de HOA (por mes)',
    cashTitle: 'Dinero estimado para cerrar',
    monthlyTitle: 'Pago mensual estimado',
    rows: {
      down: 'Enganche (3.5% mínimo FHA)',
      closing: 'Gastos de cierre y prepagos estimados',
      concession: 'Concesión del vendedor',
      dpa: 'Ayuda para el enganche de TSAHC',
      cash: 'Dinero para cerrar',
      pi: 'Capital e interés',
      tax: 'Impuestos a la propiedad',
      ins: 'Seguro de casa',
      mip: 'Seguro hipotecario FHA',
      hoa: 'Cuota de HOA',
      total: 'Total mensual',
      loan: 'Monto del préstamo (incl. 1.75% de MIP inicial)',
    },
    concessionCapped: 'Solo se pueden usar {amt} de la concesión — no puede ser mayor que los gastos de cierre reales ni usarse para el enganche.',
    dpaExcess: 'La ayuda que sobre no se entrega en efectivo; tu prestamista la ajusta a tu cierre.',
    showDetail: 'Ver el desglose de gastos de cierre',
    hideDetail: 'Ocultar el desglose',
    detail: {
      origination: 'Originación del préstamo (1%)',
      appraisal: 'Avalúo',
      lenderFees: 'Otros cargos del prestamista',
      title: 'Póliza de título del prestamista (tarifa de Texas)',
      recording: 'Registro',
      insurance: 'Seguro del primer año',
      interest: 'Interés prepagado (~15 días)',
      escrow: 'Reserva de escrow (3 meses de impuestos y seguro)',
    },
    eligibility: 'La ayuda de TSAHC tiene límites de ingreso por condado, un puntaje de crédito mínimo de 620 y un curso para compradores. Puede ser un subsidio o un segundo préstamo diferido al 0% que se paga al vender o refinanciar — tu prestamista te explica cuál te conviene.',
    earnest: 'También darás un depósito de buena fe (earnest money) cuando acepten tu oferta; se te acredita al cierre.',
    cta: 'Pregúntanos por un prestamista',
    disclaimer: 'Solo es un estimado — no es una oferta de préstamo, aprobación ni Loan Estimate. Supone un préstamo FHA a 30 años con tasa fija y 3.5% de enganche; la tasa, cargos, impuestos, seguros, seguro hipotecario y montos de ayuda los define tu prestamista y el programa. No es asesoría financiera.',
  },
};

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const num = (v) => parseFloat(v) || 0;

function monthlyPI(loan, ratePct, years) {
  const r = ratePct / 100 / 12;
  const n = years * 12;
  if (loan <= 0 || n <= 0) return 0;
  if (r === 0) return loan / n;
  const f = (1 + r) ** n;
  return (loan * r * f) / (f - 1);
}

function formatDate(iso, lang) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function VittoriaPaymentEstimator({ lang, rates }) {
  const c = COPY[lang] ?? COPY.en;
  const baseRate = rates?.rate30 ?? 6.5;

  const [useDpa, setUseDpa] = useState(true);
  const [dpaPct, setDpaPct] = useState(DPA_DEFAULT);
  // Rate is held as a string (avoids the leading-zero input bug); it tracks the
  // market rate (+ DPA premium) until the visitor edits it.
  const [rateStr, setRateStr] = useState(String(Math.round((baseRate + DPA_RATE_PREMIUM) * 1000) / 1000));
  const [rateTouched, setRateTouched] = useState(false);
  const [insurance, setInsurance] = useState('1800');
  const [hoa, setHoa] = useState('0');
  const [showDetail, setShowDetail] = useState(false);

  function toggleDpa(next) {
    setUseDpa(next);
    if (!rateTouched) setRateStr(String(Math.round((baseRate + (next ? DPA_RATE_PREMIUM : 0)) * 1000) / 1000));
  }

  const r = useMemo(() => {
    const rate = num(rateStr);
    const down = Math.round(PRICE * FHA_MIN_DOWN);
    const baseLoan = PRICE - down;
    const ufmip = Math.round(baseLoan * FHA_UFMIP);
    const loan = baseLoan + ufmip;

    const annualTax = PRICE * WESLACO_TAX_RATE;
    const ins = num(insurance);
    const items = {
      origination: Math.round(loan * ORIGINATION_PCT),
      appraisal: APPRAISAL,
      lenderFees: LENDER_FEES,
      title: LOAN_TITLE_POLICY,
      recording: RECORDING,
      insurance: Math.round(ins),
      interest: Math.round(loan * (rate / 100 / 365) * PREPAID_INTEREST_DAYS),
      escrow: Math.round(((annualTax + ins) / 12) * ESCROW_MONTHS),
    };
    const closing = Object.values(items).reduce((a, b) => a + b, 0);

    // Concession: capped by FHA's 6% and by actual closing costs; never toward the down payment.
    const concession = Math.min(SELLER_CONCESSION, PRICE * FHA_CONCESSION_CAP, closing);
    const needAfterConcession = down + closing - concession;

    const dpaAvailable = useDpa ? Math.round((loan * dpaPct) / 100) : 0;
    const dpa = Math.min(dpaAvailable, needAfterConcession);
    const cash = Math.max(needAfterConcession - dpa, 0);

    const pi = monthlyPI(loan, rate, TERM_YEARS);
    const tax = annualTax / 12;
    const insM = ins / 12;
    const mip = (baseLoan * FHA_ANNUAL_MIP) / 12;
    const hoaM = num(hoa);
    const total = pi + tax + insM + mip + hoaM;

    return {
      down, loan, items, closing, concession, dpa, dpaAvailable, cash,
      pi, tax, insM, mip, hoaM, total,
      concessionCapped: concession < SELLER_CONCESSION,
      dpaExcess: useDpa && dpaAvailable > dpa,
    };
  }, [rateStr, insurance, hoa, useDpa, dpaPct]);

  const rateNote = rateTouched
    ? null
    : [rates?.live ? c.rateNoteLive.replace('{date}', formatDate(rates.asOfDate, lang)) : c.rateNoteFallback, useDpa ? c.rateNoteDpa : null]
        .filter(Boolean)
        .join(' ');

  const inputCls = 'mt-1 w-full border border-ink/20 bg-paper px-3 py-2 text-ink focus:border-petrol focus:outline-none';

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-clay">{c.eyebrow}</p>
      <h2 className="mt-3 font-display text-3xl md:text-4xl">{c.title}</h2>
      <p className="mt-4 max-w-2xl text-ink/80">{c.lede}</p>

      <div className="mt-10 grid gap-10 lg:grid-cols-5">
        {/* Inputs */}
        <div className="space-y-6 lg:col-span-2">
          <label className="flex cursor-pointer items-center gap-3">
            <input type="checkbox" checked={useDpa} onChange={(e) => toggleDpa(e.target.checked)} className="h-5 w-5 accent-petrol" />
            <span className="font-medium">{c.dpaToggle}</span>
          </label>

          {useDpa && (
            <div>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-ink/70">{c.dpaAmount}</span>
                <span className="font-medium">{dpaPct}% {c.dpaOfLoan} · {fmt.format(r.dpaAvailable)}</span>
              </div>
              <input
                type="range" min="0" max={DPA_MAX} step="0.5" value={dpaPct}
                onChange={(e) => setDpaPct(parseFloat(e.target.value))}
                className="mt-2 w-full accent-petrol"
                aria-label={c.dpaAmount}
              />
            </div>
          )}

          <div>
            <label className="text-sm text-ink/70" htmlFor="vt-rate">{c.rate}</label>
            <div className="relative">
              <input
                id="vt-rate" inputMode="decimal" value={rateStr}
                onChange={(e) => { setRateStr(e.target.value.replace(/[^0-9.]/g, '')); setRateTouched(true); }}
                className={`${inputCls} pr-8`}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 mt-0.5 -translate-y-1/2 text-ink/50">%</span>
            </div>
            {rateNote && <p className="mt-1.5 text-xs text-ink/55">{rateNote}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-ink/70" htmlFor="vt-ins">{c.insurance}</label>
              <input id="vt-ins" inputMode="numeric" value={insurance} onChange={(e) => setInsurance(e.target.value.replace(/[^0-9]/g, ''))} className={inputCls} />
            </div>
            <div>
              <label className="text-sm text-ink/70" htmlFor="vt-hoa">{c.hoa}</label>
              <input id="vt-hoa" inputMode="numeric" value={hoa} onChange={(e) => setHoa(e.target.value.replace(/[^0-9]/g, ''))} className={inputCls} />
            </div>
          </div>

          <p className="text-xs text-ink/60">{c.eligibility}</p>
        </div>

        {/* Results */}
        <div className="grid gap-6 sm:grid-cols-2 lg:col-span-3">
          <div className="border border-ink/15 bg-paper p-6">
            <p className="text-sm text-ink/70">{c.cashTitle}</p>
            <p className="mt-1 font-display text-4xl text-petrol">{fmt.format(r.cash)}</p>
            <dl className="mt-5 space-y-2 text-sm">
              <Row label={c.rows.down} value={fmt.format(r.down)} />
              <Row label={c.rows.closing} value={fmt.format(r.closing)} />
              <Row label={c.rows.concession} value={`− ${fmt.format(r.concession)}`} tone="credit" />
              {useDpa && <Row label={c.rows.dpa} value={`− ${fmt.format(r.dpa)}`} tone="credit" />}
              <Row label={c.rows.cash} value={fmt.format(r.cash)} strong />
            </dl>
            {r.concessionCapped && <p className="mt-3 text-xs text-ink/55">{c.concessionCapped.replace('{amt}', fmt.format(r.concession))}</p>}
            {r.dpaExcess && <p className="mt-3 text-xs text-ink/55">{c.dpaExcess}</p>}
            <button type="button" onClick={() => setShowDetail((v) => !v)} className="mt-4 text-xs text-petrol link-underline">
              {showDetail ? c.hideDetail : c.showDetail}
            </button>
            {showDetail && (
              <dl className="mt-3 space-y-1.5 border-t border-ink/10 pt-3 text-xs">
                {Object.entries(r.items).map(([k, v]) => (
                  <Row key={k} label={c.detail[k]} value={fmt.format(v)} />
                ))}
              </dl>
            )}
          </div>

          <div className="border border-ink/15 bg-paper p-6">
            <p className="text-sm text-ink/70">{c.monthlyTitle}</p>
            <p className="mt-1 font-display text-4xl text-petrol">{fmt.format(r.total)}</p>
            <dl className="mt-5 space-y-2 text-sm">
              <Row label={c.rows.pi} value={fmt.format(r.pi)} />
              <Row label={c.rows.tax} value={fmt.format(r.tax)} />
              <Row label={c.rows.ins} value={fmt.format(r.insM)} />
              <Row label={c.rows.mip} value={fmt.format(r.mip)} />
              {r.hoaM > 0 && <Row label={c.rows.hoa} value={fmt.format(r.hoaM)} />}
              <Row label={c.rows.total} value={fmt.format(r.total)} strong />
            </dl>
            <p className="mt-3 text-xs text-ink/55">{c.rows.loan}: {fmt.format(r.loan)}</p>
          </div>

          <div className="sm:col-span-2">
            <p className="text-xs text-ink/60">{c.earnest}</p>
            <a href="#contact" className="mt-4 inline-block bg-petrol px-6 py-3 text-sm text-cream hover:bg-ink">{c.cta}</a>
            <p className="mt-4 text-xs text-ink/50">{c.disclaimer}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong, tone }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? 'border-t border-ink/15 pt-2 font-medium' : ''}`}>
      <dt className="text-ink/70">{label}</dt>
      <dd className={`whitespace-nowrap ${tone === 'credit' ? 'text-clay' : ''}`}>{value}</dd>
    </div>
  );
}
