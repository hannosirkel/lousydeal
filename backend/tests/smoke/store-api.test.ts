import { beforeAll, describe, expect, it } from "vitest";

import { REGION_NAME } from "../../src/scripts/configure-commerce";
import { PRODUCT_TIERS } from "../../src/commerce/product-model";
import { ESTONIAN_STANDARD_VAT_PERCENT } from "../../src/commerce/tax-model";

/**
 * One request against a **running** Medusa -- the assembly this plan's other
 * rows never asked, each having verified its own layer against the layer
 * beneath it. `scripts/store-smoke` stands up the real thing: the PostgreSQL
 * and Redis `compose.yaml` pins, the server `medusa build` produces, the
 * predeploy chain in its real order, and then this file asking the Store API
 * the question a storefront asks it -- and asserting a cart can be created,
 * the way `storefront/src/lib/store-cart.ts` creates one.
 *
 * Modelled on `plepic/backend/tests/smoke/store-api.test.ts`, which exists
 * because that shop's price model changed and merged behind three review
 * passes and 2,967 green unit tests with a defect that answered every
 * catalogue request with HTTP 500 -- `configure:commerce` had created its tax
 * regions with `provider_id = NULL`, a state only a real Medusa runtime can
 * produce or catch. This shop shares the same tax-region mechanism
 * (`backend/src/commerce/tax-model.ts`, `TAX_PROVIDER_ID`), so the same class
 * of defect is reachable here, and the two country cases below
 * (`EU_PRICING_COUNTRY`, `NON_EU_PRICING_COUNTRY`) are what would have caught
 * it: both drive a `/store/products` request through
 * `wrapProductsWithTaxPrices` and the tax provider it resolves.
 *
 * ## What this file is not
 *
 * Not a browser test, not a checkout, and it never reaches Stripe --
 * `scripts/store-smoke` gives the backend a synthetic Stripe key that boots
 * the payment module without ever calling Stripe's API.
 */

/**
 * Where `scripts/store-smoke` published the Medusa it started.
 *
 * Read once, at module load, so an unset value throws before a single `it`
 * runs -- `vitest` then reports the whole file as failed rather than
 * collecting zero tests and exiting 0. A suite that quietly skipped every
 * assertion when this was absent would report success while testing
 * nothing, which is the exact shape of the 2,959-green-tests failure this
 * row exists to prevent.
 */
const backendUrl = requiredEnvironmentValue("STORE_SMOKE_BACKEND_URL");

/** The administrator `npm run seed:administrator` created, one predeploy step earlier. */
const adminEmail = requiredEnvironmentValue("MEDUSA_ADMIN_EMAIL");
const adminPassword = requiredEnvironmentValue("MEDUSA_ADMIN_PASSWORD");

function requiredEnvironmentValue(name: string): string {
  const value = process.env[name]?.trim();
  if (value === undefined || value.length === 0) {
    throw new Error(
      `${name} is not set; this suite needs a running Medusa and refuses rather than ` +
        "skipping -- run it through scripts/store-smoke, which sets it.",
    );
  }
  return value;
}

/**
 * The EU destination `docs/decisions/009-merchant-absorbs-the-vat.md` prices
 * against, and a destination outside it. Both are asked of the catalogue
 * below, because the null-tax-provider defect this file guards against is
 * only reachable through a country that resolves to a real tax region.
 */
const EU_PRICING_COUNTRY = "EE";
const NON_EU_PRICING_COUNTRY = "US";

const STORE_PRODUCT_FIELDS = ["id", "handle", "title", "*variants", "+variants.calculated_price"];

interface CalculatedPrice {
  readonly calculated_amount?: unknown;
  readonly calculated_amount_with_tax?: unknown;
  readonly calculated_amount_without_tax?: unknown;
  readonly is_calculated_price_tax_inclusive?: unknown;
  readonly currency_code?: unknown;
}

interface StoreVariant {
  readonly id?: unknown;
  readonly calculated_price?: CalculatedPrice;
}

interface StoreProduct {
  readonly handle?: unknown;
  readonly title?: unknown;
  readonly variants?: readonly StoreVariant[];
}

/** A publishable key, and the region every price is computed in. Set by `beforeAll`. */
let publishableKey = "";
let regionId = "";

async function json(
  path: string,
  init?: { readonly method?: string; readonly headers?: Record<string, string>; readonly body?: string },
): Promise<{ status: number; body: unknown; text: string }> {
  const response = await fetch(new URL(path, backendUrl), {
    method: init?.method ?? "GET",
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    body: init?.body,
  });
  const text = await response.text();
  // Kept as text as well as parsed: the failure this file exists to catch
  // answers with a body that says nothing -- {"code":"unknown_error"} -- and
  // an assertion message carrying the raw text is the difference between
  // "expected 500 to be 200" and knowing what came back.
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = undefined;
  }
  return { status: response.status, body, text };
}

/** A Store request, carrying the publishable key every `/store/*` route requires. */
async function store(
  path: string,
  init?: { readonly method?: string; readonly headers?: Record<string, string>; readonly body?: string },
): Promise<{ status: number; body: unknown; text: string }> {
  return await json(path, {
    ...init,
    headers: { "x-publishable-api-key": publishableKey, ...(init?.headers ?? {}) },
  });
}

function catalogueRequest(countryCode: string): string {
  const url = new URL("/store/products", backendUrl);
  url.searchParams.set("limit", "10");
  url.searchParams.set("fields", STORE_PRODUCT_FIELDS.join(","));
  url.searchParams.set("region_id", regionId);
  url.searchParams.set("country_code", countryCode.toLowerCase());
  return `${url.pathname}${url.search}`;
}

function record(value: unknown, label: string): Record<string, unknown> {
  expect(value, label).toBeTypeOf("object");
  expect(value, label).not.toBeNull();
  return value as Record<string, unknown>;
}

function sequence(value: unknown, label: string): readonly unknown[] {
  expect(Array.isArray(value), label).toBe(true);
  return value as readonly unknown[];
}

/**
 * Signs in as the seeded administrator and mints a Store key scoped to every
 * sales channel the store has -- the only way this suite can ask the Store
 * API anything, since nothing in `predeploy` creates one for it.
 */
beforeAll(async () => {
  const authenticated = await json("/auth/user/emailpass", {
    method: "POST",
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });
  expect(
    authenticated.status,
    `the seeded administrator could not sign in: ${authenticated.text}`,
  ).toBe(200);
  const token = record(authenticated.body, "auth response")["token"];
  expect(token, "auth response carries no token").toBeTypeOf("string");
  const authorization = { authorization: `Bearer ${String(token)}` };

  const channels = await json("/admin/sales-channels?limit=100", { headers: authorization });
  expect(channels.status, channels.text).toBe(200);
  const channelIds = sequence(
    record(channels.body, "sales channels")["sales_channels"],
    "sales_channels",
  ).map((channel) => String(record(channel, "sales channel")["id"]));
  expect(channelIds.length, "the store has no sales channel to scope a Store key to").toBeGreaterThan(0);

  const created = await json("/admin/api-keys", {
    method: "POST",
    headers: authorization,
    body: JSON.stringify({ title: "store-smoke", type: "publishable" }),
  });
  expect(created.status, created.text).toBe(200);
  const apiKey = record(record(created.body, "api key response")["api_key"], "api key");
  publishableKey = String(apiKey["token"]);

  const linked = await json(`/admin/api-keys/${String(apiKey["id"])}/sales-channels`, {
    method: "POST",
    headers: authorization,
    body: JSON.stringify({ add: channelIds }),
  });
  expect(linked.status, linked.text).toBe(200);

  const regions = await store("/store/regions?limit=2");
  expect(regions.status, regions.text).toBe(200);
  const listed = sequence(record(regions.body, "regions response")["regions"], "regions");
  expect(listed, "Medusa must expose exactly one region to price the catalogue in").toHaveLength(1);
  const region = record(listed[0], "region");
  expect(region["name"]).toBe(REGION_NAME);
  regionId = String(region["id"]);
});

describe("the catalogue request the storefront makes", () => {
  it("answers 200 with all three tiers, priced tax-inclusive, for an EU destination", async () => {
    const response = await store(catalogueRequest(EU_PRICING_COUNTRY));
    expect(
      response.status,
      `GET /store/products for ${EU_PRICING_COUNTRY} answered ${String(response.status)}: ${response.text}`,
    ).toBe(200);

    const products = sequence(
      record(response.body, "products response")["products"],
      "products",
    ) as readonly StoreProduct[];
    expect(products, "the Store catalogue must contain exactly the three seeded tiers").toHaveLength(
      PRODUCT_TIERS.length,
    );

    const byHandle = new Map(products.map((product) => [String(product.handle), product]));

    for (const tier of PRODUCT_TIERS) {
      const product = byHandle.get(tier.handle);
      expect(product, `the catalogue carries no product for handle ${tier.handle}`).toBeDefined();
      expect(product!.title).toBe(tier.title);

      const variants = sequence(product!.variants, `${tier.handle} variants`) as readonly StoreVariant[];
      expect(variants).toHaveLength(1);
      const price = variants[0]!.calculated_price;
      expect(
        price,
        `${tier.handle}'s variant carries no calculated price; the request reached no pricing context`,
      ).toBeTypeOf("object");

      // Decision 009: the tier's declared amount is what the customer pays,
      // in every destination -- Estonia's VAT, where it applies, is absorbed
      // out of it rather than added on top, so the tax-inclusive figure never
      // moves with the country.
      const major = tier.amountMinor / 100;
      expect(price!.is_calculated_price_tax_inclusive, tier.handle).toBe(true);
      expect(price!.calculated_amount, tier.handle).toBe(major);
      expect(price!.calculated_amount_with_tax, tier.handle).toBe(major);
      expect(price!.currency_code, tier.handle).toBe(tier.currency);

      // The absorption is only real if a nonzero rate was actually deducted --
      // this is the assertion the null-tax-provider defect class would fail:
      // a tax region with no provider throws before this figure is computed
      // at all, and one with the wrong rate would leave it equal to `major`.
      const withoutTax = price!.calculated_amount_without_tax;
      expect(withoutTax, tier.handle).toBeTypeOf("number");
      expect(withoutTax as number, tier.handle).toBeCloseTo(
        (major * 100) / (100 + ESTONIAN_STANDARD_VAT_PERCENT),
        6,
      );
    }
  });

  it("answers 200 with no VAT deducted for a destination outside the EU", async () => {
    const response = await store(catalogueRequest(NON_EU_PRICING_COUNTRY));
    expect(
      response.status,
      `GET /store/products for ${NON_EU_PRICING_COUNTRY} answered ${String(response.status)}: ${response.text}`,
    ).toBe(200);

    const products = sequence(
      record(response.body, "products response")["products"],
      "products",
    ) as readonly StoreProduct[];
    const byHandle = new Map(products.map((product) => [String(product.handle), product]));

    for (const tier of PRODUCT_TIERS) {
      const product = byHandle.get(tier.handle);
      const variants = sequence(product!.variants, `${tier.handle} variants`) as readonly StoreVariant[];
      const price = variants[0]!.calculated_price!;
      const major = tier.amountMinor / 100;
      // No EU VAT arises outside the EU at all: the net and gross figures
      // are equal rather than the gross carrying a zero-rated tax line.
      expect(price.calculated_amount_without_tax, tier.handle).toBe(major);
      expect(price.calculated_amount_with_tax, tier.handle).toBe(major);
    }
  });
});

/**
 * A cart with a region, the way `storefront/src/lib/store-cart.ts` creates
 * one (`createCart`), and a line item added to it the way `addLineToCart`
 * does -- `POST .../line-items` with `{ variant_id, quantity }`, returning
 * the whole cart rather than the created line.
 */
describe("a cart can be created and a tier added to it", () => {
  it("creates a cart in the seeded region and prices an added line", async () => {
    const created = await store("/store/carts", {
      method: "POST",
      body: JSON.stringify({ region_id: regionId }),
    });
    expect(created.status, `POST /store/carts answered ${String(created.status)}: ${created.text}`).toBe(200);
    const cart = record(created.body, "cart response")["cart"];
    const cartId = String(record(cart, "cart")["id"]);
    expect(cartId.length, "the created cart carries no id").toBeGreaterThan(0);

    const catalogue = await store(catalogueRequest(EU_PRICING_COUNTRY));
    expect(catalogue.status, catalogue.text).toBe(200);
    const products = sequence(
      record(catalogue.body, "products response")["products"],
      "products",
    ) as readonly StoreProduct[];
    const firstTier = PRODUCT_TIERS[0]!;
    const product = products.find((candidate) => candidate.handle === firstTier.handle);
    const variantId = String(
      record(
        sequence(product!.variants, "variants")[0],
        "variant",
      )["id"],
    );

    const withLine = await store(`/store/carts/${cartId}/line-items`, {
      method: "POST",
      body: JSON.stringify({ variant_id: variantId, quantity: 1 }),
    });
    expect(
      withLine.status,
      `POST /store/carts/${cartId}/line-items answered ${String(withLine.status)}: ${withLine.text}`,
    ).toBe(200);
    const updatedCart = record(withLine.body, "cart response")["cart"];
    const items = sequence(record(updatedCart, "cart")["items"], "items");
    const line = items
      .map((item) => record(item, "line item"))
      .find((item) => item["variant_id"] === variantId);
    expect(line, "the cart carries no line item for the variant just added").toBeDefined();
    expect(line!["quantity"]).toBe(1);
    expect(line!["unit_price"]).toBe(firstTier.amountMinor / 100);
  });
});

/**
 * C4's route, against the running server. The unit test drives the handler
 * with fakes; what it cannot check is the framework's own wiring, and that is
 * the whole of what these two cases are for.
 *
 * Neither needs a deal to exist. The 200 path needs a real order, which needs
 * Stripe, and C15 is where that runs.
 */
describe("the public deal endpoint is wired, and is behind the store's key", () => {
  it("answers 404 for a slug that addresses nothing, which means the route is registered", async () => {
    // A route Medusa never registered answers 404 too -- but with the
    // framework's own body, not this one. The message is what separates
    // "reached the handler" from "reached the router's fallback".
    const answer = await store("/store/deals/nosuchslugatall1");

    expect(
      answer.status,
      `GET /store/deals/nosuchslugatall1 answered ${String(answer.status)}: ${answer.text}`,
    ).toBe(404);
    expect(record(answer.body, "404 body")["message"]).toBe("No such deal");
  });

  it("refuses the same request without a publishable key", async () => {
    // Asserted rather than assumed. `route.js:98` applies
    // `ensurePublishableApiKeyMiddleware` to the whole `/store` namespace, so
    // a route file placed under `src/api/store/` inherits it -- and this is
    // what proves the inheritance is real for a *custom* route rather than
    // only for Medusa's own.
    const answer = await json("/store/deals/nosuchslugatall1");

    expect(answer.status, `unkeyed request answered ${String(answer.status)}: ${answer.text}`).toBe(400);
    // The header's name rather than the sentence around it: Medusa's wording
    // ("Publishable API key required in the request header: ...") is Medusa's
    // to change, and asserting the prose would fail on a release note.
    expect(answer.text).toContain("x-publishable-api-key");
  });
});
