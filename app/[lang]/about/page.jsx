import { about } from '../../../lib/content';

export async function generateMetadata({ params }) {
  const c = about[params.lang];
  return { title: c.metaTitle, description: c.metaDesc };
}

export default function About({ params }) {
  const c = about[params.lang];
  return (
    <>
      <section className="bg-forest text-cream">
        <div className="wrap py-20">
          <h1 className="max-w-3xl text-4xl md:text-6xl italic">{c.title}</h1>
          <p className="mt-6 max-w-2xl text-lg text-cream/85">{c.intro}</p>
        </div>
      </section>

      <section className="wrap grid gap-12 py-16 md:grid-cols-2 md:py-20">
        <div>
          <h2 className="text-2xl md:text-3xl">{c.storyTitle}</h2>
          <p className="mt-4 text-ink/80">{c.story}</p>
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl">{c.povTitle}</h2>
          <p className="mt-4 text-ink/80">{c.pov}</p>
        </div>
      </section>

      <section className="bg-cream">
        <div className="wrap py-16 md:py-20">
          <h2 className="text-3xl md:text-4xl">{c.valuesTitle}</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {c.values.map((v) => (
              <div key={v.h} className="border-t-2 border-gold pt-4">
                <div className="font-display text-xl">{v.h}</div>
                <p className="mt-2 text-sm text-ink/75">{v.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="wrap py-16 md:py-20">
        <h2 className="text-3xl md:text-4xl">{c.peopleTitle}</h2>
        <div className="mt-10 grid gap-10 md:grid-cols-2">
          {c.people.map((p) => (
            <div key={p.name} className="border-t-2 border-petrol pt-5">
              <div className="font-display text-2xl">{p.name}</div>
              <div className="text-sm text-petrol">{p.role}</div>
              <p className="mt-3 text-ink/80">{p.b}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
