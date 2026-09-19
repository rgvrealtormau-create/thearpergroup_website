import { Suspense } from 'react';
import { cedarRidge } from '../../../../../lib/content';
import { BUSINESS, pageAlternates, breadcrumbSchema } from '../../../../../lib/site';
import JsonLd from '../../../../../components/JsonLd';
import { CedarRidgeLogo } from '../../../../../components/CedarRidgeLogo';
import CedarRidgeAvailabilityMap from '../../../../../components/CedarRidgeAvailabilityMap';
import CedarRidgeForm from '../../../../../components/CedarRidgeForm';

const BUILDHERE_EMBED_URL = 'https://subdivision-plat-app.vercel.app/c/cedar-ridge-reserve-892049';
const BUILDHERE_INVENTORY_URL = 'https://subdivision-plat-app.vercel.app/api/public/communities/cedar-ridge-reserve-892049/inventory';

const COPY = {
  en: {
    eyebrow: 'Cedar Ridge Reserve',
    title: 'Full lot inventory',
    lede: 'Compare every homesite, filter current availability, and select a lot on the map or from the cards below.',
    back: 'Back to community',
    unavailable: 'Inventory is temporarily unavailable. Please check back shortly.',
  },
  es: {
    eyebrow: 'Cedar Ridge Reserve',
    title: 'Inventario completo de lotes',
    lede: 'Compara todos los terrenos, filtra la disponibilidad actual y selecciona un lote en el mapa o en las tarjetas.',
    back: 'Volver a la comunidad',
    unavailable: 'El inventario no está disponible temporalmente. Intenta de nuevo en unos momentos.',
  },
};

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

export async function generateMetadata({ params }) {
  const lang = params.lang;
  const copy = COPY[lang] || COPY.en;
  return {
    title: `${copy.title} · Cedar Ridge Reserve`,
    description: copy.lede,
    alternates: pageAlternates(lang, 'communities/cedar-ridge-reserve/inventory'),
  };
}

export default async function CedarRidgeInventoryPage({ params }) {
  const lang = params.lang;
  const copy = COPY[lang] || COPY.en;
  const communityCopy = cedarRidge[lang];
  const inventory = await getInventory();
  const communityPath = `/${lang}/communities/cedar-ridge-reserve`;

  const breadcrumb = breadcrumbSchema([
    { name: communityCopy.breadcrumb.home, url: `${BUSINESS.url}/${lang}` },
    { name: communityCopy.breadcrumb.communities, url: `${BUSINESS.url}/${lang}/communities` },
    { name: 'Cedar Ridge Reserve', url: `${BUSINESS.url}${communityPath}` },
    { name: copy.title, url: `${BUSINESS.url}${communityPath}/inventory` },
  ]);

  return (
    <div className="font-crsans text-crnavy">
      <JsonLd data={breadcrumb} />

      <section className="bg-crnavy text-crivory">
        <div className="wrap py-10 md:py-14">
          <a href={communityPath} className="text-sm text-crivory/65 underline decoration-crbrass/70 underline-offset-4 hover:text-crivory">← {copy.back}</a>
          <CedarRidgeLogo reversed className="mt-7 max-w-xs" />
          <p className="mt-8 text-sm uppercase tracking-[0.2em] text-crbrass">{copy.eyebrow}</p>
          <h1 className="mt-3 font-crserif text-4xl md:text-6xl">{copy.title}</h1>
          <p className="mt-5 max-w-2xl text-lg text-crivory/75">{copy.lede}</p>
        </div>
      </section>

      <section id="availability" className="scroll-mt-16 bg-crnavy text-crivory">
        <div className="wrap pb-16 md:pb-24">
          {inventory ? (
            <Suspense fallback={<div className="h-[800px] w-full rounded-sm bg-crivory/5" />}>
              <CedarRidgeAvailabilityMap baseUrl={BUILDHERE_EMBED_URL} embedTitle={communityCopy.availability.embedTitle} inventory={inventory} lang={lang} />
            </Suspense>
          ) : (
            <div className="rounded-sm border border-dashed border-crivory/25 bg-crivory/5 px-6 py-16 text-center text-crivory/70">{copy.unavailable}</div>
          )}
          <p className="mt-6 max-w-3xl text-xs text-crivory/50">{communityCopy.availability.estimateNote}</p>
        </div>
      </section>

      <section id="contact" className="scroll-mt-16 bg-crivory">
        <div className="wrap grid gap-10 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-crbrass">{communityCopy.contact.eyebrow}</p>
            <h2 className="mt-3 font-crserif text-3xl md:text-5xl">{communityCopy.contact.title}</h2>
            <p className="mt-4 max-w-sm text-crnavy/70">{communityCopy.contact.lede}</p>
            <div className="mt-8 space-y-1 text-sm text-crnavy/70">
              <p>Mauricio · (956) 517-5223</p>
              <p>Pamela · (956) 414-6128</p>
              <p>The Arper Group · 4900 N 10th St Ste. B4, McAllen, TX 78504</p>
              <p>rgvrealtormau@gmail.com</p>
            </div>
          </div>
          <Suspense fallback={<div className="h-96 rounded-sm border border-crnavy/10 bg-white/40" />}>
            <CedarRidgeForm lang={lang} copy={communityCopy.contact} inventory={inventory} />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
