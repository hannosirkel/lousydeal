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

/** One cart line, as the checkout needs to judge it. */
export interface CartLine {
  readonly quantity: number;
  /** Medusa's `product_handle`, or `null` where it gave none. */
  readonly handle: string | null;
}

/**
 * Whether this cart can be paid for.
 *
 * **This used to be "exactly one line".** Contract §16 gives a deal one
 * `order_id` and no line reference, so an order for two certificates has no
 * single tier and no single price to put on a document, and C2's subscriber
 * issues nothing for one rather than printing a transaction that did not
 * happen. An order that takes money and yields no certificate is the worst
 * available outcome, so the checkout must not offer to take it.
 *
 * All of that is still true. What changed in LD-04 is that it stopped implying
 * one *line*: a cart may hold a certificate and a mug, and the rule is **at
 * most one certificate**, not one thing.
 *
 * Three cases it admits and one it does not:
 *
 *  - one certificate, alone — what the shop has always sold;
 *  - one certificate and any amount of merch — the upsell §7 asks for;
 *  - merch alone, with no certificate. Nothing issues, which is correct:
 *    nobody bought one. `order-placed.ts` says so at info rather than error;
 *  - **two certificates, refused**, whatever else is in the cart.
 *
 * A quantity above one on a certificate line is two certificates by another
 * route, and refused the same way.
 *
 * Zero lines is not payable either — the page has its own empty-cart document,
 * and returning `true` here would offer a pay control for nothing.
 *
 * `addToCart` keeps a cart out of the refused state by replacing rather than
 * appending. This is the second check and not a redundant one:
 * `POST /store/carts/:id/line-items` is public, so the state is reachable by
 * anyone who wants it.
 */
/**
 * Whether this cart holds anything that has to be posted.
 *
 * The question the address block turns on, and it is asked the same way the
 * payability rule asks its own: by handle, against the list Medusa gives. A
 * line that is not a certificate is a thing in a box.
 *
 * An empty cart needs no address, which is not a special case so much as the
 * absence of the only reason to ask for one.
 */
export function cartNeedsAddress(lines: readonly CartLine[], certificateHandles: readonly string[]): boolean {
  return lines.some((line) => line.handle === null || !certificateHandles.includes(line.handle));
}

export function isPayableCart(lines: readonly CartLine[], certificateHandles: readonly string[]): boolean {
  if (lines.length === 0) return false;
  // An unreadable quantity is not a quantity. `getCheckoutCart` keeps such a
  // line as `NaN` rather than dropping it, precisely so it cannot be counted
  // as absent here.
  if (lines.some((line) => !Number.isFinite(line.quantity) || line.quantity < 1)) return false;

  const certificates = lines.filter((line) => line.handle !== null && certificateHandles.includes(line.handle));
  const units = certificates.reduce((total, line) => total + line.quantity, 0);
  return units <= 1;
}
