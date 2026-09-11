/**
 * LD-06 D3: the storefront's classifiers learn the surcharge, and the payment
 * authorisation shows it.
 *
 * Constraint 6: a surcharge is a line with no variant, and nothing else is.
 * The public line-item routes let a visitor write metadata onto any line, so
 * metadata cannot be the test; no public write can produce a variant-less
 * line, so `variant_id === null` can. The same routes let a visitor change a
 * surcharge's quantity, which is why the payability rule refuses anything but
 * one line of one rather than print `+$1.00` beside a total that rose by two.
 *
 * The page half renders `CheckoutPage` itself, as `checkout-single-certificate.test.ts`
 * does and for the reason it gives: a rule asserted only where it is defined
 * is a rule guarded nowhere.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CART_LABELS,
  CART_NEEDS_CERTIFICATE_NOTICE,
  CART_NOT_SINGLE_NOTICE,
  CART_SURCHARGE_NOTICE,
  PAYMENT_NEEDS_SCRIPTING,
} from "../src/content/checkout";
import { cartNeedsAddress, cartRefusedForSurcharge, isPayableCart, type CartLine } from "../src/lib/checkout-rules";
import type { FetchJson } from "../src/lib/medusa-client";
import { getCheckoutCart } from "../src/lib/store-checkout";
import { isSurchargeLine, SURCHARGE_INTERNAL_TYPE, surchargeLabel, surchargeValue } from "../src/lib/surcharge";

const TIERS = ["lousy-deal", "lousy-deal-plus", "lousy-deal-pro"];

const certificate = (quantity = 1): CartLine => ({ quantity, handle: "lousy-deal", variantId: "variant_cert" });
const mug = (quantity = 1): CartLine => ({ quantity, handle: "this-mug-cost-extra", variantId: "variant_mug" });
const surcharge = (quantity = 1): CartLine => ({ quantity, handle: null, variantId: null });

describe("the classifier", () => {
  it("reads an explicit null variant as the surcharge, and nothing else", () => {
    expect(isSurchargeLine({ variantId: null })).toBe(true);
    expect(isSurchargeLine({ variantId: "variant_1" })).toBe(false);
    // Absent and `undefined` both mean "not known", which keeps today's
    // reading for every caller that never learned the field.
    expect(isSurchargeLine({})).toBe(false);
    expect(isSurchargeLine({ variantId: undefined })).toBe(false);
  });

  it("agrees with the backend on the metadata's type name, since there is no shared package", () => {
    const backend = readFileSync(
      fileURLToPath(new URL("../../backend/src/commerce/surcharge.ts", import.meta.url)),
      "utf8",
    );
    const declared = /export const SURCHARGE_INTERNAL_TYPE = "([^"]+)"/.exec(backend)?.[1];
    expect(declared).toBeDefined();
    expect(SURCHARGE_INTERNAL_TYPE).toBe(declared);
  });
});

describe("the adjustment row's words", () => {
  it("takes its label from the title the server wrote, not from metadata a visitor can rewrite", () => {
    // `POST /store/carts/:id/line-items/:line_id` accepts `quantity` and
    // `metadata` and nothing else, so `metadata.code` is whatever the visitor
    // last put there and the title is whatever D1 priced.
    const line = { title: "Discount (BALDRICK20)", metadata: { code: "<b>FREE MONEY</b>" } };
    expect(surchargeLabel(line)).toBe("Discount (BALDRICK20)");
  });

  it("falls back to the row's own name where no title came back, rather than to metadata", () => {
    const untitled = { title: null, metadata: { code: "SAVE10" } };
    expect(surchargeLabel(untitled)).toBe("Discount");
    expect(surchargeLabel({ title: "  " })).toBe("Discount");
    expect(surchargeLabel({})).toBe("Discount");
  });

  it("prints the figure with a plus, formatted and not computed", () => {
    expect(surchargeValue(1, "usd")).toBe("+$1.00");
    expect(surchargeValue(0, "usd")).toBe("+$0.00");
    expect(surchargeValue(1234.5, "usd")).toBe("+$1,234.50");
  });

  it("refuses a negative or unreadable figure: no code produces the first, and formatMoney refuses the second", () => {
    expect(() => surchargeValue(-1, "usd")).toThrow(RangeError);
    expect(() => surchargeValue(Number.NaN, "usd")).toThrow();
  });
});

describe("cartNeedsAddress", () => {
  it("asks for nothing for a certificate with its surcharge", () => {
    // A surcharge has no handle, and the old reading of "no handle" was "a
    // thing in a box". An ordinary certificate with a code would have been
    // asked for a postcode and a Printful quote that never arrives.
    expect(cartNeedsAddress([certificate(), surcharge()], TIERS)).toBe(false);
  });

  it("still asks for one when a mug is there", () => {
    expect(cartNeedsAddress([certificate(), surcharge(), mug()], TIERS)).toBe(true);
  });

  it("still asks for one for a line whose variant is not known", () => {
    // `{ quantity, handle }` alone is the shape every older caller passes,
    // and it must keep meaning what it meant.
    expect(cartNeedsAddress([{ quantity: 1, handle: null }], TIERS)).toBe(true);
  });
});

describe("isPayableCart", () => {
  it("accepts a certificate with one surcharge of one, with or without merch", () => {
    expect(isPayableCart([certificate(), surcharge()], TIERS)).toBe(true);
    expect(isPayableCart([certificate(), surcharge(), mug(3)], TIERS)).toBe(true);
  });

  it("refuses two surcharge lines", () => {
    expect(isPayableCart([certificate(), surcharge(), surcharge()], TIERS)).toBe(false);
  });

  it("refuses a surcharge of quantity two", () => {
    // The public update route can set it. `+$1.00` beside a total that rose
    // by two is the silent adjustment §23 forbids.
    expect(isPayableCart([certificate(), surcharge(2)], TIERS)).toBe(false);
  });

  it("still refuses a surcharge with no certificate, as it refuses a mug alone", () => {
    expect(isPayableCart([surcharge()], TIERS)).toBe(false);
  });
});

describe("cartRefusedForSurcharge", () => {
  it("names the surcharge as the reason only when nothing else is wrong", () => {
    expect(cartRefusedForSurcharge([certificate(), surcharge(), surcharge()], TIERS)).toBe(true);
    expect(cartRefusedForSurcharge([certificate(), surcharge(2), mug()], TIERS)).toBe(true);
    expect(cartRefusedForSurcharge([certificate(), surcharge()], TIERS)).toBe(false);
    // Two certificates and two surcharges: the certificate is the thing to
    // fix first, and the existing notice says how.
    expect(cartRefusedForSurcharge([certificate(2), surcharge(), surcharge()], TIERS)).toBe(false);
    expect(cartRefusedForSurcharge([surcharge(), surcharge()], TIERS)).toBe(false);
  });
});

describe("getCheckoutCart", () => {
  const answer = (items: unknown): FetchJson =>
    (async <T,>(): Promise<T> => ({ cart: { id: "cart_code", currency_code: "usd", total: 6, items } }) as T) as FetchJson;

  it("reads the surcharge line as the Store API returns it", async () => {
    // The shape D4 writes and `defaultStoreCartFields` returns: `variant_id`
    // null and not absent, D1's title, `unit_price` in major units.
    const { lines } = await getCheckoutCart(
      answer([
        {
          id: "li_1",
          quantity: 1,
          product_handle: "lousy-deal",
          variant_id: "variant_cert",
          variant_title: "Standard",
          title: "Lousy Deal",
          unit_price: 5,
        },
        {
          id: "li_2",
          quantity: 1,
          product_handle: null,
          variant_id: null,
          title: "Discount (BALDRICK20)",
          unit_price: 1,
          metadata: { internal_type: SURCHARGE_INTERNAL_TYPE, code: "BALDRICK20", base_amount_major: 5, percentage: 20 },
        },
      ]),
      "cart_code",
    );

    expect(lines).toEqual([
      {
        quantity: 1,
        handle: "lousy-deal",
        variantId: "variant_cert",
        variantTitle: "Standard",
        title: "Lousy Deal",
        unitPrice: 5,
      },
      {
        quantity: 1,
        handle: null,
        variantId: null,
        variantTitle: null,
        title: "Discount (BALDRICK20)",
        unitPrice: 1,
      },
    ]);
    expect(lines.filter(isSurchargeLine)).toHaveLength(1);
  });

  it("keeps an absent variant as not known, and an unreadable price as NaN rather than a figure", async () => {
    const { lines } = await getCheckoutCart(answer([{ id: "li_1", quantity: 1, product_handle: "lousy-deal" }]), "cart_code");
    expect(lines[0]?.variantId).toBeUndefined();
    expect(lines[0]?.title).toBeNull();
    expect(Number.isNaN(lines[0]?.unitPrice)).toBe(true);
    expect(isSurchargeLine(lines[0] ?? {})).toBe(false);
  });
});

// Nothing asserted below touches Stripe; these exist only so `PaymentForm`
// imports, exactly as in `checkout-single-certificate.test.ts`.
vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: unknown }) => children,
  PaymentElement: () => createElement("div"),
  useStripe: () => ({}),
  useElements: () => ({}),
}));
vi.mock("@stripe/stripe-js", () => ({ loadStripe: () => Promise.resolve(null) }));
vi.mock("next/server", () => ({ connection: async () => undefined }));

interface RenderedLine {
  readonly handle: string | null;
  readonly quantity: number;
  readonly variantId?: string | null;
  readonly variantTitle?: string | null;
  readonly title?: string | null;
  readonly unitPrice?: number;
}

/** Renders the checkout page for a cart holding these lines, the way `checkout-single-certificate.test.ts` does. */
async function renderCheckout(lines: readonly RenderedLine[], total = 6): Promise<string> {
  vi.resetModules();
  vi.doMock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "cart_1" }) }) }));
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
    listTiers: async () => TIERS.map((handle) => ({ handle, title: handle })),
  }));
  vi.doMock("../src/lib/store-checkout", () => ({
    getCheckoutCart: async () => ({
      id: "cart_1",
      currencyCode: "usd",
      total,
      quantities: lines.map((line) => line.quantity),
      lines: lines.map((line) => ({ title: null, variantTitle: null, unitPrice: Number.NaN, ...line })),
    }),
  }));

  const { default: CheckoutPage } = await import("../src/app/checkout/page");
  return renderToStaticMarkup(await CheckoutPage());
}

/** The ledger's labels, in the order the page set them. */
function ledgerLabels(html: string): string[] {
  return [...html.matchAll(/<dt class="ledger-label">([^<]*)</g)].map((match) => match[1] ?? "");
}

afterEach(() => {
  vi.resetModules();
});

const PRICED_SURCHARGE: RenderedLine = {
  ...surcharge(),
  title: "Discount (BALDRICK20)",
  unitPrice: 1,
};

describe("the authorisation, for a cart carrying a surcharge", () => {
  it("shows the adjustment row directly above the total, with a plus", async () => {
    const html = await renderCheckout([{ ...certificate(), title: "Lousy Deal", unitPrice: 5 }, PRICED_SURCHARGE]);

    expect(html).toContain(PAYMENT_NEEDS_SCRIPTING);
    expect(ledgerLabels(html)).toEqual(["Lousy Deal", "Discount (BALDRICK20)", CART_LABELS.total]);
    expect(html).toContain("+$1.00");
    expect(html).toContain("$6.00");
  });

  it("shows no such row for a cart without one", async () => {
    const html = await renderCheckout([{ ...certificate(), title: "Lousy Deal", unitPrice: 5 }], 5);

    expect(ledgerLabels(html)).toEqual(["Lousy Deal", CART_LABELS.total]);
    expect(html).not.toContain("+$");
    expect(html).not.toContain("Discount");
  });

  it("lists every ordinary cart line before the adjustment, postage and total", async () => {
    const html = await renderCheckout(
      [
        { ...mug(), title: "Original Purchase Receipt", variantTitle: "L", unitPrice: 32 },
        { ...certificate(), title: "Lousy Deal", variantTitle: "Standard", unitPrice: 5 },
        { quantity: 2, handle: "anything-added-later", variantId: "variant_future", title: "Future merch", variantTitle: "Blue", unitPrice: 4.5 },
        PRICED_SURCHARGE,
      ],
      53.47,
    );

    expect(ledgerLabels(html)).toEqual([
      "Original Purchase Receipt — L",
      "Lousy Deal — Standard",
      "Future merch — Blue",
      "Discount (BALDRICK20)",
      "Postage",
      CART_LABELS.total,
    ]);
    expect(html).toContain("$32.00");
    expect(html).toContain("$5.00");
    expect(html).toContain("2 × $4.50");
    expect(html).toContain("+$1.00");
  });

  it("refuses a doubled surcharge with its own notice, and prints no figure for it", async () => {
    // The two older notices say to choose or add a certificate, which is the
    // wrong fix here. And the row is not drawn on the refused page: nothing
    // has proved the line's quantity is one, so `unit_price` is not its
    // figure.
    const html = await renderCheckout(
      [{ ...certificate(), title: "Lousy Deal", unitPrice: 5 }, PRICED_SURCHARGE, PRICED_SURCHARGE],
      7,
    );

    expect(html).toContain(CART_SURCHARGE_NOTICE);
    expect(html).not.toContain(CART_NOT_SINGLE_NOTICE);
    expect(html).not.toContain(CART_NEEDS_CERTIFICATE_NOTICE);
    expect(html).not.toContain(PAYMENT_NEEDS_SCRIPTING);
    expect(ledgerLabels(html)).toEqual([CART_LABELS.total]);
    expect(html).not.toContain("+$");
  });

  it("refuses a surcharge of quantity two the same way", async () => {
    const html = await renderCheckout([{ ...certificate(), title: "Lousy Deal", unitPrice: 5 }, { ...PRICED_SURCHARGE, quantity: 2 }], 7);

    expect(html).toContain(CART_SURCHARGE_NOTICE);
    expect(html).not.toContain(PAYMENT_NEEDS_SCRIPTING);
  });

  it("keeps the certificate's own notice when that is what is wrong", async () => {
    const html = await renderCheckout([certificate(2), PRICED_SURCHARGE, PRICED_SURCHARGE], 11);

    expect(html).toContain(CART_NOT_SINGLE_NOTICE);
    expect(html).not.toContain(CART_SURCHARGE_NOTICE);
  });
});

describe("the third notice", () => {
  it("says to return and remove the extra, in the register every other notice keeps", () => {
    expect(CART_SURCHARGE_NOTICE).toMatch(/return to the order summary/i);
    expect(CART_SURCHARGE_NOTICE).toMatch(/remove/i);
    expect(CART_SURCHARGE_NOTICE).not.toContain("!");
    // No figure: the notice states the rule, and the total is the row above.
    expect(CART_SURCHARGE_NOTICE).not.toMatch(/[$€£]\s?\d/);
  });
});
