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
  /**
   * LD-04 P7: postage is settled, or this cart has none to settle.
   *
   * `true` for a certificate-only cart, which posts nothing. For a cart with a
   * parcel in it, `true` only once a shipping method is on the cart — because
   * until then the total is the goods alone, and paying would take the buyer's
   * money without the postage in it, which the merchant would then pay.
   *
   * Optional so every existing caller keeps its meaning: a gate that silently
   * became stricter would be a gate nobody reviewed.
   */
  readonly shippingSettled?: boolean;
  /**
   * LD-04 P10: this cart contains a certificate, so there is consent to give.
   *
   * `false` for a cart holding merch alone — a state `isPayableCart` admits
   * deliberately, and one the public line-item route makes reachable. § 53(4)
   * p 7¹ is about digital content, so a buyer ordering only a mug is being
   * asked to consent to the immediate supply of something they are not
   * buying. **Requiring that tick would block a lawful order behind a
   * meaningless act**, and `brand.md` calls a control that does nothing a lie.
   *
   * Optional and defaulting to `true`, so the certificate's gate is unchanged
   * and no existing caller silently loosened.
   */
  readonly consentRequired?: boolean;
}

/**
 * Whether the pay control is unavailable.
 *
 * Consent is a condition of payment, not a courtesy: VÕS § 53(4) p 7¹ needs
 * the buyer's express prior consent before supply begins, and supply begins
 * when this control is used. The other conditions are mechanical.
 */
export function payDisabled({
  stripeReady,
  submitting,
  consented,
  shippingSettled = true,
  consentRequired = true,
}: PayGateInput): boolean {
  return !stripeReady || submitting || (consentRequired && !consented) || !shippingSettled;
}

/**
 * Whether a submit must be refused, as opposed to whether the control looks
 * available.
 *
 * **These were the same rule written twice, and Gate D found the copy had
 * drifted.** `payDisabled` learned `consentRequired` in P10c; the submit
 * handler kept an unconditional `!consented`, so for a cart with no
 * certificate the button enabled and the click did nothing — no error, no
 * request, no state — on every merch-alone order.
 *
 * It is a separate rule and not the same call, because it answers a different
 * question: `disabled` is an attribute, and `form.requestSubmit()` ignores it.
 * A previous Gate D completed a cart with the box visibly unticked by exactly
 * that route, which is why the handler checks at all. What it must not do is
 * check something *different*.
 */
export function paySubmitBlocked({
  stripeReady,
  submitting,
  consented,
  consentRequired = true,
}: Omit<PayGateInput, "shippingSettled">): boolean {
  return !stripeReady || submitting || (consentRequired && !consented);
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

/**
 * Whether this cart contains a certificate at all.
 *
 * The mirror of the rule above, and the question the consent box turns on. It
 * is deliberately not `!cartNeedsAddress(...)`: a cart holding both answers
 * `true` to each, and a cart holding neither — an empty one — answers `false`
 * to both.
 *
 * A line whose handle Medusa did not give is **not** a certificate here, which
 * is the cautious direction: `cartNeedsAddress` treats the same line as
 * something to post. An unidentifiable line therefore gets an address asked
 * for and no consent demanded, rather than the reverse.
 */
export function cartHasCertificate(lines: readonly CartLine[], certificateHandles: readonly string[]): boolean {
  return lines.some((line) => line.handle !== null && certificateHandles.includes(line.handle));
}

export function isPayableCart(lines: readonly CartLine[], certificateHandles: readonly string[]): boolean {
  if (lines.length === 0) return false;
  // An unreadable quantity is not a quantity. `getCheckoutCart` keeps such a
  // line as `NaN` rather than dropping it, precisely so it cannot be counted
  // as absent here.
  if (lines.some((line) => !Number.isFinite(line.quantity) || line.quantity < 1)) return false;

  const certificates = lines.filter((line) => line.handle !== null && certificateHandles.includes(line.handle));
  const units = certificates.reduce((total, line) => total + line.quantity, 0);
  // **Exactly one, and it used to be at most one.** LD-04 read §7's upsell as
  // admitting three cart shapes and spent rows on the third — merch alone,
  // with no consent box to show and no certificate to issue. The operator
  // settled it on 2026-09-09: **merch is an upsell.** There is no order here
  // that is only a mug.
  //
  // That closes a legal question rather than merely a product one. A
  // merch-only order has no § 53(4) p 7¹ consent to give and no certificate to
  // confirm, so it needed a § 55 confirmation shaped differently from every
  // other — Gate D found it getting none at all. An order shape that cannot
  // occur needs no second document.
  //
  // `POST /store/carts/:id/line-items` is public, so the state is still
  // *reachable*; what changes is that this shop will not take money in it.
  // `order-placed.ts` treats one that arrives anyway as the anomaly it now is.
  return units === 1;
}
