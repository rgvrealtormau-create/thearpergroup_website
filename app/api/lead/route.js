// Website leads -> sphere nurture Google Sheet + Brivity lead-parsing email.
// Runs alongside the existing Web3Forms/Gmail notification (unaffected by this route).

import { NextResponse } from 'next/server';
import { appendLeadRow } from '../../../lib/googleSheets';
import { sendBrivityEmail } from '../../../lib/brivity';
import { VITTORIA_MODEL_HOME_AGENTS, parseVittoriaLotParams } from '../../../lib/site';
import { sendVittoriaWelcomeEmail, sendVittoriaLeadAlert } from '../../../lib/vittoriaEmail';
import { getFeaturedListings, inquiryOptions } from '../../../lib/listings';
import { sendToPortal } from '../../../lib/portalLeads';

export const runtime = 'nodejs';

const LANGUAGE_LABEL = { en: 'English', es: 'Spanish' };
import { BUILDHERE_INVENTORY_URL as CEDAR_RIDGE_INVENTORY_URL, publicCedarRidgeInventory } from '../../../lib/cedar-ridge-inventory';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function money(value) {
  if (value == null) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

async function getCurrentCedarRidgeLot(lotId) {
  if (!UUID_RE.test(lotId || '')) return null;
  try {
    const response = await fetch(CEDAR_RIDGE_INVENTORY_URL, { cache: 'no-store' });
    if (!response.ok) return null;
    const inventory = publicCedarRidgeInventory(await response.json());
    return inventory.lots?.find((lot) => lot.id === lotId) || null;
  } catch {
    return null;
  }
}

// Every soft-capture form on the site shares this shape (name + phone, optional
// email/detail) except home_valuation, which is handled separately below.
const FORM_META = {
  home_valuation: { label: 'Website — Home Valuation', note: 'Home valuation request' },
  mortgage_calculator: { label: 'Website — Mortgage Calculator', note: 'Mortgage calculator inquiry' },
  flip_calculator: { label: 'Website — Flip Calculator', note: 'Flip calculator inquiry' },
  closing_cost_estimator: { label: 'Website — Closing Cost Estimator', note: 'Closing cost estimator inquiry' },
  investment_property_calculator: { label: 'Website — Investment Property Calculator', note: 'Investment property calculator inquiry' },
  title_policy_calculator: { label: 'Website — Title Policy Calculator', note: 'Title policy calculator inquiry' },
  seller_net_proceeds_calculator: { label: 'Website — Seller Net Proceeds Calculator', note: 'Seller net proceeds calculator inquiry' },
  sell_buy_keep_calculator: { label: 'Website — Sell/Buy/Keep Calculator', note: 'Sell first / buy first / keep it calculator inquiry' },
  cedar_ridge_reserve: { label: 'Website — Cedar Ridge Reserve', note: 'Cedar Ridge Reserve inquiry' },
  vittoria: { label: 'Website — Vittoria', note: 'Vittoria townhomes inquiry' },
  vittoria_meta_ad: { label: 'Meta Ad — Vittoria', note: 'Vittoria pre-sale Meta lead ad' },
  vittoria_model_home: { label: 'Website — Vittoria model home', note: 'Vittoria model home check-in' },
  vittoria_brochure: { label: 'Website — Vittoria brochure', note: 'Vittoria brochure download' },
  vittoria_agent: { label: 'Website — Vittoria co-op agent', note: 'Agent downloaded the Vittoria brochure for a client' },
  featured_listings: { label: 'Website — Featured Listings', note: 'Featured listings inquiry' },
};

// The Featured listings form sends the id of the listing the visitor picked. It is
// looked up against what the page itself is showing (this endpoint is public), so only
// a real listing name ever reaches the sheet and Brivity. If the portal cannot be
// reached the lead is still saved, just without the listing's name in the note.
async function featuredListingLabel(slug) {
  if (typeof slug !== 'string') return null;
  let cards = [];
  try { cards = await getFeaturedListings(); } catch { /* communities can still be matched */ }
  return inquiryOptions('en', cards).find((option) => option.slug === slug)?.labelEn || null;
}

const SELLER_FORMS = new Set(['home_valuation', 'seller_net_proceeds_calculator']);

// Inquiries about a specific listing or lot (not calculator users) get their own plan.
const LISTING_FORMS = new Set(['featured_listings', 'cedar_ridge_reserve']);

// The Brivity source for a website lead. Must match a source in Brivity > Settings > Sources
// exactly, or Brivity leaves the source blank and no auto plan starts.
function brivitySource({ formType, lang, isVittoria, isCoopAgent, referral }) {
  const L = lang === 'es' ? 'ES' : 'EN';
  if (isCoopAgent) return 'ARPER Website - Co-op Agent';
  if (formType === 'vittoria_meta_ad') return `ARPER Meta - Vittoria ${L}`;
  if (isVittoria) return referral ? `ARPER Website - Vittoria Visited ${L}` : `ARPER Website - Vittoria ${L}`;
  if (SELLER_FORMS.has(formType)) return `ARPER Website - Seller ${L}`;
  if (LISTING_FORMS.has(formType)) return `ARPER Website - Listing Inquiry ${L}`;
  return `ARPER Website - Buyer ${L}`;
}

function splitName(name) {
  const trimmed = (name || '').trim().replace(/\s+/g, ' ');
  if (!trimmed) return { firstName: '', lastName: '' };
  const parts = trimmed.split(' ');
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const { formType, lang, name, email, phone, address, detail, lotId, referralAgent, buyerAgent, lot, community, subject, listing } = body || {};
  const featuredListing = formType === 'featured_listings' ? await featuredListingLabel(listing) : null;
  // Only credit agents on the model-home roster, so the referral column stays clean.
  const referral = VITTORIA_MODEL_HOME_AGENTS.includes(referralAgent) ? referralAgent : null;
  // Re-validate the BuildHere lot fields server-side too (this endpoint is public and could
  // be called directly), and only for the public Vittoria form — never the check-in flow.
  const vittoriaLot = formType === 'vittoria' ? parseVittoriaLotParams({ lot, lotId, community, subject }) : null;

  if (!name || (!email && !phone)) {
    return NextResponse.json({ ok: false, error: 'Missing name or contact info' }, { status: 400 });
  }

  const { firstName, lastName } = splitName(name);
  const submittedAt = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' });

  const meta = FORM_META[formType] || FORM_META.home_valuation;
  const selectedLot = formType === 'cedar_ridge_reserve' ? await getCurrentCedarRidgeLot(lotId) : null;
  const lotAttribution = selectedLot
    ? `Lot ${selectedLot.lot_number}${selectedLot.phase ? ` · Phase ${selectedLot.phase}` : ''}${selectedLot.public_status ? ` · ${selectedLot.public_status}` : ''}${selectedLot.price != null ? ` · ${money(selectedLot.price)}` : ''} · UUID ${selectedLot.id}`
    : null;
  const baseBrivityNote = formType === 'home_valuation' && address
    ? `${meta.note} — ${address}`
    : featuredListing
      ? `${meta.note} — ${featuredListing}`
      : meta.note;
  const withLot = lotAttribution ? `${baseBrivityNote} — ${lotAttribution}` : baseBrivityNote;
  const withReferral = referral ? `${withLot} — referred by ${referral} (Alliance)` : withLot;
  const brivityNote = buyerAgent ? `${withReferral} — buyer's agent: ${buyerAgent}` : withReferral;
  const brivityNoteWithLang = lang ? `${brivityNote} (${String(lang).toUpperCase()})` : brivityNote;

  // Brivity's note excludes `detail` (unlike the Sheet, which appends it below), so
  // Vittoria's BuildHere lot attribution is added here from the validated structured
  // fields to make sure it actually reaches Brivity too.
  const vittoriaAttribution = vittoriaLot
    ? `${vittoriaLot.community}${vittoriaLot.lot ? ` · Lot ${vittoriaLot.lot}` : ''}${vittoriaLot.lotId ? ` · UUID ${vittoriaLot.lotId}` : ''} · Subject: ${vittoriaLot.subject}`
    : null;
  const brivityEmailNote = vittoriaAttribution ? `${brivityNoteWithLang} — ${vittoriaAttribution}` : brivityNoteWithLang;
  // Meta lead-ad answers (timeline, agent, lender) are short and worth having in Brivity too.
  const brivityNoteFinal = formType === 'vittoria_meta_ad' && detail ? `${brivityEmailNote} — ${detail}` : brivityEmailNote;

  const sheetNotes = detail
    ? `${brivityNote} — submitted ${submittedAt} CT\nBuyer message: ${detail}`
    : `${brivityNote} — submitted ${submittedAt} CT`;

  const howIKnowThem = referral ? `${meta.label} — referred by ${referral}` : meta.label;

  // Column order matches the live "Sphere Nurture Database" sheet header row:
  // Name, Contact Type, How I Know Them, Phone, Email, Preferred Channel, Language,
  // Home Purchase/Sale Date, Birthday, Kids, Work, Interests, Last Contacted, Notes, Synced, ListingID
  const sheetRow = [
    name,
    formType === 'vittoria_agent' ? 'Referral Partner' : 'Active Lead',
    howIKnowThem,
    phone || '',
    email || '',
    '',
    LANGUAGE_LABEL[lang] || '',
    '',
    '',
    '',
    '',
    address || '',
    '',
    sheetNotes,
    '',
    '',
  ];

  // Vittoria buyers who leave an email get an automatic welcome email with the page link.
  const isVittoria = ['vittoria', 'vittoria_model_home', 'vittoria_brochure', 'vittoria_agent', 'vittoria_meta_ad'].includes(formType);
  // An agent downloading the brochure for a client is a co-op contact, not a buyer: no
  // buyer welcome email, no lead type, and a source no buyer plan starts on.
  const isCoopAgent = formType === 'vittoria_agent';
  const wantsWelcome = isVittoria && !isCoopAgent && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');

  // The exact Brivity source, used for Brivity and for the portal's leads inbox alike.
  const source = brivitySource({ formType, lang, isVittoria, isCoopAgent, referral });
  // The portal gets what Brivity gets, plus the visitor's own words when they wrote any.
  const portalMessage = detail && formType !== 'vittoria_meta_ad' ? `${brivityNoteFinal}\n\n${detail}` : brivityNoteFinal;
  const listingId = typeof listing === 'string' && UUID_RE.test(listing) ? listing : null;

  const [sheetResult, emailResult, welcomeResult, alertResult, portalResult] = await Promise.allSettled([
    appendLeadRow(sheetRow),
    sendBrivityEmail({
      firstName, lastName, email, phone, note: brivityNoteFinal,
      type: isCoopAgent ? null : SELLER_FORMS.has(formType) ? 'Seller' : 'Buyer',
      // Brivity only keeps a lead's source when it matches a source in Brivity exactly, and
      // each ARPER source (with its language) starts its own ARPER auto plan.
      source,
      propertyAddress: formType === 'home_valuation' ? address : undefined,
    }),
    wantsWelcome ? sendVittoriaWelcomeEmail({ to: email, name, lang, referralAgent: referral }) : Promise.resolve(null),
    isVittoria
      ? sendVittoriaLeadAlert({ name, phone, email, lang, source: meta.label, referralAgent: referral, buyerAgent, detail, submittedAt })
      : Promise.resolve(null),
    // The portal's shared leads inbox (Mauricio and Pam), the moment the lead comes in.
    sendToPortal({ name, phone, email, lang, source, message: portalMessage, listing: listingId }),
  ]);
  if (portalResult.status === 'rejected' || portalResult.value?.error) console.error('[api/lead] portal inbox failed:', portalResult.reason || portalResult.value);
  if (welcomeResult.status === 'rejected') console.error('[api/lead] Vittoria welcome email failed:', welcomeResult.reason);
  if (alertResult.status === 'rejected') console.error('[api/lead] Vittoria lead alert failed:', alertResult.reason);
  else if (isVittoria) console.log('[api/lead] Vittoria lead alert sent; brivity:', emailResult.status, 'sheet:', sheetResult.status);

  const sheetOk = sheetResult.status === 'fulfilled';
  const emailOk = emailResult.status === 'fulfilled';
  if (!sheetOk) console.error('[api/lead] sheet append failed:', sheetResult.reason);
  if (!emailOk) console.error('[api/lead] Brivity email failed:', emailResult.reason);

  return NextResponse.json(
    { ok: sheetOk || emailOk, sheet: sheetOk, email: emailOk },
    { status: sheetOk || emailOk ? 200 : 502 }
  );
}
