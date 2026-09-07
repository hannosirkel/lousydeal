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

/**
 * The same row as a real gift, with §6's four columns populated.
 *
 * **Typed through `Record` rather than `StoredDeal`**, deliberately.
 * `StoredDeal` is the route's own narrow view and does not declare the gift
 * columns — but `listLousyDeals` returns the whole row at runtime, so this is
 * what the projection is actually handed. A fixture that could not carry the
 * private columns would make every assertion below vacuous, which is exactly
 * the mistake LD-02's Gate E made with the billing name: it looked for
 * something that did not exist and found it absent.
 */
const GIFT_VALUES = {
  gift_recipient_email: "recipient@example.test",
  gift_recipient_name: "A. Recipient",
  gift_sender_name: "A. Buyer",
  gift_message: "Happy birthday",
} as const;

const STORED_GIFT = { ...STORED, ...GIFT_VALUES } as unknown as StoredDeal;

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

describe("a gift reaches no public surface", () => {
  /**
   * LD-03's constraint 4, enforced rather than intended.
   *
   * The recipient's name and address are a third party's, supplied by somebody
   * else, and the operator settled on 2026-09-07 that they are never
   * published. `lousy_deal` carries them; this endpoint must not.
   *
   * **Every assertion here runs against a row that actually holds them.**
   * That is the whole point of the row: LD-02's Gate E checked the rendered
   * certificate for a billing name against an order that had none, so it
   * proved nothing. This proves something.
   */
  it("publishes none of §6's four columns, from a row that carries all four", () => {
    const published = publicDeal(STORED_GIFT);

    for (const column of Object.keys(GIFT_VALUES)) {
      expect(Object.keys(published), column).not.toContain(column);
    }
    // And by value, not only by key name: a column renamed on the way out
    // would pass the check above and leak the same data.
    const serialised = JSON.stringify(published);
    for (const [column, value] of Object.entries(GIFT_VALUES)) {
      expect(serialised, column).not.toContain(value);
    }
  });

  it("publishes the same eight fields for a gift as for an ordinary purchase", () => {
    // A gift is an order like any other. If these key sets ever differ, the
    // endpoint has started telling a stranger which certificates were gifts.
    expect(Object.keys(publicDeal(STORED_GIFT)).sort()).toEqual(Object.keys(publicDeal(STORED)).sort());
  });

  it("answers a gift's slug with nothing a recipient did not already have", async () => {
    // Through the route rather than the projection, because a handler that
    // reached past `publicDeal` would pass every assertion above.
    const { status, body } = await get("xbts2k3mmv3trv3n", [STORED_GIFT]);

    expect(status).toBe(200);
    const serialised = JSON.stringify(body);
    for (const value of Object.values(GIFT_VALUES)) {
      expect(serialised).not.toContain(value);
    }
  });

  it("does not let a gift be told apart from a purchase by its shape", async () => {
    // Not the same object -- the slugs differ -- but the same keys, at every
    // level. A response that carried `gift: null` for one and nothing for the
    // other would be a disclosure by omission.
    const gift = await get("xbts2k3mmv3trv3n", [STORED_GIFT]);
    const plain = await get("xbts2k3mmv3trv3n", [STORED]);

    const shape = (body: unknown): string[] =>
      Object.keys((body as { deal: Record<string, unknown> }).deal).sort();
    expect(shape(gift.body)).toEqual(shape(plain.body));
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
