/**
 * The home page's mapping from what the Store API returned to what the table
 * renders, as pure functions.
 *
 * They are here rather than inline in `src/app/page.tsx` so a test can call
 * the same code the page calls. The page is an async Server Component that
 * awaits `connection()` and `cookies()`, so it cannot be rendered outside a
 * request; a test that re-implements its mapping and then asserts the result
 * is asserting a copy, and passes while the page swaps two columns.
 */

import type { Tier } from "./medusa-client";
import { TIER_DESCRIPTIONS } from "../content/home";
import { formatMoney } from "./money";

/**
 * What a certificate is worth. Zero, formatted rather than typed, so it
 * carries the currency of the price beside it and trips no currency-literal
 * guard.
 */
export const NO_VALUE = 0;

/** The row fields that come from data. The action is the page's to supply. */
export interface TierRowData {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly value: string;
  readonly price: string;
  readonly variantId: string;
}

export function tierRowData(tier: Tier): TierRowData {
  return {
    id: tier.id,
    title: tier.title,
    // A tier the API returns but the copy does not describe renders without a
    // description rather than failing the page: a missing sentence is a gap in
    // marketing copy, not in a disclosure, and decision `004`'s visible-gap
    // rule is about the second kind.
    description: TIER_DESCRIPTIONS[tier.handle] ?? "",
    value: formatMoney(NO_VALUE, tier.currencyCode),
    price: formatMoney(tier.amount, tier.currencyCode),
    variantId: tier.variantId,
  };
}

/**
 * The cheapest tier, which is what the offer block quotes. Undefined when the
 * store offers nothing — see `page.tsx`, which then renders the document as
 * empty rather than as an offer with no price.
 */
export function cheapest(tiers: readonly Tier[]): Tier | undefined {
  return tiers.reduce<Tier | undefined>(
    (lowest, tier) => (lowest === undefined || tier.amount < lowest.amount ? tier : lowest),
    undefined,
  );
}
