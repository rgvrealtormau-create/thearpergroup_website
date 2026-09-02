import Link from 'next/link';
import { home } from '../../lib/content';
import { searchUrl } from '../../lib/site';
import { SearchButton } from '../../components/site';

export async function generateMetadata({ params }) {
  const c = home[params.lang];
  return { title: c.metaTitle, description: c.metaDesc };
}

export default function Home({ params }) {
  const lang = params.lang;
  const c = home[lang];
  return (
    <>
      {/* Hero */}
      <section className="bg-forest text-cream">
        <div className="wrap py-20 md:py-28">
          <p className="text-sm text-cream/70">{c.heroKicker}</p>
          <h1 className="mt-4 max-w-3xl text-4xl md:text-6xl">
            <span className="italic">{c.heroTitle}</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-cream/85">{c.heroBody}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`/${lang}/home-valuation`} className="rounded-sm bg-cream px-5 py-3 text-sm font-medium text-forest hover:bg-white">
              {c.ctaValue}
            </Link>
            <a href={searchUrl('home-hero')} className="rounded-sm border border-cream/40 px-5 py-3 text-sm font-medium text-cream hover:bg-cream/10">
              {c.ctaSearch}
            </a>
          </div>
          <Link href={`/${lang}/reviews`} className="mt-6 inline-block text-sm text-cream/80 link-underline">
            <span className="text-gold">★★★★★</span>{' '}
            {lang === 'es' ? '5.0 · 21 reseñas de Google' : '5.0 · 21 Google reviews'}
          </Link>
        </div>
      </section>

      {/* Two lenses */}
      <section className="wrap py-16 md:py-20">
        <h2 className="text-3xl md:text-4xl">{c.lensTitle}</h2>
        <p className="mt-3 max-w-xl text-ink/70">{c.lensBody}</p>
        <div className="mt-10 grid gap-10 md:grid-cols-2">
          <div className="border-t-2 border-petrol pt-5">
            <div className="font-display text-2xl">{c.lensMau.name}</div>
            <div className="text-sm text-petrol">{c.lensMau.role}</div>
            <p className="mt-3 text-ink/80">{c.lensMau.body}</p>
          </div>
          <div className="border-t-2 border-clay pt-5">
            <div className="font-display text-2xl">{c.lensPam.name}</div>
            <div className="text-sm text-clay">{c.lensPam.role}</div>
            <p className="mt-3 text-ink/80">{c.lensPam.body}</p>
          </div>
        </div>
      </section>

      {/* Doors */}
      <section className="bg-cream">
        <div className="wrap py-16 md:py-20">
          <h2 className="text-3xl md:text-4xl">{c.doorsTitle}</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {c.doors.map((d) => (
              <Link key={d.title} href={d.href} className="group flex flex-col border border-ink/15 bg-paper p-6 transition-colors hover:border-petrol">
                <div className="font-display text-2xl">{d.title}</div>
                <p className="mt-3 flex-1 text-sm text-ink/75">{d.body}</p>
                <span className="mt-5 text-sm font-medium text-petrol link-underline">{d.cta}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Explore RGV */}
      <section className="wrap py-16 md:py-20">
        <h2 className="text-3xl md:text-4xl">{c.rgvTitle}</h2>
        <p className="mt-3 max-w-xl text-ink/70">{c.rgvBody}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {c.cities.map((ct) => (
            <Link key={ct.slug} href={`/${lang}/rgv/${ct.slug}`} className="rounded-sm border border-ink/20 px-4 py-2 text-sm hover:border-petrol hover:text-petrol">
              {ct.name}
            </Link>
          ))}
        </div>
      </section>

      {/* Ethic */}
      <section className="bg-petrol text-cream">
        <div className="wrap py-16 md:py-20">
          <p className="max-w-3xl font-display text-3xl italic md:text-4xl">“{c.ethic}”</p>
          <div className="mt-8"><SearchButton lang={lang} campaign="home-ethic" /></div>
          <p className="mt-8 max-w-2xl text-sm text-cream/70">{c.biling}</p>
        </div>
      </section>
    </>
  );
}
