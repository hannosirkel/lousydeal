/**
 * The one message telling a buyer their parcel is on its way.
 *
 * §7 asks for status synchronization; this is the half a person reads. It is
 * built the way `order-confirmation.ts` is built — a pure function, the same
 * placeholder resolver, `null` rather than a throw — because a subscriber that
 * rejects gets retried and a defect that fails on every delivery becomes an
 * event storm.
 *
 * **It promises no arrival date.** Constraint 7, and P9c's guards say the same
 * thing about the shelf: Printful prints on demand and nobody knows when a
 * carrier will hand a parcel over. A message that guessed would be wrong often
 * enough to be worse than saying nothing, and it is the kind of guess a buyer
 * remembers.
 *
 * **It works without a tracking number**, which is the ordinary case for the
 * first hours: some carriers issue one late. "It has been sent" is worth
 * saying on its own, and a message withheld until tracking exists is a buyer
 * wondering for a day.
 *
 * **It repeats no address.** The parcel is going where they typed, they typed
 * it, and a delivery address in an email is a delivery address in an inbox.
 * The confirmation they already have names the order.
 */

import type { MerchantIdentity } from "../config/merchant";

export interface ShippedParcel {
  /** What the buyer ordered it under. Their own reference, not Printful's. */
  readonly orderDisplayId: string;
  readonly trackingNumber: string | null;
  readonly trackingUrl: string | null;
  readonly carrier: string | null;
}

export interface ShippedMessage {
  readonly subject: string;
  readonly text: string;
  readonly html: string;
}

function resolve(line: string, merchant: MerchantIdentity): string {
  return line.replace(/\{(\w+)\}/g, (token, name: string) => {
    const values: Record<string, string> = {
      merchantLegalName: merchant.legalName,
      merchantAddress: merchant.address,
      merchantEmail: merchant.email,
    };
    const value = values[name];
    if (value === undefined) throw new Error(`unknown placeholder ${token} in the shipped message`);
    return value;
  });
}

const escapeHtml = (text: string): string =>
  text.replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character] ?? character);

/**
 * The message, or `null` where the trader identity is incomplete.
 *
 * The same disposition `buildOrderConfirmation` takes: a caller that cannot
 * name the trader must not send a message that names nobody, and a subscriber
 * must not throw.
 */
export function buildParcelShipped(parcel: ShippedParcel, merchant: MerchantIdentity | null): ShippedMessage | null {
  if (merchant === null) return null;

  const lines: string[] = [
    `Your order ${parcel.orderDisplayId} has been sent.`,
    "",
  ];

  if (parcel.trackingNumber === null) {
    // Said plainly rather than omitted. A buyer who expects a tracking number
    // and finds none assumes the message is broken.
    lines.push(
      "There is no tracking number yet. Some carriers issue one after they have the parcel; if one arrives, it will be on this order.",
    );
  } else {
    lines.push(
      parcel.carrier === null
        ? `Tracking number: ${parcel.trackingNumber}`
        : `Tracking number: ${parcel.trackingNumber} (${parcel.carrier})`,
    );
    if (parcel.trackingUrl !== null) lines.push(parcel.trackingUrl);
  }

  lines.push(
    "",
    // No date, and the reason given rather than left as an absence -- a buyer
    // reading a shipping email is looking for exactly the thing this cannot
    // say.
    "We cannot tell you when it will arrive. The carrier decides that, and a date we invented would be one you remembered.",
    "",
    "If it does not turn up, or turns up damaged, write to {merchantEmail} and we will put it right. Until it reaches you it is ours, not yours.",
    "",
    "{merchantLegalName}, {merchantAddress}",
  );

  const text = resolve(lines.join("\n"), merchant);

  return {
    subject: resolve(`Your order ${parcel.orderDisplayId} has been sent`, merchant),
    text,
    html: `<p>${text.split("\n\n").map((block) => escapeHtml(block).replace(/\n/g, "<br>")).join("</p>\n<p>")}</p>`,
  };
}
