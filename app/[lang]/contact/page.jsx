import ContactSection from '../../../components/ContactSection';
import { contactCopy } from '../../../lib/content';
import { pageAlternates } from '../../../lib/site';

export async function generateMetadata({ params }) {
  const c = contactCopy[params.lang];
  return { title: c.metaTitle, description: c.metaDesc, alternates: pageAlternates(params.lang, 'contact') };
}

export default function Contact({ params }) {
  return <ContactSection lang={params.lang} asPageTitle page="Contact page" />;
}
