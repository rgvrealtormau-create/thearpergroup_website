import ContactForm from './ContactForm';
import { contactCopy } from '../lib/content';
import { BUSINESS } from '../lib/site';

// Heading, click-to-call / text links, the office, and the contact form side by side.
// Used on /contact (as the page's h1) and near the end of the home page.
export default function ContactSection({ lang, asPageTitle = false, page }) {
  const c = contactCopy[lang];
  const digits = BUSINESS.phone.replace(/[^0-9+]/g, '');
  const Title = asPageTitle ? 'h1' : 'h2';
  return (
    <section id="contact" className="scroll-mt-20 border-b border-ink/10 bg-cream">
      <div className="wrap grid gap-10 py-16 md:grid-cols-2 md:gap-16 md:py-20">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-petrol/70">{c.eyebrow}</p>
          <Title className="mt-3 text-3xl md:text-4xl">
            {c.titlePre}
            <span className="italic">{c.titleAccent}</span>
          </Title>
          <p className="mt-4 max-w-md text-ink/75">{c.body}</p>
          <div className="mt-8 text-sm text-ink/70">{c.callOrText} · Mauricio</div>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <a href={`tel:${digits}`} className="inline-flex min-h-[44px] items-center text-2xl link-underline">{BUSINESS.phoneDisplay}</a>
            <a href={`sms:${digits}`} className="inline-flex min-h-[44px] items-center rounded-sm border border-petrol px-4 text-sm text-petrol hover:bg-petrol hover:text-cream">{c.text}</a>
          </div>
          <div className="mt-6 text-sm text-ink/70">{c.emailLabel}</div>
          <a href={`mailto:${BUSINESS.email}`} className="mt-1 inline-flex min-h-[44px] items-center link-underline">{BUSINESS.email}</a>
          <div className="mt-4 text-sm text-ink/70">{c.office}</div>
          <address className="mt-1 not-italic text-ink/85">
            {BUSINESS.street}<br />
            {BUSINESS.city}, {BUSINESS.region} {BUSINESS.postalCode}
          </address>
        </div>
        <ContactForm lang={lang} page={page} />
      </div>
    </section>
  );
}
