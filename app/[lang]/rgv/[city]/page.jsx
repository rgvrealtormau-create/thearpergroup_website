import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cities, citySlugs } from '../../../../lib/content';
import { searchUrl, BUSINESS } from '../../../../lib/site';
import JsonLd from '../../../../components/JsonLd';

export const dynamicParams = false;
export function generateStaticParams() {
  const out = [];
  for (const lang of ['en', 'es']) for (const city of citySlugs) out.push({ lang, city });
  return out;
}

export async function generateMetadata({ params }) {
  const c = cities[params.city]?.[params.lang];
  if (!c) return {};
  return { title: c.metaTitle, description: c.metaDesc };
}

export default function CityGuide({ params }) {
  const { lang, city } = params;
  const c = cities[city]?.[lang];
  if (!c) notFound();
  const place = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: `${c.name}, TX`,
    address: { '@type': 'PostalAddress', addressLocality: c.name, addressRegion: 'TX', addressCountry: 'US' },
  };
  return (
    <>
      <JsonLd data={place} />
      <section className="bg-petrol text-cream">
        <div className="wrap py-20">
          <p className="text-sm text-cream/70">{lang === 'es' ? 'Guía de zona' : 'Neighborhood guide'}</p>
          <h1 className="mt-3 text-4xl md:text-6xl italic">
            {lang === 'es' ? `Vivir en ${c.name}` : `Living in ${c.name}`}
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-cream/85">{c.intro}</p>
        </div>
      </section>

      <section className="wrap py-16 md:py-20">
        <div className="grid gap-10 md:grid-cols-2">
          {c.sections.map((s) => (
            <div key={s.h} className="border-t-2 border-petrol pt-5">
              <h2 className="text-2xl">{s.h}</h2>
              <p className="mt-3 text-ink/80">{s.b}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-cream">
        <div className="wrap py-14">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-2xl md:text-3xl">
              {lang === 'es' ? `Propiedades en venta en ${c.name}` : `Homes for sale in ${c.name}`}
            </h2>
            <a href={searchUrl(`rgv-${city}`, c.name)} className="rounded-sm bg-gold px-5 py-3 text-sm font-medium text-ink hover:bg-[#c9a96b]">
              {lang === 'es' ? 'Ver propiedades' : 'Search live listings'}
            </a>
          </div>
          <div className="mt-6">
            <Link href={`/${lang}/rgv/${city === 'mcallen' ? 'edinburg' : 'mcallen'}`} className="text-sm text-petrol link-underline">
              {lang === 'es' ? 'Comparar con otra ciudad' : 'Compare with another city'}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
