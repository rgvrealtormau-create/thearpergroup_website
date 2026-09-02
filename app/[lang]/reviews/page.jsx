import { reviews, reviewsMeta } from '../../../lib/content';
import { BUSINESS, searchUrl } from '../../../lib/site';
import JsonLd from '../../../components/JsonLd';

export async function generateMetadata({ params }) {
  const c = reviewsMeta[params.lang];
  return { title: c.metaTitle, description: c.metaDesc };
}

export default function Reviews({ params }) {
  const lang = params.lang;
  const c = reviewsMeta[lang];

  // AggregateRating reflects the reviews actually shown on this page (Google policy).
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    name: BUSINESS.name,
    url: BUSINESS.url,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5',
      bestRating: '5',
      reviewCount: String(reviews.length),
    },
    review: reviews.map((r) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.author },
      reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
      reviewBody: r.text,
    })),
  };

  return (
    <>
      <JsonLd data={schema} />
      <section className="bg-forest text-cream">
        <div className="wrap py-20">
          <h1 className="text-4xl md:text-6xl italic">{c.title}</h1>
          <p className="mt-5 text-lg text-cream/90">
            <span className="text-gold">★★★★★</span> {c.ratingLine}
          </p>
          <p className="mt-3 max-w-2xl text-cream/70">{c.lede}</p>
        </div>
      </section>

      <section className="wrap py-16 md:py-20">
        <div className="grid gap-6 md:grid-cols-2">
          {reviews.map((r, i) => (
            <figure key={i} className="flex flex-col border border-ink/15 bg-paper p-6">
              <div className="text-gold" aria-label="5 out of 5 stars">★★★★★</div>
              <blockquote className="mt-3 flex-1 text-ink/85">{r.text}</blockquote>
              <figcaption className="mt-4 text-sm">
                <span className="font-medium">{r.author}</span>
                <span className="text-ink/55">
                  {' '}· {r.who === 'pam' ? c.withPam : c.withMau}{r.role ? ` · ${r.role}` : ''}
                </span>
                <div className="mt-0.5 text-xs text-ink/45">{c.verified}</div>
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="mt-10">
          <a href={searchUrl('reviews')} className="rounded-sm bg-gold px-5 py-3 text-sm font-medium text-ink hover:bg-[#c9a96b]">
            {lang === 'es' ? 'Ver propiedades' : 'Search live listings'}
          </a>
        </div>
      </section>
    </>
  );
}
