// Shared calculator math. Each /resources calculator used to carry its own
// copy of these; they live here once so a rate or formula change lands
// everywhere. Pure functions over plain numbers — components parse inputs.

// Typical combined property-tax rate by area (annual, as a fraction of price).
export const AREA_TAX_RATES = {
  mcallen: 0.023, edinburg: 0.023, mission: 0.023, pharr: 0.023, weslaco: 0.023, mercedes: 0.023,
  harlingen: 0.02, 'san-benito': 0.02, brownsville: 0.02, 'south-padre-island': 0.02,
  other: 0.022,
};

export function taxRateFor(city) {
  return AREA_TAX_RATES[city] ?? AREA_TAX_RATES.other;
}

// Cameron and Willacy counties (TWIA-designated coastal windstorm zone) vs.
// Hidalgo county (not TWIA-eligible) — tdi.texas.gov / twia.org/coverage-eligibility.
// No city in our list sits in Willacy County, but the same TWIA framing applies there too.
export const TWIA_CITIES = new Set(['harlingen', 'san-benito', 'brownsville', 'south-padre-island']);
export const HIDALGO_CITIES = new Set(['mcallen', 'edinburg', 'mission', 'pharr', 'weslaco', 'mercedes']);

// Statewide landlord-insurance planning range is roughly $1,500-$3,200/yr;
// TWIA-eligible coastal counties trend toward the top of that range.
export function landlordInsuranceDefault(city) {
  if (TWIA_CITIES.has(city)) return 2800;
  if (HIDALGO_CITIES.has(city)) return 1800;
  return 2200;
}

// Default first-year homeowners insurance estimate (owner-occupied).
export const DEFAULT_ANNUAL_INSURANCE = 1800;

export const PMI_ANNUAL_RATE = 0.0055;

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
// as the "standalone" rate for a loan policy under Rate Rule R-5. The same
// statewide rate at every title company.
export function titleBasicPremium(amount) {
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
export const SIMULTANEOUS_LOAN_POLICY_RATE = 100;

export function loanPolicyPremium(loanAmount, ownerAmount) {
  if (loanAmount <= 0) return 0;
  if (loanAmount <= ownerAmount) return SIMULTANEOUS_LOAN_POLICY_RATE;
  return titleBasicPremium(loanAmount) - titleBasicPremium(ownerAmount) + SIMULTANEOUS_LOAN_POLICY_RATE;
}

// Standard fixed-rate amortization: the monthly principal & interest payment.
export function monthlyPI(loanAmount, ratePercent, termYears) {
  const monthlyRate = ratePercent / 100 / 12;
  const numPayments = termYears * 12;
  if (!numPayments) return 0;
  if (monthlyRate === 0) return loanAmount / numPayments;
  const factor = (1 + monthlyRate) ** numPayments;
  const pi = factor > 1 ? (loanAmount * (monthlyRate * factor)) / (factor - 1) : loanAmount / numPayments;
  return isFinite(pi) && !isNaN(pi) ? pi : 0;
}

// Balance left on a fixed-rate loan after `paymentsMade` monthly payments.
export function remainingBalance(loanAmount, ratePercent, termYears, paymentsMade) {
  const totalPayments = termYears * 12;
  const monthlyRate = ratePercent / 100 / 12;
  if (loanAmount <= 0 || paymentsMade >= totalPayments) return 0;
  if (monthlyRate === 0) return Math.max(loanAmount - monthlyPI(loanAmount, ratePercent, termYears) * paymentsMade, 0);
  const factorN = (1 + monthlyRate) ** totalPayments;
  const factorPaid = (1 + monthlyRate) ** paymentsMade;
  return (loanAmount * (factorN - factorPaid)) / (factorN - 1);
}

// ~45 days out — a typical contract-to-close window.
export function defaultClosingDate() {
  const d = new Date();
  d.setDate(d.getDate() + 45);
  return d.toISOString().slice(0, 10);
}

// Seller's prorated share of the current year's property tax, credited to
// the buyer at closing (Texas taxes are billed for the full calendar year,
// so the seller covers Jan 1 through the closing date).
export function taxProration(annualTax, closingDateStr) {
  if (!closingDateStr || !annualTax) return 0;
  const closing = new Date(`${closingDateStr}T00:00:00`);
  if (isNaN(closing.getTime())) return 0;
  const yearStart = new Date(closing.getFullYear(), 0, 1);
  const yearEnd = new Date(closing.getFullYear() + 1, 0, 1);
  const daysInYear = Math.round((yearEnd - yearStart) / 86400000);
  const dayOfYear = Math.round((closing - yearStart) / 86400000) + 1;
  return Math.round((annualTax * Math.min(Math.max(dayOfYear, 0), daysInYear)) / daysInYear);
}

// Per-diem interest from the closing date through the end of that month —
// what most Texas lenders collect at closing before the first regular payment.
export function prepaidInterest(loanAmount, ratePercent, closingDateStr) {
  if (!closingDateStr || loanAmount <= 0 || ratePercent <= 0) return 0;
  const closing = new Date(`${closingDateStr}T00:00:00`);
  if (isNaN(closing.getTime())) return 0;
  const year = closing.getFullYear();
  const month = closing.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayOfMonth = closing.getDate();
  const daysRemaining = Math.max(daysInMonth - dayOfMonth + 1, 0);
  const dailyRate = ratePercent / 100 / 365;
  return Math.round(loanAmount * dailyRate * daysRemaining);
}

export const SELLER_DEFAULTS = { commissionPercent: 6, closingFees: 350 };

// Seller net proceeds: sale price less payoff, commission, the seller-paid
// owner's title policy, the property-tax proration credit and other costs.
export function sellerNetProceeds({
  salePrice, loanPayoff = 0, commissionPercent = SELLER_DEFAULTS.commissionPercent, buyerPaysTitle = false,
  annualTax = 0, closingDate = '', hoaFee = 0, homeWarranty = 0, closingFees = SELLER_DEFAULTS.closingFees, sellerConcessions = 0,
}) {
  const titlePremium = titleBasicPremium(salePrice);
  const titleCost = buyerPaysTitle ? 0 : titlePremium;
  const taxCredit = taxProration(annualTax, closingDate);
  const commissionCost = Math.round((salePrice * commissionPercent) / 100);
  const net = salePrice - loanPayoff - commissionCost - titleCost - taxCredit - hoaFee - homeWarranty - closingFees - sellerConcessions;
  return { titlePremium, titleCost, taxCredit, commissionCost, net };
}

export const BUYER_CLOSING_DEFAULTS = {
  originationPercent: 1, appraisalFee: 550, lenderFees: 600, recordingFees: 75,
  homeInsurance: DEFAULT_ANNUAL_INSURANCE, escrowMonths: 3,
};

// Buyer's closing costs on a financed purchase (excluding the down payment).
export function buyerClosingCosts({
  price, loanAmount, ratePercent, closingDate, annualTax,
  originationPercent = BUYER_CLOSING_DEFAULTS.originationPercent,
  appraisalFee = BUYER_CLOSING_DEFAULTS.appraisalFee,
  lenderFees = BUYER_CLOSING_DEFAULTS.lenderFees,
  recordingFees = BUYER_CLOSING_DEFAULTS.recordingFees,
  homeInsurance = BUYER_CLOSING_DEFAULTS.homeInsurance,
  escrowMonths = BUYER_CLOSING_DEFAULTS.escrowMonths,
  hoaFee = 0, surveyFee = 0, concessions = 0, buyerPaysOwnerPolicy = false,
}) {
  const originationCost = Math.round((loanAmount * originationPercent) / 100);
  const interestCost = prepaidInterest(loanAmount, ratePercent, closingDate);
  const escrowReserve = Math.round(((annualTax + homeInsurance) / 12) * escrowMonths);
  const ownerPolicyPremium = titleBasicPremium(price);
  const subtotal =
    originationCost + appraisalFee + lenderFees + SIMULTANEOUS_LOAN_POLICY_RATE + recordingFees +
    homeInsurance + interestCost + escrowReserve + hoaFee + surveyFee +
    (buyerPaysOwnerPolicy ? ownerPolicyPremium : 0);
  return { originationCost, interestCost, escrowReserve, ownerPolicyPremium, subtotal, net: subtotal - concessions };
}

// Annual rental operating income, before debt service. Management is a share
// of collected (effective) rent; maintenance a share of scheduled rent.
export function rentalNoi({ monthlyRent, vacancyPercent, managementPercent, maintenancePercent, tax, insurance, hoaMonthly = 0 }) {
  const gsi = monthlyRent * 12;
  const vacancyLoss = gsi * (vacancyPercent / 100);
  const egi = gsi - vacancyLoss;
  const managementFee = egi * (managementPercent / 100);
  const maintenanceReserve = gsi * (maintenancePercent / 100);
  const hoaAnnual = hoaMonthly * 12;
  const operatingExpenses = tax + insurance + managementFee + maintenanceReserve + hoaAnnual;
  return { gsi, vacancyLoss, egi, managementFee, maintenanceReserve, hoaAnnual, operatingExpenses, noi: egi - operatingExpenses };
}
