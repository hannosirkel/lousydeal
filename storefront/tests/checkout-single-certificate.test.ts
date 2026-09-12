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
  CART_NEEDS_CERTIFICATE_NOTICE,
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

/**
 * Renders the checkout page for a cart holding these lines.
 *
 * **LD-04 P6a made the cart's shape part of the question.** The page used to
 * ask only "how many lines, of what quantity"; it now asks which of them is a
 * certificate, because a cart may hold a mug beside one. A line is given as
 * `[handle, quantity]`, and `null` is a line Medusa gave no handle for.
 */
async function renderCheckout(options: {
  lines?: ReadonlyArray<readonly [string | null, number]>;
  cartId?: string | undefined;
}): Promise<string> {
  vi.resetModules();
  vi.doMock("next/headers", () => ({
    cookies: async () => ({
      get: () => (options.cartId === undefined ? undefined : { value: options.cartId }),
    }),
  }));
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
    // P6a: the page asks Medusa which handles are certificates rather than
    // holding a second copy of the three the backend freezes.
    listTiers: async () => [
      { handle: "lousy-deal", title: "Lousy Deal" },
      { handle: "lousy-deal-plus", title: "Lousy Deal Plus" },
      { handle: "lousy-deal-pro", title: "Lousy Deal Pro" },
    ],
  }));
  vi.doMock("../src/lib/store-checkout", () => ({
    getCheckoutCart: async () => ({
      id: options.cartId ?? "cart_1",
      currencyCode: "usd",
      total: 25,
      quantities: (options.lines ?? []).map(([, quantity]) => quantity),
      lines: (options.lines ?? []).map(([handle, quantity], index) => ({
        handle,
        quantity,
        variantId: `variant_${String(index)}`,
        variantTitle: null,
        title: handle ?? "Cart item",
        unitPrice: 5,
      })),
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
  it("offers the pay control for one certificate", async () => {
    const html = await renderCheckout({ cartId: "cart_1", lines: [["lousy-deal", 1]] });

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

  it("offers it for a certificate with merch beside it, which is the upsell §7 asks for", async () => {
    // **The state that could not be paid for at all before LD-04's P6a.**
    // `CART_NOT_SINGLE_NOTICE` took the pay control away from any cart that
    // was not exactly one line, so adding a mug removed the pay button.
    const html = await renderCheckout({
      cartId: "cart_1",
      lines: [["lousy-deal", 1], ["this-mug-cost-extra", 2]],
    });

    expect(html).toContain(PAYMENT_NEEDS_SCRIPTING);
    expect(html).not.toContain(CART_NOT_SINGLE_NOTICE);
  });

  it("refuses merch with no certificate at all, and says to add one", async () => {
    // **Inverted: merch is an upsell.** And the refusal has to say the right
    // thing -- "choose the one you want" is advice for a cart with two
    // certificates in it, not for one with none.
    const html = await renderCheckout({ cartId: "cart_1", lines: [["this-mug-cost-extra", 1]] });
    expect(html).not.toContain(PAYMENT_NEEDS_SCRIPTING);
    expect(html).toContain(CART_NEEDS_CERTIFICATE_NOTICE);
    expect(html).not.toContain(CART_NOT_SINGLE_NOTICE);
  });
});

describe("the checkout, for a cart it cannot certify", () => {
  // Each case is the same refusal reached a different way. They are separate
  // so a regression says which one came back.
  //
  // **The expected notice is part of each case since 2026-09-09.** There are
  // two ways to be unpayable and two different things to do about them: a cart
  // with two certificates needs one taken out, and a cart with none needs one
  // put in. Telling the second buyer to "choose the one you want" is telling
  // them to fix the wrong thing.
  const refused: [string, ReadonlyArray<readonly [string | null, number]>, string][] = [
    ["two certificates, from two tiers", [["lousy-deal", 1], ["lousy-deal-pro", 1]], CART_NOT_SINGLE_NOTICE],
    ["one line of two, from the same tier twice", [["lousy-deal", 2]], CART_NOT_SINGLE_NOTICE],
    [
      "two certificates with merch beside them",
      [["lousy-deal", 1], ["lousy-deal-pro", 1], ["this-mug-cost-extra", 1]],
      CART_NOT_SINGLE_NOTICE,
    ],
    ["a line whose quantity the API did not give", [["lousy-deal", Number.NaN]], CART_NOT_SINGLE_NOTICE],
    [
      "a merch line whose quantity the API did not give",
      [["this-mug-cost-extra", Number.NaN]],
      CART_NEEDS_CERTIFICATE_NOTICE,
    ],
    ["merch alone, which is an upsell and not an order", [["this-mug-cost-extra", 1]], CART_NEEDS_CERTIFICATE_NOTICE],
  ];

  it.each(refused)("refuses to take money for %s", async (_case, lines, notice) => {
    const html = await renderCheckout({ cartId: "cart_1", lines });

    expect(html).toContain(notice);
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
    const html = await renderCheckout({
      cartId: "cart_1",
      lines: [["lousy-deal", 1], ["lousy-deal-pro", 1]],
    });

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
