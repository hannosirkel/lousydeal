/**
 * The operator's three discount figures, derived from Medusa rows rather than
 * an analytics pipeline. Each expectation is hand-derived: the report code
 * does not help the test calculate its own answer.
 */

import type { ExecArgs, MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { describe, expect, it, vi } from "vitest";

import {
  discountReport,
  renderDiscountReport,
  type DiscountQueryEntity,
} from "../src/commerce/discount-report";
import reportDiscounts, { DISCOUNT_REPORT_USAGE_ERROR } from "../src/scripts/report-discounts";

type Line = { readonly variant_id: string | null; readonly metadata: unknown };

const merchandise = (variant = "variant_certificate"): Line => ({
  variant_id: variant,
  metadata: null,
});

const surcharge = (code: unknown, extraMetadata: Record<string, unknown> = {}): Line => ({
  variant_id: null,
  metadata: { internal_type: "baldrick_surcharge", code, ...extraMetadata },
});

const entity = (id: string, items: readonly Line[]): DiscountQueryEntity => ({ id, items });

describe("discount report counts", () => {
  it("keeps every committed code in table order and counts BLACKFRIDAY's zero-value line", () => {
    // Regression caught: deriving buckets from truthy price or input order
    // would omit BLACKFRIDAY or scramble the operator's stable table.
    const carts = [
      entity("cart_free", [surcharge("FREE", { fee_amount_major: 1 })]),
      entity("cart_blackfriday", [surcharge("BLACKFRIDAY", { percentage: 0 })]),
      entity("cart_baldrick", [surcharge("BALDRICK20", { percentage: 20 })]),
      entity("cart_save", [surcharge("SAVE10", { percentage: 10 })]),
    ];

    expect(discountReport(carts, []).rows).toEqual([
      { code: "BALDRICK20", carts: 1, paidOrders: 0, conversion: 0 },
      { code: "SAVE10", carts: 1, paidOrders: 0, conversion: 0 },
      { code: "FREE", carts: 1, paidOrders: 0, conversion: 0 },
      { code: "BLACKFRIDAY", carts: 1, paidOrders: 0, conversion: 0 },
      { code: "unknown code", carts: 0, paidOrders: 0, conversion: null },
    ]);
  });

  it("counts incomplete and completed carts as carts, and orders as paid", () => {
    // Regression caught: treating a completed cart as an order, or excluding
    // it from current cart rows, would invent customers and distort the ratio.
    const carts = [
      { ...entity("cart_incomplete", [surcharge("BALDRICK20")]), completed_at: null },
      { ...entity("cart_completed", [surcharge("BALDRICK20")]), completed_at: "2026-09-11T10:00:00Z" },
      entity("cart_save", [surcharge("SAVE10")]),
      entity("cart_blackfriday", [surcharge("BLACKFRIDAY", { percentage: 0 })]),
    ];
    const orders = [
      entity("order_baldrick", [surcharge("BALDRICK20")]),
      entity("order_save_1", [surcharge("SAVE10")]),
      entity("order_save_2", [surcharge("SAVE10")]),
      entity("order_free", [surcharge("FREE")]),
      entity("order_blackfriday", [surcharge("BLACKFRIDAY", { percentage: 0 })]),
    ];

    const result = discountReport(carts, orders);
    expect(result.cartsWithCode).toBe(4);
    expect(result.rows).toEqual([
      { code: "BALDRICK20", carts: 2, paidOrders: 1, conversion: 0.5 },
      { code: "SAVE10", carts: 1, paidOrders: 2, conversion: 2 },
      { code: "FREE", carts: 0, paidOrders: 1, conversion: null },
      { code: "BLACKFRIDAY", carts: 1, paidOrders: 1, conversion: 1 },
      { code: "unknown code", carts: 0, paidOrders: 0, conversion: null },
    ]);
  });

  it("omits entities without a surcharge and buckets unsafe or ambiguous rows once as unknown", () => {
    // Regression caught: metadata identity, per-line counting, or dropping
    // stripped/tampered rows would make visitor-writable data control totals.
    const carts = [
      entity("cart_plain", [merchandise()]),
      entity("cart_stripped", [{ variant_id: null, metadata: null }]),
      entity("cart_unsupported", [surcharge("visitor-secret-value")]),
      entity("cart_multiple", [surcharge("SAVE10"), surcharge("SAVE10")]),
      entity("cart_one_entity", [merchandise(), surcharge("FREE"), merchandise("variant_mug")]),
      entity("cart_metadata_only", [
        { variant_id: "variant_certificate", metadata: { internal_type: "baldrick_surcharge", code: "SAVE10" } },
      ]),
    ];

    expect(discountReport(carts, []).rows).toEqual([
      { code: "BALDRICK20", carts: 0, paidOrders: 0, conversion: null },
      { code: "SAVE10", carts: 0, paidOrders: 0, conversion: null },
      { code: "FREE", carts: 1, paidOrders: 0, conversion: 0 },
      { code: "BLACKFRIDAY", carts: 0, paidOrders: 0, conversion: null },
      { code: "unknown code", carts: 3, paidOrders: 0, conversion: 0 },
    ]);
  });

  it("uses the committed ASCII trim/case normalization without forgiving internal spacing", () => {
    // Regression caught: exact-only matching loses useful historical rows;
    // whitespace collapsing accepts a code nobody committed.
    const result = discountReport(
      [
        entity("cart_lower", [surcharge("  save10  ")]),
        entity("cart_ascii", [surcharge("baldrick20")]),
        entity("cart_spaced", [surcharge("BLACK FRIDAY")]),
      ],
      [],
    );

    expect(result.rows).toEqual([
      { code: "BALDRICK20", carts: 1, paidOrders: 0, conversion: 0 },
      { code: "SAVE10", carts: 1, paidOrders: 0, conversion: 0 },
      { code: "FREE", carts: 0, paidOrders: 0, conversion: null },
      { code: "BLACKFRIDAY", carts: 0, paidOrders: 0, conversion: null },
      { code: "unknown code", carts: 1, paidOrders: 0, conversion: 0 },
    ]);
  });
});

describe("discount report output", () => {
  it("labels test provenance before figures and states all three measurement boundaries", () => {
    // Regression caught: an inferred environment or customer wording makes a
    // truthful cart count sound like a population measurement.
    const lines = renderDiscountReport(
      discountReport([entity("cart_1", [surcharge("BALDRICK20")])], [entity("order_1", [surcharge("BALDRICK20")])]),
      "test",
    );

    expect(lines).toEqual([
      "Environment: test (operator supplied; this command reads the connected runtime database)",
      "Baldrick discount requests: not measured (the operator chose no Baldrick network call or analytics)",
      "Carts holding a surcharge/code line: 1 cart(s), not customers; includes incomplete carts",
      "BALDRICK20: carts=1 paid orders=1 conversion=100.0%",
      "SAVE10: carts=0 paid orders=0 conversion=n/a",
      "FREE: carts=0 paid orders=0 conversion=n/a",
      "BLACKFRIDAY: carts=0 paid orders=0 conversion=n/a",
      "unknown code: carts=0 paid orders=0 conversion=n/a",
      "Read-only operator report: not public; feeds no counter; schedules nothing",
    ]);
  });

  it("labels live provenance and prints literal conversion results including n/a", () => {
    // Regression caught: division by zero leaks Infinity/NaN, while a ratio
    // printed as a bare decimal is easy for an operator to misread.
    const lines = renderDiscountReport(
      discountReport(
        [entity("cart_1", [surcharge("SAVE10")]), entity("cart_2", [surcharge("SAVE10")])],
        [entity("order_1", [surcharge("SAVE10")]), entity("order_2", [surcharge("FREE")])],
      ),
      "live",
    );

    expect(lines[0]).toBe("Environment: live (operator supplied; this command reads the connected runtime database)");
    expect(lines).toContain("SAVE10: carts=2 paid orders=1 conversion=50.0%");
    expect(lines).toContain("FREE: carts=0 paid orders=1 conversion=n/a");
  });

  it("never renders a visitor-controlled unknown metadata value", () => {
    // Regression caught: echoing an unsupported code creates a terminal/log
    // injection surface and exposes arbitrary visitor metadata.
    const visitorValue = "visitor-value\nforged report line";
    const lines = renderDiscountReport(discountReport([entity("cart_1", [surcharge(visitorValue)])], []), "test");

    expect(lines.join("\n")).not.toContain(visitorValue);
    expect(lines).toContain("unknown code: carts=1 paid orders=0 conversion=0.0%");
  });
});

type QueryCall = {
  readonly entity: string;
  readonly fields: readonly string[];
  readonly filters: Record<string, unknown>;
};

function executable(rows: Readonly<Record<string, readonly DiscountQueryEntity[]>>) {
  const logs: string[] = [];
  const queryCalls: QueryCall[] = [];
  const query = {
    graph: vi.fn(async (call: QueryCall) => {
      queryCalls.push(call);
      return { data: rows[call.entity] ?? [] };
    }),
  };
  const logger = { info: vi.fn((line: string) => logs.push(line)) };
  const resolved: string[] = [];
  const container = {
    resolve: (key: string) => {
      resolved.push(key);
      if (key === ContainerRegistrationKeys.QUERY) return query;
      if (key === ContainerRegistrationKeys.LOGGER) return logger;
      throw new Error(`unexpected resolve(${key})`);
    },
  } as unknown as MedusaContainer;

  return {
    logs,
    queryCalls,
    resolved,
    run: (args: string[]) => reportDiscounts({ container, args } as ExecArgs),
  };
}

describe("Medusa discount report command", () => {
  it.each([{ args: [] }, { args: ["test", "extra"] }, { args: ["production"] }])(
    "throws one stable usage error for unsupported arguments %j before any data access",
    async ({ args }) => {
      // Regression caught: validating after resolving/querying can expose
      // report figures even though the invocation is rejected.
      const command = executable({ cart: [entity("cart_1", [surcharge("SAVE10")])] });

      await expect(command.run(args)).rejects.toThrow(DISCOUNT_REPORT_USAGE_ERROR);
      expect(command.resolved).toEqual([]);
      expect(command.queryCalls).toEqual([]);
      expect(command.logs).toEqual([]);
      expect(DISCOUNT_REPORT_USAGE_ERROR).toBe("Usage: npm run report:discounts -- <test|live>");
    },
  );

  it.each(["test", "live"] as const)("queries carts and orders before rendering the %s report", async (environment) => {
    // Regression caught: omitting a boundary field silently turns real
    // surcharge rows into absent or unknown rows.
    const command = executable({
      cart: [entity("cart_1", [surcharge("SAVE10")])],
      order: [entity("order_1", [surcharge("SAVE10")])],
    });

    await command.run([environment]);

    expect(command.queryCalls).toEqual([
      { entity: "cart", fields: ["id", "items.variant_id", "items.metadata"], filters: {} },
      { entity: "order", fields: ["id", "items.variant_id", "items.metadata"], filters: {} },
    ]);
    expect(command.logs[0]).toBe(
      `Environment: ${environment} (operator supplied; this command reads the connected runtime database)`,
    );
    expect(command.logs).toContain("SAVE10: carts=1 paid orders=1 conversion=100.0%");
  });
});
