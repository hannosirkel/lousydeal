/**
 * The public/index boundary as Next metadata exposes it.
 *
 * Search engines may catalogue offers and legal documents. A cart, checkout,
 * or issued certificate is somebody's transactional or personal page and is
 * never an index entry. Canonical URLs use the origin of the request so the
 * same image remains correct on every environment.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const requestHeaders = vi.hoisted(() => new Headers());

vi.mock("next/headers", () => ({
  headers: async () => requestHeaders,
  cookies: async () => ({ get: () => undefined }),
}));
vi.mock("next/font/local", () => ({ default: () => ({ variable: "font-mock" }) }));
vi.mock("next/server", () => ({ connection: async () => undefined }));

beforeEach(() => {
  requestHeaders.delete("host");
  requestHeaders.delete("x-forwarded-proto");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("canonical metadata", () => {
  it("derives the canonical base from the request", async () => {
    requestHeaders.set("host", "shop.example:8443");
    requestHeaders.set("x-forwarded-proto", "https");

    const { generateMetadata } = await import("../src/app/layout");
    const metadata = await generateMetadata();

    expect(String(metadata.metadataBase)).toBe("https://shop.example:8443/");
  });

  it("marks the homepage itself as canonical", async () => {
    const route = await import("../src/app/page") as { readonly metadata?: { readonly alternates?: unknown } };
    expect(route.metadata?.alternates).toEqual({ canonical: "/" });
  });

  it.each([
    ["legal index", "../src/app/legal/page", "/legal"],
    ["terms", "../src/app/legal/terms/page", "/legal/terms"],
    ["refunds", "../src/app/legal/refunds/page", "/legal/refunds"],
    ["privacy", "../src/app/legal/privacy/page", "/legal/privacy"],
    ["imprint", "../src/app/legal/imprint/page", "/legal/imprint"],
  ])("gives the %s page its own canonical path", async (_name, modulePath, canonical) => {
    const route = await import(modulePath) as { readonly metadata?: { readonly alternates?: unknown } };
    expect(route.metadata?.alternates).toEqual({ canonical });
  });

  it.each([
    ["deal", "../src/app/deal/[handle]/page", "/deal/a%20deal"],
    ["goods", "../src/app/goods/[handle]/page", "/goods/a%20deal"],
  ])("encodes the %s handle in its canonical path", async (_name, modulePath, canonical) => {
    const route = await import(modulePath) as unknown as {
      readonly generateMetadata?: (input: { readonly params: Promise<{ readonly handle: string }> }) =>
        Promise<{ readonly alternates?: unknown }> | { readonly alternates?: unknown };
    };
    expect(route.generateMetadata).toBeTypeOf("function");
    expect(await route.generateMetadata?.({ params: Promise.resolve({ handle: "a deal" }) })).toMatchObject({
      alternates: { canonical },
    });
  });
});

describe("transactional and personal indexing", () => {
  it.each([
    ["cart", "../src/app/cart/page"],
    ["checkout", "../src/app/checkout/page"],
  ])("marks %s noindex and nofollow", async (_name, modulePath) => {
    const route = await import(modulePath) as { readonly metadata?: { readonly robots?: unknown } };
    expect(route.metadata?.robots).toEqual({ index: false, follow: false });
  });

  // The two certificate URLs that are not pages carry the same directive in a
  // response header, and `tests/certificate-indexing.test.ts` proves it by
  // calling them rather than by reading their source for the literal.
  it("marks the certificate design noindex", async () => {
    const design = await import("../src/app/design/certificate/page") as {
      readonly metadata?: { readonly robots?: unknown };
    };
    expect(design.metadata?.robots).toEqual({ index: false, follow: false });
  });

  it.each([
    ["clean form", {}, undefined],
    ["confirmation", { step: "confirm" }, { index: false, follow: false }],
    ["receipt", { step: "done" }, { index: false, follow: false }],
    ["prefilled form", { consumerName: "Private Person" }, { index: false, follow: false }],
  ])("keeps the withdrawal %s on the clean canonical with the right index policy", async (_name, query, policy) => {
    const route = await import("../src/app/legal/withdraw/page") as unknown as {
      readonly generateMetadata?: (input: {
        readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
      }) => Promise<{ readonly alternates?: unknown; readonly robots?: unknown }>;
    };
    expect(route.generateMetadata).toBeTypeOf("function");
    const result = await route.generateMetadata?.({ searchParams: Promise.resolve(query) });
    expect(result?.alternates).toEqual({ canonical: "/legal/withdraw" });
    expect(result?.robots).toEqual(policy);
  });
});

describe("crawler routes", () => {
  it.each(["robots.ts", "sitemap.ts"])("ships %s through the Next metadata API", (file) => {
    expect(existsSync(fileURLToPath(new URL(`../src/app/${file}`, import.meta.url)))).toBe(true);
  });

  it("publishes the current catalogue and legal pages, but no personal or transactional route", async () => {
    const route = await import("../src/app/sitemap") as unknown as {
      readonly buildSitemap?: (
        origin: URL,
        tiers: readonly { readonly handle: string }[],
        merch: readonly { readonly handle: string }[],
      ) => readonly { readonly url: string }[];
    };
    expect(route.buildSitemap).toBeTypeOf("function");

    const entries = route.buildSitemap?.(
      new URL("https://shop.example"),
      [{ handle: "lousy-deal" }, { handle: "lousy deal plus" }],
      [{ handle: "this-mug-cost-extra" }],
    ) ?? [];
    const paths = entries.map(({ url }) => new URL(url).pathname);

    expect(paths).toEqual([
      "/",
      "/deal/lousy-deal",
      "/deal/lousy%20deal%20plus",
      "/goods/this-mug-cost-extra",
      "/legal",
      "/legal/terms",
      "/legal/refunds",
      "/legal/privacy",
      "/legal/withdraw",
      "/legal/imprint",
    ]);
    expect(paths).not.toContain("/cart");
    expect(paths).not.toContain("/checkout");
    expect(paths.some((path) => path.startsWith("/done-deals/"))).toBe(false);
  });

  it("builds the default sitemap from request origin and the configured Store API", async () => {
    requestHeaders.set("host", "shop.example");
    requestHeaders.set("x-forwarded-proto", "https");
    vi.stubEnv("MEDUSA_BACKEND_URL", "https://store.example");
    vi.stubEnv("MEDUSA_PUBLISHABLE_API_KEY", "pk_example");
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      if (url.pathname === "/store/regions") {
        return Response.json({ regions: [{ id: "reg_1", currency_code: "usd" }] });
      }
      if (url.pathname === "/store/products") {
        return Response.json({
          products: [
            {
              id: "tier_1",
              handle: "lousy-deal",
              title: "Lousy Deal",
              variants: [{ id: "variant_1", calculated_price: { calculated_amount: 5, currency_code: "usd" } }],
            },
            {
              id: "merch_1",
              handle: "printed-thing",
              title: "Printed Thing",
              variants: [{
                id: "variant_2",
                title: "One size",
                calculated_price: { calculated_amount: 10, currency_code: "usd" },
                metadata: { printful_variant_id: "1" },
              }],
            },
          ],
        });
      }
      return Response.json({}, { status: 404 });
    }));

    const { default: sitemap } = await import("../src/app/sitemap");
    const paths = (await sitemap()).map(({ url }) => new URL(url).pathname);

    expect(paths).toContain("/deal/lousy-deal");
    expect(paths).toContain("/goods/printed-thing");
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it("propagates a Store API failure instead of publishing a partial sitemap", async () => {
    requestHeaders.set("host", "shop.example");
    vi.stubEnv("MEDUSA_BACKEND_URL", "https://store.example");
    vi.stubEnv("MEDUSA_PUBLISHABLE_API_KEY", "pk_example");
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("catalogue unavailable"); }));

    const { default: sitemap } = await import("../src/app/sitemap");
    await expect(sitemap()).rejects.toThrow("catalogue unavailable");
  });

  it("allows noindex pages to be crawled while excluding non-page endpoints", async () => {
    requestHeaders.set("host", "shop.example");
    requestHeaders.set("x-forwarded-proto", "https");
    const { default: robots } = await import("../src/app/robots");
    const output = await robots();

    expect(output.rules).toEqual({
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/analytics/"],
    });
    expect(output.sitemap).toBe("https://shop.example/sitemap.xml");

    const configuredDisallow = output.rules instanceof Array ? undefined : output.rules.disallow;
    const disallowed = typeof configuredDisallow === "string"
      ? [configuredDisallow]
      : configuredDisallow ?? [];
    // Every one of these carries `noindex` on its own response -- in metadata
    // for the pages, in a header for the PDF and the share card. A `Disallow`
    // here would be the classic own goal: a crawler that is not allowed to
    // fetch the URL never reads the directive, and the address stays eligible
    // for a URL-only listing. Crawlable and noindexed is the intended pair, so
    // this asserts the absence rather than tolerating it.
    for (const path of [
      "/cart",
      "/checkout",
      "/design/certificate",
      "/done-deals/example",
      "/done-deals/example/certificate.pdf",
      "/done-deals/example/opengraph-image",
    ]) {
      expect(disallowed.some((prefix) => path.startsWith(prefix))).toBe(false);
    }
  });
});
