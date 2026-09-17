import Link from 'next/link';
import { communitiesHub } from '../../../lib/content';
import { BUSINESS, pageAlternates, breadcrumbSchema } from '../../../lib/site';
import JsonLd from '../../../components/JsonLd';

export async function generateMetadata({ params }) {
  const c = communitiesHub[params.lang];
  return { title: c.metaTitle, description: c.metaDesc, alternates: pageAlternates(params.lang, 'communities') };
}

export default function CommunitiesHub({ params }) {
  const lang = params.lang;
  const c = communitiesHub[lang];

  const breadcrumb = breadcrumbSchema([
    { name: lang === 'es' ? 'Inicio' : 'Home', url: `${BUSINESS.url}/${lang}` },
    { name: c.title, url: `${BUSINESS.url}/${lang}/communities` },
  ]);

  return (
    <>
      <JsonLd data={breadcrumb} />
      <section className="bg-petrol text-cream">
        <div className="wrap py-20">
          <p className="text-sm text-cream/70">{c.eyebrow}</p>
          <h1 className="mt-3 text-4xl md:text-6xl italic">{c.title}</h1>
          <p className="mt-6 max-w-2xl text-lg text-cream/85">{c.intro}</p>
        </div>
      </section>

      <section className="wrap py-16 md:py-20">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {c.cards.map((card) => (
            <Link
              key={card.name}
              href={card.href}
              className="group flex flex-col border border-ink/15 bg-cream/40 p-6 transition-colors hover:border-petrol"
            >
              <span className="inline-block w-fit rounded-sm bg-gold/25 px-2 py-1 text-xs font-medium uppercase tracking-wide text-clay">
                {card.location}
              </span>
              <h3 className="mt-3 font-display text-2xl">{card.name}</h3>
              <p className="mt-3 flex-1 text-sm text-ink/75">{card.blurb}</p>
              <span className="mt-5 text-sm font-medium text-petrol link-underline">{card.cta} →</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
