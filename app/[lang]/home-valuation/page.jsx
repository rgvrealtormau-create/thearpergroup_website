import { valuation } from '../../../lib/content';
import { ValuationForm } from '../../../components/site';
import { pageAlternates } from '../../../lib/site';

export async function generateMetadata({ params }) {
  const c = valuation[params.lang];
  return { title: c.metaTitle, description: c.metaDesc, alternates: pageAlternates(params.lang, 'home-valuation') };
}

export default function HomeValuation({ params }) {
  const c = valuation[params.lang];
  return (
    <section className="wrap py-16 md:py-24">
      <div className="grid gap-12 md:grid-cols-2">
        <div>
          <h1 className="text-4xl md:text-5xl italic">{c.title}</h1>
          <p className="mt-5 max-w-md text-lg text-ink/80">{c.lede}</p>
        </div>
        <div>
          <ValuationForm lang={params.lang} copy={c} />
        </div>
      </div>
    </section>
  );
}
