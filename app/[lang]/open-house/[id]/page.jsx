import Image from 'next/image';
import Link from 'next/link';
import { getFeaturedListings, cardTitle } from '../../../../lib/listings';
import { BUSINESS, searchUrl } from '../../../../lib/site';
import { isListingId, signInPath, calculatorPath } from '../../../../lib/openHouse';
import OpenHouseSignIn from '../../../../components/OpenHouseSignIn';

// The open house sign-in for one listing: where the QR code on the sign leads
// (app/open-house/[id]/route.js picks the language). Not linked from the site, not in the
// sitemap, noindex. The listing comes from the Arper portal like every other listing on this
// site, so the page exists for exactly the listings the portal shows on the website.
export const dynamicParams = true;
export const dynamic = 'force-dynamic';

const text = (value, lang) => (typeof value === 'string' ? value : value?.[lang]);

const COPY = {
  en: {
    metaTitle: 'Open house sign-in',
    eyebrow: 'Open house · Welcome',
    lede: 'Sign in and we’ll send you this home’s details and a payment estimate. It takes about 20 seconds.',
    other: 'Español',
    goneTitle: 'This sign-in page is not open',
    goneBody: 'The home may have sold, or the link may be mistyped. You can still reach us directly, or see what we have listed right now.',
    goneListings: 'See our listings',
    call: 'Call or text',
  },
  es: {
    metaTitle: 'Registro de casa abierta',
    eyebrow: 'Casa abierta · Bienvenidos',
    lede: 'Regístrate y te mandamos la información de esta casa y un estimado de pago. Toma unos 20 segundos.',
    other: 'English',
    goneTitle: 'Esta página de registro no está abierta',
    goneBody: 'Puede que la casa ya se haya vendido o que el enlace esté mal escrito. De todos modos nos puedes contactar directo, o ver lo que tenemos disponible ahora.',
    goneListings: 'Ver nuestras propiedades',
    call: 'Llama o manda mensaje',
  },
};

export async function generateMetadata({ params }) {
  const c = COPY[params.lang] ?? COPY.en;
  return { title: c.metaTitle, robots: { index: false, follow: false } };
}

async function findCard(id) {
  if (!isListingId(id)) return null;
  try {
    return (await getFeaturedListings()).find((card) => card.slug === id.toLowerCase()) || null;
  } catch {
    return null;
  }
}

export default async function OpenHousePage({ params }) {
  const lang = params.lang === 'es' ? 'es' : 'en';
  const c = COPY[lang];
  const card = await findCard(params.id);

  if (!card) {
    return (
      <section className="wrap max-w-xl py-16">
        <h1 className="text-3xl">{c.goneTitle}</h1>
        <p className="mt-4 text-ink/80">{c.goneBody}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href={`/${lang}/listings`} className="bg-petrol px-5 py-3 text-center text-sm text-cream hover:bg-ink">{c.goneListings}</Link>
          <a href={`tel:${BUSINESS.phone}`} className="border border-petrol px-5 py-3 text-center text-sm text-petrol">{c.call} {BUSINESS.phoneDisplay}</a>
        </div>
      </section>
    );
  }

  const title = cardTitle(card, lang);
  const cityName = String(card.city || '').split(',')[0].trim();
  const other = lang === 'es' ? 'en' : 'es';

  return (
    <>
      <section className="bg-petrol text-cream">
        <div className="wrap grid gap-6 py-8 sm:grid-cols-[1fr_15rem] sm:items-center md:py-10">
          <div>
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs uppercase tracking-[0.18em] text-gold">{c.eyebrow}</p>
              <Link href={signInPath(other, card.slug)} hrefLang={other} prefetch={false} className="rounded-sm border border-cream/50 px-3 py-1.5 text-sm text-cream hover:bg-cream hover:text-petrol">{c.other}</Link>
            </div>
            <h1 className="mt-3 text-3xl leading-tight md:text-4xl">{title}</h1>
            <p className="mt-1 text-cream/80">{card.city}</p>
            <p className="mt-3 text-sm text-cream/90">
              <span className="text-lg text-cream">{card.price}</span>
              {card.facts ? <span> · {text(card.facts, lang)}</span> : null}
            </p>
            <p className="mt-4 max-w-xl text-sm text-cream/80">{c.lede}</p>
          </div>
          <div className="relative hidden aspect-[3/2] bg-ink/20 sm:block">
            <Image src={card.img} alt={text(card.alt, lang)} fill sizes="240px" className="object-cover" priority />
          </div>
        </div>
      </section>
      <section className="wrap max-w-xl py-8 md:py-10">
        <OpenHouseSignIn
          lang={lang}
          listing={{
            id: card.slug, title, city: card.city, cityName, price: card.price,
            facts: card.facts ? text(card.facts, lang) : null, mls: card.mls,
            calcHref: card.calc ? calculatorPath(lang, card.slug) : null,
            listingHref: `/${lang}/listings#listing-${card.slug}`,
            searchHref: searchUrl('open_house', cityName || undefined),
          }}
        />
      </section>
    </>
  );
}
