import Image from 'next/image';
import Link from 'next/link';
import { home, cities, citySlugs } from '../../lib/content';
import { searchUrl } from '../../lib/site';
import { SearchButton } from '../../components/site';

// Where the italic (Larken) accent falls within each city name.
const CITY_ACCENTS = {
  mcallen: ['Mc', 'Allen'],
  edinburg: ['', 'Edinburg'],
  mission: ['', 'Mission'],
  pharr: ['', 'Pharr'],
  weslaco: ['', 'Weslaco'],
  mercedes: ['', 'Mercedes'],
  harlingen: ['', 'Harlingen'],
  'san-benito': ['San ', 'Benito'],
  brownsville: ['', 'Brownsville'],
  'south-padre-island': ['South Padre ', 'Island'],
};

// Cities with a real tile photo at /photos/tile-<slug>.jpg; others get a gradient fallback.
const CITIES_WITH_PHOTOS = new Set([
  'mcallen', 'edinburg', 'mission', 'pharr', 'weslaco', 'mercedes', 'brownsville', 'south-padre-island',
]);

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
      <section className="relative overflow-hidden bg-ink text-cream">
        <Image
          src="/photos/hero.jpg"
          alt={c.heroAlt}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to right, rgba(42,38,38,0.6), rgba(43,69,85,0.24) 60%)' }}
        />
        <div className="wrap relative z-10 flex min-h-[520px] items-end justify-center pb-24 pt-24 md:h-[90vh] md:min-h-[640px] md:items-center md:justify-end md:py-0">
          <div className="w-full rounded-sm border border-cream/[0.28] bg-petrol/20 p-6 shadow-xl backdrop-blur-md sm:p-7 md:max-w-[560px] md:bg-petrol/30 md:p-8">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold">{c.heroEyebrow}</p>
            <h1 className="mt-3 text-[28px] leading-tight md:mt-4 md:text-4xl lg:text-[44px]">
              <span className="block">{c.heroLine1}</span>
              <span className="block">
                {c.heroLine2Pre}
                <span className="italic">{c.heroLine2Accent}</span>
                {c.heroLine2Post}
              </span>
            </h1>
            <p className="mt-4 text-cream/85">{c.heroBody}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={searchUrl('home-hero')} className="rounded-sm bg-cream px-5 py-3 text-sm font-medium text-petrol hover:bg-white">
                {c.ctaFind}
              </a>
              <Link href={`/${lang}/home-valuation`} className="rounded-sm border border-cream/40 px-5 py-3 text-sm font-medium text-cream hover:bg-cream/10">
                {c.ctaValue}
              </Link>
            </div>
          </div>
        </div>
        <div className="wrap absolute inset-x-0 bottom-6 z-10 md:bottom-8">
          <Link
            href={`/${lang}/reviews`}
            className="inline-flex items-center gap-2 rounded-sm border border-cream/[0.28] bg-petrol/[0.42] px-4 py-2 text-sm text-cream backdrop-blur-md link-underline"
          >
            <span className="text-gold">★★★★★</span>
            {lang === 'es' ? '5.0 · 21 reseñas de Google' : '5.0 · 21 Google reviews'}
          </Link>
        </div>
      </section>

      {/* Mission line */}
      <section className="bg-petrol text-cream">
        <div className="wrap py-8 md:py-10">
          <p className="font-display text-xl italic md:text-2xl">{c.missionLine}</p>
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

      {/* Recent wins */}
      <section className="bg-cream">
        <div className="wrap py-16 md:py-20">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-petrol">{c.winsKicker}</p>
          <h2 className="mt-3 text-3xl md:text-4xl">
            {c.winsTitlePre}
            <span className="italic">{c.winsTitleAccent}</span>
          </h2>
          <p className="mt-3 max-w-xl text-ink/70">{c.winsBody}</p>
          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="relative aspect-[4/5] overflow-hidden rounded-sm">
                <Image
                  src={`/photos/win-${n}.jpg`}
                  alt={lang === 'es' ? 'Casa vendida por The Arper Group en el Valle' : 'A home sold by The Arper Group in the Rio Grande Valley'}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover"
                />
                <span className="absolute right-3 top-3 rounded-sm bg-petrol px-2.5 py-1 text-xs font-medium text-cream">
                  {c.soldTag}
                </span>
              </div>
            ))}
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
      <section className="bg-ink text-cream">
        <div className="wrap py-16 md:py-20">
          <h2 className="text-3xl md:text-4xl">
            {c.rgvTitlePre}
            <span className="italic">{c.rgvTitleAccent}</span>
          </h2>
          <p className="mt-3 max-w-xl text-cream/70">{c.rgvBody}</p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
            {citySlugs.map((slug) => {
              const ct = cities[slug][lang];
              const [pre, accent] = CITY_ACCENTS[slug] || ['', ct.name];
              const hasPhoto = CITIES_WITH_PHOTOS.has(slug);

              if (hasPhoto) {
                return (
                  <Link key={slug} href={`/${lang}/rgv/${slug}`} className="group relative aspect-[3/4] overflow-hidden rounded-sm bg-ink">
                    <Image
                      src={`/photos/tile-${slug}.jpg`}
                      alt={`${ct.name}, TX`}
                      fill
                      sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 230px"
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{ background: 'linear-gradient(to top, rgba(43,69,85,0.85) 0%, rgba(43,69,85,0.15) 55%, transparent 85%)' }}
                    />
                    <div className="relative flex h-full flex-col justify-end p-4">
                      <div className="font-display text-lg text-cream md:text-xl">
                        {pre}<span className="italic">{accent}</span>
                      </div>
                      <span className="mt-1 text-sm font-medium text-gold link-underline">
                        {c.viewArea} →
                      </span>
                    </div>
                  </Link>
                );
              }

              return (
                <Link
                  key={slug}
                  href={`/${lang}/rgv/${slug}`}
                  className="group relative aspect-[3/4] overflow-hidden rounded-sm"
                  style={{ background: 'linear-gradient(160deg, #2B4555 0%, #2A331D 100%)' }}
                >
                  <Image
                    src="/brand/imagotipo-06.png"
                    alt=""
                    aria-hidden="true"
                    width={200}
                    height={200}
                    className="pointer-events-none absolute -right-6 -top-6 w-24 opacity-[0.12] select-none"
                  />
                  <div className="relative flex h-full flex-col justify-end p-4">
                    <div className="font-display text-lg text-cream md:text-xl">
                      {pre}<span className="italic">{accent}</span>
                    </div>
                    <span className="mt-1 text-sm text-cream/60">{c.photoComing}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Communities */}
      <section className="relative overflow-hidden bg-ink text-cream">
        <Image
          src="/photos/community.jpg"
          alt=""
          aria-hidden="true"
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(rgba(43,69,85,0.55), rgba(43,69,85,0.72))' }}
        />
        <div className="wrap relative z-10 py-24 text-center md:py-[150px]">
          <h2 className="mx-auto max-w-2xl text-3xl md:text-4xl">
            {c.communitiesTitlePre}
            <span className="italic">{c.communitiesTitleAccent}</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-cream/85">{c.communitiesBody}</p>
        </div>
      </section>

      {/* Review */}
      <section className="bg-petrol text-cream">
        <div className="wrap py-16 md:py-20">
          <span className="text-gold">★★★★★</span>
          <p className="mt-4 max-w-3xl font-display text-3xl italic md:text-4xl">&ldquo;{c.reviewQuote}&rdquo;</p>
          <p className="mt-6 text-sm text-cream/70">{c.reviewAttribution}</p>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-cream">
        <div className="wrap py-16 md:py-20">
          <Image src="/brand/arper-blue.png" alt="" aria-hidden="true" width={64} height={64} className="h-10 w-10 opacity-90" />
          <h2 className="mt-6 max-w-2xl text-3xl md:text-4xl">{c.closingTitle}</h2>
          <div className="mt-8 flex flex-wrap gap-3">
            <SearchButton lang={lang} campaign="home-closing" />
            <Link href={`/${lang}/home-valuation`} className="rounded-sm border border-ink/25 px-4 py-2 text-sm font-medium hover:border-petrol">
              {c.ctaValue}
            </Link>
          </div>
          <p className="mt-8 max-w-2xl text-sm text-ink/60">{c.biling}</p>
        </div>
      </section>
    </>
  );
}
