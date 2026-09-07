/**
 * The VÕS § 56⁴(4) receipt: confirmation that a withdrawal reached us.
 *
 * § 56⁴(4) requires the trader to confirm, on a durable medium and without
 * delay, that it received a withdrawal sent through the § 56⁴ function. The
 * page the consumer just submitted is not one — a browser tab is not durable
 * and § 56(2⁵) puts the burden of proving withdrawal on them — so this is the
 * document that discharges the duty.
 *
 * **It confirms receipt and nothing more.** § 56⁴(4) is a duty to acknowledge,
 * not an occasion to assess. A message that argued about whether the 14 days
 * had run, or whether the § 53(4) p 7¹ exception applied, would be the trader
 * answering in its own favour a question `storefront/src/content/legal` spends
 * two documents declining to answer. So the receipt states what arrived, when
 * it arrived, and what the law says happens next.
 *
 * **Two recipients, one message.** The consumer's copy is the statutory
 * receipt. The trader's copy is the only record this slice keeps: LD-02 adds
 * no withdrawal table, so without it a withdrawal would reach nobody who could
 * act on it, and § 56¹(1)'s 14-day refund would depend on somebody reading a
 * log. Both copies carry the same text, because a trader working from a
 * different account of what was said than the consumer holds is how disputes
 * start.
 *
 * The trader identity is resolved the way `order-confirmation.ts` resolves it,
 * from the same six `MERCHANT_*` values and the same runtime configuration.
 */

import type { MerchantIdentity } from "../config/merchant";
import type { ConfirmationMessage } from "./order-confirmation";

export interface WithdrawalRecord {
  /** § 56⁴(2)'s three fields, exactly as the consumer typed them. */
  readonly consumerName: string;
  readonly contractDetails: string;
  readonly contactAddress: string;
  /** When the server received it. ISO 8601, UTC, seconds — see `receivedOn`. */
  readonly receivedAt: string;
}

export const WITHDRAWAL_RECEIPT_SUBJECT = "We received your withdrawal";

export const WITHDRAWAL_RECEIPT_LABELS = {
  name: "Name",
  contract: "Contract",
  address: "Reply address",
  received: "Received",
} as const;

export const WITHDRAWAL_RECEIPT_OPENING =
  "This confirms that we received your withdrawal. § 56⁴(4) of the Law of Obligations Act requires us to confirm that without delay and on a durable medium, which is what this message is. Keep it.";

/**
 * What the law does next, stated without conditions.
 *
 * `storefront/tests/legal-consistency.test.ts` forbids the refund promise
 * acquiring a qualifier, because § 56¹(1) admits none and § 62 voids any
 * agreement departing from these provisions to the consumer's detriment. The
 * same rule applies to a message that repeats the promise.
 */
export const WITHDRAWAL_RECEIPT_NEXT = [
  "Your withdrawal took effect when you sent it, not when we read it: § 56(2¹) makes a notice timely if it was sent inside the 14 days.",
  "We return everything you paid, including any delivery charge, within 14 days of receiving this — § 56¹(1). We use the same means of payment you used, and it costs you nothing, unless you expressly ask for another — § 56¹(4).",
  "You do not have to give a reason, and we did not ask for one.",
] as const;

export const WITHDRAWAL_RECEIPT_CLOSING =
  "If anything above is wrong, or you meant to withdraw from something else, reply to this message and a person will read it.";

export const WITHDRAWAL_RECEIPT_TRADER_NOTE =
  "This is the trader's copy of a withdrawal received through the § 56⁴ function on {siteBaseUrl}. The consumer has the same message. LD-02 keeps no withdrawal table, so this copy is the record: § 56¹(1)'s 14 days run from the receipt time above.";

const escapeHtml = (text: string): string =>
  text.replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character] ?? character);

/**
 * `2026-09-07 11:42 UTC`, rather than a raw ISO string.
 *
 * The zone is named because the consumer has to be able to compare this
 * against their own 14 days, and an offset they have to work out is one they
 * can get wrong in the trader's favour. No `Intl`: the reasoning `money.ts`
 * gives applies to a durable document too — two runtimes may carry different
 * ICU data, and this one is read long after the process that wrote it.
 */
export function receivedOn(receivedAt: string): string {
  return `${receivedAt.slice(0, 10)} ${receivedAt.slice(11, 16)} UTC`;
}

function resolve(line: string, merchant: MerchantIdentity, siteBaseUrl: string): string {
  return line.replace(/\{(\w+)\}/g, (token, name: string) => {
    const values: Record<string, string> = {
      merchantLegalName: merchant.legalName,
      merchantAddress: merchant.address,
      merchantEmail: merchant.email,
      merchantRegistryCode: merchant.registryCode,
      merchantVatNumber: merchant.vatNumber,
      merchantPhoneNumber: merchant.phoneNumber,
      siteBaseUrl,
    };
    const value = values[name];
    if (value === undefined) throw new Error(`unknown placeholder ${token} in the withdrawal receipt`);
    return value;
  });
}

/**
 * The receipt for one withdrawal, or `null` if the trader identity is
 * incomplete.
 *
 * `null` rather than a throw, and for the reason `buildOrderConfirmation`
 * gives: a receipt naming no trader has not confirmed anything, and one
 * visibly not sent is recoverable while one sent badly is not. The caller is a
 * route that must still tell the consumer their withdrawal was received —
 * § 56(2¹) makes it effective on sending, whatever our mail does afterwards.
 */
export function buildWithdrawalReceipt(
  record: WithdrawalRecord,
  merchant: MerchantIdentity | null,
  siteBaseUrl: string,
  audience: "consumer" | "trader" = "consumer",
): ConfirmationMessage | null {
  if (merchant === null) return null;

  const fill = (line: string) => resolve(line, merchant, siteBaseUrl);
  const facts: readonly (readonly [string, string])[] = [
    [WITHDRAWAL_RECEIPT_LABELS.name, record.consumerName],
    [WITHDRAWAL_RECEIPT_LABELS.contract, record.contractDetails],
    [WITHDRAWAL_RECEIPT_LABELS.address, record.contactAddress],
    [WITHDRAWAL_RECEIPT_LABELS.received, receivedOn(record.receivedAt)],
  ];

  const lines: string[] = [
    WITHDRAWAL_RECEIPT_OPENING,
    "",
    ...facts.map(([label, value]) => `${label}: ${value}`),
    "",
    ...WITHDRAWAL_RECEIPT_NEXT,
    "",
    WITHDRAWAL_RECEIPT_CLOSING,
    "",
    fill("{merchantLegalName}, {merchantAddress}"),
    fill("Registry code {merchantRegistryCode} · VAT {merchantVatNumber}"),
    fill("{merchantEmail} · {merchantPhoneNumber}"),
  ];
  if (audience === "trader") lines.splice(1, 0, "", fill(WITHDRAWAL_RECEIPT_TRADER_NOTE));

  const html = [
    `<p>${escapeHtml(WITHDRAWAL_RECEIPT_OPENING)}</p>`,
    ...(audience === "trader" ? [`<p>${escapeHtml(fill(WITHDRAWAL_RECEIPT_TRADER_NOTE))}</p>`] : []),
    "<dl>",
    ...facts.map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`),
    "</dl>",
    ...WITHDRAWAL_RECEIPT_NEXT.map((line) => `<p>${escapeHtml(line)}</p>`),
    `<p>${escapeHtml(WITHDRAWAL_RECEIPT_CLOSING)}</p>`,
    `<p>${escapeHtml(fill("{merchantLegalName}, {merchantAddress}"))}<br>`,
    `${escapeHtml(fill("Registry code {merchantRegistryCode} · VAT {merchantVatNumber}"))}<br>`,
    `${escapeHtml(fill("{merchantEmail} · {merchantPhoneNumber}"))}</p>`,
  ].join("\n");

  return { subject: WITHDRAWAL_RECEIPT_SUBJECT, text: lines.join("\n"), html };
}
