/**
 * Holds the checkout's consent mechanism, which is the one piece of legal
 * machinery `fresh-build.md` §23 puts inside this build rather than after it.
 *
 * **It renders the real control.** An earlier version of this file declared
 * the pay control's disabled rule itself and asserted that, claiming the form
 * could not be reached without a live Stripe client secret. Gate D disproved
 * both halves: it defaulted the consent box to ticked and deleted the gate
 * from `PaymentForm` entirely, and every test still passed. Nothing under test
 * touches Stripe, so four lines of `vi.mock` render the actual markup.
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { Button } from "../src/components/document/Button";
import {
  CART_DOCUMENT,
  CART_EMPTY_NOTICE,
  CHECKOUT_DOCUMENT,
  CONSENT_LABEL,
  CONSENT_REQUIRED_NOTICE,
  PRICE_NOTICE,
} from "../src/content/checkout";
import { payDisabled } from "../src/lib/checkout-rules";
import { PayButton } from "../src/app/checkout/PaymentForm";

// Nothing asserted below touches Stripe; these four exist only so the module
// imports.
vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: unknown }) => children,
  PaymentElement: () => createElement("div", { "data-testid": "payment-element" }),
  useStripe: () => ({}),
  useElements: () => ({}),
}));
vi.mock("@stripe/stripe-js", () => ({ loadStripe: () => Promise.resolve(null) }));

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

describe("the rendered checkout form", () => {
  const html = renderToStaticMarkup(
    createElement(PayButton, {
      cartId: "cart_1",
      fetchJson: (async () => ({})) as never,
      countries: [{ iso_2: "ee", display_name: "Estonia" }],
    }),
  );

  it("ships the consent box unticked", () => {
    // The default, read off the markup a browser gets -- not off a constant
    // and not off an argument a test chose. Defaulting it to ticked is the
    // regression this assertion exists for.
    expect(html).toContain('id="checkout-consent"');
    expect(html).toMatch(/<input[^>]*id="checkout-consent"[^>]*>/);
    expect(/<input[^>]*id="checkout-consent"[^>]*checked/.test(html)).toBe(false);
  });

  it("marks the box required, so an implicit submission cannot skip it", () => {
    expect(/<input[^>]*id="checkout-consent"[^>]*required/.test(html)).toBe(true);
  });

  it("ships the pay control disabled, and says why next to the box", () => {
    expect(html).toMatch(/<button[^>]*class="button is-primary"[^>]*disabled/);
    expect(html).toContain(CONSENT_REQUIRED_NOTICE);
    // Described by the box, not the button: a disabled button is not
    // focusable, so a keyboard reader never reaches an explanation hung on it.
    expect(html).toContain('aria-describedby="checkout-consent-required"');
    expect(html).toContain('id="checkout-consent-required"');
  });

  it("labels the box with the consent wording itself", () => {
    expect(html).toContain('for="checkout-consent"');
    expect(html).toContain(CONSENT_LABEL);
  });
});

describe("the pay control's rule", () => {
  it("is off until the box is ticked, and only then", () => {
    // The function the component calls -- imported, not restated here.
    expect(payDisabled({ stripeReady: true, submitting: false, consented: false })).toBe(true);
    expect(payDisabled({ stripeReady: true, submitting: false, consented: true })).toBe(false);
    expect(payDisabled({ stripeReady: false, submitting: false, consented: true })).toBe(true);
    expect(payDisabled({ stripeReady: true, submitting: true, consented: true })).toBe(true);
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

describe("the two documents", () => {
  it("are titled and numbered as the brand document says", () => {
    expect(CART_DOCUMENT).toMatchObject({ title: "Order summary", form: "Form LD-3" });
    expect(CHECKOUT_DOCUMENT).toMatchObject({ title: "Payment authorisation", form: "Form LD-4" });
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
