/**
 * Whether a request claiming to be Printful is Printful.
 *
 * The endpoint is public by construction — Printful has to reach it — so the
 * signature is the only thing between a stranger and an order marked shipped.
 * These tests are therefore about what is *rejected*.
 */

import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  PRINTFUL_EVENTS,
  isSignedByPrintful,
  printfulWebhookEvent,
} from "../src/modules/printful/webhook";

/** A secret as Printful returns it: the hexadecimal representation of the key. */
const SECRET_HEX = "a3f1c0de9b887766554433221100ffeeddccbbaa99887766554433221100ffee";

const BODY = JSON.stringify({
  type: "shipment_sent",
  occurred_at: "2026-09-09T10:00:00Z",
  store_id: 1,
  data: { order: { id: 175705264 }, shipment: { tracking_number: "TRK1", tracking_url: "https://t/1", carrier: "DPD" } },
});

/** Signed the right way: HMAC over the raw body, keyed with the secret's **bytes**. */
const sign = (body: string, secretHex = SECRET_HEX) =>
  createHmac("sha256", Buffer.from(secretHex, "hex")).update(body).digest("hex");

describe("the signature", () => {
  it("accepts a body signed with the secret", () => {
    expect(isSignedByPrintful(BODY, sign(BODY), SECRET_HEX)).toBe(true);
  });

  it("accepts the same bytes as a Buffer, which is what the route has", () => {
    expect(isSignedByPrintful(Buffer.from(BODY, "utf8"), sign(BODY), SECRET_HEX)).toBe(true);
  });

  it("rejects a signature computed with the hex string as the key", () => {
    // **The mistake Printful's own note warns about**, and the one that looks
    // like a Printful outage rather than a bug here: `secret_key` is "the
    // hexadecimal representation of the secret key" and has to be decoded
    // before it is used. Keying with the string produces a different digest
    // for every valid event, so the endpoint rejects everything.
    const wrong = createHmac("sha256", SECRET_HEX).update(BODY).digest("hex");
    expect(wrong).not.toBe(sign(BODY));
    expect(isSignedByPrintful(BODY, wrong, SECRET_HEX)).toBe(false);
  });

  it("rejects a body altered by one byte", () => {
    const tampered = BODY.replace("TRK1", "TRK2");
    expect(isSignedByPrintful(tampered, sign(BODY), SECRET_HEX)).toBe(false);
  });

  it("rejects a body reparsed and restringified, which is why the raw one is kept", () => {
    /**
     * `JSON.parse` then `JSON.stringify` is not the identity: whitespace goes,
     * `\/` unescapes, and a non-ASCII escape becomes the character itself. So
     * a route that signed `req.body` instead of `req.rawBody` would reject
     * every genuine event, and `api/middlewares.ts` asks Medusa to preserve
     * the raw one for this path and no other.
     *
     * **Written first with a fixture built by `JSON.stringify`**, whose round
     * trip is itself and which made this assertion `true === true`. The body
     * below is one a sender would produce and a parser would not.
     */
    const overTheWire = '{ "type":"shipment_sent",  "data":{"order":{"id":7},"note":"a\\u2013b"} }';
    const roundTripped = JSON.stringify(JSON.parse(overTheWire));

    // The premise, asserted rather than assumed: the two really do differ.
    expect(roundTripped).not.toBe(overTheWire);

    // Signed as sent, verified as sent: fine.
    expect(isSignedByPrintful(overTheWire, sign(overTheWire), SECRET_HEX)).toBe(true);
    // Signed after a round trip, verified against what was sent: refused.
    expect(isSignedByPrintful(overTheWire, sign(roundTripped), SECRET_HEX)).toBe(false);
  });

  it("rejects a signature made with somebody else's secret", () => {
    const other = "0".repeat(64);
    expect(isSignedByPrintful(BODY, sign(BODY, other), SECRET_HEX)).toBe(false);
  });

  it("rejects a missing or malformed signature without throwing", () => {
    // `timingSafeEqual` throws on a length mismatch, and a throw here would be
    // a 500 where a refusal belongs.
    for (const signature of [undefined, null, "", "not-hex", "abc", 42, {}, sign(BODY).slice(0, -2)]) {
      expect(`${String(signature)}: ${String(isSignedByPrintful(BODY, signature, SECRET_HEX))}`).toBe(
        `${String(signature)}: false`,
      );
    }
  });

  it("rejects everything when the deployment has no usable secret", () => {
    // §23 keeps a live Printful store out until the publication gate, so a
    // deployment may hold no secret at all. Verifying nothing must mean
    // accepting nothing -- not accepting everything.
    for (const secret of ["", "not-hex", "abc"]) {
      expect(`${secret}: ${String(isSignedByPrintful(BODY, sign(BODY), secret))}`).toBe(`${secret}: false`);
    }
  });

  it("rejects a signature that is correct *for* an empty secret, which is the hole", () => {
    // **Mutation found this.** Removing the secret's format check left the
    // above passing, because those signatures were made with the real key and
    // still did not match. The danger is narrower and worse: an empty secret
    // hex-decodes to an empty *key*, and an HMAC keyed with nothing is one
    // anybody can compute from the body alone. So the endpoint would accept a
    // forgery on any deployment whose secret had gone missing -- which is
    // every deployment, until the publication gate.
    const forged = createHmac("sha256", Buffer.from("", "hex")).update(BODY).digest("hex");
    expect(isSignedByPrintful(BODY, forged, "")).toBe(false);

    // The same shape for an odd-length or non-hex secret, where `Buffer.from`
    // silently drops what it cannot read rather than refusing.
    for (const secret of ["abc", "zz", "not-hex"]) {
      const withWhateverThatDecodesTo = createHmac("sha256", Buffer.from(secret, "hex")).update(BODY).digest("hex");
      expect(`${secret}: ${String(isSignedByPrintful(BODY, withWhateverThatDecodesTo, secret))}`).toBe(
        `${secret}: false`,
      );
    }
  });

  it("compares in constant time, which no test can observe", () => {
    // A byte-by-byte early return leaks how much of a guess was right, and
    // over enough guesses that is the signature. Functionally identical to
    // `===`, so mutation cannot see the difference and neither can an
    // assertion about behaviour -- asserted against the source instead, the
    // disposition `checkout-address.test.ts` settled for the pay gate.
    const source = readFileSync(join(__dirname, "../src/modules/printful/webhook.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(source).toContain("timingSafeEqual(received, expected)");
    expect(source).not.toMatch(/received\.toString\(.*?\)\s*===/);
    expect(source).toContain("export function isSignedByPrintful");
  });

  it("accepts either case of hexadecimal, since the header's case is not ours", () => {
    expect(isSignedByPrintful(BODY, sign(BODY).toUpperCase(), SECRET_HEX)).toBe(true);
  });
});

describe("reading the event", () => {
  const parse = (over: Record<string, unknown>) =>
    printfulWebhookEvent({ type: "shipment_sent", occurred_at: "2026-09-09T10:00:00Z", ...over });

  it("takes the four events this shop subscribes to", () => {
    for (const type of PRINTFUL_EVENTS) {
      const event = printfulWebhookEvent({ type, data: { order: { id: 1 } } });
      expect(`${type}: ${String(event?.type)}`).toBe(`${type}: ${type}`);
    }
  });

  it("ignores an event it does not act on, rather than refusing it", () => {
    // Printful retries a non-2xx "after 1, 4, 16, 64, 256 and 1024 minutes",
    // so refusing an event we simply do not handle earns six redeliveries of
    // something we will ignore six more times.
    for (const type of ["product_synced", "stock_updated", "order_put_hold", ""]) {
      expect(`${type}: ${String(printfulWebhookEvent({ type, data: {} }))}`).toBe(`${type}: null`);
    }
  });

  it("finds the tracking details a buyer is owed", () => {
    const event = parse({
      data: { order: { id: 175705264 }, shipment: { tracking_number: "TRK1", tracking_url: "https://t/1", carrier: "DPD" } },
    });
    expect(event?.shipment).toEqual({
      printfulOrderId: "175705264",
      trackingNumber: "TRK1",
      trackingUrl: "https://t/1",
      carrier: "DPD",
    });
  });

  it("takes the order id as a string, whichever type it arrived as", () => {
    // `printful_submission.printful_order_id` is text, because an identifier
    // is not a number. A mismatch here would fail to find the row it is about.
    expect(parse({ data: { order: { id: 175705264 } } })?.shipment?.printfulOrderId).toBe("175705264");
    expect(parse({ data: { order: { id: "175705264" } } })?.shipment?.printfulOrderId).toBe("175705264");
  });

  it("finds the order id wherever the payload carries it", () => {
    for (const data of [{ order: { id: 7 } }, { shipment: { order_id: 7 } }, { order_id: 7 }]) {
      expect(`${JSON.stringify(data)}: ${String(parse({ data })?.shipment?.printfulOrderId)}`).toBe(
        `${JSON.stringify(data)}: 7`,
      );
    }
  });

  it("records a shipment with no tracking number rather than holding it back", () => {
    // Ordinary: some carriers issue one late. "It shipped" is worth telling a
    // buyer without waiting for "and here is where it is".
    const event = parse({ data: { order: { id: 7 }, shipment: {} } });
    expect(event?.shipment?.printfulOrderId).toBe("7");
    expect(event?.shipment?.trackingNumber).toBeNull();
  });

  it("refuses a shipment it cannot attribute to an order", () => {
    // Attributing it to the wrong order is worse than dropping it: it would
    // tell one buyer their parcel shipped because somebody else's did.
    expect(parse({ data: { shipment: { tracking_number: "TRK1" } } })?.shipment).toBeNull();
  });

  it("survives a payload that is nothing like an event", () => {
    for (const body of [null, undefined, "", 7, [], {}, { type: 7 }]) {
      expect(`${String(JSON.stringify(body))}: ${String(printfulWebhookEvent(body))}`).toBe(
        `${String(JSON.stringify(body))}: null`,
      );
    }
  });

  it("keeps an unreadable timestamp as absent rather than as now", () => {
    // A shipment dated by whenever the worker happened to catch up is wrong on
    // its face -- the argument `issue.ts` makes for passing the order's own
    // time in.
    expect(parse({ occurred_at: "not a date", data: { order: { id: 7 } } })?.occurredAt).toBeNull();
    expect(parse({ occurred_at: "2026-09-09T10:00:00Z", data: { order: { id: 7 } } })?.occurredAt).toEqual(
      new Date("2026-09-09T10:00:00Z"),
    );
  });
});

describe("the route's own wiring, which a unit test cannot reach", () => {
  /**
   * **Asserted against the source**, the disposition `checkout-address.test.ts`
   * settled for the pay gate: an HTTP route needs a running Medusa, and the
   * three facts below are the ones whose absence would be silent.
   */
  const source = readFileSync(join(__dirname, "../src/api/webhooks/printful/route.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

  it("verifies the raw body, not the parsed one", () => {
    // Signing `req.body` would refuse every genuine event, and the refusal
    // would look like a Printful problem.
    // **Written first as "does not call it with `req.body`", and mutation
    // walked past by wrapping it in `JSON.stringify`.** The positive form is
    // the checkable one: the first argument is the raw buffer.
    expect(source).toMatch(/isSignedByPrintful\(\s*rawBody,/);
    expect(source).not.toMatch(/isSignedByPrintful\([^)]*req\.body/);
  });

  it("refuses when the deployment holds no secret", () => {
    // Verifying nothing must mean accepting nothing. §23 keeps every
    // deployment in exactly that state until the publication gate.
    expect(source).toMatch(/secret === null/);
    expect(source).toMatch(/401/);
  });

  it("answers 200 to a signed event it does not act on", () => {
    // Printful retries a non-2xx six times over about eighteen hours.
    expect(source).toMatch(/event === null[\s\S]*?status\(200\)/);
  });

  it("tells the buyer, which P11a deliberately did not", () => {
    // **This asserted the opposite until P11b**, which is the point of having
    // written it: P11a recorded and said nothing, and the guard held it to
    // that. `parcel-shipped.test.ts` holds the sending itself to being once.
    expect(source).toContain("tellTheBuyer");
  });

  it("reads the stripping, so a broken regex cannot pass by emptying the file", () => {
    expect(source).toContain("export async function POST");
  });
});

describe("the middleware that makes the signature checkable", () => {
  // Comments stripped: the header explains `preserveRawBody` at length, and
  // counting those mentions would make the assertion below meaningless.
  const source = readFileSync(join(__dirname, "../src/api/middlewares.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

  it("preserves the raw body for this route", () => {
    expect(source).toContain("preserveRawBody: true");
    expect(source).toContain("/webhooks/printful");
  });

  it("does not preserve it everywhere, which would keep a second copy of every request", () => {
    expect(source).not.toMatch(/matcher:\s*"\/\*?"/);
    expect((source.match(/preserveRawBody/g) ?? []).length).toBe(1);
  });
});

describe("events arriving out of order, which Printful's retries make routine", () => {
  /**
   * **Printful retries a non-2xx after 1, 4, 16, 64, 256 and 1024 minutes**, so
   * a delivery that failed once can land eighteen hours later — after the
   * parcel has been refused and `shipment_returned` recorded.
   *
   * Gate D found the delayed `shipment_sent` overwriting it, so the shop's own
   * record said a parcel was on its way to a buyer it had already bounced off.
   * The route reads the source, so these assert the rule against it — the
   * route needs a running Medusa and the comparison is the whole of the fix.
   */
  const source = readFileSync(join(__dirname, "../src/api/webhooks/printful/route.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

  it("compares an arriving event against what the row already holds", () => {
    expect(source).toMatch(/event\.occurredAt\.getTime\(\) < held\.getTime\(\)/);
    expect(source).toMatch(/is older than what is recorded; ignored/);
  });

  it("compares on Printful's own clock, not on arrival", () => {
    // The only clock that orders the events. `new Date()` here would order
    // them by when this process happened to receive them, which is the thing
    // that went wrong.
    const guard = source.slice(source.indexOf("const held ="), source.indexOf("alreadyShipped ="));
    expect(guard).toContain("row.last_event_at");
    expect(guard).not.toMatch(/new Date\(\)/);
  });

  it("acknowledges a stale event rather than refusing it", () => {
    // A non-2xx earns six more deliveries of something already superseded.
    const guard = source.slice(source.indexOf("is older than what is recorded"), source.indexOf("alreadyShipped ="));
    expect(guard).toMatch(/status\(200\)/);
  });

  it("treats an event with no timestamp as current", () => {
    // Refusing it would drop a real event over a missing field, and last
    // writer wins is what happened before the check existed.
    expect(source).toMatch(/event\.occurredAt !== null && held !== null/);
  });

  it("keeps the shipped date when a later event is not a shipment", () => {
    // It was nulled on every other event, so a `shipment_returned` erased the
    // date the parcel actually went out -- the one fact a return is measured
    // from.
    expect(source).toMatch(/shipped_at: event\.type === "shipment_sent" \? event\.occurredAt : timestamp\(row\.shipped_at\)/);
  });
});

describe("an order Printful cancels or fails after it was placed", () => {
  /**
   * `submitPrintfulOrder` calls these "the one outcome that has to reach a
   * person" and logs at error. **The same outcome arriving later by webhook
   * was logged at info**, left the local status saying `submitted`, and told
   * nobody — so a buyer had paid, the shop's record said the order was placed
   * and fine, and nothing was coming. Gate D found it.
   */
  const source = readFileSync(join(__dirname, "../src/api/webhooks/printful/route.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

  it("stops the local status saying the order was submitted", () => {
    expect(source).toMatch(/event\.type === "order_canceled" \|\| event\.type === "order_failed"\s*\?\s*\{ status: "canceled"/);
  });

  it("says it at error, because a buyer has paid and nothing is coming", () => {
    expect(source).toMatch(/logger\.error\(\s*`printful \$\{event\.type\} for order/);
    expect(source).toMatch(/the buyer has paid and this order will not be made/);
  });

  it("still logs an ordinary shipment at info", () => {
    // Not everything is an emergency; a log that says so about a parcel going
    // out is one nobody reads.
    expect(source).toMatch(/logger\.info\(`printful \$\{event\.type\} recorded for order/);
  });
});
