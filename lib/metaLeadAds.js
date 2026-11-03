// Meta lead ads (Facebook / Instagram instant forms) that reach /api/lead through a Google
// Sheet's Apps Script. Each campaign has its own formType, Brivity source and alert:
//
//   vittoria_meta_ad   "Meta Leads – Vittoria" sheet   -> ARPER Meta - Vittoria EN|ES
//   northpark_meta_ad  "Meta Leads – North Park" sheet -> ARPER Meta - North Park EN|ES
//
// The script sends the form's answers as one `detail` string, and those answers are added to
// the Brivity note (and so to the portal's leads inbox) for every Meta ad form.

export const META_AD_FORMS = new Set(['vittoria_meta_ad', 'northpark_meta_ad']);

// The Brivity source for a Meta lead ad, or null when the form is not one. Must match a source
// in Brivity > Settings > Sources exactly, or Brivity leaves the source blank and no plan starts.
export function metaAdSource(formType, lang) {
  const L = lang === 'es' ? 'ES' : 'EN';
  if (formType === 'vittoria_meta_ad') return `ARPER Meta - Vittoria ${L}`;
  if (formType === 'northpark_meta_ad') return `ARPER Meta - North Park ${L}`;
  return null;
}

// The North Park script starts `detail` with its own label ("North Park fourplex Meta lead ad
// (EN) — 11501 N 25th St — "), which the note already carries. It is left off the note so the
// answers are not preceded by the same words twice.
const NORTHPARK_PREFIX = /^\s*North Park fourplex Meta lead ad\s*(\((?:EN|ES)\))?\s*[—–-]\s*(11501 N 25th St\s*[—–-]\s*)?/i;

export function metaAdAnswers(formType, detail) {
  const text = String(detail || '').trim();
  if (!text) return '';
  return formType === 'northpark_meta_ad' ? text.replace(NORTHPARK_PREFIX, '').trim() : text;
}

// "cash or financing: financing; timeline: 1-3 months; call time: evenings" -> [[label, value]].
// A piece without a "label:" is kept whole, with an empty label, so nothing the lead said is lost.
export function splitAnswers(answers) {
  return String(answers || '')
    .split(/;\s*/)
    .map((piece) => piece.trim())
    .filter(Boolean)
    .map((piece) => {
      const at = piece.indexOf(':');
      return at > 0 ? [piece.slice(0, at).trim(), piece.slice(at + 1).trim()] : ['', piece];
    });
}

// The answer whose label mentions the call time ("call time", "best time to call", "hora ..."),
// shown at the top of the alert because it is what the agent acts on first.
export function callTimeAnswer(pairs) {
  const hit = pairs.find(([label]) => /call|llamada|hora/i.test(label) && !/consent|acepto|agree/i.test(label));
  return hit ? hit[1] : null;
}
