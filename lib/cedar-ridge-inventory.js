export const BUILDHERE_ORIGIN = 'https://www.buildhere.app';
export const BUILDHERE_EMBED_URL = `${BUILDHERE_ORIGIN}/c/cedar-ridge-reserve-892049`;
export const BUILDHERE_INVENTORY_URL = `${BUILDHERE_ORIGIN}/api/public/communities/cedar-ridge-reserve-892049/inventory`;

export function publicCedarRidgeInventory(inventory) {
  if (!inventory) return null;
  return {
    ...inventory,
    lots: (inventory.lots || []).filter((lot) => /^\d+$/.test(String(lot.lot_number).trim())).map((lot) => ({
      ...lot,
      price: String(lot.public_status).trim().toLowerCase() === 'sold' ? null : lot.price,
    })),
  };
}
