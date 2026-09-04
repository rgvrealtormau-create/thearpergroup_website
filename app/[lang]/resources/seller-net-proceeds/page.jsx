import { sellerNetProceeds, resources } from '../../../../lib/content';
import { BUSINESS, pageAlternates, breadcrumbSchema } from '../../../../lib/site';
import JsonLd from '../../../../components/JsonLd';
import SellerNetProceeds from '../../../../components/SellerNetProceeds';

export async function generateMetadata({ params }) {
  const c = sellerNetProceeds[params.lang];
  return { title: c.metaTitle, description: c.metaDesc, alternates: pageAlternates(params.lang, 'resources/seller-net-proceeds') };
}

export default function SellerNetProceedsPage({ params }) {
  const lang = params.lang;
  const c = sellerNetProceeds[lang];

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: c.faqs.map((f) => ({
      '@type': 'Question', name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  const breadcrumb = breadcrumbSchema([
    { name: lang === 'es' ? 'Inicio' : 'Home', url: `${BUSINESS.url}/${lang}` },
    { name: resources[lang].title, url: `${BUSINESS.url}/${lang}/resources` },
    { name: c.title, url: `${BUSINESS.url}/${lang}/resources/seller-net-proceeds` },
  ]);

  return (
    <>
      <JsonLd data={faqSchema} />
      <JsonLd data={breadcrumb} />
      <section className="bg-petrol text-cream">
        <div className="wrap py-16 md:py-20">
          <p className="text-sm text-cream/70">{c.kicker}</p>
          <h1 className="mt-3 max-w-3xl text-4xl md:text-6xl italic">{c.title}</h1>
          <p className="mt-5 max-w-2xl text-lg text-cream/85">{c.lede}</p>
        </div>
      </section>

      <section className="wrap py-16 md:py-20">
        <SellerNetProceeds lang={lang} copy={c} />
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
