'use client';

// Sell First / Buy First / Keep It calculator. Runs one set of inputs through
// each path and shows them side by side, with no ranking. Shared math comes
// from lib/calc.js (the same functions the other calculators use); the new
// HELOC, overlap, gap and lender-view math from lib/sell-buy-keep.js.
// The keep-and-rent path still shows sample figures until Pass 2.

import { useEffect, useMemo, useState } from 'react';
import { cities, citySlugs } from '../lib/content';
import {
  taxRateFor, monthlyPI, defaultClosingDate, sellerNetProceeds, buyerClosingCosts,
  DEFAULT_ANNUAL_INSURANCE, PMI_ANNUAL_RATE,
} from '../lib/calc';
import {
  helocMaxLine, helocDraw, overlapCost, gapCost, fannieDepartingResidence, exclusionWindowEnd, LEASEBACK_MAX_DAYS,
} from '../lib/sell-buy-keep';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const usd2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

function num(v) {
  return parseFloat(v) || 0;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

const clean = (v) => v.replace(/[^0-9.]/g, '');
const fill = (s, vars) => Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{${k}}`, v), s);

// Keep-and-rent sample, shown until Pass 2 wires in the Investment Property math.
const KEEP_SAMPLE = {
  rent: 2000, vacancy: 10.6, management: 8.5, maintenance: 5, landlordInsurance: 1800,
  currentTax: 4600, nonHomesteadTax: 6900, yearsLived: 5, horizon: 5, appreciation: 0,
  moveOut: '2026-11-01', piti: 1800, downPayment: 80000, nextPayment: 2887, rentalCashFlow: -289, extraMove: 1500,
};

export default function SellBuyKeepCalculator({ lang, copy, rates }) {
  const L = copy.labels;
  const N = copy.cardNotes;

  // Current home
  const [salePrice, setSalePrice] = useState('300000');
  const [payoff, setPayoff] = useState('150000');
  const [piti, setPiti] = useState('1800');
  const [city, setCity] = useState('mcallen');
  const [hasHomeEquityLoan, setHasHomeEquityLoan] = useState(false);

  // Next home
  const [nextPrice, setNextPrice] = useState('400000');
  const [downPercent, setDownPercent] = useState('20');
  const [rate, setRate] = useState(String(rates.rate30));
  const [rateTouched, setRateTouched] = useState(false);
  const [term, setTerm] = useState(30);
  const [nextCity, setNextCity] = useState('mcallen');
  const [closingCosts, setClosingCosts] = useState('');
  const [closingCostsTouched, setClosingCostsTouched] = useState(false);

  // Selling costs
  const [commissionPercent, setCommissionPercent] = useState('6');
  const [buyerPaysTitle, setBuyerPaysTitle] = useState(false);
  const [closingFees, setClosingFees] = useState('350');
  const [savings, setSavings] = useState('0');

  // Sell first
  const [housingMode, setHousingMode] = useState('temp');
  const [monthsBetween, setMonthsBetween] = useState('0');
  const [tempRent, setTempRent] = useState('0');
  const [storage, setStorage] = useState('0');
  const [extraMove, setExtraMove] = useState('0');
  const [leasebackDays, setLeasebackDays] = useState('0');
  const [leasebackRate, setLeasebackRate] = useState('0');

  // Buy first
  const [helocRate, setHelocRate] = useState('');
  const [helocClosing, setHelocClosing] = useState('0');
  const [interestOnly, setInterestOnly] = useState(true);
  const [helocPayment, setHelocPayment] = useState('');
  const [overlapMonths, setOverlapMonths] = useState('');

  const [tab, setTab] = useState('sell');
  const [closingDate, setClosingDate] = useState('');

  // Closing date (for prepaid interest) is set client-side only to avoid a
  // build-time vs. render-time date mismatch.
  useEffect(() => {
    setClosingDate(defaultClosingDate());
  }, []);

  function handleTermChange(nextTerm) {
    setTerm(nextTerm);
    if (!rateTouched) {
      const nextRate = nextTerm === 30 ? rates.rate30 : nextTerm === 15 ? rates.rate15 : Math.round(((rates.rate30 + rates.rate15) / 2) * 100) / 100;
      setRate(String(nextRate));
    }
  }

  // ---- Next home: payment and closing costs (mortgage + closing cost estimator math)
  const price = num(nextPrice);
  const downDollar = Math.round((price * num(downPercent)) / 100);
  const loanAmount = Math.max(price - downDollar, 0);
  const nextAnnualTax = Math.round(price * taxRateFor(nextCity));
  const estimatedClosing = useMemo(
    () => buyerClosingCosts({ price, loanAmount, ratePercent: num(rate), closingDate, annualTax: nextAnnualTax }).net,
    [price, loanAmount, rate, closingDate, nextAnnualTax]
  );
  useEffect(() => {
    if (!closingCostsTouched) setClosingCosts(String(estimatedClosing));
  }, [estimatedClosing, closingCostsTouched]);
  const buyerClosing = closingCostsTouched ? num(closingCosts) : estimatedClosing;
  const needed = downDollar + buyerClosing;

  const pmiMonthly = num(downPercent) < 20 ? (loanAmount * PMI_ANNUAL_RATE) / 12 : 0;
  const nextPayment = monthlyPI(loanAmount, num(rate), term) + nextAnnualTax / 12 + DEFAULT_ANNUAL_INSURANCE / 12 + pmiMonthly;

  // ---- Current home: net proceeds (Seller Net Proceeds math). The tax
  // proration credit is left out: it depends on a sale date we don't ask for.
  const seller = useMemo(
    () => sellerNetProceeds({
      salePrice: num(salePrice), loanPayoff: num(payoff), commissionPercent: num(commissionPercent),
      buyerPaysTitle, closingFees: num(closingFees),
    }),
    [salePrice, payoff, commissionPercent, buyerPaysTitle, closingFees]
  );
  const net = seller.net;
  const savingsAmt = num(savings);

  // ---- Path 1: sell first
  const gap = gapCost(housingMode === 'leaseback'
    ? { leasebackDays: num(leasebackDays), leasebackDailyRate: num(leasebackRate) }
    : { months: num(monthsBetween), monthlyRent: num(tempRent), monthlyStorage: num(storage), extraMoving: num(extraMove) });
  const sellShort = Math.max(needed - Math.max(net, 0), 0);
  const sellMonthly = housingMode === 'leaseback' ? num(leasebackRate) * 30 : num(tempRent) + num(storage);
  const sellNotes = [
    fill(N.sell.needed, { needed: usd.format(needed) }),
    sellShort > 0
      ? fill(N.sell.short, { net: usd.format(net), short: usd.format(sellShort) })
      : fill(N.sell.covered, { net: usd.format(net), left: usd.format(net - needed) }),
    sellShort > savingsAmt ? fill(N.sell.overSavings, { savings: usd.format(savingsAmt) }) : null,
    housingMode === 'leaseback'
      ? fill(N.sell.leaseback, { days: gap.leasebackDays, rate: usd.format(num(leasebackRate)) })
      : gap.total > 0 ? fill(N.sell.temp, { months: num(monthsBetween) }) : null,
    gap.capped ? N.sell.leasebackCapped : null,
    N.sell.oneMove,
  ].filter(Boolean);

  // ---- Path 2: buy first with a HELOC
  const maxLine = helocMaxLine({ homeValue: num(salePrice), mortgagePayoff: num(payoff), hasHomeEquityLoan });
  const savingsUsed = Math.min(savingsAmt, needed);
  const { draw, shortfall } = helocDraw({ downPayment: downDollar, buyerClosingCosts: buyerClosing, savingsUsed, maxLine });
  const buyNeeds = helocRate === '' && interestOnly ? copy.needs.helocRate
    : !interestOnly && helocPayment === '' ? copy.needs.helocRate
    : overlapMonths === '' ? copy.needs.overlapMonths : null;
  const months = num(overlapMonths);
  const overlap = overlapCost({
    draw, ratePercent: num(helocRate), months, currentPiti: num(piti), helocClosingCosts: num(helocClosing),
  });
  // Without interest-only, the lender's quoted payment replaces the interest figure.
  const helocMonthly = interestOnly ? overlap.monthlyInterest : num(helocPayment);
  const overlapTotal = interestOnly ? overlap.total : num(piti) * months + num(helocPayment) * months + num(helocClosing);
  const buyFromPocket = savingsUsed + shortfall;
  const buyNotes = [
    fill(N.buy.maxLine, { maxLine: usd.format(maxLine ?? 0) }),
    fill(N.buy.draw, { needed: usd.format(needed), savings: usd.format(savingsUsed), draw: usd.format(draw) }),
    shortfall > 0 ? fill(N.buy.short, { short: usd.format(shortfall) }) : null,
    buyFromPocket > savingsAmt ? fill(N.buy.overSavings, { savings: usd.format(savingsAmt) }) : null,
    fill(interestOnly ? N.buy.interest : N.buy.payment, { interest: usd2.format(helocMonthly) }),
    fill(N.buy.afterSale, { net: usd.format(net), draw: usd.format(draw), left: usd.format(net - draw) }),
    N.buy.listed,
  ].filter(Boolean);

  // ---- Path 3: keep and rent (sample until Pass 2)
  const lender = fannieDepartingResidence({ marketRent: KEEP_SAMPLE.rent, pitia: KEEP_SAMPLE.piti });
  const windowEnd = exclusionWindowEnd(KEEP_SAMPLE.moveOut, KEEP_SAMPLE.yearsLived);
  const keepNotes = copy.cardNotes.keep.map((n) => fill(n, {
    rent: usd.format(KEEP_SAMPLE.rent), cashflow: usd.format(KEEP_SAMPLE.rentalCashFlow),
    currentTax: usd.format(KEEP_SAMPLE.currentTax), newTax: usd.format(KEEP_SAMPLE.nonHomesteadTax),
    windowEnd: windowEnd ? formatDate(windowEnd, lang) : '—',
  }));

  const cards = [
    {
      key: 'sell',
      rows: [usd.format(sellShort), usd.format(sellMonthly), usd.format(gap.total), usd.format(nextPayment)],
      notes: sellNotes,
    },
    {
      key: 'buy',
      unavailable: maxLine == null ? copy.helocUnavailable : null,
      needs: buyNeeds,
      rows: [usd.format(buyFromPocket), usd.format(num(piti) + helocMonthly + nextPayment), usd.format(overlapTotal), usd.format(nextPayment)],
      notes: buyNotes,
    },
    {
      key: 'keep',
      sample: true,
      rows: [
        usd.format(KEEP_SAMPLE.downPayment), usd.format(KEEP_SAMPLE.nextPayment + KEEP_SAMPLE.piti),
        usd.format(KEEP_SAMPLE.extraMove + KEEP_SAMPLE.piti), usd.format(KEEP_SAMPLE.nextPayment - KEEP_SAMPLE.rentalCashFlow),
      ],
      notes: keepNotes,
    },
  ];

  const cityName = (slug) => (slug === 'other' ? L.otherCity : cities[slug]?.[lang]?.name ?? slug);
  const rateNoteText = rates.live && !rateTouched && term !== 20 ? copy.rateNote.replace('{date}', formatDate(rates.asOfDate, lang)) : null;

  return (
    <div className="grid gap-12">
      <p className="rounded-sm border border-gold/60 bg-gold/15 p-4 text-sm text-ink/80">{copy.mockBanner}</p>

      {/* Shared inputs */}
      <div className="grid gap-10 md:grid-cols-2">
        <Group title={copy.sections.current}>
          <Money label={L.salePrice} value={salePrice} onChange={setSalePrice} />
          <Money label={L.payoff} value={payoff} onChange={setPayoff} />
          <Money label={L.piti} value={piti} onChange={setPiti} />
          <CitySelect label={L.city} value={city} onChange={setCity} lang={lang} otherLabel={cityName('other')} />
          <YesNo label={L.homeEquityLoan} value={hasHomeEquityLoan} onChange={setHasHomeEquityLoan} yes={L.yes} no={L.no} />
        </Group>

        <Group title={copy.sections.next}>
          <Money label={L.nextPrice} value={nextPrice} onChange={setNextPrice} />
          <Percent label={L.downPayment} value={downPercent} onChange={setDownPercent} note={`${usd.format(downDollar)} · ${round1(num(downPercent))}%`} />
          <Percent label={L.rate} value={rate} onChange={(v) => { setRate(v); setRateTouched(true); }} note={rateNoteText} />
          <div className="grid gap-1 text-sm">
            <span>{L.term}</span>
            <div className="flex gap-2">
              {[30, 20, 15].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTermChange(t)}
                  className={`rounded-sm border px-4 py-2 text-sm font-medium ${term === t ? 'border-petrol bg-petrol text-cream' : 'border-black/20 bg-white text-ink/70 hover:border-petrol'}`}
                >
                  {t} {L.yr}
                </button>
              ))}
            </div>
          </div>
          <CitySelect label={L.nextCity} value={nextCity} onChange={setNextCity} lang={lang} otherLabel={cityName('other')} />
          <Money
            label={L.buyerClosingCosts}
            value={closingCosts}
            onChange={(v) => { setClosingCosts(v); setClosingCostsTouched(true); }}
            note={closingCostsTouched ? null : copy.closingCostsNote}
          />
        </Group>

        <Group title={copy.sections.selling}>
          <Percent label={L.commission} value={commissionPercent} onChange={setCommissionPercent} />
          <div className="grid gap-2 rounded-sm border border-ink/10 bg-cream/40 p-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span>{L.titlePolicy}</span>
              <span className="font-medium text-ink">{usd.format(seller.titleCost)}</span>
            </div>
            <span className="text-xs text-ink/50">{copy.titleNote.replace('{price}', usd.format(num(salePrice)))}</span>
            <label className="mt-1 flex items-center gap-2 text-xs text-ink/70">
              <input type="checkbox" checked={buyerPaysTitle} onChange={(e) => setBuyerPaysTitle(e.target.checked)} className="h-4 w-4" />
              {L.buyerPaysTitle}
            </label>
          </div>
          <Money label={L.closingFees} value={closingFees} onChange={setClosingFees} />
        </Group>

        <Group title={copy.sections.savings}>
          <Money label={L.savings} value={savings} onChange={setSavings} />
        </Group>
      </div>

      {/* Path tabs */}
      <div>
        <div role="tablist" className="flex flex-wrap gap-2">
          {['sell', 'buy', 'keep'].map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              type="button"
              onClick={() => setTab(k)}
              className={`rounded-sm border px-4 py-2 text-sm font-medium ${tab === k ? 'border-petrol bg-petrol text-cream' : 'border-black/20 bg-white text-ink/70 hover:border-petrol'}`}
            >
              {copy.tabs[k]}
            </button>
          ))}
        </div>
        <p className="mt-4 max-w-3xl text-sm text-ink/70">{copy.tabIntro[tab]}</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tab === 'sell' && (
            <>
              <div className="grid content-start gap-1 text-sm sm:col-span-2 lg:col-span-3">
                <span>{L.housingMode}</span>
                <div className="flex flex-wrap gap-2">
                  {[['temp', L.modeTemp], ['leaseback', L.modeLeaseback]].map(([k, label]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setHousingMode(k)}
                      className={`rounded-sm border px-4 py-2 text-sm font-medium ${housingMode === k ? 'border-petrol bg-petrol text-cream' : 'border-black/20 bg-white text-ink/70 hover:border-petrol'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {housingMode === 'temp' ? (
                <>
                  <Plain label={L.monthsBetween} value={monthsBetween} onChange={setMonthsBetween} />
                  <Money label={L.tempRent} value={tempRent} onChange={setTempRent} />
                  <Money label={L.storage} value={storage} onChange={setStorage} />
                  <Money label={L.extraMove} value={extraMove} onChange={setExtraMove} />
                </>
              ) : (
                <>
                  <Plain
                    label={L.leasebackDays}
                    value={leasebackDays}
                    onChange={(v) => setLeasebackDays(num(v) > LEASEBACK_MAX_DAYS ? String(LEASEBACK_MAX_DAYS) : v)}
                    note={copy.leasebackNote}
                  />
                  <Money label={L.leasebackRate} value={leasebackRate} onChange={setLeasebackRate} />
                </>
              )}
            </>
          )}
          {tab === 'buy' && (
            <>
              <Percent label={L.helocRate} value={helocRate} onChange={setHelocRate} note={copy.helocRateNote} />
              <Money label={L.helocClosing} value={helocClosing} onChange={setHelocClosing} />
              <Plain label={L.overlapMonths} value={overlapMonths} onChange={setOverlapMonths} note={copy.overlapNote} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={interestOnly} onChange={(e) => setInterestOnly(e.target.checked)} className="h-4 w-4" />
                {L.interestOnly}
              </label>
              {!interestOnly && <Money label={L.helocPayment} value={helocPayment} onChange={setHelocPayment} note={copy.helocPaymentNote} />}
              <p className="text-xs text-ink/50 sm:col-span-2 lg:col-span-3">{copy.bridgeNote}</p>
            </>
          )}
          {tab === 'keep' && (
            <>
              <Static label={L.rent} value={usd.format(KEEP_SAMPLE.rent)} note={copy.rentNote} />
              <Static label={L.vacancy} value={`${KEEP_SAMPLE.vacancy}%`} />
              <Static label={L.management} value={`${KEEP_SAMPLE.management}%`} />
              <Static label={L.maintenance} value={`${KEEP_SAMPLE.maintenance}%`} />
              <Static label={L.landlordInsurance} value={usd.format(KEEP_SAMPLE.landlordInsurance)} />
              <Static label={L.currentTax} value={usd.format(KEEP_SAMPLE.currentTax)} />
              <Static label={L.nonHomesteadTax} value={usd.format(KEEP_SAMPLE.nonHomesteadTax)} note={copy.nonHomesteadNote.replace('{city}', cityName(city))} />
              <Static label={L.downFrom} value={L.fromSavings} />
              <Static label={L.yearsLived} value={KEEP_SAMPLE.yearsLived} />
              <Static label={L.horizon} value={KEEP_SAMPLE.horizon} />
              <Static label={L.appreciation} value={`${KEEP_SAMPLE.appreciation}%`} note={copy.appreciationNote} />
            </>
          )}
        </div>
      </div>

      {/* Results: same four rows on every card, no ranking or winner styling */}
      <div>
        <h2 className="font-display text-2xl md:text-3xl">{copy.resultsTitle}</h2>
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {cards.map((card) => (
            <div key={card.key} className="flex flex-col rounded-sm border border-ink/10 bg-cream p-6 shadow-sm">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-petrol">{copy.tabs[card.key]}</p>
                {card.sample && <span className="text-[11px] uppercase tracking-wide text-ink/45">{copy.sample}</span>}
              </div>
              {card.unavailable || card.needs ? (
                <p className="mt-4 text-sm text-ink/80">{card.unavailable || card.needs}</p>
              ) : (
                <>
                  <div className="mt-4 divide-y divide-ink/10 text-sm">
                    <Row label={copy.rows.cashAtClosing} value={card.rows[0]} />
                    <Row label={copy.rows.monthlyDuring} value={card.rows[1]} />
                    <Row label={copy.rows.totalMove} value={card.rows[2]} />
                    <Row label={copy.rows.ongoing} value={card.rows[3]} />
                  </div>
                  <ul className="mt-5 grid gap-2 text-xs text-ink/60">
                    {card.notes.map((n) => <li key={n}>{n}</li>)}
                  </ul>
                </>
              )}
              {card.key === 'keep' && (
                <div className="mt-5 border-t border-ink/10 pt-4 text-xs text-ink/70">
                  <p className="font-medium text-ink">{copy.lenderView.title}</p>
                  <p className="mt-2">{fill(copy.lenderView.body, { rent: usd.format(KEEP_SAMPLE.rent), piti: usd.format(KEEP_SAMPLE.piti), adjusted: usd.format(lender.adjusted) })}</p>
                  <p className="mt-2">{lender.treatment === 'debt' ? copy.lenderView.debt : copy.lenderView.offset}</p>
                  {lender.reserves > 0 && <p className="mt-2">{copy.lenderView.reserves.replace('{reserves}', usd.format(lender.reserves))}</p>}
                  <p className="mt-2 text-ink/50">{copy.lenderView.caveat}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="mt-6 max-w-3xl text-xs text-ink/50">{copy.disclaimer}</p>
        <div className="mt-6 max-w-md">
          <button type="button" disabled className="w-full rounded-sm bg-gold px-5 py-3 text-sm font-medium text-ink opacity-70">{copy.leadCta}</button>
          <p className="mt-2 text-xs text-ink/50">{copy.leadPending}</p>
        </div>
      </div>

      {/* Things to know in Texas */}
      <div className="border-t border-ink/10 pt-10">
        <h2 className="font-display text-2xl md:text-3xl">{copy.thingsTitle}</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {copy.things.map((t) => (
            <div key={t.h}>
              <h3 className="font-display text-lg">{t.h}</h3>
              <p className="mt-1 text-sm text-ink/75">{t.p}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-sm border border-ink/15 bg-cream/40 p-6">
        <h2 className="font-display text-xl">{copy.contingent.title}</h2>
        <p className="mt-2 max-w-3xl text-sm text-ink/75">{copy.contingent.body}</p>
      </div>
    </div>
  );
}

function Group({ title, children }) {
  return (
    <div className="grid content-start gap-5">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink/50">{title}</p>
      {children}
    </div>
  );
}

function Note({ children }) {
  return children ? <span className="text-xs text-ink/50">{children}</span> : null;
}

function Money({ label, value, onChange, note }) {
  return (
    <label className="grid content-start gap-1 text-sm">
      <span>{label}</span>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">$</span>
        <input inputMode="decimal" value={value} onChange={(e) => onChange(clean(e.target.value))} className="w-full rounded-sm border border-black/20 bg-white py-2 pl-7 pr-3" />
      </div>
      <Note>{note}</Note>
    </label>
  );
}

function Percent({ label, value, onChange, note }) {
  return (
    <label className="grid content-start gap-1 text-sm">
      <span>{label}</span>
      <div className="relative max-w-[10rem]">
        <input inputMode="decimal" value={value} onChange={(e) => onChange(clean(e.target.value))} className="w-full rounded-sm border border-black/20 bg-white py-2 pl-3 pr-7" />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink/50">%</span>
      </div>
      <Note>{note}</Note>
    </label>
  );
}

function Plain({ label, value, onChange, note }) {
  return (
    <label className="grid content-start gap-1 text-sm">
      <span>{label}</span>
      <input inputMode="decimal" value={value} onChange={(e) => onChange(clean(e.target.value))} className="w-full max-w-[10rem] rounded-sm border border-black/20 bg-white px-3 py-2" />
      <Note>{note}</Note>
    </label>
  );
}

function Static({ label, value, note }) {
  return (
    <label className="grid content-start gap-1 text-sm">
      <span>{label}</span>
      <input readOnly value={value} className="w-full rounded-sm border border-black/10 bg-cream/40 px-3 py-2 text-ink/60" />
      <Note>{note}</Note>
    </label>
  );
}

function CitySelect({ label, value, onChange, lang, otherLabel }) {
  return (
    <label className="grid gap-1 text-sm">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-sm border border-black/20 bg-white px-3 py-2">
        {citySlugs.map((slug) => (
          <option key={slug} value={slug}>{cities[slug][lang].name}</option>
        ))}
        <option value="other">{otherLabel}</option>
      </select>
    </label>
  );
}

function YesNo({ label, value, onChange, yes, no }) {
  return (
    <div className="grid gap-1 text-sm">
      <span>{label}</span>
      <div className="flex gap-2">
        {[[false, no], [true, yes]].map(([v, text]) => (
          <button
            key={text}
            type="button"
            onClick={() => onChange(v)}
            className={`rounded-sm border px-4 py-2 text-sm font-medium ${value === v ? 'border-petrol bg-petrol text-cream' : 'border-black/20 bg-white text-ink/70 hover:border-petrol'}`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-ink/70">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}

function formatDate(isoDate, lang) {
  if (!isoDate) return '';
  const d = new Date(`${isoDate}T00:00:00`);
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-MX' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(d);
}
