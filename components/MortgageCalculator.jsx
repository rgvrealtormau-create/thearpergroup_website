'use client';

import { useEffect, useMemo, useState } from 'react';
import { cities, citySlugs } from '../lib/content';
import { WEB3FORMS_ACCESS_KEY } from '../lib/site';

// Typical combined property-tax rate by area (annual, as a fraction of price).
const AREA_TAX_RATES = {
  mcallen: 0.023, edinburg: 0.023, mission: 0.023, pharr: 0.023, weslaco: 0.023, mercedes: 0.023,
  harlingen: 0.02, 'san-benito': 0.02, brownsville: 0.02, 'south-padre-island': 0.02,
  other: 0.022,
};

const PMI_ANNUAL_RATE = 0.0055;

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const usd2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

function taxRateFor(city) {
  return AREA_TAX_RATES[city] ?? AREA_TAX_RATES.other;
}

export default function MortgageCalculator({ lang, copy, rates }) {
  const L = copy.labels;
  const R = copy.results;

  const [homePrice, setHomePrice] = useState(300000);
  const [downPercent, setDownPercent] = useState(20);
  const [downMode, setDownMode] = useState('percent');
  const [rate, setRate] = useState(rates.rate30);
  const [rateTouched, setRateTouched] = useState(false);
  const [term, setTerm] = useState(30);
  const [city, setCity] = useState('mcallen');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tax, setTax] = useState(() => Math.round(300000 * taxRateFor('mcallen')));
  const [taxTouched, setTaxTouched] = useState(false);
  const [insurance, setInsurance] = useState(1800);
  const [hoa, setHoa] = useState(0);
  const [pmi, setPmi] = useState(0);
  const [pmiTouched, setPmiTouched] = useState(false);

  const downDollar = useMemo(() => Math.round((homePrice * downPercent) / 100), [homePrice, downPercent]);

  // Property tax defaults to home price x the area rate, until the field is edited by hand.
  useEffect(() => {
    setTax(Math.round(homePrice * taxRateFor(city)));
    setTaxTouched(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city]);

  useEffect(() => {
    if (!taxTouched) setTax(Math.round(homePrice * taxRateFor(city)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homePrice]);

  // PMI auto-applies under 20% down, until the field is edited by hand.
  useEffect(() => {
    if (!pmiTouched) {
      const loanAmount = Math.max(homePrice - downDollar, 0);
      setPmi(downPercent < 20 ? Math.round(loanAmount * PMI_ANNUAL_RATE) : 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homePrice, downDollar, downPercent, pmiTouched]);

  function handleTermChange(nextTerm) {
    setTerm(nextTerm);
    if (!rateTouched) {
      const nextRate = nextTerm === 30 ? rates.rate30 : nextTerm === 15 ? rates.rate15 : Math.round(((rates.rate30 + rates.rate15) / 2) * 100) / 100;
      setRate(nextRate);
    }
  }

  // Amortization math
  const loanAmount = Math.max(homePrice - downDollar, 0);
  const monthlyRate = rate / 100 / 12;
  const numPayments = term * 12;
  let principalInterest;
  if (!numPayments) {
    principalInterest = 0;
  } else if (monthlyRate === 0) {
    principalInterest = loanAmount / numPayments;
  } else {
    const factor = (1 + monthlyRate) ** numPayments;
    principalInterest = factor > 1 ? (loanAmount * (monthlyRate * factor)) / (factor - 1) : loanAmount / numPayments;
  }
  if (!isFinite(principalInterest) || isNaN(principalInterest)) principalInterest = 0;

  const monthlyTax = tax / 12;
  const monthlyInsurance = insurance / 12;
  const monthlyHoa = hoa;
  const monthlyPmi = pmi / 12;
  const totalMonthly = principalInterest + monthlyTax + monthlyInsurance + monthlyHoa + monthlyPmi;
  const totalInterest = Math.max(principalInterest * numPayments - loanAmount, 0);

  const cityName = city === 'other' ? L.otherCity : cities[city]?.[lang]?.name ?? city;
  const rateNoteText = rates.live && !rateTouched && term !== 20
    ? copy.rateNote.replace('{date}', formatDate(rates.asOfDate, lang))
    : null;
  const taxNoteText = !taxTouched ? copy.taxNote.replace('{city}', cityName) : null;

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
      `Home price: ${usd.format(homePrice)}`,
      `Down payment: ${usd.format(downDollar)} (${round1(downPercent)}%)`,
      `Rate: ${rate}% / ${term} yr`,
      `City: ${cityName}`,
      `Principal & interest: ${usd2.format(principalInterest)}/mo`,
      `Taxes: ${usd2.format(monthlyTax)}/mo, Insurance: ${usd2.format(monthlyInsurance)}/mo, PMI: ${usd2.format(monthlyPmi)}/mo, HOA: ${usd2.format(monthlyHoa)}/mo`,
      `Estimated total monthly payment: ${usd2.format(totalMonthly)}`,
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
          subject: 'Mortgage calculator lead',
          from_name: 'The Arper Group website',
          page: 'Mortgage calculator',
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
          <span>{L.homePrice}</span>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
            <input
              type="number"
              min="0"
              step="1000"
              value={homePrice}
              onChange={(e) => setHomePrice(Math.max(Number(e.target.value) || 0, 0))}
              className="w-full rounded-sm border border-black/20 bg-white py-2 pl-7 pr-3"
            />
          </div>
        </label>

        <div className="grid gap-1 text-sm">
          <span>{L.downPayment}</span>
          <div className="flex gap-2">
            <div className="relative flex-1">
              {downMode === 'dollar' && (
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
              )}
              <input
                type="number"
                min="0"
                step={downMode === 'percent' ? '1' : '1000'}
                value={downMode === 'percent' ? round1(downPercent) : downDollar}
                onChange={(e) => {
                  const v = Math.max(Number(e.target.value) || 0, 0);
                  if (downMode === 'percent') setDownPercent(v);
                  else setDownPercent(homePrice > 0 ? (v / homePrice) * 100 : 0);
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
                onClick={() => setDownMode('percent')}
                className={`px-3 ${downMode === 'percent' ? 'bg-petrol text-cream' : 'bg-white text-ink/60 hover:bg-black/5'}`}
              >
                %
              </button>
              <button
                type="button"
                onClick={() => setDownMode('dollar')}
                className={`px-3 ${downMode === 'dollar' ? 'bg-petrol text-cream' : 'bg-white text-ink/60 hover:bg-black/5'}`}
              >
                $
              </button>
            </div>
          </div>
          <span className="text-xs text-ink/50">{usd.format(downDollar)} · {round1(downPercent)}%</span>
        </div>

        <label className="grid gap-1 text-sm">
          <span>{L.interestRate}</span>
          <div className="relative max-w-[10rem]">
            <input
              type="number"
              min="0"
              step="0.01"
              value={rate}
              onChange={(e) => {
                setRate(Math.max(Number(e.target.value) || 0, 0));
                setRateTouched(true);
              }}
              className="w-full rounded-sm border border-black/20 bg-white py-2 pl-3 pr-7"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink/50">%</span>
          </div>
          {rateNoteText && <span className="text-xs text-ink/50">{rateNoteText}</span>}
        </label>

        <div className="grid gap-1 text-sm">
          <span>{L.loanTerm}</span>
          <div className="flex gap-2">
            {[30, 20, 15].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleTermChange(t)}
                className={`rounded-sm border px-4 py-2 text-sm font-medium ${
                  term === t ? 'border-petrol bg-petrol text-cream' : 'border-black/20 bg-white text-ink/70 hover:border-petrol'
                }`}
              >
                {t} {L.yr}
              </button>
            ))}
          </div>
        </div>

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
                <span>{L.propertyTax}</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
                  <input
                    type="number"
                    min="0"
                    value={Math.round(tax)}
                    onChange={(e) => {
                      setTax(Math.max(Number(e.target.value) || 0, 0));
                      setTaxTouched(true);
                    }}
                    className="w-full rounded-sm border border-black/20 bg-white py-2 pl-7 pr-3"
                  />
                </div>
                {taxNoteText && <span className="text-xs text-ink/50">{taxNoteText}</span>}
              </label>

              <label className="grid gap-1 text-sm">
                <span>{L.homeInsurance}</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
                  <input
                    type="number"
                    min="0"
                    value={insurance}
                    onChange={(e) => setInsurance(Math.max(Number(e.target.value) || 0, 0))}
                    className="w-full rounded-sm border border-black/20 bg-white py-2 pl-7 pr-3"
                  />
                </div>
              </label>

              <label className="grid gap-1 text-sm">
                <span>{L.hoa}</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
                  <input
                    type="number"
                    min="0"
                    value={hoa}
                    onChange={(e) => setHoa(Math.max(Number(e.target.value) || 0, 0))}
                    className="w-full rounded-sm border border-black/20 bg-white py-2 pl-7 pr-3"
                  />
                </div>
              </label>

              <label className="grid gap-1 text-sm">
                <span>{L.pmi}</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
                  <input
                    type="number"
                    min="0"
                    value={Math.round(pmi)}
                    onChange={(e) => {
                      setPmi(Math.max(Number(e.target.value) || 0, 0));
                      setPmiTouched(true);
                    }}
                    className="w-full rounded-sm border border-black/20 bg-white py-2 pl-7 pr-3"
                  />
                </div>
                <span className="text-xs text-ink/50">{L.pmiHint}</span>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="lg:sticky lg:top-24">
        <div className="rounded-sm border border-ink/10 bg-cream p-6 shadow-sm md:p-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-petrol">{R.title}</p>
          <p className="mt-3 font-display text-4xl md:text-5xl">
            {usd2.format(totalMonthly)}
            <span className="text-lg text-ink/50">{R.perMonth}</span>
          </p>

          <div className="mt-6 divide-y divide-ink/10 text-sm">
            <Row label={R.principalInterest} value={usd2.format(principalInterest)} />
            <Row label={R.taxes} value={usd2.format(monthlyTax)} />
            <Row label={R.insurance} value={usd2.format(monthlyInsurance)} />
            {monthlyPmi > 0 && <Row label={R.pmi} value={usd2.format(monthlyPmi)} />}
            {monthlyHoa > 0 && <Row label={R.hoa} value={usd2.format(monthlyHoa)} />}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-ink/10 pt-4 text-sm text-ink/70">
            <div>
              <div className="text-xs uppercase tracking-wide text-ink/45">{R.loanAmount}</div>
              <div className="mt-1 font-medium text-ink">{usd.format(loanAmount)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-ink/45">{R.totalInterest}</div>
              <div className="mt-1 font-medium text-ink">{usd.format(totalInterest)}</div>
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

function round1(n) {
  return Math.round(n * 10) / 10;
}

function formatDate(isoDate, lang) {
  if (!isoDate) return '';
  const d = new Date(`${isoDate}T00:00:00`);
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-MX' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(d);
}
