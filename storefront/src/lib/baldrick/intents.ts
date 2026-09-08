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
 * §8's ten, plus four B7's Gate D produced reasons for.
 *
 * The contract lists them as "possible intents", so the set is a decision
 * rather than a transcription: these are the questions a person actually
 * arrives with on a site that sells one thing. B2 closed it at ten and wrote
 * "no eleventh without a reason". Gate D then ran twenty-seven realistic
 * questions through {@link matchIntent} and read where each went, which is the
 * reason B2 asked for. Four are recorded here rather than in a commit message,
 * because the next person to consider an intent should see why these four
 * cleared a bar the rest did not:
 *
 *  - **`identity`.** "are you a real person", "are you a bot" and "who are
 *    you" all reached the fallback, which answers "I did not understand that".
 *    That is the widget declining to answer the one question where leaving a
 *    wrong impression is not a joke. The disclaimer under the input says it
 *    already; being asked directly and not answering undoes that.
 *  - **`support` widened, not added.** "it never arrived" and "where is my
 *    certificate" reached the fallback — the exact sentence LD-05's constraint
 *    8 names as the case that must not go wrong.
 *  - **`licensing`.** The contract's own Baldrick section says he "can explain
 *    licensing". Five licensing questions reached the fallback.
 *  - **`inscription`.** LD-02 shipped it and LD-03's gifting has an intent;
 *    the older feature had none, which was an asymmetry rather than a
 *    decision.
 *  - **`pleasantry`.** "hello" reached the fallback, and telling somebody who
 *    said hello that you did not understand them is not laziness, it is
 *    rudeness with a different cause.
 *
 * Five, not four: `pleasantry` is the one that is about register rather than
 * coverage, and it is listed last for that reason.
 */
export const BALDRICK_INTENTS = [
  "enterprise",
  "subscription",
  "gift",
  "inscription",
  "discount",
  "price",
  "refund",
  "complaint",
  "identity",
  "licensing",
  "support",
  "pleasantry",
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
  // "can my company buy these" reached the fallback until Gate D. The words a
  // person actually uses for this are possessive, not nominal.
  ["enterprise", /\benterprise|\bb2b\b|\bbusiness (?:plan|account|tier)|\bcorporate\b|\b(?:my|our) company\b|\bfor (?:my|our) business\b|\bin bulk\b|\bfor (?:a |our )?team\b/],
  ["subscription", /\bsubscri|\brecurring\b|\brenew|\bmonthly\b|\bannual|\bcancel (?:my )?(?:plan|membership)/],
  ["gift", /\bgift|\bpresent\b|\bfor (?:a|my) friend\b|\bsend (?:it|this|one) to\b|\bsomebody else\b|\bsomeone else\b/],
  // After `gift`, deliberately: "can I put my friend's name on it" is a gift
  // question with an inscription in it, and the gift flow explains both.
  ["inscription", /\binscription|\bpersonalis|\bpersonaliz|\bcustomis|\bcustomiz|\bengrav|\bname on\b|\bdifferent name\b|\bprinted on\b|\bwrite (?:something|a message) on\b/],
  ["discount", /\bdiscount|\bcode\b|\bcoupon|\bvoucher|\bpromo|\bcheaper\b|\bdeal on\b|\boffer\b|\bsale\b/],
  // **`\bpay\b` was removed by Gate D.** It sent "what happens after I pay" to
  // `price`, which answered "the price is on the page you came from" — a
  // confident answer to a different question, which is worse than the
  // fallback. Payment-method questions now reach the fallback, which says what
  // he does know about; that is a bound this row takes deliberately rather
  // than a gap it missed.
  ["price", /\bprice|\bcost|\bhow much|\bexpensive|\bcheap\b|\bcharge/],
  ["refund", /\brefund|\bmoney back\b|\bcancel (?:my )?order\b|\bwithdraw|\breturn (?:it|this|my)\b/],
  ["complaint", /\bcomplain|\bterrible\b|\brubbish\b|\bawful\b|\bscam\b|\bripped? off\b|\bfraud|\bangry\b|\bdisappointed\b/],
  // Before `licensing` and `support`, because it is the narrowest of the three
  // and because getting it wrong is the one miss that is not funny.
  ["identity", /\bare you (?:a )?(?:real|human|person|bot|robot|an? ai)|\bwho are you\b|\bwhat are you\b|\bare you real\b|\bis this a (?:bot|robot|person|human)\b|\byour name\b|\bbaldrick\b/],
  ["licensing", /\blicen[sc]|\bcommercial(?:ly)?\b|\bresell\b|\bresale\b|\bcopyright|\bintellectual property\b|\ballowed to do with\b|\bcan i use (?:it|this)\b/],
  // **Widened by Gate D**, which found "it never arrived" and "where is my
  // certificate" reaching the fallback. Constraint 8 names that exact sentence
  // as the case a chat box must not fumble, and the fallback is not an answer
  // to it.
  ["support", /\bhelp\b|\bsupport\b|\bproblem\b|\bbroken\b|\bnot work|\bcontact\b|\bhuman\b|\bsomeone\b|\bemail you\b|\bnever (?:arrived|came|turned up)\b|\bnot (?:arrived|come)\b|\bwhere is my\b|\bhave ?n(?:o|')t (?:got|received|had)\b|\bhave not (?:got|received|had)\b|\bdid ?n(?:o|')t (?:get|receive|arrive)\b|\bmissing\b/],
  // Last before `what_do_i_get`, and narrow: a bare greeting and nothing else.
  // Anything with a question in it should reach the question's intent.
  ["pleasantry", /^(?:hello|hi|hey|yo|good (?:morning|afternoon|evening)|hiya|greetings)\b[\s.!?]*$/],
  // Gained "what happens after I pay" when `price` gave up `\bpay\b`: what
  // arrives after payment is what you get, not what it costs.
  ["what_do_i_get", /\bwhat (?:do|will) i (?:get|receive)\b|\bwhat is (?:this|it)\b|\bwhat am i buying\b|\bwhat does it do\b|\bpointless\b|\bworth\b|\bwhat happens (?:next|after)\b|\bafter i pay\b/],
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
