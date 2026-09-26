/**
 * LD-11 J5's note under the cart's code field, held whole.
 *
 * **A correction to #266, from its review.** J5's test asserted the note's
 * first sentence by pattern and then checked the markup against the constant
 * itself, so the second sentence — the note's two factual claims about where
 * the amount appears and when a code can be removed — could say anything and
 * pass. Here the note is held against its literal text, its fine print, the
 * carts it belongs on, and the Terms' own sentence about codes.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CODE_NOTE } from "../src/content/checkout";
import { TERMS } from "../src/content/legal/terms";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => undefined, refresh: () => undefined }) }));

const CERTIFICATE = {
  id: "line_certificate",
  variant_id: "variant_certificate",
  product_handle: "lousy-deal",
  quantity: 1,
  unit_price: 5,
  title: "Lousy Deal",
};

async function renderCart(items: readonly Record<string, unknown>[]): Promise<string> {
  vi.resetModules();
  vi.doMock("next/server", () => ({ connection: async () => undefined }));
  vi.doMock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "cart_1" }) }) }));
  vi.doMock("../src/lib/store-session", () => ({
    CART_ID_COOKIE: "lousydeal_cart_id",
    CART_COOKIE_OPTIONS: { httpOnly: true, sameSite: "lax", path: "/", secure: true },
    requireStoreClientConfig: () => ({ backendUrl: "http://backend.example", publishableKey: "pk" }),
  }));
  vi.doMock("../src/lib/medusa-client", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../src/lib/medusa-client")>()),
    createStoreFetchJson: () => async () => ({}),
    listMerch: async () => [],
    listTiers: async () => [{ handle: "lousy-deal", title: "Lousy Deal" }],
  }));
  vi.doMock("../src/lib/store-cart", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../src/lib/store-cart")>()),
    getCart: async () => ({ id: "cart_1", currency_code: "usd", total: 5, items }),
  }));
  const { default: CartPage } = await import("../src/app/cart/page");
  return renderToStaticMarkup(await CartPage({ searchParams: Promise.resolve({}) }));
}

afterEach(() => {
  vi.resetModules();
});

describe("the note under the code field", () => {
  it("says exactly what Jev chose, both sentences", () => {
    expect(CODE_NOTE).toBe(
      "Codes here raise the total or leave it where it is; none lowers it. The amount appears as its own line above the total, removable before you pay.",
    );
  });

  it("is fine print beneath the field on a cart that has one", async () => {
    const html = await renderCart([CERTIFICATE]);
    expect(html).toContain(`<p class="fine-print"><span id="cart-code-note">${CODE_NOTE}</span></p>`);
  });

  it("is absent from an empty cart, which has no field to describe", async () => {
    const html = await renderCart([]);
    expect(html).not.toContain("cart-code-note");
    expect(html).not.toContain("cart-code");
  });

  it("claims what the Terms claim about codes, and nothing past it", () => {
    const terms = TERMS.sections.flatMap((section) => section.body).join(" ");
    // Never lowers the price.
    expect(terms).toMatch(/A discount code can raise the price and never lowers it\./);
    expect(CODE_NOTE).toMatch(/none lowers it/);
    // Its own line, with its amount.
    expect(terms).toMatch(/shown as its own line, with its amount/);
    expect(CODE_NOTE).toMatch(/The amount appears as its own line/);
    // Removable before paying.
    expect(terms).toMatch(/You can remove it on the order summary before you pay\./);
    expect(CODE_NOTE).toMatch(/removable before you pay/);
  });
});
