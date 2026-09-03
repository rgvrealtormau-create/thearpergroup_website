import '../globals.css';
import { Header, Footer } from '../../components/site';
import JsonLd from '../../components/JsonLd';
import { BUSINESS, BUSINESS_ID, pageAlternates } from '../../lib/site';
import { halyard, larken } from '../../lib/fonts';

export const dynamicParams = false;
export function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'es' }];
}

export async function generateMetadata({ params }) {
  const lang = params.lang;
  const ogImage = {
    url: `${BUSINESS.url}/photos/hero.jpg`,
    width: 2000,
    height: 1333,
    alt: 'The Arper Group — Rio Grande Valley real estate',
  };
  return {
    metadataBase: new URL(BUSINESS.url),
    title: { default: 'The Arper Group — RGV Real Estate', template: '%s · The Arper Group' },
    alternates: pageAlternates(lang),
    openGraph: {
      siteName: 'The Arper Group',
      type: 'website',
      locale: lang === 'es' ? 'es_US' : 'en_US',
      alternateLocale: lang === 'es' ? 'en_US' : 'es_US',
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      images: [ogImage.url],
    },
  };
}

export default function LangLayout({ children, params }) {
  const lang = params.lang;
  // Real Google-verified sameAs profiles only — no placeholder/unverified URLs.
  const sameAs = [BUSINESS.instagram, BUSINESS.googleBusiness].filter(Boolean);
  const org = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    '@id': BUSINESS_ID,
    name: BUSINESS.name,
    url: BUSINESS.url,
    telephone: BUSINESS.phone,
    image: `${BUSINESS.url}/team.jpg`,
    areaServed: BUSINESS.areaServed,
    address: {
      '@type': 'PostalAddress',
      streetAddress: BUSINESS.street,
      addressLocality: BUSINESS.city,
      addressRegion: BUSINESS.region,
      postalCode: BUSINESS.postalCode,
      addressCountry: 'US',
    },
    parentOrganization: { '@type': 'Organization', name: BUSINESS.broker },
    sameAs,
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
