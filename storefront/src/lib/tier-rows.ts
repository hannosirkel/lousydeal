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

/** The path a tier's own quotation is served at. One place builds it. */
export function tierPath(handle: string): string {
  return `/deal/${handle}`;
}

/** The row fields that come from data. The action is the page's to supply. */
export interface TierRowData {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly value: string;
  readonly price: string;
  readonly variantId: string;
  readonly href: string;
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
    href: tierPath(tier.handle),
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

/** The one tier a handle names, or undefined. The page 404s on undefined. */
export function tierByHandle(tiers: readonly Tier[], handle: string): Tier | undefined {
  return tiers.find((tier) => tier.handle === handle);
}

/**
 * The tiers that cost more than this one, cheapest first.
 *
 * Strictly more: a tier priced the same is not an upgrade, and listing it
 * would invite a buyer to pay the same amount for the same nothing, which is a
 * joke the site does not make. Sorted so the list reads as a climb.
 */
export function upgrades(tiers: readonly Tier[], current: Tier): Tier[] {
  return tiers.filter((tier) => tier.amount > current.amount).sort((a, b) => a.amount - b.amount);
}
