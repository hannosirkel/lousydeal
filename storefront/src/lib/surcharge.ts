/**
 * What LD-06's "discount" is to the storefront: how a line is recognised as
 * the surcharge, and the words the adjustment row prints for it.
 *
 * **A surcharge is a line with no variant, and nothing else is** (constraint
 * 6). Its metadata carries the code and the base it was priced against, and
 * none of that is the test: the public line-item routes let a visitor write
 * metadata onto any line, so a mug carrying the surcharge's metadata is still
 * a mug. No public write can produce a variant-less line -- creating a cart
 * with `items`, adding a line and updating one all require or keep a
 * `variant_id` -- so that absence is the one mark a visitor cannot forge.
 * `backend/src/modules/printful/from-order.ts`'s `isSurchargeLine` reads the
 * same thing, and the two must not disagree about which line it is.
 *
 * The one file both the cart (D5) and the payment authorisation (D3) draw
 * the row from, so the two pages print the same words.
 */

import { formatMoney } from "./money";

/**
 * `backend/src/commerce/surcharge.ts`'s `SURCHARGE_INTERNAL_TYPE`, written
 * again because there is no package shared between the workspaces.
 * `tests/checkout-surcharge.test.ts` holds the two equal.
 */
export const SURCHARGE_INTERNAL_TYPE = "baldrick_surcharge";

/** The label where no title came back: the row's own name, without the code the title would have carried. */
const SURCHARGE_LABEL = "Discount";

/**
 * Whether a line is the surcharge.
 *
 * `null`, and only `null`. `undefined` and an absent field both mean "not
 * known" -- a caller that never read `variant_id` off the wire -- and keep
 * today's reading of the line, so no classifier that existed before this
 * file silently changed its answer for a line it was never told about.
 */
export function isSurchargeLine(line: { readonly variantId?: string | null }): boolean {
  return line.variantId === null;
}

/**
 * The adjustment row's label: `Discount (BALDRICK20)`.
 *
 * **From the line's title, never from its metadata.** D1 names the line
 * `Discount (CODE)` and D4's route writes that title server-side. The public
 * update route accepts `quantity` and `metadata` only, so a visitor can
 * rewrite `metadata.code` and cannot touch the title; reading the code from
 * metadata would let a visitor make their own payment page print whatever
 * they typed in the one row that explains why the total went up.
 */
export function surchargeLabel(line: { readonly title?: string | null }): string {
  const title = typeof line.title === "string" ? line.title.trim() : "";
  return title.length > 0 ? title : SURCHARGE_LABEL;
}

/**
 * The adjustment row's value: a plus, then the formatted figure.
 *
 * The plus is the point of the row. It is the one ledger value on the site
 * that adds to the row beneath it, and constraint 3 says the price only goes
 * up, so a figure that would print as a plus followed by a minus is refused
 * rather than drawn: no code can produce it, and a page that printed it would
 * be lying about the sign of a line the buyer is about to pay.
 */
export function surchargeValue(unitPrice: number, currencyCode: string): string {
  if (unitPrice < 0) throw new RangeError(`a surcharge is zero or more, got ${String(unitPrice)}`);
  return `+${formatMoney(unitPrice, currencyCode)}`;
}
