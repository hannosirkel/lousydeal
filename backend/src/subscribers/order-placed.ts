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
import { ContainerRegistrationKeys, Modules, OrderWorkflowEvents } from "@medusajs/framework/utils";

import { PRODUCT_TIERS } from "../commerce/product-model";
import { createPrintfulClient } from "../modules/printful/client";
import { printfulSubmissionFrom } from "../modules/printful/from-order";
import { createPrintfulOrders } from "../modules/printful/orders";
import { submitPrintfulOrder, type SubmissionStore } from "../modules/printful/submission";
import type { MerchantIdentity } from "../config/merchant";
import { readBackendRuntimeConfig } from "../config/runtime";
import { DEAL_MODULE } from "../modules/deal";
import { readGift } from "../modules/deal/gift";
import { readInscription } from "../modules/deal/inscription";
import type { DealIssuanceInput, IssuedDeal } from "../modules/deal/issue";
import { buildGiftMessage } from "../notifications/gift-message";
import { buildOrderConfirmation } from "../notifications/order-confirmation";

interface OrderPlacedEvent {
  readonly id: string;
}

interface QueriedOrderItem {
  readonly title?: unknown;
  readonly product_handle?: unknown;
  readonly total?: unknown;
  readonly detail?: { readonly quantity?: unknown } | null;
}

interface QueriedOrder {
  readonly id?: unknown;
  readonly email?: unknown;
  readonly currency_code?: unknown;
  readonly total?: unknown;
  readonly created_at?: unknown;
  readonly metadata?: unknown;
  readonly items?: readonly QueriedOrderItem[] | null;
}

/** Medusa carries money as a `BigNumber`-backed value that serialises to a number here; anything else is not an amount. */
/**
 * A money value from Medusa, as a number.
 *
 * **Medusa hands money over as a `BigNumber` instance, not a number.** This
 * accepted a number or a numeric string, so `typeof value === "object"` fell
 * through to `null` and every real order was skipped with `total=none` -- no
 * deal issued, no certificate, no § 55 confirmation, for an order that had
 * taken the money. It passed every test in this repository because the tests
 * supply plain numbers, and it passed C6's and C7's end-to-end runs because
 * those drive `buildOrderConfirmation` and the renderer directly rather than
 * the subscriber. C15's Gate E order is what found it: `order_01M1XYA5…` paid
 * $5 and produced nothing.
 *
 * Measured against the running backend rather than inferred:
 * `query.graph({entity: "order", fields: ["total"]})` returns an object whose
 * `constructor.name` is `BigNumber`, whose own keys are `numeric_`, `raw_` and
 * `bignumber_`, and whose `numeric`, `valueOf()` and `toJSON()` are each the
 * number `5`. `String()` gives `5.0000000000000000000`, which is why the
 * string branch below reads `numeric`/`valueOf` rather than reformatting.
 *
 * The object branch is deliberately narrow: `Number([])` is `0` and
 * `Number(null)` is `0`, either of which would arrive here as a plausible
 * amount rather than as a refusal, so neither an array nor `null` reaches the
 * conversion.
 */
function amount(value: unknown): number | null {
  const accept = (numeric: number): number | null =>
    Number.isFinite(numeric) && numeric >= 0 ? numeric : null;

  if (typeof value === "number") return accept(value);
  if (typeof value === "string") return accept(Number(value));
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;

  const numeric = (value as { readonly numeric?: unknown }).numeric;
  if (typeof numeric === "number") return accept(numeric);
  const valued = (value as { valueOf(): unknown }).valueOf();
  return typeof valued === "number" ? accept(valued) : null;
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
/**
 * What the certificate half of an order is, if it has one.
 *
 * Three outcomes rather than two, because LD-04 made "no certificate" a normal
 * order rather than a broken one — a cart may now hold a mug and nothing else.
 * `unreadable` is the only one that gets an error line.
 */
type CertificateLine =
  | { readonly kind: "certificate"; readonly tier: string; readonly amountPaid: number }
  | { readonly kind: "none" }
  | { readonly kind: "unreadable" };

/**
 * Which line is the certificate, and what was paid for it.
 *
 * **Matched on the tier's own identifiers**, `handle` and `title`, both frozen
 * in `commerce/product-model.ts`. `product_handle` is the better of the two —
 * a title is display copy — but it is nullable on Medusa's line item, so the
 * title is checked as well and both come from the same declaration.
 */
function certificateLine(items: readonly QueriedOrderItem[] | null | undefined): CertificateLine {
  if (!Array.isArray(items)) return { kind: "unreadable" };

  const handles = new Set(PRODUCT_TIERS.map((tier) => tier.handle));
  const titles = new Set(PRODUCT_TIERS.map((tier) => tier.title));
  const certificates = items.filter(
    (item) => handles.has(text(item.product_handle) ?? "") || titles.has(text(item.title) ?? ""),
  );

  // Nothing to issue, and nothing wrong. LD-04 lets a cart hold merch, so an
  // order of one mug is a complete and correct order that produces no
  // certificate. Reporting it as a failure would fill the log with the shop
  // working.
  if (certificates.length === 0) return { kind: "none" };

  // §16 gives a deal one `order_id` and no line reference, so two
  // certificates in one order have no single tier and no single price to put
  // on a document. Refusing is still right; only "more than one line" stopped
  // being the test for it.
  if (certificates.length > 1) return { kind: "unreadable" };

  const only = certificates[0];
  if (Number(only?.detail?.quantity) !== 1) return { kind: "unreadable" };

  const tier = text(only?.title);
  // **The line's own total, not the order's.** Constraint 10, and the lie this
  // row exists to remove: with a $15 mug beside it, `order.total` would print
  // $20 on a $5 certificate and add $20 to the public counter -- a fabricated
  // transaction total, on the two surfaces §11 exists to protect.
  const amountPaid = amount(only?.total);
  if (tier === null || amountPaid === null) return { kind: "unreadable" };

  return { kind: "certificate", tier, amountPaid };
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
      fields: [
        "id",
        "email",
        "currency_code",
        "total",
        "created_at",
        "metadata",
        "items.title",
        // LD-04 P6a. Which line is the certificate, and what was paid for
        // *it* -- not for the order, which may now also hold a mug.
        "items.product_handle",
        "items.total",
        "items.detail.quantity",
        // **The fallback `from-order.ts` documents, made reachable.** It reads
        // `item.detail?.quantity ?? item.quantity`, and a test covers the
        // second half -- but this query never asked for that field, so the
        // fallback could not fire in production however well it was tested.
        "items.quantity",
        // LD-04 P8c. The SKU is what `orders.ts` resolves against the store,
        // and the address is where the parcel goes. Neither is read by the
        // certificate half, and both are absent from an order of certificates.
        "items.variant_sku",
        "shipping_address.first_name",
        "shipping_address.last_name",
        "shipping_address.address_1",
        "shipping_address.city",
        "shipping_address.country_code",
        "shipping_address.postal_code",
        "shipping_address.province",
      ],
      filters: { id: orderId },
    });

    const order = data[0] as QueriedOrder | undefined;

    // **Before the certificate, and outside its control flow.** An order with
    // no certificate returns early below -- correctly, there is nothing to
    // issue -- and merch alone is exactly that order. Placing this call after
    // that return would mean the one cart shape that is nothing but parcels
    // never reached Printful at all.
    //
    // Its own try/catch for the same reason: the two are independent
    // obligations to the same buyer. A certificate that fails to issue must
    // not stop a paid-for shirt being printed, and a Printful outage must not
    // stop the § 55 confirmation going out.
    await submitMerch({ container, logger, order, orderId });

    const line = certificateLine(order?.items);
    // Still read, and still required. LD-04 P6a moved the *certificate's*
    // amount onto its own line; the § 55 confirmation is about the order and
    // states what the order cost, so an unreadable order total is still a
    // refusal. Two numbers, two documents.
    const total = amount(order?.total);
    const currencyCode = text(order?.currency_code);
    const issuedAt = order?.created_at instanceof Date ? order.created_at : new Date(String(order?.created_at));

    // **An order with no certificate is an anomaly now, and gets an error
    // line.** LD-04 read §7 as admitting a merch-only cart and this branch
    // logged at info, calling it "a complete order". The operator settled it
    // on 2026-09-09: merch is an upsell, and `isPayableCart` refuses a cart
    // without a certificate.
    //
    // The Store API's line-item route is public, so the state is still
    // reachable by anyone who wants it — which is exactly why this is a log
    // line and not a throw. Something was paid for and no certificate issues;
    // a person needs to know, and the merch still reaches Printful because
    // `submitMerch` runs before this and does not depend on it.
    if (line.kind === "none") {
      logger.error(
        `order ${orderId} carries no certificate, which no payable cart should: nothing issued and no § 55 confirmation sent`,
      );
      return;
    }

    if (
      order?.id === undefined ||
      line.kind === "unreadable" ||
      total === null ||
      currencyCode === null ||
      Number.isNaN(issuedAt.getTime())
    ) {
      // Named parts, not a dump: this line is what an operator reads when a
      // paid order has no certificate, and "which of them was missing" is the
      // whole of what they need from it.
      logger.error(
        `deal issuance skipped for order ${orderId}: ` +
          `certificate=${line.kind} total=${total ?? "none"} currency=${currencyCode ?? "none"} ` +
          `issued_at=${Number.isNaN(issuedAt.getTime()) ? "none" : "ok"}`,
      );
      return;
    }

    const inscription = readInscription(order.metadata);
    const input: DealIssuanceInput = {
      orderId: String(order.id),
      tier: line.tier,
      amountPaid: line.amountPaid,
      currencyCode,
      displayName: inscription.displayName,
      dedication: inscription.dedication,
      // §6's four fields, from the same metadata bag the inscription comes
      // out of and behind the same trust boundary: the endpoint that wrote
      // them is public. `null` when the order was not a gift, which is
      // decided by whether a usable recipient address survived.
      gift: readGift(order.metadata),
      issuedAt,
    };

    const deals = container.resolve(DEAL_MODULE) as { issueDeal(input: DealIssuanceInput): Promise<IssuedDeal> };
    const deal = await deals.issueDeal(input);

    // The serial, not the slug. The slug is the certificate's address and §5
    // makes it the only thing standing between the document and the whole
    // internet -- a log line is a place it would outlive its purpose.
    logger.info(`deal #${deal.serial} issued for order ${orderId}`);

    await sendConfirmation({
      container,
      logger,
      order,
      deal,
      orderId,
      tier: line.tier,
      // Decided from the same lines `printfulSubmissionFrom` reads, so the
      // confirmation and the parcel cannot disagree about whether there is one.
      hasPostedGoods: (printfulSubmissionFrom(order, PRODUCT_TIERS.map((t) => t.handle), new Date())?.input.lines.length ?? 0) > 0,
    });
  } catch (error) {
    logger.error(
      `deal issuance failed for order ${orderId}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * The idempotency keys Medusa's notification module dedupes on.
 *
 * **This is what makes a redelivered event send nothing further**, and it is
 * the answer to the question LD-03's plan told G5 to decide on evidence rather
 * than in advance: no new column, no `sent_at`, no second source of truth.
 * `CreateNotificationDTO` carries an `idempotency_key`, and
 * `@medusajs/notification/dist/services/notification-module-service.js:39-75`
 * enforces it inside a transaction — it lists the notifications already
 * holding these keys and creates only the ones absent, so a second delivery
 * creates nothing and sends nothing.
 *
 * Better than a column would have been, for a reason worth stating: the
 * exclusion is keyed on `status === FAILURE`, so a send that *failed* is
 * retried on the next delivery while one that succeeded is not. A column
 * written after a successful send would have had the same effect; a column
 * written before it would have swallowed the retry.
 *
 * **`deal.id`, not the order id.** The deal is minted once per order by C2's
 * read-first/insert/read-again, so its id is the stable thing a replay
 * recovers. It is also what a human debugging a missing message has in front
 * of them.
 *
 * **The race window is real and is not closed here.** That module's own source
 * carries `// TODO: At this point we should probably take a lock with the
 * idempotency keys so we don't have race conditions.` — two deliveries
 * arriving at the same instant can both pass the list and both send. The
 * database's unique index makes that impossible for *issuance*; nothing makes
 * it impossible for a send. What this closes is the ordinary case, which is
 * sequential redelivery after a worker restart or a Stripe retry.
 */
/**
 * Places the Printful order for whatever in this order has to be posted.
 *
 * **Silent where the deployment has no Printful.** §23 keeps a live store out
 * until the publication gate, so `printfulApiToken` is `null` on the
 * deployments that exist today and nothing here is reachable. That is not a
 * degraded mode: without a token the checkout cannot quote postage either, so
 * a cart holding a parcel cannot be paid for in the first place.
 *
 * Errors are logged and swallowed. `submitPrintfulOrder` has already written
 * down what happened -- that is what the `printful_submission` row is for --
 * and rethrowing here would take the certificate's confirmation down with it.
 */
async function submitMerch({
  container,
  logger,
  order,
  orderId,
}: {
  container: SubscriberArgs["container"];
  logger: { info(message: string): void; error(message: string): void };
  order: QueriedOrder | undefined;
  orderId: string;
}): Promise<void> {
  const runtime = readBackendRuntimeConfig(process.env);
  if (runtime.printfulApiToken === null) return;

  const plan = printfulSubmissionFrom(order, PRODUCT_TIERS.map((tier) => tier.handle), new Date());
  if (plan === null) {
    logger.error(`printful submission skipped for order ${orderId}: the order has no readable id`);
    return;
  }

  // Said before the attempt, not after, and said even when the order still
  // goes: a line that cannot be ordered is a parcel arriving short, and
  // nothing downstream would ever mention it.
  if (plan.unorderable > 0) {
    logger.error(
      `order ${orderId} has ${String(plan.unorderable)} line(s) that cannot be ordered from Printful; ` +
        `${String(plan.input.lines.length)} will be`,
    );
  }

  try {
    const submissions = container.resolve(DEAL_MODULE) as SubmissionStore;
    const orders = createPrintfulOrders(createPrintfulClient({ token: runtime.printfulApiToken }));
    const record = await submitPrintfulOrder(submissions, orders, plan.input);

    if (record.status === "skipped") return;
    if (record.status === "submitted") {
      logger.info(`printful order ${record.printful_order_id ?? "?"} placed for order ${orderId}`);
      return;
    }
    // `canceled` and `failed` are both a buyer who has paid and may get
    // nothing, which is the one outcome that has to reach a person.
    logger.error(
      `printful order for ${orderId} is ${record.status} after ${String(record.attempts)} attempt(s): ` +
        `${record.last_error ?? "no reason recorded"}`,
    );
  } catch (error) {
    logger.error(
      `printful submission failed for order ${orderId}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

const notificationKey = {
  confirmation: (dealId: string) => `lousydeal:order-confirmation:${dealId}`,
  gift: (dealId: string) => `lousydeal:gift-message:${dealId}`,
} as const;

/**
 * Sends the VOS § 55(1)-(2) confirmation, or says why it did not.
 *
 * **The one thing it must never do is send a deficient one.** § 55(2) requires
 * the confirmation to carry the § 54(1) information, and a message with a
 * missing trader name has not carried it. A confirmation not sent is a duty
 * unperformed and recoverable from the order record; a confirmation sent and
 * deficient is a duty performed badly, and cannot be taken back.
 *
 * So three things must be present, and the log line names whichever is not:
 * the trader identity, this deployment's own base URL, and a mail transport.
 * All three are nullable today and all three arrive with C10 and C11.
 *
 * **It never throws.** The subscriber's own header says why: Medusa retries a
 * rejecting subscriber, and a defect that fails on every delivery of the same
 * event is an event storm rather than a logged failure.
 */
async function sendConfirmation({
  container,
  logger,
  order,
  deal,
  orderId,
  tier,
  hasPostedGoods,
}: {
  container: SubscriberArgs<OrderPlacedEvent>["container"];
  logger: { info(message: string): void; error(message: string): void };
  order: QueriedOrder;
  deal: IssuedDeal;
  orderId: string;
  /** Whether the order carried anything posted. § 55(2) is about the order, not the certificate. */
  hasPostedGoods: boolean;
  /**
   * The certificate's own title, from `certificateLine`.
   *
   * Passed in rather than read off the order again: the caller already
   * decided which line is the certificate, and this function reading
   * `items[0]` is what put a mug's name on a § 55 confirmation.
   */
  tier: string;
}): Promise<void> {
  const runtime = readBackendRuntimeConfig(process.env);
  const address = text(order.email);

  const missing = [
    runtime.merchant === null ? "the trader identity" : null,
    runtime.siteBaseUrl === null ? "SITE_BASE_URL" : null,
    runtime.smtp === null ? "a mail transport" : null,
    address === null ? "an address on the order" : null,
  ].filter((what): what is string => what !== null);

  if (missing.length > 0 || runtime.siteBaseUrl === null || address === null) {
    // Deliberately loud, and per order rather than once at boot: this is the
    // § 55 confirmation, and an operator needs to know which orders did not
    // get one.
    logger.error(`no § 55 confirmation sent for order ${orderId}: missing ${missing.join(", ")}`);
    return;
  }

  // Formatted once, here, and handed to both messages. `Intl` in this process
  // and not in the certificate: `money.ts` refuses it because a shared
  // screenshot outlives the runtime that made it and two runtimes may carry
  // different ICU data. An email is formatted once and never re-formatted by a
  // reader's. Both messages print the same string for the same reason a buyer
  // and a recipient comparing them should see one number.
  const total = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (text(order.currency_code) ?? "usd").toUpperCase(),
  }).format(amount(order.total) ?? 0);
  const issuedOn = new Date(String(order.created_at)).toISOString().slice(0, 10);
  const certificateUrl = `${runtime.siteBaseUrl}/done-deals/${deal.public_slug}`;

  const message = buildOrderConfirmation(
    {
      serial: deal.serial,
      // **`line.tier`, not `items[0]`.** `certificateLine` went to the trouble
      // of finding which line is the certificate; this read the first one,
      // which is a leftover from when there was only ever one. With the upsell
      // appending merch, a buyer who added a mug before a certificate got a
      // § 55 confirmation reading `ITEM: This Mug Cost Extra` for the
      // certificate it was confirming. Gate D found it.
      tier,
      total,
      issuedOn,
      certificateUrl,
      // **Read off the deal, not off the input.** On a replay the insert never
      // happened and this function's input was rebuilt from the order; the row
      // is the record of what was actually stored. G1 put the gift on
      // `IssuedDeal` for exactly this.
      hasPostedGoods,
      giftRecipientAddress: deal.gift_recipient_email,
    },
    runtime.merchant,
    runtime.siteBaseUrl,
  );

  if (message === null) {
    logger.error(`no § 55 confirmation sent for order ${orderId}: the confirmation could not be built`);
    return;
  }

  try {
    const notification = container.resolve(Modules.NOTIFICATION);
    await notification.createNotifications({
      to: address,
      channel: "email",
      template: "order-confirmation",
      content: message,
      // A redelivered `order.placed` must not send a second § 55
      // confirmation. Nothing stopped that before this row.
      idempotency_key: notificationKey.confirmation(deal.id),
    });
    // The address is not logged. It is the one piece of personal data this
    // subscriber handles, and a log line is a place it would outlive the
    // order record's own retention.
    logger.info(`§ 55 confirmation sent for order ${orderId}`);
  } catch (error) {
    logger.error(
      `§ 55 confirmation failed for order ${orderId}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  await sendGift({
    container,
    logger,
    deal,
    orderId,
    total,
    issuedOn,
    certificateUrl,
    merchant: runtime.merchant,
    siteBaseUrl: runtime.siteBaseUrl,
  });
}

/**
 * Sends the gift message, if the order was a gift.
 *
 * **After the buyer's confirmation and never instead of it.** The § 55
 * confirmation is a legal duty on a deadline; this is a courtesy. The reverse
 * order would mean a stranger heard about the purchase before the buyer got
 * the document the law owes them, and a gift failure must never prevent the
 * confirmation — which is why the caller awaits this outside the confirmation's
 * own `try`.
 *
 * **Decided from the row, not from the input.** `deal.gift_recipient_email` is
 * what was stored; on a replay the insert never happened and any input was
 * rebuilt from the order. G1 put the gift on `IssuedDeal` for this.
 *
 * **It never throws**, for the subscriber's own reason: Medusa retries a
 * subscriber that rejects, and a defect failing on every delivery is an event
 * storm rather than a logged failure.
 */
async function sendGift({
  container,
  logger,
  deal,
  orderId,
  total,
  issuedOn,
  certificateUrl,
  merchant,
  siteBaseUrl,
}: {
  container: SubscriberArgs<OrderPlacedEvent>["container"];
  logger: { info(message: string): void; error(message: string): void };
  deal: IssuedDeal;
  orderId: string;
  total: string;
  issuedOn: string;
  certificateUrl: string;
  merchant: MerchantIdentity | null;
  siteBaseUrl: string;
}): Promise<void> {
  // **`typeof`, not `=== null`.** The column is nullable, so `null` is the
  // ordinary no-gift value -- but a store that projects a narrower row, or a
  // fake in a test, hands back `undefined`, and `undefined !== null` would
  // send a gift message for an order that was not one. Caught by
  // `order-placed-confirmation.test.ts`, whose fake deal predates these
  // columns: it counted two notifications where one was owed.
  const recipient = deal.gift_recipient_email;
  if (typeof recipient !== "string" || recipient.length === 0) return;

  const gift = buildGiftMessage(
    {
      serial: deal.serial,
      total,
      issuedOn,
      certificateUrl,
      recipientName: deal.gift_recipient_name,
      senderName: deal.gift_sender_name,
      message: deal.gift_message,
    },
    merchant,
    siteBaseUrl,
  );

  if (gift === null) {
    logger.error(`no gift message sent for order ${orderId}: the message could not be built`);
    return;
  }

  try {
    const notification = container.resolve(Modules.NOTIFICATION);
    await notification.createNotifications({
      to: recipient,
      channel: "email",
      template: "gift-message",
      content: gift,
      // §16: "Stripe/webhook retries must not generate duplicate
      // certificates, Printful orders, or gifts."
      idempotency_key: notificationKey.gift(deal.id),
    });
    // Neither address is logged. The recipient's is a third party's, which
    // makes it the one piece of personal data in this slice that its subject
    // never gave us.
    logger.info(`gift message sent for order ${orderId}`);
  } catch (error) {
    logger.error(
      `gift message failed for order ${orderId}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// `OrderWorkflowEvents.PLACED` rather than the string, so a rename in Medusa
// is a type error here instead of a subscriber that silently stops firing.
export const config: SubscriberConfig = { event: OrderWorkflowEvents.PLACED };
