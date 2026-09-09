/**
 * Printful telling us a parcel moved.
 *
 * §7 asks for "status synchronization as reasonably required", and this is the
 * inbound half. A buyer who has paid for a physical object and can never learn
 * whether it shipped is a support burden and a distance-selling problem at
 * once.
 *
 * **The endpoint is public and the signature is the whole of the door.**
 * Printful has to be able to reach it, so anyone who learns the URL can post
 * to it; `webhook.ts` decides whether what arrived was signed with the secret
 * this deployment holds. Without a secret nothing is accepted — a deployment
 * that cannot verify must not act, which is the state §23 keeps every
 * deployment in until the publication gate.
 *
 * **What a refusal answers, and why it matters.** Printful retries a non-2xx
 * "after 1, 4, 16, 64, 256 and 1024 minutes". So:
 *
 *   unsigned or wrongly signed  401, and it will be retried. Correct: if the
 *                               secret was rotated and this deployment has the
 *                               old one, the retries are the window in which
 *                               somebody can fix it.
 *   signed, event not ours      200. Refusing earns six redeliveries of
 *                               something that will be ignored six more times.
 *   signed, order unknown       200. The order is not this shop's, or is one
 *                               whose submission row was never written; either
 *                               way retrying changes nothing.
 *   signed and handled          200.
 *
 * **It records, and then tells the buyer once.** A redelivered event must not
 * send a second message, and two things stop it: the row is read before it is
 * written, so an event arriving against a submission already marked
 * `shipment_sent` records and says nothing; and the notification carries an
 * idempotency key derived from the order, which Medusa's notification module
 * enforces inside a transaction
 * (`@medusajs/notification/dist/services/notification-module-service.js:39-75`).
 *
 * The first is the cheap check and the second is the one that survives two
 * deliveries arriving together. Neither is a reason to skip the other.
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

import { readBackendRuntimeConfig } from "../../../config/runtime";
import { buildParcelShipped } from "../../../notifications/parcel-shipped";
import { DEAL_MODULE } from "../../../modules/deal";
import {
  PRINTFUL_SIGNATURE_HEADER,
  isSignedByPrintful,
  printfulWebhookEvent,
} from "../../../modules/printful/webhook";

interface SubmissionRow {
  readonly id: string;
  readonly order_id: string;
  readonly printful_order_id: string | null;
  readonly printful_status: string | null;
}

interface Submissions {
  listPrintfulSubmissions(filters: Record<string, unknown>): Promise<SubmissionRow[]>;
  updatePrintfulSubmissions(data: Record<string, unknown>): Promise<unknown>;
}

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);
  const secret = readBackendRuntimeConfig(process.env).printfulWebhookSecret;

  // `rawBody` and not `body`: see `api/middlewares.ts`. Absent means the
  // middleware is not in force, and verifying a re-serialised body would
  // reject every genuine event -- so it refuses rather than guessing.
  const raw: unknown = (req as { rawBody?: unknown }).rawBody;
  const rawBody = Buffer.isBuffer(raw) ? raw : typeof raw === "string" ? Buffer.from(raw, "utf8") : null;

  if (secret === null || rawBody === null || !isSignedByPrintful(rawBody, req.headers[PRINTFUL_SIGNATURE_HEADER], secret)) {
    // No detail, deliberately: "signature present but wrong" is a different
    // sentence from "no signature" only to somebody probing the endpoint.
    logger.error("printful webhook rejected: the request was not signed with this deployment's secret");
    res.status(401).json({ ok: false });
    return;
  }

  const event = printfulWebhookEvent(req.body);
  if (event === null || event.shipment === null) {
    // Acknowledged and dropped. Retrying an event we do not act on wastes six
    // deliveries on both sides.
    res.status(200).json({ ok: true });
    return;
  }

  const submissions = req.scope.resolve(DEAL_MODULE) as Submissions;
  const rows = await submissions.listPrintfulSubmissions({ printful_order_id: event.shipment.printfulOrderId });
  const row = rows[0];

  if (row === undefined) {
    // Not this shop's order, or one whose submission row was never written.
    // Retrying changes neither.
    logger.error(`printful webhook for unknown order ${event.shipment.printfulOrderId}; nothing recorded`);
    res.status(200).json({ ok: true });
    return;
  }

  // Read before written: an event arriving against a row that already says
  // shipped is a redelivery, and it records without telling anybody twice.
  const alreadyShipped = row.printful_status === "shipment_sent";

  await submissions.updatePrintfulSubmissions({
    id: row.id,
    printful_status: event.type,
    tracking_number: event.shipment.trackingNumber,
    tracking_url: event.shipment.trackingUrl,
    carrier: event.shipment.carrier,
    shipped_at: event.type === "shipment_sent" ? event.occurredAt : null,
  });

  logger.info(`printful ${event.type} recorded for order ${row.order_id}`);

  if (event.type === "shipment_sent" && !alreadyShipped) {
    await tellTheBuyer(req, row.order_id, event.shipment);
  }

  res.status(200).json({ ok: true });
}

/**
 * One message, to the address the order carries.
 *
 * **Failures are logged and swallowed.** A parcel that shipped has shipped
 * whatever the mail server did, and answering Printful with a non-2xx would
 * earn six redeliveries of an event already recorded — which would then find
 * the row saying shipped and send nothing anyway. The buyer is better served
 * by an operator reading a log line than by a retry storm.
 */
async function tellTheBuyer(
  req: MedusaRequest,
  orderId: string,
  shipment: { readonly trackingNumber: string | null; readonly trackingUrl: string | null; readonly carrier: string | null },
): Promise<void> {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
    const { data } = await query.graph({
      entity: "order",
      fields: ["id", "display_id", "email"],
      filters: { id: orderId },
    });
    const order = data[0] as { display_id?: unknown; email?: unknown } | undefined;
    const address = typeof order?.email === "string" ? order.email : null;
    if (address === null) {
      logger.error(`no shipped message sent for order ${orderId}: the order carries no email address`);
      return;
    }

    const runtime = readBackendRuntimeConfig(process.env);
    const displayId = typeof order?.display_id === "number" ? `#${String(order.display_id)}` : orderId;
    const message = buildParcelShipped({ orderDisplayId: displayId, ...shipment }, runtime.merchant);
    if (message === null) {
      logger.error(`no shipped message sent for order ${orderId}: the trader identity is incomplete`);
      return;
    }

    await req.scope.resolve(Modules.NOTIFICATION).createNotifications({
      to: address,
      channel: "email",
      template: "parcel-shipped",
      content: message,
      // The second guard, and the one that survives two deliveries arriving
      // together: the module enforces this inside a transaction.
      idempotency_key: `lousydeal:parcel-shipped:${orderId}`,
    });
    // The address is not logged, for the reason `order-placed.ts` gives: it is
    // the one piece of personal data here, and a log line outlives the order
    // record's own retention.
    logger.info(`shipped message sent for order ${orderId}`);
  } catch (error) {
    logger.error(
      `shipped message failed for order ${orderId}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
