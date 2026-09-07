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
  WITHDRAWAL_RECORD_LINES,
  WITHDRAWAL_RECORD_STATES,
  WITHDRAWAL_FIELDS,
} from "../src/content/withdrawal";

const page = readFileSync(fileURLToPath(new URL("../src/app/legal/withdraw/page.tsx", import.meta.url)), "utf8");
/** C14. Read as source for the same reason the page is: what matters is the shape, not a rendered string. */
const action = readFileSync(fileURLToPath(new URL("../src/app/legal/withdraw/actions.ts", import.meta.url)), "utf8");

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
  it("tells the buyer to keep the page, since § 56(2⁵) puts the burden on them", () => {
    const lines = WITHDRAWAL_DONE_LINES.join(" ");
    expect(lines).toContain("§ 56(2⁵)");
    expect(lines).toMatch(/keep this page/i);
    expect(lines).toContain("§ 56(2¹)");
  });

  /**
   * **Inverted by C14**, in the change that made the old wording false. This
   * required "do not yet send a confirmation by email", which was right while
   * there was no transport; C9 through C11 gave both deployments one and the
   * confirmation control now posts to `POST /store/withdrawals`.
   *
   * What replaces it is not one claim but three, because there are three
   * outcomes and only one of them may assert a receipt exists.
   */
  it("has a distinct closing line for each of the three outcomes", () => {
    const states = Object.values(WITHDRAWAL_RECORD_STATES);
    expect(states).toEqual(["sent", "received", "unrecorded"]);
    expect(Object.keys(WITHDRAWAL_RECORD_LINES).sort()).toEqual([...states].sort());
    // Three different sentences, not one reused: a page that said the same
    // thing however the send went would be the failure this split exists to
    // prevent.
    expect(new Set(Object.values(WITHDRAWAL_RECORD_LINES)).size).toBe(3);
  });

  it("claims a receipt only where one was actually sent", () => {
    // The whole point of carrying the outcome in the URL. `received` means we
    // hold the withdrawal and the email did not go; `unrecorded` means we may
    // not hold it at all. Neither may say a confirmation was sent.
    expect(WITHDRAWAL_RECORD_LINES.sent).toMatch(/we have sent a confirmation/i);
    expect(WITHDRAWAL_RECORD_LINES.sent).toContain("§ 56⁴(4)");
    for (const line of [WITHDRAWAL_RECORD_LINES.received, WITHDRAWAL_RECORD_LINES.unrecorded]) {
      expect(line).not.toMatch(/we have sent|we sent you|confirmation is on its way/i);
    }
  });

  it("never tells the buyer the withdrawal itself failed", () => {
    // § 56(2¹) fixes the withdrawal at the moment it was sent, so none of the
    // three outcomes undoes one. The weakest case is honest about what *we*
    // hold -- which is a different sentence from "it did not work".
    for (const line of Object.values(WITHDRAWAL_RECORD_LINES)) {
      expect(line).not.toMatch(/\b(?:failed|did not go through|was not accepted|try again)\b/i);
    }
    expect(WITHDRAWAL_RECORD_LINES.unrecorded).toMatch(/your withdrawal still counts/i);
    expect(WITHDRAWAL_RECORD_LINES.unrecorded).toContain("§ 56(2¹)");
  });

  it("treats an unknown record value as the weakest one", () => {
    // A hand-edited URL claiming `record=sent` must not make the page assert a
    // receipt exists. The page narrows to the two known states and falls back.
    expect(page).toMatch(/WITHDRAWAL_RECORD_STATES\.sent[\s\S]{0,120}WITHDRAWAL_RECORD_STATES\.received/);
    expect(page).toContain("WITHDRAWAL_RECORD_STATES.unrecorded");
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
    // The two steps that transmit nothing are still plain GET forms. The third
    // is a Server Action, which Next.js renders as a plain POST to this URL --
    // it runs whether or not the client executed any JavaScript. This is the
    // page a buyer reaches when they want their money back; it is the last one
    // that should need a script.
    expect(page).toMatch(/method="GET"/);
    expect(page).toMatch(/<form action=\{submitWithdrawal\}>/);
    expect(page).not.toMatch(/"use client"/);
    expect(page).not.toMatch(/onSubmit|onClick|useState|useEffect/);
  });

  it("keeps the effect on the one step that has one", () => {
    // § 56⁴(3) makes the confirmation control the thing that transmits. A GET
    // that transmitted could be re-sent by a reload or a link prefetch, and a
    // POST that rendered the record could be re-sent by a refresh -- so the
    // action redirects, and the page it lands on is a GET again.
    expect(action).toContain('"use server"');
    expect(action).toMatch(/method: "POST"/);
    expect(action).toMatch(/redirect\(/);
    expect(action).toContain("/store/withdrawals");
  });
});
