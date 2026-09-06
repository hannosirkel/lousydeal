/**
 * Issuance, and the second delivery of the same event.
 *
 * Contract §16: "Ensure certificate issuance is idempotent. Stripe/webhook
 * retries must not generate duplicate certificates." Both halves are driven
 * here against a fake store, because the interesting cases are the ones a
 * database cannot be asked to stage on demand — two workers passing the same
 * check at the same instant, and an insert that fails for a reason other than
 * a duplicate.
 *
 * The fake is a `Map` keyed by `order_id` with the same unique behaviour the
 * partial index has, and `serial` from a counter standing in for the sequence.
 * That the real column is sequence-backed and the real index refuses a
 * duplicate was proven against PostgreSQL in C1 and is not re-asserted here.
 */

import { describe, expect, it, vi } from "vitest";

import { DEAL_INSCRIPTION_LIMITS, DEAL_INSCRIPTION_METADATA, readInscription } from "../src/modules/deal/inscription";
import { issueDeal, type DealStore, type IssuedDeal } from "../src/modules/deal/issue";
import { CURRENT_CERTIFICATE_LAYOUT } from "../src/modules/deal/models/lousy-deal";
import { SLUG_ALPHABET, SLUG_LENGTH } from "../src/modules/deal/slug";

const INPUT = {
  orderId: "order_01",
  tier: "Lousy Deal Pro",
  amountPaid: 25,
  currencyCode: "usd",
  displayName: null,
  dedication: null,
  issuedAt: new Date("2026-09-06T10:00:00.000Z"),
};

/** A store with the one constraint that matters: `order_id` is unique. */
function fakeStore(): DealStore & {
  rows: Map<string, IssuedDeal & Record<string, unknown>>;
  creates: number;
  /** What issuance asked to be written, before the store added anything of its own. */
  written: Record<string, unknown>[];
} {
  const rows = new Map<string, IssuedDeal & Record<string, unknown>>();
  let serial = 0;
  const store = {
    rows,
    creates: 0,
    written: [] as Record<string, unknown>[],
    listLousyDeals: async ({ order_id }: { order_id: string }) => {
      const row = rows.get(order_id);
      return row ? [row] : [];
    },
    createLousyDeals: async (data: Record<string, unknown>) => {
      store.creates += 1;
      store.written.push(data);
      const orderId = String(data.order_id);
      if (rows.has(orderId)) throw new Error("Lousy deal with order_id: already exists.");
      serial += 1;
      const row = { ...data, id: `deal_${String(serial)}`, order_id: orderId, serial, public_slug: String(data.public_slug) };
      rows.set(orderId, row);
      return row;
    },
  };
  return store;
}

describe("issuing a deal", () => {
  it("writes everything the certificate is made of, and never chooses the serial", async () => {
    const store = fakeStore();
    const deal = await issueDeal(store, { ...INPUT, displayName: "Jane", dedication: "worth every cent" });
    const written = store.written[0];

    expect(written).toMatchObject({
      order_id: "order_01",
      tier: "Lousy Deal Pro",
      amount_paid: 25,
      currency_code: "usd",
      display_name: "Jane",
      dedication: "worth every cent",
      layout_version: CURRENT_CERTIFICATE_LAYOUT,
      status: "issued",
      issued_at: INPUT.issuedAt,
    });

    // The one column issuance must not name -- asserted against what was
    // *sent* to `create`, not against the stored row, which of course has a
    // serial by then. `serial` defaults to `nextval('lousy_deal_serial_seq')`;
    // sending a value would be this code choosing a certificate number, which
    // is the failure the sequence exists to prevent.
    expect(Object.keys(written ?? {})).not.toContain("serial");
    expect(deal.serial).toBe(1);
    expect(deal.public_slug).toMatch(new RegExp(`^[${SLUG_ALPHABET}]{${SLUG_LENGTH}}$`));
  });

  it("dates the certificate from the order, not from the clock at issuance", async () => {
    // A subscriber can run long after the order -- a backlog, a redelivery, a
    // replay after an outage -- and a certificate dated by whenever the worker
    // caught up would be wrong on its face.
    const store = fakeStore();
    const deal = await issueDeal(store, { ...INPUT, issuedAt: new Date("2025-01-02T03:04:05.000Z") });
    expect(store.rows.get("order_01")?.issued_at).toEqual(new Date("2025-01-02T03:04:05.000Z"));
    expect(deal.serial).toBe(1);
  });

  it("returns the existing certificate on a replay, without touching the sequence", async () => {
    // The ordinary retry: Medusa's event bus delivers at least once and Stripe
    // retries a webhook it did not see acknowledged.
    const store = fakeStore();
    const first = await issueDeal(store, INPUT);
    const second = await issueDeal(store, INPUT);
    const third = await issueDeal(store, INPUT);

    expect(second).toEqual(first);
    expect(third).toEqual(first);
    expect(store.rows.size).toBe(1);
    // The half a plain "one row" assertion misses: a replay that inserted and
    // caught the violation would also leave one row, having consumed two more
    // serials on the way. Nothing after the first delivery reaches `create`.
    expect(store.creates).toBe(1);
  });

  it("returns the winner's certificate when two deliveries pass the read at the same instant", async () => {
    // The race the read-first path cannot prevent, only survive. `list` answers
    // empty once -- as it would for a worker whose read landed before the other
    // worker's insert -- and the insert then loses to the unique index.
    const store = fakeStore();
    const winner = await issueDeal(store, INPUT);

    let firstList = true;
    const racing: DealStore = {
      listLousyDeals: async (filters) => {
        if (firstList) {
          firstList = false;
          return [];
        }
        return store.listLousyDeals(filters);
      },
      createLousyDeals: store.createLousyDeals,
    };

    expect(await issueDeal(racing, INPUT)).toEqual(winner);
    expect(store.rows.size).toBe(1);
  });

  it("rethrows a failure that left no certificate behind", async () => {
    // The discriminator is "does the deal now exist", not what the error said.
    // Medusa's `dbErrorMapper` rewrites a Postgres 23505 into a MedusaError
    // whose text is a sentence, so the SQLSTATE is gone by the time this code
    // sees it -- and a not-null violation, a dropped connection or a bug must
    // not be mistaken for a duplicate and silently swallowed.
    const failing: DealStore = {
      listLousyDeals: async () => [],
      createLousyDeals: async () => {
        throw new Error("connection terminated unexpectedly");
      },
    };

    await expect(issueDeal(failing, INPUT)).rejects.toThrow("connection terminated unexpectedly");
  });

  it("gives two orders two different slugs", async () => {
    const store = fakeStore();
    const one = await issueDeal(store, INPUT);
    const two = await issueDeal(store, { ...INPUT, orderId: "order_02" });

    expect(two.public_slug).not.toBe(one.public_slug);
    expect(two.serial).toBe(2);
  });

  it("passes the random source through, so the slug is not fixed anywhere in issuance", async () => {
    const store = fakeStore();
    const randomBytes = vi.fn((size: number) => Buffer.alloc(size, 5));
    const deal = await issueDeal(store, INPUT, randomBytes);

    expect(randomBytes).toHaveBeenCalled();
    expect(deal.public_slug).toBe(SLUG_ALPHABET[5]?.repeat(SLUG_LENGTH));
  });
});

describe("reading the inscription off an order", () => {
  it("takes both fields from the prefixed metadata keys", () => {
    expect(
      readInscription({
        [DEAL_INSCRIPTION_METADATA.displayName]: "  Jane Example  ",
        [DEAL_INSCRIPTION_METADATA.dedication]: "worth every cent, regrettably",
      }),
    ).toEqual({ displayName: "Jane Example", dedication: "worth every cent, regrettably" });
  });

  it("treats the empty pair as the ordinary case rather than a failure", () => {
    // §5: most buyers leave both blank, and that has to be a representable
    // state rather than an error or an empty string.
    expect(readInscription({})).toEqual({ displayName: null, dedication: null });
    expect(readInscription(null)).toEqual({ displayName: null, dedication: null });
    expect(readInscription(undefined)).toEqual({ displayName: null, dedication: null });
    expect(readInscription({ [DEAL_INSCRIPTION_METADATA.dedication]: "   " })).toEqual({
      displayName: null,
      dedication: null,
    });
  });

  it("refuses anything that is not a string, because the endpoint that writes this is public", () => {
    // `POST /store/carts/:id` validates metadata as `z.record(z.string(),
    // z.unknown())`, so a visitor can put an object, an array or a number
    // under either key on their own cart.
    for (const hostile of [42, true, { toString: () => "x" }, ["x"], null]) {
      expect(readInscription({ [DEAL_INSCRIPTION_METADATA.displayName]: hostile })).toEqual({
        displayName: null,
        dedication: null,
      });
    }
  });

  it("truncates at §5's limits rather than discarding a paid-for inscription", () => {
    const long = "x".repeat(500);
    const read = readInscription({
      [DEAL_INSCRIPTION_METADATA.displayName]: long,
      [DEAL_INSCRIPTION_METADATA.dedication]: long,
    });

    expect(read.displayName).toHaveLength(DEAL_INSCRIPTION_LIMITS.displayName);
    expect(read.dedication).toHaveLength(DEAL_INSCRIPTION_LIMITS.dedication);
    expect(DEAL_INSCRIPTION_LIMITS.dedication).toBe(120);
  });

  it("leaves no trailing space where the cut landed on one", () => {
    // Trimmed after the cut, not only before it: a certificate whose bearer
    // line ends in a space is a rendering defect nobody would look for.
    const value = `${"x".repeat(DEAL_INSCRIPTION_LIMITS.displayName - 1)} yyyy`;
    expect(readInscription({ [DEAL_INSCRIPTION_METADATA.displayName]: value })).toEqual({
      displayName: "x".repeat(DEAL_INSCRIPTION_LIMITS.displayName - 1),
      dedication: null,
    });
  });
});
