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
is four rows carrying the five defects a reading of the pay path proved on
2026-09-21, sized like part one's because they are equally known.

**Part two exists because Gate E has a hole, and the hole is narrower than it
first looked.** `status.md`'s gate row read "passed for LD-02 through LD-06",
which is why this plan was first written as though LD-08, LD-09 and LD-10 had
never been reviewed at the rendered level. That was wrong twice over, and
stating what *has* been walked is what keeps part two honest:

| Slice | Rendered record | Where |
| --- | --- | --- |
| LD-03 | G9, "a real gift, to two addresses", a real Stripe test-mode payment | test |
| LD-06 | D10, 2026-09-11, 390px and desktop: a code, a shirt, attached postage, and a paid order capturing `$44.47`. It failed twice before passing | test |
| LD-09 | V15, 2026-09-05, desktop and 390px, scripting disabled | built server |
| LD-08 | L3, 2026-09-12, 44 route cases, scripting on and off, at 360×800 and 1440×900 | `STORE_OPEN=false` |
| LD-08 | F2, 2026-09-13 — and this one reached the live store **open**; see below | live, open |
| LD-10 | desktop and mobile browser checks: favicon, social links, cart and merch control spacing, Stripe disclosure, card frames. "No payment was submitted during this check" | live |

**F2 is the one that matters, and it is quoted rather than summarised, because
this paragraph has been written wrongly twice before.** `ld-08-launch-polish.md`
records, after the operator authorised opening:

> An unauthenticated browser created a real empty live cart, added the standard
> deal, reached checkout, and loaded six Stripe Payment Element frames using
> only the live publishable key. The payment control was left disabled and no
> charge was submitted: a fabricated purchase is not launch evidence.

**So the live open store has been walked — once, with one certificate, as far
as the disabled pay control.** That is the whole of it. What no walk of any
kind has ever covered on the open store is a gift, a parcel, a discount code,
or anything at or after the moment the pay control is pressed. Every defect in
part one and part three is in that untouched region, which is why a customer
found them and F2 did not. Part two is sized to cover it.

**Part one is evidence, part two is method, and part three is evidence of a
second kind.** No row in part one or part three is a speculative usability
opinion; no row in part two pretends to know its answer before the walk.
Keeping them apart is what stops the second kind quietly becoming
redecoration.

**Part three exists because part one and part two both stop looking at the same
place.** F4, F5 and G3 are all about what checkout *asks* — which fields, in
which order, under which notice. Part three is about the machinery underneath
that: what the pay path does with an answer once it has one, and what it does
at and after the moment money moves. Three of its defects are at or after the
charge; H4's is the one that sets a total up wrongly before it. None was
reached by a row here and none is covered by a test.

## Where the evidence is

**Every row below is built on [`ld-11-user-experience/findings.md`](./ld-11-user-experience/findings.md)**:
what live order #1 measured on 2026-09-19 (four defects, three of which reached
a third party), the constraint that was reversed and then restored the same day,
what reading the pay path measured on 2026-09-21 (five defects), and four things
recorded there rather than made rows here. A row names its finding; the finding
is written down once.

| Row | Finding it consumes |
| --- | --- |
| F1 | order #1, defect 1 |
| F2 | order #1, defect 2 |
| F3 | none — it is the fixture F1 and F2 are verified with |
| F4 | order #1, defect 3 |
| F5 | order #1, the fifth observation — the unaided shipping address |
| F6 | order #1, defect 4, and the reversed constraint |
| G1–G6 | none — these *produce* findings |
| H1 | pay path, defects 1 and 2 |
| H2 | pay path, defect 3 |
| H3 | pay path, defect 4 |
| H4 | pay path, defect 5 |

**This table is the check that no row is unevidenced.** H4 was written against
a defect that had not been recorded; the row for it now names finding 5, which
was added to `findings.md` in the same change as this table.

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
   defect was found there and `checkout.ts` records it, and the bearer row's
   blank-leader defect is the other of the two this repository found by looking
   rather than by asserting.
2. Record what a visitor **cannot work out**, not what could be prettier. The
   test is comprehension, not taste.
3. Write each finding as a fix row with its evidence attached. Fix nothing in
   the audit row itself — an audit that fixes as it goes produces a diff nobody
   can review against a finding nobody wrote down.
4. A row that finds nothing says so and closes.
5. **Closing an audit row means its findings are recorded, never that its flow
   is now defect-free.** Every audit row closes the same way, G6 included.

**Part two therefore runs in four stages, and the plan states the order rather
than leaving it to be discovered:**

| Stage | What happens | Who |
| --- | --- | --- |
| 1 | G1–G6 walk their flows and append findings to `findings.md` | agent |
| 2 | The operator selects which findings become work | operator |
| 3 | Selected findings become numbered J-rows, appended to this plan and sized like part one's | agent |
| 4 | A final 390px sweep over whatever the J-rows changed | agent |

**G6 is stage 1 only, and closes once.** It is an audit like the other five.
The stage-4 sweep is *not* G6 run again: it is its own row, numbered with the
J-rows it follows, because one row closes with one pull request and a row that
closes twice is two rows. It is not written here because its scope is whatever
stage 2 selects — **if the operator selects no J-rows, stage 4 does not exist**,
and part two ends at stage 1 with its findings recorded.

That sweep, when it is written, closes the way every audit row closes: by
recording what it found. A defect it turns up becomes another J-row rather than
holding it open. An audit row that cannot close until the thing it audits is
perfect is not an audit row.

### F1 — The gift message states the certificate's amount

**Repository:** `lousydeal`.
**Files:** `backend/src/subscribers/order-placed.ts`,
`backend/tests/order-placed-gift.test.ts`.
**Runs after F3**, whose fixture is what makes this row's assertion possible.

`sendGift` takes `total`, which its caller computed from `order.total`. It
should take the certificate's own amount instead, so the figure in the email is
the figure on the document it links to. **The subscriber already holds that
figure**: `readCertificate` computes `amountPaid` from the certificate line's
own total plus any surcharge, and passes it into issuance. It is not read back
off the deal — `IssuedDeal` carries the gift fields and the slug, not
`amount_paid` — so the row passes the value the subscriber already has,
formatted by the same `formatMoney`.

The buyer's § 55 confirmation is unaffected and must stay unaffected: the buyer
paid the order total, is owed it itemised, and `buildOrderConfirmation` already
prints it correctly with merch and surcharge broken out.

Delete the comment claiming both messages should print one number, and replace
it with the reason they must not.

- [ ] Pass the certificate's own `amountPaid`, as `readCertificate` already
      computes it, to `sendGift` instead of the order total, and replace the
      comment claiming both messages print one
      number with the reason they must not. Verified by a test in
      `order-placed-gift.test.ts` driving F3's merch-bearing gift fixture and
      asserting the gift message quotes the certificate's amount while
      `buildOrderConfirmation` still quotes the order total — so the two figures
      are asserted to differ rather than merely asserted.

### F2 — The gift message stops denying a parcel that exists

**Repository:** `lousydeal`.
**Files:** `backend/src/content/gift.ts`,
`backend/src/notifications/gift-message.ts`,
`backend/src/subscribers/order-placed.ts`,
`backend/tests/order-placed-gift.test.ts`.
**Runs after F3.**

`GIFT_WHAT` is a static array spread unconditionally into the message, and
`GiftMessageInput` carries no merch or country field — so the first candidate
shape is not a copy change. It needs the input to learn what the order carries,
which is why the subscriber and the message builder are in this row's file list
and why this row is the larger of the two.

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

- [ ] Render both candidate shapes at 390px, choose between them, and change
      `GIFT_WHAT` so no gift message asserts the absence of something the order
      contains. Verified by a test in `order-placed-gift.test.ts` driving F3's
      merch-bearing fixture and asserting the rendered message contains no
      absence claim, alongside the existing certificate-only case asserting the
      copy is unchanged there.

### F3 — The gift test suite gains an order that carries merch

**Repository:** `lousydeal`.
**Files:** `backend/tests/order-placed-gift.test.ts`.
**Runs before F1 and F2**, and closes on its own.

`order-placed-gift.test.ts` builds every gift order as a single certificate
line, with `total: new BigNumber(25)` against one item of `2500`. Order total
and certificate amount are identical in every case, so F1's and F2's defects
were both invisible to the suite that was supposed to cover them.

**This row builds the fixture and nothing else.** It was first written to also
own the regression proof — "removing F1's change fails a test" — which it cannot
hold: before F1 there is no change to remove, and after F1 the proof is F1's own
assertion. That criterion now lives in F1 and F2, where the behaviour does, and
this row is the shared fixture they are both written against. Sizing it as its
own row is what stops F1 and F2 each inventing a different one.

The fixture is a gift order with a certificate, a merch line, a surcharge and
postage, whose order total differs from its certificate amount.

- [ ] Add a merch-bearing gift-order fixture to `order-placed-gift.test.ts`
      whose `order.total` and `deal.amount_paid` differ, and assert against it
      the behaviour that exists *today* — the gift message quoting the order
      total and denying the parcel. Verified by `npm run test:unit` in
      `backend/` passing with the new case green, which pins the defects F1 and
      F2 then invert rather than pretending they are already fixed.

### F4 — Checkout separates the public pair from the private four

**Repository:** `lousydeal`.
**Files:** `storefront/src/app/checkout/PaymentForm.tsx`,
`storefront/src/content/checkout.ts`,
`storefront/tests/checkout-gift.test.ts`,
`storefront/tests/checkout-inscription.test.ts`.

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

- [ ] Choose among the candidate moves with a 390px rendering in front of you
      and restructure the two field groups so they are distinguishable without
      reading either notice. Verified by a test asserting each group renders
      under its own labelled heading and that the bearer preview's `The bearer`
      fallback is rendered as a fallback rather than as a value, with every
      existing copy assertion in `checkout-order-summary.test.ts` still passing
      unweakened, plus a 390px screenshot attached to the row.

### F5 — The gift block says where a parcel goes

**Repository:** `lousydeal`.
**Files:** `storefront/src/content/checkout.ts`,
`storefront/src/app/checkout/PaymentForm.tsx`,
`storefront/tests/checkout-gift.test.ts`,
`storefront/tests/checkout-address.test.ts`.

The gift block collects an email address and no postal address; the shipping
address is a separate field belonging to the merch upsell. On order #1 the
buyer entered the *recipient's* postal address there, which was the right
thing to do and which nothing on the page told them to do.

A buyer sending a gift with a parcel has to work out unaided that the shipping
address is where the hat goes and that it is not derived from the gift block.
Say it, once, where the shipping address is asked for on a cart that is a gift.

- [ ] Add one sentence at the shipping address, shown only on a cart that is
      both a gift and carrying a parcel, saying whose address is wanted.
      Verified by a test asserting the sentence renders for a gift-plus-parcel
      cart and is absent from both a certificate-only gift cart and a
      non-gift parcel cart.

### F6 — Settle constraint 4, and give the operator an inscription route

**Repository:** `lousydeal`.
**Files:** `docs/working/ld-03-gifting.md`, `docs/current/brand.md`,
`backend/src/scripts/edit-inscription.ts`,
`backend/tests/edit-inscription.test.ts`,
`backend/tests/constraint-4-agreement.test.ts`.

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

- [ ] Write constraint 4's settled wording into LD-03 and `brand.md` together
      with deal #1 recorded beside it as a named, dated operator exception, and
      add a `backend/src/scripts/` entry run through `medusa exec` that takes a
      serial and the two fields and writes through the deal module. Verified by
      a test asserting the script updates `display_name` and `dedication`
      through the module and refuses a serial that does not exist, and by
      `constraint-4-agreement.test.ts` reading both documents and asserting the
      constraint-4 block is byte-identical in each — a new test, because no
      existing one parses markdown, and the cheapest thing that stops the two
      documents drifting apart again.

### G1 — Home, deal and goods: the browse flow

**Repository:** `lousydeal`.
**Files:** `docs/working/ld-11-user-experience/findings.md`,
`docs/working/ld-11-user-experience.md`. No source file changes in this row.

Does a first-time visitor understand what is for sale before they are asked to
pay for it?

**It starts with a known symptom.** `CART_NEEDS_CERTIFICATE_NOTICE` exists
because a cart can hold printed goods and no certificate — the merch upsell is
reachable from the wrong end, and the shop's answer today is a notice at the
cart telling the visitor they started backwards. A notice repairing a browse
path is evidence the browse path leaks.

Walk: home → a deal → goods → cart, and goods → cart without a deal.

- [ ] Walk home → a deal → goods → cart, and goods → cart without a deal, at
      390px and desktop width. Verified by a `## G1` section appended to
      `findings.md` recording whether a visitor can reach a merch-only cart
      without intending to and what the browse flow would have to do so they
      cannot, with a screenshot per step and one fix row per finding — or the
      sentence that it found nothing.

### G2 — Cart, and whether a discount code is comprehensible

**Repository:** `lousydeal`.
**Files:** `docs/working/ld-11-user-experience/findings.md`,
`docs/working/ld-11-user-experience.md`. No source file changes in this row.

`BALDRICK20` raises the price. That is the entire product and it is not up for
review — but whether a visitor *understands it before applying it* is exactly
what this row asks.

Order #1 is the evidence: the recipient had to be told afterwards, in writing,
that the discount had added a dollar. The buyer knew, being the operator. No
other buyer will be.

Also walk `CART_SURCHARGE_NOTICE`'s state, which the comment above that notice
in `content/checkout.ts` says is reachable "because the public line-item route
can change the line's quantity" — a state whose repair instruction is three
sentences long. The notice itself does not say that; the walk is what
establishes whether a visitor can reach the state without hand-editing.

- [ ] Walk the cart with and without `BALDRICK20`, and attempt
      `CART_SURCHARGE_NOTICE`'s state by ordinary use, at 390px and desktop
      width. Verified by a `## G2` section appended to `findings.md` recording
      what the cart tells a visitor about a code before it is applied and
      whether the surcharge state is reachable without hand-editing a quantity,
      with one fix row per finding — or the sentence that it found nothing.

### G3 — Checkout, end to end, as one document

**Repository:** `lousydeal`.
**Files:** `docs/working/ld-11-user-experience/findings.md`,
`docs/working/ld-11-user-experience.md`. No source file changes in this row.
**Runs after F4**, so it walks the repaired field groups rather than the ones
F4 is already known to be changing.

F4 repairs the two name fields. This row walks everything around them:
the email hint, the country select, the address block that appears only with a
parcel, the consent statement, the price notice, the gift disclosure, and the
Payment Element.

**It is the one route on this site that requires scripting**, which makes it
the one route where a failure has no fallback. Walk it as a document, in order,
and record where the sequence asks for something the visitor cannot yet answer.

- [ ] Walk checkout as one document, in order, at 390px and desktop width, for
      a certificate-only cart, a gift cart and a gift-plus-parcel cart.
      Verified by a `## G3` section appended to `findings.md` recording the
      order in which checkout asks for things and each point where the sequence
      asks for something the visitor cannot yet answer, with one fix row per
      finding — or the sentence that it found nothing.

### G4 — The certificate and its share surfaces

**Repository:** `lousydeal`.
**Files:** `docs/working/ld-11-user-experience/findings.md`,
`docs/working/ld-11-user-experience.md`. No source file changes in this row.

The certificate, its PDF, its OpenGraph card and `ShareRow`.

**The known question is whether an owner understands the page is public.** The
operator did not immediately connect `Name on the certificate` with the `BEARER`
row on their own product, which is the strongest possible evidence that a buyer
will not either. §5 makes the slug unenumerable and LD-08's L3 made the page
`noindex` — two decisions from two slices — so the page is *unlisted* rather
than *private*, and nothing on it says which.

- [ ] Walk a real certificate, its PDF, its OpenGraph card and `ShareRow` at
      390px and desktop width, as an owner seeing it for the first time.
      Verified by a `## G4` section appended to `findings.md` recording what the
      page tells its owner about who can see it and whether the share row's
      notice covers the page itself or only the three links, with one fix row
      per finding — or the sentence that it found nothing.

### G5 — Baldrick's reach and his dead ends

**Repository:** `lousydeal`.
**Files:** `docs/working/ld-11-user-experience/findings.md`,
`docs/working/ld-11-user-experience.md`. No source file changes in this row.

Baldrick is deliberately lazy and that is not a defect to repair — `brand.md`
specifies it and four guards enforce it.

**The UX question is different: can a visitor with a real question get out of
him?** He may not summarise a legal document, state a figure, or claim to pass
anything on. So every real question must terminate somewhere real — the
Imprint, *Refunds and Withdrawal*, or the trader's address — rather than in
another response pool. **No test asks this.** `baldrick-reach.test.ts` asserts
which pages mount the widget and, more to its point, which must never mount it;
`baldrick-copy.test.ts` guards what he may say. Neither follows an intent to
where it lands, which is what this row does.

- [ ] Hold a real conversation per intent in `BALDRICK_INTENTS` from the
      keyboard, at 390px and desktop width, following each to where it
      terminates. Verified by a `## G5` section appended to `findings.md`
      recording, for each intent, where a visitor lands and whether that
      destination answers them — the question `baldrick-reach.test.ts` cannot
      ask, since it asserts reachability and not comprehension — with one fix
      row per finding, or the sentence that it found nothing.

### G6 — 390px across every route

**Repository:** `lousydeal`.
**Files:** `docs/working/ld-11-user-experience/findings.md`,
`docs/working/ld-11-user-experience.md`. No source file changes in this row.
**Stage 1, with G1–G5. It closes once.**

Not a flow but a sweep. **It was first written as re-walking "whatever G1
through G5 changed", which the audit method forbids** — those rows fix nothing,
so there is nothing of theirs to re-walk. The sweep over what the J-rows change
is a separate stage-4 row, written once stage 2 has decided there are any.

Every route at 390px: home, deal, goods, cart, checkout, certificate, the legal
set, `not-found`, and the empty and error states of each. This repository has
found two rendered defects this way that every passing assertion missed, which
is the argument for doing it deliberately rather than incidentally.

- [ ] Sweep every route at 390px — home, deal, goods, cart, checkout,
      certificate, the legal set, `not-found`, and the empty and error states of
      each. Verified by a `## G6` section appended to `findings.md` recording,
      per route, whether it scrolls horizontally, whether any control is
      unreachable, and whether any document's leader, rule or ledger breaks at
      that width, with a screenshot per route and one fix row per finding — or
      the sentence that it found nothing. **A defect found here becomes a
      J-row; it does not hold this row open.** A J-row may then want this sweep
      repeated after it merges, which is stage 4 and is its own row.

### H1 — Checkout ends somewhere, and the copy above it stops promising otherwise

**Repository:** `lousydeal`.
**Files:** `storefront/src/app/checkout/PaymentForm.tsx`,
`storefront/src/content/checkout.ts`,
`storefront/src/content/legal/terms.ts`,
`storefront/tests/checkout-order-summary.test.ts`,
`storefront/tests/checkout-session.test.ts`.

**The two options have different file lists, and the second option's is the one
above.** The first option — making the promise true — is not a storefront
change at all: `completeCheckoutCart` lives in
`storefront/src/lib/store-payment.ts`, and it has nothing to return, because
issuance is asynchronous in `order-placed.ts` and
`backend/src/api/store/deals/[slug]` is keyed by slug. Option one therefore
needs a backend route keyed by order, or a completion response carrying the
slug, plus its test — `backend/src/api/store/deals/`,
`backend/src/subscribers/order-placed.ts` and a backend test join the list, and
the row is then plausibly two pull requests rather than one. **If the row
chooses option one it is decomposed first**, per the planning standard. This is
what "the larger change" means below, stated as files rather than as a feeling.

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

**A test does assert the current string, and the row has to reckon with it
rather than discover it.** `storefront/tests/checkout-order-summary.test.ts`
matches `/shown to you as soon as you have paid/i` against the merch variant.
The same sentence appears three times: `CERTIFICATE_ALONE` and the
`hasPostedGoods` variant in `content/checkout.ts`, and once more in the
**Delivery** section of `content/legal/terms.ts` — the section the file's own
comment numbers §5, not the §4 that sentence refers to. All three move
together or none does.

**Which way the assertion goes depends on the option chosen**, and the row
states its choice before it writes the test:

- **make the promise true** — the three copies stand unchanged, the existing
  assertion stands unchanged, and the end state is what has to change;
- **make the sentence honest** — all three copies change together and the
  existing assertion is rewritten to the new wording. It is rewritten, never
  deleted: deleting it is how the sentence survived this long.

- [ ] Choose between the two options with a rendering in front of you, record
      the choice in the row, then change the end state and — under option two —
      all three copies of the § 54(1) line together. Verified by a test
      asserting the end state names where the confirmation went and what it
      carries; and by `checkout-order-summary.test.ts` asserting the chosen
      wording across the certificate-only variant, the merch variant and the
      Delivery section of `terms.ts`, so that no copy of the sentence can drift
      from the other two whichever option was taken.

### H2 — A paid cart never renders the payment form again

**Repository:** `lousydeal`.
**Files:** `storefront/src/lib/store-checkout.ts`,
`storefront/src/app/checkout/page.tsx`,
`storefront/src/app/checkout/PaymentForm.tsx`,
`storefront/tests/checkout-session.test.ts`,
`storefront/tests/store-checkout.test.ts`.
**Runs after H1**, whose end state is where a redirect return has to land.

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

- [ ] Make `getCheckoutCart` read `completed_at` — `store-cart.ts` declares the
      field and `cart-actions.ts` is the one place that reads it — and handle
      the redirect return so it lands on H1's end state rather than re-mounting
      the form. Verified by tests asserting that a cart with `completed_at` set
      renders the end state and not the payment form, that a return carrying
      `?redirect_status=succeeded` resolves to the same end state, and that
      neither path issues a payment-session request — the observable in the
      storefront for the `paymentIntents.cancel` that a new session would
      provoke on the backend.

### H3 — A failure on the pay path speaks in our words, not Medusa's

**Repository:** `lousydeal`.
**Files:** `storefront/src/app/checkout/PaymentForm.tsx`,
`storefront/src/content/checkout.ts`,
`storefront/tests/checkout-session.test.ts`.

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

- [ ] Stop `thrown.message` reaching the rendered error, and add a notice for
      the charged-but-unconfirmed case — modelled on
      `SHIPPING_UNAVAILABLE_NOTICE` but ending in the opposite direction, since
      something may have been charged. Verified by a test driving a throw at
      each position on the pay path and asserting the rendered text is one of
      our own notices in every case, that no Medusa, proxy or Stripe string
      appears, and that the post-`confirmPayment` failure renders the new
      notice with the pay control left disabled rather than re-enabled.

### H4 — Postage is not quoted before the buyer has said where they are

**Repository:** `lousydeal`.
**Files:** `storefront/src/app/checkout/PaymentForm.tsx`,
`storefront/src/lib/shipping-address.ts`,
`storefront/tests/checkout-address.test.ts`,
`storefront/tests/shipping-address.test.ts`.

Finding 5 of the pay-path reading, which was added to `findings.md` when this
row was found to be resting on evidence nobody had written down.

`countryCode` is seeded from `countries[0]?.iso_2` — the first row of whatever
order Medusa returns the region's countries in, which nothing in the storefront
sorts or chooses. The default is therefore a country the buyer never picked. The control that sets
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

- [ ] Move the country control above the address fieldset it governs, stop
      seeding `countryCode` to a country the buyer has not chosen, tighten
      `addressComplete` past accepting any non-blank string, and debounce the
      quote effect. Verified by a test asserting that no quote is requested
      until a country has been chosen and the address satisfies the tightened
      check, and that a parcel order from first keystroke to pay mints exactly
      one PaymentIntent — with the count asserted, so finding 17's class cannot
      return unnoticed.

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
