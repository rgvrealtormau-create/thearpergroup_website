import { mortgageCalc } from '../../../../lib/content';
import { getMortgageRates } from '../../../../lib/fred';
import JsonLd from '../../../../components/JsonLd';
import MortgageCalculator from '../../../../components/MortgageCalculator';

export async function generateMetadata({ params }) {
  const c = mortgageCalc[params.lang];
  return { title: c.metaTitle, description: c.metaDesc };
}

export default async function MortgageCalculatorPage({ params }) {
  const lang = params.lang;
  const c = mortgageCalc[lang];
  const rates = await getMortgageRates();

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: c.faqs.map((f) => ({
      '@type': 'Question', name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <>
      <JsonLd data={faqSchema} />
      <section className="bg-petrol text-cream">
        <div className="wrap py-16 md:py-20">
          <p className="text-sm text-cream/70">{c.kicker}</p>
          <h1 className="mt-3 max-w-3xl text-4xl md:text-6xl italic">{c.title}</h1>
          <p className="mt-5 max-w-2xl text-lg text-cream/85">{c.lede}</p>
        </div>
      </section>

      <section className="wrap py-16 md:py-20">
        <MortgageCalculator lang={lang} copy={c} rates={rates} />
      </section>

      <section className="bg-cream">
        <div className="wrap py-16 md:py-20">
          <h2 className="text-3xl md:text-4xl">{c.faqTitle}</h2>
          <div className="mt-8 max-w-3xl divide-y divide-ink/15">
            {c.faqs.map((f) => (
              <div key={f.q} className="py-5">
                <div className="font-display text-xl">{f.q}</div>
                <p className="mt-2 text-ink/80">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
