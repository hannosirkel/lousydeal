/**
 * The public/index boundary as Next metadata exposes it.
 *
 * Search engines may catalogue offers and legal documents. A cart, checkout,
 * or issued certificate is somebody's transactional or personal page and is
 * never an index entry. Canonical URLs use the origin of the request so the
 * same image remains correct on every environment.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
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
    ["withdrawal", "../src/app/legal/withdraw/page", "/legal/withdraw"],
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

  it("keeps crawler discovery public while excluding every private namespace", async () => {
    requestHeaders.set("host", "shop.example");
    requestHeaders.set("x-forwarded-proto", "https");
    const { default: robots } = await import("../src/app/robots");
    const output = await robots();

    expect(output.rules).toEqual({
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/analytics/", "/cart", "/checkout", "/design/", "/done-deals/"],
    });
    expect(output.sitemap).toBe("https://shop.example/sitemap.xml");
  });
});
