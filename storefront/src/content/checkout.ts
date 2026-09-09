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

/** The address the order confirmation is sent to. C3b. */
export const EMAIL_LABEL = "Email address";

/**
 * Why the address is asked for, said before it is given rather than after.
 *
 * **It states the duty and what discharging it does not settle**, because
 * every other surface on this site does. § 55(1) requires a confirmation on a
 * durable medium no later than the moment supply begins, and C9 through C11
 * made this deployment send one -- so the hint says it is sent. What it must
 * not say is that the 14-day right is therefore gone: supply here begins the
 * instant payment succeeds and the confirmation follows it, which is a
 * question of fact the trader does not get to answer in its own favour.
 *
 * This comment claimed `tests/legal-consistency.test.ts` "enforces it across
 * all seven" while `EMAIL_HINT` was not one of the seven that guard collected.
 * C13 added it, so the claim is true now and there are eight.
 */
export const EMAIL_HINT =
  "Your order confirmation goes here. We owe you one on a durable medium and we send it — which does not by itself settle whether your 14-day right of withdrawal is gone, and we do not treat it as gone. Refunds and Withdrawal explains that in full.";

/** §5's two inscription fields, both optional. C3c. */
export const INSCRIPTION_LABELS = {
  displayName: "Name on the certificate (optional)",
  dedication: "Dedication (optional)",
} as const;

/**
 * What the two fields are, said before they are filled in.
 *
 * **Three things it has to say, and §5 gives all three.** That both are
 * public. That the billing name is never printed, so leaving them blank does
 * not fall back to it. And that some things are removed mechanically — §7 of
 * the Terms already promises the buyer that, and a filter that silently eats
 * what somebody typed is worse than one that says so.
 */
export const INSCRIPTION_NOTICE =
  "Both are optional and both are public. Your billing name is never printed on a certificate, and leaving these blank prints “the bearer” instead. Links, domain names, email addresses, telephone numbers and markup are removed automatically, and the preview shows what will actually appear.";

/** The heading over the preview of what the certificate will carry. */
export const INSCRIPTION_PREVIEW_LABEL = "What will appear";

/**
 * §6's gift block, behind a disclosure the buyer has to open.
 *
 * **Closed by default, and that is the decision.** Most orders are not gifts,
 * and four fields a buyer has to read past to reach the pay button would tax
 * every ordinary purchase for the sake of the occasional one. `brand.md`
 * forbade a gift toggle on the ground that "a toggle that does nothing is a
 * lie in a control"; this is the row that gives it something to do, so the
 * objection is spent rather than overruled.
 *
 * **`<details>` rather than a checkbox and a conditional.** It opens without
 * JavaScript, it is a control screen readers already understand, and it needs
 * no state in `PaymentForm.tsx`. The surrounding checkout does require
 * scripting -- it is the one route on this site that does, because of the card
 * form -- so this is not a claim that the gift flow degrades. It is that the
 * disclosure adds no new dependency on scripting of its own.
 */
export const GIFT_SUMMARY = "Send this to somebody else";

export const GIFT_LABELS = {
  recipientName: "Their name (optional)",
  recipientEmail: "Their email address",
  senderName: "Your name, as they should see it (optional)",
  message: "A short message (optional)",
} as const;

/**
 * What happens to these four, said before they are typed.
 *
 * **It has to distinguish them from §5's two, which are the opposite.** A
 * buyer who put the recipient's name into `NAME ON THE CERTIFICATE` expecting
 * privacy, or their own into the gift block expecting it to be printed, has
 * been misled by this page. So the notice says which is public and which is
 * not, in that order, rather than describing only itself.
 *
 * **It says a stranger will be emailed.** §23 wants a buyer to know what their
 * money does, and a person who did not realise somebody else would receive
 * mail has been surprised by us.
 */
export const GIFT_NOTICE =
  "The certificate is emailed to the address you give here, once you have paid. None of these four is printed on the certificate or published anywhere — the two fields above are the public ones. Links, domain names, email addresses and telephone numbers are removed from the message, the same way they are from the inscription.";

/** Shown beside the message, the way `INSCRIPTION_PREVIEW_LABEL` is. */
export const GIFT_PREVIEW_LABEL = "What they will read";

/**
 * The empty state for that preview.
 *
 * **Not `NO_INSCRIPTION`**, which is the certificate's own placeholder and
 * reads "The bearer". That is the right words under `WHAT WILL APPEAR`, where
 * it names who the certificate is made out to, and nonsense under `WHAT THEY
 * WILL READ`, where it claims the recipient will read the words "The bearer".
 *
 * Found by rendering the block at 390px and looking at it, which is the only
 * way this kind of defect is ever found: every assertion about the preview
 * passed while it said the wrong thing.
 */
export const GIFT_PREVIEW_EMPTY = "No message";

/**
 * Said where the buyer can still act on it.
 *
 * The § 55 confirmation goes to the buyer and the certificate goes to the
 * recipient; LD-03's constraint 5 is that the recipient gets no part of the
 * contract. A buyer who expects to receive the certificate themselves and does
 * not is a support message, and this sentence is cheaper than the reply.
 */
export const GIFT_CONFIRMATION_NOTE =
  "Your own confirmation still comes to the address above, and it names where the certificate went.";

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

/**
 * The address block, shown only when the cart holds something that is posted.
 *
 * **LD-04 P7.** A certificate goes nowhere, and a form that asked everyone for
 * a postcode in order to sell them a PDF would be collecting data it does not
 * need — the principle LD-02 applied to the certificate's own fields and LD-03
 * to the gift's. So the block appears when there is a parcel and not before.
 */
export const ADDRESS_HEADING = "Where it goes";

export const ADDRESS_LABELS = {
  name: "Name",
  line1: "Street address",
  city: "City",
  postcode: "Postcode",
  province: "State or province",
} as const;

/**
 * Why it is asked for, said before it is given rather than after — the shape
 * `INSCRIPTION_NOTE` and the gift note both take.
 *
 * It names the recipient of the data, because Printful is a processor and a
 * buyer is owed that before they type rather than in a policy they have to go
 * and find. §6 of the Privacy Policy is where the whole of it lives.
 */
export const ADDRESS_NOTE =
  "This is where the printed items go. It is passed to Printful, who print and post them, and to the courier who carries them. Nothing else is done with it, and none of it appears on a certificate. The Privacy Policy sets out the rest.";

/** Shown while the postage is being quoted, so the total is never silently stale. */
export const SHIPPING_PENDING_NOTICE = "Postage is quoted once the address is complete.";

/** The ledger row the postage appears on, in the register every other row uses. */
export const SHIPPING_LABEL = "Postage";

/** Shown while Printful is being asked, so a pause is never mistaken for free. */
export const SHIPPING_QUOTING_LABEL = "Asking Printful";

/**
 * Shown when Printful could not be asked.
 *
 * **No number is offered with it.** §11 forbids a fabricated figure and §23
 * requires the final price to be explicit, so a shop that cannot price the
 * postage says so rather than guessing — a made-up figure is a price the buyer
 * never agreed to.
 */
export const SHIPPING_UNAVAILABLE_NOTICE =
  "Postage could not be quoted for this address just now, so this order cannot be completed. Nothing has been charged. Try again shortly, or write to the address in the Imprint.";
