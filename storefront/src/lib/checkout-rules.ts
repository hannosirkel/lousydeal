/**
 * The rules the checkout applies, as functions the page calls and a test can
 * call too.
 *
 * **This exists because the test had a second copy of one.** V6b's first
 * version declared the pay control's disabled rule inside
 * `tests/checkout-consent.test.ts` and asserted that. Gate D proved what that
 * was worth: it defaulted the consent box to ticked and deleted the gate from
 * `PaymentForm` entirely, and all 295 tests passed. A rule written twice is a
 * rule guarded nowhere.
 */

export interface PayGateInput {
  /** Stripe has loaded and the Payment Element is usable. */
  readonly stripeReady: boolean;
  /** A submission is already in flight. */
  readonly submitting: boolean;
  /** The buyer has ticked the express-consent box. */
  readonly consented: boolean;
}

/**
 * Whether the pay control is unavailable.
 *
 * Consent is a condition of payment, not a courtesy: VÕS § 53(4) p 7¹ needs
 * the buyer's express prior consent before supply begins, and supply begins
 * when this control is used. The other two conditions are mechanical.
 */
export function payDisabled({ stripeReady, submitting, consented }: PayGateInput): boolean {
  return !stripeReady || submitting || !consented;
}

/**
 * Whether this cart is for exactly one certificate.
 *
 * Contract §16 gives a deal one `order_id` and no line reference, so an order
 * for two things has no single tier and no single price to put on a document.
 * C2's subscriber therefore issues nothing for such an order rather than
 * printing a transaction that did not happen — and an order that takes money
 * and yields no certificate is the worst of the available outcomes, so the
 * checkout must not offer to take it.
 *
 * `addToCart` keeps a cart out of this state by replacing rather than
 * appending. This is the second check and not a redundant one:
 * `POST /store/carts/:id/line-items` is public, so the state is reachable by
 * anyone who wants it, and a cart made before C3a shipped can still be in it.
 *
 * Zero lines is not "one certificate" either — the page has its own empty-cart
 * document for that, and this returning `true` for an empty cart would offer a
 * pay control for nothing.
 */
export function isSingleCertificate(quantities: readonly number[]): boolean {
  return quantities.length === 1 && quantities[0] === 1;
}
