/**
 * Placing the Printful order exactly once.
 *
 * Driven over the two seams with fakes, so the sequences that matter — a
 * process dying between the call and the write, a lost response, two workers
 * arriving together — can be staged deliberately. A database cannot be asked
 * for any of them on demand, which is the argument `deal/issue.ts` makes for
 * the same shape.
 */

import { describe, expect, it } from "vitest";

import {
  submitPrintfulOrder,
  type PrintfulOrders,
  type PrintfulSubmissionRecord,
  type RemotePrintfulOrder,
  type SubmissionStore,
} from "../src/modules/printful/submission";

const RECIPIENT = {
  name: "A Buyer",
  address1: "1 Test St",
  city: "Tallinn",
  countryCode: "EE",
  postcode: "10111",
  province: null,
};

const LINES = [{ syncVariantId: 5488997617, quantity: 1 }];

const INPUT = {
  orderId: "order_01",
  lines: LINES,
  recipient: RECIPIENT,
  submittedAt: new Date("2026-09-09T10:00:00Z"),
};

/** A store over a plain array, with the unique index the migration writes. */
function fakeStore(seed: PrintfulSubmissionRecord[] = []) {
  const rows = [...seed];
  let next = seed.length + 1;
  return {
    rows,
    store: {
      listPrintfulSubmissions: ({ order_id }: { order_id: string }) =>
        Promise.resolve(rows.filter((row) => row.order_id === order_id)),
      createPrintfulSubmissions: (data: Record<string, unknown>) => {
        const order_id = String(data.order_id);
        if (rows.some((row) => row.order_id === order_id)) {
          // What Postgres does with the partial unique index, in the shape a
          // caller sees it: an error, not a second row.
          return Promise.reject(new Error("duplicate key value violates unique constraint"));
        }
        const row = { id: `sub_${String(next++)}`, ...data } as unknown as PrintfulSubmissionRecord;
        rows.push(row);
        return Promise.resolve(row);
      },
      updatePrintfulSubmissions: (data: Record<string, unknown>) => {
        const index = rows.findIndex((row) => row.id === data.id);
        const updated = { ...rows[index], ...data } as unknown as PrintfulSubmissionRecord;
        rows[index] = updated;
        return Promise.resolve(updated);
      },
    } satisfies SubmissionStore,
  };
}

/** Printful, with the `external_id` uniqueness the live API was measured to have. */
function fakePrintful(options: { failCreate?: Error; seed?: RemotePrintfulOrder[] } = {}) {
  const remote = new Map<string, RemotePrintfulOrder>();
  for (const order of options.seed ?? []) remote.set("order_01", order);
  const calls = { create: 0, find: 0 };
  return {
    calls,
    remote,
    orders: {
      findByExternalId: (externalId: string) => {
        calls.find += 1;
        return Promise.resolve(remote.get(externalId) ?? null);
      },
      create: ({ externalId }: Parameters<PrintfulOrders["create"]>[0]) => {
        calls.create += 1;
        if (options.failCreate) return Promise.reject(options.failCreate);
        if (remote.has(externalId)) {
          // OR-13, measured: "Order with this External ID already exists".
          return Promise.reject(new Error("Printful POST /orders failed with 400: Order with this External ID already exists"));
        }
        const created = { id: `pf_${externalId}`, status: "draft" };
        remote.set(externalId, created);
        return Promise.resolve(created);
      },
    } satisfies PrintfulOrders,
  };
}

describe("the ordinary case", () => {
  it("places the order and records it", async () => {
    const { store, rows } = fakeStore();
    const printful = fakePrintful();

    const result = await submitPrintfulOrder(store, printful.orders, INPUT);

    expect(printful.calls.create).toBe(1);
    expect(result.printful_order_id).toBe("pf_order_01");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.order_id).toBe("order_01");
  });

  it("hands Printful the Medusa order id as the external id", async () => {
    // The whole guarantee rests on this one field carrying this one value. A
    // generated id, or the cart's, would make the remote constraint guard
    // something that is not the order.
    const { store } = fakeStore();
    const printful = fakePrintful();
    await submitPrintfulOrder(store, printful.orders, INPUT);
    expect([...printful.remote.keys()]).toEqual(["order_01"]);
  });

  it("counts the attempt", async () => {
    const { rows } = fakeStore();
    const store = fakeStore().store;
    const printful = fakePrintful();
    const result = await submitPrintfulOrder(store, printful.orders, INPUT);
    expect(result.attempts).toBe(1);
    expect(rows).toHaveLength(0);
  });
});

describe("what a created order actually is, today", () => {
  it("is a draft, recorded as submitted, with the draft still visible", async () => {
    // **Asserted rather than left implied, because it is a loose end.** A v1
    // create yields `status: draft` -- measured against the live API -- and
    // nobody prints a draft until it is confirmed through a separate
    // endpoint.
    //
    // Correct for this row, which works out how to place an order exactly once
    // and stops there; confirmation is the step that spends the money. Wrong
    // the moment anything treats `submitted` as "a parcel is coming". P8b
    // confirms, and when it does this assertion fails and must change with it.
    const { store } = fakeStore();
    const result = await submitPrintfulOrder(store, fakePrintful().orders, INPUT);

    expect(result.status).toBe("submitted");
    // The honest half, and what makes the gap findable in the database rather
    // than only in this comment: the remote word is kept as it came.
    expect(result.printful_status).toBe("draft");
  });
});

describe("the same order, arriving again", () => {
  it("returns the record without calling Printful", async () => {
    // Medusa's event bus delivers at least once and Stripe retries webhooks.
    // Neither is a fault, so neither may reach the network a second time.
    const { store } = fakeStore();
    const printful = fakePrintful();

    await submitPrintfulOrder(store, printful.orders, INPUT);
    const second = await submitPrintfulOrder(store, printful.orders, INPUT);

    expect(printful.calls.create).toBe(1);
    expect(second.printful_order_id).toBe("pf_order_01");
  });

  it("does not place a second order however many times it arrives", async () => {
    const { store } = fakeStore();
    const printful = fakePrintful();
    for (let i = 0; i < 5; i += 1) await submitPrintfulOrder(store, printful.orders, INPUT);
    expect(printful.calls.create).toBe(1);
    expect(printful.remote.size).toBe(1);
  });
});

describe("the window a local table cannot close", () => {
  /**
   * **The reason this file exists.** The worker calls Printful, the order is
   * created and the money is committed, and the process dies before writing
   * anything down. The redelivery finds no local row — correctly, there is
   * none — and tries again.
   *
   * A unique index on `order_id` does nothing here: there is nothing to
   * collide with. What stops the second charge is Printful refusing the
   * duplicate `external_id`, and this shop asking what happened rather than
   * reading the refusal.
   */
  it("recovers the order it already placed instead of placing another", async () => {
    const printful = fakePrintful();
    const first = fakeStore();

    // The first attempt reaches Printful and then loses everything local.
    await printful.orders.create({ externalId: "order_01", recipient: RECIPIENT, lines: LINES });
    expect(printful.remote.size).toBe(1);

    // A fresh, empty store: the crash left no trace.
    const result = await submitPrintfulOrder(first.store, printful.orders, INPUT);

    expect(result.status).toBe("submitted");
    expect(result.printful_order_id).toBe("pf_order_01");
    // Two creates were attempted; only one order exists.
    expect(printful.calls.create).toBe(2);
    expect(printful.remote.size).toBe(1);
  });

  it("recovers from a lost response, where there is no error code to read", async () => {
    // A timeout after Printful committed looks nothing like OR-13 and has to
    // be handled by the same path. Detecting the duplicate by its error code
    // would miss this exactly.
    const printful = fakePrintful({ failCreate: new Error("socket hang up") });
    printful.remote.set("order_01", { id: "pf_order_01", status: "pending" });
    const { store } = fakeStore();

    const result = await submitPrintfulOrder(store, printful.orders, INPUT);

    expect(result.status).toBe("submitted");
    expect(result.printful_order_id).toBe("pf_order_01");
    expect(printful.calls.find).toBe(1);
  });
});

describe("an order that was cancelled at Printful", () => {
  /**
   * Deleting a Printful order cancels it and **keeps the external id taken** —
   * measured. So the id can never be reused, and a shop treating any
   * successful look-up as "already handled" would record a parcel that is not
   * coming and say nothing to anybody.
   */
  it("records it as cancelled rather than as submitted", async () => {
    const printful = fakePrintful({ failCreate: new Error("Order with this External ID already exists") });
    printful.remote.set("order_01", { id: "pf_order_01", status: "canceled" });
    const { store } = fakeStore();

    const result = await submitPrintfulOrder(store, printful.orders, INPUT);

    expect(result.status).toBe("canceled");
    expect(result.printful_status).toBe("canceled");
  });

  it("accepts the other spelling too, since the field is somebody else's", async () => {
    const printful = fakePrintful({ failCreate: new Error("taken") });
    printful.remote.set("order_01", { id: "pf_order_01", status: "cancelled" });
    const { store } = fakeStore();
    expect((await submitPrintfulOrder(store, printful.orders, INPUT)).status).toBe("canceled");
  });

  it("does not try again, because the id cannot be reused", async () => {
    const printful = fakePrintful({ failCreate: new Error("taken") });
    printful.remote.set("order_01", { id: "pf_order_01", status: "canceled" });
    const { store } = fakeStore();

    await submitPrintfulOrder(store, printful.orders, INPUT);
    const before = printful.calls.create;
    await submitPrintfulOrder(store, printful.orders, INPUT);

    expect(printful.calls.create).toBe(before);
  });
});

describe("an order with nothing to post", () => {
  it("records the negative answer rather than leaving no row", async () => {
    // Most orders here are this one. A shop that left them unrecorded would
    // re-decide every certificate order on every redelivery, forever.
    const { store, rows } = fakeStore();
    const printful = fakePrintful();

    const result = await submitPrintfulOrder(store, printful.orders, { ...INPUT, lines: [] });

    expect(result.status).toBe("skipped");
    expect(printful.calls.create).toBe(0);
    expect(rows).toHaveLength(1);
  });

  it("skips rather than orders when there is no address to send to", async () => {
    // Merch with no usable address is a bug upstream, and guessing an address
    // is the one response that would put a parcel somewhere real.
    const { store } = fakeStore();
    const printful = fakePrintful();
    const result = await submitPrintfulOrder(store, printful.orders, { ...INPUT, recipient: null });
    expect(result.status).toBe("skipped");
    expect(printful.calls.create).toBe(0);
  });

  it("counts no attempt for a skip, because nothing was attempted", async () => {
    const { store } = fakeStore();
    const result = await submitPrintfulOrder(store, fakePrintful().orders, { ...INPUT, lines: [] });
    expect(result.attempts).toBe(1);
    expect(result.submitted_at).toBeNull();
  });
});

describe("a failure that really is one", () => {
  it("records it and rethrows, so a paid order does not look delivered", async () => {
    const printful = fakePrintful({ failCreate: new Error("Printful POST /orders failed with 500: upstream") });
    const { store, rows } = fakeStore();

    await expect(submitPrintfulOrder(store, printful.orders, INPUT)).rejects.toThrow("upstream");

    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("failed");
    expect(rows[0]?.printful_order_id).toBeNull();
  });

  it("lets a later attempt try again, and counts them", async () => {
    // `failed` is the one state that is not terminal: an outage that is over
    // should be recoverable by the next redelivery rather than by a person.
    const failing = fakePrintful({ failCreate: new Error("upstream") });
    const { store, rows } = fakeStore();
    await expect(submitPrintfulOrder(store, failing.orders, INPUT)).rejects.toThrow();
    expect(rows[0]?.attempts).toBe(1);

    const working = fakePrintful();
    const result = await submitPrintfulOrder(store, working.orders, INPUT);

    expect(result.status).toBe("submitted");
    expect(result.attempts).toBe(2);
    // Updated in place: one order, one row, whatever happened on the way.
    expect(rows).toHaveLength(1);
  });

  it("keeps the failure readable without keeping the error object", async () => {
    const printful = fakePrintful({ failCreate: new Error("Printful POST /orders failed with 500: upstream") });
    const { store, rows } = fakeStore();
    await expect(submitPrintfulOrder(store, printful.orders, INPUT)).rejects.toThrow();
    expect(rows[0]?.last_error).toContain("500");
    expect(typeof rows[0]?.last_error).toBe("string");
  });

  it("survives something thrown that is not an Error", async () => {
    const printful = { findByExternalId: () => Promise.resolve(null), create: () => Promise.reject("nope") };
    const { store, rows } = fakeStore();
    await expect(submitPrintfulOrder(store, printful, INPUT)).rejects.toBeDefined();
    expect(rows[0]?.last_error).toBe("nope");
  });
});

describe("two workers arriving together", () => {
  it("places one order between them", async () => {
    // Both pass the local look-up, because neither has written anything yet.
    // The remote constraint is what decides it, and the loser asks what
    // happened rather than reading the refusal.
    const { store } = fakeStore();
    const printful = fakePrintful();

    const [a, b] = await Promise.all([
      submitPrintfulOrder(store, printful.orders, INPUT),
      submitPrintfulOrder(store, printful.orders, INPUT),
    ]);

    expect(printful.remote.size).toBe(1);
    expect(a.printful_order_id).toBe("pf_order_01");
    expect(b.printful_order_id).toBe("pf_order_01");
  });
});

describe("the local write losing its own race", () => {
  it("adopts the row the other worker wrote instead of failing", async () => {
    // **Found by the concurrency test above, not by reading the code.** Both
    // workers end up holding the same remote order -- Printful settles that --
    // and then both try to write it down. The loser of *that* race would have
    // reported a failure for an order Printful had correctly accepted.
    const { store, rows } = fakeStore();
    const printful = fakePrintful();
    await submitPrintfulOrder(store, printful.orders, INPUT);

    // A worker whose own look-up came back empty a moment before the other one
    // inserted: empty the first time it asks, truthful afterwards.
    const raced = { ...store, listPrintfulSubmissions: emptyThenTruthful(store) };
    const recovered = await submitPrintfulOrder(raced, printful.orders, INPUT);

    expect(recovered.printful_order_id).toBe("pf_order_01");
    expect(rows).toHaveLength(1);
  });

  it("rethrows a write failure that is not a collision", async () => {
    // A dead connection leaves no row behind, and swallowing it would leave a
    // paid order looking recorded.
    const printful = fakePrintful();
    const broken = {
      listPrintfulSubmissions: () => Promise.resolve([]),
      createPrintfulSubmissions: () => Promise.reject(new Error("connection terminated")),
      updatePrintfulSubmissions: () => Promise.reject(new Error("unreachable")),
    } satisfies SubmissionStore;

    await expect(submitPrintfulOrder(broken, printful.orders, INPUT)).rejects.toThrow("connection terminated");
  });
});

/**
 * A look-up that answers "nothing" the first time and the truth afterwards --
 * which is what a worker sees when another one inserts between its own two
 * calls.
 */
function emptyThenTruthful(store: SubmissionStore) {
  let asked = false;
  return (filters: { order_id: string }) => {
    if (!asked) {
      asked = true;
      return Promise.resolve([]);
    }
    return store.listPrintfulSubmissions(filters);
  };
}
