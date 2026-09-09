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
import { CONSENT_LABEL, EMAIL_HINT } from "../src/content/checkout";
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
];

/** Surfaces that discuss the § 55 confirmation at all. */
const mentionsTheConfirmation = SURFACES.filter(([, text]) => /\bconfirmation\b/i.test(text));

describe("the surfaces this applies to", () => {
  it("includes every legal document and every pre-contractual surface", () => {
    // A cross-document guard that silently stops covering a document is the
    // failure it was written to prevent.
    expect(SURFACES).toHaveLength(9);
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
  });

  it.each(mentionsTheConfirmation)("%s says we send it", (_name, text) => {
    // The positive half, and still the one that matters: a surface may not go
    // quiet about the third condition. Silence is how §5 of the Terms stayed
    // wrong while §6 was being corrected.
    expect(text).toMatch(/\bwe (?:do )?send\b|\bwe send it\b/i);
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
