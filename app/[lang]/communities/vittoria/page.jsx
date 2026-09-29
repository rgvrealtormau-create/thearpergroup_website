import Link from 'next/link';
import { vittoria } from '../../../../lib/content';
import { BUSINESS, pageAlternates, breadcrumbSchema } from '../../../../lib/site';
import JsonLd from '../../../../components/JsonLd';

export async function generateMetadata({ params }) {
  const c = vittoria[params.lang];
  return { title: c.metaTitle, description: c.metaDesc, alternates: pageAlternates(params.lang, 'communities/vittoria') };
}

export default function VittoriaPage({ params }) {
  const lang = params.lang;
  const c = vittoria[lang];

  const breadcrumb = breadcrumbSchema([
    { name: c.breadcrumb.home, url: `${BUSINESS.url}/${lang}` },
    { name: c.breadcrumb.hub, url: `${BUSINESS.url}/${lang}/communities` },
    { name: `${c.titlePre}${c.titleAccent}`, url: `${BUSINESS.url}/${lang}/communities/vittoria` },
  ]);

  return (
    <>
      <JsonLd data={breadcrumb} />

      <section className="bg-petrol text-cream">
        <div className="wrap py-20">
          <Link href={`/${lang}/communities`} className="text-sm text-cream/70 hover:text-cream">
            ← {c.breadcrumb.hub}
          </Link>
          <p className="mt-6 text-sm text-cream/70">{c.eyebrow}</p>
          <h1 className="mt-3 text-4xl md:text-6xl">
            {c.titlePre}
            <span className="italic">{c.titleAccent}</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-cream/85">{c.intro}</p>
        </div>
      </section>

      <section className="wrap py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-5">
          <div className="md:col-span-2">
            <h2 className="font-display text-2xl">{c.factsTitle}</h2>
            <dl className="mt-6 divide-y divide-ink/10 border-y border-ink/10">
              {c.facts.map((f) => (
                <div key={f.k} className="flex justify-between gap-4 py-4 text-sm">
                  <dt className="text-ink/60">{f.k}</dt>
                  <dd className="text-right font-medium">{f.v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="md:col-span-3">
            <h2 className="font-display text-2xl">{c.whyTitle}</h2>
            {c.whyBody.map((p, i) => (
              <p key={i} className="mt-4 text-ink/80">{p}</p>
            ))}
            <Link href={`/${lang}/rgv/weslaco`} className="mt-5 inline-block text-sm font-medium text-petrol link-underline">
              {c.cityLink} →
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-cream">
        <div className="wrap py-16 md:py-20">
          <h2 className="font-display text-3xl md:text-4xl">{c.contactTitle}</h2>
          <p className="mt-4 max-w-2xl text-ink/80">{c.contactBody}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
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
          </p>
          <p className="mt-6 max-w-3xl text-xs text-ink/50">{c.disclaimer}</p>
        </div>
      </section>
    </>
  );
}
