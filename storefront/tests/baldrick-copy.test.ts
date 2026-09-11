/**
 * What Baldrick says, as opposed to when he says it.
 *
 * `baldrick-conversation.test.ts` drives the machinery with a made-up script.
 * This file is the other half: it never checks a transition, and instead reads
 * the real lines the way a compliance reviewer would.
 *
 * **Four guards, and each is a claim about the character rather than a spelling
 * rule.** He is allowed to be reluctant, dismissive and unhelpful. He is not
 * allowed to state a figure, state an entitlement, invent a population, or
 * promise something the site cannot do. Everything below enforces one of those
 * four and nothing else — a guard on tone would be a guard on taste, and the
 * operator's ear is the authority there.
 *
 * The guards read `baldrickProse()`, which flattens every pool *and* every
 * quick-reply label. A button is copy: a guard that read only `say` would let
 * a label say anything.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  BALDRICK_DISCLAIMER,
  BALDRICK_GREETING,
  BALDRICK_PAUSE_LABEL,
  BALDRICK_SCRIPT,
  baldrickProse,
} from "../src/content/baldrick";
import { unknownStep } from "../src/lib/baldrick/conversation";
import { BALDRICK_INTENTS, matchIntent } from "../src/lib/baldrick/intents";

const PROSE = baldrickProse();

/** Every line he can say, one per assertion, so a failure names the sentence. */
const LINES: ReadonlyArray<readonly [string, string]> = Object.entries(BALDRICK_SCRIPT).flatMap(([id, step]) =>
  [...step.say.flat(), ...(step.quickReplies ?? []).map((reply) => reply.label)].map(
    (line) => [id, line] as const,
  ),
);

const removeApprovedDiscountCode = (line: string): string => line.replaceAll("BALDRICK20", "");

function surchargeCodesTable(source: string): string {
  const start = source.indexOf("export const SURCHARGE_CODES");
  if (start === -1) throw new Error("SURCHARGE_CODES table not found in backend surcharge source");
  const end = source.indexOf("];", start);
  if (end === -1) throw new Error("SURCHARGE_CODES table is not closed in backend surcharge source");
  return source.slice(start, end + 2);
}

/**
 * The two document titles, which he is allowed to say verbatim.
 *
 * Naming a document is the opposite of the risk the legal guard addresses: it
 * sends the reader to the authoritative text instead of paraphrasing it. But
 * "Refunds and Withdrawal" contains "withdraw", so the titles are removed
 * before the legal guard runs rather than carved out of every pattern in it.
 */
const TITLES = /Refunds and Withdrawal|Imprint/g;

describe("no figure, ever", () => {
  it("states no digit anywhere", () => {
    // Replacing the live code with any other code or a near-match must still
    // trip this guard; Baldrick may name BALDRICK20 and no other figure.
    // Widest form on purpose. `$0.00` is the site's signature line and it is
    // not his -- but so are "14 days", "3 of our customers" and "5 euros", and
    // one rule covers all four. The decision this encodes: **Baldrick says the
    // worth in words, never in figures.** He is not the price tag.
    const offending = LINES.filter(([, line]) => /\d/.test(removeApprovedDiscountCode(line)));
    expect(offending).toEqual([]);
    expect(removeApprovedDiscountCode("BALDRICK200")).toMatch(/\d/);
  });

  it("states no currency and no percentage", () => {
    expect(PROSE).not.toMatch(/[$€£]|\bpercent\b|\bper cent\b|%/i);
  });

  it("still points at where the price is", () => {
    // The inverse of the guard above, so "no figures" cannot be satisfied by
    // refusing to engage with the question at all. §23 wants the price
    // findable; he is allowed to be too lazy to read it out, not to pretend it
    // does not exist.
    expect(BALDRICK_SCRIPT.price?.say.flat().join(" ")).toMatch(/price/i);
  });
});

describe("the live discount", () => {
  it("names the one backend-supported code without a figure or an application claim", () => {
    // A stale future-tense step, a different code, a figure, or a claim to
    // have changed the cart would make Baldrick lie about a checkout he cannot
    // see or operate.
    const lines = BALDRICK_SCRIPT.discount?.say.flat() ?? [];
    const detail = BALDRICK_SCRIPT.discount_detail?.say.flat() ?? [];
    const discount = lines.join(" ");

    expect(lines).toEqual([
      "There is a discount code.",
      "It is BALDRICK20. Type it on the order summary. It makes your deal worse.",
    ]);
    expect(detail).toEqual([
      "You type it on the order summary and the total goes up.",
      "I was not told why. I did not ask.",
    ]);
    expect(discount).not.toMatch(/[$€£]|\bpercent\b|\bper cent\b|%/i);
    expect(discount).not.toMatch(/\b(?:I|we) (?:have |had )?applied\b/i);
    expect(discount).not.toMatch(/SAVE10|FREE|BLACKFRIDAY/);
  });

  it("names a code declared by the backend surcharge table", () => {
    // If the backend removes or renames BALDRICK20, issuing it here would send
    // a buyer to an order summary that cannot honour it.
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../../backend/src/commerce/surcharge.ts"),
      "utf8",
    );
    const codes = [...surchargeCodesTable(source).matchAll(/\bcode:\s*"([^"]+)"/g)].map((match) => match[1]);

    expect(codes).toContain("BALDRICK20");
  });
});

describe("no legal claim", () => {
  const prose = PROSE.replace(TITLES, "");

  it("cites no provision", () => {
    expect(prose).not.toMatch(/§|\bVÕS\b|\bGDPR\b|\barticle \d/i);
  });

  it("states no entitlement, period or remedy", () => {
    // The guard bans *claims*, not words. He may name the document that makes
    // the claim; he may not make it. Every pattern here is a sentence a visitor
    // could rely on, and reliance is what makes a paraphrase dangerous: the
    // document can be corrected, and a line in a chat widget is corrected by
    // nobody because nobody remembers it is there.
    for (const pattern of [
      /\bright to (?:withdraw|cancel|a refund)\b/i,
      /\byou are entitled\b/i,
      /\byou have (?:a|the) right\b/i,
      /\byou can (?:get|have|claim) (?:a |your )?(?:refund|money back)\b/i,
      /\byou will be refunded\b/i,
      /\bwe (?:will|must) refund\b/i,
      /\bby law\b|\blegally\b|\bstatutory\b/i,
      /\bguarantee/i,
      /\bwithdraw/i,
      /\b(?:fourteen|thirty) days?\b/i,
    ]) {
      const offending = LINES.filter(([, line]) => pattern.test(line.replace(TITLES, "")));
      expect(`${String(pattern)}: ${offending.map(([, line]) => line).join(" | ")}`).toBe(`${String(pattern)}: `);
    }
  });

  it("sends the refund question to the document instead", () => {
    // Again the inverse: silence would pass the guard above and fail the
    // visitor. The refund step must name where the answer is.
    expect(BALDRICK_SCRIPT.refund?.say.flat().join(" ")).toContain("Refunds and Withdrawal");
  });

  it("answers plainly when asked whether he is a person", () => {
    // **The hole mutation found in B7's own most important fix.** Adding the
    // `identity` intent was Gate D's first finding; nothing then asserted that
    // the step it reaches actually *answers*. Replacing its lines with "I would
    // rather not say." passed every guard in this file.
    //
    // A visitor asking directly is the one place a non-answer reads as evasion
    // rather than as laziness, and the standing disclaimer cannot repair it —
    // somebody who asked and was deflected has already drawn a conclusion.
    const identity = BALDRICK_SCRIPT.identity?.say.flat().join(" ") ?? "";
    expect(identity).toMatch(/\bno\b|\bnot a (?:person|human|real)/i);
    expect(identity).toMatch(/\bsentences\b|\banswers\b|\bwritten\b|\bin advance\b/i);
    // And says the same thing the line under the input says, in his own words,
    // rather than pointing at it.
    expect(identity).toMatch(/\breaches? a person\b|\bnothing you say here\b|\bnot a person\b/i);
  });

  it("sends the complaint and support questions to a person", () => {
    // §23's standing requirement -- a trader's address must be reachable -- and
    // constraint 8's: nothing typed here is read. Both steps have to point
    // somewhere real, and the Imprint resolves the address at runtime rather
    // than carrying it as a literal that would go stale here.
    for (const id of ["complaint", "support"] as const) {
      expect(`${id}: ${BALDRICK_SCRIPT[id]?.say.flat().join(" ") ?? ""}`).toContain("Imprint");
    }
  });
});

describe("no invented population", () => {
  it("claims nothing about other customers", () => {
    // §11: never publish fabricated customers, totals, testimonials or reviews.
    // The counter on the home page is measured; nothing Baldrick says is, so
    // the only safe number of other buyers he can mention is none.
    for (const pattern of [
      /\bcustomers\b/i,
      /\bbuyers\b/i,
      /\b(?:most|many|other|some) people\b/i,
      /\beveryone (?:else )?(?:says|thinks|buys|loves)\b/i,
      /\bthousands\b|\bmillions\b|\bhundreds\b/i,
      /\breviews?\b|\brating\b|\bpopular\b|\bbest[- ]selling\b/i,
      // **Added by B7, after this guard let my own line through.** A Gate D
      // draft of the greeting said "you are the first person to say that
      // today, probably". Hedged, unverifiable, and a statement about other
      // visitors -- §11's subject exactly. The patterns above all name a
      // population; this one names a *rank*, which is the same fabrication
      // with the population left implied.
      /\bfirst (?:person|one)\b|\bthe only (?:person|one)\b|\bnobody else has\b|\bmost (?:of them|buyers)\b|\bso far today\b/i,
    ]) {
      const offending = LINES.filter(([, line]) => pattern.test(line));
      expect(`${String(pattern)}: ${offending.map(([, line]) => line).join(" | ")}`).toBe(`${String(pattern)}: `);
    }
  });
});

describe("no promise he cannot keep", () => {
  it("undertakes nothing the widget cannot do", () => {
    // He is a pure function over a script. He cannot send, remember, look up or
    // pass anything on, and constraint 8 says so under the input in as many
    // words. A line undertaking any of it would make the disclaimer a lie in
    // the one place a visitor is most likely to believe the opposite.
    //
    // Negations and past tense are deliberately not matched: "I did not ask"
    // and "I do not send that either" are the character, and are the honest
    // form of exactly this.
    const promise =
      /\b(?:I|we)(?:'ll| will| shall| can| could)\s+(?:send|email|forward|pass|remember|note|check|look|find|ask|tell|contact|save|store|escalate|get back|sort|fix|arrange|refund)\b/i;
    const inviting = /\blet me (?:check|look|find|see|ask)\b|\bI have (?:noted|logged|passed|forwarded)\b/i;

    for (const pattern of [promise, inviting]) {
      const offending = LINES.filter(([, line]) => pattern.test(line));
      expect(`${String(pattern)}: ${offending.map(([, line]) => line).join(" | ")}`).toBe(`${String(pattern)}: `);
    }
  });

  it("says under the input that nothing typed there reaches anybody", () => {
    // LD-05 constraint 8, and the reason this slice needs no privacy
    // amendment: the Privacy Policy stays true because the widget stores
    // nothing, and this sentence is what stops a visitor assuming otherwise.
    // It is not an intent -- a person reporting a fault must read it without
    // having asked the right question first.
    expect(BALDRICK_DISCLAIMER).toMatch(/\bnot (?:stored|sent)|\bnothing\b/i);
    expect(BALDRICK_DISCLAIMER).toContain("Imprint");
  });
});

describe("the script is complete and closed", () => {
  it("has a step for every intent, so nothing falls through by accident", () => {
    const missing = BALDRICK_INTENTS.filter((intent) => !(intent in BALDRICK_SCRIPT));
    expect(missing).toEqual([]);
  });

  it("has a greeting to open at", () => {
    expect(BALDRICK_SCRIPT[BALDRICK_GREETING]).toBeDefined();
    expect(BALDRICK_GREETING in BALDRICK_SCRIPT).toBe(true);
  });

  it("points every quick reply at a step that exists", () => {
    // `unknownStep` exists for this assertion. A button leading nowhere is a
    // copy defect that presents as Baldrick failing to follow, which is exactly
    // the failure his character would hide.
    expect(unknownStep(BALDRICK_SCRIPT)).toEqual([]);
  });

  it("leaves no step nothing can reach", () => {
    // The other direction, which `unknownStep` cannot see: a flow step written,
    // then orphaned when the button pointing at it was reworded away.
    const reachable = new Set<string>([
      BALDRICK_GREETING,
      ...BALDRICK_INTENTS,
      ...Object.values(BALDRICK_SCRIPT).flatMap((step) => (step.quickReplies ?? []).map((reply) => reply.goes)),
    ]);
    expect(Object.keys(BALDRICK_SCRIPT).filter((id) => !reachable.has(id))).toEqual([]);
  });

  it("gives every message something to draw from", () => {
    // `draw` throws on an empty pool, by design, so an empty one is a runtime
    // failure in front of a visitor rather than a test failure here. This is
    // the test that keeps it from getting that far.
    for (const [id, step] of Object.entries(BALDRICK_SCRIPT)) {
      expect(`${id}: ${String(step.say.length > 0)}`).toBe(`${id}: true`);
      for (const pool of step.say) expect(`${id}: ${String(pool.length > 0)}`).toBe(`${id}: true`);
    }
    for (const [id, line] of LINES) expect(`${id}: ${line.trim()}`).not.toBe(`${id}: `);
  });

  it("gives each step's buttons distinct ids", () => {
    // `quickReplyTarget` takes the first match, so a duplicate id would make
    // the second button unreachable and silently do what the first does.
    for (const [id, step] of Object.entries(BALDRICK_SCRIPT)) {
      const ids = (step.quickReplies ?? []).map((reply) => reply.id);
      expect(`${id}: ${ids.join(",")}`).toBe(`${id}: ${[...new Set(ids)].join(",")}`);
    }
  });

  it("labels its buttons so they reach where they point, not where they read", () => {
    // Not a machinery test -- B3 settled that a label is never parsed. This is
    // a copy test: a label whose words match a different intent is confusing to
    // a *reader* even though the button works. "That is not a discount"
    // matching `discount` is fine; a gift button reading like a refund is not.
    for (const [from, step] of Object.entries(BALDRICK_SCRIPT)) {
      for (const reply of step.quickReplies ?? []) {
        const matched = matchIntent(reply.label);
        const related = reply.goes.startsWith(matched) || from.startsWith(matched) || matched === "fallback";
        expect(`${reply.id} -> ${reply.goes}: reads as ${matched}`).toBe(
          `${reply.id} -> ${reply.goes}: reads as ${related ? matched : reply.goes}`,
        );
      }
    }
  });
});

describe("the voice, where it is a fact and not a taste", () => {
  it("never exclaims and never apologises", () => {
    // `brand.md`: no exclamation marks anywhere on the site, and Baldrick is
    // not sorry. These two are the only tone rules stated flatly enough to be
    // guarded; the rest of his register is the operator's ear.
    expect(PROSE).not.toContain("!");
    expect(PROSE).not.toMatch(/\bsorry\b|\bapolog/i);
  });

  it("does not do the things a helpful assistant does", () => {
    expect(PROSE).not.toMatch(/\bhappy to help\b|\bgreat question\b|\banything else\b|\bhow can I help\b/i);
  });

  it("carries no emoji", () => {
    expect(PROSE).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it("says the pause is a pre-written line and not a person typing", () => {
    // B5a renders this while he "thinks". A screen reader announcing "Baldrick
    // is typing" would tell a visitor a person is at the other end, which is
    // the same claim constraint 8 forbids the disclaimer from allowing.
    expect(BALDRICK_PAUSE_LABEL).not.toMatch(/\btyping\b/i);
  });
});
