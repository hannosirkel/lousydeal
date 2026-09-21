# LD-11 — Findings

What this slice measured, and what it settled.

The plan is [`../ld-11-user-experience.md`](../ld-11-user-experience.md). This
file holds the evidence its rows are built on, kept apart so that a row can be
read against the thing that proved it, and so that neither file has to be read
whole to use the other.

**No customer identity appears here.** Live order #1 is named by its figures and
its date, never by the recipient's name, address, email or certificate slug —
the plan's global constraint 2, which governs this file equally.

## What the first live order measured

Live order #1, placed 2026-09-19 10:08 UTC. A gift, with merch, with a
discount code. The buyer is the operator; the recipient is a third party whose
identity is deliberately absent from this public document.

| Line | Amount |
| --- | --- |
| Lousy Deal | $5.00 |
| Discount (`BALDRICK20`) surcharge | $1.00 |
| Lousy Deals Trucker Cap | $29.00 |
| Postage | $6.40 |
| **Order total** | **$41.40** |

The certificate records `$6.00` — the tier plus its surcharge, which is what
LD-06 decided a coded certificate is worth. Four things went wrong, and three
of them reached a third party: defects 1 and 2 as false sentences in the gift
message, and defect 3 as a certificate that renders `The bearer` and carries no
dedication. Only defect 4 never left the shop. **Every count of this list in
another document says three**, and the plan's introduction is written to match.

1. **The gift message quoted `$41.40`.** `order-placed.ts` formats the order
   total once and hands the same string to both messages, under a comment
   arguing that "a buyer and a recipient comparing them should see one number".
   That reasoning was sound when a gift order was a certificate and nothing
   else. With a parcel in the order it makes the recipient read
   `Someone spent $41.40 on absolutely nothing for you.` and then open a
   certificate that says `$6.00`. The two documents contradict each other and
   the email is the wrong one.
2. **The gift message said nothing else was coming.** `GIFT_WHAT` promises
   "there is nothing to claim, no account to create and nothing to install" and
   "there is nothing else coming". A trucker cap was in the post to the
   recipient's own address at the time that sentence was sent. It is the only
   line in this repository's mail that is simply false.
3. **The buyer put the recipient's name in the wrong field.** `display_name`
   and `dedication` were both empty; `gift_recipient_name` and
   `gift_sender_name` both held the recipient's name. The certificate rendered
   `The bearer` and carried no dedication. `brand.md`'s gift notice names the
   *mirror image* of this — a buyer who puts the recipient's name into
   `NAME ON THE CERTIFICATE` expecting privacy — and order #1 went the other
   way, leaving the public pair empty. The notice is written against one
   direction of a confusion that runs both ways, which is F4's actual subject:
   the two name groups are indistinguishable, not underexplained.
4. **Nothing in the product can edit an issued inscription.** §5 requires that
   an operator can sanitise, hide or blank an inscription without a reissue,
   and the render is derived precisely so they can. There is no route, no
   script and no admin surface that does it. The repair on 2026-09-19 was a
   hand-written `UPDATE` against the live database over `kubectl exec`.

## A recorded decision was reversed on 2026-09-19

LD-03's global constraint 4 reads, settled by the operator on 2026-09-07:

> **The recipient's name and email are never public.** The public certificate
> carries what the *buyer* typed into §5's `display_name` and `dedication`. A
> gift adds no public field.

On 2026-09-19 the operator directed that the recipient's name be written to
`display_name` on live deal #1, which publishes it on the certificate's public
page. That is a deliberate override of constraint 4 for one record, not a
defect and not an accident, and the recipient was told in writing that their
name is now on a public page and may be removed on request.

**Later the same day the operator settled the general question: constraint 4
stands as written.** A recipient's name does not become public, the gift block
adds no public field, and deal #1's entry remains as a one-off the operator
made knowingly on their own order. F6 writes that into LD-03 and `brand.md` so
the exception is a record rather than a precedent.

**It is recorded here because a constraint that is quietly broken once stops
being a constraint.**

## What reading the pay path measured

Six `$5.00` PaymentIntents sat in live Stripe on 2026-09-20, all
`requires_payment_method`, all abandoned within four minutes. They turned out
to be benign — a certificate-only cart's intent is created when the checkout
page mounts, so every visit to checkout leaves one — but reading the path far
enough to establish that found five defects on the way, none of which any row
above reaches.

Each is cited by symbol rather than by line. Line numbers in this file went
stale between the reading and the review; a symbol survives an edit above it.

1. **Checkout's success state is a raw order id.** The success branch of
   `PaymentForm.tsx` is the whole of it: `<p>Order placed: {orderId}</p>`. No
   link, no styling, no statement of where the confirmation went or what it
   carries.
2. **The § 54(1) copy above the pay control contradicts the product.**
   `CERTIFICATE_ALONE` in `storefront/src/content/checkout.ts` and the
   `hasPostedGoods` variant of `what` in the same file both tell the buyer the
   certificate "is shown to you as soon as you have paid". It is not shown at
   all. Issuance is asynchronous in
   `order-placed.ts` and the link travels only in the § 55 confirmation; the
   storefront cannot even look a deal up by order, because
   `backend/src/api/store/deals/[slug]` is slug-only. This is the same class as
   defect 2 above — a sentence in our own mail or copy that is simply false —
   and not a matter of taste.
3. **A paid cart still renders the payment form.** `getCheckoutCart` never
   reads `completed_at`, although `store-cart.ts` and `cart-actions.ts` both do
   for the cart page. A reload, a back-button or Stripe's own return to
   `return_url` — which `handleSubmit` sets to
   `${window.location.origin}/checkout` — re-renders
   checkout for an order already paid, and the session it then re-creates makes
   Medusa cancel a *succeeded* PaymentIntent, which throws. The buyer reads
   `Store API proxy returned 500` over a form for something they have bought.
4. **Medusa's wording reaches the buyer at the worst moment.** `thrown.message`
   goes straight into the rendered error. After `confirmPayment` succeeds the
   money is captured (`capture: true`), and a failure in completion then shows
   the buyer `Medusa did not place an order for cart cart_…`, re-enables the
   control, and invites a second press against an intent Stripe has already
   settled.
5. **Postage is quoted before the buyer has said where they are.**
   `PaymentForm.tsx` seeds `countryCode` from `countries[0]?.iso_2` against a
   list sorted by alpha-2, so the default is whichever country sorts first, and
   the control that sets it sits *below* the address fieldset it governs.
   `addressComplete` accepts any non-blank string per field, so a parcel cart
   quotes against the wrong country before the buyer reaches that control,
   attaches a shipping method at that postage and mints a PaymentIntent against
   that total; the real country then arrives, Medusa cancels it, and a fresh one
   is minted. That is Gate D's finding 17 (`checkout-rules.ts`) again, once per
   parcel order, as designed behaviour rather than as a bug. The same effect has
   no debounce, so the first quote goes out against a one-character postcode.

**None of these was found by a rendered walk**, which is why part three is not
folded into part two: they are defects of state and of copy that only reading
the path end to end exposes, and part two's method would not have reached them.

## Also recorded

Four things this reading settled or found, none of which is a row here.

**The eager PaymentIntent is an accepted property, not a defect.** A
certificate-only cart's total is final as soon as its payment collection
exists, so the session — and therefore a Stripe PaymentIntent — is created when
the checkout page mounts. Every visit to checkout that is not carried through
leaves one `requires_payment_method` intent behind. Nothing is charged, no fee
is incurred, and Medusa cancels superseded ones. Stripe's deferred-intent
Payment Element would remove them, and would dissolve finding 17's whole class
with them — no session exists to be cancelled by a change of total — but it
makes `elements.submit()` mandatory and puts the displayed amount into a new
drift relationship with Medusa's own figure. **Not worth a row on its own.**
Revisit only if H1 to H3 rework `handleSubmit` anyway, where it would simplify
rather than add. The sentence belongs in `checkout-rules.ts` beside finding 17,
so the next reader does not rediscover it as a bug — which is how it was found
this time.

**LD-04 promised a Medusa fulfilment and did not build one.**
`ld-04-merch.md:558-560` says the parcel becomes "a real Medusa fulfilment
rather than a side effect"; `:159` and `:1003` promise the same thing in their
own words ("the real Medusa product, order and fulfilment model", "mapped onto
the Medusa fulfilment"). What shipped writes
`printful_submission` and sends mail; the provider's `createFulfillment` is a
stub nothing invokes, the `fulfillment` and `order_fulfillment` tables are
empty, and every merch order shows unfulfilled in Admin for ever — with the
tracking number reachable only in the shop's own table. No decision record
reverses the plan, so a tracked document is currently false. **It is operator
visibility, not user experience**, so it belongs to whoever reopens LD-04; it
is named here only so that it is not lost a third time.

**`order.status` never leaves `pending`.** Medusa defaults it at creation and
only an explicit `completeOrder` moves it; nothing in `backend/src` calls that,
and no fulfilment or delivery flow does either. Live order #1 has read
`pending` since 2026-09-19 with its parcel shipped and collected. That is
Medusa's own design and not a defect — but an operator reading Admin cannot
tell a live order from a stalled one, which is the same carry-forward as above.

**Order #1's recipient was sent their tracking on 2026-09-21**, on the
operator's instruction, as a second message to a recipient. LD-03's constraint
7 says the recipient's address "is used to send one message and is then only
order data. No list, no second send, no re-send, no reminder." This was a
knowing exception: a real parcel was addressed to somebody who had been told in
writing that nothing else was coming, and who therefore had no reason to expect
or collect it. The message carried the tracking link and the correction, and no
§ 54(1) information, no withdrawal form and no statement about who bears risk
in transit — constraint 5 holds even in an exception to constraint 7. **F2 is
what stops this recurring**, and this is recorded for the same reason
constraint 4's exception is: a constraint quietly broken once stops being a
constraint.
