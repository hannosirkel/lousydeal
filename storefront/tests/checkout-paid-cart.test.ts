/**
 * LD-11 H2: a paid cart never renders the payment form again.
 *
 * `getCheckoutCart` never read `completed_at`, so a reload, the back-button or
 * Stripe's return to `/checkout` brought a paid cart back to a mounted
 * `PaymentForm` — and mounting it asks Medusa for a payment session, which is
 * what cancels the PaymentIntent the buyer has just paid. On a redirect the
 * browser never completed the cart at all.
 *
 * **What is asserted, and what cannot be.** A static render runs no effects,
 * so a spy on the payment-session calls would read zero whether the form
 * mounted or not; an assertion on it could not fail. The observable here is
 * the one that causes the request: whether `PaymentForm` is on the page. Its
 * noscript notice is the marker. Nothing else renders it, and it is the one
 * part of the form a static render reaches: the email field is in
 * `PayButton`, which waits for a payment collection an effect creates.
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ORDER_PLACED_HEADING,
  ORDER_SUMMARY_LINES,
  PAYMENT_NEEDS_SCRIPTING,
  PAYMENT_UNCONFIRMED_NOTICE,
} from "../src/content/checkout";
import type { CheckoutCart } from "../src/lib/store-checkout";

vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: unknown }) => children,
  PaymentElement: () => createElement("div"),
  useStripe: () => ({}),
  useElements: () => ({}),
}));
vi.mock("@stripe/stripe-js", () => ({ loadStripe: () => Promise.resolve(null) }));
vi.mock("next/server", () => ({ connection: async () => undefined }));

const unpaid: CheckoutCart = {
  id: "cart_1",
  currencyCode: "usd",
  total: 6,
  quantities: [1],
  lines: [{ handle: "lousy-deal", quantity: 1, variantId: "variant_cert", title: "Lousy Deal", variantTitle: null, unitPrice: 6 }],
  completed: false,
  email: "buyer@example.com",
  giftRecipientEmail: null,
};
const paid: CheckoutCart = { ...unpaid, completed: true };

/**
 * Renders the page with `getCheckoutCart` answering each call from `carts` in
 * turn — the page reads the cart again after completing it — and reports how
 * often `completeCheckoutCart` was asked.
 */
async function renderCheckout(options: {
  carts: readonly CheckoutCart[];
  searchParams?: Record<string, string>;
  completeFails?: boolean;
}): Promise<{ html: string; completions: string[] }> {
  vi.resetModules();
  const completions: string[] = [];
  let read = 0;
  vi.doMock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "cart_1" }) }) }));
  vi.doMock("../src/config/runtime-config", () => ({
    getRuntimeConfig: () => ({ stripe: { publishableKey: "pk_test_fixture" }, store: { open: true } }),
  }));
  vi.doMock("../src/lib/store-session", () => ({
    CART_ID_COOKIE: "lousydeal_cart_id",
    requireStoreClientConfig: () => ({ backendUrl: "http://backend.example", publishableKey: "pk" }),
  }));
  vi.doMock("../src/lib/medusa-client", () => ({
    createStoreFetchJson: () => async () => ({}),
    getDefaultRegion: async () => ({ id: "reg_1", countries: [{ iso_2: "ee", display_name: "Estonia" }] }),
    listTiers: async () => [{ handle: "lousy-deal", title: "Lousy Deal" }],
  }));
  vi.doMock("../src/lib/store-checkout", () => ({
    getCheckoutCart: async () => options.carts[Math.min(read++, options.carts.length - 1)],
    setCartCountry: async () => ({ countryCode: "ee", taxTotal: undefined }),
  }));
  vi.doMock("../src/lib/store-payment", () => ({
    completeCheckoutCart: async (_fetchJson: unknown, cartId: string) => {
      completions.push(cartId);
      if (options.completeFails === true) throw new Error("Store API proxy returned 500");
      return { orderId: "order_1" };
    },
    createPaymentCollection: async () => ({ id: "paycol_1" }),
    initiateStripePaymentSession: async () => ({ clientSecret: "pi_secret" }),
  }));

  const { default: CheckoutPage } = await import("../src/app/checkout/page");
  const html = renderToStaticMarkup(await CheckoutPage({ searchParams: Promise.resolve(options.searchParams ?? {}) }));
  return { html, completions };
}

const formIsOnThePage = (html: string) => html.includes(PAYMENT_NEEDS_SCRIPTING);

afterEach(() => {
  vi.resetModules();
});

describe("a cart that has been paid for", () => {
  it("renders the end state and not the payment form, on a reload or the back-button", async () => {
    const { html, completions } = await renderCheckout({ carts: [paid] });
    expect(html).toContain(ORDER_PLACED_HEADING);
    expect(html).toContain("buyer@example.com");
    expect(formIsOnThePage(html)).toBe(false);
    expect(completions).toEqual([]);
  });

  it("drops the § 62²(2) lines, which describe an order not yet placed", async () => {
    const { html } = await renderCheckout({ carts: [paid] });
    for (const line of ORDER_SUMMARY_LINES) expect(html).not.toContain(line);
  });

  it("names the gift's recipient and the parcel mail when the order had them", async () => {
    const withBoth: CheckoutCart = {
      ...paid,
      giftRecipientEmail: "friend@example.com",
      lines: [...paid.lines, { handle: "this-mug-cost-extra", quantity: 1, variantId: "variant_mug", title: "Mug", variantTitle: null, unitPrice: 20 }],
    };
    const { html } = await renderCheckout({ carts: [withBoth] });
    expect(html).toContain("friend@example.com");
    expect(html).toMatch(/another email says when they are posted/);
  });

  it("refuses rather than naming no address, for a cart completed around this checkout", async () => {
    await expect(renderCheckout({ carts: [{ ...paid, email: null }] })).rejects.toThrow(/no email address/);
  });
});

describe("Stripe's return after a redirecting payment method", () => {
  it("completes the cart the browser never completed, then renders the end state", async () => {
    const { html, completions } = await renderCheckout({
      carts: [unpaid, paid],
      searchParams: { redirect_status: "succeeded", payment_intent: "pi_1" },
    });
    expect(completions).toEqual(["cart_1"]);
    expect(html).toContain(ORDER_PLACED_HEADING);
    expect(formIsOnThePage(html)).toBe(false);
  });

  it("does not complete again a cart the webhook already completed", async () => {
    const { completions } = await renderCheckout({ carts: [paid], searchParams: { redirect_status: "succeeded" } });
    expect(completions).toEqual([]);
  });

  it("says the card was accepted, never back to the form, when completion throws", async () => {
    // LD-11 H3 replaced the error boundary H2 fell to: this failure is after
    // the charge, and says what the form says in the same position.
    const { html, completions } = await renderCheckout({
      carts: [unpaid],
      searchParams: { redirect_status: "succeeded" },
      completeFails: true,
    });
    expect(completions).toEqual(["cart_1"]);
    expect(html).toContain(PAYMENT_UNCONFIRMED_NOTICE);
    expect(html).not.toContain("returned 500");
    expect(formIsOnThePage(html)).toBe(false);
  });

  it("leaves a failed redirect on the form, since nothing was paid", async () => {
    const { html, completions } = await renderCheckout({ carts: [unpaid], searchParams: { redirect_status: "failed" } });
    expect(completions).toEqual([]);
    expect(formIsOnThePage(html)).toBe(true);
    expect(html).not.toContain(ORDER_PLACED_HEADING);
  });
});

describe("a cart that has not been paid for", () => {
  it("still renders the payment form, so the markers above can tell the two apart", async () => {
    const { html } = await renderCheckout({ carts: [unpaid] });
    expect(formIsOnThePage(html)).toBe(true);
    expect(html).not.toContain(ORDER_PLACED_HEADING);
  });
});
