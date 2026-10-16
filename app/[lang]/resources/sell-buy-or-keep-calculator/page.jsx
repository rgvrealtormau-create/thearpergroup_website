import { sellBuyKeep } from '../../../../lib/content';
import { getMortgageRates } from '../../../../lib/fred';
import SellBuyKeepCalculator from '../../../../components/SellBuyKeepCalculator';

// Review build: noindexed, left out of app/sitemap.js and the
// /resources cards until Mauricio signs off. FAQ/breadcrumb schema land in Pass 3.
export async function generateMetadata({ params }) {
  const c = sellBuyKeep[params.lang];
  return { title: c.metaTitle, description: c.metaDesc, robots: { index: false, follow: false } };
}

export default async function SellBuyKeepPage({ params }) {
  const lang = params.lang;
  const c = sellBuyKeep[lang];
  const rates = await getMortgageRates();

  return (
    <>
      <section className="bg-petrol text-cream">
        <div className="wrap py-16 md:py-20">
          <p className="text-sm text-cream/70">{c.kicker}</p>
          <h1 className="mt-3 max-w-3xl text-4xl md:text-6xl italic">{c.title}</h1>
          <p className="mt-5 max-w-2xl text-lg text-cream/85">{c.lede}</p>
        </div>
      </section>

      <section className="wrap py-16 md:py-20">
        <SellBuyKeepCalculator lang={lang} copy={c} rates={rates} />
      </section>

      <section className="bg-cream">
        <div className="wrap py-16 md:py-20">
          <h2 className="text-3xl md:text-4xl">{c.faqTitle}</h2>
          <div className="mt-8 max-w-3xl divide-y divide-ink/15">
            {c.faqs.map((f) => (
              <div key={f.q} className="py-5">
                <h3 className="font-display text-xl">{f.q}</h3>
                <p className="mt-2 text-ink/80">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
