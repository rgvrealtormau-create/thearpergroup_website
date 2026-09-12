// Website leads -> sphere nurture Google Sheet + Brivity lead-parsing email.
// Runs alongside the existing Web3Forms/Gmail notification (unaffected by this route).

import { NextResponse } from 'next/server';
import { appendLeadRow } from '../../../lib/googleSheets';
import { sendBrivityEmail } from '../../../lib/brivity';

export const runtime = 'nodejs';

const LANGUAGE_LABEL = { en: 'English', es: 'Spanish' };

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
};

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

  const { formType, lang, name, email, phone, address, detail } = body || {};

  if (!name || (!email && !phone)) {
    return NextResponse.json({ ok: false, error: 'Missing name or contact info' }, { status: 400 });
  }

  const { firstName, lastName } = splitName(name);
  const submittedAt = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' });

  const meta = FORM_META[formType] || FORM_META.home_valuation;
  const brivityNote = formType === 'home_valuation' && address
    ? `${meta.note} — ${address}`
    : meta.note;
  const brivityNoteWithLang = lang ? `${brivityNote} (${String(lang).toUpperCase()})` : brivityNote;

  const sheetNotes = detail
    ? `${brivityNote} — submitted ${submittedAt} CT\n${detail}`
    : `${brivityNote} — submitted ${submittedAt} CT`;

  const howIKnowThem = meta.label;

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

  const [sheetResult, emailResult] = await Promise.allSettled([
    appendLeadRow(sheetRow),
    sendBrivityEmail({ firstName, lastName, email, phone, note: brivityNoteWithLang }),
  ]);

  const sheetOk = sheetResult.status === 'fulfilled';
  const emailOk = emailResult.status === 'fulfilled';
  if (!sheetOk) console.error('[api/lead] sheet append failed:', sheetResult.reason);
  if (!emailOk) console.error('[api/lead] Brivity email failed:', emailResult.reason);

  return NextResponse.json(
    { ok: sheetOk || emailOk, sheet: sheetOk, email: emailOk },
    { status: sheetOk || emailOk ? 200 : 502 }
  );
}
