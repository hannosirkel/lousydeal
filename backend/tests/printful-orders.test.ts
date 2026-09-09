/**
 * The order adapter: field names, endpoints, and API versions.
 *
 * **This is the layer that has been wrong before.** `shipping.ts` read `id`
 * and `name` from a rate where Printful sends `shipping` and
 * `shipping_method_name`, dropped every option, and refused every quote — and
 * the unit tests passed, because the fixtures agreed with the guess. So the
 * fixtures here are the shapes the live API actually returned on 2026-09-09,
 * and the calls are asserted by path as well as by result.
 */

import { describe, expect, it } from "vitest";

import { PrintfulError, type PrintfulClient } from "../src/modules/printful/client";
import { createPrintfulOrders } from "../src/modules/printful/orders";

const RECIPIENT = {
  name: "A Buyer",
  address1: "1 Test St",
  city: "Tallinn",
  countryCode: "EE",
  postcode: "10111",
  province: null,
};

interface Call {
  readonly method: string;
  readonly path: string;
  readonly body?: unknown;
}

function fakeClient(responder: (call: Call) => unknown) {
  const calls: Call[] = [];
  const client: PrintfulClient = {
    request: <T,>(method: string, path: string, body?: unknown): Promise<T> => {
      const call = { method, path, body };
      calls.push(call);
      const answer = responder(call);
      return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer as T);
    },
  };
  return { calls, orders: createPrintfulOrders(client) };
}

/** The variant look-up, which every create makes first. */
const variant = (call: Call) =>
  call.path.startsWith("/store/variants/@") ? { result: { sync_variant: { id: 5488997617 } } } : undefined;

describe("finding an order that may not exist", () => {
  it("asks v2 by external id, in the @ form the spec documents", async () => {
    const { calls, orders } = fakeClient(() => ({ data: { id: 175705264, status: "draft" } }));
    const found = await orders.findByExternalId("order_01");

    expect(calls[0]?.method).toBe("GET");
    expect(calls[0]?.path).toBe("/v2/orders/@order_01");
    expect(found).toEqual({ id: "175705264", status: "draft" });
  });

  it("returns nothing for a 404, because a missing order is an ordinary answer", async () => {
    const { orders } = fakeClient(() => new PrintfulError("GET", "/v2/orders/@x", 404, "Not Found"));
    expect(await orders.findByExternalId("order_01")).toBeNull();
  });

  it("rethrows any other failure rather than reporting no order", async () => {
    // **The dangerous simplification.** Treating every error as "not found"
    // would let `submission.ts` record a failure for an order Printful is
    // holding -- and then a later attempt would create a second one, except
    // that Printful would refuse it, leaving a paid order permanently marked
    // failed.
    for (const status of [401, 429, 500]) {
      const { orders } = fakeClient(() => new PrintfulError("GET", "/v2/orders/@x", status, "nope"));
      await expect(orders.findByExternalId("order_01")).rejects.toThrow(PrintfulError);
    }
  });

  it("escapes an id that would otherwise change the path", async () => {
    const { calls, orders } = fakeClient(() => ({ data: { id: 1, status: "draft" } }));
    await orders.findByExternalId("order/../../admin");
    expect(calls[0]?.path).toBe("/v2/orders/@order%2F..%2F..%2Fadmin");
  });
});

describe("creating one", () => {
  it("posts to v1, because v2 cannot order a sync variant", async () => {
    // Measured: `POST /v2/orders` answers "Invalid source specified `sync`.
    // Source must be one of: catalog, warehouse, product_template".
    const { calls, orders } = fakeClient(
      (call) => variant(call) ?? { result: { id: 175705264, status: "draft" } },
    );

    await orders.create({ externalId: "order_01", recipient: RECIPIENT, lines: [{ sku: "LD-STK-4", quantity: 2 }] });

    const create = calls.find((call) => call.method === "POST");
    expect(create?.path).toBe("/orders");
  });

  it("resolves each SKU through the join sync.ts already made", async () => {
    // Each sync variant's `external_id` is its SKU, so Printful is already
    // keeping this mapping and nothing here stores a second copy that could
    // drift from the products.
    const { calls, orders } = fakeClient(
      (call) => variant(call) ?? { result: { id: 1, status: "draft" } },
    );

    await orders.create({
      externalId: "order_01",
      recipient: RECIPIENT,
      lines: [{ sku: "LD-STK-4", quantity: 2 }],
    });

    expect(calls[0]?.path).toBe("/store/variants/@LD-STK-4");
    expect(calls.find((call) => call.method === "POST")?.body).toMatchObject({
      external_id: "order_01",
      items: [{ sync_variant_id: 5488997617, quantity: 2 }],
    });
  });

  it("refuses to order when a SKU is not in the store", async () => {
    // Dropping the line would post a parcel missing something somebody paid
    // for, which is the one outcome worse than not posting it.
    const { orders } = fakeClient((call) =>
      call.path.startsWith("/store/variants/@") ? { result: {} } : { result: { id: 1, status: "draft" } },
    );

    await expect(
      orders.create({ externalId: "order_01", recipient: RECIPIENT, lines: [{ sku: "LD-GONE", quantity: 1 }] }),
    ).rejects.toThrow(/no sync variant for SKU LD-GONE/);
  });

  it("sends the recipient in Printful's field names, not ours", async () => {
    const { calls, orders } = fakeClient((call) => variant(call) ?? { result: { id: 1, status: "draft" } });
    await orders.create({ externalId: "o", recipient: RECIPIENT, lines: [{ sku: "LD-STK-4", quantity: 1 }] });

    expect(calls.find((call) => call.method === "POST")?.body).toMatchObject({
      recipient: { name: "A Buyer", address1: "1 Test St", city: "Tallinn", country_code: "EE", zip: "10111" },
    });
  });

  it("omits the state entirely where there is not one", async () => {
    // An empty `state_code` is rejected rather than ignored -- the same class
    // of thing `shipping.ts` found when it sent a partial address.
    const { calls, orders } = fakeClient((call) => variant(call) ?? { result: { id: 1, status: "draft" } });
    await orders.create({ externalId: "o", recipient: RECIPIENT, lines: [{ sku: "LD-STK-4", quantity: 1 }] });

    const body = calls.find((call) => call.method === "POST")?.body as { recipient: Record<string, string> };
    expect(Object.keys(body.recipient)).not.toContain("state_code");
  });

  it("sends the state where there is one, trimmed", async () => {
    const { calls, orders } = fakeClient((call) => variant(call) ?? { result: { id: 1, status: "draft" } });
    await orders.create({
      externalId: "o",
      recipient: { ...RECIPIENT, countryCode: "US", province: " NY " },
      lines: [{ sku: "LD-STK-4", quantity: 1 }],
    });

    const body = calls.find((call) => call.method === "POST")?.body as { recipient: Record<string, string> };
    expect(body.recipient.state_code).toBe("NY");
  });

  it("treats a blank province as no province", async () => {
    const { calls, orders } = fakeClient((call) => variant(call) ?? { result: { id: 1, status: "draft" } });
    await orders.create({
      externalId: "o",
      recipient: { ...RECIPIENT, province: "   " },
      lines: [{ sku: "LD-STK-4", quantity: 1 }],
    });

    const body = calls.find((call) => call.method === "POST")?.body as { recipient: Record<string, string> };
    expect(Object.keys(body.recipient)).not.toContain("state_code");
  });

  it("reads the id and status out of v1's envelope, which is not v2's", async () => {
    // v1 answers `{code, result, error}` and v2 `{data, error}`. Reading the
    // wrong one is how `shipping.ts` came to drop every option.
    const { orders } = fakeClient((call) => variant(call) ?? { result: { id: 175705264, status: "draft" } });
    const created = await orders.create({
      externalId: "o",
      recipient: RECIPIENT,
      lines: [{ sku: "LD-STK-4", quantity: 1 }],
    });
    expect(created).toEqual({ id: "175705264", status: "draft" });
  });
});

describe("confirming one", () => {
  it("posts to the v2 confirmation endpoint", async () => {
    const { calls, orders } = fakeClient(() => ({ data: { id: 175705264, status: "pending" } }));
    const confirmed = await orders.confirm("175705264");

    expect(calls[0]).toMatchObject({ method: "POST", path: "/v2/orders/175705264/confirmation" });
    expect(confirmed).toEqual({ id: "175705264", status: "pending" });
  });
});

describe("an answer this cannot read", () => {
  it("is a plain error, not a Printful one, because nothing failed", async () => {
    // `submission.ts` handles a failure by asking Printful what exists. If a
    // malformed success were reported as a transport failure it would ask, be
    // told the order exists, and record the same unreadable thing again.
    const { orders } = fakeClient(() => ({ data: { id: null, status: "draft" } }));
    await expect(orders.findByExternalId("o")).rejects.toThrow(/without a usable id and status/);
    await expect(orders.findByExternalId("o")).rejects.not.toThrow(PrintfulError);
  });

  it("catches a missing status as well as a missing id", async () => {
    const { orders } = fakeClient(() => ({ data: { id: 1 } }));
    await expect(orders.findByExternalId("o")).rejects.toThrow(/without a usable id and status/);
  });

  it("accepts an id that arrives as a string, since it is an identifier", async () => {
    const { orders } = fakeClient(() => ({ data: { id: "175705264", status: "draft" } }));
    expect(await orders.findByExternalId("o")).toEqual({ id: "175705264", status: "draft" });
  });
});
