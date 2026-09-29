'use client';

import { useMemo, useState } from 'react';

// Vittoria-specific cash-to-close + monthly payment estimator:
// FHA loan, $8,000 seller concession, optional Texas DPA (TDHCA / TSAHC).
// Logic and bilingual copy are co-located here (site convention).
//
// Sources (verify before changing):
// - FHA: 3.5% minimum down (580+ credit); upfront MIP 1.75% of the base loan, financed;
//   annual MIP 0.55% for 30-yr loans with <5% down, life of loan. Seller concessions capped at 6%.
// - TSAHC DPA: up to 5% of the loan amount for down payment and/or closing costs, as a grant
//   or a 0% deferred second lien; grant-paired rates typically run ~0.25–0.50% above market.
//   Income limits by county, 620+ credit, homebuyer education. tsahc.org/homebuyer-programs
// - Rate: daily Optimal Blue 30-yr FHA index (FRED OBMMIFHA30YF) via getFhaRate(), + DPA premium.
// - DPA sized as % of the TOTAL loan (incl. UFMIP) — matches the lender worksheet (4% × $228,779 = $9,151.16).

const PRICE = 235000;
const SELLER_CONCESSION = 8000;
const FHA_MIN_DOWN = 0.035;
const FHA_UFMIP = 0.0175;
const FHA_ANNUAL_MIP = 0.0055;
const FHA_CONCESSION_CAP = 0.06;
const DPA_MAX = 5;
const DPA_DEFAULT = 4;
const DPA_RATE_PREMIUM = 0; // lender worksheet showed no DPA rate add-on; lender quotes the real rate
const HOA_ANNUAL = 137.5; // Vittoria HOA; a separate micro-HOA fee is still TBD
const TAX_RATE = 0.020228; // effective rate from the lender worksheet ($392.76/mo on $233,000)
const TERM_YEARS = 30;

// Buyer closing costs, calibrated to a Directions Equity FHA + DPA pre-application
// worksheet (Jul 2026, $233,000 purchase, McAllen). Fixed fees used as-is; the
// origination fee is a % of the base loan. Update here if the lender's fees change.
const ORIGINATION_PCT = 0.005; // of base loan
const LENDER_FEES = { processing: 795, underwriting: 1075, admin: 495, credit: 297.69, taxService: 80, flood: 6, docPrep: 150 };
const APPRAISAL_FEES = { appraisal: 795, finalInspection: 165 };
const TITLE_FEES = { settlement: 450, courier: 30, eRecording: 10, guaranty: 2, endorsements: 200, ownersTitle: 350, lendersTitle: 1187, recording: 260 };
const SURVEY = 550;
const PREPAID_INTEREST_DAYS = 15;
const ESCROW_MONTHS = 3;
const sum = (o) => Object.values(o).reduce((x, y) => x + y, 0);

const COPY = {
  en: {
    eyebrow: 'Run the numbers',
    title: 'What it could take to move in',
    lede: 'An FHA loan at the $235,000 pre-sale price, with the builder’s $8,000 seller concession and optional Texas down payment assistance (TDHCA or TSAHC). Adjust the rate and assistance to see how it changes.',
    dpaToggle: 'Use Texas down payment assistance',
    dpaAmount: 'Assistance amount',
    dpaOfLoan: 'of the loan amount',
    rate: 'Interest rate',
    rateNoteFha: 'Starts from the daily 30-year FHA rate index ({rate}% on {date}; source: Optimal Blue via FRED).',
    rateNotePmms: 'Starts from Freddie Mac’s weekly 30-year average ({rate}% on {date}); the daily FHA index was unavailable.',
    rateNoteFallback: 'Placeholder rate; ask a lender for today’s rate.',
    rateReset: 'Reset to today’s rate',
    rateNoteDpa: '',
    insurance: 'Homeowners insurance (per year)',
    hoa: 'HOA dues (per year)',
    hoaNote: 'Vittoria’s HOA is $137.50/year. A separate micro-HOA fee is still being set by the builder and isn’t included yet.',
    cashTitle: 'Estimated cash to close',
    monthlyTitle: 'Estimated monthly payment',
    rows: {
      down: 'Down payment (3.5% FHA minimum)',
      closing: 'Estimated closing costs & prepaids',
      concession: 'Seller concession',
      dpa: 'Down payment assistance',
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
      lender: 'Lender fees (origination, processing, underwriting, credit, docs)',
      appraisal: 'Appraisal + final inspection',
      title: 'Title insurance, settlement & recording',
      survey: 'Survey',
      insurance: 'First-year homeowners insurance',
      interest: 'Prepaid interest (~15 days)',
      escrow: 'Escrow reserve (3 months taxes & insurance)',
    },
    eligibility: 'Texas down payment assistance through TDHCA or TSAHC comes with income limits, a minimum credit score (typically 620) and a homebuyer education course, and is usually a second lien alongside your FHA loan. Your lender will confirm the program, its terms and your exact rate — DPA loans can price differently from the daily index.',
    earnest: 'You’ll also put down earnest money when your offer is accepted; it’s credited back to you at closing.',
    cta: 'Talk to us about a lender',
    disclaimer: 'Estimate only — not a loan offer, approval or Loan Estimate. Assumes a 30-year fixed FHA loan with 3.5% down; actual rate, fees, taxes, insurance, mortgage insurance and assistance amounts are set by your lender and the program. Not financial advice.',
  },
  es: {
    eyebrow: 'Haz cuentas',
    title: 'Lo que podrías necesitar para mudarte',
    lede: 'Un préstamo FHA al precio de preventa de $235,000, con los $8,000 de concesión del constructor y ayuda opcional de Texas para el enganche (TDHCA o TSAHC). Mueve la tasa y la ayuda para ver cómo cambia.',
    dpaToggle: 'Usar la ayuda de Texas para el enganche',
    dpaAmount: 'Monto de la ayuda',
    dpaOfLoan: 'del monto del préstamo',
    rate: 'Tasa de interés',
    rateNoteFha: 'Parte del índice diario de tasas FHA a 30 años ({rate}% al {date}; fuente: Optimal Blue vía FRED).',
    rateNotePmms: 'Parte del promedio semanal de 30 años de Freddie Mac ({rate}% al {date}); el índice diario FHA no estuvo disponible.',
    rateNoteFallback: 'Tasa de referencia; pregúntale a un prestamista la tasa de hoy.',
    rateReset: 'Volver a la tasa de hoy',
    rateNoteDpa: '',
    insurance: 'Seguro de casa (por año)',
    hoa: 'Cuota de HOA (por año)',
    hoaNote: 'La cuota de HOA de Vittoria es de $137.50 al año. Hay una cuota adicional de micro-HOA que el constructor todavía está definiendo y aún no está incluida.',
    cashTitle: 'Dinero estimado para cerrar',
    monthlyTitle: 'Pago mensual estimado',
    rows: {
      down: 'Enganche (3.5% mínimo FHA)',
      closing: 'Gastos de cierre y prepagos estimados',
      concession: 'Concesión del vendedor',
      dpa: 'Ayuda para el enganche',
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
      lender: 'Cargos del prestamista (originación, procesamiento, suscripción, crédito, documentos)',
      appraisal: 'Avalúo + inspección final',
      title: 'Seguro de título, cierre y registro',
      survey: 'Medición del terreno (survey)',
      insurance: 'Seguro de casa del primer año',
      interest: 'Interés prepagado (~15 días)',
      escrow: 'Reserva de escrow (3 meses de impuestos y seguro)',
    },
    eligibility: 'La ayuda para el enganche de Texas a través de TDHCA o TSAHC tiene límites de ingreso, un puntaje de crédito mínimo (normalmente 620) y un curso para compradores, y suele ser un segundo préstamo junto con tu préstamo FHA. Tu prestamista te confirma el programa, sus condiciones y tu tasa exacta — los préstamos con ayuda pueden tener una tasa distinta al índice diario.',
    earnest: 'También darás un depósito de buena fe (earnest money) cuando acepten tu oferta; se te acredita al cierre.',
    cta: 'Pregúntanos por un prestamista',
    disclaimer: 'Solo es un estimado — no es una oferta de préstamo, aprobación ni Loan Estimate. Supone un préstamo FHA a 30 años con tasa fija y 3.5% de enganche; la tasa, cargos, impuestos, seguros, seguro hipotecario y montos de ayuda los define tu prestamista y el programa. No es asesoría financiera.',
  },
};

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmt2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

export default function VittoriaPaymentEstimator({ lang, fha }) {
  const c = COPY[lang] ?? COPY.en;
  const baseRate = fha?.rate ?? 6.5;
  const rateFor = (dpa) => String(Math.round((baseRate + (dpa ? DPA_RATE_PREMIUM : 0)) * 1000) / 1000);

  const [useDpa, setUseDpa] = useState(true);
  const [dpaPct, setDpaPct] = useState(DPA_DEFAULT);
  // Rate is held as a string (avoids the leading-zero input bug); it tracks the
  // market rate (+ DPA premium) until the visitor edits it.
  const [rateStr, setRateStr] = useState(rateFor(true));
  const [rateTouched, setRateTouched] = useState(false);
  const [insurance, setInsurance] = useState('1200');
  const [hoa, setHoa] = useState(String(HOA_ANNUAL));
  const [showDetail, setShowDetail] = useState(false);

  function toggleDpa(next) {
    setUseDpa(next);
    if (!rateTouched) setRateStr(rateFor(next));
  }

  const r = useMemo(() => {
    const rate = num(rateStr);
    const down = Math.round(PRICE * FHA_MIN_DOWN);
    const baseLoan = PRICE - down;
    const ufmip = Math.round(baseLoan * FHA_UFMIP);
    const loan = baseLoan + ufmip;

    const annualTax = PRICE * TAX_RATE;
    const ins = num(insurance);
    const items = {
      lender: Math.round(baseLoan * ORIGINATION_PCT + sum(LENDER_FEES)),
      appraisal: sum(APPRAISAL_FEES),
      title: sum(TITLE_FEES),
      survey: SURVEY,
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
    const hoaM = num(hoa) / 12;
    const total = pi + tax + insM + mip + hoaM;

    return {
      down, loan, items, closing, concession, dpa, dpaAvailable, cash,
      pi, tax, insM, mip, hoaM, total,
      concessionCapped: concession < SELLER_CONCESSION,
      dpaExcess: useDpa && dpaAvailable > dpa,
    };
  }, [rateStr, insurance, hoa, useDpa, dpaPct]);

  const sourceNote = fha?.source === 'fha' ? c.rateNoteFha : fha?.source === 'pmms' ? c.rateNotePmms : c.rateNoteFallback;
  const rateNote = rateTouched
    ? null
    : [sourceNote.replace('{rate}', baseRate).replace('{date}', formatDate(fha?.asOfDate, lang)), null]
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
            {rateTouched && (
              <button type="button" onClick={() => { setRateStr(rateFor(useDpa)); setRateTouched(false); }} className="mt-1.5 text-xs text-petrol link-underline">{c.rateReset}</button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-ink/70" htmlFor="vt-ins">{c.insurance}</label>
              <input id="vt-ins" inputMode="numeric" value={insurance} onChange={(e) => setInsurance(e.target.value.replace(/[^0-9]/g, ''))} className={inputCls} />
            </div>
            <div>
              <label className="text-sm text-ink/70" htmlFor="vt-hoa">{c.hoa}</label>
              <input id="vt-hoa" inputMode="numeric" value={hoa} onChange={(e) => setHoa(e.target.value.replace(/[^0-9.]/g, ''))} className={inputCls} />
            </div>
          </div>

          <p className="text-xs text-ink/60">{c.hoaNote}</p>
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
              {r.hoaM > 0 && <Row label={c.rows.hoa} value={fmt2.format(r.hoaM)} />}
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
