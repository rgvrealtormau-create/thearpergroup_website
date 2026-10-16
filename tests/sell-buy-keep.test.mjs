import test from 'node:test';
import assert from 'node:assert/strict';
import {helocMaxLine, helocDraw, overlapCost, gapCost, fannieDepartingResidence, exclusionWindowEnd} from '../lib/sell-buy-keep.js';

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
