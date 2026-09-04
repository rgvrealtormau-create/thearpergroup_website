// Groups a city's `picks` (from lib/content.js) by category and renders
// Mauricio & Pamela's real, first-person recommendations.
export default function LocalFavorites({ picks, cityName, lang }) {
  if (!picks || picks.length === 0) return null;

  const grouped = [];
  const byCategory = new Map();
  for (const p of picks) {
    if (!byCategory.has(p.category)) {
      byCategory.set(p.category, []);
      grouped.push(p.category);
    }
    byCategory.get(p.category).push(p);
  }

  return (
    <section className="bg-paper">
      <div className="wrap py-16 md:py-20">
        <p className="text-sm text-petrol/70">
          {lang === 'es' ? 'Nuestros favoritos' : 'Our favorites'}
        </p>
        <h2 className="mt-2 text-2xl md:text-3xl">
          {lang === 'es' ? `Lo que de verdad hacemos en ${cityName}` : `Where we actually go in ${cityName}`}
        </h2>
        <p className="mt-3 max-w-2xl text-ink/70">
          {lang === 'es'
            ? 'Nuestros lugares reales, no una lista genérica — los que le decimos a nuestros clientes.'
            : "Our real picks, not a generic list — the spots we tell our own clients about."}
        </p>

        <div className="mt-10 grid gap-x-10 gap-y-12 md:grid-cols-2">
          {grouped.map((category) => (
            <div key={category}>
              <h3 className="text-xs font-medium uppercase tracking-wide text-petrol">{category}</h3>
              <ul className="mt-4 space-y-4">
                {byCategory.get(category).map((p) => (
                  <li key={p.place} className="border-t border-ink/10 pt-4">
                    <p className="font-medium text-ink">
                      {p.place}
                      {p.where ? <span className="font-normal text-ink/50"> — {p.where}</span> : null}
                    </p>
                    {p.why ? <p className="mt-1 text-sm italic text-ink/75">&ldquo;{p.why}&rdquo;</p> : null}
                    <p className="mt-1 text-xs text-ink/45">
                      {lang === 'es' ? 'Elegido por' : 'Picked by'} {p.pickedBy}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
