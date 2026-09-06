/**
 * `/done-deals/{slug}`: the certificate on real data, and the layout registry
 * that decides which certificate.
 *
 * **The page is rendered, not described.** `checkout-consent.test.ts` records
 * why at its own head — Gate D once deleted a gate from a component with every
 * test still green — so what follows drives `DoneDealPage` itself and looks at
 * the markup.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NO_INSCRIPTION } from "../src/content/certificate";
import { CERTIFICATE_LAYOUTS, certificateLayout } from "../src/lib/certificate-layouts";
import { CERTIFICATE_LAYOUT_V1 } from "../src/lib/certificate-model";
import { Certificate } from "../src/components/document/Certificate";
import { StoreApiError, type FetchJson } from "../src/lib/medusa-client";
import { getDeal } from "../src/lib/store-deal";

/** What C4's endpoint answers with, as it answers with it. */
const WIRE = {
  serial: 4102,
  tier: "Lousy Deal Pro",
  amount_paid: 25,
  currency_code: "usd",
  display_name: "Jane Example",
  dedication: "worth every cent, regrettably",
  layout_version: 1,
  issued_at: "2026-09-06",
};

/** A stub answering one deal route, or throwing. */
function stub(answer: unknown): FetchJson {
  return (async <T>(): Promise<T> => {
    // Any Error, not only a `StoreApiError`: the first version of this checked
    // `instanceof StoreApiError` and quietly *returned* a plain Error as the
    // response body, so the rethrow case tested nothing.
    if (answer instanceof Error) throw answer;
    return answer as T;
  }) as FetchJson;
}

vi.mock("next/server", () => ({ connection: async () => undefined }));

/**
 * Renders the page for whatever `getDeal` yields.
 *
 * **`store-deal` is mocked, not `medusa-client`.** Mocking the client and
 * constructing a `StoreApiError` in this file compares two different class
 * objects: `vi.resetModules()` gives the page a fresh module graph, so the
 * `StoreApiError` `getDeal` tests against is not the one imported at the head
 * of this file, and `instanceof` is false -- so the 404 case reported a
 * rethrow. `getDeal` is exercised for real in its own block below, where no
 * reset intervenes.
 */
async function renderPage(deal: unknown, slug = "xbts2k3mmv3trv3n"): Promise<string> {
  vi.resetModules();
  vi.doMock("../src/lib/store-session", () => ({
    requireStoreClientConfig: () => ({ backendUrl: "http://backend.example", publishableKey: "pk" }),
  }));
  vi.doMock("../src/lib/medusa-client", () => ({ createStoreFetchJson: () => stub({}) }));
  vi.doMock("../src/lib/store-deal", () => ({
    getDeal: async () => {
      if (deal instanceof Error) throw deal;
      return deal;
    },
  }));
  vi.doMock("next/navigation", () => ({
    notFound: () => {
      throw new Error("NOT_FOUND");
    },
  }));

  const { default: DoneDealPage } = await import("../src/app/done-deals/[slug]/page");
  return renderToStaticMarkup(await DoneDealPage({ params: Promise.resolve({ slug }) }));
}

/** The record `getDeal` yields for {@link WIRE}, which is what the page renders. */
const RECORD = {
  serial: 4102,
  tier: "Lousy Deal Pro",
  amount: 25,
  currencyCode: "usd",
  displayName: "Jane Example",
  dedication: "worth every cent, regrettably",
  layout: 1,
  issuedOn: "2026-09-06",
};

afterEach(() => {
  vi.resetModules();
});

describe("the certificate page", () => {
  it("renders the deal the slug addresses", async () => {
    const html = await renderPage(RECORD);

    expect(html).toContain("#4,102");
    expect(html).toContain("Jane Example");
    expect(html).toContain("worth every cent, regrettably");
    expect(html).toContain("Lousy Deal Pro");
    expect(html).toContain("$25.00");
    expect(html).toContain("2026-09-06");
  });

  it("renders the no-inscription state for a deal nobody inscribed", async () => {
    // §5: most buyers leave both fields blank, and this is the address they
    // will send people to.
    const html = await renderPage({ ...RECORD, displayName: null, dedication: null });

    expect(html).toContain(NO_INSCRIPTION);
    expect(html).not.toContain("certificate-dedication");
    expect(html).toContain("#4,102");
  });

  it("is a 404 when there is no certificate to show", async () => {
    // `null` covers a slug that addresses nothing and one an operator has
    // hidden. C4 answers those identically so the address cannot be
    // enumerated, and this page cannot tell them apart either.
    await expect(renderPage(null)).rejects.toThrow("NOT_FOUND");
  });

  it("does not turn a broken backend into a missing certificate", async () => {
    // Answering a 503 as "no such deal" would tell somebody their certificate
    // had been withdrawn because a database was briefly unreachable.
    await expect(renderPage(new StoreApiError(503, "/store/deals/x"))).rejects.toThrow(/503/);
  });

  it("refuses a layout it does not know rather than rendering another one", async () => {
    await expect(renderPage({ ...RECORD, layout: 2 })).rejects.toThrow(/not in this build/);
  });

  it("keeps the address out of a search index", async () => {
    // An unguessable URL that a crawler publishes is a guessable URL.
    const { metadata } = await import("../src/app/done-deals/[slug]/page");
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});

describe("the layout registry", () => {
  it("renders a deal with the layout it was issued under", () => {
    expect(certificateLayout(CERTIFICATE_LAYOUT_V1)).toBe(Certificate);
  });

  it("refuses a version this build does not know, rather than falling back", () => {
    // **The assertion this row exists for.** §5: a redesign is additive and
    // never restyles a certificate somebody already owns. A fallback to the
    // newest layout would do exactly that, silently, and only to the deals
    // whose layout went missing -- which is reachable by rolling an older
    // image over a newer one.
    expect(() => certificateLayout(2)).toThrow(/not in this build/);
    expect(() => certificateLayout(0)).toThrow(/not in this build/);
    expect(() => certificateLayout(-1)).toThrow(/not in this build/);
  });

  it("names the failure with the version, because that is what a deployment needs to hear", () => {
    expect(() => certificateLayout(9)).toThrow(/layout 9/);
  });

  it("has one entry today, and the row that adds another adds an entry", () => {
    // A count rather than a shape: the point of the registry is that layout 2
    // arrives as a new key beside layout 1, not as an edit to `Certificate`.
    expect(Object.keys(CERTIFICATE_LAYOUTS)).toEqual([String(CERTIFICATE_LAYOUT_V1)]);
  });
});

describe("getDeal", () => {
  it("translates the wire's vocabulary into the record's", async () => {
    // `amount_paid` against `amount`, `issued_at` against `issuedOn`. Named
    // field by field so a field added to the endpoint does not arrive on the
    // page because nobody stopped it.
    expect(await getDeal(stub({ deal: WIRE }), "slug")).toEqual(RECORD);
  });

  it("carries nothing the endpoint did not publish, even when the endpoint sends more", async () => {
    // Constraint 13: the billing name is never public. C4's projection is an
    // allowlist and so is this mapping -- asserted here as a closed set, by
    // answering with fields that endpoint would never send.
    const deal = await getDeal(
      stub({ deal: { ...WIRE, customer_name: "Someone Real", email: "buyer@example.test", order_id: "order_01" } }),
      "slug",
    );

    expect(deal).toEqual(RECORD);
    expect(Object.keys(deal ?? {}).sort()).toEqual(Object.keys(RECORD).sort());
  });

  it("refuses a partial deal rather than yielding a record with a gap in it", async () => {
    // A certificate with no tier is not a certificate with a blank; it is a
    // document making a claim it cannot support, on the surface people
    // screenshot.
    await expect(getDeal(stub({ deal: { ...WIRE, tier: undefined } }), "x")).rejects.toThrow(/incomplete deal/);
    await expect(getDeal(stub({ deal: { ...WIRE, amount_paid: "25" } }), "x")).rejects.toThrow(/incomplete deal/);
    await expect(getDeal(stub({}), "x")).rejects.toThrow(/incomplete deal/);
  });

  it("reads an absent inscription as null, whatever shape absence arrived in", async () => {
    for (const absent of [null, undefined, "", 42]) {
      const deal = await getDeal(stub({ deal: { ...WIRE, display_name: absent, dedication: absent } }), "s");
      expect(deal?.displayName, String(absent)).toBeNull();
      expect(deal?.dedication, String(absent)).toBeNull();
    }
  });

  it("answers null for 404 and rethrows everything else", async () => {
    expect(await getDeal(stub(new StoreApiError(404, "/store/deals/x")), "x")).toBeNull();
    await expect(getDeal(stub(new StoreApiError(500, "/store/deals/x")), "x")).rejects.toThrow(/500/);
    await expect(getDeal(stub(new Error("socket hang up")), "x")).rejects.toThrow("socket hang up");
  });

  it("escapes the slug rather than splicing it into a path", async () => {
    let path = "";
    const fetchJson = (async <T>(requested: string): Promise<T> => {
      path = requested;
      return { deal: WIRE } as T;
    }) as FetchJson;

    await getDeal(fetchJson, "a/../../admin");
    expect(path).toBe("/store/deals/a%2F..%2F..%2Fadmin");
  });
});
