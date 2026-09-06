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

/** `brand.md` §4: the empty cart is a document too. Set in label style. */
export const CART_EMPTY_NOTICE = "No items of record";

/** An empty document still offers a way on. */
export const RETURN_LABEL = "Return to the purchase order";

/**
 * Shown in place of the pay control when the cart is not for exactly one
 * certificate. C3a.
 *
 * **It states the rule rather than reporting a validation failure**, and does
 * not apologise for something the buyer had no way to know. One certificate
 * per order is a consequence of what a certificate is — §16 gives a deal one
 * order and no line reference — so the notice says that, then says what to do.
 *
 * Register per `brand.md` §2: a clerk's remark, not an error dialog.
 */
export const CART_NOT_SINGLE_NOTICE =
  "A certificate is issued against one order, so an order carries one certificate. This cart holds something else. Choose the one you want and it will replace what is there.";

/** The way out of that state, to the document that can fix it. */
export const CART_LINK_LABEL = "Return to the order summary";

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

/**
 * § 62²(3): where transmitting the order means pressing a button, that button
 * must be legible and marked *only* with "tellimus koos maksekohustusega" or
 * wording just as unambiguous that ordering incurs an obligation to pay.
 * "Pay" was arguably enough; this is the statute's own formulation, and the
 * subsection's sanction for getting it wrong is that the consumer is not bound
 * by the order at all.
 */
export const PAY_LABEL = "Order with obligation to pay";

/**
 * § 62²(2): immediately before the order is transmitted, clearly and
 * prominently, the § 54(1) information at points 4, 6, 10 and 11 — the main
 * characteristics, the total price with taxes, any minimum duration of the
 * buyer's obligations, and the term of a continuing contract.
 *
 * The total is the ledger row above this. The other three are here. Points 10
 * and 11 are answered rather than omitted: nothing here continues, and saying
 * so is shorter than making a reader infer it from silence.
 */
export const ORDER_SUMMARY_LINES: readonly string[] = [
  "You are ordering one numbered digital certificate. It is shown to you as soon as you have paid, it confers nothing, and it is the whole of what you receive.",
  "This is a single purchase. There is no subscription, no renewal, no minimum term and nothing to cancel later.",
];
export const PAYING_LABEL = "Paying";

/** The one place the loading cursor belongs: a state inside a rendered page. */
export const PREPARING_PAYMENT_LABEL = "Preparing payment";

/**
 * What the payment step says when scripting is off.
 *
 * **Gate E measured this and it was the one page that lied.** Fetched with no
 * JavaScript, `/checkout` served a blinking cursor and the words "Preparing
 * payment" — and nothing was preparing, because the thing that prepares it is
 * the script that will never run. Every other route serves its whole document
 * without scripting; this one cannot, since a card is entered into a frame
 * Stripe serves.
 *
 * So the inability is inherent and the message was not. It names the cause and
 * gives a way to reach a person, which is the same standard the rest of the
 * site is held to.
 */
export const PAYMENT_NEEDS_SCRIPTING =
  "Paying needs JavaScript, because the card form is served by Stripe and runs in your browser. Nothing else on this site does. If you would rather not turn it on, write to us and we will take the order by email.";

export const COUNTRY_LABEL = "Country";
