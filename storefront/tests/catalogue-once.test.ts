/**
 * LD-11: the cart page reads the catalogue once.
 *
 * J3's and J4's reviews recorded that the cart page asked the Store API for
 * the product list twice, once through `listMerch` and once through
 * `listTiers`, each also re-reading the region: four requests where two
 * answer. `listCatalogue` reads once and splits the list the way the two
 * functions always did. The real cart page is rendered here with only the
 * Store API stubbed, and every request it makes is counted.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// Static rendering has no Next app-router provider; browser tests exercise navigation.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => undefined, refresh: () => undefined }) }));

import { listCatalogue, listMerch, listTiers, type FetchJson, type StoreProduct } from "../src/lib/medusa-client";

const REGION = { id: "reg_1", currency_code: "usd", countries: [] };

const PRODUCTS: readonly StoreProduct[] = [
  {
    id: "prod_deal",
    handle: "lousy-deal",
    title: "Lousy Deal",
    variants: [{ id: "variant_certificate", calculated_price: { calculated_amount: 5, currency_code: "usd" } }],
  },
  {
    id: "prod_mug",
    handle: "this-mug-cost-extra",
    title: "This Mug Cost Extra",
    subtitle: "Mug",
    variants: [{
      id: "var_mug",
      title: "11 oz",
      calculated_price: { calculated_amount: 15, currency_code: "usd" },
      metadata: { printful_variant_id: "1" },
    }],
  },
] as readonly StoreProduct[];

function countingStoreApi(): { fetchJson: FetchJson; requested: string[] } {
  const requested: string[] = [];
  const fetchJson = (async <T>(path: string): Promise<T> => {
    requested.push(path.split("?")[0] ?? path);
    if (path === "/store/regions") return { regions: [REGION] } as T;
    if (path.startsWith("/store/products?")) return { products: PRODUCTS } as T;
    throw new Error(`stub has no route for ${path}`);
  }) as FetchJson;
  return { fetchJson, requested };
}

describe("listCatalogue", () => {
  it("splits one read exactly as listTiers and listMerch split theirs", async () => {
    const catalogue = await listCatalogue(countingStoreApi().fetchJson);
    expect(catalogue.tiers).toEqual(await listTiers(countingStoreApi().fetchJson));
    expect(catalogue.merch).toEqual(await listMerch(countingStoreApi().fetchJson));
    expect(catalogue.tiers.map((tier) => tier.handle)).toEqual(["lousy-deal"]);
    expect(catalogue.merch.map((item) => item.handle)).toEqual(["this-mug-cost-extra"]);
  });

  it("asks for the region and the product list once each", async () => {
    const { fetchJson, requested } = countingStoreApi();
    await listCatalogue(fetchJson);
    expect(requested).toEqual(["/store/regions", "/store/products"]);
  });
});

describe("the cart page", () => {
  it("reads the catalogue once while rendering the upsell and the certificate check", async () => {
    const { fetchJson, requested } = countingStoreApi();
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
      createStoreFetchJson: () => fetchJson,
    }));
    vi.doMock("../src/lib/store-cart", async (importOriginal) => ({
      ...(await importOriginal<typeof import("../src/lib/store-cart")>()),
      getCart: async () => ({
        id: "cart_1",
        currency_code: "usd",
        total: 5,
        items: [{ id: "line_1", variant_id: "variant_certificate", product_handle: "lousy-deal", quantity: 1, unit_price: 5, title: "Lousy Deal" }],
      }),
    }));

    const { default: CartPage } = await import("../src/app/cart/page");
    const html = renderToStaticMarkup(await CartPage({ searchParams: Promise.resolve({}) }));

    // The page used both halves: the mug is offered, and the certificate was
    // recognised, so the pay link stands.
    expect(html).toContain("This Mug Cost Extra");
    expect(html).toContain('href="/checkout"');
    expect(requested.filter((path) => path === "/store/products")).toHaveLength(1);
    expect(requested.filter((path) => path === "/store/regions")).toHaveLength(1);
  });
});
