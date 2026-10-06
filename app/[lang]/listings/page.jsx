import Link from 'next/link';
import Image from 'next/image';
import { featuredPage, featuredCommunities, HERO_LISTINGS } from '../../../lib/content';
import { getFeaturedListings, inquiryOptions, lastUpdated } from '../../../lib/listings';
import { BUSINESS, pageAlternates, breadcrumbSchema } from '../../../lib/site';
import JsonLd from '../../../components/JsonLd';
import FeaturedListings, { AskLink } from '../../../components/FeaturedListings';
import ListingInquiryForm from '../../../components/ListingInquiryForm';
import cedarRidgeLogo from '../../../public/brand/cedar-ridge-logo-reversed.png';

// Featured listings: every property The Arper Group lists directly.
// Communities (each with its own page) come first, then the individual listings
// in a filterable grid, then one inquiry form for all of them.
//
// The communities and the page's words live in lib/content.js. The individual listings
// come from the Arper portal (lib/listings.js): this page asks again about once a minute,
// so a listing ticked "Show on the website" there appears here, and one that closes,
// expires or is withdrawn drops off, without anyone touching this site.
export const revalidate = 60; // keep in step with LISTING_REFRESH_SECONDS

export async function generateMetadata({ params }) {
  const c = featuredPage[params.lang];
  return {
    title: c.metaTitle,
    description: c.metaDesc,
    alternates: pageAlternates(params.lang, 'listings'),
    openGraph: { images: [{ url: '/photos/listings/tierra-encantada.jpg', width: 1000, height: 667 }] },
  };
}

const eyebrowCls = 'text-xs uppercase tracking-[0.18em]';

function CommunityCard({ community: m, lang, c }) {
  const primaryHref = m.links ? `/${lang}/${m.links[0].path}` : null;
  const media = m.logo ? (
    <div className="flex aspect-[4/3] items-center justify-center bg-crnavy">
      <Image src={cedarRidgeLogo} alt="Cedar Ridge Reserve" sizes="240px" className="h-auto w-2/3" />
    </div>
  ) : (
    <div className="relative aspect-[4/3] bg-petrol">
      <Image
        src={m.img}
        alt={m.alt[lang]}
        fill
        sizes="(min-width: 1024px) 346px, (min-width: 640px) 50vw, 100vw"
        className="object-cover"
      />
      {m.rendering && (
        <span className="absolute bottom-2 right-2 rounded-sm bg-ink/80 px-1.5 py-0.5 text-[11px] text-cream">
          {c.listings[m.rendering]}
        </span>
      )}
    </div>
  );

  return (
    <article id={m.slug} className="flex scroll-mt-24 flex-col border border-ink/15 bg-cream/40">
      {primaryHref ? (
        <Link href={primaryHref} aria-label={m.name[lang]} tabIndex={-1}>{media}</Link>
      ) : (
        media
      )}
      <div className="flex flex-1 flex-col p-6">
        <span className="inline-block w-fit rounded-sm bg-gold/30 px-2 py-1 text-xs font-medium uppercase tracking-wide text-clay">
          {m.location}
        </span>
        <h3 className="mt-3.5 font-display text-[26px] leading-tight">{m.name[lang]}</h3>
        <p className="mt-2.5 text-[15px] text-ink/80">{m.blurb[lang]}</p>
        <ul className="mt-4 flex flex-1 flex-col gap-2 text-sm">
          {m.facts[lang].map((fact) => (
            <li key={fact} className="border-l-2 border-gold pl-2.5">{fact}</li>
          ))}
          <li className="border-l-2 border-petrol pl-2.5 font-medium text-petrol">{m.cso[lang]}</li>
        </ul>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-sm font-medium text-petrol">
          {m.links?.map((link) => (
            <Link key={link.path} href={`/${lang}/${link.path}`} className="py-2.5 link-underline">
              {link.label[lang]}
            </Link>
          ))}
          {m.ask && (
            <AskLink slug={m.slug} className="py-2.5 link-underline">{m.ask[lang]}</AskLink>
          )}
        </div>
      </div>
    </article>
  );
}

export default async function FeaturedListingsPage({ params }) {
  const lang = params.lang;
  const c = featuredPage[lang];
  const listings = await getFeaturedListings();
  const options = inquiryOptions(lang, listings);
  const updated = lastUpdated(listings);
  // "October 2026" / "octubre de 2026"
  const updatedText = updated
    ? updated.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', { year: 'numeric', month: 'long', timeZone: 'America/Chicago' })
    : null;
  // The hero photo's "from $…": the lowest-priced fourplex on the street it shows.
  const heroListings = listings.filter((l) => l.category === 'multifamily' && !l.priceSuffix && HERO_LISTINGS.test(l.geo));
  const heroFrom = heroListings.length ? heroListings.reduce((low, l) => (l.amount < low.amount ? l : low)).price : null;

  const breadcrumb = breadcrumbSchema([
    { name: c.breadcrumbHome, url: `${BUSINESS.url}/${lang}` },
    { name: c.eyebrow, url: `${BUSINESS.url}/${lang}/listings` },
  ]);

  return (
    <>
      <JsonLd data={breadcrumb} />

      {/* Hero */}
      <section className="bg-petrol text-cream">
        <div className="wrap grid items-center gap-12 py-16 md:grid-cols-2 md:py-20">
          <div>
            <p className={`${eyebrowCls} text-gold`}>{c.eyebrow}</p>
            <h1 className="mt-3.5 text-4xl leading-[1.06] md:text-6xl">
              {c.titlePre}
              <span className="italic">{c.titleAccent}</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-cream/85">{c.intro}</p>
            <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2.5 text-sm text-cream/85">
              <li className="border-l border-gold/70 pl-3">{c.statCommunities(featuredCommunities.length)}</li>
              <li className="border-l border-gold/70 pl-3">{c.statListings(listings.length)}</li>
              <li className="border-l border-gold/70 pl-3">{c.statCities}</li>
            </ul>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#listings" className="inline-flex min-h-[44px] items-center justify-center rounded-sm bg-gold px-6 text-sm font-medium text-ink hover:bg-cream">
                {c.browseCta}
              </a>
              <a href="#communities" className="inline-flex min-h-[44px] items-center justify-center rounded-sm border border-cream/50 px-6 text-sm text-cream hover:bg-cream hover:text-petrol">
                {c.communitiesCta}
              </a>
            </div>
          </div>
          <figure>
            <div className="relative aspect-[3/2]">
              <Image
                src="/photos/listings/north-park-fourplex-dusk.jpg"
                alt={c.heroAlt}
                fill
                priority
                sizes="(min-width: 768px) 520px, 100vw"
                className="object-cover"
              />
            </div>
            <figcaption className="mt-2 text-xs text-cream/75">{c.heroCaption}{heroFrom ? ` · ${c.heroFrom(heroFrom)}` : ''}</figcaption>
          </figure>
        </div>
      </section>

      {/* Communities */}
      <section id="communities" className="scroll-mt-20">
        <div className="wrap py-16 md:py-20">
          <p className={`${eyebrowCls} text-clay`}>{c.communities.eyebrow}</p>
          <h2 className="mt-3 text-3xl md:text-[40px]">
            {c.communities.titlePre}
            <span className="italic">{c.communities.titleAccent}</span>
          </h2>
          <p className="mt-3.5 max-w-2xl text-ink/80">{c.communities.lede}</p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredCommunities.map((m) => (
              <CommunityCard key={m.slug} community={m} lang={lang} c={c} />
            ))}
          </div>
        </div>
      </section>

      {/* Individual listings */}
      <section id="listings" className="scroll-mt-20 bg-cream">
        <div className="wrap py-16 md:py-20">
          <p className={`${eyebrowCls} text-clay`}>{c.listings.eyebrow}</p>
          <h2 className="mt-3 text-3xl md:text-[40px]">
            {c.listings.titlePre}
            <span className="italic">{c.listings.titleAccent}</span>
          </h2>
          <FeaturedListings lang={lang} listings={listings} />
        </div>
      </section>

      {/* Run the numbers */}
      <section>
        <div className="wrap grid items-center gap-x-14 gap-y-6 py-16 md:grid-cols-2">
          <div>
            <p className={`${eyebrowCls} text-clay`}>{c.numbers.eyebrow}</p>
            <h2 className="mt-3 text-3xl">
              {c.numbers.titlePre}
              <span className="italic">{c.numbers.titleAccent}</span>
              {c.numbers.titlePost}
            </h2>
          </div>
          <ul className="border-b border-ink/15">
            {c.numbers.links.map((link) => (
              <li key={link.path} className="border-t border-ink/15">
                <Link href={`/${lang}/${link.path}`} className="flex min-h-[56px] items-center py-2 text-petrol hover:text-ink">
                  <span>
                    <span className="link-underline">{link.name}</span> <span className="text-sm text-ink/70">· {link.note}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="scroll-mt-20 bg-petrol text-cream">
        <div className="wrap grid gap-12 py-16 md:grid-cols-2 md:py-20">
          <div>
            <p className={`${eyebrowCls} text-gold`}>{c.contact.eyebrow}</p>
            <h2 className="mt-3 text-3xl md:text-[40px]">
              {c.contact.titlePre}
              <span className="italic">{c.contact.titleAccent}</span>
            </h2>
            <p className="mt-4 max-w-md text-cream/85">{c.contact.body}</p>
            <div className="mt-8 flex flex-wrap gap-x-12 gap-y-6">
              <div>
                <p className="text-[13px] text-cream/75">Mauricio Arredondo, REALTOR®</p>
                <a href={`tel:${BUSINESS.phone}`} className="inline-flex min-h-[44px] items-center text-xl link-underline">{BUSINESS.phoneDisplay}</a>
              </div>
              <div>
                <p className="text-[13px] text-cream/75">Pamela Perez, REALTOR®</p>
                <a href={`tel:${BUSINESS.phonePamTel}`} className="inline-flex min-h-[44px] items-center text-xl link-underline">{BUSINESS.phonePam}</a>
              </div>
            </div>
          </div>
          <ListingInquiryForm lang={lang} options={options} />
        </div>
      </section>

      {/* For agents */}
      <section className="border-b border-ink/10 bg-cream">
        <div className="wrap py-8">
          <p className="max-w-3xl">
            <span className="font-medium">{c.agents.lead}</span> {c.agents.body}
          </p>
        </div>
      </section>

      {/* Fine print */}
      <section>
        <div className="wrap pt-7">
          <p className="max-w-4xl text-xs text-ink/70">
            {c.finePrint}{updatedText ? ` ${c.updated(updatedText)}` : ''}
          </p>
        </div>
      </section>
    </>
  );
}
