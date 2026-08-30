/**
 * The three tiers this shop sells.
 *
 * Names and prices are `docs/current/concept.md:21-24`. That document writes
 * `$` and names no currency code; the currency, and the reading of the amount
 * as tax-inclusive -- what the customer pays -- are
 * `docs/decisions/007-usd-and-tax-inclusive-pricing.md`. Amounts below are
 * minor units (cents).
 *
 * The three amounts are declared here and nowhere else under `backend/src/`:
 * `backend/tests/commerce-product-seed.test.ts` reads every other `.ts` file
 * under that root and fails on a bare 500, 1000 or 2500. The handles and
 * titles carry no such scan.
 *
 * A fourth tier, Enterprise, is named at `concept.md:25-29` and deferred there
 * ("Medusa has no subscription engine"). It is not declared here.
 *
 * This is a digital certificate, not Plepic's physical game box, so unlike
 * `plepic/backend/src/commerce/product-model.ts` this declares no packaging
 * and no customs. `manageInventory` is `false` on each of the three tiers
 * below: there is nothing to decrement, and a count nobody maintains is a
 * false promise the first time it drifts.
 */

export interface ProductTierModel {
  /** The natural key later rows address this tier by. */
  readonly handle: string;
  /** What the Admin shows. Structural, not marketing copy. */
  readonly title: string;
  /**
   * Lowercase ISO 4217. Medusa normalizes a `currency_code` to lowercase in
   * `node_modules/@medusajs/utils/dist/common/normalize-currency-code.js:9-13`,
   * called on write at
   * `node_modules/@medusajs/region/dist/services/region-module.js:127`.
   */
  readonly currency: string;
  /** Minor units, tax-inclusive -- the amount the customer pays. */
  readonly amountMinor: number;
  /** Always `false`. See this file's header for why. */
  readonly manageInventory: false;
}

const CURRENCY = "usd";

/** Operator-frozen. Order matches the listing in `concept.md`. */
export const PRODUCT_TIERS: readonly ProductTierModel[] = [
  {
    handle: "lousy-deal",
    title: "Lousy Deal",
    currency: CURRENCY,
    amountMinor: 500,
    manageInventory: false,
  },
  {
    handle: "lousy-deal-plus",
    title: "Lousy Deal Plus",
    currency: CURRENCY,
    amountMinor: 1000,
    manageInventory: false,
  },
  {
    handle: "lousy-deal-pro",
    title: "Lousy Deal Pro",
    currency: CURRENCY,
    amountMinor: 2500,
    manageInventory: false,
  },
];
