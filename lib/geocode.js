// Placing a listing on the map.
//
// A listing gets its pin one of two ways:
//   1. The portal gave one (a "Map pin" typed on the listing there). Used exactly as given.
//   2. Otherwise this file looks the address up with the U.S. Census Bureau's geocoder,
//      a free public service that needs no account or key.
//
// A looked-up pin is only trusted inside the Rio Grande Valley: if the geocoder answers
// with a spot anywhere else (a same-named street in another city), the listing simply
// gets no pin. A listing without a pin still shows in the list beside the map.
//
// The Census data lags new construction, so a brand-new street may not be found. That
// is what the portal's "Map pin" box is for.

const GEOCODER_URL = process.env.GEOCODER_URL || 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress';

// An address rarely moves: keep an answer for 30 days before asking again.
const KEEP_SECONDS = 60 * 60 * 24 * 30;

// Hidalgo, Cameron, Starr and Willacy counties, with a little room around them.
export const VALLEY = { south: 25.8, north: 26.9, west: -99.3, east: -97.0 };
export const inValley = (pin) => Boolean(pin)
  && pin.lat >= VALLEY.south && pin.lat <= VALLEY.north && pin.lng >= VALLEY.west && pin.lng <= VALLEY.east;

// "901 E Yuma Ave #1002, McAllen, TX" -> "901 E Yuma Ave, McAllen, TX"
// Unit and suite numbers confuse the lookup, and the building is what gets the pin.
// Returns null for an address with no house number ("San Sebastian Lots"): there is
// nothing to look up.
export function geocodeQuery(address) {
  const whole = String(address || '').replace(/,\s*(USA|United States)\s*$/i, '').trim();
  const at = whole.indexOf(',');
  if (at === -1) return null;
  const street = whole.slice(0, at)
    .replace(/\s*(#|\b(unit|apt|apartment|suite|ste)\.?\s)\s*[\w-]+\s*$/i, '')
    .trim();
  if (!/^\d+\s+\S/.test(street)) return null;
  return `${street}, ${whole.slice(at + 1).trim()}`;
}

// The geocoder's answer -> { lat, lng }, or null when it found nothing usable.
// It lists longitude as x and latitude as y.
export function readCensus(json) {
  const match = json?.result?.addressMatches?.[0]?.coordinates;
  const pin = { lat: Number(match?.y), lng: Number(match?.x) };
  if (!match || !Number.isFinite(pin.lat) || !Number.isFinite(pin.lng)) return null;
  return inValley(pin) ? { lat: Math.round(pin.lat * 1e6) / 1e6, lng: Math.round(pin.lng * 1e6) / 1e6 } : null;
}

// One address -> its pin, or null. Never throws: a map with a pin missing is fine,
// a listings page that fails because a lookup service is slow is not.
export async function geocode(address, { fetchImpl = fetch } = {}) {
  const query = geocodeQuery(address);
  if (!query) return null;
  const url = `${GEOCODER_URL}?${new URLSearchParams({ address: query, benchmark: 'Public_AR_Current', format: 'json' })}`;
  try {
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(6000), next: { revalidate: KEEP_SECONDS } });
    if (!res.ok) return null;
    return readCensus(await res.json());
  } catch {
    return null;
  }
}

// Gives every card a `pin` ({ lat, lng } or null). A pin from the portal is kept as it is.
export async function withPins(cards, options) {
  return Promise.all(cards.map(async (card) => (card.pin ? card : { ...card, pin: await geocode(card.geo, options) })));
}
