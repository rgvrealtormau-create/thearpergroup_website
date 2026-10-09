// What the QR code on an open house sign points at: /open-house/<listing id>, with no
// language in it, so one printed sign serves everyone. It answers in the language of the
// visitor's phone (Spanish when the phone is set to Spanish, English otherwise); the page
// itself has a switch for anyone who wants the other one.

import { NextResponse } from 'next/server';
import { isListingId } from '../../../lib/openHouse';

export const dynamic = 'force-dynamic';

export function GET(request, { params }) {
  const first = (request.headers.get('accept-language') || '').trim().toLowerCase();
  const lang = first.startsWith('es') ? 'es' : 'en';
  const url = request.nextUrl.clone();
  url.search = '';
  url.pathname = isListingId(params.id) ? `/${lang}/open-house/${params.id.toLowerCase()}` : `/${lang}/listings`;
  return NextResponse.redirect(url, 307);
}
