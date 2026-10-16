// New math for the Sell First / Buy First / Keep It calculator. Only what no
// other calculator already does lives here: the Texas HELOC cap and draw,
// overlap and gap costs, the seller leaseback, and Fannie Mae's
// departing-residence view. Net proceeds, amortization, NOI and closing costs
// come from the existing calculators (see the build spec, §7).

import { balanceAfterPayments } from './calc.js';

// Tex. Const. art. XVI §50(a)(6)(B) and §50(t): a home equity loan or HELOC
// plus every other debt on the homestead can't exceed 80% of fair market
// value, and each HELOC advance must be at least $4,000.
export const TX_HOME_EQUITY_LTV = 0.8;
export const TX_HELOC_MIN_ADVANCE = 4000;

// TREC No. 15-7 (Seller's Temporary Residential Lease) covers stays of no
// more than 90 days after closing.
export const LEASEBACK_MAX_DAYS = 90;

// Fannie Mae Selling Guide B3-3.8-05 (09/02/2026): 75% of market rent minus
// the departing residence's PITIA; six months of PITIA reserves when the
// borrower has less than 12 months of property-management experience.
export const FANNIE_RENT_FACTOR = 0.75;
export const FANNIE_RESERVE_MONTHS = 6;

function round2(n) {
  return Math.round(n * 100) / 100;
}

// Largest line Texas law allows on the current homestead. Returns null when a
// HELOC likely isn't available: no room under the 80% cap, room for less than
// one minimum advance, or a §50(a)(6) loan already on the home (only one at a
// time is allowed).
export function helocMaxLine({ homeValue, mortgagePayoff, hasHomeEquityLoan }) {
  if (hasHomeEquityLoan) return null;
  const line = TX_HOME_EQUITY_LTV * homeValue - mortgagePayoff;
  return line >= TX_HELOC_MIN_ADVANCE ? round2(line) : null;
}

// What the buyer draws for the next purchase, capped at the line. `shortfall`
// is what the line can't cover; a draw under the $4,000 minimum advance is
// rounded up to it.
export function helocDraw({ downPayment, buyerClosingCosts = 0, savingsUsed = 0, maxLine }) {
  const needed = Math.max(downPayment + buyerClosingCosts - savingsUsed, 0);
  if (maxLine == null || needed === 0) return { draw: 0, shortfall: needed };
  const draw = Math.min(Math.max(needed, TX_HELOC_MIN_ADVANCE), maxLine);
  return { draw: round2(draw), shortfall: round2(Math.max(needed - draw, 0)) };
}

// Months of carrying both homes until the old one sells and pays off the
// HELOC. Interest-only on the draw by default.
export function overlapCost({ draw, ratePercent, months, currentPiti, helocClosingCosts = 0 }) {
  const exactMonthly = (draw * ratePercent) / 100 / 12;
  const monthlyInterest = round2(exactMonthly);
  const interestTotal = round2(exactMonthly * months);
  const pitiTotal = round2(currentPiti * months);
  const monthly = round2(currentPiti + exactMonthly);
  const carrying = round2(interestTotal + pitiTotal);
  return {
    monthlyInterest,
    interestTotal,
    pitiTotal,
    monthly,
    carrying,
    total: round2(carrying + helocClosingCosts),
  };
}

// Sell-first gap: temporary housing and storage for the months between
// closings plus the extra move, or a seller leaseback (capped at 90 days).
export function gapCost({ months = 0, monthlyRent = 0, monthlyStorage = 0, extraMoving = 0, leasebackDays = 0, leasebackDailyRate = 0 }) {
  if (leasebackDays > 0) {
    const days = Math.min(leasebackDays, LEASEBACK_MAX_DAYS);
    return { total: round2(days * leasebackDailyRate), leasebackDays: days, capped: leasebackDays > LEASEBACK_MAX_DAYS };
  }
  return { total: round2(months * (monthlyRent + monthlyStorage) + extraMoving), leasebackDays: 0, capped: false };
}

// How Fannie Mae's published method would count rent on the departing
// residence. Informational only; the lender decides. A positive result can
// only offset that home's payment (never added to income); a negative result
// counts as monthly debt.
export function fannieDepartingResidence({ marketRent, pitia, landlordExperienceMonths = 0 }) {
  const adjusted = round2(FANNIE_RENT_FACTOR * marketRent - pitia);
  return {
    adjusted,
    treatment: adjusted >= 0 ? 'offset' : 'debt',
    offset: adjusted >= 0 ? Math.min(adjusted, pitia) : 0,
    addedDebt: adjusted < 0 ? -adjusted : 0,
    reserves: landlordExperienceMonths < 12 ? round2(FANNIE_RESERVE_MONTHS * pitia) : 0,
  };
}

// IRS Pub. 523: the exclusion needs 2 of the 5 years before the sale as owner
// and resident. For someone who lived there at least 2 years, that window
// closes 3 years after move-out. Returns an ISO date, or null when they
// haven't lived there 2 years yet.
export function exclusionWindowEnd(moveOutIso, yearsLivedIn) {
  if (!moveOutIso || yearsLivedIn < 2) return null;
  const d = new Date(`${moveOutIso}T00:00:00Z`);
  if (isNaN(d.getTime())) return null;
  d.setUTCFullYear(d.getUTCFullYear() + 3);
  return d.toISOString().slice(0, 10);
}

// Keep the current home as a rental. NOI comes from the Investment Property
// math (lib/calc rentalNoi) using the non-homestead tax estimate. Debt service
// is the current loan's P&I: entered, or estimated from PITI minus taxes and
// insurance when left blank. Equity at the horizon needs the current rate;
// without it, `equity` is null. `otherLiens` (a HELOC left on the rental)
// comes off equity too. Cash flow is held at today's rent.
export function keepAndRent({
  homeValue, mortgagePayoff, piti, currentPI = null, currentRatePercent = null,
  currentTax = null, nonHomesteadTax, homeownerInsurance, noi, horizonYears, appreciationPercent = 0, otherLiens = 0,
}) {
  const piEstimated = currentPI == null;
  const taxForEstimate = currentTax ?? nonHomesteadTax;
  const pi = piEstimated ? Math.max(piti - taxForEstimate / 12 - homeownerInsurance / 12, 0) : currentPI;
  const cashFlowAnnual = noi - pi * 12;
  const cashFlowMonthly = cashFlowAnnual / 12;
  const months = Math.round(horizonYears * 12);
  const futureValue = homeValue * (1 + appreciationPercent / 100) ** horizonYears;
  const balance = currentRatePercent == null ? null : balanceAfterPayments(mortgagePayoff, currentRatePercent, pi, months);
  return {
    pi: round2(pi),
    piEstimated,
    cashFlowMonthly: round2(cashFlowMonthly),
    cashFlowAnnual: round2(cashFlowAnnual),
    cumulativeCashFlow: round2(cashFlowAnnual * horizonYears),
    taxIncrease: currentTax == null ? null : round2(nonHomesteadTax - currentTax),
    futureValue: round2(futureValue),
    balance: balance == null ? null : round2(balance),
    equity: balance == null ? null : round2(futureValue - balance - otherLiens),
  };
}
