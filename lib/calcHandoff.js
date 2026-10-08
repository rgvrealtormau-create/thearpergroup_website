// Calculator links that carry the numbers with them, in the URL fragment (#price=…&dp=…).
// Two uses, one format:
//   - "Share a link to these numbers" on every calculator (components/ShareLink.jsx)
//   - "See cash to close / monthly payment for these numbers" between the mortgage
//     calculator and the closing cost estimator, which share their main keys.
//
// A fragment, not a query string, on purpose: it is never sent to the server and search
// engines ignore it, so these links add no crawlable URL variants of the calculator pages.
//
// Each calculator describes its inputs once, as a table of fields:
//   key: { value, set, def?, type?, oneOf? }
//     def     written to the link only when the value differs from it. Leave def out to
//             always write the value, or pass value '' to skip it — that is how a figure
//             the calculator estimates on its own (tax, today's rate) stays out of the
//             link until someone types over it, so it stays live for whoever opens it.
//     type    'bool' or 'date'; anything else is a number held as a string.
//     oneOf   the allowed values, for a dropdown or a set of buttons.

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
  const fragment = q.toString();
  return `/${lang}/${path}${fragment ? `#${fragment}` : ''}`;
}

// A numeric field from the link, sanitized the way the calculators' own inputs are as you
// type. Returns '' when the key is missing or holds no digits, so junk is simply ignored.
export function handoffNumber(params, key) {
  const cleaned = String(params[key] ?? '').replace(/[^0-9.]/g, '');
  return /\d/.test(cleaned) ? cleaned : '';
}

// The link parameters for a table of fields.
export function shareParams(fields) {
  const params = {};
  for (const [key, field] of Object.entries(fields)) {
    if (field.type === 'bool') params[key] = field.value ? 1 : '';
    else params[key] = field.def !== undefined && String(field.value) === String(field.def) ? '' : field.value;
  }
  return params;
}

// Applies whatever the link carries to a table of fields. Anything missing, malformed or
// outside a field's allowed values is skipped, leaving that input on its default.
export function applyShared(params, fields) {
  for (const [key, field] of Object.entries(fields)) {
    if (!Object.hasOwn(params, key)) continue;
    const raw = params[key];
    if (field.type === 'bool') {
      if (raw === '1') field.set(true);
    } else if (field.type === 'date') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) field.set(raw);
    } else if (field.oneOf) {
      const match = field.oneOf.find((option) => String(option) === raw);
      if (match !== undefined) field.set(match);
    } else {
      const cleaned = handoffNumber(params, key);
      if (cleaned) field.set(cleaned);
    }
  }
}

// Brings the result card into view on arrival — on a phone it sits below every input.
export function scrollToResults() {
  document.getElementById('calc-results')?.scrollIntoView({ block: 'start' });
}
