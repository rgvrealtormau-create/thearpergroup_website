// "See cash to close / monthly payment for these numbers": carries one calculator's
// inputs to its sibling calculator in the URL fragment (#price=…&dp=…).
//
// A fragment, not a query string, on purpose: it is never sent to the server and search
// engines ignore it, so the links add no crawlable URL variants of the calculator pages.
//
// Shared keys: price, dp (down payment %), rate, rt (1 = rate typed by hand), city,
// tax (only when typed by hand), ins. Each calculator also writes its own keys and passes
// along any it doesn't use, so going there and back loses nothing.

export function readHandoff() {
  if (typeof window === 'undefined') return {};
  const raw = window.location.hash.slice(1);
  if (!raw.includes('=')) return {};
  return Object.fromEntries(new URLSearchParams(raw));
}

// Empty, null and undefined values are left out of the link.
export function handoffHref(lang, path, params) {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') q.set(key, String(value));
  }
  return `/${lang}/${path}#${q.toString()}`;
}

// A numeric field from the link, sanitized the way the calculators' own inputs are as you
// type. Returns '' when the key is missing or holds no digits, so junk is simply ignored.
export function handoffNumber(params, key) {
  const cleaned = String(params[key] ?? '').replace(/[^0-9.]/g, '');
  return /\d/.test(cleaned) ? cleaned : '';
}

// Brings the result card into view on arrival — on a phone it sits below every input.
export function scrollToResults() {
  document.getElementById('calc-results')?.scrollIntoView({ block: 'start' });
}
