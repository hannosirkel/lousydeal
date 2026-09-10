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
  /** Medusa's handle, which is also the page's path and the photograph's filename. */
  readonly handle: string;
  readonly title: string;
  /**
   * What the object is, under a title that will not say.
   *
   * **Every title here is a joke** — "Original Purchase Receipt" is a shirt,
   * "Certified Worthless" is a sticker — and a buyer deciding whether to buy
   * one has to be told which. `null` where the store was seeded before
   * `seed-merch.ts` wrote it, in which case the row renders nothing rather
   * than an empty line.
   */
  readonly kind: string | null;
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
        handle: item.handle,
        title: item.title,
        kind: item.kind,
        sizes: item.variants.map((variant) => variant.size).join(", "),
        value: merchValue(first.currencyCode),
        price: formatMoney(first.amount, first.currencyCode),
        variants: item.variants.map((variant) => ({ variantId: variant.variantId, size: variant.size })),
      },
    ];
  });
}

/**
 * Where one printed thing's own page lives.
 *
 * Not `/deal/<handle>`: that namespace is a *quotation* for a certificate
 * (Form LD-2), and a mug is not a quotation for nothing.
 */
export function goodsPath(handle: string): string {
  return `/goods/${handle}`;
}

/**
 * The photograph of that thing, by convention rather than by stored URL.
 *
 * `design/merch/fetch-mockups.mjs` writes `<handle>.png` under
 * `storefront/public/goods/`, so the filename *is* the handle and nothing has
 * to keep a URL in step with a product. Printful's own CDN links are not
 * hotlinked -- `brand.md` §6's amendment says the site serves its own copy,
 * and Printful does not promise those URLs outlive the product.
 */
export function goodsImagePath(handle: string): string {
  return `/goods/${handle}.png`;
}
