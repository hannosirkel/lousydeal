# Checkout and payment

Problems and unmeasured paths in the checkout and the paid-cart handling. See
[the issues index](./README.md) for how to take one up.

- **No live payment has gone through the paid-cart paths.** A Stripe sandbox
  payment on the test store completed a cart after the storefront lost its
  first completion request. The page showed the "card accepted" notice, and a
  reload completed the order. The live store has taken no payment through
  these paths.
- **Some paid-cart branches are not measured on a deployed store.** These are:
  Stripe unreachable; an intent still `processing`; a completion that fails;
  the second answer of the one-reload guard (`prior_completed`); completion of
  a cart that Medusa already completed; and the reload of an unpaid checkout
  that holds a session. The last one is where the cost of one Stripe read for
  each such reload occurs.
- **The "do not pay again" notice can reach a buyer who paid nothing.** If
  Stripe.js does not load, or the publishable key does not match the session,
  the prior-payment check cannot answer. The page then says "Do not pay again
  yet", with no way to continue. This is the conservative default, not a fix.
- **A forged `?redirect_status=succeeded` on an unpaid cart** shows "Your card
  was accepted…" with no way to continue. Only the visitor who forges it sees
  it, but the sentence is false.
- **A failure after a successful redirect completion shows the error page.**
  The cart read and `listTiers` are outside the `try` block, so the page does
  not say that the card was charged.
- **The withdrawal-waiver consent is enforced only in the browser.** The pay
  control stays disabled until the box is ticked, but nothing records the
  consent on the cart or the order. The order confirmation tells every buyer
  that they ticked it. Record the consent with the order, or change the
  sentence.
- **A "not ready" race shows the Unknown notice falsely.** The payment wrapper
  can reject with "not ready" only in a race, and the page then says it could
  not hear back from the payment provider.
- **A completed cart with no email throws.** Only a cart completed directly
  through the public Store API can have no email.
- **The number of PaymentIntents a parcel checkout creates is not measured.**
  The quote waits for a complete address, which should keep it to one. Test it
  with a browser walk of the test store.
- The limits in [`architecture.md`](../current/architecture.md) §14 are also
  candidates, for example a `processing` redirect that still shows the form.
