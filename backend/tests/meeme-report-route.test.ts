import { describe, expect, it, vi } from "vitest";

import { createMeemeReportHandler, reportFromQuery } from "../src/api/integrations/meeme-report/route";

const key = "a".repeat(64);
const empty = {
  status: "empty" as const,
  from: "2026-03-08",
  through: "2026-03-14",
  omittedRecords: 0,
  days: ["08", "09", "10", "11", "12", "13", "14"].map((day) => ({ date: `2026-03-${day}`, currencies: [] })),
};

function response() {
  const sent: { status: number; body: unknown; cache: string | undefined } = { status: 200, body: undefined, cache: undefined };
  const value = {
    setHeader: vi.fn((name: string, header: string) => { if (name === "Cache-Control") sent.cache = header; }),
    status(code: number) { sent.status = code; return value; },
    json(body: unknown) { sent.body = body; return value; },
  };
  return { response: value, sent };
}

function request(override: Record<string, unknown> = {}) {
  return { originalUrl: "/integrations/meeme-report", headers: { "x-meeme-report-key": key }, ...override };
}

describe("GET /integrations/meeme-report", () => {
  it.each([
    ["missing", request({ headers: {} })],
    ["wrong", request({ headers: { "x-meeme-report-key": "b".repeat(64) } })],
    ["duplicate", request({ headers: { "x-meeme-report-key": [key, key] } })],
    ["malformed", request({ headers: { "x-meeme-report-key": "not-a-key" } })],
  ])("returns the same fixed refusal for a %s key before resolving data", async (_case, req) => {
    const report = vi.fn(async () => empty);
    const handler = createMeemeReportHandler({ key, timeZone: "Europe/Tallinn" }, report);
    const { response: res, sent } = response();

    await handler(req as never, res as never);

    expect(sent).toEqual({ status: 401, body: { status: "unauthorized" }, cache: "no-store" });
    expect(report).not.toHaveBeenCalled();
  });

  it.each(["?range=anything", "?", "?="]) ("rejects %s before resolving data", async (query) => {
    const report = vi.fn(async () => empty);
    const handler = createMeemeReportHandler({ key, timeZone: "Europe/Tallinn" }, report);
    const { response: res, sent } = response();

    await handler(request({ originalUrl: `/integrations/meeme-report${query}` }) as never, res as never);

    expect(sent).toEqual({ status: 400, body: { status: "bad_request" }, cache: "no-store" });
    expect(report).not.toHaveBeenCalled();
  });

  it("returns exactly the aggregate-only seven-day report", async () => {
    const handler = createMeemeReportHandler({ key, timeZone: "Europe/Tallinn" }, async () => empty);
    const { response: res, sent } = response();

    await handler(request() as never, res as never);

    expect(sent).toEqual({ status: 200, body: empty, cache: "no-store" });
    expect(JSON.stringify(sent.body)).not.toMatch(/customer|email|address|order_id|payment_id|card/i);
  });

  it("sanitizes a provider failure", async () => {
    const handler = createMeemeReportHandler({ key, timeZone: "Europe/Tallinn" }, async () => { throw new Error("provider customer data"); });
    const { response: res, sent } = response();

    await handler(request() as never, res as never);

    expect(sent).toEqual({ status: 503, body: { status: "unavailable" }, cache: "no-store" });
  });
});

describe("commerce candidate discovery", () => {
  const now = new Date("2026-03-15T12:00:00.000Z");
  const raw = (value: string) => ({ value, precision: 20 });
  const hydrated = {
    id: "collection-1", currency_code: "usd",
    payments: [{ id: "payment-1", currency_code: "usd", raw_amount: raw("25"), captured_at: "2026-03-10T12:00:00.000Z", canceled_at: null,
      captures: [{ id: "capture-1", raw_amount: raw("25"), created_at: "2026-03-10T12:00:00.000Z" }], refunds: [] }],
    order: { version: 1, status: "pending", is_draft_order: false, currency_code: "usd", payment_collections: [{ id: "collection-1" }],
      items: [{ variant_id: "certificate", product_handle: "lousy-deal", title: "Lousy Deal", detail: { raw_quantity: raw("1") } }],
      transactions: [{ reference: "capture", reference_id: "capture-1", raw_amount: raw("25"), currency_code: "usd" }] },
  };
  const query = (results: Record<string, readonly unknown[]>) => ({
    graph: vi.fn(async ({ entity }: { entity: string }) => ({ data: results[entity] ?? [] })),
  });

  it("ignores malformed adjacent-envelope rows before join accounting", async () => {
    const source = query({ capture: [{ id: "adjacent", created_at: "2026-03-07T12:00:00.000Z", payment_id: null, payment: null }] });
    const result = await reportFromQuery(source, "America/New_York", now);
    expect(result).toMatchObject({ status: "empty", omittedRecords: 0 });
  });

  it("deduplicates a discovered entity and ID before omission accounting", async () => {
    const duplicate = { id: "capture-1", created_at: "2026-03-10T12:00:00.000Z", payment_id: null, payment: null };
    const source = query({ capture: [duplicate, duplicate] });
    const result = await reportFromQuery(source, "America/New_York", now);
    expect(result).toMatchObject({ status: "incomplete", omittedRecords: 1 });
  });

  it("counts missing hydration once when capture discovery also produced its payment marker", async () => {
    const source = query({
      capture: [{ id: "capture-1", created_at: "2026-03-10T12:00:00.000Z", payment_id: "payment-1", payment: { id: "payment-1", payment_collection_id: "collection-1" } }],
      payment: [{ id: "payment-1", captured_at: "2026-03-10T12:00:00.000Z", payment_collection_id: "collection-1" }],
      payment_collection: [],
    });
    const result = await reportFromQuery(source, "America/New_York", now);
    expect(result).toMatchObject({ status: "incomplete", omittedRecords: 1 });
  });

  it.each([undefined, "not-a-timestamp"])("counts a keyed %s timestamp as one rejected candidate", async (created_at) => {
    const source = query({ capture: [{ id: "capture-1", created_at, payment_id: "payment-1", payment: { id: "payment-1", payment_collection_id: "collection-1" } }] });
    expect(await reportFromQuery(source, "America/New_York", now)).toMatchObject({ status: "incomplete", omittedRecords: 1 });
  });

  it("counts missing IDs inside or at an unlocalizable time but ignores one proven outside", async () => {
    const source = query({ capture: [
      { created_at: "2026-03-10T12:00:00.000Z" },
      { created_at: "not-a-timestamp" },
      { created_at: "2026-03-07T12:00:00.000Z" },
    ] });
    expect(await reportFromQuery(source, "America/New_York", now)).toMatchObject({ status: "incomplete", omittedRecords: 2 });
  });

  it("omits one duplicated movement even when Date and ISO observations are equivalent", async () => {
    const common = { id: "capture-1", payment_id: "payment-1", payment: { id: "payment-1", payment_collection_id: "collection-1" } };
    const source = query({ capture: [{ ...common, created_at: new Date("2026-03-10T12:00:00.000Z") }, { ...common, created_at: "2026-03-10T12:00:00.000Z" }], payment_collection: [hydrated] });
    expect(await reportFromQuery(source, "America/New_York", now)).toMatchObject({ status: "incomplete", omittedRecords: 1 });
  });

  it.each([
    ["matching-first", [
      { id: "capture-1", created_at: "2026-03-10T12:00:00.000Z", payment_id: "payment-1", payment: { id: "payment-1", payment_collection_id: "collection-1" } },
      { id: "capture-1", created_at: "2026-03-11T12:00:00.000Z", payment_id: "payment-1", payment: { id: "payment-1", payment_collection_id: "collection-1" } },
    ]],
    ["matching-last", [
      { id: "capture-1", created_at: "2026-03-11T12:00:00.000Z", payment_id: "payment-1", payment: { id: "payment-1", payment_collection_id: "collection-1" } },
      { id: "capture-1", created_at: "2026-03-10T12:00:00.000Z", payment_id: "payment-1", payment: { id: "payment-1", payment_collection_id: "collection-1" } },
    ]],
  ] as const)("rejects conflicting timestamps independent of input order: %s", async (_name, observations) => {
    const source = query({ capture: observations, payment_collection: [hydrated] });
    expect(await reportFromQuery(source, "America/New_York", now)).toMatchObject({ status: "incomplete", omittedRecords: 1 });
  });

  it.each(["inside-first", "outside-first"])("rejects an inside/outside conflict in either order: %s", async (order) => {
    const inside = { id: "capture-1", created_at: "2026-03-10T12:00:00.000Z", payment_id: "payment-1", payment: { id: "payment-1", payment_collection_id: "collection-1" } };
    const outside = { ...inside, created_at: "2026-03-07T12:00:00.000Z" };
    const source = query({ capture: order === "inside-first" ? [inside, outside] : [outside, inside], payment_collection: [hydrated] });
    expect(await reportFromQuery(source, "America/New_York", now)).toMatchObject({ status: "incomplete", omittedRecords: 1 });
  });

  it("ignores conflicting observations when every valid timestamp is outside the exact dates", async () => {
    const source = query({ capture: [
      { id: "capture-1", created_at: "2026-03-06T12:00:00.000Z", payment_id: "payment-1", payment: { id: "payment-1", payment_collection_id: "collection-1" } },
      { id: "capture-1", created_at: "2026-03-07T12:00:00.000Z", payment_id: "payment-2", payment: { id: "payment-2", payment_collection_id: "collection-2" } },
    ] });
    expect(await reportFromQuery(source, "America/New_York", now)).toMatchObject({ status: "empty", omittedRecords: 0 });
  });

  it.each(["matching-first", "matching-last"])("rejects conflicting ownership independent of input order: %s", async (order) => {
    const matching = { id: "capture-1", created_at: "2026-03-10T12:00:00.000Z", payment_id: "payment-1", payment: { id: "payment-1", payment_collection_id: "collection-1" } };
    const conflicting = { id: "capture-1", created_at: "2026-03-10T12:00:00.000Z", payment_id: "payment-2", payment: { id: "payment-2", payment_collection_id: "collection-2" } };
    const source = query({ capture: order === "matching-first" ? [matching, conflicting] : [conflicting, matching], payment_collection: [hydrated] });
    expect(await reportFromQuery(source, "America/New_York", now)).toMatchObject({ status: "incomplete", omittedRecords: 1 });
  });

  it("keeps a valid duplicate rejected after a later conflict", async () => {
    const valid = { id: "capture-1", created_at: "2026-03-10T12:00:00.000Z", payment_id: "payment-1", payment: { id: "payment-1", payment_collection_id: "collection-1" } };
    const source = query({ capture: [valid, { ...valid }, { ...valid, created_at: "2026-03-11T12:00:00.000Z" }], payment_collection: [hydrated] });
    expect(await reportFromQuery(source, "America/New_York", now)).toMatchObject({ status: "incomplete", omittedRecords: 1 });
  });

  it("uses unambiguous rejected-capture ownership to suppress its payment marker", async () => {
    const common = { id: "capture-1", payment_id: "payment-1", payment: { id: "payment-1", payment_collection_id: "collection-1" } };
    const source = query({
      capture: [{ ...common, created_at: "2026-03-10T12:00:00.000Z" }, { ...common, created_at: "2026-03-11T12:00:00.000Z" }],
      payment: [{ id: "payment-1", captured_at: "2026-03-10T12:00:00.000Z", payment_collection_id: "collection-1" }],
      payment_collection: [hydrated],
    });
    expect(await reportFromQuery(source, "America/New_York", now)).toMatchObject({ status: "incomplete", omittedRecords: 1 });
  });

  it("counts a conflicted payment marker once", async () => {
    const source = query({ payment: [
      { id: "payment-1", captured_at: "2026-03-10T12:00:00.000Z", payment_collection_id: "collection-1" },
      { id: "payment-1", captured_at: "2026-03-11T12:00:00.000Z", payment_collection_id: "collection-1" },
    ] });
    expect(await reportFromQuery(source, "America/New_York", now)).toMatchObject({ status: "incomplete", omittedRecords: 1 });
  });
});
