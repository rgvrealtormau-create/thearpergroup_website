import Link from 'next/link';
import Image from 'next/image';
import { vittoria } from '../../../../lib/content';
import { BUSINESS, pageAlternates, breadcrumbSchema } from '../../../../lib/site';
import JsonLd from '../../../../components/JsonLd';
import VittoriaLeadForm from '../../../../components/VittoriaLeadForm';
import VittoriaPaymentEstimator from '../../../../components/VittoriaPaymentEstimator';
import { getFhaRate } from '../../../../lib/fred';

const PHOTO = (name) => `/photos/vittoria/${name}-hd.jpg`;
const BOOKLET = '/downloads/vittoria-townhomes-booklet.pdf';

// Renderings are extracted from the builder's print booklet at source resolution.
const SIZES = {
  exterior: [1164, 1080],
  wide: [1280, 860],
  detail: [1024, 434],
  plan: [1241, 1394],
};

export async function generateMetadata({ params }) {
  const c = vittoria[params.lang];
  return {
    title: c.metaTitle,
    description: c.metaDesc,
    alternates: pageAlternates(params.lang, 'communities/vittoria'),
    openGraph: { images: [{ url: PHOTO('exterior'), width: 816, height: 757 }] },
  };
}

function DownloadButton({ label, tone = 'light' }) {
  const cls =
    tone === 'light'
      ? 'bg-gold text-ink hover:bg-cream'
      : 'bg-petrol text-cream hover:bg-ink';
  return (
    <a
      href={BOOKLET}
      download
      className={`inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium ${cls}`}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M7 1v8m0 0L3.5 5.5M7 9l3.5-3.5M1.5 12.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </a>
  );
}

export default async function VittoriaPage({ params }) {
  const lang = params.lang;
  const fha = await getFhaRate();
  const c = vittoria[lang];

  const breadcrumb = breadcrumbSchema([
    { name: c.breadcrumb.home, url: `${BUSINESS.url}/${lang}` },
    { name: c.breadcrumb.hub, url: `${BUSINESS.url}/${lang}/communities` },
    { name: 'Vittoria', url: `${BUSINESS.url}/${lang}/communities/vittoria` },
  ]);

  return (
    <>
      <JsonLd data={breadcrumb} />

      {/* Hero */}
      <section className="bg-petrol text-cream">
        <div className="wrap grid items-center gap-10 py-14 md:grid-cols-2 md:py-20">
          <div>
            <Link href={`/${lang}/communities`} className="text-sm text-cream/70 hover:text-cream">
              ← {c.breadcrumb.hub}
            </Link>
            <p className="mt-6 text-xs uppercase tracking-[0.18em] text-gold">{c.eyebrow}</p>
            <h1 className="mt-3 text-4xl leading-tight md:text-5xl">
              {c.titlePre}
              <span className="italic">{c.titleAccent}</span>
            </h1>
            <p className="mt-5 text-lg text-cream/85">{c.intro}</p>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-cream/80">
              {c.heroStats.map((s) => (
                <li key={s} className="border-l border-gold/60 pl-3">{s}</li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <DownloadButton label={c.downloadCta} />
              <a href="#contact" className="inline-flex items-center justify-center border border-cream/50 px-6 py-3 text-sm text-cream hover:bg-cream hover:text-petrol">
                {c.tourCta}
              </a>
            </div>
          </div>
          <figure>
            <Image
              src={PHOTO('exterior')}
              alt={lang === 'es' ? 'Representación de la fachada de los townhomes Vittoria' : 'Rendering of the Vittoria townhome exterior'}
              width={SIZES.exterior[0]}
              height={SIZES.exterior[1]}
              priority
              className="h-auto w-full"
            />
            <figcaption className="mt-2 text-xs text-cream/60">{c.renderingNote}</figcaption>
          </figure>
        </div>
      </section>

      {/* Welcome + details */}
      <section className="wrap py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-5">
          <div className="md:col-span-3">
            <p className="text-xs uppercase tracking-[0.18em] text-clay">{c.welcomeEyebrow}</p>
            <h2 className="mt-3 font-display text-3xl md:text-4xl">{c.welcomeTitle}</h2>
            <p className="mt-5 text-ink/80">{c.welcomeBody}</p>

            <h3 className="mt-10 font-display text-xl">{c.featuresTitle}</h3>
            <ul className="mt-4 flex flex-wrap gap-2">
              {c.features.map((f) => (
                <li key={f} className="rounded-sm bg-gold/20 px-3 py-1.5 text-sm text-ink/80">{f}</li>
              ))}
            </ul>

            <p className="mt-10 border-l-2 border-gold pl-4 text-ink/80">
              {c.downPayment}{' '}
              <a href="#estimate" className="text-petrol link-underline">{c.estimateLink} ↓</a>
            </p>
          </div>

          <div className="md:col-span-2">
            <h2 className="font-display text-2xl">{c.factsTitle}</h2>
            <dl className="mt-5 divide-y divide-ink/10 border-y border-ink/10">
              {c.facts.map((f) => (
                <div key={f.k} className="flex justify-between gap-4 py-3 text-sm">
                  <dt className="text-ink/60">{f.k}</dt>
                  <dd className="text-right font-medium">{f.v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-ink/55">{c.priceNote}</p>
          </div>
        </div>
      </section>

      {/* Rooms */}
      <section className="bg-cream/50">
        <div className="wrap space-y-20 py-16 md:py-20">
          {c.rooms.map((room, i) => (
            <article key={room.n} className="grid items-center gap-8 md:grid-cols-12">
              <div className={`md:col-span-7 ${i % 2 ? 'md:order-2' : ''}`}>
                <Image src={PHOTO(room.imgs[0].src)} alt={room.imgs[0].alt} width={SIZES.wide[0]} height={SIZES.wide[1]} className="h-auto w-full" />
              </div>
              <div className={`md:col-span-5 ${i % 2 ? 'md:order-1' : ''}`}>
                <p className="font-display text-4xl text-clay">{room.n}</p>
                <h2 className="mt-2 font-display text-2xl md:text-3xl">{room.title}</h2>
                <p className="mt-3 text-ink/75">{room.body}</p>
                <Image src={PHOTO(room.imgs[1].src)} alt={room.imgs[1].alt} width={SIZES.detail[0]} height={SIZES.detail[1]} className="mt-6 h-auto w-full" />
              </div>
            </article>
          ))}
          <p className="text-xs text-ink/55">{c.renderingNote}</p>
        </div>
      </section>

      {/* Floor plans */}
      <section className="wrap py-16 md:py-20">
        <h2 className="font-display text-3xl md:text-4xl">{c.plansTitle}</h2>
        <div className="mt-8 grid gap-10 sm:grid-cols-2">
          {c.plans.map((p) => (
            <figure key={p.src}>
              <Image
                src={PHOTO(p.src)}
                alt={p.alt}
                width={SIZES.plan[0]}
                height={SIZES.plan[1]}
                sizes="(min-width: 640px) 50vw, 100vw"
                className="mx-auto h-auto w-full max-w-lg"
              />
              <figcaption className="sr-only">{p.label}</figcaption>
            </figure>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-ink/55">{c.plansNote}</p>
      </section>

      {/* Cash to close + monthly payment estimator */}
      <section id="estimate" className="scroll-mt-24 border-t border-ink/10">
        <div className="wrap py-16 md:py-20">
          <VittoriaPaymentEstimator lang={lang} fha={fha} />
        </div>
      </section>

      {/* Booklet download */}
      <section className="bg-petrol text-cream">
        <div className="wrap flex flex-col items-start gap-6 py-14 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl">{c.bookletTitle}</h2>
            <p className="mt-3 text-cream/80">{c.bookletBody}</p>
          </div>
          <DownloadButton label={c.downloadCta} />
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="scroll-mt-24 bg-cream">
        <div className="wrap grid gap-12 py-16 md:grid-cols-2 md:py-20">
          <div>
          <h2 className="font-display text-3xl md:text-4xl">{c.contactTitle}</h2>
          <p className="mt-4 max-w-2xl text-ink/80">{c.contactBody}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
            <a href={`tel:${BUSINESS.phone}`} className="bg-petrol px-6 py-3 text-center text-sm text-cream hover:bg-ink">
              {c.callMau} · {BUSINESS.phoneDisplay}
            </a>
            <a href={`tel:${BUSINESS.phonePamTel}`} className="border border-petrol px-6 py-3 text-center text-sm text-petrol hover:bg-petrol hover:text-cream">
              {c.callPam} · {BUSINESS.phonePam}
            </a>
          </div>
          <p className="mt-8 text-sm text-ink/70">
            {c.lenderNote}{' '}
            <Link href={`/${lang}/resources/mortgage-calculator`} className="text-petrol link-underline">{c.calcLink} →</Link>
            {' · '}
            <Link href={`/${lang}/rgv/weslaco`} className="text-petrol link-underline">{c.cityLink} →</Link>
          </p>
          <p className="mt-6 max-w-3xl text-xs text-ink/50">{c.disclaimer}</p>
          </div>
          <div>
            <VittoriaLeadForm lang={lang} mode="public" />
          </div>
        </div>
      </section>
    </>
  );
}
