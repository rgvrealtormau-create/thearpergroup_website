import { Suspense } from 'react';
import { cedarRidge } from '../../../../lib/content';
import { BUSINESS, pageAlternates, breadcrumbSchema } from '../../../../lib/site';
import JsonLd from '../../../../components/JsonLd';
import { CedarRidgeLogo } from '../../../../components/CedarRidgeLogo';
import CedarRidgeForm from '../../../../components/CedarRidgeForm';
import CedarRidgeAvailabilityMap from '../../../../components/CedarRidgeAvailabilityMap';

// BuildHere is the single source of truth for public Cedar Ridge inventory.
const BUILDHERE_EMBED_URL = 'https://subdivision-plat-app.vercel.app/c/cedar-ridge-reserve-892049';
const BUILDHERE_INVENTORY_URL = 'https://subdivision-plat-app.vercel.app/api/public/communities/cedar-ridge-reserve-892049/inventory';

export const revalidate = 30;

async function getInventory() {
  try {
    const response = await fetch(BUILDHERE_INVENTORY_URL, { next: { revalidate: 30 } });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

// Subdivision location, from Mauricio's Google Maps pin.
const LOCATION = { lat: 26.161307, lng: -97.696753 };
const MAP_EMBED_SRC = `https://maps.google.com/maps?q=${LOCATION.lat},${LOCATION.lng}&z=15&output=embed`;
const MAP_DIRECTIONS_URL = 'https://maps.app.goo.gl/tMXadrrHkoRzyF4f7';

export async function generateMetadata({ params }) {
  const c = cedarRidge[params.lang];
  return {
    title: c.metaTitle,
    description: c.metaDesc,
    alternates: pageAlternates(params.lang, 'communities/cedar-ridge-reserve'),
    openGraph: { title: c.metaTitle, description: c.metaDesc },
  };
}

function Diamond() {
  return <span aria-hidden="true" className="h-1.5 w-1.5 rotate-45 bg-crbrass" />;
}

export default async function CedarRidgeReserve({ params }) {
  const lang = params.lang;
  const c = cedarRidge[lang];
  const inventory = await getInventory();

  const place = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: 'Cedar Ridge Reserve',
    description: c.metaDesc,
    address: { '@type': 'PostalAddress', addressLocality: 'Harlingen', addressRegion: 'TX', addressCountry: 'US' },
    geo: { '@type': 'GeoCoordinates', latitude: LOCATION.lat, longitude: LOCATION.lng },
  };
  const breadcrumb = breadcrumbSchema([
    { name: c.breadcrumb.home, url: `${BUSINESS.url}/${lang}` },
    { name: c.breadcrumb.communities, url: `${BUSINESS.url}/${lang}/communities` },
    { name: 'Cedar Ridge Reserve', url: `${BUSINESS.url}/${lang}/communities/cedar-ridge-reserve` },
  ]);

  return (
    <div className="font-crsans text-crnavy">
      <JsonLd data={place} />
      <JsonLd data={breadcrumb} />

      {/* Hero */}
      <section className="bg-crnavy text-crivory">
        <div className="wrap py-12 md:py-16">
          <h1 className="sr-only">Cedar Ridge Reserve — {c.hero.placeLine}</h1>
          <div className="grid gap-10 lg:grid-cols-[1fr_22rem] lg:items-center">
            <div>
              <CedarRidgeLogo reversed className="mb-6" />
              <p className="font-crsans text-sm uppercase tracking-[0.3em] text-crbrass">{c.hero.tagline}</p>
              <p className="mt-6 max-w-2xl text-lg text-crivory/85">{c.hero.lede}</p>
              <p className="mt-4 text-sm text-crivory/70">📍 {c.hero.placeLine}</p>
              <div className="mt-8 flex flex-wrap gap-4">
                <a href="#availability" className="inline-flex items-center justify-center rounded-sm bg-crbrass px-5 py-3 text-sm font-medium text-crnavy hover:bg-[#c49a5e]">
                  {c.hero.ctaAvailability}
                </a>
                <a href="#contact" className="inline-flex items-center justify-center rounded-sm border border-crivory/40 px-5 py-3 text-sm font-medium text-crivory hover:border-crivory">
                  {c.hero.ctaContact}
                </a>
              </div>
            </div>
            <div>
              <div className="overflow-hidden rounded-sm border border-crivory/15">
                <iframe
                  src={MAP_EMBED_SRC}
                  title={c.hero.mapTitle}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="h-64 w-full border-0 lg:h-72"
                />
              </div>
              <a
                href={MAP_DIRECTIONS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-sm text-crivory/70 link-underline hover:text-crivory"
              >
                {c.hero.directions} →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="bg-crnavy text-crivory">
        <div className="wrap flex flex-wrap items-center justify-center gap-x-6 gap-y-3 border-t border-crivory/10 py-6 text-center">
          {c.pillars.map((p, i) => (
            <span key={p} className="flex items-center gap-6">
              {i > 0 && <Diamond />}
              <span className="font-crsans text-xs uppercase tracking-[0.2em] text-crivory/80">{p}</span>
            </span>
          ))}
        </div>
      </section>

      {/* The community */}
      <section className="bg-crivory">
        <div className="wrap grid gap-10 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-crbrass">{c.community.eyebrow}</p>
            <h2 className="mt-3 font-crserif text-3xl md:text-5xl">{c.community.title}</h2>
          </div>
          <div>
            <p className="text-crnavy/80">{c.community.para1}</p>
            <p className="mt-4 text-crnavy/80">{c.community.para2}</p>
          </div>
        </div>
      </section>

      {/* At a glance */}
      <section className="bg-crnavy/[0.03]">
        <div className="wrap py-14">
          <p className="text-sm uppercase tracking-[0.2em] text-crbrass">{c.glance.eyebrow}</p>
          <dl className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {c.glance.rows.map((row) => (
              <div key={row.label} className="border-t border-crbrass/40 pt-3">
                <dt className="text-xs uppercase tracking-wide text-crslate">{row.label}</dt>
                <dd className="mt-1 font-crserif text-xl">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Availability & pricing */}
      <section id="availability" className="scroll-mt-16 bg-crnavy text-crivory">
        <div className="wrap py-16 md:py-24">
          <p className="text-sm uppercase tracking-[0.2em] text-crbrass">{c.availability.eyebrow}</p>
          <h2 className="mt-3 font-crserif text-3xl md:text-5xl">{c.availability.title}</h2>
          <p className="mt-4 max-w-2xl text-crivory/75">{c.availability.lede}</p>

          {BUILDHERE_EMBED_URL && inventory ? (
            <Suspense fallback={<div className="mt-8 h-[800px] w-full rounded-xl bg-crivory/5" />}>
              <CedarRidgeAvailabilityMap baseUrl={BUILDHERE_EMBED_URL} embedTitle={c.availability.embedTitle} inventory={inventory} lang={lang} />
            </Suspense>
          ) : (
            <div className="mt-8 flex flex-col items-center justify-center gap-3 rounded-sm border border-dashed border-crivory/25 bg-crivory/5 px-6 py-16 text-center">
              <span className="font-crserif text-2xl text-crivory/80" style={{ fontStyle: 'italic' }}>{c.availability.comingSoonTitle}</span>
              <p className="max-w-md text-sm text-crivory/60">{c.availability.comingSoonBody}</p>
            </div>
          )}

          <p className="mt-6 max-w-3xl text-xs text-crivory/50">{c.availability.estimateNote}</p>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="bg-crivory">
        <div className="wrap grid gap-10 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-crbrass">{c.contact.eyebrow}</p>
            <h2 className="mt-3 font-crserif text-3xl md:text-5xl">{c.contact.title}</h2>
            <p className="mt-4 max-w-sm text-crnavy/70">{c.contact.lede}</p>
            <div className="mt-8 space-y-1 text-sm text-crnavy/70">
              <p>Mauricio · (956) 517-5223</p>
              <p>Pamela · (956) 414-6128</p>
              <p>The Arper Group · 4900 N 10th St Ste. B4, McAllen, TX 78504</p>
              <p>rgvrealtormau@gmail.com</p>
            </div>
          </div>
          <CedarRidgeForm lang={lang} copy={c.contact} />
        </div>
      </section>
    </div>
  );
}
