/**
 * The upsell's copy. §7's UX concept, taken literally.
 *
 * It sits at the cart because that is where the decision is: somebody has
 * chosen to spend money on nothing and has not yet paid. The home page is
 * where the offer is explained; this is where it is worsened.
 *
 * **`VALUE` is the only hard problem on this page, and the resolution is not a
 * joke about one.** Printing zero against a Gildan shirt would break the wall
 * `brand.md` calls load-bearing — accuracy is what the joke rests on, and a
 * shirt is worth something. Omitting the column spends the running gag exactly
 * where an upsell needs it. Inventing a defensible figure is the fabrication
 * §11 forbids. So the column stays and the entry inverts: `NOT`, followed by the same
 * zero figure the tier table prints, is literally true of all four items, makes no claim anybody could ever be asked
 * to defend, keeps the register, and turns the inconsistency into the
 * punchline — the merch is the only thing here with any value, which is a
 * lousy deal for the shop rather than for the buyer.
 *
 * **The figure is composed, not typed.** Writing it out as a literal would trip
 * the currency-sigil ban `store-cart.test.ts` applies to all of
 * `storefront/src`, and rightly: composing it through `formatMoney` means the
 * joke follows the region's currency instead of hard-coding dollars into a
 * sentence. `lib/merch-rows.ts` does it, beside the `NO_VALUE` the tier table
 * already renders through.
 *
 * **Constraint 7 is the whole risk here.** No stock level, because Printful
 * prints on demand and this site does not know. No delivery date, because
 * nobody does. Printful's own estimate is not repeated: P13 has not seen a
 * real one, and omitted is the honest default until it has.
 */

/** §7's line, and the heading over the block. */
export const MERCH_HEADING = "Would you like to make your deal worse?";

/**
 * `Sizes` where the tier table says `Description`, because that is the one
 * thing a printed item has that a certificate does not — and the column has to
 * earn its width with something true rather than with copy.
 */
export const MERCH_TABLE_HEADINGS = {
  item: "Item",
  description: "Sizes",
  value: "Value",
  price: "Price",
  action: "Add",
} as const;

/** The word before the figure. See this file's head for why the figure is not written out here. */
export const MERCH_VALUE_PREFIX = "NOT";

/** Beneath the table, and the whole of the apology. */
export const MERCH_APOLOGY =
  "Unlike the certificate, these objects are worth something. We apologise for the inconsistency.";

export const MERCH_ADD_LABEL = "Add";

/**
 * The word that takes a line back out.
 *
 * **"Remove", not "Delete".** Delete is what you do to a file; a shopper is
 * taking something out of a basket they are still holding, and nothing is
 * destroyed by it. The control names the item too -- a cart of four printed
 * things otherwise offers four identical controls.
 */
export const MERCH_REMOVE_LABEL = "Remove";

/** The size control's accessible name, per item. The visible column heading is not enough for four of them. */
export const MERCH_SIZE_LABEL = "Size";
