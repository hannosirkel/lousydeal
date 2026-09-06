/**
 * Building the § 55 confirmation from a deal, and refusing to build a
 * deficient one.
 *
 * The words are `../content/confirmation`, which is also where the statutory
 * argument for each section lives. This file is the assembly: placeholder
 * resolution, the two bodies, and the one refusal that matters.
 *
 * **A confirmation is complete or it is not sent.** VÕS § 55(2) requires it to
 * carry the § 54(1) information; a message reading
 * `[LEGAL NAME NOT CONFIGURED]` has not carried it. The storefront's
 * named-visible-gap rule (decision `004`) is right for a page, where saying
 * "this is missing" beats a blank and the reader can come back. It is wrong
 * here: an email cannot be corrected once sent, and a duty performed badly is
 * worse than one visibly not yet performed. So an incomplete trader identity
 * yields `null` and the subscriber logs it.
 *
 * **Both a text and an HTML body**, because a durable medium the recipient
 * cannot read is not one. The text body is the authoritative one — it is what
 * survives being forwarded, quoted and printed — and the HTML is the same
 * content with structure.
 */

import type { MerchantIdentity } from "../config/merchant";
import {
  CONFIRMATION_COMPLAINTS,
  CONFIRMATION_CONSENT,
  CONFIRMATION_FORM_INTRO,
  CONFIRMATION_FORM_LINES,
  CONFIRMATION_HEADINGS,
  CONFIRMATION_LABELS,
  CONFIRMATION_OPENING,
  CONFIRMATION_PAID,
  CONFIRMATION_SUBJECT,
  CONFIRMATION_TRADER,
  CONFIRMATION_WHAT,
  CONFIRMATION_WITHDRAWAL,
} from "../content/confirmation";

/** What the confirmation says about the order it confirms. */
export interface ConfirmationDeal {
  readonly serial: number;
  readonly tier: string;
  /** Already formatted, by the caller that knows the currency. */
  readonly total: string;
  readonly issuedOn: string;
  readonly certificateUrl: string;
}

export interface ConfirmationMessage {
  readonly subject: string;
  readonly text: string;
  readonly html: string;
}

/**
 * Resolves `{merchantLegalName}` and friends.
 *
 * **Throws on an unknown placeholder** rather than leaving it in the text. The
 * storefront's resolver does the same and for the same reason: a token that
 * reaches a reader is a defect that looks like a joke, and on a legal document
 * it is neither.
 */
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
    if (value === undefined) throw new Error(`unknown placeholder ${token} in the order confirmation`);
    return value;
  });
}

/** `#4,102`, grouped the way the certificate sets it. Kept here rather than imported: the storefront's `money.ts` is another workspace. */
function formatSerial(serial: number): string {
  return `#${serial.toLocaleString("en-US")}`;
}

const escapeHtml = (text: string): string =>
  text.replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character] ?? character);

/**
 * The confirmation for one deal, or `null` if the trader identity is
 * incomplete.
 *
 * `null` and not a throw: the caller is a subscriber that must not reject —
 * Medusa retries one that does, and a defect failing on every delivery becomes
 * an event storm. The subscriber logs and moves on, and an order that took
 * money and has no confirmation is recoverable by hand from the order record.
 */
export function buildOrderConfirmation(
  deal: ConfirmationDeal,
  merchant: MerchantIdentity | null,
  siteBaseUrl: string,
): ConfirmationMessage | null {
  if (merchant === null) return null;

  const serial = formatSerial(deal.serial);
  const fill = (line: string) => resolve(line, merchant, siteBaseUrl);

  const sections: readonly (readonly [string, readonly string[]])[] = [
    [CONFIRMATION_HEADINGS.opening, [CONFIRMATION_OPENING]],
    [
      CONFIRMATION_HEADINGS.what,
      [
        `${CONFIRMATION_LABELS.serial}: ${serial}`,
        `${CONFIRMATION_LABELS.item}: ${deal.tier}`,
        `${CONFIRMATION_LABELS.issued}: ${deal.issuedOn}`,
        `${CONFIRMATION_LABELS.certificate}: ${deal.certificateUrl}`,
        CONFIRMATION_WHAT,
      ],
    ],
    [CONFIRMATION_HEADINGS.paid, [`${CONFIRMATION_LABELS.total}: ${deal.total}`, CONFIRMATION_PAID]],
    [CONFIRMATION_HEADINGS.trader, CONFIRMATION_TRADER.map(fill)],
    [CONFIRMATION_HEADINGS.withdrawal, CONFIRMATION_WITHDRAWAL.map(fill)],
    [CONFIRMATION_HEADINGS.consent, [...CONFIRMATION_CONSENT]],
    [CONFIRMATION_HEADINGS.form, [CONFIRMATION_FORM_INTRO, ...CONFIRMATION_FORM_LINES.map(fill)]],
    [CONFIRMATION_HEADINGS.complaints, CONFIRMATION_COMPLAINTS.map(fill)],
  ];

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

  return { subject: CONFIRMATION_SUBJECT(serial), text, html };
}
