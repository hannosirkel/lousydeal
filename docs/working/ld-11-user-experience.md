# LD-11 — User experience

Perfect the experience of lousydeal.com: repair the flow defects the first live
order proved, repair the pay path a reading of it proved, then walk every
remaining flow before a customer finds the next one.

The contract is [`fresh-build.md`](./fresh-build.md). Part one repairs the seam
between [LD-03](./ld-03-gifting.md) (gifting, complete 2026-09-08) and
[LD-04](./ld-04-merch.md) (merch, complete 2026-09-10). Neither slice is wrong
on its own: LD-03 built a gift message for an order that could only ever be one
certificate, and LD-04 made an order able to carry a parcel two days later
without anything revisiting what that message says.

**Three parts, and they are different kinds of work.** Part one is six rows,
each naming a defect live order #1 demonstrated on 2026-09-19 — sized because
the defect is already known. Part two is six audit rows, each walking one flow
and *producing* findings rather than consuming them; each is sized by the flow
it walks and its output is a list of fix rows for the operator to choose from. A
part-two row that finds nothing is a passing row, not a wasted one. Part three
is four rows naming defects a reading of the pay path proved on 2026-09-21,
sized like part one's because they are equally known.

**Part two exists because Gate E has a hole.** `status.md` records the rendered
UI review as "passed for LD-02 through LD-06". LD-08's launch polish, LD-09's
visual identity and LD-10's storefront work have never had one. The site opened
to the public on 2026-09-13 with three slices unreviewed at the rendered level,
and both of order #1's customer-facing defects were of a kind a rendered walk
finds.

**Part one is evidence, part two is method, and part three is evidence of a
second kind.** No row in part one or part three is a speculative usability
opinion; no row in part two pretends to know its answer before the walk.
Keeping them apart is what stops the second kind quietly becoming
redecoration.

**Part three exists because part one and part two both stop looking at the same
place.** F4, F5 and G3 are all about what checkout *asks* — which fields, in
which order, under which notice. Every defect in part three is about what
happens at or after the card is charged, which no row here reached and no test
covers.

## Where the evidence is

**Every row below is built on [`ld-11-user-experience/findings.md`](./ld-11-user-experience/findings.md)**:
what live order #1 measured on 2026-09-19, the constraint that was reversed and
then restored the same day, what reading the pay path measured on 2026-09-21,
and four things recorded there rather than made rows here. A row names its
finding; the finding is written down once.

## Global constraints

LD-03's and LD-04's, carried forward. What this slice adds:

1. **Never commit a secret.** This slice introduces none.
2. **No customer identity in this repository.** This document is public. The
   order above is named by its figures and its date, never by the recipient's
   name, address, email or certificate slug.
3. **One pull request closes one row**, 800 lines and 10 files, operator
   override by name.
4. **No message may assert the absence of something the order contains.** The
   general form of live order #1's defect 2, and the rule that should have
   prevented it.
5. **A figure in a message names what it is the total of.** The general form of
   live order #1's defect 1.

## Rows

### Part one — what order #1 proved

| Row | What it does |
| --- | --- |
| F1 | Gift message states the certificate's amount, not the order's |
| F2 | Gift message stops denying a parcel that exists |
| F3 | Gift tests cover an order carrying merch |
| F4 | Checkout separates the public pair from the private four |
| F5 | The gift block says where a parcel goes |
| F6 | Settle constraint 4, and give the operator an inscription route |

### Part two — the flows nobody has walked

| Row | What it walks |
| --- | --- |
| G1 | Home, deal and goods — the browse flow |
| G2 | Cart, and whether a discount code is comprehensible |
| G3 | Checkout, end to end, as one document |
| G4 | The certificate and its share surfaces |
| G5 | Baldrick's reach and his dead ends |
| G6 | 390px across every route |

### Part three — what happens after the card is charged

| Row | What it does |
| --- | --- |
| H1 | Checkout ends somewhere, and the copy above it stops promising otherwise |
| H2 | A paid cart never renders the payment form again |
| H3 | A failure on the pay path speaks in our words, not Medusa's |
| H4 | Postage is not quoted before the buyer has said where they are |

Every part-two row is executed the same way, and the method is the row's
contract rather than a suggestion:

1. Walk the flow on the live site as a first-time visitor, at 390px and at
   desktop width. 390px is this repository's width: `GIFT_PREVIEW_EMPTY`'s
   defect and the bearer row's blank-leader defect were both found there and
   nowhere else.
2. Record what a visitor **cannot work out**, not what could be prettier. The
   test is comprehension, not taste.
3. Write each finding as a fix row with its evidence attached. Fix nothing in
   the audit row itself — an audit that fixes as it goes produces a diff nobody
   can review against a finding nobody wrote down.
4. A row that finds nothing says so and closes.

### F1 — The gift message states the certificate's amount

`sendGift` takes `total`, which its caller computed from `order.total`. It
should take the certificate's own amount — `deal.amount_paid`, formatted by the
same `formatMoney` — so the figure in the email is the figure on the document
it links to.

The buyer's § 55 confirmation is unaffected and must stay unaffected: the buyer
paid the order total, is owed it itemised, and `buildOrderConfirmation` already
prints it correctly with merch and surcharge broken out.

Delete the comment claiming both messages should print one number, and replace
it with the reason they must not.

**Done when** a gift order carrying merch sends a message quoting the
certificate's amount, and `order-placed-gift.test.ts` proves the two differ.

### F2 — The gift message stops denying a parcel that exists

`GIFT_WHAT`'s "there is nothing else coming" is true for a certificate-only
gift and false for a gift with a parcel. Two candidate shapes, and the row
decides between them with the copy in front of it:

- the sentence becomes conditional on the order carrying merch, and a gift with
  a parcel gains a short section naming what is on its way and to which
  country — never the full address, which the recipient already knows and which
  this repository must not print; or
- the sentence is narrowed to the certificate — "the certificate is the whole of
  what you need to do anything about" — so it stays true either way.

The second is cheaper and weaker. The first is what a person receiving a hat
would want. **The row is required to render both at 390px before choosing**,
which is how `GIFT_PREVIEW_EMPTY`'s defect was found and the only way this kind
is ever found.

**Done when** no gift message asserts the absence of something the order
contains, and a test drives a gift order with merch and asserts it.

### F3 — Gift tests cover an order carrying merch

`order-placed-gift.test.ts` builds every gift order as a single certificate
line, with `total: new BigNumber(25)` against one item of `2500`. Order total
and certificate amount are identical in every case, so F1's and F2's defects
were both invisible to the suite that was supposed to cover them.

Add the missing shape: a gift order with a certificate, a merch line, a
surcharge and postage, whose order total differs from its certificate amount.
This row is the reason F1 and F2 stay fixed.

**Done when** the fixture exists and removing F1's change fails a test.

### F4 — Checkout separates the public pair from the private four

`INSCRIPTION_NOTICE` and `GIFT_NOTICE` both already say which fields are public
and which are not. A buyer who had read both still put the recipient's name in
the wrong one, which means the copy is right and the *structure* is not: the
two groups look alike, sit one above the other, and the gift block's
`Their name (optional)` reads like the more specific of two name fields rather
than the private one.

This row does not add more words. Candidate moves, for the row to choose with
a rendering in front of it:

- label the groups rather than the fields, so the certificate pair sits under a
  heading naming the document and the gift four under one naming the email;
- show the bearer preview's fallback as what it is — the preview already reads
  `The bearer` before anything is typed, and a buyer who has just typed a name
  into the gift block sees it unchanged and has no reason to connect the two;
- reorder, so the gift block's name field is not adjacent to the certificate's.

**Done when** the two groups are distinguishable without reading either notice,
verified by rendering at 390px, and no existing copy assertion is weakened.

### F5 — The gift block says where a parcel goes

The gift block collects an email address and no postal address; the shipping
address is a separate field belonging to the merch upsell. On order #1 the
buyer entered the *recipient's* postal address there, which was the right
thing to do and which nothing on the page told them to do.

A buyer sending a gift with a parcel has to work out unaided that the shipping
address is where the hat goes and that it is not derived from the gift block.
Say it, once, where the shipping address is asked for on a cart that is a gift.

**Done when** a gift cart carrying a parcel states whose address is wanted, and
a certificate-only gift cart is unchanged.

### F6 — Settle constraint 4, and give the operator an inscription route

Two things this slice must not leave open. The first is answered; the row
records it rather than asking it again.

**Constraint 4 stands as written**, settled by the operator on 2026-09-19. The
row writes that into LD-03's constraint 4 and `brand.md` together, so the two
documents cannot disagree, and notes deal #1 beside it as a single operator
exception on the operator's own order — named, dated, and explicitly not a
precedent. Nothing in the product may write a gift field to a public one.

**How does an operator edit an issued inscription?** §5 promises it; nothing
implements it. The repair on 2026-09-19 was raw SQL against production, which
is not a route, leaves no record of who changed what, and cannot be reviewed.
The row builds the smallest thing that is one — most likely a
`backend/src/scripts/` entry taking a serial and the two fields, run through
`medusa exec`, writing through the deal module rather than the table.

**Done when** constraint 4 reads the same in both documents, and an inscription
can be changed without a person writing SQL.

### G1 — Home, deal and goods: the browse flow

Does a first-time visitor understand what is for sale before they are asked to
pay for it?

**It starts with a known symptom.** `CART_NEEDS_CERTIFICATE_NOTICE` exists
because a cart can hold printed goods and no certificate — the merch upsell is
reachable from the wrong end, and the shop's answer today is a notice at the
cart telling the visitor they started backwards. A notice repairing a browse
path is evidence the browse path leaks.

Walk: home → a deal → goods → cart, and goods → cart without a deal.

**Done when** the audit records whether a visitor can reach a merch-only cart
without intending to, and what the browse flow would have to do so they cannot.

### G2 — Cart, and whether a discount code is comprehensible

`BALDRICK20` raises the price. That is the entire product and it is not up for
review — but whether a visitor *understands it before applying it* is exactly
what this row asks.

Order #1 is the evidence: the recipient had to be told afterwards, in writing,
that the discount had added a dollar. The buyer knew, being the operator. No
other buyer will be.

Also walk `CART_SURCHARGE_NOTICE`'s state, which the copy itself admits is
reachable "because the public line-item route can change the line's quantity" —
a state whose repair instruction is three sentences long.

**Done when** the audit records what the cart tells a visitor about a code
before it is applied, and whether the surcharge state can be reached by
ordinary use rather than by hand.

### G3 — Checkout, end to end, as one document

F4 repairs the two name fields. This row walks everything around them:
the email hint, the country select, the address block that appears only with a
parcel, the consent statement, the price notice, the gift disclosure, and the
Payment Element.

**It is the one route on this site that requires scripting**, which makes it
the one route where a failure has no fallback. Walk it as a document, in order,
and record where the sequence asks for something the visitor cannot yet answer.

**Done when** the audit records the order in which checkout asks for things and
whether that order matches what a buyer can know at each step.

### G4 — The certificate and its share surfaces

The certificate, its PDF, its OpenGraph card and `ShareRow`.

**The known question is whether an owner understands the page is public.** The
operator did not immediately connect `Name on the certificate` with the `BEARER`
row on their own product, which is the strongest possible evidence that a buyer
will not either. §5 makes the slug unenumerable and the page `noindex`, so the
page is *unlisted* rather than *private*, and nothing on it says which.

**Done when** the audit records what the certificate page tells its owner about
who can see it, and whether the share row's notice covers the page itself or
only the three links.

### G5 — Baldrick's reach and his dead ends

Baldrick is deliberately lazy and that is not a defect to repair — `brand.md`
specifies it and four guards enforce it.

**The UX question is different: can a visitor with a real question get out of
him?** He may not summarise a legal document, state a figure, or claim to pass
anything on. So every real question must terminate somewhere real — the
Imprint, *Refunds and Withdrawal*, or the trader's address — rather than in
another response pool. `baldrick-reach.test.ts` asserts reachability; this row
asks whether a person experiences it as reach or as a loop.

**Done when** the audit records, for each intent, where a visitor lands and
whether that destination answers them.

### G6 — 390px across every route

Not a flow but a sweep, and last on purpose: it re-walks whatever G1 through G5
changed.

Every route at 390px: home, deal, goods, cart, checkout, certificate, the legal
set, `not-found`, and the empty and error states of each. This repository has
found two rendered defects this way that every passing assertion missed, which
is the argument for doing it deliberately rather than incidentally.

**Done when** no route scrolls horizontally, no control is unreachable, and no
document's leader, rule or ledger breaks at that width.

### H1 — Checkout ends somewhere, and the copy above it stops promising otherwise

Findings 1 and 2 of the pay-path reading, which are one row because they are
one defect: the end state
says almost nothing, and the § 54(1) line above the pay control promises what it
cannot deliver.

Two ways to settle it, and the row chooses with a rendering in front of it:

- make the promise true — have completion return the deal's slug, so the end
  state shows the certificate the sentence already claims is shown; or
- change the sentence to what the product does, and have the end state name
  where the confirmation went and what it carries.

The first is the better product and the larger change; the second is honest
immediately. Either way a buyer who has just paid and holds no certificate must
be told a mail is coming before they begin to worry.

No test asserts the current string, which is part of how it survived.

**Done when** checkout's end state names where the confirmation went and what it
carries, no pre-contract line claims the certificate is shown on payment unless
it is, and a test holds both.

### H2 — A paid cart never renders the payment form again

Finding 3 of the pay-path reading. `getCheckoutCart` never reads
`completed_at`, although
`store-cart.ts` and `cart-actions.ts` both handle it for the cart page: the gate
is missing in exactly one place, and it is the place where money has changed
hands.

Three ways back onto a paid checkout — a reload, the back-button, and Stripe's
own return to `/checkout`. `automaticPaymentMethods: true` lets the dashboard
decide which redirecting methods exist, so only a plain card avoids the third.

**On a redirect the client never completes the cart at all**, so the order
exists only because Medusa's webhook made it, and `?redirect_status=succeeded`
is read by nothing. That is the half with no fallback.

**Done when** a cart with `completed_at` set cannot render the payment form, a
return from a redirect lands on H1's end state, and neither path can reach
`paymentIntents.cancel` on a settled intent.

### H3 — A failure on the pay path speaks in our words, not Medusa's

Finding 4 of the pay-path reading. `thrown.message` goes straight into the
rendered error, so a buyer
can be shown `Store API proxy returned 500 for /store/payment-collections/…` or
`Medusa did not place an order for cart cart_…`.

**The position that matters is after `confirmPayment` has succeeded**, because
`capture: true` means the money is already taken. Medusa refunds failures inside
its own workflow, so the dangerous case is narrow — a lost response after the
order exists — but that is precisely the case where the buyer is told nothing
was placed and something was.

The repository already knows the answer's shape: the quote effect hides Medusa's
and Printful's wording behind `SHIPPING_UNAVAILABLE_NOTICE`, whose last clause is
"Nothing has been charged." What is missing is its counterpart for the case
where something may have been, and that notice must not invite a retry.

**Done when** no Medusa, proxy or Stripe developer string can reach a buyer from
the pay path, and the charged-but-unconfirmed case has copy of its own that
tells the buyer their confirmation will arrive rather than asking them to press
again.

### H4 — Postage is not quoted before the buyer has said where they are

`countryCode` is seeded from `countries[0]?.iso_2` against a list sorted by
alpha-2, so the default is whichever country sorts first. The control that sets
it then sits *below* the address fieldset it governs, and `addressComplete`
accepts any non-blank string per field.

So a parcel cart quotes against the wrong country before the buyer reaches that
control, attaches a shipping method at that postage and mints a PaymentIntent
against that total — then the real country arrives, Medusa cancels it, and a
fresh one is minted. That is Gate D's finding 17 again, once per parcel order,
as designed
behaviour rather than as a bug.

The same effect has no debounce, so the first quote goes out against a
one-character postcode.

**Done when** the country is asked before the address it governs, no postage is
quoted until the buyer has said where they are, and a parcel order mints one
PaymentIntent for one settled total.

## Open questions for the operator

1. **Should the buyer be told what the recipient's message will say?** The
   buyer never sees the gift email. They cannot know it will quote a figure, or
   that it asserts anything about parcels. A preview is the obvious fix and is
   out of scope here; recorded so it is not lost.
2. **Does the surcharge need explaining to the recipient?** A coded certificate
   is worth more than an uncoded one, which reads as an error to anybody who
   does not know `BALDRICK20` raises the price. The certificate states the
   amount and not the reason.

## What this slice does not do

- It does not change the certificate's design, the surcharge, or what a
  discount code does. LD-06 settled those and they work.
- It does not add a moderation policy for inscriptions. §5 draws that line and
  this slice keeps it: a mechanical filter, not a judgement.
- It does not give Baldrick an LLM backend. `AGENTS.md` forbids it and nothing
  here needs it. G5 asks where he sends people, never what he is.
- **It does not change how mail leaves the application.** The notification
  provider supports one recipient and no CC. That is a real gap and it is not
  user experience; the operator settled it as out of scope on 2026-09-19.
- It does not redecorate. Gate C passed and LD-09 owns the visual identity.
  Part two's test is whether a visitor can work something out, never whether a
  reviewer would have chosen differently.
