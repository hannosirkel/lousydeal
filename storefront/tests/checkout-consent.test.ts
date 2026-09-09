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

import { readFileSync } from "node:fs";

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
import { cartHasCertificate, cartNeedsAddress, payDisabled, paySubmitBlocked } from "../src/lib/checkout-rules";
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

  it("scopes the acknowledgement to the certificate, because a cart can hold a mug", () => {
    // **LD-04 P10's named deliverable, and nothing guarded it.** Mutation
    // reverted "for that certificate" and every test passed.
    //
    // Unscoped, a buyer with a shirt and a certificate in one cart reads "I
    // will lose my right of withdrawal" as covering the order. It cannot:
    // § 53(4) p 7¹ reaches only digital content off a physical medium, and no
    // consent of any kind removes the right for goods. A box that appeared to
    // take it would be the § 56²(9) term -- one that hinders the exercise of
    // the right -- which is void, and worse, it would have worked on a reader
    // who believed it.
    expect(CONSENT_LABEL).toMatch(/right of withdrawal for that certificate/i);
  });
});

describe("the rendered checkout form", () => {
  const html = renderToStaticMarkup(
    createElement(PayButton, {
      cartId: "cart_1",
      fetchJson: (async () => ({})) as never,
      countries: [{ iso_2: "ee", display_name: "Estonia" }],
      // LD-04 P7: a certificate-only cart, which posts nothing. The address
      // block and the postage row are absent, and the pay gate is unchanged.
      needsAddress: false,
      needsConsent: true,
      currencyCode: "usd",
      // Gate D finding 17 moved the card out of this form and the Stripe
      // client with it: what used to be `useStripe() !== null` is now a flag,
      // and the card fields are a slot. `true` here renders what a buyer with
      // a loaded Stripe client sees, which is what these tests are about.
      stripeReady: true,
      confirmPayment: (async () => ({})) as never,
      onPostageSettled: () => undefined,
      cardSlot: null,
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

  it("is off until the postage is settled, for a cart that has any", () => {
    // **LD-04 P7.** Until a shipping method is on the cart the total is the
    // goods alone, so paying would take the buyer's money without the postage
    // in it -- and the merchant would pay the difference on every order.
    const ready = { stripeReady: true, submitting: false, consented: true } as const;
    expect(payDisabled({ ...ready, shippingSettled: false })).toBe(true);
    expect(payDisabled({ ...ready, shippingSettled: true })).toBe(false);
  });

  it("defaults to settled, so a certificate-only cart is unaffected", () => {
    // A certificate posts nothing. The parameter is optional precisely so that
    // every existing caller keeps its meaning: a gate that silently became
    // stricter would be a gate nobody reviewed, and the certificate path is
    // what constraint 4 forbids this slice from changing.
    expect(payDisabled({ stripeReady: true, submitting: false, consented: true })).toBe(false);
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

describe("a cart with no certificate in it", () => {
  /**
   * **§ 53(4) p 7¹ is about digital content, and merch alone is a state
   * `isPayableCart` admits deliberately.** A buyer ordering one mug was being
   * asked to request the immediate supply of a certificate they were not
   * buying — and then refused payment until they said yes to it.
   *
   * That is not a cosmetic defect. It is a control that does nothing, which
   * `brand.md` calls a lie, blocking a lawful order.
   */
  const html = renderToStaticMarkup(
    createElement(PayButton, {
      cartId: "cart_1",
      fetchJson: (async () => ({})) as never,
      countries: [{ iso_2: "ee", display_name: "Estonia" }],
      needsAddress: true,
      needsConsent: false,
      currencyCode: "usd",
      // Gate D finding 17 moved the card out of this form and the Stripe
      // client with it: what used to be `useStripe() !== null` is now a flag,
      // and the card fields are a slot. `true` here renders what a buyer with
      // a loaded Stripe client sees, which is what these tests are about.
      stripeReady: true,
      confirmPayment: (async () => ({})) as never,
      onPostageSettled: () => undefined,
      cardSlot: null,
    }),
  );

  it("shows no consent box at all", () => {
    // Absent, not unticked and not disabled -- the same disposition the
    // address block takes for a cart with nothing to post. Asserted on the id,
    // because the label's words appear in the legal documents this page links.
    expect(html).not.toContain('id="checkout-consent"');
    expect(html).not.toContain(CONSENT_LABEL);
  });

  it("does not tell the buyer to tick something that is not there", () => {
    expect(html).not.toContain(CONSENT_REQUIRED_NOTICE);
  });

  it("hands the gate the fact rather than a constant, which a render cannot show", () => {
    // **Asserted against the source, for the reason P7 recorded when it did
    // the same for `shippingSettled`.** A merch-only cart always needs an
    // address, so postage is unsettled at first render and the button is
    // disabled either way -- hard-coding `consentRequired: true` produces
    // identical markup. Mutation found exactly that.
    const source = readFileSync(new URL("../src/app/checkout/PaymentForm.tsx", import.meta.url), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
      .replace(/\/\/.*$/gm, "");
    expect(source).toContain("consentRequired: needsConsent,");
    // The stripping is checked too, so a broken regex cannot pass by emptying
    // the file -- `checkout-address.test.ts` settled this shape first.
    expect(source).toContain("export function PayButton");
  });

  it("does not hold the pay control shut waiting for it", () => {
    // The half that matters. Hiding the box while the gate still demanded it
    // would leave a buyer with a disabled button and no way to learn why --
    // strictly worse than the bug it replaced.
    expect(payDisabled({ stripeReady: true, submitting: false, consented: false, consentRequired: false })).toBe(
      false,
    );
  });

  it("still holds it shut for everything else", () => {
    // The gate did not become a no-op. Postage is still unsettled here, which
    // is P7's condition and unaffected by consent.
    expect(
      payDisabled({
        stripeReady: true,
        submitting: false,
        consented: false,
        consentRequired: false,
        shippingSettled: false,
      }),
    ).toBe(true);
    expect(
      payDisabled({ stripeReady: false, submitting: false, consented: false, consentRequired: false }),
    ).toBe(true);
    expect(
      payDisabled({ stripeReady: true, submitting: true, consented: false, consentRequired: false }),
    ).toBe(true);
  });
});

describe("which carts have consent to give", () => {
  const CERTIFICATES = ["worthless-certificate", "premium-nothing"];

  it("finds one where there is one", () => {
    expect(cartHasCertificate([{ quantity: 1, handle: "worthless-certificate" }], CERTIFICATES)).toBe(true);
  });

  it("finds none in a cart of merch", () => {
    expect(cartHasCertificate([{ quantity: 1, handle: "this-mug-cost-extra" }], CERTIFICATES)).toBe(false);
  });

  it("finds one in a cart holding both, which is the ordinary upsell", () => {
    const both = [
      { quantity: 1, handle: "worthless-certificate" },
      { quantity: 2, handle: "this-mug-cost-extra" },
    ];
    expect(cartHasCertificate(both, CERTIFICATES)).toBe(true);
    // Not the negation of the other rule: a mixed cart answers true to both,
    // which is why this is its own function rather than `!cartNeedsAddress`.
    expect(cartNeedsAddress(both, CERTIFICATES)).toBe(true);
  });

  it("treats an unidentifiable line as merch, which is the cautious direction", () => {
    // `cartNeedsAddress` already treats a null handle as something to post. A
    // line Medusa gave no handle for therefore gets an address asked for and
    // no consent demanded -- rather than the reverse, which would demand
    // consent to supply a certificate that may not be there.
    const unknown = [{ quantity: 1, handle: null }];
    expect(cartHasCertificate(unknown, CERTIFICATES)).toBe(false);
    expect(cartNeedsAddress(unknown, CERTIFICATES)).toBe(true);
  });

  it("finds none in an empty cart, which answers false to both", () => {
    expect(cartHasCertificate([], CERTIFICATES)).toBe(false);
    expect(cartNeedsAddress([], CERTIFICATES)).toBe(false);
  });
});

describe("the submit handler's own rule, which had drifted from the gate", () => {
  /**
   * **Gate D found these were the same rule written twice, and the copy was
   * stale.** `payDisabled` learned `consentRequired` in P10c; the submit
   * handler kept an unconditional `!consented`. For a cart with no
   * certificate the box is never rendered, so `consented` could never become
   * true — the button enabled, the click did nothing, and **every merch-alone
   * order was unpayable, silently**.
   *
   * It stays a separate function rather than becoming the same call, because
   * it answers a different question: `disabled` is an attribute and
   * `form.requestSubmit()` ignores it. An earlier Gate D completed a cart with
   * the box visibly unticked by exactly that route.
   */
  it("lets a merch-only cart through, which is the defect", () => {
    expect(
      paySubmitBlocked({ stripeReady: true, submitting: false, consented: false, consentRequired: false }),
    ).toBe(false);
  });

  it("still refuses a certificate cart whose box is unticked", () => {
    // The reason the handler checks at all: `form.requestSubmit()` ignores
    // `disabled`, so the visible control is not the enforcement.
    expect(paySubmitBlocked({ stripeReady: true, submitting: false, consented: false })).toBe(true);
    expect(
      paySubmitBlocked({ stripeReady: true, submitting: false, consented: false, consentRequired: true }),
    ).toBe(true);
  });

  it("agrees with the pay gate on every input, which is what drifted twice", () => {
    // The two rules answer different questions and must not disagree about
    // any of them. Asserted across every combination rather than by
    // inspection -- **and `shippingSettled` is in the sweep now**, because
    // the second drift was that `paySubmitBlocked` did not take it at all.
    for (const consented of [true, false]) {
      for (const consentRequired of [true, false]) {
        for (const shippingSettled of [true, false]) {
          const input = { stripeReady: true, submitting: false, consented, consentRequired, shippingSettled };
          const label = `${String(consented)}/${String(consentRequired)}/${String(shippingSettled)}`;
          expect(`${label}: ${String(paySubmitBlocked(input))}`).toBe(`${label}: ${String(payDisabled(input))}`);
        }
      }
    }
  });

  it("refuses a submit for a parcel with no postage settled on it", () => {
    /**
     * **The bypass, applied to the postage.** `requestSubmit()` ignores
     * `disabled`, so a merch cart could be submitted with no shipping method
     * attached: the payment session still matches the goods-only total, so
     * Stripe charges -- `capture: true` means `capture_method: "automatic"` --
     * and completion then throws at Medusa's `validate-shipping` step. The
     * buyer is charged and refunded for a parcel nobody could have posted.
     */
    expect(
      paySubmitBlocked({ stripeReady: true, submitting: false, consented: true, shippingSettled: false }),
    ).toBe(true);
  });

  it("defaults it to settled, so a certificate-only caller is unchanged", () => {
    // The same disposition `consentRequired` took: optional, defaulting to the
    // safe answer for the cart that has no parcel in it.
    expect(paySubmitBlocked({ stripeReady: true, submitting: false, consented: true })).toBe(false);
  });

  it("refuses before Stripe is ready, and while one is already in flight", () => {
    expect(paySubmitBlocked({ stripeReady: false, submitting: false, consented: true })).toBe(true);
    expect(paySubmitBlocked({ stripeReady: true, submitting: true, consented: true })).toBe(true);
  });

  it("is what the handler calls, rather than a second copy of the same words", () => {
    // The whole finding was a duplicated rule. A source assertion is the only
    // thing that stops it being duplicated again -- an event-driven test would
    // pass against a re-inlined copy.
    const source = readFileSync(new URL("../src/app/checkout/PaymentForm.tsx", import.meta.url), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(source).toMatch(/paySubmitBlocked\(\{[^}]*consentRequired: needsConsent/);
    expect(source).not.toMatch(/submitting \|\| !consented/);
    expect(source).toContain("export function PayButton");
  });
});
