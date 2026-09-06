/**
 * The § 56⁴ withdrawal function: the two controls, their words, and the fields
 * the subsection names.
 *
 * It was gate item 7 — the one open item that no amount of drafting could
 * close, because the statute asks for a button and there wasn't one.
 *
 * `no-unresolved-placeholder.test.ts` does not cover this: it is a page rather
 * than a `LegalDocument`, and it resolves no merchant field. What it must not
 * do is drift from the statute's own vocabulary, which is what is checked here.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { LEGAL_ROUTES } from "../src/content/legal-routes";
import {
  WITHDRAWAL_BUTTON_LABEL,
  WITHDRAWAL_CONFIRM_LABEL,
  WITHDRAWAL_DONE_LINES,
  WITHDRAWAL_FIELDS,
} from "../src/content/withdrawal";

const page = readFileSync(fileURLToPath(new URL("../src/app/legal/withdraw/page.tsx", import.meta.url)), "utf8");

describe("the two controls § 56⁴ names", () => {
  it("marks each with the statute's own words", () => {
    // § 56⁴(1) and (3) name "Taganen lepingust" and "Kinnitan taganemise",
    // then admit any other unambiguous, easily legible wording. The site is in
    // English, so the English leads and the Estonian is kept beside it.
    expect(WITHDRAWAL_BUTTON_LABEL).toContain("Taganen lepingust");
    expect(WITHDRAWAL_BUTTON_LABEL).toMatch(/^I withdraw from the contract/);
    expect(WITHDRAWAL_CONFIRM_LABEL).toContain("Kinnitan taganemise");
    expect(WITHDRAWAL_CONFIRM_LABEL).toMatch(/^I confirm the withdrawal/);
  });

  it("asks for the three things § 56⁴(2) lists, and nothing else", () => {
    expect(Object.keys(WITHDRAWAL_FIELDS).sort()).toEqual(["contact", "contract", "name"]);
    expect(WITHDRAWAL_FIELDS.contract.label).toMatch(/order number/i);
  });

  it("never asks why", () => {
    // § 56(1): without giving any reason. A "reason" field would be a term
    // that hinders the exercise of the right, which § 56²(9) voids.
    expect(page).not.toMatch(/reason/i);
  });
});

describe("what it can and cannot do", () => {
  it("says the § 56⁴(4) receipt is not sent, because no email exists", () => {
    const lines = WITHDRAWAL_DONE_LINES.join(" ");
    expect(lines).toMatch(/do not yet send a confirmation by email/i);
    expect(lines).toContain("§ 56(2⁴)");
  });

  it("tells the buyer to keep the page, since § 56(2⁵) puts the burden on them", () => {
    const lines = WITHDRAWAL_DONE_LINES.join(" ");
    expect(lines).toContain("§ 56(2⁵)");
    expect(lines).toMatch(/keep this page/i);
    expect(lines).toContain("§ 56(2¹)");
  });
});

describe("reachability", () => {
  it("is a legal route, so the footer carries it on every page", () => {
    // § 56⁴(2): "permanently and easily reachable throughout the withdrawal
    // period". The footer is in the layout, and `legal-routes.test.ts` asserts
    // it renders every entry -- so being in this list is the guarantee.
    expect(LEGAL_ROUTES.map((route) => route.href)).toContain("/legal/withdraw");
  });

  it("works with scripting disabled", () => {
    // Both steps are plain form posts. This is the page a buyer reaches when
    // they want their money back; it is the last one that should need a script.
    expect(page).toMatch(/method="GET"/);
    expect(page).not.toMatch(/"use client"/);
    expect(page).not.toMatch(/onSubmit|onClick/);
  });
});
