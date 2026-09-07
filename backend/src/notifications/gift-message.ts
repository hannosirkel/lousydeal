/**
 * The message a gift recipient gets.
 *
 * The third transactional message in this repository, after C9's § 55
 * confirmation and C14's § 56⁴(4) receipt.
 *
 * **No shared wrapper, and this is the row that was told to decide.** LD-02
 * declined one at two callers on the ground that a wrapper around a single
 * caller has a guessed shape; LD-03's plan said the third is where the
 * evidence arrives. It arrived and it says no. What the three share is a
 * `ConfirmationMessage` type, an HTML escaper and a placeholder resolver —
 * about twelve lines, two of which each message uses differently: this one
 * resolves `{amount}` and no merchant token, the confirmation resolves six
 * merchant tokens and no amount, the receipt resolves merchant tokens and a
 * site URL. A wrapper over that is a function taking a record of substitutions
 * and returning a string, which is `String.replace` with extra steps.
 *
 * The escaper is genuinely duplicated three times and that is worth saying
 * plainly rather than hiding: it is one line, it has no configuration, and a
 * shared one would be the whole of the wrapper's value. If a fourth message
 * arrives, extract that line and nothing else.
 *
 * **This message is not a confirmation.** LD-03's constraint 5. The recipient
 * did not buy anything; § 54(1)'s recital, the withdrawal form and the consent
 * statement belong to the buyer and stay in `order-confirmation.ts`. A test
 * asserts each of them is absent from here, because the failure mode is a
 * later edit "improving" this message by copying a section across.
 */

import type { MerchantIdentity } from "../config/merchant";
import {
  GIFT_HEADINGS,
  GIFT_KEEP,
  GIFT_LABELS,
  GIFT_NOTICE,
  GIFT_TRADER,
  GIFT_OPENING,
  GIFT_SUBJECT,
  GIFT_WHAT,
} from "../content/gift";
import type { ConfirmationMessage } from "./order-confirmation";

export interface GiftMessageInput {
  readonly serial: number;
  /** Already formatted by the caller that knows the currency, as the confirmation's is. */
  readonly total: string;
  readonly issuedOn: string;
  readonly certificateUrl: string;
  /** §6's fields, already filtered by `readGift`. `null` where the buyer left one blank. */
  readonly recipientName: string | null;
  readonly senderName: string | null;
  readonly message: string | null;
}

const escapeHtml = (text: string): string =>
  text.replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character] ?? character);

/** `#4,102`, as the certificate sets it and the confirmation prints it. */
const formatSerial = (serial: number): string => `#${serial.toLocaleString("en-US")}`;

/**
 * The gift message, or `null` if the trader identity is incomplete.
 *
 * `null` for `buildOrderConfirmation`'s reason, one step further: a message
 * from nobody, to somebody who did not ask for it, naming no trader, is not a
 * gift — it is what a spam filter is for. The caller logs and the buyer's own
 * confirmation still goes, which is the one this deployment owes as a duty.
 */
export function buildGiftMessage(
  gift: GiftMessageInput,
  merchant: MerchantIdentity | null,
  siteBaseUrl: string,
): ConfirmationMessage | null {
  if (merchant === null) return null;

  /** `{merchantEmail}` and friends, the way the confirmation resolves them. */
  const fill = (line: string): string =>
    line.replace(/\{(\w+)\}/g, (token, name: string) => {
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
      if (value === undefined) throw new Error(`unknown placeholder ${token} in the gift message`);
      return value;
    });

  // **The recipient's name goes in the body, not the heading.** Headings are
  // upper-cased in the text part, the way the confirmation's are, and
  // upper-casing somebody's name is a way of getting it wrong -- `McDonald`
  // becomes `MCDONALD`. The greeting is impersonal and the first line is
  // personal, which reads better and cannot mangle a name.
  const opening = GIFT_OPENING.replace("{amount}", gift.total);
  const sections: (readonly [string, readonly string[]])[] = [
    [
      GIFT_HEADINGS.opening,
      [gift.recipientName === null ? opening : `${gift.recipientName} — ${opening.slice(0, 1).toLowerCase()}${opening.slice(1)}`],
    ],
  ];

  // Only when the buyer wrote one. An empty "They said" heading over nothing
  // would tell the recipient a message existed and was lost.
  if (gift.message !== null) {
    sections.push([
      GIFT_HEADINGS.message,
      [gift.senderName === null ? `“${gift.message}”` : `“${gift.message}” — ${gift.senderName}`],
    ]);
  }

  sections.push([
    GIFT_HEADINGS.what,
    [
      `${GIFT_LABELS.serial}: ${formatSerial(gift.serial)}`,
      `${GIFT_LABELS.issued}: ${gift.issuedOn}`,
      `${GIFT_LABELS.certificate}: ${gift.certificateUrl}`,
      ...GIFT_WHAT,
    ],
  ]);
  sections.push([GIFT_HEADINGS.keep, [...GIFT_KEEP]]);
  // Article 14(3)(b): at the latest at the first communication, which this is.
  // G4 shipped without either of these — the message took the trader identity
  // and used it only as a null-guard, so it went out unsigned.
  sections.push([GIFT_HEADINGS.notice, GIFT_NOTICE.map(fill)]);
  sections.push([GIFT_HEADINGS.trader, GIFT_TRADER.map(fill)]);

  const text = sections
    .map(([heading, lines]) => [heading.toUpperCase(), "", ...lines].join("\n"))
    .join("\n\n");

  const html = [
    "<!doctype html><html><body>",
    ...sections.map(
      ([heading, lines]) =>
        `<h2>${escapeHtml(heading)}</h2>${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}`,
    ),
    "</body></html>",
  ].join("");

  return { subject: GIFT_SUBJECT(gift.senderName), text, html };
}
