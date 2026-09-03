import Link from 'next/link';
import { resources } from '../../../lib/content';
import { pageAlternates } from '../../../lib/site';

export async function generateMetadata({ params }) {
  const c = resources[params.lang];
  return { title: c.metaTitle, description: c.metaDesc, alternates: pageAlternates(params.lang, 'resources') };
}

export default function Resources({ params }) {
  const lang = params.lang;
  const c = resources[lang];
  return (
    <>
      <section className="bg-petrol text-cream">
        <div className="wrap py-20">
          <h1 className="text-4xl md:text-6xl italic">{c.title}</h1>
          <p className="mt-5 max-w-2xl text-lg text-cream/85">{c.lede}</p>
        </div>
      </section>

      <section className="wrap py-16 md:py-20">
        <h2 className="sr-only">{c.title}</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {c.cards.map((card) =>
            card.live ? (
              <Link
                key={card.title}
                href={card.href}
                className="group flex flex-col border border-ink/15 bg-cream/40 p-6 transition-colors hover:border-petrol"
              >
                <span className="inline-block w-fit rounded-sm bg-gold/25 px-2 py-1 text-xs font-medium uppercase tracking-wide text-clay">
                  {c.liveLabel}
                </span>
                <h3 className="mt-3 font-display text-2xl">{card.title}</h3>
                <p className="mt-3 flex-1 text-sm text-ink/75">{card.body}</p>
                <span className="mt-5 text-sm font-medium text-petrol link-underline">{card.cta} →</span>
              </Link>
            ) : (
              <div
                key={card.title}
                className="flex flex-col border border-ink/10 bg-cream/20 p-6 text-ink/60"
              >
                <span className="inline-block w-fit rounded-sm bg-ink/10 px-2 py-1 text-xs font-medium uppercase tracking-wide text-ink/50">
                  {c.soonLabel}
                </span>
                <h3 className="mt-3 font-display text-2xl text-ink/70">{card.title}</h3>
                <p className="mt-3 flex-1 text-sm">{card.body}</p>
              </div>
            )
          )}
        </div>
      </section>
    </>
  );
}
