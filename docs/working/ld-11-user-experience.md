# LD-11 — User experience

Perfect the experience of lousydeal.com: repair the flow defects the first live
order proved, then walk every remaining flow before a customer finds the next
one.

The contract is [`fresh-build.md`](./fresh-build.md). Part one repairs the seam
between [LD-03](./ld-03-gifting.md) (gifting, complete 2026-09-08) and
[LD-04](./ld-04-merch.md) (merch, complete 2026-09-10). Neither slice is wrong
on its own: LD-03 built a gift message for an order that could only ever be one
certificate, and LD-04 made an order able to carry a parcel two days later
without anything revisiting what that message says.

**Two parts, and they are different kinds of work.** Part one is six rows, each
naming a defect live order #1 demonstrated on 2026-09-19 — sized because the
defect is already known. Part two is six audit rows, each walking one flow and
*producing* findings rather than consuming them; each is sized by the flow it
walks and its output is a list of fix rows for the operator to choose from. A
part-two row that finds nothing is a passing row, not a wasted one.

**Part two exists because Gate E has a hole.** `status.md` records the rendered
UI review as "passed for LD-02 through LD-06". LD-08's launch polish, LD-09's
visual identity and LD-10's storefront work have never had one. The site opened
to the public on 2026-09-13 with three slices unreviewed at the rendered level,
and both of order #1's customer-facing defects were of a kind a rendered walk
finds.

**Part one is evidence, part two is method.** No row in part one is a
speculative usability opinion; no row in part two pretends to know its answer
before the walk. Keeping the two apart is what stops the second kind quietly
becoming redecoration.

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
of them reached a third party.

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
   `The bearer` and carried no dedication. `brand.md` already names this as the
   failure its gift notice exists to prevent — the notice did not prevent it.
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

## Global constraints

LD-03's and LD-04's, carried forward. What this slice adds:

1. **Never commit a secret.** This slice introduces none.
2. **No customer identity in this repository.** This document is public. The
   order above is named by its figures and its date, never by the recipient's
   name, address, email or certificate slug.
3. **One pull request closes one row**, 800 lines and 10 files, operator
   override by name.
4. **No message may assert the absence of something the order contains.** The
   general form of defect 2, and the rule that should have prevented it.
5. **A figure in a message names what it is the total of.** The general form of
   defect 1.

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
