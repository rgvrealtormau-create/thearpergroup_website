// Muse lead log -> Brivity. A Zap posts each new "To Brivity" row here (JSON, one row),
// and the row goes to Brivity's lead-parsing email with an ARPER Muse source, which starts
// the matching auto plan. No Brivity API key is involved. Rules in lib/museLeads.js.
//
// If MUSE_LEAD_TOKEN is set in the hosting settings, the Zap must send the same value in an
// "x-muse-token" header; anything else is turned away. Set it, because a Brivity lead can
// start an auto plan that emails the address it was given.

import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { sendBrivityEmail } from '../../../lib/brivity';
import { museLead } from '../../../lib/museLeads';

export const runtime = 'nodejs';

function tokenOk(request) {
  const expected = process.env.MUSE_LEAD_TOKEN;
  if (!expected) return true;
  const given = request.headers.get('x-muse-token') || '';
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request) {
  if (!tokenOk(request)) return NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const { lead, error } = museLead(body || {});
  if (error) return NextResponse.json({ ok: false, error }, { status: 400 });

  try {
    await sendBrivityEmail(lead);
  } catch (err) {
    console.error('[api/muse-lead] Brivity email failed:', err);
    return NextResponse.json({ ok: false, error: 'Brivity email failed' }, { status: 502 });
  }
  return NextResponse.json({ ok: true, source: lead.source });
}
