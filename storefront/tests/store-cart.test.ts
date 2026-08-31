/**
 * The row's verification: the three tiers and the resulting cart line,
 * against a stubbed store API -- never a mocked global `fetch`. The stub
 * below is a plain `FetchJson`, the same shape `src/lib/medusa-client.ts`
 * and `src/lib/store-cart.ts` take as an argument, so this test exercises
 * the real data-layer functions end to end and never reaches into a module
 * global.
 *
 * This file also closes the trap `backend/tests/commerce-product-seed.test.ts`
 * names against itself: that file's price-literal scan covers only
 * `backend/src/`, and its own comment says storefront is "the one that will
 * matter" once T9 lands. The second `describe` below is that scan, mirrored
 * against `storefront/src/`.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

import { listTiers, type FetchJson, type StoreProduct, type StoreRegion } from "../src/lib/medusa-client";
import { addLineToCart, createCart } from "../src/lib/store-cart";

/**
 * Fixture region and products, shaped like the real Store API response --
 * field names taken from this repository's own `StoreCalculatedPrice`,
 * `StoreProduct` and `StoreProductVariant` shapes (`src/lib/medusa-client.ts:116-128`),
 * which is where `calculated_price`, `calculated_amount` and `currency_code`
 * are established from the installed package; `products/query-config.js`
 * contains none of those three names and is not the citation for this shape.
 * The amounts here are what a stub has to answer with, not a price this
 * repository asserts: see the price-literal scan below for what that
 * distinction actually guards.
 */
const FIXTURE_REGION: StoreRegion = { id: "reg_fixture", currency_code: "usd" };

const FIXTURE_PRODUCTS: readonly StoreProduct[] = [
  {
    id: "prod_1",
    handle: "lousy-deal",
    title: "Lousy Deal",
    variants: [{ id: "variant_1", calculated_price: { calculated_amount: 500, currency_code: "usd" } }],
  },
  {
    id: "prod_2",
    handle: "lousy-deal-plus",
    title: "Lousy Deal Plus",
    variants: [{ id: "variant_2", calculated_price: { calculated_amount: 1000, currency_code: "usd" } }],
  },
  {
    id: "prod_3",
    handle: "lousy-deal-pro",
    title: "Lousy Deal Pro",
    variants: [{ id: "variant_3", calculated_price: { calculated_amount: 2500, currency_code: "usd" } }],
  },
];

/** A `FetchJson` that answers the store's own JSON shapes for the paths this row calls, and nothing else. */
function stubStoreApi(products: readonly StoreProduct[] = FIXTURE_PRODUCTS): FetchJson {
  return (async <T>(path: string, init?: RequestInit): Promise<T> => {
    if (path === "/store/regions") {
      return { regions: [FIXTURE_REGION] } as T;
    }
    if (path.startsWith("/store/products?")) {
      return { products } as T;
    }
    if (path === "/store/carts" && init?.method === "POST") {
      return { cart: { id: "cart_fixture", currency_code: "usd", items: [] } } as T;
    }
    if (path === "/store/carts/cart_fixture/line-items" && init?.method === "POST") {
      const body = JSON.parse(String(init.body)) as { variant_id: string; quantity: number };
      return {
        cart: {
          id: "cart_fixture",
          currency_code: "usd",
          items: [{ id: "item_fixture", variant_id: body.variant_id, quantity: body.quantity, unit_price: 999 }],
        },
      } as T;
    }
    throw new Error(`stub has no route for ${path} (${init?.method ?? "GET"})`);
  }) as FetchJson;
}

describe("listTiers", () => {
  it("asserts the three tiers the stubbed store API returns, mapped from its own fields", async () => {
    const tiers = await listTiers(stubStoreApi());

    expect(tiers.map((tier) => ({ handle: tier.handle, title: tier.title, variantId: tier.variantId }))).toEqual([
      { handle: "lousy-deal", title: "Lousy Deal", variantId: "variant_1" },
      { handle: "lousy-deal-plus", title: "Lousy Deal Plus", variantId: "variant_2" },
      { handle: "lousy-deal-pro", title: "Lousy Deal Pro", variantId: "variant_3" },
    ]);
  });

  // Proves the mapping renders the API's own answer rather than a hardcoded
  // three: a stub that answers with a different tier set is reflected
  // exactly, not padded or truncated to three.
  it("returns whatever tier set the stubbed store API answers with, not a fixed count", async () => {
    const tiers = await listTiers(stubStoreApi(FIXTURE_PRODUCTS.slice(0, 2)));
    expect(tiers.map((tier) => tier.handle)).toEqual(["lousy-deal", "lousy-deal-plus"]);
  });

  it("leaves out a product the stub returns with no calculated_price, rather than fabricating an amount", async () => {
    const unpriced: StoreProduct = { id: "prod_4", handle: "unpriced", title: "Unpriced", variants: [{ id: "variant_4" }] };
    const tiers = await listTiers(stubStoreApi([...FIXTURE_PRODUCTS, unpriced]));
    expect(tiers.map((tier) => tier.handle)).not.toContain("unpriced");
  });
});

describe("createCart and addLineToCart", () => {
  it("adds the requested tier's variant as a line on the created cart -- the row's cart-line assertion", async () => {
    const fetchJson = stubStoreApi();

    const cart = await createCart(fetchJson, FIXTURE_REGION.id);
    const line = await addLineToCart(fetchJson, cart.id, "variant_2", 1);

    expect(line).toEqual({
      id: "item_fixture",
      cartId: "cart_fixture",
      variantId: "variant_2",
      quantity: 1,
      unitPrice: 999,
      currencyCode: "usd",
    });
  });

  // Discriminates: a stub whose cart never actually carries the line just
  // added -- the call that "does not send the line" the report contract asks
  // for -- is a defect `addLineToCart` must surface, not paper over by
  // returning something that merely looks like a line.
  it("fails when the cart the stub returns afterwards carries no line for the variant just added", async () => {
    const fetchJsonWithNoLine: FetchJson = (async <T>(path: string, init?: RequestInit): Promise<T> => {
      if (path === "/store/carts/cart_empty/line-items" && init?.method === "POST") {
        return { cart: { id: "cart_empty", currency_code: "usd", items: [] } } as T;
      }
      throw new Error(`stub has no route for ${path}`);
    }) as FetchJson;

    await expect(addLineToCart(fetchJsonWithNoLine, "cart_empty", "variant_1", 1)).rejects.toThrow(/no line item/);
  });
});

/**
 * Half the trap closed, half not -- say which is which rather than claim it
 * is shut. `backend/tests/commerce-product-seed.test.ts` scans `backend/src/`
 * for a bare `500`/`1000`/`2500` -- the backend's own minor-unit model
 * literal -- and its own comment says storefront is "the one that will
 * matter" once T9 lands. Mirroring that pattern here is closer to useless
 * than it looks: the Store API divides by 100 before the response ever
 * reaches this workspace (`backend/src/scripts/seed-product.ts:122`,
 * `amount: record.amountMinor / 100`), so the wire this file's code actually
 * handles carries **5, 10, 25** -- and the journal entry that names this
 * trap for T9 (`docs/working/ld-01-foundation/journal.md:1270-1272`) recorded
 * it as **`$5`**, not `500`. The bare-integer scan below is kept anyway,
 * unchanged, because a copy-paste of the backend's own minor-unit literal
 * into this workspace is still a real (if narrower) mistake it would catch.
 *
 * A second pattern below catches the shape the journal actually named: a
 * currency sigil directly followed by digits -- `$5`, `$10.00`, `€5`, `£10` --
 * which is what a price typed by hand looks like. **What neither pattern
 * catches: a bare major-unit integer such as `5` or `25` with no sigil.**
 * Measured, not assumed: `src/config/runtime-config.ts`'s own module comment
 * reads "Task 9/10" today, and `/\b(5|10|25)\b/` matches that "10" -- widening
 * the bare-integer pattern to `5|10|25` would turn this scan red against a
 * file this trap has nothing to do with, on its first run. This scan closes
 * the hand-typed-currency half of the trap and the minor-unit-copy-paste
 * half; it does not and cannot close the bare-major-unit half.
 *
 * Named files rather than a bare count, so a walker regression fails on the
 * specific file it dropped; see the backend scan's own comments for the
 * word-boundary rationale and what neither scan catches regardless of shape
 * (a computed or concatenated amount, `2_500`, `500n`, anything outside a
 * `.ts`/`.tsx` file).
 *
 * There is no `product-model.ts` equivalent under `storefront/src/`: no file
 * here declares a tier's amount at all, so unlike the backend scan this one
 * excludes no file.
 */
describe("no hardcoded price literal in any .ts or .tsx file under storefront/src", () => {
  const srcDirectory = join(__dirname, "../src");

  const allSourceFiles = readdirSync(srcDirectory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(ts|tsx)$/.test(entry.name))
    .map((entry) => join(entry.parentPath, entry.name))
    .sort();

  const sources: Array<[string, string]> = allSourceFiles.map((path) => [
    relative(srcDirectory, path).split(sep).join("/"),
    readFileSync(path, "utf8"),
  ]);

  it("covers app/page.tsx, app/cart/page.tsx, lib/medusa-client.ts and lib/store-cart.ts", () => {
    const relativePaths = sources.map(([file]) => file);
    expect(relativePaths).toContain("app/page.tsx");
    expect(relativePaths).toContain("app/cart/page.tsx");
    expect(relativePaths).toContain("lib/medusa-client.ts");
    expect(relativePaths).toContain("lib/store-cart.ts");
  });

  const PRICE_LITERAL_PATTERN = /\b(500|1000|2500)\b/;

  it.each(sources)("%s carries no bare 500, 1000 or 2500 token", (_file, source) => {
    expect(source).not.toMatch(PRICE_LITERAL_PATTERN);
  });

  // The shape the journal actually recorded for this row: a currency sigil
  // directly followed by digits, optionally with two decimal places -- `$5`,
  // `$10.00`, `€5`, `£10`. This is what catches a hand-typed price; the
  // bare-integer pattern above cannot, because the wire never carries a bare
  // major-unit literal for this scan to match against a minor-unit one.
  const PRICE_SIGIL_PATTERN = /[$€£]\d+(?:\.\d{1,2})?/;

  it.each(sources)("%s carries no hand-typed currency amount ($/€/£ followed by digits)", (_file, source) => {
    expect(source).not.toMatch(PRICE_SIGIL_PATTERN);
  });
});
