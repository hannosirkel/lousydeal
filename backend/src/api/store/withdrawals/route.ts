/**
 * `POST /store/withdrawals` — receives a § 56⁴ withdrawal and acknowledges it.
 *
 * **The withdrawal is effective whatever this route does.** § 56(2¹) makes a
 * notice timely if it was *sent* inside the 14 days, so nothing here can
 * invalidate one, and nothing here may imply otherwise. What this route owes
 * is § 56⁴(4)'s acknowledgement on a durable medium, without delay.
 *
 * So a mail failure is reported, not thrown: the response says the withdrawal
 * was received and says separately whether the receipt went out, and
 * `storefront/src/app/legal/withdraw/page.tsx` renders both facts rather than
 * collapsing them into one. Telling a consumer their withdrawal failed because
 * our SMTP did would be wrong on the law and wrong in our own favour.
 *
 * **There is no withdrawal table.** LD-02 adds none, deliberately — the plan's
 * file list for this row names a route and a message and no model. The trader's
 * copy of the receipt is therefore the record, which is why it is sent even
 * when the consumer's cannot be, and why a send failure is logged loudly.
 *
 * **The three fields are § 56⁴(2)'s and nothing else is accepted.** No reason,
 * no order lookup, no account. § 56(1) gives the right without a reason and
 * `storefront/src/content/withdrawal.ts` promises the page asks for none; a
 * field here that the page does not show would make that promise false.
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

import { readBackendRuntimeConfig } from "../../../config/runtime";
import { buildWithdrawalReceipt, type WithdrawalRecord } from "../../../notifications/withdrawal-receipt";

/**
 * Bounds, not validation theatre.
 *
 * Each is generous enough that no honest consumer meets it and small enough
 * that the message stays a message. `contactAddress` is 254 because that is
 * the longest an address can be; the other two are what a name and "the order
 * I made on Tuesday" need.
 *
 * `contractDetails` is 600 rather than the round number a reader might expect,
 * and the reason is worth stating so nobody tidies it back:
 * `tests/commerce-product-seed.test.ts` forbids any of the three tier amounts
 * appearing as a bare token anywhere under `backend/src` except the product
 * model, because a price belongs in one place. One of them is exactly the
 * round bound this field would otherwise have taken. The guard is deliberately
 * blunt and correct to be -- it cannot tell a character limit from a price, and
 * a version that tried would be the one that missed a real price. The bound
 * here was arbitrary within a range, so the bound moved rather than the guard.
 * That is also why this comment names none of the three.
 */
export const WITHDRAWAL_LIMITS = { consumerName: 200, contractDetails: 600, contactAddress: 254 } as const;

/** Deliberately not a full RFC 5322 grammar: it must have one `@`, something either side, and no spaces. */
const ADDRESS = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface WithdrawalResponse {
  readonly withdrawal: {
    readonly received_at: string;
    /** Whether the § 56⁴(4) receipt reached the consumer. Never conflated with whether the withdrawal was received. */
    readonly receipt_sent: boolean;
  };
}

function field(value: unknown, limit: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > limit) return null;
  return trimmed;
}

export async function POST(request: MedusaRequest, response: MedusaResponse<WithdrawalResponse | { message: string }>) {
  const body = (request.body ?? {}) as Record<string, unknown>;
  const consumerName = field(body.consumerName, WITHDRAWAL_LIMITS.consumerName);
  const contractDetails = field(body.contractDetails, WITHDRAWAL_LIMITS.contractDetails);
  const contactAddress = field(body.contactAddress, WITHDRAWAL_LIMITS.contactAddress);

  if (consumerName === null || contractDetails === null || contactAddress === null || !ADDRESS.test(contactAddress)) {
    // 400 and no detail about which field: the storefront validates the same
    // three with `required` and `type="email"` before it ever posts, so a
    // request that reaches here malformed did not come from the form.
    response.status(400).json({ message: "A withdrawal needs a name, contract details and a reply address." });
    return;
  }

  // Seconds, not milliseconds: this is quoted back to a consumer who has to
  // compare it against their own 14 days, and a millisecond field is noise in
  // a legal document.
  const receivedAt = `${new Date().toISOString().slice(0, 19)}Z`;
  const record: WithdrawalRecord = { consumerName, contractDetails, contactAddress, receivedAt };

  const runtime = readBackendRuntimeConfig(process.env);
  const logger = request.scope.resolve("logger") as { info(message: string): void; error(message: string): void };

  const missing = [
    runtime.merchant === null ? "the trader identity" : null,
    runtime.siteBaseUrl === null ? "SITE_BASE_URL" : null,
    runtime.smtp === null ? "a mail transport" : null,
  ].filter((what): what is string => what !== null);

  if (missing.length > 0 || runtime.siteBaseUrl === null) {
    // Loud, because this is the one record of the withdrawal and it did not
    // get made. The consumer's address is not logged; the timestamp is what an
    // operator needs to find it in the mail server's own log.
    logger.error(`§ 56⁴(4) receipt not sent for a withdrawal received at ${receivedAt}: missing ${missing.join(", ")}`);
    response.status(201).json({ withdrawal: { received_at: receivedAt, receipt_sent: false } });
    return;
  }

  const consumerCopy = buildWithdrawalReceipt(record, runtime.merchant, runtime.siteBaseUrl, "consumer");
  const traderCopy = buildWithdrawalReceipt(record, runtime.merchant, runtime.siteBaseUrl, "trader");
  if (consumerCopy === null || traderCopy === null || runtime.merchant === null) {
    logger.error(`§ 56⁴(4) receipt not sent for a withdrawal received at ${receivedAt}: the receipt could not be built`);
    response.status(201).json({ withdrawal: { received_at: receivedAt, receipt_sent: false } });
    return;
  }

  const notification = request.scope.resolve(Modules.NOTIFICATION);

  // The trader's copy first, and separately awaited. It is the record; if only
  // one of the two can be sent, it must be the one that lets a person act.
  let receiptSent = false;
  try {
    await notification.createNotifications({
      to: runtime.merchant.email,
      channel: "email",
      template: "withdrawal-receipt-trader",
      content: traderCopy,
    });
  } catch {
    logger.error(`the trader's copy of the withdrawal received at ${receivedAt} could not be sent`);
  }

  try {
    await notification.createNotifications({
      to: contactAddress,
      channel: "email",
      template: "withdrawal-receipt",
      content: consumerCopy,
    });
    receiptSent = true;
    logger.info(`§ 56⁴(4) receipt sent for the withdrawal received at ${receivedAt}`);
  } catch {
    logger.error(`§ 56⁴(4) receipt could not be sent for the withdrawal received at ${receivedAt}`);
  }

  response.status(201).json({ withdrawal: { received_at: receivedAt, receipt_sent: receiptSent } });
}
