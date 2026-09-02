import '../globals.css';
import { Header, Footer } from '../../components/site';
import JsonLd from '../../components/JsonLd';
import { BUSINESS } from '../../lib/site';
import { halyard, larken } from '../../lib/fonts';

export const dynamicParams = false;
export function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'es' }];
}

export async function generateMetadata({ params }) {
  const lang = params.lang;
  return {
    metadataBase: new URL(BUSINESS.url),
    title: { default: 'The Arper Group — RGV Real Estate', template: '%s · The Arper Group' },
    alternates: { canonical: `/${lang}`, languages: { en: '/en', es: '/es' } },
  };
}

export default function LangLayout({ children, params }) {
  const lang = params.lang;
  const org = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    name: BUSINESS.name,
    url: BUSINESS.url,
    areaServed: BUSINESS.areaServed,
    address: { '@type': 'PostalAddress', addressLocality: BUSINESS.city, addressRegion: BUSINESS.region, addressCountry: 'US' },
    parentOrganization: { '@type': 'Organization', name: BUSINESS.broker },
    sameAs: [BUSINESS.instagram, BUSINESS.facebook, BUSINESS.googleBusiness].filter(Boolean),
    knowsLanguage: ['en', 'es'],
  };
  return (
    <html lang={lang} className={`${halyard.variable} ${larken.variable}`}>
      <body>
        <JsonLd data={org} />
        <Header lang={lang} />
        <main>{children}</main>
        <Footer lang={lang} />
      </body>
    </html>
  );
}
