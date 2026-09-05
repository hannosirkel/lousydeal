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
