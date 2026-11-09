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

// The answer to "when / how should we reach you", shown at the top of the alert because it is
// what the agent acts on first. North Park asks "call time"; the Vittoria v3 forms ask "what's
// the best way to go over your move-in numbers" / "¿cuál es la mejor manera de revisar tus números".
const CALL_TIME_LABEL = /call|llamada|hora|best (time|way)|mejor (hora|manera|momento)/i;

export function callTimeAnswer(pairs) {
  const hit = pairs.find(([label]) => CALL_TIME_LABEL.test(label) && !/consent|acepto|agree/i.test(label));
  return hit ? hit[1] : null;
}

// The answer to "are you working with a real estate agent" / "¿ya trabajas con un agente ...":
// { said: 'yes', hasAgent: true }, or null when the form did not ask. Anything that does not
// start with yes / sí / si counts as no, and the lead's own words are kept in `said`.
export function agentAnswer(pairs) {
  const hit = pairs.find(([label]) => /\bagent|agente/i.test(label) && !/consent|acepto|agree/i.test(label));
  if (!hit) return null;
  return { said: hit[1], hasAgent: /^(yes|s[ií])(?![a-z])/i.test(hit[1].trim()) };
}
