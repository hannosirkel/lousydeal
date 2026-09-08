/**
 * Everything Baldrick says.
 *
 * `brand.md`'s voice section is the specification and this is the execution:
 * he is lazy. Not eager, not cheerful, not a helper — a sales assistant who
 * cannot be bothered, employed by a shop that sells nothing.
 *
 * **Laziness is why he is safe**, which is worth restating where the lines are
 * written rather than only where the character is defined. §11 forbids invented
 * customers, totals and testimonials; an eager assistant strains against that
 * constantly, because enthusiasm invents. A lazy one never approaches it —
 * making something up is work. His failure mode is telling you less than you
 * wanted, which is the harmless direction.
 *
 * **He is wrong about his own effort, never about a fact.** He may be
 * reluctant, dismissive, and openly uninterested in whether you buy anything.
 * He may not misstate what the certificate is, what it costs, or what the law
 * gives you. Four guards in `baldrick-copy.test.ts` hold that line, and he is
 * the ninth surface on `legal-consistency.test.ts` — not because he says
 * anything legal, but because a guard is only as wide as its list and this
 * repository has learned that twice.
 *
 * **What he never does**, each enforced:
 *
 *  - state a price, a total or any figure. The worth is said in words. The
 *    site's zero-price signature line is the site's, not his — and writing it
 *    out here to say so is what `store-cart.ts`'s currency-sigil guard caught
 *    in this file's first draft, which is the guard working;
 *  - state an entitlement, a period or a provision. He names *Refunds and
 *    Withdrawal* or the *Imprint* and stops. Summarising a legal document is
 *    effort and risk, and he is against both;
 *  - claim to remember, look up, send, forward or pass anything on;
 *  - invent a count, a percentage, a statistic or another customer.
 *
 * **The trader's address is not here.** Decision `004` keeps the trader's
 * details out of literals, so he points at the Imprint, which resolves them at
 * runtime, rather than carrying an address that would go stale in a file
 * nothing re-reads.
 *
 * **A forward liability, recorded so LD-06 inherits it rather than
 * rediscovering it.** The `discount` steps below say a code exists and is not
 * finished, which is true today. The day LD-06 ships the surcharge codes it
 * becomes false, and LD-05's constraint 9 — a row that falsifies a tracked
 * document carries it — means an LD-06 row must carry this file.
 */

import type { Script } from "../lib/baldrick/conversation";

/** The step the widget opens at. Not an intent: nobody asks for it. */
export const BALDRICK_GREETING = "greeting";

/**
 * The line under the input, always rendered.
 *
 * LD-05's constraint 8. A widget with a box you type into *is* what a support
 * queue looks like, so the disclaimer cannot wait for an intent to match: a
 * person typing "my certificate never arrived" must not believe they have
 * reported it. This sentence is also what keeps the Privacy Policy true without
 * amendment, which is why this slice has no privacy row.
 */
export const BALDRICK_DISCLAIMER =
  "Nothing typed here is stored, sent, or read by a person. Anything that needs answering goes to the address in the Imprint.";

/** What the pause indicator says to a reader who cannot see it. */
export const BALDRICK_PAUSE_LABEL = "Baldrick is selecting a pre-written response";

export const BALDRICK_SCRIPT: Script = {
  greeting: {
    say: [
      ["I am Baldrick. I am here about the certificate.", "I am Baldrick. There is one product and I know most of it."],
      ["Ask me something. I will answer if it is easy."],
    ],
    quickReplies: [
      { id: "open-what", label: "What do I get", goes: "what_do_i_get" },
      { id: "open-discount", label: "Is there a discount", goes: "discount" },
    ],
  },

  what_do_i_get: {
    say: [["A certificate. That is the whole list."]],
    quickReplies: [{ id: "what-really", label: "That is all", goes: "what_do_i_get_more" }],
  },
  what_do_i_get_more: {
    say: [
      ["It has a number on it. The number is yours and nobody else gets it."],
      ["I have looked at one. There was nothing on the back either."],
    ],
  },

  price: {
    say: [
      ["The price is written on the page you came from."],
      ["I am not going to read it out. It has not changed."],
    ],
  },

  discount: {
    say: [
      ["There is a discount code."],
      ["It is not finished. When it is, it will make your deal worse."],
    ],
    quickReplies: [
      { id: "discount-go-on", label: "Go on", goes: "discount_detail" },
      { id: "discount-object", label: "That is not a discount", goes: "discount_objection" },
    ],
  },
  discount_detail: {
    say: [
      ["The plan is that you type the code and the total goes up."],
      ["I was not told why. I did not ask."],
    ],
  },
  discount_objection: {
    say: [["No. It is not."]],
  },

  gift: {
    say: [
      ["You can have it sent to somebody else."],
      ["The checkout asks for their address. I do not do it from here."],
    ],
    quickReplies: [{ id: "gift-how", label: "How does that work", goes: "gift_how" }],
  },
  gift_how: {
    say: [
      ["There is a section at the checkout. You open it and type their address."],
      ["They get an email with the certificate in it. I do not send that either."],
    ],
  },

  refund: {
    say: [
      ["That is a matter for a document."],
      ["Refunds and Withdrawal is in the footer. I have not read it, and I am not going to summarise it."],
    ],
  },

  complaint: {
    say: [
      ["You can complain. I would not take it personally, and I have not."],
      ["The address is in the Imprint. A person reads that one."],
    ],
  },

  support: {
    say: [
      ["The address is in the Imprint."],
      ["Nothing you type here reaches anybody. I am the last stop."],
    ],
  },

  enterprise: {
    say: [
      ["There is no Enterprise."],
      ["There was going to be. It would have cost more and done the same nothing."],
    ],
  },

  subscription: {
    say: [
      ["There is no subscription."],
      ["You buy the certificate once and it stays bought. Nobody has to do anything after that, including me."],
    ],
  },

  fallback: {
    say: [
      [
        "I did not understand that. I am not going to guess.",
        "I have no idea what that was. I am not going to work it out.",
      ],
      ["I know about the certificate, gifts, refunds and complaints. That is the extent of it."],
    ],
  },
};

/**
 * Every word a visitor can read from Baldrick, as one string.
 *
 * Exported rather than rebuilt in each test, because two guards read it —
 * `baldrick-copy.test.ts` and `legal-consistency.test.ts` — and two copies of
 * this reducer could drift apart without either failing. A guard that quietly
 * stops covering a surface is the exact defect `legal-consistency.test.ts` was
 * written after.
 *
 * Quick-reply labels are included: a button is copy, and "That is not a
 * discount" is as readable as anything he says.
 */
export function baldrickProse(script: Script = BALDRICK_SCRIPT): string {
  const steps = Object.values(script).flatMap((step) => [
    ...step.say.flat(),
    ...(step.quickReplies ?? []).map((reply) => reply.label),
  ]);
  return [BALDRICK_DISCLAIMER, BALDRICK_PAUSE_LABEL, ...steps].join("\n");
}
