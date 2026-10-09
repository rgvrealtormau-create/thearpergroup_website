// One open house sign-in -> the portal, the sphere sheet, Brivity, and two emails.
// The rules, and why each visitor goes where, are in lib/openHouse.js.

import { NextResponse } from 'next/server';
import { getFeaturedListings, cardTitle } from '../../../lib/listings';
import { appendLeadRow } from '../../../lib/googleSheets';
import { sendBrivityEmail } from '../../../lib/brivity';
import { cleanSignIn, recordVisitor, joinsFollowUp, sheetRow, leadNote, phonePretty } from '../../../lib/openHouse';
import { sendOpenHouseThanks, sendOpenHouseAlert } from '../../../lib/openHouseEmail';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const settled = (result) => result.status === 'fulfilled';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 });
  }
  // The hidden box a person never sees: a filled one is a script. It is told "ok" and nothing is kept.
  if (body && body.botcheck) return NextResponse.json({ ok: true });

  const signIn = cleanSignIn(body);
  if (signIn.error) return NextResponse.json({ ok: false, error: signIn.error }, { status: 400 });

  // The listing's name, for the sheet and the emails. Only a listing the page itself can show
  // gets this far, so a made-up id never reaches the sheet, Brivity or anyone's inbox.
  let card = null;
  try {
    card = (await getFeaturedListings()).find((c) => c.slug === signIn.listing) || null;
  } catch { /* the portal could not be asked for its listings; it is asked directly below */ }

  // The portal keeps the sign-in, and is also the one that knows whether the listing is real.
  const kept = await recordVisitor(signIn);
  if (kept.error && kept.error !== 'unreachable') {
    return NextResponse.json({ ok: false, error: kept.error }, { status: kept.error === 'full' ? 429 : 400 });
  }
  // The portal could not be reached and we cannot name the listing either: nothing to go on.
  if (!kept.ok && !card) return NextResponse.json({ ok: false, error: 'unreachable' }, { status: 502 });

  const street = card ? cardTitle(card, 'en') : 'our open house';
  const city = card ? String(card.city || '').split(',')[0].trim() : '';
  const home = [street, city].filter(Boolean).join(', ');
  const submittedAt = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' });
  const nurture = joinsFollowUp(signIn);
  const [firstName, ...rest] = signIn.name.split(' ');

  // A second tap by the same visitor refreshes their answers in the portal; it does not add
  // them to the sheet or Brivity again, or email them twice.
  const fresh = !kept.again;
  const [sheet, brivity, thanks] = await Promise.allSettled([
    nurture && fresh ? appendLeadRow(sheetRow(signIn, home, submittedAt)) : Promise.resolve(null),
    nurture && fresh
      ? sendBrivityEmail({ firstName, lastName: rest.join(' '), email: signIn.email, phone: phonePretty(signIn.phone), note: leadNote(signIn, home) })
      : Promise.resolve(null),
    signIn.email && fresh ? sendOpenHouseThanks({ signIn, card, home }) : Promise.resolve(null),
  ]);
  if (!settled(sheet)) console.error('[api/open-house] sheet append failed:', sheet.reason);
  if (!settled(brivity)) console.error('[api/open-house] Brivity email failed:', brivity.reason);
  if (!settled(thanks)) console.error('[api/open-house] thank-you email failed:', thanks.reason);
  if (!kept.ok) console.error('[api/open-house] the portal could not be reached; the sign-in is in the alert email only');

  let alerted = !fresh;
  if (fresh) {
    try {
      await sendOpenHouseAlert({
        signIn, home, submittedAt,
        saved: { portal: kept.ok === true, sheet: nurture ? settled(sheet) : null, brivity: nurture ? settled(brivity) : null },
      });
      alerted = true;
    } catch (error) {
      console.error('[api/open-house] team alert failed:', error);
    }
  }

  // The visitor is told it worked when the sign-in is somewhere a person will see it.
  const ok = kept.ok === true || alerted || (nurture && (settled(sheet) || settled(brivity)));
  return NextResponse.json({ ok, portal: kept.ok === true }, { status: ok ? 200 : 502 });
}
