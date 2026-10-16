import test from 'node:test';
import assert from 'node:assert/strict';
import {taxRateFor, titleBasicPremium, loanPolicyPremium, monthlyPI, remainingBalance, taxProration, prepaidInterest, sellerNetProceeds, buyerClosingCosts, rentalNoi, landlordInsuranceDefault} from '../lib/calc.js';

test('area tax rates fall back to other RGV', () => {
  assert.equal(taxRateFor('mcallen'), 0.023);
  assert.equal(taxRateFor('brownsville'), 0.02);
  assert.equal(taxRateFor('nowhere'), 0.022);
});
test('TDI owner policy premium: minimum, bracket table and formula tiers', () => {
  assert.equal(titleBasicPremium(0), 0);
  assert.equal(titleBasicPremium(20000), 308);
  assert.equal(titleBasicPremium(50200), 468); // rounds up to the $50,500 bracket
  assert.equal(titleBasicPremium(100000), 780);
  assert.equal(titleBasicPremium(300000), 1768);
  assert.equal(titleBasicPremium(2000000), 9286);
});
test('simultaneous loan policy is $100 up to the owner amount', () => {
  assert.equal(loanPolicyPremium(240000, 300000), 100);
  assert.equal(loanPolicyPremium(0, 300000), 0);
  assert.equal(loanPolicyPremium(350000, 300000), titleBasicPremium(350000) - 1768 + 100);
});
test('amortization: payment, zero rate and balance', () => {
  assert.equal(monthlyPI(320000, 6.25, 30).toFixed(2), '1970.30');
  assert.equal(monthlyPI(360000, 0, 30), 1000);
  assert.equal(monthlyPI(100000, 6, 0), 0);
  assert.equal(remainingBalance(320000, 6.25, 30, 360), 0);
  assert.equal(Math.round(remainingBalance(320000, 6.25, 30, 60)), 298679);
});
test('tax proration and prepaid interest use the closing date', () => {
  assert.equal(taxProration(3650, '2026-01-10'), 100);
  assert.equal(taxProration(0, '2026-06-01'), 0);
  assert.equal(prepaidInterest(365000, 10, '2026-04-21'), 1000);
});
test('seller net proceeds matches the published calculator defaults', () => {
  const r = sellerNetProceeds({salePrice: 300000, loanPayoff: 150000});
  assert.deepEqual(r, {titlePremium: 1768, titleCost: 1768, taxCredit: 0, commissionCost: 18000, net: 129882});
  assert.equal(sellerNetProceeds({salePrice: 300000, buyerPaysTitle: true}).titleCost, 0);
});
test('buyer closing costs add up the estimator line items', () => {
  const r = buyerClosingCosts({price: 300000, loanAmount: 240000, ratePercent: 6, closingDate: '', annualTax: 6900});
  // 2,400 origination + 550 + 600 + 100 loan policy + 75 + 1,800 insurance + 2,175 escrow
  assert.equal(r.subtotal, 7700);
  assert.equal(r.net, 7700);
});
test('rental NOI with Investment Property defaults', () => {
  const r = rentalNoi({monthlyRent: 2000, vacancyPercent: 10.6, managementPercent: 8.5, maintenancePercent: 5, tax: 6900, insurance: landlordInsuranceDefault('mcallen')});
  assert.equal(r.noi.toFixed(2), '9732.24');
});
