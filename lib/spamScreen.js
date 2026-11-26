// A screen for sales pitches that arrive through the site's free-text forms.
//
// The hidden honeypot box stops bots, but a person can still type a pitch into the contact
// form (business funding, SEO, marketing services). Before this screen, such a pitch went to
// Brivity as a buyer lead and started a buyer auto plan. Now it is held: the team still gets an
// email with every word, marked as possibly spam, but nothing goes to Brivity, the portal or
// the Sphere Nurture sheet. A real lead that is held by mistake is added by hand from that email.
//
// Each pattern adds weight; a message is held at 2 or more. Strong signs (funding pitches, SEO,
// backlinks) count 2 on their own. Weak signs (talking to "your business" or "you guys",
// "partnership", a pitch-style sign-off) count 1, so one of them alone never holds a real buyer.

const STRONG = [
  /\bbusiness (funding|loans?|financing|capital)\b/i,
  /\bworking capital\b/i,
  /\bmerchant cash\b/i,
  /\b(funding|capital|financing) (for|to grow) (your|the) (business|company|team)\b/i,
  /\bpre-?approved for (up to )?\$/i,
  /\bSEO\b/,
  /\bsearch engine optimi[sz]ation\b/i,
  /\bbacklinks?\b/i,
  /\bguest post/i,
  /\b(first page|rank(ing)?) (of|on|in) google\b/i,
  /\b(lead generation|digital marketing|web design|website redesign|social media management) (services?|agency|company|package)\b/i,
  /\bvirtual assistants?\b/i,
  /\b(crypto|bitcoin|forex)\b/i,
  /\bunsubscribe\b|\bopt[- ]out\b/i,
];

const WEAK = [
  /\byou guys\b/i,
  /\byour (business|company|agency|brokerage)\b/i,
  /\bbacking (you|your)\b/i,
  /\b(partnership|partner with you|collaborat(e|ion))\b/i,
  /\b(we|i) (help|work with) (real estate )?(agents|realtors|brokers|teams|businesses)\b/i,
  /\b(our|my) (services|agency|firm|company) (can|could|would|will)\b/i,
  /\b(interesting|quick|brief) (conversation|call|chat)\b/i,
  /\breply here\b/i,
  /\b(savings|capital|funding|ventures|solutions|marketing)\s*(llc|inc|group)?\s*,\s*(nyc|new york|miami|la)\b/i,
];

// Answers null for a message that looks like a person, or { reason } for one to hold.
export function screenPitch(text) {
  const message = String(text || '');
  if (!message.trim()) return null;
  const strong = STRONG.filter((re) => re.test(message));
  const weak = WEAK.filter((re) => re.test(message));
  const links = (message.match(/(?:https?:\/\/|www\.)\S+/gi) || []).length;
  const score = strong.length * 2 + weak.length + (links >= 2 ? 2 : 0);
  if (score < 2) return null;
  const reason = strong.length ? 'reads like a sales pitch' : links >= 2 ? 'has several links' : 'reads like a pitch to the business';
  return { reason, score };
}

// Only forms where the visitor types their own message are screened.
export const SCREENED_FORMS = new Set(['contact', 'featured_listings']);
