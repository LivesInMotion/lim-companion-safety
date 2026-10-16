// "Do it for me" hand-offs (Founder approved 16 Oct 2026). When someone asks for an everyday task the big apps don't let
// us complete through an open API (rides, takeaway, groceries, jobs...), the companion still helps and offers ONE TAP into
// the person's own app with the details filled in. The person pays and signs in only there: LIM never handles cards or
// logins. Links are country-aware for our language markets (GB, NG, KE, GH, ZA) with a global fallback. Pure functions,
// no network: tested in src/lib/__tests__/handoffs.test.ts.

export type Handoff = { kind: string; label: string; url: string; earns?: boolean };

// Affiliate revenue on hand-off links (Founder, 16 Oct 2026: "maximize and expand any affiliate revenue that fits our
// specs"). Specs: no money handling by LIM, no personal data shared (only the normal click), honest disclosure next to
// the buttons, and the person's best option first (affiliate status never changes which buttons we show or their order).
// IDs are public partner tags, not secrets: fill them in affiliate-ids.json once each programme approves LIM.
// Empty entries leave links unchanged, so this is safe to ship before approval.

// Fill in as each programme approves LIM (public tags, not secrets). Empty = links unchanged.
export const AFFILIATE_IDS = {
  amazonUK: "",        // Amazon Associates UK tag, e.g. "limcompanions-21"
  amazonUS: "",        // Amazon Associates US tag
  awinPublisher: "",   // LIM's Awin publisher ID
  awinTesco: "",       // Tesco's Awin advertiser (merchant) ID
  awinBooking: "",     // Booking.com's Awin advertiser ID
  jumiaKol: "",        // Jumia KOL deep-link template containing {url}
  uberEats: "",        // Uber Eats affiliate deep-link template containing {url}
};
const ID = AFFILIATE_IDS;

/** Wraps a hand-off URL with LIM's affiliate tag when we have one for that merchant. Returns the URL and whether it earns. */
function affiliate(kind: string, url: string): { url: string; earns: boolean } {
  const awin = (mid: string) => (ID.awinPublisher && mid
    ? { url: `https://www.awin1.com/cread.php?awinmid=${mid}&awinaffid=${ID.awinPublisher}&ued=${encodeURIComponent(url)}`, earns: true } : null);
  switch (kind) {
    case "shop_amazon_uk": return ID.amazonUK ? { url: `${url}${url.includes("?") ? "&" : "?"}tag=${ID.amazonUK}`, earns: true } : { url, earns: false };
    case "shop_amazon_us": return ID.amazonUS ? { url: `${url}${url.includes("?") ? "&" : "?"}tag=${ID.amazonUS}`, earns: true } : { url, earns: false };
    case "shop_tesco": return awin(ID.awinTesco) || { url, earns: false };
    case "stay_booking": return awin(ID.awinBooking) || { url, earns: false };
    // Jumia KOL issues tracked links from its dashboard; the template (with {url}) is pasted into jumiaKol.
    case "shop_jumia": return ID.jumiaKol.includes("{url}") ? { url: ID.jumiaKol.replace("{url}", encodeURIComponent(url)), earns: true } : { url, earns: false };
    case "food_ubereats": return ID.uberEats.includes("{url}") ? { url: ID.uberEats.replace("{url}", encodeURIComponent(url)), earns: true } : { url, earns: false };
    default: return { url, earns: false };
  }
}
type Country = "GB" | "NG" | "KE" | "GH" | "ZA" | "US" | "OTHER";

const enc = encodeURIComponent;
const norm = (c?: string | null): Country => {
  const u = (c || "").toUpperCase();
  return (["GB", "NG", "KE", "GH", "ZA", "US"] as Country[]).includes(u as Country) ? (u as Country) : "OTHER";
};
const maps = (q: string): Handoff => ({ kind: "maps", label: `Find "${q}" on Google Maps`, url: `https://www.google.com/maps/search/?api=1&query=${enc(q)}` });

// What the person wants, pulled from their own words ("a taxi to Victoria station" -> "Victoria station").
function after(text: string, words: string): string {
  const m = text.match(new RegExp(`\\b(?:${words})\\s+(?:a |an |some |me |the |my )?(.{2,60}?)(?:[.?!,]|\\s+(?:please|tonight|today|now|for me)\\b|$)`, "i"));
  return m ? m[1].trim() : "";
}

const RIDE = /\b(taxi|cab|uber|bolt|ride|lift to|get to|go to|drive me|airport transfer)\b/i;
const FOOD = /\b(takeaway|take-away|take out|takeout|order (food|pizza|chicken|jollof|burger|suya|chinese|indian|lunch|dinner)|food delivery|hungry|deliver(y|ed)? (food|meal)|chowdeck|deliveroo|just eat|uber eats)\b/i;
const SHOP = /\b(groceries|grocery|food shop|weekly shop|shopping list|buy (milk|bread|rice|eggs|nappies|food|groceries)|supermarket|order (groceries|shopping))\b/i;
const BUY = /\b(buy|order|cheapest|price of|where can i get)\b/i;
const STAY = /\b(hotel|hotels|guest ?house|airbnb|somewhere to stay|place to stay|accommodation|book a room|b&b)\b/i;
const JOBS = /\b(find (a |me a )?job|job search|jobs (in|near)|vacanc(y|ies)|hiring|looking for work|apply for jobs?)\b/i;
const BIZ = /\b(register (a |my )?(business|company)|start (a |my )?(business|company)|business name|cac registration)\b/i;
const CARE = /\b(gp|doctor|pharmacy|chemist|clinic|hospital|dentist|nhs 111|urgent care)\b/i;
const LEARN = /\b(explain|understand|revise|revision|homework|exam|a[- ]?level|gcse|waec|jamb|neco|learn about|teach me)\b/i;

function rides(c: Country, dest: string): Handoff[] {
  const uber: Handoff = { kind: "ride_uber", label: dest ? `Uber to ${dest}` : "Open Uber",
    url: `https://m.uber.com/ul/?action=setPickup&pickup=my_location${dest ? `&dropoff[formatted_address]=${enc(dest)}` : ""}` };
  const bolt: Handoff = { kind: "ride_bolt", label: "Open Bolt", url: "https://bolt.eu/en/ride/" };
  // Cheaper option first-class too: public transport directions (Google Maps, free, worldwide).
  const transit: Handoff = { kind: "ride_transit", label: dest ? `Bus/train to ${dest}` : "Bus/train route",
    url: `https://www.google.com/maps/dir/?api=1${dest ? `&destination=${enc(dest)}` : ""}&travelmode=transit` };
  if (c === "NG" || c === "KE" || c === "GH" || c === "ZA") return [bolt, uber, transit];
  return c === "OTHER" ? [uber, transit] : [uber, bolt, transit];
}

function food(c: Country, what: string): Handoff[] {
  const q = what || "food near me";
  switch (c) {
    case "GB": return [{ kind: "food_ubereats", label: "Uber Eats", url: `https://www.ubereats.com/gb/search?q=${enc(q)}` },
      { kind: "food_deliveroo", label: "Deliveroo", url: "https://deliveroo.co.uk/" }, { kind: "food_justeat", label: "Just Eat", url: "https://www.just-eat.co.uk/" }];
    case "NG": return [{ kind: "food_chowdeck", label: "Chowdeck", url: "https://chowdeck.com/" }, { kind: "food_boltfood", label: "Bolt Food", url: "https://food.bolt.eu/" }];
    case "KE": return [{ kind: "food_boltfood", label: "Bolt Food", url: "https://food.bolt.eu/" }, { kind: "food_glovo", label: "Glovo", url: "https://glovoapp.com/" }, { kind: "food_ubereats", label: "Uber Eats", url: `https://www.ubereats.com/ke/search?q=${enc(q)}` }];
    case "GH": return [{ kind: "food_boltfood", label: "Bolt Food", url: "https://food.bolt.eu/" }];
    case "ZA": return [{ kind: "food_mrd", label: "Mr D", url: "https://www.mrd.com/" }, { kind: "food_ubereats", label: "Uber Eats", url: `https://www.ubereats.com/za/search?q=${enc(q)}` }];
    case "US": return [{ kind: "food_ubereats", label: "Uber Eats", url: `https://www.ubereats.com/search?q=${enc(q)}` }, { kind: "food_doordash", label: "DoorDash", url: `https://www.doordash.com/search/store/${enc(q)}/` }];
    default: return [{ kind: "food_ubereats", label: "Uber Eats", url: `https://www.ubereats.com/search?q=${enc(q)}` }, maps(`${q}`)];
  }
}

function shop(c: Country, what: string): Handoff[] {
  const q = what || "groceries";
  switch (c) {
    case "GB": return [{ kind: "shop_tesco", label: `Tesco: ${q}`, url: `https://www.tesco.com/groceries/en-GB/search?query=${enc(q)}` },
      { kind: "shop_sainsburys", label: "Sainsbury's", url: `https://www.sainsburys.co.uk/gol-ui/SearchResults/${enc(q)}` },
      { kind: "shop_asda", label: "Asda", url: `https://groceries.asda.com/search/${enc(q)}` }];
    case "NG": return [{ kind: "shop_jumia", label: `Jumia: ${q}`, url: `https://www.jumia.com.ng/catalog/?q=${enc(q)}` }];
    case "KE": return [{ kind: "shop_jumia", label: `Jumia: ${q}`, url: `https://www.jumia.co.ke/catalog/?q=${enc(q)}` }];
    case "GH": return [{ kind: "shop_jumia", label: `Jumia: ${q}`, url: `https://www.jumia.com.gh/catalog/?q=${enc(q)}` }];
    case "ZA": return [{ kind: "shop_checkers", label: `Checkers: ${q}`, url: `https://www.checkers.co.za/search?q=${enc(q)}` },
      { kind: "shop_takealot", label: "Takealot", url: `https://www.takealot.com/all?qsearch=${enc(q)}` }];
    case "US": return [{ kind: "shop_instacart", label: `Instacart: ${q}`, url: `https://www.instacart.com/store/s?k=${enc(q)}` }];
    default: return [{ kind: "shop_google", label: `Compare prices: ${q}`, url: `https://www.google.com/search?tbm=shop&q=${enc(q)}` }];
  }
}

// Non-grocery buying ("buy a kettle"): compare first, then the big marketplace for the country.
function goods(c: Country, q: string): Handoff[] {
  const compare: Handoff = { kind: "shop_google", label: `Compare prices: ${q}`, url: `https://www.google.com/search?tbm=shop&q=${enc(q)}` };
  switch (c) {
    case "GB": return [compare, { kind: "shop_amazon_uk", label: `Amazon: ${q}`, url: `https://www.amazon.co.uk/s?k=${enc(q)}` }];
    case "US": return [compare, { kind: "shop_amazon_us", label: `Amazon: ${q}`, url: `https://www.amazon.com/s?k=${enc(q)}` }];
    case "NG": case "KE": case "GH": return [...shop(c, q), compare];
    case "ZA": return [{ kind: "shop_takealot", label: `Takealot: ${q}`, url: `https://www.takealot.com/all?qsearch=${enc(q)}` }, compare];
    default: return [compare];
  }
}

function stays(place: string): Handoff[] {
  return [{ kind: "stay_booking", label: place ? `Booking.com: ${place}` : "Booking.com", url: `https://www.booking.com/searchresults.html${place ? `?ss=${enc(place)}` : ""}` },
    maps(place ? `hotels in ${place}` : "hotels near me")];
}

const GROCERY_WORDS = /(milk|bread|rice|eggs|beans|flour|oil|sugar|nappies|fruit|vegetables|chicken|meat|fish|yam|garri|tomatoes|onions|pasta|cereal|groceries|food)/i;

function jobs(c: Country, what: string): Handoff[] {
  const q = what || "jobs";
  const indeed = (host: string): Handoff => ({ kind: "jobs_indeed", label: `Indeed: ${q}`, url: `https://${host}/jobs?q=${enc(q)}` });
  const linkedin: Handoff = { kind: "jobs_linkedin", label: "LinkedIn Jobs", url: `https://www.linkedin.com/jobs/search/?keywords=${enc(q)}` };
  switch (c) {
    case "GB": return [indeed("uk.indeed.com"), { kind: "jobs_findajob", label: "GOV.UK Find a job", url: `https://findajob.dwp.gov.uk/search?q=${enc(q)}` }, linkedin];
    case "NG": return [{ kind: "jobs_jobberman", label: `Jobberman: ${q}`, url: `https://www.jobberman.com/jobs?q=${enc(q)}` }, indeed("ng.indeed.com"), linkedin];
    case "KE": return [{ kind: "jobs_brightermonday", label: `BrighterMonday: ${q}`, url: `https://www.brightermonday.co.ke/jobs?q=${enc(q)}` }, linkedin];
    case "GH": return [{ kind: "jobs_jobberman_gh", label: `Jobberman Ghana: ${q}`, url: `https://www.jobberman.com.gh/jobs?q=${enc(q)}` }, linkedin];
    case "ZA": return [indeed("za.indeed.com"), linkedin];
    default: return [indeed("www.indeed.com"), linkedin];
  }
}

function business(c: Country): Handoff[] {
  switch (c) {
    case "GB": return [{ kind: "biz_govuk", label: "GOV.UK: set up a business", url: "https://www.gov.uk/set-up-business" }];
    case "NG": return [{ kind: "biz_cac", label: "CAC: register a business", url: "https://www.cac.gov.ng/" }];
    case "KE": return [{ kind: "biz_brs", label: "eCitizen: Business Registration Service", url: "https://brs.go.ke/" }];
    case "GH": return [{ kind: "biz_orc", label: "Office of the Registrar of Companies", url: "https://orc.gov.gh/" }];
    case "ZA": return [{ kind: "biz_cipc", label: "CIPC: register a company", url: "https://www.cipc.co.za/" }];
    default: return [];
  }
}

function care(c: Country, text: string): Handoff[] {
  const kind = /pharmacy|chemist/i.test(text) ? "pharmacy" : /dentist/i.test(text) ? "dentist" : /hospital/i.test(text) ? "hospital" : "clinic";
  const out: Handoff[] = [{ kind: "care_finder", label: "LIM care finder", url: "/care" }];
  if (c === "GB") {
    if (/111|urgent/i.test(text)) out.push({ kind: "care_nhs111", label: "NHS 111 online", url: "https://111.nhs.uk/" });
    if (/gp|doctor/i.test(text)) out.push({ kind: "care_gp", label: "Find a GP (NHS)", url: "https://www.nhs.uk/service-search/find-a-gp" });
  }
  out.push(maps(`${kind} near me`));
  return out;
}

function learn(c: Country, topic: string): Handoff[] {
  const q = topic || "";
  if (!q) return [];
  const out: Handoff[] = [];
  if (c === "GB") out.push({ kind: "learn_bitesize", label: `BBC Bitesize: ${q}`, url: `https://www.bbc.co.uk/bitesize/search?q=${enc(q)}` });
  out.push({ kind: "learn_khan", label: `Khan Academy: ${q}`, url: `https://www.khanacademy.org/search?page_search_query=${enc(q)}` });
  out.push({ kind: "learn_youtube", label: `Videos: ${q}`, url: `https://www.youtube.com/results?search_query=${enc(q + " explained")}` });
  return out;
}

/** Up to 3 one-tap hand-offs for this message, or none. Safety/crisis messages never get hand-offs. */
export function suggestHandoffs(message: string, country?: string | null): Handoff[] {
  const text = (message || "").trim();
  if (!text || /\b(suicid|kill myself|hurt myself|want to die|abuse|emergency|overdose)\b/i.test(text)) return [];
  const c = norm(country);
  let out: Handoff[] = [];
  if (RIDE.test(text)) out = rides(c, after(text, "to|towards"));
  else if (FOOD.test(text)) out = food(c, after(text, "order|want|get|craving"));
  else if (SHOP.test(text)) out = shop(c, after(text, "buy|order|need|get") || "groceries");
  else if (JOBS.test(text)) out = jobs(c, after(text, "job as|jobs as|work as|job in|jobs in|role as|a job|jobs") || "");
  else if (STAY.test(text)) out = stays(after(text, "in|near|at"));
  else if (BIZ.test(text)) out = business(c);
  else if (CARE.test(text)) out = care(c, text);
  else if (BUY.test(text) && after(text, "buy|order|price of|get")) {
    const item = after(text, "buy|order|price of|get");
    out = GROCERY_WORDS.test(item) ? shop(c, item) : goods(c, item);
  }
  else if (LEARN.test(text)) out = learn(c, after(text, "explain|understand|revise|learn about|teach me|about"));
  return out.slice(0, 3).map((h) => { const a = affiliate(h.kind, h.url); return { ...h, url: a.url, earns: a.earns }; });
}

/** Prompt hint so the companion's words match the buttons the app will show (16 Oct 2026). Empty when no buttons. */
export function handoffHint(message: string, country?: string | null, exact = true): string {
  const h = suggestHandoffs(message, country);
  if (!h.length) return "";
  const names = h.map((x) => x.label).join("; ");
  return `ONE-TAP LINKS: the LIM app shows buttons under your reply for this request (${exact ? "" : "for example "}${names}). `
    + "Give practical help first, then say in one short sentence that they can tap a button below to open it with the details filled in, "
    + "and that they choose and pay in that app. Never say you cannot help with this, and never claim you booked, ordered, paid or contacted anyone.";
}

/** Health topic worth an NHS.UK card (a named condition, symptom or medicine), never for crisis messages. */
export function wantsNhs(message: string): boolean {
  const t = message || "";
  if (/\b(suicid|kill myself|hurt myself|want to die|overdose|emergency)\b/i.test(t)) return false;
  return /\b(symptoms?|rash|fever|cough|pain|ache|headache|migraine|infection|asthma|diabetes|blood pressure|eczema|acne|flu|cold|covid|malaria|anxiety|depression|insomnia|medicine|medication|tablets?|ibuprofen|paracetamol|antibiotics?|condition|diagnos\w*|treatment|side effects?|pregnan\w*|period|allergy|chickenpox|measles|sickle cell|typhoid|ulcer|arthritis|cholesterol)\b/i.test(t);
}

/** London transport status question ("is the Tube running", "Central line delays"). */
export function wantsTflStatus(message: string): boolean {
  return /\b(tube|underground|overground|elizabeth line|dlr|central line|northern line|jubilee|victoria line|piccadilly|district line|bakerloo|metropolitan line|circle line)\b/i.test(message || "")
    && /\b(status|delay|delays|running|working|strike|closed|disruption|problems?|today|now)\b/i.test(message || "");
}

/** Role and place for live job listings (Elias), or null when the message is not a job search. */
export function jobQuery(message: string): { q: string; where: string } | null {
  const text = (message || "").trim();
  if (!JOBS.test(text) && !/\b(jobs?|vacanc(y|ies)|role|position)\b.*\b(in|near)\b/i.test(text)) return null;
  const where = (text.match(/\b(?:in|near|around)\s+([A-Z][\p{L}' -]{1,40}?)(?:[.?!,]|\s+(?:please|for|that|with)\b|$)/u) || [])[1] || "";
  const role = after(text, "job as|jobs as|work as|role as|position as|job in|jobs in|a job|jobs for") || "";
  const q = role.replace(new RegExp(`\\s+(in|near|around)\\s+${where.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}.*$`, "i"), "").trim();
  return { q: /^(in|near)\b/i.test(q) ? "" : q, where: where.trim() };
}
