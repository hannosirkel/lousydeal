/**
 * Turning a Medusa order into the thing `submission.ts` takes.
 *
 * A pure function over the shape `query.graph` returns, so the subscriber
 * stays wiring and every judgement here can be driven by a test — the same
 * split `certificateLine` uses in `subscribers/order-placed.ts`, and for the
 * same reason: what is interesting is the orders that are *not* the ordinary
 * one.
 *
 * **What counts as merch is decided by exclusion.** A line is something to
 * post unless it is a certificate, which is the rule `checkout-rules.ts`
 * applies on the storefront and `fulfilment-provider.ts` applies when quoting
 * postage. Deciding it the other way round — an allow-list of merch handles —
 * would silently stop posting anything the day the catalogue gained a product
 * and this list did not.
 *
 * **A line with no SKU is dropped, and that is not the same decision.** The
 * SKU is what `orders.ts` resolves against the store, so a line without one
 * cannot be ordered at all; keeping it would mean placing an order that is
 * missing an item. Dropping it means the same. The difference is that a
 * dropped line is visible — the caller compares the counts and says so — and
 * that is why this returns what it skipped rather than only what it kept.
 */

import type { PrintfulOrderLine, PrintfulRecipient, PrintfulSubmissionInput } from "./submission";

/** The order, in the fields this reads. Everything is `unknown`: it came from a database through a query builder. */
export interface OrderForPrintful {
  readonly id?: unknown;
  readonly created_at?: unknown;
  readonly items?: readonly OrderItemForPrintful[] | null;
  readonly shipping_address?: ShippingAddressForPrintful | null;
}

export interface OrderItemForPrintful {
  readonly product_handle?: unknown;
  readonly variant_sku?: unknown;
  readonly variant?: { readonly sku?: unknown } | null;
  readonly quantity?: unknown;
  readonly detail?: { readonly quantity?: unknown } | null;
}

export interface ShippingAddressForPrintful {
  readonly first_name?: unknown;
  readonly last_name?: unknown;
  readonly address_1?: unknown;
  readonly city?: unknown;
  readonly country_code?: unknown;
  readonly postal_code?: unknown;
  readonly province?: unknown;
}

export interface PrintfulSubmissionPlan {
  readonly input: PrintfulSubmissionInput;
  /** Lines that looked like merch and could not be ordered. Never silently dropped. */
  readonly unorderable: number;
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Medusa puts the SKU in either place depending on how the order was read. */
function skuOf(item: OrderItemForPrintful): string | null {
  return text(item.variant_sku) ?? text(item.variant?.sku);
}

/**
 * How many of a line to order.
 *
 * **Gate E found this rejecting every real order, and the mechanism is one
 * this repository already knew about.** Medusa does not return `quantity` as a
 * primitive: `query.graph` hydrates it as a **`BigNumber`**, measured live on
 * 2026-09-09 — `typeof` is `"object"`, `constructor.name` is `BigNumber`, and
 * both `String()` and `JSON.stringify()` render it as `1`, so it reads as a
 * number everywhere a person would look at it. `typeof raw !== "number"` was
 * therefore true of every line, `quantityOf` returned `null`, every merch line
 * was counted unorderable, and the submission was recorded with no lines at
 * all. The buyer paid for a shirt that was never ordered.
 *
 * The unit tests passed throughout because they pass `{ detail: { quantity: 1 } }`
 * — a plain number, which is the one shape production never sends.
 *
 * `order-placed.ts`'s `amount()` has read money this way since LD-02, and
 * `vat-thresholds.test.ts` records the same trap in as many words: "a
 * `.numeric`, a `valueOf`, or a plain number depending on where it came from".
 * This is that reader, for a count rather than a sum.
 */
function numericOf(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;

  const numeric = (value as { readonly numeric?: unknown }).numeric;
  if (typeof numeric === "number") return numeric;
  const valued = (value as { valueOf(): unknown }).valueOf();
  return typeof valued === "number" ? valued : null;
}

function quantityOf(item: OrderItemForPrintful): number | null {
  // **`??` is not enough on its own and never was.** A `BigNumber` is neither
  // `null` nor `undefined`, so the fallback to `item.quantity` could not fire
  // for the case that actually occurs -- and the subscriber does not request
  // that field anyway. Both halves are fixed: this reads the shape Medusa
  // sends, and the fallback stays for the order shapes that carry the plain
  // field instead.
  const raw = numericOf(item.detail?.quantity) ?? numericOf(item.quantity);
  if (raw === null || !Number.isFinite(raw) || raw < 1) return null;
  return Math.floor(raw);
}

/**
 * The address, or nothing.
 *
 * All four of Printful's required fields or none: a partial address is not a
 * cheaper order, it is a rejected one, and `shipping.ts` learned the same
 * thing when quoting. The province is optional here because it is optional in
 * most of the world — `orders.ts` omits the field entirely when it is absent,
 * and the four countries that demand one are settled on the storefront where
 * a buyer can still be asked.
 *
 * **The name is built from both parts and may be neither.** Medusa's shipping
 * address carries `first_name` and `last_name` separately and either can be
 * empty; a parcel with no name on it is one a courier may refuse, so an
 * address with no usable name is not an address.
 */
export function recipientFrom(address: ShippingAddressForPrintful | null | undefined): PrintfulRecipient | null {
  if (!address) return null;

  const name = [text(address.first_name), text(address.last_name)].filter((part) => part !== null).join(" ");
  const address1 = text(address.address_1);
  const city = text(address.city);
  const countryCode = text(address.country_code);
  const postcode = text(address.postal_code);

  if (name.length === 0 || address1 === null || city === null || countryCode === null || postcode === null) {
    return null;
  }

  return { name, address1, city, countryCode: countryCode.toUpperCase(), postcode, province: text(address.province) };
}

/**
 * Everything Printful needs, or `null` where the order itself is unreadable.
 *
 * `null` only for a missing order id, because that is the one field the whole
 * idempotency argument is built on: it becomes the `external_id`, and an order
 * submitted under the wrong one is an order Printful's uniqueness constraint
 * is guarding nothing about.
 *
 * An order with no merch is **not** null. It is a plan with no lines, and
 * `submitPrintfulOrder` records it as `skipped` — which is what stops the next
 * redelivery of a certificate-only order from deciding this again.
 */
export function printfulSubmissionFrom(
  order: OrderForPrintful | null | undefined,
  certificateHandles: readonly string[],
  submittedAt: Date,
): PrintfulSubmissionPlan | null {
  const orderId = text(order?.id);
  if (orderId === null) return null;

  const certificates = new Set(certificateHandles);
  const posted = (order?.items ?? []).filter((item) => {
    const handle = text(item.product_handle);
    // A line whose handle did not come back is treated as merch, which is the
    // cautious direction and the same one `cartNeedsAddress` takes: an address
    // is asked for and a human sees the unorderable count, rather than the
    // line quietly not being posted.
    return handle === null || !certificates.has(handle);
  });

  const lines: PrintfulOrderLine[] = [];
  let unorderable = 0;
  for (const item of posted) {
    const sku = skuOf(item);
    const quantity = quantityOf(item);
    if (sku === null || quantity === null) {
      unorderable += 1;
      continue;
    }
    lines.push({ sku, quantity });
  }

  return {
    input: {
      orderId,
      lines,
      recipient: recipientFrom(order?.shipping_address),
      submittedAt,
      // Carried into the submission, not only logged. `submitPrintfulOrder`
      // cannot otherwise tell "this order has nothing to post" from "nothing
      // in this order could be read", and it records the first as terminal.
      unorderable,
    },
    unorderable,
  };
}
