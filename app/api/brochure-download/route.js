// Counts every Vittoria brochure download, whether the visitor shared their info or not,
// as one row in the "Brochure downloads" tab of the sphere sheet (created on first use).

import { NextResponse } from 'next/server';
import { appendToTab } from '../../../lib/googleSheets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const OUTCOMES = {
  skip: 'Downloaded without sharing info',
  lead: 'Shared info (buyer)',
  agent: 'Shared info (real estate agent)',
};

export async function POST(request) {
  let body = {};
  try { body = JSON.parse(await request.text()); } catch { /* counted as unknown below */ }
  const outcome = OUTCOMES[body?.outcome];
  if (!outcome) return new NextResponse(null, { status: 400 });
  const lang = body?.lang === 'es' ? 'Spanish' : 'English';
  const when = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' });
  try {
    await appendToTab('Brochure downloads', ['Date (CT)', 'Brochure', 'Page language', 'Outcome'], [when, 'Vittoria', lang, outcome]);
  } catch (error) {
    console.error('[api/brochure-download] count failed:', error);
  }
  return new NextResponse(null, { status: 204 });
}
