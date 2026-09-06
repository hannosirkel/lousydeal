/**
 * The checkout refuses to take money for an order it cannot certify.
 *
 * **It renders the real page**, for the reason `checkout-consent.test.ts`
 * gives at its own head: V6b first declared the pay gate's rule inside its test
 * and asserted that, and Gate D then deleted the gate from the component with
 * every test still green. A rule asserted only where it is defined is a rule
 * guarded nowhere, so what follows drives `CheckoutPage` itself and looks at
 * the markup.
 *
 * §16 gives a deal one `order_id` and no line reference, so an order for two
 * things has no single tier and no single price to put on a certificate. C2's
 * subscriber issues nothing for such an order rather than print a transaction
 * that did not happen — and an order that takes money and yields no
 * certificate is the worst outcome available, so the page must not offer to
 * take it.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CART_EMPTY_NOTICE,
  CART_LINK_LABEL,
  CART_NOT_SINGLE_NOTICE,
  ORDER_SUMMARY_LINES,
  PAYMENT_NEEDS_SCRIPTING,
} from "../src/content/checkout";

// Nothing asserted below touches Stripe; these exist only so `PaymentForm`
// imports, exactly as in `checkout-consent.test.ts`.
vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: unknown }) => children,
  PaymentElement: () => createElement("div"),
  useStripe: () => ({}),
  useElements: () => ({}),
}));
vi.mock("@stripe/stripe-js", () => ({ loadStripe: () => Promise.resolve(null) }));
vi.mock("next/server", () => ({ connection: async () => undefined }));

/** Renders the checkout page for a cart whose lines have these quantities. */
async function renderCheckout(options: {
  quantities?: readonly number[];
  cartId?: string | undefined;
}): Promise<string> {
  vi.resetModules();
  vi.doMock("next/headers", () => ({
    cookies: async () => ({
      get: () => (options.cartId === undefined ? undefined : { value: options.cartId }),
    }),
  }));
  vi.doMock("../src/config/runtime-config", () => ({
    getRuntimeConfig: () => ({ stripe: { publishableKey: "pk_test_fixture" } }),
  }));
  vi.doMock("../src/lib/store-session", () => ({
    CART_ID_COOKIE: "lousydeal_cart_id",
    requireStoreClientConfig: () => ({ backendUrl: "http://backend.example", publishableKey: "pk" }),
  }));
  vi.doMock("../src/lib/medusa-client", () => ({
    createStoreFetchJson: () => async () => ({}),
    getDefaultRegion: async () => ({ id: "reg_1", countries: [{ iso_2: "ee", display_name: "Estonia" }] }),
  }));
  vi.doMock("../src/lib/store-checkout", () => ({
    getCheckoutCart: async () => ({
      id: options.cartId ?? "cart_1",
      currencyCode: "usd",
      total: 25,
      quantities: options.quantities ?? [],
    }),
    setCartCountry: async () => ({ countryCode: "ee", taxTotal: undefined }),
  }));

  const { default: CheckoutPage } = await import("../src/app/checkout/page");
  return renderToStaticMarkup(await CheckoutPage());
}

afterEach(() => {
  vi.resetModules();
});

describe("the checkout, for a cart it can certify", () => {
  it("offers the pay control for one line of one", async () => {
    const html = await renderCheckout({ cartId: "cart_1", quantities: [1] });

    // `PaymentForm`'s own noscript notice is the marker: it is rendered by
    // that component and by nothing else, so its presence means the component
    // is on the page. The consent box itself is not in this markup -- the form
    // shows "Preparing payment" until Stripe loads in a browser, which no
    // static render does.
    expect(html).toContain(PAYMENT_NEEDS_SCRIPTING);
    expect(html).not.toContain(CART_NOT_SINGLE_NOTICE);

    // § 62-2(2)'s information belongs immediately before the order is
    // transmitted, so it appears on the document that can transmit one.
    for (const line of ORDER_SUMMARY_LINES) expect(html).toContain(line);
  });
});

describe("the checkout, for a cart it cannot certify", () => {
  // Each case is the same refusal reached a different way. They are separate
  // so a regression says which one came back.
  const refused: [string, readonly number[]][] = [
    ["two lines, from two tiers", [1, 1]],
    ["one line of two, from the same tier twice", [2]],
    ["three lines", [1, 1, 1]],
    ["a line whose quantity the API did not give", [Number.NaN]],
  ];

  it.each(refused)("refuses to take money for %s", async (_case, quantities) => {
    const html = await renderCheckout({ cartId: "cart_1", quantities });

    expect(html).toContain(CART_NOT_SINGLE_NOTICE);
    // The whole point: no payment form on the page means no way to pay.
    expect(html).not.toContain(PAYMENT_NEEDS_SCRIPTING);
    // And § 62-2(2)'s pre-order information is not shown on a document that
    // cannot transmit an order -- it would be describing a purchase this page
    // is refusing to take.
    for (const line of ORDER_SUMMARY_LINES) expect(html).not.toContain(line);
  });

  it("still shows the total, and a way back to the document that can fix it", async () => {
    // The buyer is owed the figure they were looking at. Hiding it would make
    // the refusal harder to understand, not easier -- and a refusal with no
    // way onward is the Gate E finding V6a had to fix on the empty cart.
    const html = await renderCheckout({ cartId: "cart_1", quantities: [1, 1] });

    expect(html).toContain("$25.00");
    expect(html).toContain(CART_LINK_LABEL);
    expect(html).toContain('href="/cart"');
  });

  it("keeps the empty-cart document for a cart with no lines", async () => {
    // Zero lines is not "the wrong number of certificates", it is no cart --
    // and that state already had its own document and its own way onward.
    const html = await renderCheckout({ cartId: undefined });

    expect(html).toContain(CART_EMPTY_NOTICE);
    expect(html).not.toContain(CART_NOT_SINGLE_NOTICE);
  });
});
