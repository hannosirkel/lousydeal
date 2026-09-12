/**
 * The two certificate URLs that are not pages, and the directive each has to
 * carry on its own response.
 *
 * `/done-deals/{slug}` says `noindex, nofollow` in its metadata, and
 * `seo.test.ts` checks that. Neither of the other two addresses contract §5
 * fixes has metadata: the PDF is a Route Handler and the share card is a
 * file-convention image, so both have to say it in a header or not at all.
 *
 * **The share card is the one the page's own `noindex` cannot cover.** A card
 * is fetched in the context of whatever page embeds it — a forum thread, a
 * timeline — and those pages are indexable. An image crawler that follows the
 * `og:image` URL out of one of them and finds no directive on the response has
 * been told nothing, and what it indexes is the serial, the inscription and
 * the amount.
 *
 * **The responses are produced, not described.** `seo.test.ts` used to assert
 * the PDF's header by reading the route's source for the literal, which passes
 * for a header written into a comment and fails for one written any other way.
 * These call the exported handlers and read `Response.headers`, so deleting
 * the header — or moving it somewhere the framework drops it — fails here.
 */

import { fileURLToPath } from "node:url";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import type { Certificate } from "../src/lib/certificate-model";

// `connection()` marks both routes dynamic and throws outside a request scope,
// which a direct call is. The routes' own tests assert that they call it.
vi.mock("next/server", () => ({ connection: async () => undefined }));

/** A real certificate: the header has to be there when there is data to leak. */
const CERTIFICATE: Certificate = {
  serial: 4102,
  displayName: "Jane Example",
  dedication: "worth every cent, regrettably",
  tier: "Lousy Deal Pro",
  amount: 25,
  currencyCode: "usd",
  issuedOn: "2026-09-06",
  layout: 1,
};

/**
 * Both renderers read their fonts from `join(process.cwd(), "public/fonts/…")`,
 * which is `storefront/` wherever the server runs and the repository root under
 * Vitest. `opengraph.test.ts` and `certificate-pdf.test.ts` take the same
 * measure: the test stands where the server stands.
 */
const originalCwd = process.cwd();
beforeAll(() => {
  process.chdir(fileURLToPath(new URL("..", import.meta.url)));
});
afterAll(() => {
  process.chdir(originalCwd);
});

/**
 * Give the next import of a route a store that answers with `CERTIFICATE`.
 *
 * `store-deal` is mocked rather than the client beneath it, for the reason
 * `done-deals-page.test.ts` records: `vi.resetModules()` hands the route a
 * fresh module graph, so anything this file constructs is not the class the
 * route compares against.
 */
async function loadRoute<T>(specifier: string): Promise<T> {
  vi.resetModules();
  vi.doMock("../src/lib/store-session", () => ({
    requireStoreClientConfig: () => ({ backendUrl: "http://backend.example", publishableKey: "pk" }),
  }));
  vi.doMock("../src/lib/medusa-client", () => ({
    createStoreFetchJson: () => async () => ({}),
  }));
  vi.doMock("../src/lib/store-deal", () => ({ getDeal: async () => CERTIFICATE }));
  return await import(specifier) as T;
}

afterEach(() => {
  // The doMocks above are file-scoped once registered; clearing them keeps
  // this file from deciding what any later import sees.
  vi.doUnmock("../src/lib/store-session");
  vi.doUnmock("../src/lib/medusa-client");
  vi.doUnmock("../src/lib/store-deal");
  vi.resetModules();
});

const params = Promise.resolve({ slug: "xbts2k3mmv3trv3n" });

describe("the certificate share card", () => {
  it("answers a valid slug with a PNG that tells crawlers not to index it", async () => {
    const route = await loadRoute<{
      default: (input: { params: Promise<{ slug: string }> }) => Promise<Response>;
      contentType: string;
    }>("../src/app/done-deals/[slug]/opengraph-image");

    const response = await route.default({ params });

    // Reachable, public, and carrying certificate data -- which is why the
    // directive has to be here rather than only on the page that links to it.
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(route.contentType);
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  }, 30_000);
});

describe("the certificate PDF", () => {
  it("answers a valid slug with a PDF that tells crawlers not to index it", async () => {
    const route = await loadRoute<{
      GET: (request: Request, context: { params: Promise<{ slug: string }> }) => Promise<Response>;
    }>("../src/app/done-deals/[slug]/certificate.pdf/route");

    const response = await route.GET(
      new Request("https://shop.example/done-deals/xbts2k3mmv3trv3n/certificate.pdf"),
      { params },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  }, 30_000);
});
