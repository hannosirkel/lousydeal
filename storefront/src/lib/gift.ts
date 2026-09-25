/**
 * §6's four gift fields, on the storefront side.
 *
 * The backend's `modules/deal/gift.ts` is the one that decides: it reads these
 * off the order and G1's columns are written from what it returns. This file
 * exists so the checkout can show a buyer what will happen before they pay —
 * the preview §7 promises for the inscription, applied to the gift message —
 * and so the metadata keys are written in a named place rather than inline in
 * a form.
 *
 * **Nothing here is a security control.** The endpoint the checkout writes
 * through is public and accepts any metadata at all; a filter in front of it
 * filters nothing. The backend's copy is the one that runs on data nobody
 * chose to be honest about, and it runs again on read regardless of what
 * happened here.
 */

import { sanitiseInscription } from "./inscription";

/**
 * The metadata keys the backend reads a gift back out of.
 *
 * The same four strings as `backend/src/modules/deal/gift.ts`'s
 * `DEAL_GIFT_METADATA`, written again because there is no package shared
 * between the workspaces, and pinned to them by `storefront/tests/gift.test.ts`
 * reading that file.
 */
export const GIFT_METADATA = {
  recipientName: "lousydeal_gift_recipient_name",
  recipientEmail: "lousydeal_gift_recipient_email",
  senderName: "lousydeal_gift_sender_name",
  message: "lousydeal_gift_message",
} as const;

/** The same four numbers as the backend's `DEAL_GIFT_LIMITS`, and a test says so. */
export const GIFT_LIMITS = {
  recipientName: 60,
  recipientEmail: 254,
  senderName: 60,
  message: 120,
} as const;

/**
 * What the recipient will actually see of a message, or `null` if nothing
 * survives it.
 *
 * The same shape as the inscription preview: filter, then cap, then trim, so
 * the count a buyer is shown is a count of what will appear. A buyer who typed
 * a URL sees it vanish here rather than discovering later that we removed it
 * from a message they thought they had sent.
 */
export function previewGiftText(raw: string | null | undefined, limit: number): string | null {
  const filtered = sanitiseInscription(raw ?? null);
  if (filtered === null) return null;
  const trimmed = filtered.slice(0, limit).trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Whether an address is one the backend will accept.
 *
 * Character-for-character the backend's `ADDRESS`, and a test compares the two
 * sources.
 *
 * **It is enforced in the form through `GIFT_ADDRESS_PATTERN` below**, and until
 * LD-11 J2 it was not. This comment claimed `type="email"` and `required` were
 * the enforcing half, but the HTML e-mail grammar accepts a domain with no dot
 * — `friend@example` — which this rule refuses. A buyer could therefore pay for
 * a gift the backend then dropped: no gift message, and nothing to say so.
 */
const ADDRESS = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;

/**
 * The same rule as an HTML `pattern`, which the browser anchors itself and
 * enforces on every submit, `requestSubmit()` included. Derived from `ADDRESS`
 * rather than written twice, so the field and the backend cannot drift apart.
 * Browsers compile `pattern` with the `v` flag; the test does the same.
 */
export const GIFT_ADDRESS_PATTERN = ADDRESS.source.slice(1, -1);

export function isGiftAddress(raw: string | null | undefined): boolean {
  if (typeof raw !== "string") return false;
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > GIFT_LIMITS.recipientEmail) return false;
  return ADDRESS.test(trimmed);
}

/**
 * The address a gift message is going to, or `null` when none is. LD-11 H1.
 *
 * The end state names it, so it must name only a message the backend will
 * send: `handleSubmit` sends the four fields when the block is open, and
 * `readGift` keeps the gift only when the address is one `isGiftAddress`
 * accepts. An open block with an address the backend drops is an ordinary
 * purchase, and announcing a gift mail for it would be a promise nothing keeps.
 */
export function giftRecipientSent({
  open,
  recipientEmail,
}: {
  readonly open: boolean;
  readonly recipientEmail: string;
}): string | null {
  return open && isGiftAddress(recipientEmail) ? recipientEmail.trim() : null;
}
