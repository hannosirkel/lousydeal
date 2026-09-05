/**
 * The cart's and the checkout's copy, per `docs/current/brand.md` §4.
 *
 * In a content file for the reason decision `004` gives about the trader line.
 * The consent wording in particular is legal text: it is what VÕS § 53(4)
 * p 7¹ requires the buyer to be asked, and it changes with the legal
 * documents, not with a component.
 */

export const CART_DOCUMENT = {
  title: "Order summary",
  form: "Form LD-3",
  revision: "Rev. 2026-09",
} as const;

export const CHECKOUT_DOCUMENT = {
  title: "Payment authorisation",
  form: "Form LD-4",
  revision: "Rev. 2026-09",
} as const;

export const CART_LABELS = {
  total: "Total",
} as const;

/** `brand.md` §4: the empty cart is a document too. */
export const CART_EMPTY_NOTICE = "No items of record.";

export const CHECKOUT_LABEL = "Proceed to payment";

/**
 * The price disclosure, above the pay control rather than below it.
 *
 * Decision `009`: the advertised price is what every buyer is charged, EU or
 * not, and Estonia's VAT comes out of it rather than being added to it. §23
 * requires the final price to be explicit before payment; this says it is also
 * final.
 */
export const PRICE_NOTICE = "Price includes VAT where applicable. The amount shown is the amount charged.";

/**
 * The express consent VÕS § 53(4) p 7¹ requires, worded as `brand.md` §4
 * carries it.
 *
 * Two things it must do, and a third it must not. It must request supply
 * beginning at once, and it must record the buyer's acknowledgement that the
 * 14-day right of § 56(1) goes with it. It must **not** be ticked for them:
 * consent the trader supplies is not consent.
 *
 * It is still not sufficient on its own. The clause also needs the trader's
 * § 55(1)–(2) confirmation on a durable medium — the order email, which is
 * LD-02. Until that exists the right is not excluded, whatever this box says,
 * which is why no page tells a buyer it already is.
 */
export const CONSENT_LABEL =
  "I request that supply of the digital certificate begin immediately, and I acknowledge that I will lose my right of withdrawal once supply has begun.";

/** Shown in place of the pay control until the box is ticked. */
export const CONSENT_REQUIRED_NOTICE = "Payment cannot begin until that box is ticked.";

export const PAY_LABEL = "Pay";
export const PAYING_LABEL = "Paying";

/** The one place the loading cursor belongs: a state inside a rendered page. */
export const PREPARING_PAYMENT_LABEL = "Preparing payment";

export const COUNTRY_LABEL = "Country";
