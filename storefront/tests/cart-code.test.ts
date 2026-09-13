/**
 * LD-06 D5: the cart takes a code and renders the server-priced adjustment.
 *
 * These tests start at the Store API boundary, then render the real form and
 * cart page. A code sent with a browser-supplied price, a reflected refusal,
 * or an adjustment left among the merchandise would each be a different bug.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

// Static rendering has no Next app-router provider; browser tests exercise navigation.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => undefined, refresh: () => undefined }) }));

import {
  CART_CODE_NOTICES,
  CART_LABELS,
  CODE_APPLY_LABEL,
  CODE_LABEL,
  CODE_REMOVE_LABEL,
} from "../src/content/checkout";
import { createStoreFetchJson, type FetchJson, type StoreFetchInit } from "../src/lib/medusa-client";
import { applySurcharge } from "../src/lib/store-cart";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the Store request that applies a code", () => {
  it("posts only the code to the cart the server action names", async () => {
    const calls: unknown[] = [];
    const fetchJson: FetchJson = async <T,>(path: string, init?: StoreFetchInit): Promise<T> => {
      calls.push([path, init]);
      return { cart: { id: "cart_1", currency_code: "usd", total: 6, items: [] } } as T;
    };

    const cart = await applySurcharge(fetchJson, "cart/one", "BALDRICK20");

    expect(calls).toEqual([
      [
        "/store/carts/cart%2Fone/surcharge",
        { method: "POST", body: JSON.stringify({ code: "BALDRICK20" }) },
      ],
    ]);
    expect(cart).toMatchObject({ id: "cart_1", total: 6 });
  });
});

describe("a Store API refusal", () => {
  it("keeps the stable reason from the JSON response", async () => {
    vi.stubGlobal("fetch", async () => new Response(
      JSON.stringify({ reason: "unknown_code" }),
      { status: 422, headers: { "content-type": "application/json" } },
    ));
    const fetchJson = createStoreFetchJson({
      backendUrl: "http://backend.example",
      publishableKey: "pk_fixture",
    });

    await expect(applySurcharge(fetchJson, "cart_1", "NOPE")).rejects.toMatchObject({
      status: 422,
      body: { reason: "unknown_code" },
    });
  });
});

interface CartPageOptions {
  readonly reason?: string;
  readonly items?: readonly Record<string, unknown>[];
  readonly total?: number;
}

async function renderCart(options: CartPageOptions = {}): Promise<string> {
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
  }));
  vi.doMock("../src/lib/store-cart", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../src/lib/store-cart")>()),
    getCart: async () => ({
      id: "cart_1",
      currency_code: "usd",
      total: options.total ?? 6,
      items: options.items ?? [
        {
          id: "line_certificate",
          variant_id: "variant_certificate",
          quantity: 1,
          unit_price: 5,
          title: "Lousy Deal",
        },
        {
          id: "line_surcharge",
          variant_id: null,
          quantity: 1,
          unit_price: 1,
          title: "Discount (BALDRICK20)",
        },
      ],
    }),
  }));

  const { default: CartPage } = await import("../src/app/cart/page");
  return renderToStaticMarkup(await CartPage({
    searchParams: Promise.resolve(options.reason === undefined ? {} : { code_reason: options.reason }),
  }));
}

function ledgerLabels(html: string): string[] {
  return [...html.matchAll(/<dt class="ledger-label">([^<]*)/g)].map((match) => match[1] ?? "");
}

describe("the rendered cart", () => {
  it("puts the removable adjustment directly above the API total with a plus", async () => {
    const html = await renderCart();

    expect(ledgerLabels(html)).toEqual(["Lousy Deal", "Discount (BALDRICK20)", CART_LABELS.total]);
    expect(html).toContain("+$1.00");
    expect(html).toContain('value="line_surcharge"');
    expect(html).toContain(`aria-label="${CODE_REMOVE_LABEL} Discount (BALDRICK20)"`);
  });

  it("puts the code form beneath the ledger and before the payment link", async () => {
    const html = await renderCart();
    expect(html.indexOf('class="ledger"')).toBeLessThan(html.indexOf('class="code-form field'));
    expect(html.indexOf('class="code-form field')).toBeLessThan(html.indexOf('href="/checkout"'));
    expect(html).toContain(`<label for="cart-code">${CODE_LABEL}</label>`);
    expect(html).toContain('id="cart-code"');
    expect(html).toContain('name="code"');
    expect(html).toContain('maxLength="64"');
    expect(html).toContain('required=""');
    expect(html).toContain(`>${CODE_APPLY_LABEL}</button>`);
  });

  it.each(Object.entries(CART_CODE_NOTICES))("renders the fixed %s refusal without reflecting input", async (reason, notice) => {
    const html = await renderCart({ reason });
    expect(html).toContain(notice);
  });

  it("ignores an unknown query value rather than reflecting it", async () => {
    const html = await renderCart({ reason: "<script>made-up</script>" });
    expect(html).not.toContain("made-up");
  });
});
