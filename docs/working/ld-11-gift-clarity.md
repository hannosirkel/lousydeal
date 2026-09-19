# LD-11 — Gift and upsell flow clarity

Make a gift order describe itself truthfully to both people in it, and make the
checkout's two name fields impossible to confuse.

The contract is [`fresh-build.md`](./fresh-build.md); this slice repairs the
seam between [LD-03](./ld-03-gifting.md) (gifting, complete 2026-09-08) and
[LD-04](./ld-04-merch.md) (merch, complete 2026-09-10). Neither slice is wrong
on its own. LD-03 built a gift message for an order that could only ever be one
certificate; LD-04 made an order able to carry a parcel two days later and
nothing revisited what the gift message says.

**This slice is evidence-driven and the evidence is the first live order.** It
is not a speculative usability pass. Every row below names a defect that order
demonstrated on 2026-09-19.

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

| Row | What it does | Repository |
| --- | --- | --- |
| F1 | Gift message states the certificate's amount, not the order's | `lousydeal` |
| F2 | Gift message stops denying a parcel that exists | `lousydeal` |
| F3 | Gift tests cover an order carrying merch | `lousydeal` |
| F4 | Checkout separates the public pair from the private four | `lousydeal` |
| F5 | The gift block says where a parcel goes | `lousydeal` |
| F6 | Settle constraint 4, and give the operator an inscription route | `lousydeal` |

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
  here needs it.
