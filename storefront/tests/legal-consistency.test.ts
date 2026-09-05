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

import { CONSENT_LABEL } from "../src/content/checkout";
import { WITHDRAWAL_NOTICE } from "../src/content/deal";
import { IMPRINT } from "../src/content/legal/imprint";
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
  ["the offer page notice", WITHDRAWAL_NOTICE],
  ["the checkout consent box", CONSENT_LABEL],
];

/** Surfaces that discuss the § 55 confirmation at all. */
const mentionsTheConfirmation = SURFACES.filter(([, text]) => /\bconfirmation\b/i.test(text));

describe("the surfaces this applies to", () => {
  it("includes every legal document and the two pre-contractual surfaces", () => {
    // A cross-document guard that silently stops covering a document is the
    // failure it was written to prevent.
    expect(SURFACES).toHaveLength(5);
    for (const [name, text] of SURFACES) expect(`${name}: ${String(text.length > 0)}`).toBe(`${name}: true`);
  });

  it("finds the confirmation discussed on more than one of them", () => {
    // If this ever drops to one, the rules below stop comparing anything.
    expect(mentionsTheConfirmation.length).toBeGreaterThan(1);
  });
});

describe("what every surface says about the confirmation", () => {
  it.each(mentionsTheConfirmation)("%s does not assert that we send it", (_name, text) => {
    // Any determiner, and the passive. The version this replaces matched
    // `(?:it|you|the confirmation)` and let "we send that confirmation by
    // email" through.
    expect(text).not.toMatch(/\bwe send\b(?![^.]*\bnot\b)[^.]*\bconfirmation\b/i);
    expect(text).not.toMatch(/\bconfirmation\b[^.]*\b(?:is|are|will be)\s+sent\b/i);
    expect(text).not.toMatch(/\ba confirmation is sent\b/i);
  });

  it.each(mentionsTheConfirmation)("%s says we do not send it yet", (_name, text) => {
    // The positive half, and the one that matters: a surface may not simply go
    // quiet about the third condition. Being silent is how §5 of the Terms
    // stayed wrong while §6 was being corrected.
    expect(text).toMatch(/do(?:es)? not (?:yet )?send|not yet send/i);
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
  });
});
