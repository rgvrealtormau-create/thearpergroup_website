import test from 'node:test';
import assert from 'node:assert/strict';
import {helocMaxLine, helocDraw, overlapCost, gapCost, fannieDepartingResidence, exclusionWindowEnd, keepAndRent} from '../lib/sell-buy-keep.js';
import {rentalNoi, balanceAfterPayments, monthlyPI} from '../lib/calc.js';

// Spec §8. All inputs are test values, not market figures.
const home = {homeValue: 300000, mortgagePayoff: 150000, hasHomeEquityLoan: false};

test('HELOC max line is 80% of value minus the existing payoff', () => {
  assert.equal(helocMaxLine(home), 90000);
});
test('draw covers the 20% down payment, under the cap', () => {
  const r = helocDraw({downPayment: 80000, savingsUsed: 0, maxLine: helocMaxLine(home)});
  assert.deepEqual(r, {draw: 80000, shortfall: 0});
});
test('3-month overlap at 8.5% interest-only', () => {
  const r = overlapCost({draw: 80000, ratePercent: 8.5, months: 3, currentPiti: 1800});
  assert.equal(r.monthlyInterest, 566.67);
  assert.equal(r.interestTotal, 1700);
  assert.equal(r.pitiTotal, 5400);
  assert.equal(r.carrying, 7100);
});
test('Fannie view at $2,000 market rent counts -$300 as debt, $10,800 reserves', () => {
  const r = fannieDepartingResidence({marketRent: 2000, pitia: 1800, landlordExperienceMonths: 0});
  assert.equal(r.adjusted, -300);
  assert.equal(r.treatment, 'debt');
  assert.equal(r.addedDebt, 300);
  assert.equal(r.reserves, 10800);
});
test('HELOC is unavailable with no room under the cap or an existing home equity loan', () => {
  assert.equal(helocMaxLine({...home, mortgagePayoff: 250000}), null);
  assert.equal(helocMaxLine({...home, hasHomeEquityLoan: true}), null);
});
test('draw is capped at the line and reports the shortfall', () => {
  assert.deepEqual(helocDraw({downPayment: 100000, maxLine: 90000}), {draw: 90000, shortfall: 10000});
});
test('leaseback is capped at 90 days', () => {
  const r = gapCost({leasebackDays: 120, leasebackDailyRate: 50});
  assert.equal(r.total, 4500);
  assert.equal(r.capped, true);
});
test('exclusion window closes 3 years after move-out', () => {
  assert.equal(exclusionWindowEnd('2026-11-01', 5), '2029-11-01');
  assert.equal(exclusionWindowEnd('2026-11-01', 1), null);
});

// Keep & rent, with the §8 home and the Investment Property defaults.
const noi = rentalNoi({monthlyRent: 2000, vacancyPercent: 10.6, managementPercent: 8.5, maintenancePercent: 5, tax: 6900, insurance: 1800}).noi;
test('keep & rent: entered P&I, tax swing, equity at the horizon', () => {
  const r = keepAndRent({homeValue: 300000, mortgagePayoff: 150000, piti: 1800, currentPI: 1100, currentRatePercent: 4,
    currentTax: 4600, nonHomesteadTax: 6900, homeownerInsurance: 1800, noi, horizonYears: 5, appreciationPercent: 0});
  assert.equal(r.cashFlowMonthly, -288.98);
  assert.equal(r.cumulativeCashFlow, round(-288.98 * 12 * 5, 1));
  assert.equal(r.taxIncrease, 2300);
  assert.equal(r.equity, round(300000 - balanceAfterPayments(150000, 4, 1100, 60), 2));
  assert.equal(r.piEstimated, false);
});
test('keep & rent: blank P&I is estimated from PITI, blank rate leaves equity open', () => {
  const r = keepAndRent({homeValue: 300000, mortgagePayoff: 150000, piti: 1800, currentTax: 4600, nonHomesteadTax: 6900,
    homeownerInsurance: 1800, noi, horizonYears: 5});
  assert.equal(r.pi, round(1800 - 4600 / 12 - 150, 2));
  assert.equal(r.piEstimated, true);
  assert.equal(r.equity, null);
});
test('a balance paid down by its own payment reaches zero', () => {
  assert.equal(balanceAfterPayments(10000, 0, 1000, 12), 0);
  assert.equal(Math.round(balanceAfterPayments(150000, 4, monthlyPI(150000, 4, 30), 360)), 0);
});

function round(n, d) { const f = 10 ** d; return Math.round(n * f) / f; }
test('keep & rent: a HELOC left on the rental comes off equity', () => {
  const base = {homeValue: 300000, mortgagePayoff: 150000, piti: 1800, currentPI: 1100, currentRatePercent: 4,
    nonHomesteadTax: 6900, homeownerInsurance: 1800, noi, horizonYears: 5};
  assert.equal(keepAndRent({...base, otherLiens: 80000}).equity, round(keepAndRent(base).equity - 80000, 2));
});
