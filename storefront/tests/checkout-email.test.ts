/**
 * The address the § 55(1)–(2) confirmation will go to.
 *
 * Until C3b there was none. Nothing set `cart.email`, and Medusa tolerates that
 * the whole way through (`complete-cart.js:446,505`), so every order this
 * storefront could place was unaddressed — and an unaddressed order cannot be
 * confirmed on a durable medium, which is the third condition VÕS § 53(4) p 7¹
 * needs before the right of withdrawal is excluded.
 *
 * **What this file cannot reach.** `handleSubmit` runs in a browser: it needs
 * a live Stripe `confirmPayment` and a DOM to submit against, and this project
 * has neither (`vitest.config.ts` is `environment: node` and collects `.ts`
 * only). So the field is asserted off the real markup, the API call is asserted
 * against a stub, and the one link between them — that the submit path sets the
 * address before it confirms the payment — is asserted against the source,
 * which is the same instrument `legal-routes.test.ts` uses for the same reason.
 */

import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { EMAIL_HINT, EMAIL_LABEL } from "../src/content/checkout";
import type { FetchJson, StoreFetchInit } from "../src/lib/medusa-client";
import { setCartEmail } from "../src/lib/store-checkout";

// Nothing asserted below touches Stripe; these exist only so the module
// imports, exactly as in `checkout-consent.test.ts`.
vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: unknown }) => children,
  PaymentElement: () => createElement("div"),
  useStripe: () => ({}),
  useElements: () => ({}),
}));
vi.mock("@stripe/stripe-js", () => ({ loadStripe: () => Promise.resolve(null) }));

const { PayButton } = await import("../src/app/checkout/PaymentForm");

const html = renderToStaticMarkup(
  createElement(PayButton, {
    cartId: "cart_1",
    fetchJson: (async () => ({})) as never,
    countries: [{ iso_2: "ee", display_name: "Estonia" }],
  }),
);

const source = readFileSync(new URL("../src/app/checkout/PaymentForm.tsx", import.meta.url), "utf8");

describe("the email field", () => {
  it("is on the form, required, and typed as an address", () => {
    // `type="email"` and `required` are the enforcing half. Unlike the consent
    // box they are sufficient on their own: `requestSubmit()` runs constraint
    // validation, so there is no bypass of the kind that made the consent gate
    // need a second check inside `handleSubmit`.
    expect(html).toContain('id="checkout-email"');
    expect(html).toContain('type="email"');
    expect(html).toMatch(/<input[^>]*id="checkout-email"[^>]*required/);
  });

  it("ships empty, because there is nothing to remember a buyer by", () => {
    // No accounts (§12), so a prefilled address would be a guess.
    expect(html).toMatch(/<input[^>]*id="checkout-email"[^>]*value=""/);
  });

  it("is labelled, and its explanation is attached to it for a screen reader", () => {
    expect(html).toContain(EMAIL_LABEL);
    expect(html).toContain(EMAIL_HINT);
    expect(html).toMatch(/<input[^>]*aria-describedby="checkout-email-hint"/);
    expect(html).toContain('id="checkout-email-hint"');
  });

  it("does not tell the buyer a confirmation is sent, because none is", () => {
    // C3b collects the address; C9 sends the confirmation. Between the two,
    // this would be the first surface on the site to imply the § 55 duty is
    // discharged. `legal-consistency.test.ts` holds the other six to the same
    // line.
    expect(EMAIL_HINT).toMatch(/do not yet send/i);
    expect(EMAIL_HINT).not.toMatch(/\bwe send you\b|\bwe will send\b|\bwe'll send\b/i);
    expect(EMAIL_HINT).toMatch(/14-day right of withdrawal still stands/i);
  });

  it("is set on the cart before the card is charged", () => {
    // The one assertion this suite can only make against the source. If the
    // order were reversed, an address Medusa refuses would leave a charged
    // card on an order that then fails -- and no unit test in this project can
    // reach `handleSubmit` to prove otherwise.
    const setsEmail = source.indexOf("setCartEmail(fetchJson, cartId, email)");
    const confirms = source.indexOf("stripe.confirmPayment");

    expect(setsEmail).toBeGreaterThan(-1);
    expect(confirms).toBeGreaterThan(-1);
    expect(setsEmail).toBeLessThan(confirms);
  });
});

describe("setCartEmail", () => {
  /** A stub answering the one route this function uses. */
  function stub(answer: unknown): { fetchJson: FetchJson; seen: () => { path: string; body: unknown } } {
    let path = "";
    let body: unknown;
    const fetchJson = (async <T>(requested: string, init?: StoreFetchInit): Promise<T> => {
      path = requested;
      body = init?.body === undefined ? undefined : JSON.parse(String(init.body));
      return answer as T;
    }) as FetchJson;
    return { fetchJson, seen: () => ({ path, body }) };
  }

  it("posts the address to the cart and returns what Medusa answered with", () => {
    // Read back rather than echoed: the return value is Medusa's own, which is
    // what separates "Medusa accepted it" from "the request did not error".
    const { fetchJson, seen } = stub({ cart: { id: "cart_1", email: "buyer@example.test" } });

    return setCartEmail(fetchJson, "cart_1", "buyer@example.test").then((email) => {
      expect(seen().path).toBe("/store/carts/cart_1");
      expect(seen().body).toEqual({ email: "buyer@example.test" });
      expect(email).toBe("buyer@example.test");
    });
  });

  it("refuses a response that carries no address back", async () => {
    // The failure this guards is an order placed with no address at all, which
    // is the state every order was in before this row.
    await expect(setCartEmail(stub({ cart: { id: "cart_1" } }).fetchJson, "cart_1", "buyer@example.test")).rejects.toThrow(
      /did not return an email address/,
    );
    await expect(setCartEmail(stub({ cart: { id: "cart_1", email: "" } }).fetchJson, "cart_1", "x@y.test")).rejects.toThrow(
      /did not return an email address/,
    );
    await expect(setCartEmail(stub({}).fetchJson, "cart_1", "x@y.test")).rejects.toThrow(
      /did not return an email address/,
    );
  });

  it("escapes the cart id rather than splicing it into a path", () => {
    const { fetchJson, seen } = stub({ cart: { email: "a@b.test" } });

    return setCartEmail(fetchJson, "cart/../../admin", "a@b.test").then(() => {
      expect(seen().path).toBe("/store/carts/cart%2F..%2F..%2Fadmin");
    });
  });
});
