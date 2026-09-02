import Link from 'next/link';
import { ftb } from '../../../../lib/content';
import { searchUrl } from '../../../../lib/site';
import JsonLd from '../../../../components/JsonLd';

export async function generateMetadata({ params }) {
  const c = ftb[params.lang];
  return { title: c.metaTitle, description: c.metaDesc };
}

export default function FirstTimeBuyers({ params }) {
  const lang = params.lang;
  const c = ftb[lang];
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
      <section className="bg-forest text-cream">
        <div className="wrap py-20">
          <h1 className="max-w-3xl text-4xl md:text-6xl italic">{c.title}</h1>
          <p className="mt-6 max-w-2xl text-lg text-cream/85">{c.lede}</p>
        </div>
      </section>

      <section className="wrap py-16 md:py-20">
        <div className="grid gap-10">
          {c.blocks.map((b) => (
            <div key={b.h} className="max-w-3xl border-l-2 border-gold pl-5">
              <h2 className="text-2xl md:text-3xl">{b.h}</h2>
              <p className="mt-3 text-ink/80">{b.b}</p>
            </div>
          ))}
        </div>
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

      <section className="wrap py-16 md:py-20">
        <div className="max-w-2xl">
          <h2 className="text-3xl md:text-4xl">{c.ctaTitle}</h2>
          <p className="mt-3 text-ink/75">{c.ctaBody}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/${lang}/home-valuation`} className="rounded-sm bg-petrol px-5 py-3 text-sm font-medium text-cream hover:bg-[#243b49]">
              {c.ctaTitle}
            </Link>
            <a href={searchUrl('ftb')} className="rounded-sm border border-ink/25 px-5 py-3 text-sm font-medium hover:border-petrol">
              {lang === 'es' ? 'Ver propiedades' : 'Search live listings'}
            </a>
          </div>
          <p className="mt-6 text-xs text-ink/60">{c.compliance}</p>
        </div>
      </section>
    </>
  );
}
