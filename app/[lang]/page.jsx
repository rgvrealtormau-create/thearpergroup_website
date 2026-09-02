import Image from 'next/image';
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
      <section className="relative overflow-hidden bg-petrol text-cream">
        <Image
          src="/brand/imagotipo-06.png"
          alt=""
          aria-hidden="true"
          width={900}
          height={900}
          className="pointer-events-none absolute -right-16 top-1/2 z-0 hidden w-[34rem] -translate-y-1/2 opacity-[0.08] select-none md:block lg:w-[42rem]"
        />
        <div className="wrap relative z-10 py-20 md:py-28">
          <p className="text-sm text-cream/70">{c.heroKicker}</p>
          <h1 className="mt-4 max-w-3xl text-4xl leading-tight md:text-6xl">
            <span className="block">{c.heroLine1}</span>
            <span className="block">
              {c.heroLine2Pre}
              <span className="italic">{c.heroLine2Accent}</span>
              {c.heroLine2Post}
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-cream/85">{c.heroBody}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`/${lang}/home-valuation`} className="rounded-sm bg-cream px-5 py-3 text-sm font-medium text-petrol hover:bg-white">
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
        <div className="grid gap-10 md:grid-cols-2 md:items-center md:gap-16">
          <div>
            <div className="overflow-hidden rounded-sm border border-ink/10">
              <Image
                src="/team.jpg"
                alt="Pamela Perez and Mauricio Arredondo of The Arper Group"
                width={1200}
                height={1500}
                className="h-auto w-full"
                sizes="(max-width: 768px) 100vw, 34rem"
              />
            </div>
            <p className="mt-3 inline-block bg-paper px-3 py-1 text-xs tracking-wide text-ink/60">{c.teamCaption}</p>
          </div>
          <div>
            <h2 className="text-3xl md:text-4xl">{c.lensTitle}</h2>
            <p className="mt-3 max-w-xl text-ink/70">{c.lensBody}</p>
            <div className="mt-8 space-y-8">
              <div className="border-t-2 border-petrol pt-4">
                <div className="font-display text-2xl">{c.lensMau.name}</div>
                <div className="italic text-petrol">{c.lensMau.role}</div>
                <p className="mt-2 text-ink/80">{c.lensMau.body}</p>
              </div>
              <div className="border-t-2 border-clay pt-4">
                <div className="font-display text-2xl">{c.lensPam.name}</div>
                <div className="italic text-clay">{c.lensPam.role}</div>
                <p className="mt-2 text-ink/80">{c.lensPam.body}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Doors */}
      <section className="bg-paper">
        <div className="wrap py-16 md:py-20">
          <h2 className="text-3xl md:text-4xl">{c.doorsTitle}</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {c.doors.map((d, i) => (
              <Link key={d.title} href={d.href} className="group flex flex-col border border-ink/15 bg-cream/40 p-6 transition-colors hover:border-petrol">
                <div className="text-xs font-medium tracking-[0.2em] text-petrol">{String(i + 1).padStart(2, '0')}</div>
                <div className="mt-3 font-display text-2xl">{d.title}</div>
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
          <Image src="/brand/imagotipo-06.png" alt="" aria-hidden="true" width={64} height={64} className="h-10 w-10 opacity-90" />
          <p className="mt-6 max-w-3xl font-display text-3xl italic md:text-4xl">&ldquo;{c.ethic}&rdquo;</p>
          <div className="mt-8"><SearchButton lang={lang} campaign="home-ethic" /></div>
          <p className="mt-8 max-w-2xl text-sm text-cream/70">{c.biling}</p>
        </div>
      </section>
    </>
  );
}
