// The LIM front door (Build 3, 16 Oct 2026; user feedback: "one companion like Meta's Muse would be simpler").
// People type (or say) what's on their mind once; LIM sends it to the right specialist. Runs on the device: instant,
// private (nothing is sent anywhere to decide), and predictable. When unsure, Adaora takes it, because her role is
// finding the right support (human first); anything about crisis or safety ALWAYS goes to Adaora.

export type RouteWho = "adaora" | "miriama" | "leila" | "elias";
export type Need = { area: string; label: string };
export type Route = { who: RouteWho; reason: "safety" | "match" | "default"; score: number; need?: Need };

const SAFETY = /\b(suicid\w*|kill (my ?self|myself)|end (it|my life)|self[- ]?harm|hurt(ing)? myself|want to die|don'?t want to (live|be here)|abus(e|ed|ing)|rape|assault|violen(t|ce)|beat(s|ing)? me|unsafe|in danger|emergency|overdose|crisis)\b/i;

// Weighted cue words per specialist (English plus common Nigerian Pidgin/UK phrasing). Longer phrases weigh more.
const CUES: Record<Exclude<RouteWho, "adaora">, [RegExp, number][]> = {
  elias: [
    [/\b(cv|résumé|resume|cover letter|linkedin)\b/i, 3],
    [/\b(job|jobs|work|career|employ\w*|unemploy\w*|interview\w*|hiring|recruit\w*|vacanc\w*|apply|application|promotion|boss|manager|colleague|salary|payslip|wage|shift)\b/i, 2],
    [/\b(business|start[- ]?up|side hustle|hustle|customers?|clients?|sell\w*|market(ing)?|invoice|freelanc\w*|self[- ]?employ\w*|shop owner|my shop|small business)\b/i, 2],
    [/\b(scam|fake job|upfront fee|work from home offer)\b/i, 2],
  ],
  leila: [
    [/\b(budget\w*|money|spend\w*|sav(e|ing|ings)|debt|loan|overdraft|bills?|rent|payday|afford|cheap(er|est)?|price|prices|cost of living|groceries|shopping|meal plan|food shop|electricity|gas bill|naira|pounds?|£|₦)\b/i, 2],
    [/\b(compare|deal|discount|bargain|refund|subscription|credit card|bank charges)\b/i, 1],
  ],
  miriama: [
    [/\b(learn\w*|study|studying|homework|assignment|exam|exams|revision|revise|course|class|lesson|school|university|uni|college|teach|explain|understand)\b/i, 2],
    [/\b(idea|ideas|project|plan a|planning|write a story|poem|essay|research|creative|hobby|skill|language)\b/i, 2],
    [/\b(maths?|math|science|history|physics|chemistry|biology|english|coding|programming|geography|economics|accounting|statistics)\b/i, 2],
    [/\b(a[- ]?levels?|gcses?|waec|jamb|neco|igcse|ib diploma|sats?|btec|coursework|past (papers?|questions?)|mark scheme|tutor\w*|lecture|dissertation|thesis|moles?)\b/i, 3],
  ],
};

// Wellbeing cues pull towards Adaora even when other words appear ("stressed about my job" -> Adaora first).
const FEELINGS: [RegExp, number][] = [
  [/\b(lonely|alone|sad|depress\w*|anxi\w*|panic|stress\w*|overwhelm\w*|worried|worry|scared|afraid|cry\w*|grief|griev\w*|heartbroken|breakup|break up|tired of|can'?t cope|burn(ed|t)? out|hopeless|heavy|low mood|mental health|therapy|counsel\w*)\b/i, 3],
  [/\b(sleep|can'?t sleep|insomnia|health|doctor|gp|clinic|hospital|pain|sick|ill|pregnan\w*|medicine|care near)\b/i, 2],
  [/\b(talk to someone|real person|someone to talk|need help|support)\b/i, 2],
];

// Growing areas (Founder, 16 Oct 2026): needs we don't yet have a dedicated specialist for. The best current companion
// helps straight away, the person is told a specialist is coming (check back within 2 weeks), and the need is counted
// (anonymous event need_unmet:<area>) so Meryl's brief shows which specialist to build next.
const GROWING: { area: string; label: string; re: RegExp; helper: RouteWho }[] = [
  { area: "legal", label: "legal questions", helper: "adaora", re: /\b(lawyer|legal|court|solicitor|sue|suing|tribunal|contract dispute|police caution|my rights)\b/i },
  { area: "immigration", label: "visas & immigration", helper: "adaora", re: /\b(visa|immigration|asylum|home office|brp|residence permit|settled status|work permit)\b/i },
  { area: "housing", label: "housing", helper: "leila", re: /\b(landlord|tenan\w*|evict\w*|council house|housing|deposit back|mortgage|homeless\w*)\b/i },
  { area: "tech", label: "tech help", helper: "miriama", re: /\b(laptop|computer|phone (is )?(not working|broken|slow)|wifi|wi-fi|password reset|printer|install\w*|app (is )?not working|virus|hacked)\b/i },
  { area: "bills", label: "paying bills & buying airtime", helper: "leila", re: /\b(pay (my |the )?(bills?|light bill|electricity|nepa|dstv|gotv|startimes)|buy (airtime|data|recharge card)|recharge (my )?(phone|line)|top ?up (my )?(phone|airtime|data)|electricity token|prepaid meter)\b/i },
  { area: "parenting", label: "parenting & family", helper: "adaora", re: /\b(my (baby|toddler|newborn|child|son|daughter|kids?|teen\w*)|parenting|breastfeed\w*|nappy|tantrum\w*)\b/i },
];

const score = (text: string, cues: [RegExp, number][]) =>
  cues.reduce((s, [re, w]) => s + ((text.match(new RegExp(re.source, "gi")) || []).length * w), 0);

export function routeMessage(raw: string): Route {
  const text = (raw || "").normalize("NFC").trim();
  if (!text) return { who: "adaora", reason: "default", score: 0 };
  if (SAFETY.test(text)) return { who: "adaora", reason: "safety", score: 99 };
  const feel = score(text, FEELINGS);
  let best: Route = { who: "adaora", reason: feel ? "match" : "default", score: feel };
  for (const who of ["elias", "leila", "miriama"] as const) {
    const s = score(text, CUES[who]);
    if (s > best.score) best = { who, reason: "match", score: s };
  }
  const g = GROWING.find((x) => x.re.test(text));
  if (g) {
    const need = { area: g.area, label: g.label };
    // A clear specialist match still wins (e.g. "contract for my small business" -> Elias); feelings go to Adaora.
    if (best.reason === "match" && best.score >= 5 && best.who !== "adaora") return { ...best, need };
    return { who: feel >= 3 ? "adaora" : g.helper, reason: "match", score: best.score, need };
  }
  return best;
}

export const ROUTE_LABEL: Record<RouteWho, string> = {
  adaora: "wellbeing & finding the right support",
  miriama: "learning, ideas & projects",
  leila: "shopping & everyday money",
  elias: "work, jobs & small business",
};
