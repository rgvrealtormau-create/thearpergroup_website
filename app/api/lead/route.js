// Website leads -> sphere nurture Google Sheet + Brivity lead-parsing email.
// Runs alongside the existing Web3Forms/Gmail notification (unaffected by this route).

import { NextResponse } from 'next/server';
import { appendLeadRow } from '../../../lib/googleSheets';
import { sendBrivityEmail } from '../../../lib/brivity';
import { VITTORIA_MODEL_HOME_AGENTS, parseVittoriaLotParams } from '../../../lib/site';
import { sendVittoriaWelcomeEmail, sendVittoriaLeadAlert } from '../../../lib/vittoriaEmail';
import { featuredInquiryOptions } from '../../../lib/content';

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
  cedar_ridge_reserve: { label: 'Website — Cedar Ridge Reserve', note: 'Cedar Ridge Reserve inquiry' },
  vittoria: { label: 'Website — Vittoria', note: 'Vittoria townhomes inquiry' },
  vittoria_model_home: { label: 'Website — Vittoria model home', note: 'Vittoria model home check-in' },
  featured_listings: { label: 'Website — Featured Listings', note: 'Featured listings inquiry' },
};

// The Featured listings form sends the slug of the listing the visitor picked. It is
// looked up against the site's own list (this endpoint is public), so only a real
// listing name ever reaches the sheet and Brivity.
function featuredListingLabel(slug) {
  if (typeof slug !== 'string') return null;
  return featuredInquiryOptions('en').find((option) => option.slug === slug)?.label || null;
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
  const featuredListing = formType === 'featured_listings' ? featuredListingLabel(listing) : null;
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

  const sheetNotes = detail
    ? `${brivityNote} — submitted ${submittedAt} CT\nBuyer message: ${detail}`
    : `${brivityNote} — submitted ${submittedAt} CT`;

  const howIKnowThem = referral ? `${meta.label} — referred by ${referral}` : meta.label;

  // Column order matches the live "Sphere Nurture Database" sheet header row:
  // Name, Contact Type, How I Know Them, Phone, Email, Preferred Channel, Language,
  // Home Purchase/Sale Date, Birthday, Kids, Work, Interests, Last Contacted, Notes, Synced, ListingID
  const sheetRow = [
    name,
    'Active Lead',
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
  const isVittoria = formType === 'vittoria' || formType === 'vittoria_model_home';
  const wantsWelcome = isVittoria && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');

  const [sheetResult, emailResult, welcomeResult, alertResult] = await Promise.allSettled([
    appendLeadRow(sheetRow),
    sendBrivityEmail({ firstName, lastName, email, phone, note: brivityEmailNote }),
    wantsWelcome ? sendVittoriaWelcomeEmail({ to: email, name, lang, referralAgent: referral }) : Promise.resolve(null),
    isVittoria
      ? sendVittoriaLeadAlert({ name, phone, email, lang, source: meta.label, referralAgent: referral, buyerAgent, detail, submittedAt })
      : Promise.resolve(null),
  ]);
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
