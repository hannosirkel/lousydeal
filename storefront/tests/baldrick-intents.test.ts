/**
 * What Baldrick thinks you asked, and which line he picks.
 *
 * Two properties carry this row. **Recognition is a stated priority order**,
 * not whichever pattern happens to be declared first — so the collisions are
 * asserted directly rather than inferred from the winner. And **the choice is
 * reproducible**, because LD-05's acceptance is a transcript a human reads, and
 * a transcript nobody can replay is an anecdote.
 */

import { describe, expect, it } from "vitest";

import { BALDRICK_INTENTS, matchIntent, matchingIntents } from "../src/lib/baldrick/intents";
import { conversationSeed, draw, generator, hashUtterances } from "../src/lib/baldrick/pool";

describe("the intents this slice recognises", () => {
  it("is §8's list, closed", () => {
    // A closed set, asserted as one. §8 calls them "possible intents", so the
    // set is a decision; an eleventh should require changing this line.
    expect([...BALDRICK_INTENTS]).toEqual([
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
    ]);
  });
});

describe("what a message is taken to mean", () => {
  it.each([
    ["do you have an enterprise plan", "enterprise"],
    ["is this a subscription", "subscription"],
    ["can I send one to a friend", "gift"],
    ["got any discount codes", "discount"],
    ["how much is it", "price"],
    ["I want a refund", "refund"],
    ["this is a scam", "complaint"],
    ["I need help with something", "support"],
    ["what do I get exactly", "what_do_i_get"],
  ] as const)("reads %j as %s", (message, intent) => {
    expect(matchIntent(message)).toBe(intent);
  });

  it("falls back rather than guessing", () => {
    // Not an error path. §8 makes limited comprehension part of the character,
    // and `brand.md` gives him a line for it: "I did not understand that. I am
    // not going to guess."
    for (const message of ["", "   ", "asdfgh", "the weather is quite good today"]) {
      expect(matchIntent(message), message).toBe("fallback");
    }
  });

  it("ignores case and spacing, because a person typing does", () => {
    for (const message of ["REFUND", "  refund  ", "Refund\tplease"]) {
      expect(matchIntent(message), message).toBe("refund");
    }
  });
});

describe("the priority order, where messages match more than one", () => {
  /**
   * **Asserted as collisions, not as winners.** Checking only the winner would
   * pass just as well if the pattern that lost had stopped matching entirely,
   * which would be a silent loss of recognition. These say "both match, and
   * this one wins" — so the argument in `intents.ts` stays falsifiable.
   */
  it.each([
    ["this is rubbish, I want my money back", ["refund", "complaint"], "refund"],
    ["how much to send one as a gift", ["gift", "price"], "gift"],
    ["any discount on the price", ["discount", "price"], "discount"],
    ["I have a problem and I want to complain", ["complaint", "support"], "complaint"],
    ["is the enterprise plan a subscription", ["enterprise", "subscription"], "enterprise"],
  ] as const)("%j matches %j and resolves to %s", (message, expected, winner) => {
    const matches = matchingIntents(message);
    for (const intent of expected) expect(matches, intent).toContain(intent);
    expect(matchIntent(message)).toBe(winner);
  });

  it("resolves in declaration order, which is the narrowest vocabulary first", () => {
    // The rule itself, rather than an instance of it: whatever a message
    // matches, the winner is the earliest in `BALDRICK_INTENTS`.
    for (const message of [
      "this is rubbish, I want my money back",
      "how much to send one as a gift",
      "any discount on the price",
      "is the enterprise plan a subscription",
    ]) {
      const matches = matchingIntents(message);
      const earliest = [...matches].sort(
        (a, b) => BALDRICK_INTENTS.indexOf(a) - BALDRICK_INTENTS.indexOf(b),
      )[0];
      expect(matchIntent(message), message).toBe(earliest);
    }
  });
});

describe("choosing a line", () => {
  it("gives the same conversation the same lines, every time", () => {
    // The property the whole file exists for. A transcript that cannot be
    // replayed cannot be reviewed, and B7's acceptance is a transcript.
    const utterances = ["hello", "what do I get", "quick:tell-me-more"];
    const first = [0, 1, 2].map(() => draw(["a", "b", "c", "d"], conversationSeed(utterances)));
    const second = [0, 1, 2].map(() => draw(["a", "b", "c", "d"], conversationSeed(utterances)));
    expect(first).toEqual(second);
  });

  it("gives different conversations different draws, at least sometimes", () => {
    // The other half. A seed that ignored its input would satisfy the test
    // above perfectly and make the pool decorative.
    const pool = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const drawn = new Set(
      ["hello", "refund", "gift", "price", "help", "enterprise"].map((message) =>
        draw(pool, conversationSeed([message])),
      ),
    );
    expect(drawn.size).toBeGreaterThan(1);
  });

  it("does not normalise what it hashes, so a transcript replays exactly", () => {
    // `intents.ts` lower-cases for matching; this must not. Two messages that
    // mean the same thing are the same intent and a different conversation.
    expect(hashUtterances(["Refund"])).not.toBe(hashUtterances(["refund"]));
    expect(hashUtterances([" refund"])).not.toBe(hashUtterances(["refund"]));
  });

  it("separates utterances, so two conversations cannot share a seed", () => {
    // Without a separator, ["ab", "c"] and ["a", "bc"] hash alike.
    expect(hashUtterances(["ab", "c"])).not.toBe(hashUtterances(["a", "bc"]));
  });

  it("draws more than once from one seed without repeating itself", () => {
    // A turn may want an opening and a sign-off. One generator, two draws.
    const next = generator(hashUtterances(["hello"]));
    const drawn = [next(), next(), next()];
    expect(new Set(drawn).size).toBe(3);
    for (const value of drawn) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("refuses an empty pool loudly", () => {
    // A pool with nothing in it is a copy defect -- an intent B4 wrote and gave
    // no words. A blank message would look like Baldrick declining to speak,
    // which is exactly the kind of thing he might plausibly do, so it would
    // never be reported.
    expect(() => draw([], generator(1))).toThrow(/empty pool/);
  });

  it("stays inside the pool for every seed it will ever see", () => {
    const pool = ["a", "b", "c"];
    for (let seed = 0; seed < 5000; seed += 1) {
      expect(pool).toContain(draw(pool, generator(seed)));
    }
  });
});
