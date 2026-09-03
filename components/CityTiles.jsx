import Image from 'next/image';
import Link from 'next/link';
import { cities, citySlugs, ui } from '../lib/content';

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

// Photo-backed area-tile gallery, one tile per city in lib/content.js's `cities` object —
// new cities appear automatically. Shared by the homepage and the /rgv hub.
export default function CityTiles({ lang }) {
  const t = ui[lang];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
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
                <h3 className="font-display text-lg text-cream md:text-xl">
                  {pre}<span className="italic">{accent}</span>
                </h3>
                <span className="mt-1 text-sm font-medium text-gold link-underline">
                  {t.viewArea} →
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
              <h3 className="font-display text-lg text-cream md:text-xl">
                {pre}<span className="italic">{accent}</span>
              </h3>
              <span className="mt-1 text-sm text-cream/60">{t.photoComing}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
