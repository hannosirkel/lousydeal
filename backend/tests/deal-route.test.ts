/**
 * `GET /store/deals/:slug`, driven directly.
 *
 * The handler is an ordinary async function over a request and a response, so
 * it is called with fakes rather than through a server. What that cannot check
 * is the framework's own wiring — that the file's path becomes the route, and
 * that `/store` carries the publishable-key middleware — and neither is
 * asserted here. Both are asserted against a running Medusa in
 * `tests/smoke/store-api.test.ts`, which `bash scripts/store-smoke` drives;
 * the 200 path needs a real order and is C15's.
 */

import { describe, expect, it } from "vitest";

import { GET, publicDeal, type StoredDeal } from "../src/api/store/deals/[slug]/route";
import { DEAL_MODULE } from "../src/modules/deal";

const STORED: StoredDeal = {
  public_slug: "xbts2k3mmv3trv3n",
  serial: 4102,
  tier: "Lousy Deal Pro",
  amount_paid: 25,
  currency_code: "usd",
  display_name: "Jane Example",
  dedication: "worth every cent, regrettably",
  layout_version: 1,
  status: "issued",
  issued_at: new Date("2026-09-06T10:32:17.482Z"),
};

/** A response that records what the handler did to it. */
function fakeResponse() {
  const sent: { status: number; body: unknown } = { status: 200, body: undefined };
  const res = {
    status(code: number) {
      sent.status = code;
      return res;
    },
    json(body: unknown) {
      sent.body = body;
      return res;
    },
  };
  return { res, sent };
}

/** Drives the handler for one slug against one stored row (or none). */
async function get(slug: string, rows: StoredDeal[]) {
  const { res, sent } = fakeResponse();
  let resolvedKey = "";
  const req = {
    params: { slug },
    scope: {
      resolve: (key: string) => {
        resolvedKey = key;
        return {
          listLousyDeals: async ({ public_slug }: { public_slug: string }) =>
            rows.filter((row) => row.public_slug === public_slug),
        };
      },
    },
  };

  await GET(req as never, res as never);
  return { ...sent, resolvedKey };
}

describe("the public projection", () => {
  it("publishes exactly these eight fields and no others", () => {
    // An allowlist asserted as a closed set, which is the inverse of the usual
    // test and the point of this one: `lousy_deal` will grow columns, and a
    // `toMatchObject` would let each new one reach an unauthenticated endpoint
    // by default. §5's rule that the billing name is never public is an
    // absence, and an absence is only testable against a closed set.
    expect(Object.keys(publicDeal(STORED)).sort()).toEqual(
      [
        "serial",
        "tier",
        "amount_paid",
        "currency_code",
        "display_name",
        "dedication",
        "layout_version",
        "issued_at",
      ].sort(),
    );
  });

  it("publishes nothing that addresses the order or the caller", () => {
    // Named individually as well as excluded by the closed set above, so a
    // failure says which one came back rather than only that the set changed.
    const published = publicDeal(STORED) as unknown as Record<string, unknown>;
    for (const withheld of ["id", "order_id", "public_slug", "status", "created_at", "updated_at"]) {
      expect(published[withheld], withheld).toBeUndefined();
    }
  });

  it("gives the date and not the moment of purchase", () => {
    // §5 asks the certificate to carry an issuance date. The exact second
    // somebody bought something is more than the document needs, and this
    // endpoint is unauthenticated.
    expect(publicDeal(STORED).issued_at).toBe("2026-09-06");
    expect(publicDeal(STORED).issued_at).not.toMatch(/T|:/);
  });

  it("accepts a date the ORM handed back as a string, not only as a Date", () => {
    expect(publicDeal({ ...STORED, issued_at: "2025-01-02T03:04:05.000Z" }).issued_at).toBe("2025-01-02");
  });

  it("carries the empty inscription through as null rather than as an empty string", () => {
    // §5: the certificate has one no-inscription state. Two would make the
    // renderer choose between them.
    const empty = publicDeal({ ...STORED, display_name: null, dedication: null });
    expect(empty.display_name).toBeNull();
    expect(empty.dedication).toBeNull();
  });

  it("keeps the layout the deal was issued under, not the current one", () => {
    // Constraint 7. A redesign is additive; this is where a retired layout
    // survives the trip to the renderer.
    expect(publicDeal({ ...STORED, layout_version: 1 }).layout_version).toBe(1);
    expect(publicDeal({ ...STORED, layout_version: 7 }).layout_version).toBe(7);
  });
});

describe("the route", () => {
  it("answers with the deal the slug addresses", async () => {
    const answer = await get(STORED.public_slug, [STORED]);

    expect(answer.status).toBe(200);
    expect(answer.body).toEqual({ deal: publicDeal(STORED) });
    // Resolved by the module's own exported name, not a string written twice.
    expect(answer.resolvedKey).toBe(DEAL_MODULE);
  });

  it("answers 404 for a slug that addresses nothing", async () => {
    const answer = await get("nosuchslugatall1", [STORED]);

    expect(answer.status).toBe(404);
    expect(answer.body).toEqual({ message: "No such deal" });
  });

  it("answers 404 for a hidden certificate, in the same words", async () => {
    // §5 requires an operator to be able to hide a certificate without a new
    // serial and without reissuing. Distinguishing this from "no such deal"
    // would say "there is one here and you may not see it", which makes the
    // address enumerable -- and unenumerability is the entire reason the slug
    // exists. 410 Gone would leak the same fact more politely.
    const hidden = await get(STORED.public_slug, [{ ...STORED, status: "hidden" }]);
    const missing = await get("nosuchslugatall1", []);

    expect(hidden.status).toBe(404);
    expect(hidden).toEqual({ ...missing, resolvedKey: hidden.resolvedKey });
  });

  it("says nothing about a hidden deal in the body it does send", async () => {
    // The stronger half of the assertion above: not merely that the two
    // responses match, but that neither carries the inscription, the serial or
    // the tier of the deal it declined to serve.
    const answer = await get(STORED.public_slug, [{ ...STORED, status: "hidden" }]);
    const body = JSON.stringify(answer.body);

    expect(body).not.toContain("Jane Example");
    expect(body).not.toContain("worth every cent");
    expect(body).not.toContain("4102");
    expect(body).not.toContain("Lousy Deal Pro");
  });

  it("looks a deal up by its slug and by nothing else", async () => {
    // A filter that fell back to listing everything would answer the first
    // deal in the table for any slug at all.
    const answer = await get("wrongslugentirely", [STORED]);
    expect(answer.status).toBe(404);
  });
});
