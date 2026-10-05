import { BUILDHERE_EMBED_URL, BUILDHERE_INVENTORY_URL, publicCedarRidgeInventory } from '../../../lib/cedar-ridge-inventory';
import { NextResponse } from 'next/server';


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

    const inventory = publicCedarRidgeInventory(await response.json());
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
