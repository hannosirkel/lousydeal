/**
 * The home page's copy, per `docs/current/brand.md` §4.
 *
 * In a content file rather than in the page for the same reason the trader
 * line is (decision `004`): copy that a lawyer or the operator will want to
 * change should be changeable by editing content, not by editing a component.
 *
 * **No price appears here.** Every figure on the page is formatted from what
 * the Store API returns — `tests/store-cart.test.ts` forbids a currency
 * literal anywhere under `storefront/src`, and the reason it exists is that a
 * price written twice drifts.
 */

export const HOME_DOCUMENT = {
  title: "Purchase order",
  form: "Form LD-1",
  revision: "Rev. 2026-09",
} as const;

/** The offer ledger's labels. Their values come from the API. */
export const OFFER_LABELS = {
  item: "Item",
  price: "Price",
  value: "Value",
  return: "Return",
} as const;

/**
 * The one figure on this page allowed the display step and the accent: the
 * return on the transaction, which is total. It is a ratio rather than an
 * amount, so it is not a price and does not come from the API.
 */
export const OFFER_RETURN = "-100%";

export const TIER_TABLE_HEADINGS = {
  item: "Item",
  description: "Description",
  value: "Value",
  price: "Price",
  action: "Order",
} as const;

/**
 * Keyed by the product handle `backend/src/commerce/product-model.ts` declares.
 * A tier the API returns but this record does not describe renders with no
 * description rather than failing the page: an absent sentence is a gap in
 * marketing copy, not in a disclosure, and `004`'s visible-gap rule is about
 * the second kind.
 */
export const TIER_DESCRIPTIONS: Readonly<Record<string, string>> = {
  "lousy-deal": "Official numbered certificate of poor judgment.",
  "lousy-deal-plus": "Identical, but labelled Plus.",
  "lousy-deal-pro": "Professional-grade poor judgment.",
};

export const ACQUIRE_LABEL_PREFIX = "Acquire for";

/**
 * The table's own button says only this. The row already carries the price in
 * its own column, and repeating it there put the figure in the markup twice
 * and wrapped the control onto two lines at every width.
 */
export const ACQUIRE_LABEL = "Acquire";

export const TERMS_OF_OFFER_TITLE = "Terms of this offer";

/**
 * Four lines, and each one is checkable against something.
 *
 * The fourth is worded carefully. VÕS § 53(4) p 7¹ removes the right of
 * withdrawal only where the consumer consented **and** the trader gave the
 * § 55(1)–(2) confirmation on a durable medium; the checkout collects the
 * first half and LD-02 sends the second. So this says what the checkout asks
 * of a buyer, and does not claim the right is already gone.
 *
 * `brand.md` §4 has each line linking the document that governs it. Those
 * routes arrive with V8–V11 and V12 adds the links; a link that 404s is worse
 * than an absent one.
 */
export const TERMS_OF_OFFER: readonly string[] = [
  "You receive a numbered digital certificate and nothing else of value. That is the product, not a caveat.",
  "It is supplied immediately after payment.",
  "The price shown is the price charged. It includes VAT where VAT applies, and nothing is added at checkout.",
  "At checkout you are asked to consent to that immediate supply, and to acknowledge that you thereby lose the 14-day right of withdrawal. The box is not ticked for you.",
];
