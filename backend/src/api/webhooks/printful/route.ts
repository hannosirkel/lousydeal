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
 * **It records and does not email.** The message to the buyer is P11b, and
 * keeping it out of here is the same argument `fulfilment-provider.ts` makes
 * about `createFulfillment`: a retried delivery must not send a second email,
 * and the thing that makes it not do so is a row that already says shipped.
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { readBackendRuntimeConfig } from "../../../config/runtime";
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

  await submissions.updatePrintfulSubmissions({
    id: row.id,
    printful_status: event.type,
    tracking_number: event.shipment.trackingNumber,
    tracking_url: event.shipment.trackingUrl,
    carrier: event.shipment.carrier,
    shipped_at: event.type === "shipment_sent" ? event.occurredAt : null,
  });

  logger.info(`printful ${event.type} recorded for order ${row.order_id}`);
  res.status(200).json({ ok: true });
}
