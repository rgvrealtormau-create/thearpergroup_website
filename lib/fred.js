// Server-only: today's Freddie Mac PMMS averages via the FRED API.
// Falls back to a flat estimate whenever the key is missing or the fetch fails,
// so the calculator never breaks for lack of an API key.

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';
const FALLBACK_RATE = 6.5;

async function fetchLatest(seriesId, apiKey) {
  const url = `${FRED_BASE}?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=1`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`FRED ${seriesId} responded ${res.status}`);
  const data = await res.json();
  const obs = data.observations && data.observations[0];
  if (!obs || obs.value === '.' || !obs.value) throw new Error(`FRED ${seriesId} has no usable observation`);
  return { value: Math.round(parseFloat(obs.value) * 100) / 100, date: obs.date };
}

// Returns { rate30, rate15, asOfDate, live }. Never throws.
export async function getMortgageRates() {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    return { rate30: FALLBACK_RATE, rate15: FALLBACK_RATE, asOfDate: null, live: false };
  }
  try {
    const [r30, r15] = await Promise.all([
      fetchLatest('MORTGAGE30US', apiKey),
      fetchLatest('MORTGAGE15US', apiKey),
    ]);
    return { rate30: r30.value, rate15: r15.value, asOfDate: r30.date, live: true };
  } catch {
    return { rate30: FALLBACK_RATE, rate15: FALLBACK_RATE, asOfDate: null, live: false };
  }
}
