/**
 * Reading §6's four gift fields off an order.
 *
 * The same trust boundary `inscription.ts` describes, and for the same reason:
 * the storefront writes these onto the cart through `POST /store/carts/:id`,
 * which is public and whose validator accepts any metadata at all
 * (`metadata: z.record(z.string(), z.unknown()).nullish()`). Any visitor can
 * put any value under any key on their own cart. Nothing read here is trusted
 * because the storefront sent it.
 *
 * **But the reason to filter is not §5's, and it is sharper.** §5 filters the
 * inscription because the inscription is published. None of these four is
 * published — LD-03's constraint 4 — so publicity is not the argument. The
 * argument is that this slice takes an arbitrary address and arbitrary text
 * from an anonymous visitor and sends the one to the other. That is the shape
 * of an open relay, and the text is the payload.
 *
 * A gift message reading `Claim your prize at evil.test` would leave here
 * signed by our domain, from our IP, with our DKIM signature on it. Stripping
 * URLs, bare domains, addresses and telephone numbers is what stops the gift
 * flow being a way to send those. It is not decoration and it is not copied
 * from §5 by habit.
 *
 * **What this does not do is rate-limit.** One visitor can still send one
 * message per completed order, which costs them the price of a certificate.
 * That is the control, and it is a real one; a free send would need more.
 * Recorded here rather than left for a reader to wonder about.
 */

import { sanitiseInscription } from "./inscription";

/**
 * The metadata keys the storefront writes and this reads.
 *
 * Prefixed for the reason `DEAL_INSCRIPTION_METADATA` is: cart metadata is a
 * shared bag and an unprefixed `message` is a name somebody else can
 * reasonably take. `storefront/src/lib/gift.ts` carries the identical four
 * strings — there is no package shared between the workspaces — and a test
 * pins them to these.
 */
export const DEAL_GIFT_METADATA = {
  recipientName: "lousydeal_gift_recipient_name",
  recipientEmail: "lousydeal_gift_recipient_email",
  senderName: "lousydeal_gift_sender_name",
  message: "lousydeal_gift_message",
} as const;

/**
 * §6 gives none of these numbers, so each is this row's choice and each is the
 * same as its §5 neighbour rather than a new answer to a settled question.
 *
 * 60 for the two names, which is `display_name`'s limit — one line of a name.
 * 120 for the message, which is the dedication's — one sentence about a
 * purchase. 254 for the address, which is the longest an address can be.
 *
 * A second, different answer to "how long is a short field on this product"
 * would be an accident rather than a decision.
 */
export const DEAL_GIFT_LIMITS = {
  recipientName: 60,
  recipientEmail: 254,
  senderName: 60,
  message: 120,
} as const;

/** Who a gift goes to, as read off an order. `null` when the order was not a gift. */
export interface OrderGift {
  readonly recipientEmail: string;
  readonly recipientName: string | null;
  readonly senderName: string | null;
  readonly message: string | null;
}

/**
 * Deliberately not RFC 5322, which permits quoted strings, comments and
 * bracketed literals that no consumer types and every mail log renders badly.
 * One `@`, something either side, a dot in the domain, no whitespace, no
 * angle brackets and no comma — the last two because `<a@b.test>, c@d.test` is
 * how a header injection or a second recipient arrives.
 */
const ADDRESS = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;

/**
 * The recipient's address, or `null` if it is not one.
 *
 * **Validated, never sanitised.** The other three fields are free text and get
 * §5's filter; an address must not, because that filter's whole job is to
 * remove things that look like addresses. Running it here would return `null`
 * for every valid input, and a "cleaned" address that survived would be one
 * that no longer reaches the person it names — a gift that silently goes
 * nowhere, which is worse than one refused at the checkout.
 *
 * Length is checked before the pattern so a pathological input is rejected on
 * its size rather than matched against.
 */
export function readGiftAddress(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > DEAL_GIFT_LIMITS.recipientEmail) return null;
  return ADDRESS.test(trimmed) ? trimmed : null;
}

/**
 * Filters, caps, trims — `inscription.ts`'s `field`, and in that order for the
 * reason it gives: filtering first means the limit counts what will actually
 * appear rather than what was typed.
 *
 * `sanitiseInscription` is imported rather than copied. LD-03's plan expected a
 * second character-identical filter block held equal by a test, mirroring C3c.
 * That would have been two duplications of one rule: the rule these fields need
 * is exactly §5's, and the cross-workspace equality that matters is already
 * asserted by `inscription-filter.test.ts` on the block itself. A second copy
 * would be a second thing to keep in step, for no additional property.
 */
function field(value: unknown, limit: number): string | null {
  const filtered = sanitiseInscription(typeof value === "string" ? value : null);
  if (filtered === null) return null;
  const trimmed = filtered.slice(0, limit).trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * §6's four fields off an order's metadata, or `null` if this was not a gift.
 *
 * **The address decides.** G1's model says a deal is a gift when
 * `gift_recipient_email` is present, and this is the other half of that
 * sentence: without a usable address there is no gift, whatever else the
 * metadata carried. An order that supplied a recipient name and a message but
 * no valid address is an ordinary purchase — the three values are dropped
 * rather than stored against a send that can never happen.
 *
 * That is a deliberate choice about a buyer's mistake, and the checkout is
 * where it is prevented: G3 marks the address `required` and `type="email"`,
 * so an order reaching here without one did not come from the form.
 */
export function readGift(metadata: unknown): OrderGift | null {
  const bag = typeof metadata === "object" && metadata !== null ? (metadata as Record<string, unknown>) : {};

  const recipientEmail = readGiftAddress(bag[DEAL_GIFT_METADATA.recipientEmail]);
  if (recipientEmail === null) return null;

  return {
    recipientEmail,
    recipientName: field(bag[DEAL_GIFT_METADATA.recipientName], DEAL_GIFT_LIMITS.recipientName),
    senderName: field(bag[DEAL_GIFT_METADATA.senderName], DEAL_GIFT_LIMITS.senderName),
    message: field(bag[DEAL_GIFT_METADATA.message], DEAL_GIFT_LIMITS.message),
  };
}
