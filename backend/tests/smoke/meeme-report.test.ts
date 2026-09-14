import { randomUUID } from "node:crypto";
import { request as httpRequest } from "node:http";

import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const backendUrl = required("STORE_SMOKE_BACKEND_URL");
const databaseUrl = required("DATABASE_URL");
const reportKey = required("MEEME_REPORT_KEY");

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (value === undefined || value === "") throw new Error(`${name} is required; run via scripts/store-smoke.`);
  return value;
}

function assertDisposableLoopback(url: string): void {
  const parsed = new URL(url);
  let databasePath: string;
  try {
    databasePath = decodeURIComponent(parsed.pathname);
  } catch {
    throw new Error("Meeme smoke fixture refuses a malformed database pathname.");
  }
  if (!["127.0.0.1", "localhost", "::1"].includes(parsed.hostname) || databasePath !== "/lousydeal_store_smoke") {
    throw new Error("Meeme smoke fixture refuses every database except loopback lousydeal_store_smoke.");
  }
}

async function json(path: string, headers: Record<string, string> = {}) {
  const response = await fetch(new URL(path, backendUrl), { headers });
  return { status: response.status, body: await response.json() as Record<string, unknown> };
}

/** `fetch` normalizes a bare trailing query delimiter, so use node:http for this one wire-level assertion. */
async function literalBareQuery(): Promise<number> {
  const target = new URL(backendUrl);
  return await new Promise((resolve, reject) => {
    const request = httpRequest({ hostname: target.hostname, port: target.port, path: "/integrations/meeme-report?", method: "GET", headers: { "x-meeme-report-key": reportKey } }, (response) => {
      response.resume(); response.on("end", () => resolve(response.statusCode ?? 0));
    });
    request.on("error", reject); request.end();
  });
}

const raw = (value: number) => JSON.stringify({ value: String(value), precision: 20 });
const now = new Date();
now.setUTCDate(now.getUTCDate() - 1); now.setUTCHours(12, 0, 0, 0);
const old = new Date(now); old.setUTCDate(old.getUTCDate() - 14);

const db = new Client({ connectionString: databaseUrl });
let currentCapture = "";

async function sale(at: Date, captureAmount: number, refundAmount = 0): Promise<{ capture: string; refund: string | null }> {
  const suffix = randomUUID();
  const collection = `paycol_smoke_${suffix}`;
  const order = `order_smoke_${suffix}`;
  const payment = `pay_smoke_${suffix}`;
  const session = `session_smoke_${suffix}`;
  const capture = `capture_smoke_${suffix}`;
  const refund = refundAmount === 0 ? null : `refund_smoke_${suffix}`;
  await db.query("INSERT INTO payment_collection (id,currency_code,amount,raw_amount,captured_amount,raw_captured_amount,refunded_amount,raw_refunded_amount,created_at,updated_at) VALUES ($1,'usd',$2,$3,$2,$3,$4,$5,$6,$6)", [collection, captureAmount, raw(captureAmount), refundAmount, raw(refundAmount), at]);
  await db.query("INSERT INTO \"order\" (id,version,status,is_draft_order,currency_code,created_at,updated_at) VALUES ($1,1,'completed',false,'usd',$2,$2)", [order, at]);
  await db.query("INSERT INTO order_payment_collection (id,order_id,payment_collection_id,created_at,updated_at) VALUES ($1,$2,$3,$4,$4)", [`opc_smoke_${suffix}`, order, collection, at]);
  await db.query("INSERT INTO payment_session (id,amount,raw_amount,currency_code,provider_id,status,payment_collection_id,created_at,updated_at) VALUES ($1,$2,$3,'usd','pp_stripe_stripe','captured',$4,$5,$5)", [session, captureAmount, raw(captureAmount), collection, at]);
  await db.query("INSERT INTO payment (id,amount,raw_amount,currency_code,provider_id,captured_at,payment_collection_id,payment_session_id,created_at,updated_at) VALUES ($1,$2,$3,'usd','pp_stripe_stripe',$4,$5,$6,$4,$4)", [payment, captureAmount, raw(captureAmount), at, collection, session]);
  await db.query("INSERT INTO capture (id,amount,raw_amount,payment_id,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$5)", [capture, captureAmount, raw(captureAmount), payment, at]);
  await db.query("INSERT INTO order_transaction (id,order_id,amount,raw_amount,currency_code,reference,reference_id,created_at,updated_at) VALUES ($1,$2,$3,$4,'usd','capture',$5,$6,$6)", [`tx_capture_${suffix}`, order, captureAmount, raw(captureAmount), capture, at]);
  await db.query("INSERT INTO order_line_item (id,title,product_handle,variant_id,unit_price,raw_unit_price,created_at,updated_at) VALUES ($1,'Lousy Deal','lousy-deal',$2,25,$3,$4,$4)", [`line_certificate_${suffix}`, `variant_certificate_${suffix}`, raw(25), at]);
  await db.query("INSERT INTO order_item (id,order_id,version,item_id,quantity,raw_quantity,fulfilled_quantity,raw_fulfilled_quantity,delivered_quantity,raw_delivered_quantity,shipped_quantity,raw_shipped_quantity,return_requested_quantity,raw_return_requested_quantity,return_received_quantity,raw_return_received_quantity,return_dismissed_quantity,raw_return_dismissed_quantity,written_off_quantity,raw_written_off_quantity,created_at,updated_at) VALUES ($1,$2,1,$3,1,$4,0,$5,0,$5,0,$5,0,$5,0,$5,0,$5,0,$5,$6,$6)", [`order_item_certificate_${suffix}`, order, `line_certificate_${suffix}`, raw(1), raw(0), at]);
  await db.query("INSERT INTO order_line_item (id,title,product_handle,variant_id,unit_price,raw_unit_price,created_at,updated_at) VALUES ($1,'Mug','mug',$2,0,$3,$4,$4)", [`line_merch_${suffix}`, `variant_merch_${suffix}`, raw(0), at]);
  await db.query("INSERT INTO order_item (id,order_id,version,item_id,quantity,raw_quantity,fulfilled_quantity,raw_fulfilled_quantity,delivered_quantity,raw_delivered_quantity,shipped_quantity,raw_shipped_quantity,return_requested_quantity,raw_return_requested_quantity,return_received_quantity,raw_return_received_quantity,return_dismissed_quantity,raw_return_dismissed_quantity,written_off_quantity,raw_written_off_quantity,created_at,updated_at) VALUES ($1,$2,1,$3,2,$4,0,$5,0,$5,0,$5,0,$5,0,$5,0,$5,0,$5,$6,$6)", [`order_item_merch_${suffix}`, order, `line_merch_${suffix}`, raw(2), raw(0), at]);
  if (refund !== null) {
    await db.query("INSERT INTO refund (id,amount,raw_amount,payment_id,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$5)", [refund, refundAmount, raw(refundAmount), payment, now]);
    await db.query("INSERT INTO order_transaction (id,order_id,amount,raw_amount,currency_code,reference,reference_id,created_at,updated_at) VALUES ($1,$2,$3,$4,'usd','refund',$5,$6,$6)", [`tx_refund_${suffix}`, order, -refundAmount, raw(-refundAmount), refund, now]);
  }
  return { capture, refund };
}

beforeAll(async () => {
  assertDisposableLoopback(databaseUrl); await db.connect();
});
afterAll(async () => { await db.end(); });

describe("Meeme report on a real local Medusa", () => {
  it("has fixed empty/auth/query refusals before commerce is seeded", async () => {
    expect((await json("/integrations/meeme-report")).status).toBe(401);
    expect((await json("/integrations/meeme-report", { "x-meeme-report-key": "b".repeat(64) })).status).toBe(401);
    expect((await json("/integrations/meeme-report?anything=x", { "x-meeme-report-key": reportKey })).status).toBe(400);
    expect(await literalBareQuery()).toBe(400);
    const empty = await json("/integrations/meeme-report", { "x-meeme-report-key": reportKey });
    expect(empty.body).toMatchObject({ status: "empty", omittedRecords: 0 });
    expect(empty.body.days).toHaveLength(7);
  });

  it("hydrates a current capture and an older order's current refund as aggregates", async () => {
    await db.query("BEGIN");
    try {
      currentCapture = (await sale(now, 25)).capture;
      await sale(old, 25, 2);
      await db.query("COMMIT");
    } catch (error) {
      await db.query("ROLLBACK");
      throw error;
    }
    const response = await json("/integrations/meeme-report", { "x-meeme-report-key": reportKey });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: "available", omittedRecords: 0 });
    const rows = (response.body.days as { date: string; currencies: { grossMinor: number; refundedMinor: number; certificates: number; merchUnits: number }[] }[]).flatMap((day) => day.currencies);
    expect(rows).toContainEqual(expect.objectContaining({ grossMinor: 2500, refundedMinor: 200, certificates: 1, merchUnits: 2 }));
  });

  it("reports incomplete after corroborating evidence is removed", async () => {
    await db.query("DELETE FROM order_transaction WHERE reference = 'capture' AND reference_id = $1", [currentCapture]);
    const response = await json("/integrations/meeme-report", { "x-meeme-report-key": reportKey });
    expect(response.status).toBe(200); expect(response.body).toMatchObject({ status: "incomplete", omittedRecords: 1 });
    const rows = (response.body.days as { currencies: { refundedMinor: number }[] }[]).flatMap((day) => day.currencies);
    expect(rows).toContainEqual(expect.objectContaining({ refundedMinor: 200 }));
  });
});
