import { describe, expect, it } from "vitest";
import { BigNumber } from "@medusajs/framework/utils";

import {
  completedCommerceDays,
  classifyCommerceCollections,
  summarizeCommerce,
  type CommerceCandidate,
  type CommerceMovement,
} from "../src/commerce/meeme-report";

const capture = (override: Partial<CommerceMovement> = {}): CommerceMovement => ({
  id: "capture-1",
  kind: "capture",
  occurredAt: "2026-03-10T12:00:00.000Z",
  currency: "usd",
  amount: 500,
  certificateUnits: 1,
  merchUnits: 2,
  ...override,
});

describe("completedCommerceDays", () => {
  it("returns the seven completed local dates across a DST boundary", () => {
    // Regression caught: subtracting 24-hour intervals makes a spring-forward
    // date vanish or carries a partial current day into a report.
    expect(completedCommerceDays("America/New_York", new Date("2026-03-15T12:00:00.000Z"))).toEqual([
      "2026-03-08", "2026-03-09", "2026-03-10", "2026-03-11", "2026-03-12", "2026-03-13", "2026-03-14",
    ]);
  });
});

describe("summarizeCommerce", () => {
  const days = ["2026-03-08", "2026-03-09", "2026-03-10", "2026-03-11", "2026-03-12", "2026-03-13", "2026-03-14"];

  it("separates currencies and keeps capture counts on the capture day", () => {
    const report = summarizeCommerce(days, "America/New_York", [
      capture(),
      capture({ id: "capture-2", currency: "eur", amount: 700, certificateUnits: 0, merchUnits: 1 }),
    ]);

    expect(report).toMatchObject({ status: "available", from: "2026-03-08", through: "2026-03-14", omittedRecords: 0 });
    expect(report.days[2]).toEqual({
      date: "2026-03-10",
      currencies: [
        { currency: "EUR", paidOrders: 1, grossMinor: 700, refundedMinor: 0, netMinor: 700, certificates: 0, merchUnits: 1 },
        { currency: "USD", paidOrders: 1, grossMinor: 500, refundedMinor: 0, netMinor: 500, certificates: 1, merchUnits: 2 },
      ],
    });
  });

  it("places refunds on their own day without undoing historical counts", () => {
    const report = summarizeCommerce(days, "America/New_York", [
      capture(),
      { id: "refund-1", kind: "refund", occurredAt: "2026-03-12T12:00:00.000Z", currency: "usd", amount: 500 },
    ]);

    expect(report.days[2]?.currencies[0]).toMatchObject({ paidOrders: 1, certificates: 1, merchUnits: 2, netMinor: 500 });
    expect(report.days[4]).toEqual({
      date: "2026-03-12",
      currencies: [{ currency: "USD", paidOrders: 0, grossMinor: 0, refundedMinor: 500, netMinor: -500, certificates: 0, merchUnits: 0 }],
    });
  });

  it("marks malformed, unsupported and excess-currency movements incomplete", () => {
    const currencies = ["aud", "cad", "chf", "dkk", "eur", "gbp", "jpy", "nok", "sek"];
    const report = summarizeCommerce(days, "America/New_York", [
      ...currencies.map((currency, index) => capture({ id: `capture-${currency}`, currency, amount: index + 1 })),
      capture({ id: "bad", amount: 0.5 }),
      capture({ id: "wrong-date", occurredAt: "not-a-date" }),
    ]);

    expect(report.status).toBe("incomplete");
    expect(report.omittedRecords).toBe(3);
    expect(report.days[2]?.currencies).toHaveLength(8);
  });

  it("returns seven empty days when no movements are present", () => {
    expect(summarizeCommerce(days, "America/New_York", [])).toEqual({
      status: "empty",
      from: "2026-03-08",
      through: "2026-03-14",
      omittedRecords: 0,
      days: days.map((date) => ({ date, currencies: [] })),
    });
  });
});

describe("classifyCommerceCollections", () => {
  type MovementCandidate = Extract<CommerceCandidate, { kind: "capture" | "refund" }>;
  type PaymentCandidate = Extract<CommerceCandidate, { kind: "payment" }>;
  const days = ["2026-03-08", "2026-03-09", "2026-03-10", "2026-03-11", "2026-03-12", "2026-03-13", "2026-03-14"];
  const timeZone = "America/New_York";
  const raw = (value: string) => ({ value, precision: 20 });
  const collection = {
    id: "collection-1", currency_code: "usd", amount: 25, raw_amount: raw("25"), captured_amount: 25, raw_captured_amount: raw("25"),
    payments: [{ id: "payment-1", currency_code: "usd", amount: 25, raw_amount: raw("25"), captured_at: "2026-03-10T12:00:00.000Z", canceled_at: null,
      captures: [{ id: "capture-1", amount: 25, raw_amount: raw("25"), created_at: "2026-03-10T12:00:00.000Z" }], refunds: [] }],
    order: { id: "order-1", version: 1, status: "completed", is_draft_order: false, currency_code: "usd", payment_collections: [{ id: "collection-1" }],
      items: [{ variant_id: "certificate", product_handle: "lousy-deal", title: "Lousy Deal", detail: { quantity: 1, raw_quantity: raw("1") }, quantity: 1, raw_quantity: raw("1") }, { variant_id: "mug", product_handle: "mug", title: "Mug", detail: { quantity: 2, raw_quantity: raw("2") }, quantity: 2, raw_quantity: raw("2") }],
      transactions: [{ reference: "capture", reference_id: "capture-1", amount: 25, raw_amount: raw("25"), currency_code: "usd" }] },
  };
  const captureCandidate = (override: Partial<MovementCandidate> = {}): MovementCandidate => ({
    kind: "capture", id: "capture-1", paymentId: "payment-1", collectionId: "collection-1",
    occurredAt: "2026-03-10T12:00:00.000Z", ...override,
  });
  const refundCandidate = (override: Partial<MovementCandidate> = {}): MovementCandidate => ({
    kind: "refund", id: "refund-1", paymentId: "payment-1", collectionId: "collection-1",
    occurredAt: "2026-03-12T12:00:00.000Z", ...override,
  });
  const paymentMarker = (override: Partial<PaymentCandidate> = {}): PaymentCandidate => ({
    kind: "payment", id: "payment-1", collectionId: "collection-1",
    capturedAt: "2026-03-10T12:00:00.000Z", ...override,
  });
  const classify = (collections: readonly unknown[], candidates: readonly CommerceCandidate[] = [captureCandidate()]) =>
    classifyCommerceCollections(collections, candidates, days, timeZone);

  it("requires a corroborated full capture and converts raw major units to minor units", () => {
    expect(classify([collection])).toEqual({ movements: [capture({ amount: 2500 })], omittedRecords: 0 });
  });

  it.each(["pending", "canceled"])("reports an otherwise valid %s order", (status) => {
    expect(classify([{ ...collection, order: { ...collection.order, status } }])).toEqual({
      movements: [capture({ amount: 2500 })], omittedRecords: 0,
    });
  });

  it.each([
    { status: "draft", is_draft_order: false },
    { status: "pending", is_draft_order: true },
  ])("omits a draft order state %#", (orderState) => {
    expect(classify([{ ...collection, order: { ...collection.order, ...orderState } }])).toEqual({ movements: [], omittedRecords: 1 });
  });

  it("omits a capture when its transaction evidence is missing or its order version is mutable", () => {
    expect(classify([{ ...collection, order: { ...collection.order, version: 2, transactions: [] } }])).toEqual({ movements: [], omittedRecords: 1 });
  });

  it("attributes an independently corroborated refund without reusing capture counts", () => {
    const refunded = { ...collection, payments: [{ ...collection.payments[0], refunds: [{ id: "refund-1", amount: 2, raw_amount: raw("2"), created_at: "2026-03-12T12:00:00.000Z" }] }], order: { ...collection.order, transactions: [...collection.order.transactions, { reference: "refund", reference_id: "refund-1", amount: -2, raw_amount: raw("-2"), currency_code: "usd" }] } };
    expect(classify([refunded], [captureCandidate(), refundCandidate()])).toEqual({ movements: [capture({ amount: 2500 }), { id: "refund-1", kind: "refund", occurredAt: "2026-03-12T12:00:00.000Z", currency: "usd", amount: 200 }], omittedRecords: 0 });
  });

  it("normalizes real Date movement timestamps and padded raw BigNumber values", () => {
    const actual = {
      ...collection,
      raw_amount: raw("25.000000000000000000"),
      payments: [{ ...collection.payments[0], raw_amount: raw("25.000000000000000000"), captures: [{ ...collection.payments[0]!.captures[0]!, raw_amount: raw("25.000000000000000000"), created_at: new Date("2026-03-10T12:00:00.000Z") }], refunds: [{ id: "refund-1", amount: 2, raw_amount: raw("2.000000000000000000"), created_at: new Date("2026-03-12T12:00:00.000Z") }] }],
      order: { ...collection.order, items: [{ ...collection.order.items[0], detail: { quantity: new BigNumber(1) } }], transactions: [...collection.order.transactions, { reference: "refund", reference_id: "refund-1", amount: -2, raw_amount: raw("-2.000000000000000000"), currency_code: "usd" }] },
    };
    expect(classify([actual], [captureCandidate(), refundCandidate()])).toEqual({ movements: [capture({ amount: 2500, merchUnits: 0 }), { id: "refund-1", kind: "refund", occurredAt: "2026-03-12T12:00:00.000Z", currency: "usd", amount: 200 }], omittedRecords: 0 });
  });

  it("omits invalid Date timestamps and material sub-minor values", () => {
    const malformed = { ...collection, payments: [{ ...collection.payments[0], captures: [{ ...collection.payments[0]!.captures[0]!, created_at: new Date("invalid"), raw_amount: raw("25.001") }] }] };
    expect(classify([malformed])).toEqual({ movements: [], omittedRecords: 1 });
  });

  it("accepts a padded raw integer but refuses fraction, unsafe and malformed raw quantities", () => {
    const padded = { ...collection, order: { ...collection.order, items: [{ ...collection.order.items[0], detail: { quantity: 1, raw_quantity: raw("1.000000000000000000") } }] } };
    expect(classify([padded]).omittedRecords).toBe(0);
    for (const value of ["1.5", "9007199254740992", "not-a-number"]) {
      const malformed = { ...collection, order: { ...collection.order, items: [{ ...collection.order.items[0], detail: { quantity: 1, raw_quantity: raw(value) } }] } };
      expect(classify([malformed])).toEqual({ movements: [], omittedRecords: 1 });
    }
  });

  it("reports a current refund without validating its historical capture", () => {
    const refunded = {
      ...collection,
      payments: [{ ...collection.payments[0], captures: [{ ...collection.payments[0]!.captures[0]!, created_at: new Date("invalid") }], refunds: [{ id: "refund-1", amount: 2, raw_amount: raw("2"), created_at: "2026-03-12T12:00:00.000Z" }] }],
      order: { ...collection.order, transactions: [{ reference: "refund", reference_id: "refund-1", amount: -2, raw_amount: raw("-2"), currency_code: "usd" }] },
    };

    expect(classify([refunded], [refundCandidate()])).toEqual({
      movements: [{ id: "refund-1", kind: "refund", occurredAt: "2026-03-12T12:00:00.000Z", currency: "usd", amount: 200 }],
      omittedRecords: 0,
    });
  });

  it("counts a payment marker with no identifiable capture as one omission", () => {
    const withoutCapture = { ...collection, payments: [{ ...collection.payments[0], captures: [] }] };
    expect(classify([withoutCapture], [paymentMarker()])).toEqual({ movements: [], omittedRecords: 1 });
  });

  it("counts an in-window hydrated capture missing from capture discovery", () => {
    expect(classify([collection], [paymentMarker()])).toEqual({ movements: [], omittedRecords: 1 });
  });

  it("does not count a payment marker separately when its capture is a candidate", () => {
    expect(classify([collection], [captureCandidate(), paymentMarker()])).toEqual({ movements: [capture({ amount: 2500 })], omittedRecords: 0 });
    const missingTransaction = { ...collection, order: { ...collection.order, transactions: [] } };
    expect(classify([missingTransaction], [captureCandidate(), paymentMarker()])).toEqual({ movements: [], omittedRecords: 1 });
    expect(classify([], [captureCandidate(), paymentMarker()])).toEqual({ movements: [], omittedRecords: 1 });
  });

  it("resolves a payment marker through one identified capture outside the report dates", () => {
    const historical = { ...collection, payments: [{ ...collection.payments[0], captures: [{ ...collection.payments[0]!.captures[0]!, created_at: "2026-03-07T12:00:00.000Z" }] }] };
    expect(classify([historical], [paymentMarker()])).toEqual({ movements: [], omittedRecords: 0 });
  });

  it("does not let a refund candidate suppress its payment marker", () => {
    const refunded = {
      ...collection,
      payments: [{ ...collection.payments[0], refunds: [{ id: "refund-1", amount: 2, raw_amount: raw("2"), created_at: "2026-03-12T12:00:00.000Z" }] }],
      order: { ...collection.order, transactions: [...collection.order.transactions, { reference: "refund", reference_id: "refund-1", amount: -2, raw_amount: raw("-2"), currency_code: "usd" }] },
    };
    expect(classify([refunded], [refundCandidate(), paymentMarker()])).toEqual({
      movements: [{ id: "refund-1", kind: "refund", occurredAt: "2026-03-12T12:00:00.000Z", currency: "usd", amount: 200 }],
      omittedRecords: 1,
    });
  });

  it("omits a payment marker whose hydrated captured timestamp changed", () => {
    const changed = { ...collection, payments: [{ ...collection.payments[0], captured_at: "2026-03-10T13:00:00.000Z" }] };
    expect(classify([changed], [paymentMarker()])).toEqual({ movements: [], omittedRecords: 1 });
  });

  it("counts every current movement in an unsupported multi-payment collection", () => {
    const secondPayment = {
      ...collection.payments[0], id: "payment-2", captures: [{ ...collection.payments[0]!.captures[0]!, id: "capture-2" }],
      refunds: [{ id: "refund-1", amount: 2, raw_amount: raw("2"), created_at: "2026-03-12T12:00:00.000Z" }],
    };
    const multiple = { ...collection, payments: [collection.payments[0], secondPayment] };
    expect(classify([multiple], [
      captureCandidate(),
      captureCandidate({ id: "capture-2", paymentId: "payment-2" }),
      refundCandidate({ paymentId: "payment-2" }),
    ])).toEqual({ movements: [], omittedRecords: 3 });
  });

  it("omits each affected candidate when payment currency disagrees", () => {
    const mismatch = {
      ...collection,
      payments: [{ ...collection.payments[0], currency_code: "eur", refunds: [{ id: "refund-1", amount: 2, raw_amount: raw("2"), created_at: "2026-03-12T12:00:00.000Z" }] }],
      order: { ...collection.order, transactions: [...collection.order.transactions, { reference: "refund", reference_id: "refund-1", amount: -2, raw_amount: raw("-2"), currency_code: "usd" }] },
    };
    expect(classify([mismatch], [captureCandidate(), refundCandidate()])).toEqual({ movements: [], omittedRecords: 2 });
  });

  it("omits a candidate when the hydrated event timestamp changed", () => {
    expect(classify([collection], [captureCandidate({ occurredAt: "2026-03-10T13:00:00.000Z" })])).toEqual({ movements: [], omittedRecords: 1 });
  });
});
