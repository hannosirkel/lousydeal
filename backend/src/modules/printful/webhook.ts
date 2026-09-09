/**
 * Deciding whether a request that says it is from Printful is from Printful.
 *
 * **v2 webhooks, and that is the whole reason this uses v2.** Event signing
 * was introduced with them; v1 webhooks carry no signature at all, so a v1
 * endpoint is a URL that marks orders shipped for anybody who learns it. The
 * spec is blunt about the exposure — "the webhook URL used to accept the
 * events needs to be publicly available" — and equally blunt about the answer:
 * "If you find that you receive an event with invalid or missing signature,
 * you should ignore the event."
 *
 * Printful sends two headers:
 *
 *   `x-pf-webhook-signature`   hexadecimal HMAC-SHA256 of the raw body
 *   `x-pf-webhook-public-key`  base64, identifying *which* configuration
 *                              signed it, where one URL serves several
 *
 * **The secret is hex and is not the key.** Printful returns `secret_key` as
 * "the hexadecimal representation of the secret key", and its own note says
 * you "need to decode it before passing it to the tool or method that
 * calculates the signature". Using the hex *string* as the HMAC key produces a
 * different digest from every valid event — an endpoint that rejects
 * everything, which looks like a Printful problem and is not. It is decoded
 * here, once, and the test drives a signature computed both ways so the wrong
 * one cannot pass.
 *
 * **It is also visible only once.** "Visible only once upon configuration
 * set-up", so the value is captured when the subscription is created and kept
 * where the API token is kept. A deployment without it verifies nothing and is
 * therefore not allowed to accept anything — see {@link printfulWebhookEvent}.
 *
 * **The raw body, not the parsed one.** A signature is over bytes, and
 * `JSON.parse` then `JSON.stringify` is not the identity: key order, unicode
 * escaping and whitespace all move. Medusa preserves the raw body only where a
 * route asks for it (`framework/dist/http/middlewares/bodyparser.js`), which
 * is what `api/middlewares.ts` does for this one path and nothing else.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export const PRINTFUL_SIGNATURE_HEADER = "x-pf-webhook-signature";
export const PRINTFUL_PUBLIC_KEY_HEADER = "x-pf-webhook-public-key";

/**
 * Whether the body was signed with this secret.
 *
 * `false` for every failure — a missing header, a malformed one, the wrong
 * length, the wrong digest. The caller does not get to tell them apart,
 * because a caller that could would be tempted to log which, and "signature
 * present but wrong" is a different sentence from "no signature" only to
 * somebody probing the endpoint.
 */
export function isSignedByPrintful(rawBody: Buffer | string, signature: unknown, secretHex: string): boolean {
  if (typeof signature !== "string" || !/^[0-9a-fA-F]+$/.test(signature)) return false;
  if (!/^[0-9a-fA-F]+$/.test(secretHex) || secretHex.length % 2 !== 0) return false;

  // The secret's *bytes*, not its hexadecimal spelling. See this file's head.
  const key = Buffer.from(secretHex, "hex");
  const expected = createHmac("sha256", key).update(rawBody).digest();

  let received: Buffer;
  try {
    received = Buffer.from(signature, "hex");
  } catch {
    return false;
  }

  // Length first: `timingSafeEqual` throws rather than returning false when
  // the two differ, and a throw here would be a 500 where a 401 belongs.
  if (received.length !== expected.length) return false;
  return timingSafeEqual(received, expected);
}

/** The events this shop subscribes to, and the only ones it acts on. */
export const PRINTFUL_EVENTS = ["shipment_sent", "shipment_returned", "order_failed", "order_canceled"] as const;

export type PrintfulEventType = (typeof PRINTFUL_EVENTS)[number];

export interface PrintfulShipment {
  /** Printful's own order id, which is what `printful_submission` stores. */
  readonly printfulOrderId: string;
  readonly trackingNumber: string | null;
  readonly trackingUrl: string | null;
  readonly carrier: string | null;
}

export interface PrintfulEvent {
  readonly type: PrintfulEventType;
  readonly occurredAt: Date | null;
  readonly shipment: PrintfulShipment | null;
}

function text(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function isEventType(value: unknown): value is PrintfulEventType {
  return typeof value === "string" && (PRINTFUL_EVENTS as readonly string[]).includes(value);
}

/**
 * The event, or `null` for anything this shop does not act on.
 *
 * `null` rather than a throw, and the route answers 2xx to it: Printful
 * retries a non-2xx "after 1, 4, 16, 64, 256 and 1024 minutes", so refusing an
 * event we simply do not handle would earn six redeliveries of something we
 * will ignore six more times. Acknowledged and dropped is the honest answer to
 * a message meant for somebody else.
 */
export function printfulWebhookEvent(body: unknown): PrintfulEvent | null {
  if (typeof body !== "object" || body === null) return null;
  const envelope = body as { readonly type?: unknown; readonly occurred_at?: unknown; readonly data?: unknown };
  if (!isEventType(envelope.type)) return null;

  const occurred = text(envelope.occurred_at);
  const occurredAt = occurred === null ? null : new Date(occurred);

  return {
    type: envelope.type,
    occurredAt: occurredAt !== null && !Number.isNaN(occurredAt.getTime()) ? occurredAt : null,
    shipment: shipmentOf(envelope.data),
  };
}

/**
 * The shipment, dug out of `data` wherever Printful put it.
 *
 * The order id is required and the rest is not: an event naming no order is an
 * event this shop cannot attribute, and attributing it to the wrong one is
 * worse than dropping it. A shipment with no tracking number is ordinary —
 * some carriers give one late — and is recorded as shipped without one rather
 * than held back.
 */
function shipmentOf(data: unknown): PrintfulShipment | null {
  if (typeof data !== "object" || data === null) return null;
  const bag = data as Record<string, unknown>;

  const shipment = (typeof bag.shipment === "object" && bag.shipment !== null ? bag.shipment : bag) as Record<
    string,
    unknown
  >;
  const order = (typeof bag.order === "object" && bag.order !== null ? bag.order : {}) as Record<string, unknown>;

  const printfulOrderId = text(order.id) ?? text(shipment.order_id) ?? text(bag.order_id);
  if (printfulOrderId === null) return null;

  return {
    printfulOrderId,
    trackingNumber: text(shipment.tracking_number),
    trackingUrl: text(shipment.tracking_url),
    carrier: text(shipment.carrier) ?? text(shipment.service),
  };
}
