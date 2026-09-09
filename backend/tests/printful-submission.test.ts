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

const LINES = [{ sku: "LD-STK-4", quantity: 1 }];

const INPUT = {
  orderId: "order_01",
  lines: LINES,
  recipient: RECIPIENT,
  submittedAt: new Date("2026-09-09T10:00:00Z"),
  unorderable: 0,
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
function fakePrintful(options: { failCreate?: Error; failConfirm?: Error; seed?: RemotePrintfulOrder[] } = {}) {
  const remote = new Map<string, RemotePrintfulOrder>();
  for (const order of options.seed ?? []) remote.set("order_01", order);
  const calls = { create: 0, find: 0, confirm: 0 };
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
        // Measured: a v1 create answers `draft`. Nothing prints a draft.
        const created = { id: `pf_${externalId}`, status: "draft" };
        remote.set(externalId, created);
        return Promise.resolve(created);
      },
      confirm: (printfulOrderId: string) => {
        calls.confirm += 1;
        if (options.failConfirm) return Promise.reject(options.failConfirm);
        const key = [...remote.keys()].find((k) => remote.get(k)?.id === printfulOrderId);
        const confirmed = { id: printfulOrderId, status: "pending" };
        if (key !== undefined) remote.set(key, confirmed);
        return Promise.resolve(confirmed);
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

describe("confirming, which is the call that spends the money", () => {
  /**
   * **P8a recorded a draft as `submitted` and said so in a failing-on-purpose
   * assertion; this is that assertion inverted.** A created order is a draft,
   * nothing prints a draft, and confirmation is a separate endpoint that v2
   * describes as starting fulfilment in the production facility.
   */
  it("confirms a freshly created order and records what came back", async () => {
    const { store } = fakeStore();
    const printful = fakePrintful();

    const result = await submitPrintfulOrder(store, printful.orders, INPUT);

    expect(printful.calls.confirm).toBe(1);
    expect(result.status).toBe("submitted");
    expect(result.printful_status).toBe("pending");
    expect(result.submitted_at).not.toBeNull();
  });

  it("confirms a recovered draft, which is what a crash between the two leaves", async () => {
    // The case this two-call shape exists for. An atomic create-and-confirm
    // would make this crash indistinguishable from one that never created
    // anything.
    const printful = fakePrintful();
    printful.remote.set("order_01", { id: "pf_order_01", status: "draft" });
    const { store } = fakeStore();

    const result = await submitPrintfulOrder(store, printful.orders, INPUT);

    expect(printful.calls.confirm).toBe(1);
    expect(result.status).toBe("submitted");
  });

  it("does not confirm an order that is already past draft", async () => {
    // Confirming twice is not obviously harmless and there is no reason to
    // find out.
    const printful = fakePrintful();
    printful.remote.set("order_01", { id: "pf_order_01", status: "pending" });
    const { store } = fakeStore();

    await submitPrintfulOrder(store, printful.orders, INPUT);

    expect(printful.calls.confirm).toBe(0);
  });

  it("leaves an unconfirmed draft retryable rather than calling it submitted", async () => {
    // **The failure that would otherwise be silent.** The order exists and
    // will never be printed. Recording `submitted` would be the shop telling
    // itself a parcel was coming.
    const printful = fakePrintful({ failConfirm: new Error("Printful POST /v2/orders/1/confirmation failed with 500: upstream") });
    const { store } = fakeStore();

    const result = await submitPrintfulOrder(store, printful.orders, INPUT);

    expect(result.status).toBe("failed");
    expect(result.printful_status).toBe("draft");
    expect(result.submitted_at).toBeNull();
    expect(result.last_error).toContain("500");
  });

  it("does not throw when confirmation fails, because the order exists", async () => {
    // Throwing would be right if nothing had happened. Something has: the
    // order is placed and the external id is taken, so the next redelivery
    // must reach the confirmation rather than the create.
    const printful = fakePrintful({ failConfirm: new Error("upstream") });
    const { store } = fakeStore();

    await expect(submitPrintfulOrder(store, printful.orders, INPUT)).resolves.toBeDefined();

    const working = fakePrintful();
    working.remote.set("order_01", { id: "pf_order_01", status: "draft" });
    const second = await submitPrintfulOrder(store, working.orders, INPUT);

    expect(working.calls.create).toBe(1);
    expect(working.calls.confirm).toBe(1);
    expect(second.status).toBe("submitted");
  });

  it("records a draft that survives confirmation with a reason a person can read", async () => {
    const printful = {
      findByExternalId: () => Promise.resolve(null),
      create: () => Promise.resolve({ id: "pf_1", status: "draft" }),
      confirm: () => Promise.resolve({ id: "pf_1", status: "draft" }),
    };
    const { store } = fakeStore();
    const result = await submitPrintfulOrder(store, printful, INPUT);
    expect(result.status).toBe("failed");
    expect(result.last_error).toMatch(/still a draft/i);
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

describe("an order Printful accepted and could not charge", () => {
  /**
   * **`failed` was filed as a cancellation, and P12i separates them.**
   *
   * Printful's own status table calls it recoverable — *"If a charge or
   * auto-recharge fails, the order gets the 'Failed' status. It won't be sent
   * to fulfillment on its own, so once you've resolved the cause you'll need
   * to submit the order again manually"* — and the dashboard offers the retry.
   * The order exists under its `external_id`, which is the fact that decides
   * whether a later attempt can do anything at all: a cancelled order cannot
   * be replaced under that id and is genuinely terminal; a failed one is a
   * confirmed order with a billing problem in front of it.
   *
   * Filing the recoverable case as the unrecoverable one turned a paid order a
   * person could rescue into one nothing would ever try again.
   *
   * It stopped being hypothetical when Gate E chose to confirm against an
   * account with **no billing method attached** — a procedure whose entire
   * expected artefact is a Printful order in exactly this state.
   */
  it("records it as failed, which is the retryable state", async () => {
    const printful = fakePrintful({ failCreate: new Error("taken") });
    printful.remote.set("order_01", { id: "pf_order_01", status: "failed" });
    const { store } = fakeStore();

    const result = await submitPrintfulOrder(store, printful.orders, INPUT);

    expect(result.status).toBe("failed");
    // And the remote word is kept verbatim, so the record says which of the
    // two this was rather than only how this shop classified it.
    expect(result.printful_status).toBe("failed");
  });

  it("tries again on a later delivery, which a cancellation must not", async () => {
    // The whole difference between the two, expressed as behaviour rather
    // than as a string. `settled()` admits everything but `failed`.
    const printful = fakePrintful({ failCreate: new Error("taken") });
    printful.remote.set("order_01", { id: "pf_order_01", status: "failed" });
    const { store } = fakeStore();

    await submitPrintfulOrder(store, printful.orders, INPUT);
    const before = printful.calls.find;
    await submitPrintfulOrder(store, printful.orders, INPUT);

    expect(printful.calls.find).toBeGreaterThan(before);
  });

  it("leaves a cancellation terminal, which is the half that was already right", async () => {
    const printful = fakePrintful({ failCreate: new Error("taken") });
    printful.remote.set("order_01", { id: "pf_order_01", status: "canceled" });
    const { store } = fakeStore();

    await submitPrintfulOrder(store, printful.orders, INPUT);
    const before = printful.calls.find;
    await submitPrintfulOrder(store, printful.orders, INPUT);

    expect(printful.calls.find).toBe(before);
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

  it("fails rather than skips when there is something to post and nowhere to post it", async () => {
    // **This asserted `skipped`, and its own comment called the case "a bug
    // upstream" while locking in the response that made the bug invisible.**
    //
    // `skipped` is terminal -- `settled()` admits everything but `failed` --
    // and the subscriber logged it at no level, because it was the ordinary
    // answer for the ordinary order. So a paid order whose address was refused
    // was charged, sent to nobody, recorded as unremarkable, and never retried
    // even after an operator fixed the address. Gate D found it.
    const { store } = fakeStore();
    const printful = fakePrintful();
    const result = await submitPrintfulOrder(store, printful.orders, { ...INPUT, recipient: null });

    expect(result.status).toBe("failed");
    expect(result.last_error).toMatch(/no usable delivery address/i);
    // Still not ordered: guessing an address is the one response that would
    // put a parcel somewhere real.
    expect(printful.calls.create).toBe(0);
  });

  it("lets a later attempt succeed once the address is fixed", async () => {
    // The whole point of `failed` over `skipped`: it is the one state a
    // redelivery may act on.
    const { store, rows } = fakeStore();
    const printful = fakePrintful();
    await submitPrintfulOrder(store, printful.orders, { ...INPUT, recipient: null });

    const result = await submitPrintfulOrder(store, printful.orders, INPUT);

    expect(result.status).toBe("submitted");
    expect(printful.calls.create).toBe(1);
    expect(rows).toHaveLength(1);
  });

  it("still skips an order with nothing to post at all", async () => {
    // The other half of the branch these two shared, and the common case:
    // most orders here are one certificate.
    const { store } = fakeStore();
    const printful = fakePrintful();
    const result = await submitPrintfulOrder(store, printful.orders, { ...INPUT, lines: [], recipient: null });
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
    const printful = {
      findByExternalId: () => Promise.resolve(null),
      create: () => Promise.reject("nope"),
      confirm: () => Promise.reject(new Error("unreachable")),
    };
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

describe("an order whose lines could not be read at all", () => {
  /**
   * **The second lock Gate E asked for.**
   *
   * `skipped` is terminal — `settled()` admits everything but `failed` — and
   * it is the right answer for a certificate, which has nothing to post. It
   * was also the answer given to an order that had a shirt in it and could not
   * read the shirt: on 2026-09-09 a real order recorded `skipped` because
   * `quantityOf` rejected Medusa's `BigNumber`, and nothing would ever have
   * looked at it again.
   *
   * The parsing bug is fixed where it lives. This is the lock behind it: no
   * lines *and* something that should have been one is a defect, not an
   * absence, so it is recorded retryable and loud.
   */
  it("records it as failed rather than skipped, so a later attempt can act", async () => {
    const printful = fakePrintful();
    const { store, rows } = fakeStore();

    const record = await submitPrintfulOrder(store, printful.orders, { ...INPUT, lines: [], unorderable: 2 });

    expect(record.status).toBe("failed");
    expect(rows[0]?.status).toBe("failed");
    // And it says what happened, because a `failed` row with no reason is a
    // row somebody has to reconstruct the reason for.
    expect(record.last_error).toMatch(/every line of this order was unreadable: 2/);
  });

  it("sends nothing to Printful, because there is nothing readable to send", async () => {
    const printful = fakePrintful();
    const { store } = fakeStore();

    await submitPrintfulOrder(store, printful.orders, { ...INPUT, lines: [], unorderable: 1 });

    expect(printful.calls.create).toBe(0);
  });

  it("tries again on the next delivery, which is the whole difference", async () => {
    const printful = fakePrintful();
    const { store } = fakeStore();

    await submitPrintfulOrder(store, printful.orders, { ...INPUT, lines: [], unorderable: 1 });
    // The same order, now readable -- an operator fixed it, or a later
    // redelivery carried a complete payload.
    const second = await submitPrintfulOrder(store, printful.orders, INPUT);

    expect(second.status).toBe("submitted");
    expect(printful.calls.create).toBe(1);
  });

  it("still records a certificate-only order as skipped, which is terminal and right", async () => {
    // The branch that must not widen. An order with nothing to post has
    // nothing to retry, and re-deciding it on every redelivery is the cost
    // this state exists to avoid.
    const printful = fakePrintful();
    const { store } = fakeStore();

    const record = await submitPrintfulOrder(store, printful.orders, { ...INPUT, lines: [], unorderable: 0 });

    expect(record.status).toBe("skipped");
    expect(printful.calls.create).toBe(0);
  });
});
