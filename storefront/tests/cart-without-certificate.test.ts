/**
 * LD-11 J3: a cart holding printed things and no certificate says, at the
 * cart, what the checkout would say a page later.
 *
 * G1's finding 2: `CART_NEEDS_CERTIFICATE_NOTICE` was rendered by the checkout
 * alone, so a visitor who added a sticker was offered `PROCEED TO PAYMENT` and
 * told only after pressing it that the printed things go with a certificate.
 * The real cart page is rendered here, at the Store API boundary, for both
 * shapes: the notice and the way on must appear for one and not the other.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// Static rendering has no Next app-router provider; browser tests exercise navigation.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => undefined, refresh: () => undefined }) }));

import { CART_NEEDS_CERTIFICATE_NOTICE, CHECKOUT_LABEL, RETURN_LABEL } from "../src/content/checkout";

const CERTIFICATE = {
  id: "line_certificate",
  variant_id: "variant_certificate",
  product_handle: "lousy-deal",
  quantity: 1,
  unit_price: 5,
  title: "Lousy Deal",
};

const MUG = {
  id: "line_mug",
  variant_id: "var_mug",
  product_handle: "this-mug-cost-extra",
  quantity: 1,
  unit_price: 15,
  title: "This Mug Cost Extra",
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
    listTiers: async () => [
      { id: "prod_deal", handle: "lousy-deal", title: "Lousy Deal", variantId: "variant_certificate", amount: 5, currencyCode: "usd" },
    ],
  }));
  vi.doMock("../src/lib/store-cart", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../src/lib/store-cart")>()),
    getCart: async () => ({ id: "cart_1", currency_code: "usd", total: 20, items }),
  }));

  const { default: CartPage } = await import("../src/app/cart/page");
  return renderToStaticMarkup(await CartPage({ searchParams: Promise.resolve({}) }));
}

describe("a cart holding printed things and no certificate", () => {
  it("says what the checkout says, beneath the ledger and before the controls", async () => {
    const html = await renderCart([MUG]);
    const notice = html.indexOf(`<p class="notice">${CART_NEEDS_CERTIFICATE_NOTICE}</p>`);
    expect(notice).toBeGreaterThan(html.indexOf('class="ledger"'));
    expect(notice).toBeLessThan(html.indexOf('class="cart-code-controls"'));
  });

  it("offers no way to the payment page it would be refused at, and a way to the certificates instead", async () => {
    const html = await renderCart([MUG]);
    expect(html).not.toContain('href="/checkout"');
    expect(html).not.toContain(`>${CHECKOUT_LABEL}</a>`);
    expect(html).toContain(`<a class="button is-secondary" href="/">${RETURN_LABEL}</a>`);
  });
});

describe("a cart holding a certificate", () => {
  it("carries no such notice, with or without printed things beside it", async () => {
    for (const items of [[CERTIFICATE], [CERTIFICATE, MUG]]) {
      const html = await renderCart(items);
      expect(html).not.toContain(CART_NEEDS_CERTIFICATE_NOTICE);
    }
  });

  it("keeps the way to payment and does not send the buyer back to the purchase order", async () => {
    const html = await renderCart([CERTIFICATE, MUG]);
    expect(html).toContain(`<a class="button is-primary" href="/checkout">${CHECKOUT_LABEL}</a>`);
    expect(html).not.toContain(`>${RETURN_LABEL}</a>`);
  });
});
