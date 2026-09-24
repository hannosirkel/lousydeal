/**
 * The cart's and the checkout's copy, per `docs/current/brand.md` §4.
 *
 * In a content file for the reason decision `004` gives about the trader line.
 * The consent wording in particular is legal text: it is what VÕS § 53(4)
 * p 7¹ requires the buyer to be asked, and it changes with the legal
 * documents, not with a component.
 */

import { NO_INSCRIPTION } from "./certificate";

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

export const CODE_LABEL = "Discount code";
export const CODE_APPLY_LABEL = "Apply code";
export const CODE_REMOVE_LABEL = "Remove";

/** Stable D4 refusal reasons mapped to copy rather than reflected from the URL. */
export const CART_CODE_NOTICES = {
  unknown_code: "That code is not on file. Nothing in the cart changed.",
  no_certificate: "A discount code needs exactly one certificate in the cart. Choose the one you want, then try again.",
  completed: "This order is already complete. Start a new purchase to use a code.",
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

/**
 * Shown where a cart holds printed goods and no certificate.
 *
 * **Merch is an upsell**, settled by the operator on 2026-09-09, so this is
 * not a cart the shop takes money in. The notice says what to do rather than
 * reporting a validation failure, which is the register
 * `CART_NOT_SINGLE_NOTICE` already sets — and it does not scold: a buyer who
 * reached this state did nothing wrong, they just started from the wrong end.
 */
export const CART_NEEDS_CERTIFICATE_NOTICE =
  "The printed things are an upsell, so they go with a certificate rather than instead of one. Add the certificate you want and the rest of the cart stays as it is.";

/**
 * Shown where the surcharge, and nothing else, keeps the cart from payment.
 *
 * LD-06 D3. The two notices above tell a buyer to choose or add a
 * certificate, and for a cart carrying its discount line twice, or once at a
 * quantity of two, that is the wrong fix. The state is reachable because the
 * public line-item route can change the line's quantity; the shop will not
 * print one dollar's adjustment beside a total that rose by two, so it
 * refuses and says what to do instead. It names the line by the word the
 * ledger uses for it.
 *
 * **It asks for the two things the cart can do.** The cart's `Remove` takes a
 * whole line and nothing decrements a quantity, so "remove the extra" was an
 * instruction with no control behind it. Removing the discount and entering
 * the code again leaves exactly one line of one, whichever way the cart was
 * wrong.
 */
export const CART_SURCHARGE_NOTICE =
  "A discount code applies to an order once. This cart carries its discount line more than once, or at a quantity above one, so the total shown is not the one the code produces. Return to the order summary, remove the discount and enter the code again; nothing else in the cart needs to change.";

/** The way out of that state, to the document that can fix it. */
export const CART_LINK_LABEL = "Return to the order summary";

export const CHECKOUT_LABEL = "Proceed to payment";
export const STORE_CLOSED_NOTICE = "Ordering is currently closed.";

/** The card field is Stripe's, not a field Lousy Deal handles. */
export const STRIPE_PAYMENT_NOTICE =
  "Stripe provides the card form. Lousy Deal does not receive or store your full card number.";

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

/**
 * The heading over §5's two fields.
 *
 * **LD-11 F4.** Rendered at 390px, the gift block was the only labelled group
 * on this page — it has a `<summary>` — and the certificate's two fields sat
 * under nothing but a paragraph of fine print. So the labelled group was the
 * private one and the unlabelled group was the public one, which is the wrong
 * way round: a buyer scanning for "where does the recipient's name go" finds
 * the only heading on the page and it is the wrong field group.
 *
 * It names the document rather than repeating the notice. The notice below it
 * still says what is public; this says which of the two groups you are in.
 */
export const INSCRIPTION_HEADING = "What the certificate says";

/** The heading over the preview of what the certificate will carry. */
export const INSCRIPTION_PREVIEW_LABEL = "What will appear";

/**
 * The preview when the buyer has typed nothing.
 *
 * **LD-11 F4, and the same defect `GIFT_PREVIEW_EMPTY` was.** The row read
 * `What will appear ···· The bearer`, in the same style as a name the buyer
 * had chosen, so an untouched field and a deliberate one were
 * indistinguishable. Order #1's buyer typed the recipient's name into the gift
 * block, saw this row unchanged, and had no reason to connect the two; the
 * certificate rendered `The bearer`.
 *
 * `NO_INSCRIPTION` is still shown, because §5's disclosure is the whole point
 * of the preview and the buyer is owed what will actually print. What is added
 * is that nothing was typed.
 *
 * **`No name`, to parallel `GIFT_PREVIEW_EMPTY`'s `No message`** directly
 * below it. That is the whole of the reason, and an earlier draft of this
 * comment claimed a second one that is false: that the shorter string keeps
 * the ledger row on one line. Measured in the repository's own `LDMono` at
 * 320, 360, 375 and 390, it does not — this row is 56px and two lines at every
 * common phone width, and only returns to 32px at 412 and above. The first
 * measurement was taken without `--font-mono` defined, so it sized a narrower
 * fallback face.
 *
 * **The wrap is accepted rather than designed around.** The single-line row it
 * replaces said the wrong thing: `The bearer` rendered exactly like a name the
 * buyer had chosen. Two legible lines that say nothing was typed beat one line
 * that misleads, and no shorter string can both fit at 360 and keep
 * `NO_INSCRIPTION`, which §5's disclosure needs and an existing assertion
 * holds. G6's 390px sweep owns whether the ledger should wrap more gracefully.
 */
export const INSCRIPTION_PREVIEW_EMPTY = `No name — “${NO_INSCRIPTION}”`;

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
  "We still send your own confirmation to the address above, and it names where the certificate went.";

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
 * The same disclosure, for a cart with a parcel in it.
 *
 * **"The amount charged" becomes "the amount we charge", and that is the whole
 * of the change.** A customs authority outside the European Union may levy
 * import duty or local tax before releasing a parcel, and the original
 * sentence reads as a promise that nothing further can ever be asked of the
 * buyer — which is not ours to make.
 *
 * § 54(1) p 6 has a fallback limb for exactly this: where an additional cost
 * cannot reasonably be calculated in advance, the trader says that it may be
 * payable. So **no figure appears here and none could** — §11 forbids naming
 * an amount nobody computed, and this one turns on a tariff, a destination and
 * a valuation we never see.
 *
 * Shown only where something is posted. A certificate crosses no border.
 */
export const POSTED_PRICE_NOTICE =
  "Price includes VAT where applicable, and postage is quoted and shown as its own line before you pay. The amount shown is the amount we charge. A parcel sent outside the European Union may also attract import duty or local tax before it is released to you, charged by the customs authority where you live rather than by us, and we cannot tell you that amount in advance.";

/** Which of the two the page shows, decided by whether anything is posted. */
export function priceNotice(hasPostedGoods: boolean): string {
  return hasPostedGoods ? POSTED_PRICE_NOTICE : PRICE_NOTICE;
}

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
  "I request that supply of the digital certificate begin immediately, and I acknowledge that I will lose my right of withdrawal for that certificate once supply has begun.";

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
const CERTIFICATE_ALONE =
  "You are ordering one numbered digital certificate. It is issued as soon as you have paid and sent to the email address you give, it confers nothing, and it is the whole of what you receive.";

/** True of every cart here, and § 54(1) p 10 and p 11 answered rather than omitted. */
const SINGLE_PURCHASE =
  "This is a single purchase. There is no subscription, no renewal, no minimum term and nothing to cancel later.";

export const ORDER_SUMMARY_LINES: readonly string[] = [CERTIFICATE_ALONE, SINGLE_PURCHASE];

/**
 * The § 62²(2) summary, for a cart that can now hold three different shapes.
 *
 * **The first line above says "it is the whole of what you receive", and in a
 * cart with a mug in it that is false.** § 62²(2)'s sanction is that a buyer
 * is not bound by an order transmitted without this information — so getting
 * it wrong is not a cosmetic failure, and a line describing the wrong goods is
 * worse than a line describing none.
 *
 * Three shapes, because `isPayableCart` admits three: a certificate alone, a
 * certificate with merch, and merch alone. The last is not hypothetical — the
 * Store API's line-item route is public, and `order-placed.ts` already handles
 * an order that issues no certificate.
 *
 * **The third line is § 54(1) p 14 discharged where it counts.** That duty is
 * what § 56²(3) conditions the return cost on, and Refunds §6.1 performs it in
 * a document reached from the footer. Saying it beside the pay control as well
 * costs one sentence and removes the argument about whether a footer link is
 * information given "before the contract is concluded".
 */
export function orderSummaryLines({
  hasCertificate,
  hasPostedGoods,
}: {
  readonly hasCertificate: boolean;
  readonly hasPostedGoods: boolean;
}): readonly string[] {
  const what = hasCertificate
    ? hasPostedGoods
      ? "You are ordering one numbered digital certificate, which is issued as soon as you have paid, sent to the email address you give and confers nothing, together with the printed goods in the total above. Those are made after you order them and posted to the address you give."
      : CERTIFICATE_ALONE
    : "You are ordering the printed goods in the total above. They are made after you order them and posted to the address you give. No certificate is issued, because you have not ordered one.";

  const returns =
    "If you change your mind about a printed item you have 14 days from receiving it, you send it back at your own cost, and we return the price and the postage you paid. Refunds and Withdrawal says how.";

  return hasPostedGoods ? [what, SINGLE_PURCHASE, returns] : [what, SINGLE_PURCHASE];
}

/**
 * What the checkout says once the order is placed. LD-11 H1.
 *
 * **It replaced `Order placed: order_01…`**, a raw Medusa id that told a buyer
 * who had just paid nothing they could use — and it arrives with the § 54(1)
 * line above corrected, because that line promised the certificate "is shown
 * to you as soon as you have paid" and nothing ever showed it. Issuance runs
 * in `order-placed.ts` after this page has its answer, so the page cannot know
 * the certificate's slug or serial; what it can say truthfully is where the
 * certificate's link has gone, and that is what it says.
 *
 * **Every sentence here is something the backend does.** The § 55
 * confirmation goes to the cart's email and carries the certificate link and
 * the itemised total; its subject is `CONFIRMATION_SUBJECT`, "Your lousy deal"
 * and the serial. The parcel line is `parcel-shipped.ts`, sent when Printful
 * reports the shipment. The gift line is `sendGift`, which sends only when
 * `readGift` finds a usable address — so the caller passes one only when
 * `isGiftAddress`, the same rule, accepts it.
 */
export const ORDER_PLACED_HEADING = "Paid. Your order is placed.";

export function orderPlacedLines({
  email,
  giftRecipientEmail,
  hasPostedGoods,
}: {
  readonly email: string;
  readonly giftRecipientEmail: string | null;
  readonly hasPostedGoods: boolean;
}): readonly string[] {
  return [
    `Your certificate is on its way to ${email}, in an email titled \u201cYour lousy deal\u201d and its number. It carries the link to your certificate and the receipt for what you paid.`,
    ...(hasPostedGoods ? ["Your printed goods are made to order; another email says when they are posted."] : []),
    ...(giftRecipientEmail === null
      ? []
      : [`A separate email with the link to the certificate is on its way to ${giftRecipientEmail}.`]),
    "Nothing after a few minutes? Check spam, then write to the address in the Imprint.",
  ];
}

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

/**
 * The one fact `ADDRESS_NOTE` does not carry: whose address this is.
 *
 * **LD-11 F5, and order #1.** The gift block collects an email address and no
 * postal one; the shipping address is a separate field belonging to the merch
 * upsell. The buyer entered the *recipient's* postal address here, which was
 * the right thing to do and which nothing on the page told them to do. A buyer
 * who guesses the other way sends a stranger's hat to themselves.
 *
 * Said where the address is asked for rather than in the gift block, because
 * that is where the question arises, and only on a cart that is both — on an
 * ordinary purchase the buyer is the recipient and this would be noise.
 *
 * **The apostrophe is U+2019, not `'`.** React escapes a straight apostrophe
 * to `&#x27;` in rendered markup, so a test asserting this string against the
 * HTML would never match it — and the two `not.toContain` checks for its
 * absence would pass whether it rendered or not. The typographic apostrophe is
 * also what the rest of this repository's copy uses, and
 * `checkout-address.test.ts` now carries a canary that fails if this copy
 * regains a character React escapes.
 */
export const GIFT_ADDRESS_NOTE =
  "This order is a gift, so this is the recipient\u2019s postal address — the one the parcel goes to. It is not taken from the gift block above, which asks for their email address and no postal one.";

/**
 * Whether to say it.
 *
 * **A function rather than a condition inlined in the component**, because the
 * storefront suite runs under `environment: "node"` with no DOM: a condition
 * on `giftOpen` can be reached only by matching the component's source, and a
 * source match is an assertion that cannot fail for the defect it names. Three
 * rows of this slice shipped one of those. Every combination is driven in
 * `checkout-address.test.ts` instead.
 */
export const giftAddressNote = ({
  isGift,
  needsAddress,
}: {
  readonly isGift: boolean;
  readonly needsAddress: boolean;
}): string | null => (isGift && needsAddress ? GIFT_ADDRESS_NOTE : null);

/** Shown while the postage is being quoted, so the total is never silently stale. */
export const SHIPPING_PENDING_NOTICE = "Postage is quoted once the address is complete.";

/** The ledger row the postage appears on, in the register every other row uses. */
export const SHIPPING_LABEL = "Postage";

/** Shown while Printful is being asked, so a pause is never mistaken for free. */
export const SHIPPING_QUOTING_LABEL = "Asking Printful";

/**
 * What a failure on the pay path says, by where it happened. LD-11 H3.
 *
 * **The rendered error used to be `thrown.message`**, so a buyer could read
 * the Store API proxy's status line or `Medusa did not place an order for
 * cart cart_…`. Three notices replace it,
 * one for each side of the moment money moves, and the operator chose each
 * wording with it rendered on 2026-09-23.
 *
 * `SHIPPING_UNAVAILABLE_NOTICE` below is the model for the first: the
 * reassurance, then the invitation to retry, which is right only because
 * nothing was charged. The third takes the reassurance's shape and not the
 * invitation, because a retry after a charge is a second charge. Stripe's own
 * decline wording is not shown either: the operator chose ours alone.
 */
export const PAYMENT_NOT_STARTED_NOTICE =
  "Payment could not be prepared just now. Nothing has been charged. Try again shortly, or write to the address in the Imprint.";

/** `confirmPayment` refused: Stripe took nothing. */
export const PAYMENT_DECLINED_NOTICE = "Your card was not charged. Check the details, or try another card.";

/**
 * The card succeeded and completing the order did not.
 *
 * Medusa's `completeCartWorkflow` either placed the order, and the
 * confirmation follows, or reverted the payment in its compensation. The
 * operator chose not to promise the second, so this says only what to do.
 */
export const PAYMENT_UNCONFIRMED_NOTICE =
  "Your card was accepted, but the order could not be confirmed just now. Do not pay again: a confirmation email should reach you within a few minutes. If none arrives within the hour, write to the address in the Imprint.";

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
