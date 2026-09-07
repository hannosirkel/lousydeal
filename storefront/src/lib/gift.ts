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
 * sources. The checkout also marks the field `type="email"` and `required`,
 * which is the enforcing half — this is what stops the form telling a buyer
 * their address is fine when the backend will drop it, which would turn a
 * paid gift into an ordinary purchase with no explanation.
 */
const ADDRESS = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;

export function isGiftAddress(raw: string | null | undefined): boolean {
  if (typeof raw !== "string") return false;
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > GIFT_LIMITS.recipientEmail) return false;
  return ADDRESS.test(trimmed);
}
