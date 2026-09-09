/**
 * The printed things, as the upsell table renders them.
 *
 * A pure function of what `listMerch` returned, the way `tier-rows.ts` is a
 * pure function of `listTiers` — so the page stays a page and every judgement
 * below can be driven by a test.
 */

import { MERCH_VALUE_PREFIX } from "../content/merch";
import type { MerchItem } from "./medusa-client";
import { formatMoney } from "./money";
import { NO_VALUE } from "./tier-rows";

export interface MerchRow {
  readonly id: string;
  readonly title: string;
  /** Every size, in the order Medusa returned them. */
  readonly sizes: string;
  readonly value: string;
  readonly price: string;
  readonly variants: readonly { readonly variantId: string; readonly size: string }[];
}

/**
 * `NOT`, followed by zero in the region's own currency.
 *
 * Composed rather than written: a literal would be a hand-typed price, which
 * `store-cart.test.ts` bans across `storefront/src`, and hard-coding dollars
 * into the joke would make it wrong the day the store prices in anything else.
 */
export function merchValue(currencyCode: string): string {
  return `${MERCH_VALUE_PREFIX} ${formatMoney(NO_VALUE, currencyCode)}`;
}

/**
 * One row per item, or none.
 *
 * **An item whose variants do not share one price is dropped.** The table shows
 * one price per row because `catalogue.ts` prices per product, and if that ever
 * stopped being true the row would state a figure that is not what the chosen
 * size costs. Showing the lowest would understate what a buyer is charged,
 * which §23 is about; showing the highest would overstate it. Dropping the row
 * loses an upsell and misleads nobody.
 */
export function merchRowData(items: readonly MerchItem[]): MerchRow[] {
  return items.flatMap((item) => {
    const amounts = new Set(item.variants.map((variant) => variant.amount));
    const first = item.variants[0];
    if (first === undefined || amounts.size !== 1) return [];

    return [
      {
        id: item.id,
        title: item.title,
        sizes: item.variants.map((variant) => variant.size).join(", "),
        value: merchValue(first.currencyCode),
        price: formatMoney(first.amount, first.currencyCode),
        variants: item.variants.map((variant) => ({ variantId: variant.variantId, size: variant.size })),
      },
    ];
  });
}
