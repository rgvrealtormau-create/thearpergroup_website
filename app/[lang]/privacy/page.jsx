import { privacy } from '../../../lib/content';
import { BUSINESS, pageAlternates } from '../../../lib/site';

export async function generateMetadata({ params }) {
  const c = privacy[params.lang];
  return { title: c.metaTitle, description: c.metaDesc, alternates: pageAlternates(params.lang, 'privacy') };
}

export default function Privacy({ params }) {
  const c = privacy[params.lang];
  return (
    <>
      <section className="bg-petrol text-cream">
        <div className="wrap py-16 md:py-20">
          <h1 className="max-w-3xl text-4xl md:text-5xl">{c.title}</h1>
          <p className="mt-4 text-sm text-cream/70">{c.updated}</p>
        </div>
      </section>

      <section className="wrap py-14 md:py-16">
        <div className="max-w-3xl">
          <p className="text-lg text-ink/85">{c.intro}</p>

          {c.sections.map((s) => (
            <div key={s.h} className="mt-10 border-t border-ink/10 pt-6">
              <h2 className="text-2xl md:text-3xl">{s.h}</h2>
              <ul className="mt-4 list-disc space-y-3 pl-5 text-ink/80">
                {s.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}

          <div className="mt-10 border-t-2 border-gold pt-6">
            <h2 className="text-2xl md:text-3xl">{c.contactTitle}</h2>
            <p className="mt-4 text-ink/80">{c.contact}</p>
            <p className="mt-3 text-ink/80">
              {c.phoneLabel}: <a className="link-underline" href={`tel:${BUSINESS.phone}`}>{BUSINESS.phoneDisplay}</a>
              {' · '}
              {c.phoneLabelPam}: <a className="link-underline" href={`tel:${BUSINESS.phonePamTel}`}>{BUSINESS.phonePam}</a>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
