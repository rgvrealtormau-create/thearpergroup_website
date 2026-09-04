'use client';

import { useEffect, useMemo, useState } from 'react';
import { cities, citySlugs } from '../lib/content';
import { WEB3FORMS_ACCESS_KEY } from '../lib/site';

// Typical combined property-tax rate by area (annual, as a fraction of price).
// Kept in sync with the same constants in MortgageCalculator.jsx.
const AREA_TAX_RATES = {
  mcallen: 0.023, edinburg: 0.023, mission: 0.023, pharr: 0.023, weslaco: 0.023, mercedes: 0.023,
  harlingen: 0.02, 'san-benito': 0.02, brownsville: 0.02, 'south-padre-island': 0.02,
  other: 0.022,
};

function taxRateFor(city) {
  return AREA_TAX_RATES[city] ?? AREA_TAX_RATES.other;
}

// Texas' promulgated (state-set) basic premium rate for an owner's title
// policy, effective March 1, 2026 (tdi.texas.gov/title/titlerates2026.html).
// $25,000–$100,000 is linearly interpolated from the published table
// ($25,000 → $308, $100,000 → $780); above $100,000 uses TDI's published
// tiered formula. This is the same statewide rate at every title company.
function ownerTitlePremium(amount) {
  if (amount <= 0) return 0;
  if (amount <= 25000) return 308;
  if (amount <= 100000) return Math.round(308 + (amount - 25000) * ((780 - 308) / 75000));
  if (amount <= 1000000) return Math.round(780 + (amount - 100000) * 0.00494);
  if (amount <= 5000000) return Math.round(5226 + (amount - 1000000) * 0.00406);
  return Math.round(21466 + (amount - 5000000) * 0.00335);
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function round1(n) {
  return Math.round(n * 10) / 10;
}

function defaultClosingDate() {
  const d = new Date();
  d.setDate(d.getDate() + 45);
  return d.toISOString().slice(0, 10);
}

// Seller's prorated share of the current year's property tax, credited to
// the buyer at closing (Texas taxes are billed for the full calendar year,
// so the seller covers Jan 1 through the closing date).
function taxProration(annualTax, closingDateStr) {
  if (!closingDateStr || !annualTax) return 0;
  const closing = new Date(`${closingDateStr}T00:00:00`);
  if (isNaN(closing.getTime())) return 0;
  const yearStart = new Date(closing.getFullYear(), 0, 1);
  const yearEnd = new Date(closing.getFullYear() + 1, 0, 1);
  const daysInYear = Math.round((yearEnd - yearStart) / 86400000);
  const dayOfYear = Math.round((closing - yearStart) / 86400000) + 1;
  return Math.round((annualTax * Math.min(Math.max(dayOfYear, 0), daysInYear)) / daysInYear);
}

export default function SellerNetProceeds({ lang, copy }) {
  const L = copy.labels;
  const R = copy.results;

  const [salePrice, setSalePrice] = useState(300000);
  const [loanPayoff, setLoanPayoff] = useState(0);
  const [commissionPercent, setCommissionPercent] = useState(5.9);
  const [city, setCity] = useState('mcallen');
  const [closingDate, setClosingDate] = useState('');
  const [buyerPaysTitle, setBuyerPaysTitle] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [annualTax, setAnnualTax] = useState(() => Math.round(300000 * taxRateFor('mcallen')));
  const [taxTouched, setTaxTouched] = useState(false);
  const [hoaFee, setHoaFee] = useState(0);
  const [homeWarranty, setHomeWarranty] = useState(0);
  const [closingFees, setClosingFees] = useState(350);

  // Closing date defaults to ~45 days out, set client-side only to avoid a
  // build-time vs. render-time date mismatch.
  useEffect(() => {
    if (!closingDate) setClosingDate(defaultClosingDate());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!taxTouched) setAnnualTax(Math.round(salePrice * taxRateFor(city)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salePrice, city]);

  const cityName = city === 'other' ? L.otherCity : cities[city]?.[lang]?.name ?? city;
  const titlePremium = useMemo(() => ownerTitlePremium(salePrice), [salePrice]);
  const titleCost = buyerPaysTitle ? 0 : titlePremium;
  const taxCredit = useMemo(() => taxProration(annualTax, closingDate), [annualTax, closingDate]);
  const commissionCost = Math.round((salePrice * commissionPercent) / 100);

  const netProceeds =
    salePrice - loanPayoff - commissionCost - titleCost - taxCredit - hoaFee - homeWarranty - closingFees;

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
      `Sale price: ${usd.format(salePrice)}`,
      `Loan payoff: ${usd.format(loanPayoff)}`,
      `Commission: ${usd.format(commissionCost)} (${round1(commissionPercent)}%)`,
      `City: ${cityName}`,
      `Closing date: ${closingDate}`,
      `Owner's title policy: ${buyerPaysTitle ? 'buyer-paid' : usd.format(titlePremium)}`,
      `Property tax credit to buyer: ${usd.format(taxCredit)}`,
      `HOA fee: ${usd.format(hoaFee)}, Home warranty: ${usd.format(homeWarranty)}, Closing/recording fees: ${usd.format(closingFees)}`,
      `Estimated net proceeds: ${usd.format(netProceeds)}`,
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
          subject: 'Seller net proceeds calculator lead',
          from_name: 'The Arper Group website',
          page: 'Seller net proceeds calculator',
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
              type="number"
              min="0"
              step="1000"
              value={salePrice}
              onChange={(e) => setSalePrice(Math.max(Number(e.target.value) || 0, 0))}
              className="w-full rounded-sm border border-black/20 bg-white py-2 pl-7 pr-3"
            />
          </div>
        </label>

        <label className="grid gap-1 text-sm">
          <span>{L.loanPayoff}</span>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
            <input
              type="number"
              min="0"
              step="1000"
              value={loanPayoff}
              onChange={(e) => setLoanPayoff(Math.max(Number(e.target.value) || 0, 0))}
              className="w-full rounded-sm border border-black/20 bg-white py-2 pl-7 pr-3"
            />
          </div>
        </label>

        <label className="grid gap-1 text-sm">
          <span>{L.commission}</span>
          <div className="relative max-w-[10rem]">
            <input
              type="number"
              min="0"
              step="0.1"
              value={commissionPercent}
              onChange={(e) => setCommissionPercent(Math.max(Number(e.target.value) || 0, 0))}
              className="w-full rounded-sm border border-black/20 bg-white py-2 pl-3 pr-7"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink/50">%</span>
          </div>
          <span className="text-xs text-ink/50">{copy.commissionNote}</span>
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

        <label className="grid gap-1 text-sm">
          <span>{L.closingDate}</span>
          <input
            type="date"
            value={closingDate}
            onChange={(e) => setClosingDate(e.target.value)}
            className="w-full max-w-[14rem] rounded-sm border border-black/20 bg-white px-3 py-2"
          />
        </label>

        <div className="grid gap-2 rounded-sm border border-ink/10 bg-cream/40 p-4 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span>{L.titleInsurance}</span>
            <span className="font-medium text-ink">{buyerPaysTitle ? usd.format(0) : usd.format(titlePremium)}</span>
          </div>
          <span className="text-xs text-ink/50">{copy.titleNote.replace('{price}', usd.format(salePrice))}</span>
          <label className="mt-1 flex items-center gap-2 text-xs text-ink/70">
            <input
              type="checkbox"
              checked={buyerPaysTitle}
              onChange={(e) => setBuyerPaysTitle(e.target.checked)}
              className="h-4 w-4"
            />
            {L.buyerPaysTitle}
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
                <span>{L.annualTax}</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
                  <input
                    type="number"
                    min="0"
                    value={Math.round(annualTax)}
                    onChange={(e) => {
                      setAnnualTax(Math.max(Number(e.target.value) || 0, 0));
                      setTaxTouched(true);
                    }}
                    className="w-full rounded-sm border border-black/20 bg-white py-2 pl-7 pr-3"
                  />
                </div>
                {!taxTouched && (
                  <span className="text-xs text-ink/50">{copy.taxNote.replace('{city}', cityName)}</span>
                )}
              </label>

              <label className="grid gap-1 text-sm">
                <span>{L.hoaFee}</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
                  <input
                    type="number"
                    min="0"
                    value={hoaFee}
                    onChange={(e) => setHoaFee(Math.max(Number(e.target.value) || 0, 0))}
                    className="w-full rounded-sm border border-black/20 bg-white py-2 pl-7 pr-3"
                  />
                </div>
              </label>

              <label className="grid gap-1 text-sm">
                <span>{L.homeWarranty}</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
                  <input
                    type="number"
                    min="0"
                    value={homeWarranty}
                    onChange={(e) => setHomeWarranty(Math.max(Number(e.target.value) || 0, 0))}
                    className="w-full rounded-sm border border-black/20 bg-white py-2 pl-7 pr-3"
                  />
                </div>
                <span className="text-xs text-ink/50">{copy.warrantyNote}</span>
              </label>

              <label className="grid gap-1 text-sm">
                <span>{L.closingFees}</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
                  <input
                    type="number"
                    min="0"
                    value={closingFees}
                    onChange={(e) => setClosingFees(Math.max(Number(e.target.value) || 0, 0))}
                    className="w-full rounded-sm border border-black/20 bg-white py-2 pl-7 pr-3"
                  />
                </div>
                <span className="text-xs text-ink/50">{copy.closingFeesNote}</span>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="lg:sticky lg:top-24">
        <div className="rounded-sm border border-ink/10 bg-cream p-6 shadow-sm md:p-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-petrol">{R.title}</p>
          <p className="mt-3 font-display text-4xl md:text-5xl">{usd.format(Math.max(netProceeds, 0))}</p>

          <div className="mt-6 divide-y divide-ink/10 text-sm">
            <Row label={R.salePrice} value={usd.format(salePrice)} />
            {loanPayoff > 0 && <Row label={`– ${R.loanPayoff}`} value={usd.format(loanPayoff)} />}
            {commissionCost > 0 && <Row label={`– ${R.commission}`} value={usd.format(commissionCost)} />}
            {titleCost > 0 && <Row label={`– ${R.titleInsurance}`} value={usd.format(titleCost)} />}
            {taxCredit > 0 && <Row label={`– ${R.taxCredit}`} value={usd.format(taxCredit)} />}
            {hoaFee > 0 && <Row label={`– ${R.hoaFee}`} value={usd.format(hoaFee)} />}
            {homeWarranty > 0 && <Row label={`– ${R.homeWarranty}`} value={usd.format(homeWarranty)} />}
            {closingFees > 0 && <Row label={`– ${R.closingFees}`} value={usd.format(closingFees)} />}
          </div>

          <div className="mt-6 border-t border-ink/10 pt-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium text-ink">{R.net}</span>
              <span className="font-display text-xl text-petrol">{usd.format(Math.max(netProceeds, 0))}</span>
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
