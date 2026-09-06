/**
 * One order, one certificate.
 *
 * The first subscriber in this backend. It reads the order Medusa has just
 * placed and asks the deal module to mint its certificate — which, on a
 * redelivery, means being handed the one that already exists.
 *
 * **It cannot throw.** Medusa's Redis event bus retries a subscriber that
 * rejects, and a defect that fails on every delivery of the same event becomes
 * an event storm rather than a logged failure. An order that took money and
 * has no certificate is recoverable by hand from the order record; a worker
 * spinning on a poison message is not. So everything below either succeeds or
 * writes one error line naming the order, and returns.
 */

import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys, OrderWorkflowEvents } from "@medusajs/framework/utils";

import { DEAL_MODULE } from "../modules/deal";
import { readInscription } from "../modules/deal/inscription";
import type { DealIssuanceInput, IssuedDeal } from "../modules/deal/issue";

interface OrderPlacedEvent {
  readonly id: string;
}

interface QueriedOrderItem {
  readonly title?: unknown;
  readonly detail?: { readonly quantity?: unknown } | null;
}

interface QueriedOrder {
  readonly id?: unknown;
  readonly currency_code?: unknown;
  readonly total?: unknown;
  readonly created_at?: unknown;
  readonly metadata?: unknown;
  readonly items?: readonly QueriedOrderItem[] | null;
}

/** Medusa carries money as a `BigNumber`-backed value that serialises to a number here; anything else is not an amount. */
function amount(value: unknown): number | null {
  const numeric = typeof value === "string" ? Number(value) : value;
  return typeof numeric === "number" && Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * The single certificate this order is for, or `null` if it is not for exactly
 * one.
 *
 * **Why a certificate is refused rather than guessed.** Nothing in the
 * storefront stops a visitor adding a second tier, or the same tier twice —
 * `addToCart` appends to whatever cart the cookie names, and Medusa merges a
 * repeated variant into one line of quantity two. Contract §16 gives the deal
 * one `order_id` and no line reference, so a two-item order has no single
 * tier and no single price this can put on a document. Choosing one would
 * print a transaction that did not happen, which `AGENTS.md` forbids in as
 * many words.
 *
 * **This is a stopgap and it is named as one.** C3 owns the checkout and is
 * where one-certificate-per-order becomes true rather than merely expected;
 * until then this refuses loudly instead of certifying something false. It is
 * not reachable by a customer today — both environments are behind Access and
 * no live payment key exists.
 */
function soleTier(items: readonly QueriedOrderItem[] | null | undefined): string | null {
  if (!Array.isArray(items) || items.length !== 1) return null;
  const only = items[0];
  const quantity = only?.detail?.quantity;
  if (Number(quantity) !== 1) return null;
  return text(only?.title);
}

export default async function orderPlaced({
  event,
  container,
}: SubscriberArgs<OrderPlacedEvent>): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const orderId = event.data.id;

  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const { data } = await query.graph({
      entity: "order",
      fields: ["id", "currency_code", "total", "created_at", "metadata", "items.title", "items.detail.quantity"],
      filters: { id: orderId },
    });

    const order = data[0] as QueriedOrder | undefined;
    const tier = soleTier(order?.items);
    const total = amount(order?.total);
    const currencyCode = text(order?.currency_code);
    const issuedAt = order?.created_at instanceof Date ? order.created_at : new Date(String(order?.created_at));

    if (order?.id === undefined || tier === null || total === null || currencyCode === null || Number.isNaN(issuedAt.getTime())) {
      // Named parts, not a dump: this line is what an operator reads when a
      // paid order has no certificate, and "which of the five was missing" is
      // the whole of what they need from it.
      logger.error(
        `deal issuance skipped for order ${orderId}: ` +
          `tier=${tier ?? "none"} total=${total ?? "none"} currency=${currencyCode ?? "none"} ` +
          `issued_at=${Number.isNaN(issuedAt.getTime()) ? "none" : "ok"}`,
      );
      return;
    }

    const inscription = readInscription(order.metadata);
    const input: DealIssuanceInput = {
      orderId: String(order.id),
      tier,
      amountPaid: total,
      currencyCode,
      displayName: inscription.displayName,
      dedication: inscription.dedication,
      issuedAt,
    };

    const deals = container.resolve(DEAL_MODULE) as { issueDeal(input: DealIssuanceInput): Promise<IssuedDeal> };
    const deal = await deals.issueDeal(input);

    // The serial, not the slug. The slug is the certificate's address and §5
    // makes it the only thing standing between the document and the whole
    // internet -- a log line is a place it would outlive its purpose.
    logger.info(`deal #${deal.serial} issued for order ${orderId}`);
  } catch (error) {
    logger.error(
      `deal issuance failed for order ${orderId}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// `OrderWorkflowEvents.PLACED` rather than the string, so a rename in Medusa
// is a type error here instead of a subscriber that silently stops firing.
export const config: SubscriberConfig = { event: OrderWorkflowEvents.PLACED };
