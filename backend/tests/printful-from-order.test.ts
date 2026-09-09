/**
 * Reading a Medusa order for the things that have to be posted.
 *
 * A pure function, so the orders that are not the ordinary one can be staged
 * exactly — which is where everything interesting is. `certificateLine` in the
 * subscriber is split the same way for the same reason.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { printfulSubmissionFrom, recipientFrom } from "../src/modules/printful/from-order";

const CERTIFICATES = ["worthless-certificate", "premium-nothing"];

const ADDRESS = {
  first_name: "A",
  last_name: "Buyer",
  address_1: "1 Test St",
  city: "Tallinn",
  country_code: "ee",
  postal_code: "10111",
  province: null,
};

const AT = new Date("2026-09-09T10:00:00Z");

const plan = (order: unknown) => printfulSubmissionFrom(order as never, CERTIFICATES, AT);

describe("which lines get posted", () => {
  it("takes the merch and leaves the certificate", () => {
    const result = plan({
      id: "order_01",
      shipping_address: ADDRESS,
      items: [
        { product_handle: "worthless-certificate", variant_sku: null, detail: { quantity: 1 } },
        { product_handle: "this-mug-cost-extra", variant_sku: "LD-MUG-11", detail: { quantity: 2 } },
      ],
    });
    expect(result?.input.lines).toEqual([{ sku: "LD-MUG-11", quantity: 2 }]);
  });

  it("decides by exclusion, so a new product is posted rather than ignored", () => {
    // **The direction matters.** An allow-list of merch handles would silently
    // stop posting anything the day the catalogue gained a product and the
    // list did not -- and nothing would fail, which is the worst shape a bug
    // can take here.
    const result = plan({
      id: "order_01",
      shipping_address: ADDRESS,
      items: [{ product_handle: "something-invented-next-year", variant_sku: "LD-NEW-1", detail: { quantity: 1 } }],
    });
    expect(result?.input.lines).toEqual([{ sku: "LD-NEW-1", quantity: 1 }]);
  });

  it("reads a SKU from either place Medusa puts it", () => {
    const result = plan({
      id: "order_01",
      shipping_address: ADDRESS,
      items: [{ product_handle: "cap", variant: { sku: "LD-CAP-OS" }, detail: { quantity: 1 } }],
    });
    expect(result?.input.lines).toEqual([{ sku: "LD-CAP-OS", quantity: 1 }]);
  });

  it("falls back to the item's own quantity where there is no detail", () => {
    const result = plan({
      id: "order_01",
      shipping_address: ADDRESS,
      items: [{ product_handle: "cap", variant_sku: "LD-CAP-OS", quantity: 3 }],
    });
    expect(result?.input.lines).toEqual([{ sku: "LD-CAP-OS", quantity: 3 }]);
  });

  it("treats a line with no handle as something to post", () => {
    // The cautious direction, and the same one `cartNeedsAddress` takes. The
    // alternative is a paid-for parcel that quietly never ships.
    const result = plan({
      id: "order_01",
      shipping_address: ADDRESS,
      items: [{ variant_sku: "LD-MUG-11", detail: { quantity: 1 } }],
    });
    expect(result?.input.lines).toHaveLength(1);
  });
});

describe("lines that cannot be ordered", () => {
  it("counts them rather than dropping them quietly", () => {
    // Dropping is what has to happen -- `orders.ts` resolves a SKU against the
    // store and cannot order without one -- but a parcel arriving short with
    // nothing said about it is the failure. The count is what the subscriber
    // logs.
    const result = plan({
      id: "order_01",
      shipping_address: ADDRESS,
      items: [
        { product_handle: "mug", variant_sku: null, detail: { quantity: 1 } },
        { product_handle: "cap", variant_sku: "LD-CAP-OS", detail: { quantity: 1 } },
      ],
    });
    expect(result?.unorderable).toBe(1);
    expect(result?.input.lines).toHaveLength(1);
  });

  it("counts a quantity that is not a usable number", () => {
    for (const quantity of [0, -1, "two", null, Number.NaN]) {
      const result = plan({
        id: "order_01",
        shipping_address: ADDRESS,
        items: [{ product_handle: "mug", variant_sku: "LD-MUG-11", detail: { quantity } }],
      });
      expect(`${String(quantity)}: ${String(result?.unorderable)}`).toBe(`${String(quantity)}: 1`);
    }
  });

  it("reports none for an order of certificates, which skips nothing", () => {
    const result = plan({
      id: "order_01",
      items: [{ product_handle: "worthless-certificate", detail: { quantity: 1 } }],
    });
    expect(result?.unorderable).toBe(0);
    expect(result?.input.lines).toEqual([]);
  });
});

describe("the order itself", () => {
  it("refuses only where there is no id, which is what external_id is built on", () => {
    // The whole idempotency argument rests on this string. An order submitted
    // under the wrong one is an order Printful's uniqueness constraint is
    // guarding nothing about.
    for (const id of [undefined, null, "", "   ", 7]) {
      expect(`${String(id)}: ${String(plan({ id, items: [] }))}`).toBe(`${String(id)}: null`);
    }
  });

  it("returns a plan with no lines rather than nothing for a certificate order", () => {
    // Not `null`. `submitPrintfulOrder` records it as `skipped`, which is what
    // stops the next redelivery deciding this again -- and most orders here
    // are this one.
    const result = plan({ id: "order_01", items: [{ product_handle: "worthless-certificate" }] });
    expect(result).not.toBeNull();
    expect(result?.input.lines).toEqual([]);
  });

  it("survives an order that is nothing like one", () => {
    expect(plan(null)).toBeNull();
    expect(plan({})).toBeNull();
    expect(plan({ id: "order_01" })?.input.lines).toEqual([]);
  });
});

describe("the address", () => {
  it("joins the two name parts Medusa keeps apart", () => {
    expect(recipientFrom(ADDRESS)?.name).toBe("A Buyer");
  });

  it("accepts an address with only one of the two", () => {
    expect(recipientFrom({ ...ADDRESS, last_name: null })?.name).toBe("A");
    expect(recipientFrom({ ...ADDRESS, first_name: "  " })?.name).toBe("Buyer");
  });

  it("refuses one with no name at all, because a courier may refuse the parcel", () => {
    expect(recipientFrom({ ...ADDRESS, first_name: null, last_name: "" })).toBeNull();
  });

  it("upper-cases the country, since Medusa stores it lower", () => {
    expect(recipientFrom(ADDRESS)?.countryCode).toBe("EE");
  });

  it("refuses a partial address rather than sending one", () => {
    // A partial address is not a cheaper order, it is a rejected one --
    // `shipping.ts` learned the same thing quoting postage.
    for (const missing of ["address_1", "city", "country_code", "postal_code"] as const) {
      expect(`${missing}: ${String(recipientFrom({ ...ADDRESS, [missing]: null }))}`).toBe(`${missing}: null`);
      expect(`${missing}: ${String(recipientFrom({ ...ADDRESS, [missing]: "  " }))}`).toBe(`${missing}: null`);
    }
  });

  it("carries a province where there is one and null where there is not", () => {
    expect(recipientFrom({ ...ADDRESS, province: "NY" })?.province).toBe("NY");
    expect(recipientFrom(ADDRESS)?.province).toBeNull();
    expect(recipientFrom({ ...ADDRESS, province: "   " })?.province).toBeNull();
  });

  it("is absent for an order that was never given one", () => {
    expect(recipientFrom(null)).toBeNull();
    expect(recipientFrom(undefined)).toBeNull();
    expect(plan({ id: "order_01", items: [] })?.input.recipient).toBeNull();
  });
});

describe("where the submission sits in the subscriber", () => {
  /**
   * **A wiring fact no unit test can reach, and mutation proved it.**
   *
   * Moving `submitMerch` three lines down — below `if (line.kind === "none")
   * return` — passed every test in this repository. That early return is
   * correct for the certificate: an order with none has nothing to issue. But
   * **an order of merch alone is exactly that order**, so a call placed after
   * it would mean the one cart shape that is nothing but parcels never
   * reached Printful, and nothing would fail. The buyer pays and waits.
   *
   * So it is asserted against the source, with comments stripped, which is the
   * disposition `checkout-address.test.ts` settled for the pay gate and
   * `baldrick-widget.test.ts` before it.
   */
  const source = // `__dirname`, not `import.meta.url`: `tsconfig.test.json` compiles this
    // to CommonJS, where the meta-property is a compile error.
    readFileSync(join(__dirname, "../src/subscribers/order-placed.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

  it("calls Printful before the certificate's early return, not after it", () => {
    const submits = source.indexOf("await submitMerch(");
    const returnsEarly = source.indexOf('line.kind === "none"');

    expect(submits).toBeGreaterThan(-1);
    expect(returnsEarly).toBeGreaterThan(-1);
    expect(`merch call first: ${String(submits < returnsEarly)}`).toBe("merch call first: true");
  });

  /**
   * `submitMerch` alone, and **the first version of this ran to the end of the
   * file.** The catch it was asserting belonged to `sendConfirmation`, so
   * deleting the one that matters passed. A slice with no end is not a
   * function body.
   */
  const submitMerch = (() => {
    const start = source.indexOf("async function submitMerch(");
    const end = source.indexOf("\n}\n", start);
    return source.slice(start, end);
  })();

  it("is bounded to the one function, so a neighbour's catch cannot satisfy it", () => {
    expect(submitMerch).toContain("async function submitMerch(");
    expect(submitMerch).not.toContain("async function sendConfirmation(");
  });

  it("keeps the two failures apart, so neither can take the other down", () => {
    // Two independent obligations to the same buyer. A certificate that fails
    // to issue must not stop a paid-for shirt being printed, and a Printful
    // outage must not stop the § 55 confirmation going out.
    expect(submitMerch).toMatch(/try\s*\{/);
    expect(submitMerch).toMatch(/catch\s*\(/);
  });

  it("does nothing at all where the deployment has no Printful", () => {
    // §23 keeps a live store out until the publication gate, so the token is
    // null today. Without one the checkout cannot quote postage either, so a
    // cart holding a parcel cannot be paid for -- this is not a degraded mode.
    expect(submitMerch).toMatch(/printfulApiToken === null\) return;/);
  });

  it("says out loud when a line cannot be ordered", () => {
    // A parcel arriving short, with nothing downstream that would ever mention
    // it. `from-order.ts` counts them; this is the half that tells somebody.
    expect(submitMerch).toContain("plan.unorderable > 0");
    expect(submitMerch).toMatch(/cannot be ordered from Printful/);
  });

  it("reads the stripping, so a broken regex cannot pass by emptying the file", () => {
    expect(source).toContain("export default async function orderPlaced");
  });
});

describe("the shape Medusa actually sends, which is not the shape the tests sent", () => {
  /**
   * **Gate E, 2026-09-09, and the most expensive kind of green suite.**
   *
   * A real order was placed against a real Medusa with a certificate and a
   * shirt in it. Every test in this file passed, and the shirt was never
   * ordered: `query.graph` hydrates `quantity` as a **`BigNumber`**, not a
   * primitive. Measured on the running server —
   *
   *     detailType: "object", detailCtor: "BigNumber", raw: "1"
   *
   * — so `typeof raw === "number"` was false for every line ever placed,
   * `quantityOf` returned `null`, the line was counted unorderable, the plan
   * carried no lines, and `submitPrintfulOrder` recorded `skipped`, which is
   * terminal. Buyer charged, nothing ordered, nothing retried, one log line.
   *
   * **The tests were the reason it survived**: every case above passes
   * `{ detail: { quantity: 1 } }`, a plain number, which is the one shape
   * production never sends. `order-placed.ts` has read money through
   * `amount()` since LD-02 for exactly this reason, and
   * `vat-thresholds.test.ts` writes the trap down in as many words — "a
   * `.numeric`, a `valueOf`, or a plain number depending on where it came
   * from". The knowledge existed; this function did not have it.
   *
   * So these drive the real shapes. A plain number stays covered above.
   */
  const bigNumber = (value: number) => ({ numeric: value, valueOf: () => value, toJSON: () => value });

  it("orders a line whose quantity is a BigNumber, which is every real line", () => {
    const result = plan({
      id: "order_01",
      shipping_address: ADDRESS,
      items: [{ product_handle: "mug", variant_sku: "LD-MUG-11", detail: { quantity: bigNumber(2) } }],
    });
    expect(result?.input.lines).toEqual([{ sku: "LD-MUG-11", quantity: 2 }]);
    expect(result?.input.unorderable).toBe(0);
  });

  it("reads one that only carries .numeric, with no usable valueOf", () => {
    // **The fixture above hides this**, and a mutation proved it: it carries
    // `numeric` *and* `valueOf`, so deleting either branch still passes. A
    // plain object's inherited `valueOf` returns the object itself, so this
    // shape resolves through `.numeric` or not at all -- which is the shape
    // `vat-thresholds.test.ts` records reaching it from Medusa.
    const result = plan({
      id: "order_01",
      shipping_address: ADDRESS,
      items: [{ product_handle: "mug", variant_sku: "LD-MUG-11", detail: { quantity: { numeric: 6 } } }],
    });
    expect(result?.input.lines).toEqual([{ sku: "LD-MUG-11", quantity: 6 }]);
  });

  it("reads one that only answers valueOf, which is what a bare BigNumber is", () => {
    const result = plan({
      id: "order_01",
      shipping_address: ADDRESS,
      items: [{ product_handle: "mug", variant_sku: "LD-MUG-11", detail: { quantity: { valueOf: () => 3 } } }],
    });
    expect(result?.input.lines).toEqual([{ sku: "LD-MUG-11", quantity: 3 }]);
  });

  it("reads a numeric string, because a third shape is one more than two", () => {
    const result = plan({
      id: "order_01",
      shipping_address: ADDRESS,
      items: [{ product_handle: "mug", variant_sku: "LD-MUG-11", detail: { quantity: "4" } }],
    });
    expect(result?.input.lines).toEqual([{ sku: "LD-MUG-11", quantity: 4 }]);
  });

  it("still refuses what is genuinely unreadable", () => {
    // The widening must not become "accept anything". A BigNumber-shaped
    // object carrying nothing numeric is still nothing.
    for (const quantity of [{}, { numeric: "two" }, { valueOf: () => "two" }, [], "two", null, 0, -1]) {
      const result = plan({
        id: "order_01",
        shipping_address: ADDRESS,
        items: [{ product_handle: "mug", variant_sku: "LD-MUG-11", detail: { quantity } }],
      });
      expect(`${JSON.stringify(quantity)}: ${String(result?.unorderable)}`).toBe(`${JSON.stringify(quantity)}: 1`);
    }
  });

  it("falls back to the plain field when there is no detail at all", () => {
    // Kept, and now reachable: `order-placed.ts` asks for `items.quantity`
    // as well, which it did not before -- so this fallback was tested and
    // could never fire.
    const result = plan({
      id: "order_01",
      shipping_address: ADDRESS,
      items: [{ product_handle: "mug", variant_sku: "LD-MUG-11", quantity: bigNumber(5) }],
    });
    expect(result?.input.lines).toEqual([{ sku: "LD-MUG-11", quantity: 5 }]);
  });

  it("is asked for by the subscriber, or the fallback above is decoration", () => {
    const subscriber = readFileSync(join(__dirname, "../src/subscribers/order-placed.ts"), "utf8");
    expect(subscriber).toContain('"items.detail.quantity"');
    expect(subscriber).toContain('"items.quantity"');
  });
});
