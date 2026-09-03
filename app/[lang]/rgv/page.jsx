import { rgvHub } from '../../../lib/content';
import { BUSINESS, pageAlternates, breadcrumbSchema } from '../../../lib/site';
import JsonLd from '../../../components/JsonLd';
import CityTiles from '../../../components/CityTiles';

export async function generateMetadata({ params }) {
  const c = rgvHub[params.lang];
  return { title: c.metaTitle, description: c.metaDesc, alternates: pageAlternates(params.lang, 'rgv') };
}

export default function RgvHub({ params }) {
  const lang = params.lang;
  const c = rgvHub[lang];

  const breadcrumb = breadcrumbSchema([
    { name: lang === 'es' ? 'Inicio' : 'Home', url: `${BUSINESS.url}/${lang}` },
    { name: c.title, url: `${BUSINESS.url}/${lang}/rgv` },
  ]);

  return (
    <>
      <JsonLd data={breadcrumb} />
      <section className="bg-petrol text-cream">
        <div className="wrap py-20">
          <h1 className="max-w-3xl text-4xl md:text-6xl italic">{c.title}</h1>
          <p className="mt-6 max-w-2xl text-lg text-cream/85">{c.intro}</p>
        </div>
      </section>

      <section className="bg-ink text-cream">
        <div className="wrap py-16 md:py-20">
          <h2 className="sr-only">{c.title}</h2>
          <CityTiles lang={lang} />
        </div>
      </section>
    </>
  );
}
