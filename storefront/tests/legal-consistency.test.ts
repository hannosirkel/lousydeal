/**
 * Every surface that mentions the § 55 confirmation must say the same thing
 * about it.
 *
 * **This exists because V10 shipped a contradiction between two merged
 * documents.** Refunds §3 and §4 said the confirmation is not sent and the
 * 14-day right therefore stands; Terms §6 said "we send that confirmation by
 * email" three sentences after reciting the three conditions; and the offer
 * page said a buyer "thereby lose[s]" the right. Three surfaces, three
 * positions, on the one fact the whole exception turns on.
 *
 * Nothing caught it because every test in the suite checked one document
 * against itself. `legal-refunds.test.ts` even carried the ban — scoped to
 * `REFUNDS`, and worded `(?:it|you|the confirmation)`, which does not match
 * "that confirmation". A guard aimed at one file is not a guard on a claim.
 *
 * So the unit here is the claim, not the document. Every surface a buyer can
 * read is collected, and the rules apply across all of them at once.
 */

import { describe, expect, it } from "vitest";

import { baldrickProse } from "../src/content/baldrick";
import {
  ADDRESS_NOTE,
  CONSENT_LABEL,
  EMAIL_HINT,
  GIFT_CONFIRMATION_NOTE,
  POSTED_PRICE_NOTICE,
  orderSummaryLines,
} from "../src/content/checkout";
import { MERCH_APOLOGY, MERCH_HEADING, MERCH_TABLE_HEADINGS } from "../src/content/merch";
import { WITHDRAWAL_NOTICE } from "../src/content/deal";
import { TERMS_OF_OFFER } from "../src/content/home";
import { IMPRINT } from "../src/content/legal/imprint";
import { PRIVACY } from "../src/content/legal/privacy";
import { REFUNDS } from "../src/content/legal/refunds";
import { TERMS } from "../src/content/legal/terms";
import type { LegalDocument } from "../src/content/legal/types";

const documentProse = (document: LegalDocument): string =>
  document.sections.flatMap((section) => section.body).join("\n");

/**
 * Every surface a buyer can read, legal document or not.
 *
 * The offer page and the checkout box belong here precisely because they are
 * not legal documents: they are what a buyer reads *before* paying, which makes
 * them the worst places to be wrong.
 */
const SURFACES: ReadonlyArray<readonly [string, string]> = [
  ["Refunds and Withdrawal", documentProse(REFUNDS)],
  ["the Terms", documentProse(TERMS)],
  ["the Imprint", documentProse(IMPRINT)],
  ["the Privacy Policy", documentProse(PRIVACY)],
  ["the offer page notice", WITHDRAWAL_NOTICE],
  // Gate E found this one saying "you thereby lose the 14-day right of
  // withdrawal" -- the flat form V10a corrected on three other surfaces --
  // three rows after that correction, on the home page. It was not on the list,
  // and a guard is only as wide as its list.
  ["the home page's offer terms", TERMS_OF_OFFER.join("\n")],
  ["the checkout consent box", CONSENT_LABEL],
  // C13 found this one the same way Gate E found the home page: it makes the
  // claim, it sits beside a field the buyer fills in before paying, and it was
  // not on the list. `checkout.ts`'s own comment said this guard "enforces it
  // across all seven" while being one of the surfaces it did not reach.
  ["the checkout email hint", EMAIL_HINT],
  // B4 adds Baldrick, and the reason is the sentence this file opens with: a
  // guard is only as wide as its list. He is not a legal document and says
  // nothing legal -- his own guards forbid it -- but he is prose a buyer reads
  // beside the offer, in a widget nobody would think to re-read when a
  // document is corrected. That is precisely the shape of the two surfaces
  // already on this list because they were found missing from it.
  ["Baldrick", baldrickProse()],
  // **LD-04 added five surfaces and this list was not one of the files it
  // touched.** Gate D found four stale claims surviving on surfaces the guard
  // does not read -- and the file's own header has said twice already that a
  // guard is only as wide as its list. These are the ones LD-04 made:
  ["the gift confirmation note", GIFT_CONFIRMATION_NOTE],
  ["the address note", ADDRESS_NOTE],
  ["the posted price notice", POSTED_PRICE_NOTICE],
  ["the merch upsell", [MERCH_HEADING, MERCH_APOLOGY, ...Object.values(MERCH_TABLE_HEADINGS)].join("\n")],
  // Every cart shape the checkout can render, because the § 62²(2) lines
  // differ by shape and only one of them was ever read here.
  [
    "the order summary",
    [
      ...orderSummaryLines({ hasCertificate: true, hasPostedGoods: false }),
      ...orderSummaryLines({ hasCertificate: true, hasPostedGoods: true }),
    ].join("\n"),
  ],
];

/** Surfaces that discuss the § 55 confirmation at all. */
const mentionsTheConfirmation = SURFACES.filter(([, text]) => /\bconfirmation\b/i.test(text));

describe("the surfaces this applies to", () => {
  it("includes every legal document and every pre-contractual surface", () => {
    // A cross-document guard that silently stops covering a document is the
    // failure it was written to prevent.
    expect(SURFACES).toHaveLength(14);
    for (const [name, text] of SURFACES) expect(`${name}: ${String(text.length > 0)}`).toBe(`${name}: true`);
  });

  it("finds the confirmation discussed on more than one of them", () => {
    // If this ever drops to one, the rules below stop comparing anything.
    expect(mentionsTheConfirmation.length).toBeGreaterThan(1);
  });
});

describe("what every surface says about the confirmation", () => {
  /**
   * **These two rules are the inverse of the ones C13 replaced**, and the
   * inversion happened in the pull request that made the old claim untrue.
   *
   * Until C9 there was no confirmation, so every surface had to say so and a
   * guard forbade any of them claiming otherwise. C10 and C11 put a mail
   * transport and credentials on both deployments; a real message now goes out
   * for every order. Leaving the old guards in place would have made the suite
   * enforce a falsehood across seven documents, which is worse than no guard
   * at all -- so they are turned round rather than deleted, and this comment is
   * the record of why.
   */
  it.each(mentionsTheConfirmation)("%s does not assert that we withhold it", (_name, text) => {
    expect(text).not.toMatch(/do(?:es)? not (?:yet )?send/i);
    expect(text).not.toMatch(/\bno confirmation is (?:sent|given)\b/i);
    // The form the positive rule above would not catch on its own.
    expect(text).not.toMatch(/\bwe never send\b/i);
  });

  it.each(mentionsTheConfirmation)("%s says we send it", (_name, text) => {
    // The positive half, and still the one that matters: a surface may not go
    // quiet about the third condition. Silence is how §5 of the Terms stayed
    // wrong while §6 was being corrected.
    // **The adverbs are enumerated, not wildcarded.** `we (\w+ )?send` would
    // admit "we never send", which is the one thing this rule exists to
    // forbid. Widened from `we (do )?send` when the gift note joined the list
    // saying "we still send" -- a phrasing that asserts exactly the same thing
    // and matched nothing.
    expect(text).toMatch(/\bwe (?:do |still |also |always )?send\b|\bwe send it\b/i);
  });
});

describe("what every surface says about the right", () => {
  const assertsTheLoss = /\byou (?:thereby )?(?:lose|forfeit|give up)\b|\bhave lost\b|\bno longer have\b/i;

  it.each(SURFACES)("%s does not report the right as already lost", (name, text) => {
    // The consent box is the one place the statute *requires* the loss to be
    // put to the buyer, and § 53(4) p 7¹ words it conditionally. Everywhere
    // else the conditional is the only honest form too.
    const offending = text.split(/(?<=\.)\s+/).filter((sentence) => assertsTheLoss.test(sentence));
    expect(`${name}: ${offending.join(" | ")}`).toBe(`${name}: `);
  });

  it.each(SURFACES)("%s does not claim the exception applies to an order", (name, text) => {
    // The replacement for the old "the third condition is not met" guards, and
    // the reason C13 could not simply flip every sentence to its opposite.
    // Sending the confirmation makes the third condition *capable* of being
    // met; whether it was met for a given order turns on timing this site
    // cannot settle -- supply begins the instant payment succeeds, and the
    // email follows it. A surface asserting the condition satisfied would be
    // the trader deciding that question in its own favour, which is exactly
    // what the documents promise not to do.
    const claimsTheException =
      /\b(?:third condition (?:is|was) (?:met|satisfied)|§ 53\(4\) p 7¹ (?:applies|has removed)|right (?:is|was) (?:therefore )?(?:excluded|removed))\b/i;
    const offending = text.split(/(?<=\.)\s+/).filter((sentence) => claimsTheException.test(sentence));
    // The Terms promise the opposite in as many words; that sentence names the
    // provision to disclaim it, so it is allowed to and nothing else is.
    const allowed = offending.filter((sentence) => !/\bwill not refuse\b/i.test(sentence));
    expect(`${name}: ${allowed.join(" | ")}`).toBe(`${name}: `);
  });

  it("states the 12-month extension wherever the 14 days are explained", () => {
    // § 56(1⁶): where the trader breached the § 54(1) p 12 duty, the period
    // runs 12 months longer. Nothing links `/legal/refunds` yet, so whether
    // that duty was discharged pre-contractually is a live question -- which
    // makes omitting the provision an understatement in the buyer's disfavour.
    for (const document of [REFUNDS, TERMS]) {
      expect(documentProse(document)).toContain("§ 56(1⁶)");
      expect(documentProse(document)).toMatch(/12 months/i);
    }
  });
});

describe("the refund promise", () => {
  it("carries no condition of its own", () => {
    // Gate D added "provided you have not used the certificate" -- a condition
    // § 62 voids -- and the suite passed. § 56¹(1) admits no such qualifier, so
    // the sentence stating it may not acquire one.
    // The whole promise, not one sentence of it: the mutation landed on the
    // § 56¹(4) sentence and a selector keyed to § 56¹(1) walked straight past
    // it. Both sentences are the promise.
    const promise = REFUNDS.sections
      .filter((section) => section.body.some((paragraph) => /§ 56¹\(1\)/.test(paragraph)))
      .flatMap((section) => section.body)
      .join(" ");
    expect(promise).toContain("§ 56¹(1)");
    expect(promise).toContain("§ 56¹(4)");

    // None of these is ever lawful here: § 56¹(1) admits no qualifier at all.
    expect(promise).not.toMatch(/\b(?:provided|only if|so long as|as long as|except where|on condition)\b/i);

    // "unless" has exactly one legitimate use, the § 56¹(4) choice of means.
    // Every occurrence must be that one, so "unless you have used the
    // certificate" cannot hide among them.
    for (const match of promise.matchAll(/\bunless\b(.{0,40})/gi)) {
      expect(match[1]).toMatch(/expressly ask/i);
    }

    /**
     * **"until" is the word LD-04 had to add, and leaving it unbanned would
     * have been the hole.**
     *
     * § 56¹(5) permits a trader to withhold repayment until the goods are
     * returned or shown to have been sent. That is a lawful condition on the
     * refund promise and it lives in this same section, so the ban above
     * cannot simply be widened to cover it — widening would forbid a sentence
     * the statute allows. But a word left merely unlisted is a word a future
     * Gate D can use: "we refund you until we decide otherwise" would pass a
     * ban that never mentions it.
     *
     * So it is permitted by name, exactly as "unless" is, and every occurrence
     * has to be the statutory one.
     */
    for (const match of promise.matchAll(/\buntil\b(.{0,60})/gi)) {
      expect(match[1]).toMatch(/you have (?:returned|sent)/i);
    }
  });

  const promiseParagraphs = () =>
    REFUNDS.sections
      .filter((section) => section.body.some((paragraph) => /§ 56¹\(1\)/.test(paragraph)))
      .flatMap((section) => section.body);

  it("takes the withholding right no further than § 56¹(5) does", () => {
    // Two limits in the subsection, and both cut against us. It applies only
    // where the object of the contract is the handing over of a thing, so
    // withholding a certificate buyer's money would be unlawful -- there is
    // nothing they could return to release it. And it is unavailable to a
    // trader who agreed to collect the item.
    const withholding = promiseParagraphs()
      .filter((paragraph) => /§ 56¹\(5\)/.test(paragraph))
      .join(" ");
    expect(withholding).not.toBe("");
    expect(withholding).toMatch(/printed item/i);
    expect(withholding).toMatch(/nothing is ever held back on a certificate/i);
    expect(withholding).toMatch(/agreed to collect/i);
  });

  it("returns the delivery charge too, which § 56¹(1) names and a refund clause forgets", () => {
    // § 56¹(1) returns "kõik tarbijalt lepingu alusel saadud tasud, muu hulgas
    // tarbija kantud asja kättetoimetamise kulud" -- everything received,
    // *including the delivery costs the consumer bore*. A clause promising
    // only "the price" understates it by the whole of the postage.
    const promise = promiseParagraphs().join(" ");
    expect(promise).toMatch(/delivery costs you bore/i);

    // § 56¹(3) is the cap, and the plan for this row misread it as a general
    // one. It bites only where the buyer expressly chose a method other than
    // the cheapest ordinary one offered, and this shop offers a single method
    // -- `fulfilment-provider.ts` returns one option and the checkout applies
    // the cheapest rate. So the whole of the postage comes back, and the
    // tempting wording the plan drafted ("up to the cheapest standard option
    // we offered") would have understated the refund.
    expect(promise).toContain("§ 56¹(3)");
    expect(promise).toMatch(/the whole of the postage comes back/i);
    expect(promise).not.toMatch(/up to the cheapest/i);
  });
});

describe("claims corrected in one document and left standing in another", () => {
  /**
   * **Every phrase below was corrected somewhere and survived somewhere else.**
   * The €30 sentence was written in four places, corrected in Terms §12 and
   * Refunds §8 by P10, and found by Gate D still standing in the Imprint and
   * in the § 55 confirmation — where the Imprint additionally *cited the
   * Terms* for a claim the Terms explicitly retract.
   *
   * That is this file's own thesis, stated in its header twice: a guard aimed
   * at one file is not a guard on a claim. `legal-refunds.test.ts` banned the
   * threshold sentence — in `REFUNDS` alone.
   */
  const bannedEverywhere: ReadonlyArray<readonly [string, RegExp]> = [
    // The disputes threshold. A shirt costs more than 30 euros, and a buyer
    // steered away from the committee has lost a remedy that would have taken
    // their claim.
    ["everything sold is under the threshold", /more than anything sold here costs|every item sold here costs less/i],
    // The shop sells five things in two kinds. Said flatly, shop-wide, this is
    // the claim LD-04 falsified -- not the scoped sentence about what a
    // certificate confers, which every document is right to keep.
    ["there is only one product", /\bthere is one product\b/i],
    // False since P7 collected a delivery name, and since G6 stored a gift
    // recipient's. Privacy §4 was corrected and §9 was not.
    ["no name is held at all", /\bwe hold no name\b/i],
    // Untrue since LD-02, and twice over since C14's withdrawal receipt.
    ["no email is sent at all", /\bwe send no email at all\b/i],
  ];

  for (const [claim, pattern] of bannedEverywhere) {
    it.each(SURFACES)(`%s does not claim ${claim}`, (name, text) => {
      const offending = text.split(/(?<=\.)\s+/).filter((sentence) => pattern.test(sentence));
      expect(`${name}: ${offending.join(" | ")}`).toBe(`${name}: `);
    });
  }

  it("checks these against every surface, not against one document", () => {
    // The assertion that makes the ones above worth having: they run over the
    // whole list, and the list is the one the count above pins.
    expect(SURFACES.length).toBeGreaterThanOrEqual(14);
  });
});

describe("what every surface says is sold", () => {
  it("names the printed things wherever it enumerates the shop's products", () => {
    // The Imprint's "What is sold here" said "a numbered digital certificate,
    // and nothing else of value" a row after Terms §2 began saying two kinds
    // of thing are sold. A document that enumerates has to enumerate.
    const imprint = documentProse(IMPRINT);
    expect(imprint).toMatch(/Printed goods too/i);
    expect(imprint).toMatch(/worth what such objects are worth/i);
  });

  it("keeps the certificate's own description intact while doing it", () => {
    // Scoping is one edit away from softening, and this is the clause §23
    // turns on.
    expect(documentProse(IMPRINT)).toMatch(/nothing else of value/i);
  });

  it("says which name the Privacy Policy does not hold", () => {
    // The narrower claim is still true and is the one a reader cares about.
    expect(documentProse(PRIVACY)).toMatch(/We hold no billing name/i);
    expect(documentProse(PRIVACY)).toMatch(/delivery name you typed/i);
  });
});

describe("the exception, disclaimed at the same width in both documents", () => {
  /**
   * **Gate D found the two promising different things.** The Terms said "we
   * will not refuse on the ground that § 53(4) p 7¹ has removed your right" —
   * the whole exception disclaimed. Refunds §4 disclaimed only the third
   * condition, and §6 then said that where all three are met "there is nothing
   * to return".
   *
   * A buyer reading the Terms was promised a refund on any certificate
   * withdrawal; a buyer reading Refunds §6 was told that ticking the box and
   * getting the email left them with nothing. Both cannot be what the shop
   * does, and neither document said which governs.
   *
   * Resolved in the buyer's favour, because that is the direction a promise
   * already made can be resolved in: §6 now says the promise governs and
   * names the Terms clause that makes it.
   */
  it("does not leave a buyer with nothing where a promise says otherwise", () => {
    const refunds = documentProse(REFUNDS);
    expect(refunds).not.toMatch(/there is nothing to return on a withdrawal/i);
    expect(refunds).toMatch(/we will not refuse on that ground, and that promise is what governs/i);
  });

  it("points at the clause that makes the promise, in the other document", () => {
    // A cross-reference is what stops the two drifting again: correcting one
    // now reads oddly against the other.
    expect(documentProse(REFUNDS)).toMatch(/The Terms of Service say the same in §6/);
    expect(documentProse(TERMS)).toMatch(/we will not refuse on the ground that § 53\(4\) p 7¹ has removed your right/);
  });

  it("still refuses to tell anybody the exception was met for their order", () => {
    // Which is the older rule and unchanged: whether the third condition was
    // satisfied turns on timing this site cannot settle, and the trader does
    // not get to answer it in its own favour.
    for (const document of [REFUNDS, TERMS]) {
      expect(documentProse(document)).toMatch(/not (?:a question we will answer in our own favour|answer that question in our own favour)/i);
    }
  });
});
