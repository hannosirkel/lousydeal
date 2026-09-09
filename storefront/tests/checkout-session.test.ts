/**
 * When a Stripe payment session may be created, which Gate D found this
 * checkout answering at the one moment it must not.
 */

import { describe, expect, it } from "vitest";

import { paymentSessionNeeded, type PaymentSessionInput } from "../src/lib/checkout-rules";

const input = (over: Partial<PaymentSessionInput> = {}): PaymentSessionInput => ({
  paymentCollectionId: "paycol_1",
  needsAddress: false,
  postage: null,
  clientSecret: null,
  sessionPostage: null,
  ...over,
});

describe("a cart with nothing to post", () => {
  it("takes one as soon as there is a collection to hang it on", () => {
    // Unchanged from before the finding: no address, no quote, no total that
    // can move underneath the buyer.
    expect(paymentSessionNeeded(input())).toBe(true);
  });

  it("takes none before that, because there is nothing to create it against", () => {
    expect(paymentSessionNeeded(input({ paymentCollectionId: null }))).toBe(false);
  });

  it("takes no second one once it has it", () => {
    expect(paymentSessionNeeded(input({ clientSecret: "cs_1" }))).toBe(false);
  });
});

describe("a cart with a parcel in it", () => {
  const parcel = (over: Partial<PaymentSessionInput> = {}) => input({ needsAddress: true, ...over });

  it("takes none until the postage is settled, which is the whole finding", () => {
    /**
     * A session created here is created against the goods-only total. The
     * attach that follows changes the cart total; Medusa answers a changed
     * total by deleting the payment session, and for Stripe that is
     * `paymentIntents.cancel`. The buyer then completes the card form against
     * a cancelled intent. Every merch order, every time.
     */
    expect(paymentSessionNeeded(parcel({ postage: null }))).toBe(false);
  });

  it("takes one once a shipping method has been priced onto the cart", () => {
    expect(paymentSessionNeeded(parcel({ postage: 5.22 }))).toBe(true);
  });

  it("takes one for free postage, which is a settled figure and not an absent one", () => {
    // `0` is a real quote. A truthiness check here would wait for ever on it,
    // and the pay control would never light up.
    expect(paymentSessionNeeded(parcel({ postage: 0 }))).toBe(true);
  });

  it("takes a fresh one when the postage changes", () => {
    // Because Medusa has already deleted the old one: the cart total moved,
    // so `refresh-payment-collection.js` ran `deletePaymentSessionsWorkflow`
    // and bumped the collection amount. Paying against the held secret would
    // fail at Stripe.
    expect(paymentSessionNeeded(parcel({ postage: 25.56, clientSecret: "cs_1", sessionPostage: 5.22 }))).toBe(true);
  });

  it("takes none when a re-quote lands on the same figure", () => {
    // The cart total did not move, so Medusa deleted nothing and the held
    // session is still good. Creating another would cancel a live
    // PaymentIntent and empty the card fields the buyer had already filled.
    expect(paymentSessionNeeded(parcel({ postage: 5.22, clientSecret: "cs_1", sessionPostage: 5.22 }))).toBe(false);
  });

  it("holds what it has where the postage falls back to nothing", () => {
    // **The order of the two conditions decides this one.** An unsettled
    // postage is answered before the comparison, so a cart whose address has
    // gone incomplete keeps the session it has rather than replacing it with
    // one made against a total nobody has quoted. The pay gate is shut in
    // this state anyway (`shippingSettled`), and the quote effect
    // deliberately does not report `null` upward -- but the rule has to be
    // right on its own, because a rule that depends on its caller not calling
    // it is not a rule.
    expect(paymentSessionNeeded(parcel({ postage: null, clientSecret: "cs_1", sessionPostage: 5.22 }))).toBe(false);
  });

  it("waits for the collection even with the postage in hand", () => {
    expect(paymentSessionNeeded(parcel({ paymentCollectionId: null, postage: 5.22 }))).toBe(false);
  });
});
