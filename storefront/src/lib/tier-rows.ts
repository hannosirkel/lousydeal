/**
 * What the tier pages decide, as functions a test can call.
 *
 * The home page's mapping lives here, and so does the quotation's selection:
 * which tier a handle names, which tiers count as upgrades, what path a tier
 * is served at. None of it is inline in a route, because a route is an async
 * Server Component that awaits `connection()` and `cookies()` and cannot be
 * rendered outside a request — a test that re-implements a page's decision and
 * then asserts the result is asserting a copy, and passes while the page
 * changes.
 */

import { notFound } from "next/navigation";

import type { Tier } from "./medusa-client";
import { TIER_DESCRIPTIONS } from "../content/home";
import { formatMoney } from "./money";

/**
 * What a certificate is worth. Zero, formatted rather than typed, so it
 * carries the currency of the price beside it and trips no currency-literal
 * guard.
 */
export const NO_VALUE = 0;

/**
 * The path a tier's own quotation is served at. One place builds it, so the
 * home table and the upgrade list cannot disagree.
 *
 * Encoded: Medusa handles are slugs today, but a handle carrying a space or a
 * `#` would otherwise produce a malformed href rather than a link to a page
 * that 404s.
 */
export function tierPath(handle: string): string {
  return `/deal/${encodeURIComponent(handle)}`;
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

/** The one tier a handle names, or undefined. */
export function tierByHandle(tiers: readonly Tier[], handle: string): Tier | undefined {
  return tiers.find((tier) => tier.handle === handle);
}

/**
 * The tier a handle names, or the not-found path.
 *
 * The `notFound()` call is here rather than in the route so it is a thing a
 * test can execute: `next/navigation` throws `NEXT_HTTP_ERROR_FALLBACK;404`,
 * which a suite can catch. Left in the page, the branch was assertable only by
 * reading it — and deleting it left the suite green.
 *
 * A quotation for a deal that does not exist must not render: a document
 * headed `QUOTATION` with no item tells a reader, and a crawler, that the deal
 * is real.
 */
export function requireTier(tiers: readonly Tier[], handle: string): Tier {
  const tier = tierByHandle(tiers, handle);
  if (tier === undefined) notFound();
  return tier;
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
