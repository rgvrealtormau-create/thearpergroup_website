import { NextResponse } from 'next/server';

const BUILDHERE_INVENTORY_URL = 'https://subdivision-plat-app.vercel.app/api/public/communities/cedar-ridge-reserve-892049/inventory';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const response = await fetch(BUILDHERE_INVENTORY_URL, { cache: 'no-store' });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Inventory is temporarily unavailable.' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const inventory = await response.json();
    return NextResponse.json(inventory, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    });
  } catch {
    return NextResponse.json(
      { error: 'Inventory is temporarily unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
