/**
 * Holds the checkout's consent mechanism, which is the one piece of legal
 * machinery `fresh-build.md` §23 puts inside this build rather than after it.
 *
 * `PaymentForm` itself cannot be rendered here: it is a client component whose
 * tree needs `@stripe/react-stripe-js`'s `<Elements>` provider and a live
 * client secret. What this file holds is the part that decides — the wording,
 * the default, and the control's disabled rule — plus `Button`'s disabled
 * behaviour, which is what that rule acts through.
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Button } from "../src/components/document/Button";
import {
  CART_EMPTY_NOTICE,
  CONSENT_LABEL,
  CONSENT_REQUIRED_NOTICE,
  PRICE_NOTICE,
} from "../src/content/checkout";

/** The rule `PaymentForm` applies, stated once so a test can apply it too. */
const payDisabled = (stripeReady: boolean, submitting: boolean, consented: boolean) =>
  !stripeReady || submitting || !consented;

describe("the express consent", () => {
  it("asks for both things VOS s 53(4) p 7-1 requires", () => {
    // Supply beginning at once, and the acknowledgement that the 14-day right
    // of s 56(1) goes with it. Either alone does not engage the exception.
    expect(CONSENT_LABEL).toContain("begin immediately");
    expect(CONSENT_LABEL).toMatch(/acknowledge/i);
    expect(CONSENT_LABEL).toMatch(/right of withdrawal/i);
  });

  it("is the buyer's statement, not the seller's", () => {
    // First person. A box reading "You agree that..." is the trader asserting
    // the buyer's state of mind rather than recording it.
    expect(CONSENT_LABEL).toMatch(/^I request/);
    expect(CONSENT_LABEL).not.toMatch(/\byou agree\b/i);
  });

  it("does not tell the buyer the right is already gone", () => {
    // The clause also needs the trader's s 55(1)-(2) confirmation on a durable
    // medium, which is LD-02's email. Until then the right is not excluded,
    // whatever this box says.
    expect(CONSENT_LABEL).not.toMatch(/have lost|no longer have|you waive/i);
    expect(CONSENT_LABEL).toContain("will lose");
  });

  it("carries no exclamation mark and no second sentence of persuasion", () => {
    expect(CONSENT_LABEL).not.toContain("!");
  });
});

describe("the pay control", () => {
  it("is disabled until the box is ticked, and only then", () => {
    // Unticked is the default and the reason the control is off: consent the
    // trader supplies is not consent.
    expect(payDisabled(true, false, false)).toBe(true);
    expect(payDisabled(true, false, true)).toBe(false);
    // And still off while Stripe is not ready, or a submission is in flight.
    expect(payDisabled(false, false, true)).toBe(true);
    expect(payDisabled(true, true, true)).toBe(true);
  });

  it("renders as a real disabled button, which a link cannot be", () => {
    const off = renderToStaticMarkup(createElement(Button, { type: "submit", disabled: true, children: "Pay" }));
    expect(off).toContain('type="submit"');
    expect(off).toContain("disabled");

    const on = renderToStaticMarkup(createElement(Button, { type: "submit", children: "Pay" }));
    expect(on).not.toContain("disabled");
  });

  it("says why it is off, rather than leaving the reader to guess", () => {
    expect(CONSENT_REQUIRED_NOTICE).toContain("ticked");
  });
});

describe("the price notice", () => {
  it("says the figure shown is the figure charged", () => {
    // Decision 009: the advertised price is what every buyer is charged, EU or
    // not, and Estonia's VAT comes out of it rather than being added to it.
    // Contract s 23 requires the final price to be explicit before payment.
    expect(PRICE_NOTICE).toContain("includes VAT");
    expect(PRICE_NOTICE).toContain("amount shown is the amount charged");
  });
});

describe("the empty cart", () => {
  it("is a document, not a sentence", () => {
    expect(CART_EMPTY_NOTICE).toContain("No items of record");
  });
});
