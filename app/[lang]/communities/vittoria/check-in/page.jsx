import VittoriaLeadForm from '../../../../../components/VittoriaLeadForm';

// Model-home check-in (QR on the sign at the Vittoria model home → /vittoria/check-in).
// Not linked from the site, not in the sitemap, noindex.
export async function generateMetadata({ params }) {
  return {
    title: params.lang === 'es' ? 'Registro — casa modelo Vittoria' : 'Vittoria model home check-in',
    robots: { index: false, follow: false },
  };
}

const COPY = {
  en: { title: 'Vittoria model home check-in', lede: 'Agents: fill this in with your buyer so they get the details and you get credit for the visit. Buyers are welcome to fill it in themselves too.' },
  es: { title: 'Registro de visita — casa modelo Vittoria', lede: 'Agentes: llénenlo con su comprador para que reciba la información y ustedes reciban el crédito por la visita. El comprador también lo puede llenar.' },
};

export default function VittoriaCheckInPage({ params }) {
  const lang = params.lang;
  const c = COPY[lang] ?? COPY.en;
  return (
    <>
      <section className="bg-petrol text-cream">
        <div className="wrap py-10">
          <p className="text-xs uppercase tracking-[0.18em] text-gold">Vittoria · Weslaco</p>
          <h1 className="mt-2 text-3xl">{c.title}</h1>
          <p className="mt-3 max-w-xl text-sm text-cream/80">{c.lede}</p>
        </div>
      </section>
      <section className="wrap max-w-xl py-10">
        <VittoriaLeadForm lang={lang} mode="checkin" />
      </section>
    </>
  );
}
