/**
 * What Baldrick thinks you asked him.
 *
 * §8: "keyword/phrase matching where useful", and "limited comprehension is
 * acceptable and can be part of the character". Both sentences are load-bearing
 * here. This file does not attempt to understand a sentence; it looks for words
 * it was told about, in an order it was told to look in, and gives up in a
 * stated way. §8 also says "do not build sophisticated NLP unless actual usage
 * demonstrates a need", and there is no usage yet.
 *
 * **The character makes the limitation cheap.** `brand.md`'s voice section
 * settles that Baldrick is lazy. A lazy assistant who did not follow your
 * question and says so is in character; an eager one who guesses would be both
 * out of character and, on a site with a never-fabricate rule, a liability.
 * Failing to match is a normal outcome here, not an error path.
 *
 * **No copy lives in this file.** It answers "which intent", never "what does
 * he say" — B4 owns every line, in `content/baldrick.ts`, so a reviewer can
 * read what a visitor sees without reading matching logic.
 */

/**
 * §8's ten, and no eleventh without a reason.
 *
 * The contract lists them as "possible intents", so the set is a decision
 * rather than a transcription: these are the questions a person actually
 * arrives with on a site that sells one thing.
 */
export const BALDRICK_INTENTS = [
  "enterprise",
  "subscription",
  "gift",
  "discount",
  "price",
  "refund",
  "complaint",
  "support",
  "what_do_i_get",
  "fallback",
] as const;

export type BaldrickIntent = (typeof BALDRICK_INTENTS)[number];

/**
 * A pattern per intent, in priority order.
 *
 * **Declaration order is priority order, and it runs from the narrowest
 * vocabulary to the widest.** That is the stated rule the plan asked for, and
 * it is stated because the alternative — whichever pattern happens to be
 * declared first wins — is a silent decision that changes when somebody
 * reorders a list for tidiness.
 *
 * Worked through, because the collisions are real rather than hypothetical:
 *
 *  - `enterprise` and `subscription` first. Both are words nobody types by
 *    accident on a site selling a five-dollar certificate, so a message
 *    containing either almost certainly means it.
 *  - `gift` before `price`: "how much to send one as a gift" is a gift
 *    question, and answering it with the price would be answering the smaller
 *    half.
 *  - `discount` before `price`: "any discount on this" is about a code, not
 *    about what the thing costs.
 *  - `refund` before `complaint`: "this is rubbish, I want my money back"
 *    matches both, and the refund reading is the actionable one — it points at
 *    a document that answers it, where the complaint reading points at an
 *    address and asks the person to write again.
 *  - `complaint` before `support`: a complaint is a support request with a
 *    temperature, and the narrower reading is the more useful one.
 *  - `what_do_i_get` last before the fallback, because its vocabulary is the
 *    ordinary words of every other question ("what", "get", "this").
 *
 * `fallback` has no pattern. It is what is left.
 */
const PATTERNS: ReadonlyArray<readonly [Exclude<BaldrickIntent, "fallback">, RegExp]> = [
  ["enterprise", /\benterprise|\bb2b\b|\bbusiness (?:plan|account|tier)|\bcorporate\b/],
  ["subscription", /\bsubscri|\brecurring\b|\brenew|\bmonthly\b|\bannual|\bcancel (?:my )?(?:plan|membership)/],
  ["gift", /\bgift|\bpresent\b|\bfor (?:a|my) friend\b|\bsend (?:it|this|one) to\b|\bsomebody else\b|\bsomeone else\b/],
  ["discount", /\bdiscount|\bcode\b|\bcoupon|\bvoucher|\bpromo|\bcheaper\b|\bdeal on\b|\boffer\b|\bsale\b/],
  ["price", /\bprice|\bcost|\bhow much|\bexpensive|\bcheap\b|\bpay\b|\bcharge/],
  ["refund", /\brefund|\bmoney back\b|\bcancel (?:my )?order\b|\bwithdraw|\breturn (?:it|this|my)\b/],
  ["complaint", /\bcomplain|\bterrible\b|\brubbish\b|\bawful\b|\bscam\b|\bripped? off\b|\bfraud|\bangry\b|\bdisappointed\b/],
  ["support", /\bhelp\b|\bsupport\b|\bproblem\b|\bbroken\b|\bnot work|\bcontact\b|\bhuman\b|\bsomeone\b|\bemail you\b/],
  ["what_do_i_get", /\bwhat (?:do|will) i (?:get|receive)\b|\bwhat is (?:this|it)\b|\bwhat am i buying\b|\bwhat does it do\b|\bpointless\b|\bworth\b/],
];

/**
 * Lower-cased and collapsed, for matching only.
 *
 * **Matching normalises; the seed does not.** `pool.ts` hashes what the visitor
 * typed verbatim, because reproducing a reported transcript needs the exact
 * text. Normalising here and not there is deliberate rather than inconsistent:
 * one is about recognising a word, the other about replaying a conversation.
 */
function forMatching(message: string): string {
  return message.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Which intent a message is, or `fallback`.
 *
 * The first pattern that matches wins, by the order argued above. A message
 * matching none of them is `fallback`, which is a real answer rather than a
 * failure: §8 makes limited comprehension part of the character, and
 * `brand.md` gives him a line for it.
 */
export function matchIntent(message: string): BaldrickIntent {
  const text = forMatching(message);
  if (text.length === 0) return "fallback";

  for (const [intent, pattern] of PATTERNS) {
    if (pattern.test(text)) return intent;
  }
  return "fallback";
}

/**
 * Every intent a message matches, most specific first.
 *
 * Not used to choose — {@link matchIntent} does that, and it takes the first.
 * This exists so a test can assert *which* collisions exist rather than only
 * that the chosen one is right, and so the priority argument above stays
 * checkable instead of becoming a comment nobody can falsify.
 */
export function matchingIntents(message: string): BaldrickIntent[] {
  const text = forMatching(message);
  return PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([intent]) => intent);
}
