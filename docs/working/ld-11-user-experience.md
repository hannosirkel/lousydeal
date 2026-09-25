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
| H5 | A paid cart that is not yet completed completes rather than showing the form |

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
figure**: `certificateLine` computes `amountPaid` from the certificate line's
own total plus any surcharge, and passes it into issuance. It is not read back
off the deal — `IssuedDeal` carries the gift fields and the slug, not
`amount_paid` — so the row passes the value the subscriber already has,
formatted by the same `formatMoney`.

The buyer's § 55 confirmation is unaffected and must stay unaffected: the buyer
paid the order total, is owed it itemised, and `buildOrderConfirmation` already
prints it correctly with merch and surcharge broken out.

Delete the comment claiming both messages should print one number, and replace
it with the reason they must not.

- [x] Pass the certificate's own `amountPaid`, as `certificateLine` already
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

**Settled: the first shape**, chosen by the operator on 2026-09-22 with both
rendered. The clause is narrowed rather than deleted — a certificate-only gift
still says nothing else is coming, because there it is true and it is what
stops a reader waiting for a second email. The parcel section names the item
and the destination country and no more of the address than that.

- [x] Render both candidate shapes at 390px, choose between them, and change
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

- [x] Add a merch-bearing gift-order fixture to `order-placed-gift.test.ts`
      whose order total and certificate amount differ, and assert against it
      the behaviour that exists *today* — the gift message quoting the order
      total and denying the parcel. Verified by `npm run test:unit` in
      `backend/` passing with the new case green, which pins the defects F1 and
      F2 then invert rather than pretending they are already fixed.

### F4 — Checkout separates the public pair from the private four

**Repository:** `lousydeal`.
**Files:** `storefront/src/app/checkout/PaymentForm.tsx`,
`storefront/src/content/checkout.ts`,
`storefront/src/app/globals.css`,
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

**Settled on 2026-09-22, with both renders in front of the operator:** the
first two moves, and not the third. The 390px render
([before](./ld-11-user-experience/f4-checkout-390px-before.png),
[after](./ld-11-user-experience/f4-checkout-390px.png); `PayButton` rendered
through `renderToStaticMarkup` with `globals.css` inlined, screenshot in
Playwright 1.57.0's Chromium at 390×900 and DPR 2 — note that neither render
had `--font-mono` defined, so both size a fallback face rather than `LDMono`) showed the gift block's
`<summary>` was the only heading on the page — so the *private* four were the
labelled group and §5's *public* two were not, which is the wrong way round and
is the structure order #1's buyer read. The third move was already largely
true: the two name fields are separated by the dedication, the preview and the
disclosure summary, and reordering would cost the present order, which puts the
public pair before a disclosure a buyer may never open.

One thing the render decided that no assertion would have: a `<fieldset>` is
the right element, but its user-agent border and side padding overflow the
group horizontally at 320px, so it is drawn as one rule with its name on it.
That is a `.inscription` rule in `globals.css`, added to this row's file list
above. The page's other fieldset, `.address`, still draws as a user-agent box,
so a merch cart now shows two groups drawn differently; styling `fieldset`
once is recorded in `findings.md` rather than taken here.

**A measurement in this paragraph was wrong and is corrected.** It read that
`No name — “The bearer”` keeps the ledger row on one line where
`Nobody named — “The bearer”` wraps it, "measured, 56px against 32px". That
was measured without `--font-mono` defined, against a narrower fallback face.
In the repository's own `LDMono` the chosen string wraps at 320, 360, 375 and
390 and is single-line only at 412 and above. `No name` stands, for the one
reason that survives: it parallels `GIFT_PREVIEW_EMPTY`'s `No message`
directly below it. **The wrap is accepted** — the single-line row it replaces
said the wrong thing, and no shorter string can both fit at 360 and keep
`NO_INSCRIPTION`, which §5's disclosure needs.

- [x] Choose among the candidate moves with a 390px rendering in front of you
      and restructure the two field groups so they are distinguishable without
      reading either notice. Verified by a test asserting each group renders
      under its own labelled heading and that the bearer preview's `The bearer`
      fallback is rendered as a fallback rather than as a value, with every
      assertions that already guard this copy still passing unweakened —
      `checkout-gift.test.ts`'s "distinguishes these four from §5's two" and
      "previews what the recipient will actually read", and
      `checkout-inscription.test.ts`'s "say all three things §5 requires" —
      plus a 390px screenshot attached to the row.

### F5 — The gift block says where a parcel goes

**Repository:** `lousydeal`.
**Files:** `storefront/src/content/checkout.ts`,
`storefront/src/app/checkout/PaymentForm.tsx`,
`storefront/tests/checkout-address.test.ts`.

The gift block collects an email address and no postal address; the shipping
address is a separate field belonging to the merch upsell. On order #1 the
buyer entered the *recipient's* postal address there, which was the right
thing to do and which nothing on the page told them to do.

A buyer sending a gift with a parcel has to work out unaided that the shipping
address is where the hat goes and that it is not derived from the gift block.
Say it, once, where the shipping address is asked for on a cart that is a gift.

**The sentence is rendered by an exported `GiftAddressNote`, and that shape was
arrived at the hard way.** The storefront runs under `environment: "node"` with
no DOM, so the gift-open state cannot be reached by rendering `PayButton`. This
row's first draft answered that by putting the decision in a pure function and
rendering the constant beside it — which left the two unbound. Review proved
the suite passed when the branch rendered nothing at all, and passed when it
rendered a different notice entirely: a design adopted to avoid a vacuous
assertion produced a new one. The component renders the value the rule returns,
the four combinations are rendered directly, and both mutations now fail.

Two further things this row's record got wrong and this paragraph corrects. It
claimed the component's wiring had been wrong; it never was — a vacuous
assertion was misread as a wiring fault. And it counted "three" source-match
assertions shipped by this slice, which the history does not support: the three
earlier vacuous assertions were `toContain` checks standing in for
inequalities, in F3, F4 and this row, and none was a source match.

**`aria-live` is not added and that is a gap, not a decision.** The dedication
preview in the same file announces itself for exactly the reason this sentence
would want to: it appears when the disclosure above it opens, and a buyer who
completed the address first has it inserted out of view. Recorded for G3.

- [x] Add one sentence at the shipping address, shown only on a cart that is
      both a gift and carrying a parcel, saying whose address is wanted.
      Verified by a test asserting the sentence renders for a gift-plus-parcel
      cart and is absent from both a certificate-only gift cart and a
      non-gift parcel cart.

### F6 — Settle constraint 4, and give the operator an inscription route

**Repository:** `lousydeal`.
**Files:** `docs/working/ld-03-gifting.md`, `docs/current/brand.md`,
`backend/src/scripts/edit-inscription.ts`, `backend/package.json`,
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

**Three notes on what was built.** `brand.md` did not carry constraint 4 at
all, so the row added it there rather than reconciling two existing copies; it
sits in the gift-block section, which is where a copy change is written against
it. The deal #1 exception is recorded *beside* the constraint in each document,
not inside it, because it is an exception to the rule and not part of it — and
the test asserts neither side swallows it.

**The agreement test compares the wording, not the bytes, and the first
version of this paragraph gave a false reason for that.** It said the two
files "cannot be" byte-identical because `brand.md` quoted the constraint under
a paragraph. They were byte-identical: the first draft pasted LD-03's list item
into `brand.md` verbatim, marker and continuation indent and all. That draft
also produced a stray one-item numbered list in a prose section, two
markdownlint failures, and an HTML comment rendered as visible text inside
LD-03's item 3 — so the reason given was invented for a problem that did not
exist, while three real ones went unnoticed because `scripts/validate` had not
been run. `brand.md` now carries the constraint as a quotation, which is what
it is; its blockquote prefix and LD-03's `4.` are markdown, not the constraint; and
every word, backtick and em dash still has to match.

The two sides are located differently and deliberately. `brand.md`'s quotation
is delimited by HTML comments, which a blockquote carries without disturbing
anything; LD-03's cannot be, because a comment placed in that list breaks it,
so its constraint is found the way the list defines it — item 4, first
paragraph.

The script is registered as `npm run edit:inscription`, following
`report:discounts`'s own `medusa exec` invocation. It holds the operator to the
entry path's own lengths, because nothing on the render side truncates.

- [x] Write constraint 4's settled wording into LD-03 and `brand.md` together
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
`docs/working/ld-11-user-experience/g1/`,
`docs/working/ld-11-user-experience.md`. No source file changes in this row.

Does a first-time visitor understand what is for sale before they are asked to
pay for it?

**Walked 2026-09-22 on the live open store**, at 390×844 and 1280×900. Six
findings, recorded in [`findings.md`](./ld-11-user-experience/findings.md)
with six candidate fix rows for the operator to select from, and 390px
screenshots in [`g1/`](./ld-11-user-experience/g1/). The row's own question
is answered there: a visitor can reach a merch-only cart, and the browse flow
does not let them in — the absence of one does.

**It starts with a known symptom.** `CART_NEEDS_CERTIFICATE_NOTICE` exists
because a cart can hold printed goods and no certificate — the merch upsell is
reachable from the wrong end, and the shop's answer today is a notice at the
cart telling the visitor they started backwards. A notice repairing a browse
path is evidence the browse path leaks.

Walk: home → a deal → goods → cart, and goods → cart without a deal.

- [x] Walk home → a deal → goods → cart, and goods → cart without a deal, at
      390px and desktop width. Verified by a `## G1` section appended to
      `findings.md` recording whether a visitor can reach a merch-only cart
      without intending to and what the browse flow would have to do so they
      cannot, with a screenshot per step and one fix row per finding — or the
      sentence that it found nothing.

### G2 — Cart, and whether a discount code is comprehensible

**Repository:** `lousydeal`.
**Files:** `docs/working/ld-11-user-experience/findings.md`,
`docs/working/ld-11-user-experience/g2/`,
`docs/working/ld-11-user-experience.md`. No source file changes in this row.

**Walked 2026-09-22 on the live open store**, at 390×844 and 1280×900. Six
findings and three candidate rows in
[`findings.md`](./ld-11-user-experience/findings.md). Both of the row's
questions are answered there: the cart tells a visitor nothing about a code
before it is applied, and `CART_SURCHARGE_NOTICE`'s state cannot be reached
from the shop's own controls — a pass, recorded as one.

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

- [x] Walk the cart with and without `BALDRICK20`, and attempt
      `CART_SURCHARGE_NOTICE`'s state by ordinary use, at 390px and desktop
      width. Verified by a `## G2` section appended to `findings.md` recording
      what the cart tells a visitor about a code before it is applied and
      whether the surcharge state is reachable without hand-editing a quantity,
      with one fix row per finding — or the sentence that it found nothing.

### G3 — Checkout, end to end, as one document

**Repository:** `lousydeal`.
**Files:** `docs/working/ld-11-user-experience/findings.md`,
`docs/working/ld-11-user-experience/g3/`,
`docs/working/ld-11-user-experience.md`. No source file changes in this row.
**Runs after F4**, so it walks the repaired field groups rather than the ones
F4 is already known to be changing.

**Walked 2026-09-22 on the live open store**, at 390×844 and 1280×900, for a
certificate-only cart and a gift-plus-parcel cart. Seven findings and four
candidate rows in [`findings.md`](./ld-11-user-experience/findings.md).
Finding 1 is H4's defect measured rather than read: a parcel cart quotes
`$46.60` against a country the buyer never chose, and `$40.39` once they
correct it — with the card form already mounted above that control.

F4 repairs the two name fields. This row walks everything around them:
the email hint, the country select, the address block that appears only with a
parcel, the consent statement, the price notice, the gift disclosure, and the
Payment Element.

**It is the one route on this site that requires scripting**, which makes it
the one route where a failure has no fallback. Walk it as a document, in order,
and record where the sequence asks for something the visitor cannot yet answer.

- [x] Walk checkout as one document, in order, at 390px and desktop width, for
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

**Walked 2026-09-22 on the live open store**, against a real certificate the
operator supplied for the walk. Six findings and three candidate rows in
[`findings.md`](./ld-11-user-experience/findings.md). **No screenshot is
committed**: every surface renders the bearer line and every URL carries the
slug, both of which constraint 2 keeps out of this repository, so the findings
are stated in words.

**The known question is whether an owner understands the page is public.** The
operator did not immediately connect `Name on the certificate` with the `BEARER`
row on their own product, which is the strongest possible evidence that a buyer
will not either. §5 makes the slug unenumerable and LD-08's L3 made the page
`noindex` — two decisions from two slices — so the page is *unlisted* rather
than *private*, and nothing on it says which.

- [x] Walk a real certificate, its PDF, its OpenGraph card and `ShareRow` at
      390px and desktop width, as an owner seeing it for the first time.
      Verified by a `## G4` section appended to `findings.md` recording what the
      page tells its owner about who can see it and whether the share row's
      notice covers the page itself or only the three links, with one fix row
      per finding — or the sentence that it found nothing.

### G5 — Baldrick's reach and his dead ends

**Repository:** `lousydeal`.
**Files:** `docs/working/ld-11-user-experience/findings.md`,
`docs/working/ld-11-user-experience/g5/`,
`docs/working/ld-11-user-experience.md`. No source file changes in this row.

**Walked 2026-09-22 on the live open store**: all fourteen intents asked from
the keyboard, every quick reply followed. Five findings and two candidate rows
in [`findings.md`](./ld-11-user-experience/findings.md). The row's worry does
not materialise — nothing lands in another response pool — but **he names the
document a visitor needs and never links it**, measured as zero anchors added
by four document-pointing answers.

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

- [x] Hold a real conversation per intent in `BALDRICK_INTENTS` from the
      keyboard, at 390px and desktop width, following each to where it
      terminates. Verified by a `## G5` section appended to `findings.md`
      recording, for each intent, where a visitor lands and whether that
      destination answers them — the question `baldrick-reach.test.ts` cannot
      ask, since it asserts reachability and not comprehension — with one fix
      row per finding, or the sentence that it found nothing.

### G6 — 390px across every route

**Repository:** `lousydeal`.
**Files:** `docs/working/ld-11-user-experience/findings.md`,
`docs/working/ld-11-user-experience/g6/`,
`docs/working/ld-11-user-experience.md`. No source file changes in this row.
**Stage 1, with G1–G5. It closes once.**

**Swept 2026-09-22 on the live open store.** Twenty-one route states; fifteen
clean. Six findings and two candidate rows in
[`findings.md`](./ld-11-user-experience/findings.md). **Checkout scrolls
sideways on every phone**, for every cart shape, because one unconstrained
`<select>` is 434px wide — and it is the same control G3 and H4 are about.

Not a flow but a sweep. **It was first written as re-walking "whatever G1
through G5 changed", which the audit method forbids** — those rows fix nothing,
so there is nothing of theirs to re-walk. The sweep over what the J-rows change
is a separate stage-4 row, written once stage 2 has decided there are any.

Every route at 390px: home, deal, goods, cart, checkout, certificate, the legal
set, `not-found`, and the empty and error states of each. This repository has
found two rendered defects this way that every passing assertion missed, which
is the argument for doing it deliberately rather than incidentally.

- [x] Sweep every route at 390px — home, deal, goods, cart, checkout,
      certificate, the legal set, `not-found`, and the empty and error states of
      each. Verified by a `## G6` section appended to `findings.md` recording,
      per route, whether it scrolls horizontally, whether any control is
      unreachable, and whether any document's leader, rule or ledger breaks at
      that width, with a screenshot per route and one fix row per finding — or
      the sentence that it found nothing. **A defect found here becomes a
      J-row; it does not hold this row open.** A J-row may then want this sweep
      repeated after it merges, which is stage 4 and is its own row.

### Part four — what the audits found

Stage 3. These are numbered because the operator selected them from part two's
candidates; the rest of that list stays unnumbered until they are chosen too. J2 is the first in part four chosen from a review's findings
rather than from part two; H5, in part three, came from one too.

### J1 — Checkout stops scrolling sideways on a phone

**Repository:** `lousydeal`.
**Files:** `storefront/src/app/globals.css`, `storefront/tests/tokens.test.ts`.
**From G6's findings 1 and 2** (candidate `u`), selected 2026-09-23.

`#checkout-country` sized itself to its widest option and set the page's width
with it. Measured on the live checkout: 521px against a 390px viewport — 131px
of overflow, 161px at 360, 201px at 320, and none at 1280. Every cart shape,
including certificate-only, because that shape is asked for a country too.

**It is two declarations, and the second is the one that works.** The control
is a flex item, and a flex item's `min-width` is `auto`, so it will not shrink
below its content however narrow the box: `max-inline-size: 100%` alone took
the overflow from 131px to 55px. `min-inline-size: 0` takes it to nought.

**The proof is a measurement, not an assertion.** The storefront suite has no
DOM and no layout engine, so nothing in it can measure a page's width. The
test added here fails if either declaration is removed, which is how the
defect would return, and that is all it claims to do. The figures below are
the verification.

- [x] Constrain the country control so it cannot set the page's width.
      Verified by measuring the live checkout at 320, 360, 390 and 1280 before
      and after — overflow 201/161/131/0 becomes 0/0/0/0, the control still
      renders its chosen country in full, and desktop is unchanged at 434px —
      and guarded by a test in `tokens.test.ts` that fails if either
      declaration is dropped, mutation-checked both ways.

**The "after" above could not have been of deployed code, and was re-measured
on 2026-09-24.** J1 merged on 2026-09-23, and no promotion reached live until
2026-09-24 (status.md, **Two incidents**). Whatever produced 0/0/0/0 then, it
was not the deployed stylesheet, and the record did not say how it was made.
Re-measured once `0eb16ca` was live, on a live certificate cart's checkout
with no payment: overflow is 0 at 320, 360, 390 and 1280, and the control is
217, 257 and 287px at the three phone widths. Overriding the two declarations
back to `none`/`auto` on the same page restores 201/161/131/0 and a 434px
control, so the measurement is one the defect's return would fail.

### J2 — A gift the backend would drop cannot be paid for

**Repository:** `lousydeal`.
**Files:** `storefront/src/lib/gift.ts`,
`storefront/src/app/checkout/PaymentForm.tsx`,
`storefront/tests/checkout-gift.test.ts`.
**From the review of H1** (`findings.md`, "What the review of H1 found"),
selected by the operator on 2026-09-25.

The recipient field was `type="email"` and `required`, and the HTML e-mail
grammar accepts a domain with no dot, such as `friend@example`. The backend's
`readGift` refuses that, so the order became an ordinary purchase: no gift
message, and nothing to tell the buyer. `lib/gift.ts` claimed `isGiftAddress`
stopped exactly this, but the form never called it.

**The field now carries the backend's rule as its `pattern`.**
`GIFT_ADDRESS_PATTERN` is derived from `ADDRESS` rather than written a second
time, and a test already holds `ADDRESS` equal to the backend's copy.
`requestSubmit()` runs constraint validation, so no submit reaches
`handleSubmit` with an address the backend would drop. The operator chose the
browser's own message ("Please match the requested format") over custom copy.

**Its review found a regression, fixed before merge.** `type` and `pattern`
are not conditional the way `required` is. So a buyer who typed
`friend@example` and then closed the block could not pay, and was told
nothing: Chromium blocks the submit, and the only output is a console error
about a control it cannot focus. `type="email"` already did the same to
`abc`. The field is now `disabled` while the block is closed. Measured in
Chromium with the real pattern: closed and enabled, the submit is blocked;
closed and disabled, it goes through; open, `friend@example` is refused.

- [x] Refuse, in the form, a gift address the backend would drop. Verified by
      `checkout-gift.test.ts` reading the rendered `pattern` attribute. It
      compiles the pattern as a browser does, anchored and with the `v` flag,
      and asserts that `friend@example` and four other dropped shapes are
      refused and two real addresses accepted. Three mutations were run: the
      attribute removed, a pattern that admits a dotless domain, and one that
      refuses a real address. Each fails its test.

**Selected on 2026-09-25 by Jev, at the operator's instruction.** The
operator handed stage 2 to TypeSafe's Jev model. Jev was given a neutral brief
of the shop, this slice's objective and limits, and each remaining candidate
in its finding's own words. It was asked, for each, whether implementing it
would succeed: a real, verifiable comprehension or truthfulness improvement,
within the limits, deliverable as one small change. The operator set the bar:
build every candidate above 0.80.

Ten cleared it: `h` 0.91, `b` 0.90, `j` 0.89, `q` 0.87, `f` 0.86, `i` 0.86,
`n` 0.84, `o` 0.84, `r` 0.82 and `s` 0.82. Not selected: `m` at 0.80 (not
above the bar), `t` 0.74, `a` 0.73, `p` 0.72, `c`+`v` 0.70, `g` 0.68, `d` 0.58,
`c` 0.52 and `e` 0.42. `k`, `l` and `u` were already built, by H4 and J1. New
buyer-facing copy in these rows goes to Jev too, as a choice between drafted
options, under the same instruction.

### J3 — The cart says a merch-only cart cannot be paid for, before the pay step

**Repository:** `lousydeal`.
**Candidate `b`**, from G1's finding 2 in [`findings.md`](./ld-11-user-experience/findings.md).
Selected by Jev on 2026-09-25.

- [ ] Build candidate `b` as its finding describes. The row records what
      was built, what verifies it, and each mutation run.

### J4 — The cart's upsell heading is true on a cart with no certificate

**Repository:** `lousydeal`.
**Candidate `f`**, from G1's finding 6 in [`findings.md`](./ld-11-user-experience/findings.md).
Selected by Jev on 2026-09-25.

- [ ] Build candidate `f` as its finding describes. The row records what
      was built, what verifies it, and each mutation run.

### J5 — The discount field says what a code does here, before it is applied

**Repository:** `lousydeal`.
**Candidate `h`**, from G2's findings 1 and 2 in [`findings.md`](./ld-11-user-experience/findings.md).
Selected by Jev on 2026-09-25.

- [ ] Build candidate `h` as its finding describes. The row records what
      was built, what verifies it, and each mutation run.

### J6 — A repeated or already-applied code is answered like a wrong one

**Repository:** `lousydeal`.
**Candidate `i`**, from G2's findings 3 and 7 in [`findings.md`](./ld-11-user-experience/findings.md).
Selected by Jev on 2026-09-25.

- [ ] Build candidate `i` as its finding describes. The row records what
      was built, what verifies it, and each mutation run.

### J7 — The cart and Baldrick name how much a code adds

**Repository:** `lousydeal`.
**Candidate `j`**, from G2's findings 1 and 2 in [`findings.md`](./ld-11-user-experience/findings.md).
Selected by Jev on 2026-09-25.

- [ ] Build candidate `j` as its finding describes. The row records what
      was built, what verifies it, and each mutation run.

### J8 — A tier swap says when it changes the surcharge, and that it happened

**Repository:** `lousydeal`.
**Candidate `o`**, from G2's finding 6 in [`findings.md`](./ld-11-user-experience/findings.md).
Selected by Jev on 2026-09-25.

- [ ] Build candidate `o` as its finding describes. The row records what
      was built, what verifies it, and each mutation run.

### J9 — A certificate-only checkout says why it asks for a country

**Repository:** `lousydeal`.
**Candidate `n`**, from G3's finding 5 in [`findings.md`](./ld-11-user-experience/findings.md).
Selected by Jev on 2026-09-25.

- [ ] Build candidate `n` as its finding describes. The row records what
      was built, what verifies it, and each mutation run.

### J10 — The certificate page says who can see it

**Repository:** `lousydeal`.
**Candidate `q`**, from G4's findings 2 and 3 in [`findings.md`](./ld-11-user-experience/findings.md).
Selected by Jev on 2026-09-25.

- [ ] Build candidate `q` as its finding describes. The row records what
      was built, what verifies it, and each mutation run.

### J11 — The share controls say that pressing one publishes the address

**Repository:** `lousydeal`.
**Candidate `r`**, from G4's findings 4 and 5 in [`findings.md`](./ld-11-user-experience/findings.md).
Selected by Jev on 2026-09-25.

- [ ] Build candidate `r` as its finding describes. The row records what
      was built, what verifies it, and each mutation run.

### J12 — Baldrick links the document he names

**Repository:** `lousydeal`.
**Candidate `s`**, from G5's findings 2 and 4 in [`findings.md`](./ld-11-user-experience/findings.md).
Selected by Jev on 2026-09-25.

- [ ] Build candidate `s` as its finding describes. The row records what
      was built, what verifies it, and each mutation run.

### H1 — Checkout ends somewhere, and the copy above it stops promising otherwise

**Repository:** `lousydeal`.
**Files:** `storefront/src/app/checkout/PaymentForm.tsx`,
`storefront/src/content/checkout.ts`,
`storefront/src/content/legal/terms.ts`,
`storefront/tests/checkout-order-summary.test.ts`,
`storefront/tests/checkout-address.test.ts`.

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

**Chosen 2026-09-23: option two, make the sentence honest.** The operator
chose it with both options rendered side by side, then approved the exact copy
in a second rendering. That second pass existed because the first draft was
wrong in two places. It said the certificate goes to "the email address above",
and the summary renders *above* the email field. It also said a gift's recipient
gets "the certificate only", and F2 made the gift message describe the parcel
too.

The three copies now say the certificate "is issued as soon as you have paid"
and reaches the buyer by email. The Terms' `updated` date moves to 2026-09-23
with them, as LD-06 D8 moved it. `home.ts`'s "supplied immediately after
payment" stands: §5 of the Terms defines supply as the certificate existing,
and that is still true.

The end state names the address the confirmation went to, its subject, and
that it carries the certificate's link and the receipt. It says another mail
follows a parcel, because `parcel-shipped.ts` sends one. On a gift it names the
recipient's address, but only when `giftRecipientSent` accepts it. That
function uses the same test `readGift` applies, so the end state never
announces a gift mail the backend will drop.

**What this does not verify.** No real payment has reached this end state. It
is proved by rendering `OrderPlaced` directly, since the suite has no DOM, and
by a source match binding `PayButton` to it. H2 is where the page is reached by
its real paths: a reload, the back-button, and a redirect return.

- [x] Choose between the two options with a rendering in front of you, record
      the choice in the row, then change the end state and — under option two —
      all three copies of the § 54(1) line together. Verified by tests
      asserting the end state names where the confirmation went and what it
      carries, and that the parcel and gift lines appear only on their own
      orders. `checkout-order-summary.test.ts` asserts the chosen wording
      across the certificate-only variant, the merch variant and the Delivery
      section of `terms.ts`, with the old assertion rewritten rather than
      deleted. Nineteen mutations were run, and each failed the assertion
      that names its defect. Two first attempts proved nothing and were
      redone. One did not compile, so its file failed to load rather than
      the assertion failing. The other never applied.

**That last claim was wrong when it merged, and the Fable review of #255 found
it.** The record said every new assertion was mutation-checked on its own.
The Terms copy's email assertion never was. It joined all of §5 and asked
whether "email" appeared anywhere. With the claiming phrase removed, four
other paragraphs still matched. The third, fourth and seventh say "email" in
prose. The sixth matched only through the raw `{merchantEmail}` placeholder,
which the test reads before substitution. Removing ", and the link to it is emailed to you" left all
twenty tests passing. The Terms mutations that were run replaced the whole
sentence, so the "issued" assertion caught them and the email one was never
exercised. The correction PR asserts against each surface's first line and
requires the email in the same sentence as the issuing. Five mutations each
fail it, and each restored only its own file: the email removed from each of
the three copies, the Terms sentence moved off §5's first paragraph, and the
old "shown" wording restored.

The same PR reverted a `package-lock.json` change #255 carried, calling it an
accident. **That revert was the mistake, and the Fable review of #256 found
it.** `npm install --package-lock-only --ignore-scripts --offline` under the gate's toolchain, Node
24.21.0 with npm 11.19.0, writes the same two `devOptional` flags from an
unchanged `package.json`. So #255's change was what the toolchain computes, and
the revert only put back a file the next install rewrites. A third correction
regenerates the lockfile deliberately, so that main matches what the gate
produces once it merges. The paragraph count above was wrong twice. It first
said "third and seventh", which missed the fourth. The first correction then
listed every paragraph matching "email" *before* the mutation, including the
sentence under test. That was a proxy for the claim, which is which paragraphs
*masked* the mutation. #258's own review caught the second error. Three more of the review's findings are recorded in
[`findings.md`](./ld-11-user-experience/findings.md) under "What the review of
H1 found", because none of them is H1's own defect.

### H2 — A paid cart never renders the payment form again

**Repository:** `lousydeal`.
**Files:** `storefront/src/lib/store-checkout.ts`,
`storefront/src/app/checkout/page.tsx`,
`storefront/src/app/checkout/PaymentForm.tsx`,
`storefront/tests/checkout-address.test.ts`,
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

**Built 2026-09-23.** The page decides, and `PaymentForm` is unchanged. The
row's file list named it, but the defect is that the form *mounts*, so the fix
has to live above it. A completed cart renders `OrderPlaced` from the page,
ahead of the payability check. It shows no ledger and no § 62²(2) lines,
because those describe an order about to be placed.

**The redirect return completes the cart itself.** `?redirect_status=succeeded`
on a cart not yet completed calls `completeCheckoutCart` on the server, then
reads the cart again. That is safe to repeat, because Medusa 2.21's
`completeCartWorkflow` locks the cart and returns the existing order for one
already completed, so the webhook and this call cannot make two. It is also
safe to forge, though not for the reason first written. Medusa 2.21
authorises the session against Stripe *last*, after the order exists. A refused
authorisation compensates the workflow: the order is deleted, `completed_at` is
restored and the buffered `order.placed` is dropped, so the parameter is only
ever a reason to ask. H2's review traced this, and the first version of this
record and of `page.tsx` said authorisation came first. The operator chose on
2026-09-23 that if completion throws, the buyer sees the site's existing error
boundary and never the form again. H3 replaces that with its own words.

**One planned assertion was dropped, because it could not fail.** "Neither
path issues a payment-session request" would read zero under a static render
whether or not the form mounted, because `renderToStaticMarkup` runs no
effects. What provokes the request is `PaymentForm` being on the page, so that
is what is asserted: its noscript notice and its email field are both absent.

**Not covered.** A `processing` redirect (a delayed payment method) still
renders the form. `purchase_completed` is not emitted on the redirect path,
because only the in-page path emits it. A completed cart with no email throws,
and only a cart completed through the public Store API directly can have none.
No real payment has been taken through any of these paths. The tests render
the page with Medusa stubbed.

**Paid is not the same as completed, and H2 reads only the second.** H2's
review found two windows where money has been taken and `completed_at` is
still null. In the first, an in-page `completeCheckoutCart` fails after
`confirmPayment` succeeded, and the buyer reloads. In the second, a redirect
completion throws and the buyer comes back through the cart without the query
string. Either way the form mounts, and a new session tries to cancel a
succeeded PaymentIntent, which is pay-path finding 3 again. Medusa's webhook
closes both windows within seconds, so this is a race rather than a hole.
**It was recorded for H3 and became H5**, by the operator's choice. The default cart GET already
carries `payment_collection.payment_sessions.status`, so an `authorized` or
`captured` session could be treated as paid and completed without mounting the
form.

- [x] Make `getCheckoutCart` read `completed_at` — `store-cart.ts` declares the
      field and `cart-actions.ts` is the one place that reads it — and handle
      the redirect return so it lands on H1's end state rather than re-mounting
      the form. Verified by `checkout-paid-cart.test.ts`, which renders the
      page. A completed cart renders the end state with the form absent. A
      `succeeded` return completes the cart once and renders the same end
      state. A cart the webhook already completed is not completed again. A
      failed completion throws rather than rendering. A `failed` return keeps
      the form. `store-checkout.test.ts` covers the three new fields.
      Fifteen mutations were run, each restoring only its own file with the
      count held at 113. Each failed the assertion that names its defect. One
      first attempt referenced an unimported name, failed five tests through a
      ReferenceError, and was redone.

### H3 — A failure on the pay path speaks in our words, not Medusa's

**Repository:** `lousydeal`.
**Files, as planned:** `storefront/src/app/checkout/PaymentForm.tsx`,
`storefront/src/content/checkout.ts`,
`storefront/tests/checkout-address.test.ts`.
**As built**, with the operator's override: those three and
`storefront/src/lib/pay-path.ts`, `storefront/src/lib/checkout-rules.ts`,
`storefront/src/app/checkout/page.tsx`, `storefront/tests/pay-path.test.ts`,
`storefront/tests/checkout-paid-cart.test.ts`, the three ordering tests, and
`findings.md`, this plan and `status.md`.

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
and Printful's wording behind `SHIPPING_UNAVAILABLE_NOTICE`, whose middle
sentence is "Nothing has been charged." What is missing is its counterpart for
the case where something may have been — **and the model is only half a model**,
because that notice ends "Try again shortly, or write to the address in the
Imprint." A retry is the right advice when nothing was charged and the wrong
advice when something may have been. The new notice borrows the reassurance and
not the invitation.

**Built 2026-09-23. The operator settled three things with the notices rendered.**

- **After a charge, the shorter notice.** "Your card was accepted, but the order
  could not be confirmed just now. Do not pay again…" It makes no refund claim.
  Medusa's `completeCartWorkflow` does compensate a captured payment when it
  fails, but the operator chose not to promise that.
- **A decline gets our words only.** Stripe marks `card_error` and
  `validation_error` messages as safe to show customers. The operator still
  chose "Your card was not charged. Check the details, or try another card."
  alone, which keeps this row's "no Stripe string" rule unamended.
- **An outcome the page cannot know gets a fourth notice**, chosen on
  2026-09-24 after H3's review. Stripe's `api_connection_error` can follow a
  confirmation that reached Stripe, so "your card was not charged" would be a
  claim the page cannot make. Only `card_error`, `validation_error` and
  `invalid_request_error` read as a decline. Every other type, and a rejected
  promise, gets "We could not hear back from the card processor. Do not pay
  again yet…", and the control stays off as it does after a charge.
- **Classified by what Stripe's answer says, after the second review.** A
  PaymentIntent attached to the error outranks its type. `succeeded` or
  `requires_capture` gets the "card accepted" notice, because confirming an
  intent that already succeeded answers `invalid_request_error`. `processing`
  is unknown. `rate_limit_error`, `authentication_error` and
  `idempotency_error` are refusals of the request, so they get the "nothing
  has been charged" notice, which is true there. The unknown notice's "could
  not hear back" is therefore left to connection, API and unrecognised
  errors, and to a rejection. The wrapper's own "not ready" rejection, which
  only a race can reach, still renders it, and it is false there.
- **Scope: the row, plus the page.** A redirect completion that throws now
  renders the charged notice in place of H2's error boundary. The
  paid-but-not-completed race H2's review found becomes H5.

**How.** The sequence moved out of `handleSubmit` into `lib/pay-path.ts`'s
`runPayPath`, which classifies a failure by *where* it happened and never by
what was thrown. Before `confirm`, nothing was charged. A refusal or a
rejection from `confirm` means Stripe took nothing. After `confirm`, the money
is taken. The extraction exists so each position can be made to fail, because
the handler cannot be reached without a DOM. `PayGateInput` gains `charged`,
which both `payDisabled` and `paySubmitBlocked` honour, so the two gates
cannot drift. The quote effect stops on it too, because the cart must not
change under money that has moved.

**What H3's review found that this row does not fix.**

- **In H5's window, two of these notices can be false.** Suppose a charged
  failure locks the control and the buyer reloads before the webhook completes
  the cart. The lock is component state and does not survive the reload. The
  form mounts again, and "Nothing has been charged" renders over a charged
  card (see H5). That is H5's to close, not a wording fix.
- **A failure after a successful redirect completion still reaches the error
  boundary.** Both the cart re-read and `listTiers` sit outside the `try`. No
  upstream wording renders there, but the page says nothing about the charge.
- **A forged `?redirect_status=succeeded` on an unpaid cart** now renders "Your
  card was accepted…" with no way onward. It is self-inflicted, and it is false.
- **The `confirmPayment` wrapper's own "not ready" rejection now locks the
  control.** Both gates require `stripeReady`, which is set in the same
  callback that registers the confirm, so it is reachable only through a race.

**What the source matches cannot see.** Four assertions bind `PaymentForm` to
this by matching its source, for `GiftAddressNote`'s reason. The one that
forbids upstream wording matches `thrown.message` and `error.message` by name,
so a message rendered through another variable would pass it. The guarantee is
`runPayPath`'s: its result can only be one of the three notices.

- [x] Stop `thrown.message` reaching the rendered error, and add a notice for
      the charged-but-unconfirmed case — modelled on
      `SHIPPING_UNAVAILABLE_NOTICE` but ending in the opposite direction, since
      something may have been charged. Verified by `pay-path.test.ts`, which
      drives a throw at each of the three positions and a Stripe refusal, with
      the proxy's, Medusa's and Stripe's real wording. Each outcome is exactly
      one of our notices, and a charged failure sets `charged`, which keeps
      both gates shut. `checkout-paid-cart.test.ts` asserts that the
      redirect-completion failure renders the charged notice with no form and
      no upstream text. Eighteen mutations were run, each restoring only its
      own file after every edit was committed, and each failed the assertion
      naming its defect. Two first attempts did not apply and were redone.

**Three existing tests had to change, and the operator overrode the file limit
for it.** `checkout-email`, `-gift` and `-inscription` asserted that their
write comes before `await confirmPayment(` in the file. Once the sequence
moved into `runPayPath`, the order is decided by which step a write is in, not
by where it sits in the file. So the tests now assert the write is inside
`prepare`. Moving each write into `complete` fails its test. That makes the row
thirteen files against a limit of ten, and the operator approved the override
on 2026-09-23 rather than splitting the change.

### H5 — A paid cart that is not yet completed completes rather than showing the form

**Repository:** `lousydeal`.
**Files, as planned:** `storefront/src/lib/store-checkout.ts`,
`storefront/src/app/checkout/page.tsx`,
`storefront/tests/store-checkout.test.ts`,
`storefront/tests/checkout-paid-cart.test.ts`.
**As built:** those four and `storefront/src/lib/pay-path.ts`,
`storefront/src/app/checkout/PaymentForm.tsx` and
`storefront/tests/pay-path.test.ts`, because the design below had to change.
**From H2's review**, split out of H3 by the operator on 2026-09-23.

H2 reads `completed_at`, and paid is not the same thing. Two windows exist in
which money has been taken and the cart is not yet completed. In the first, an
in-page completion fails and the buyer reloads. In the second, a redirect
completion fails and the buyer returns through the cart without the query
string. In both, `PaymentForm` mounts with no client secret, so
`paymentSessionNeeded` asks Medusa for a new session.

**What that request does, read to the end of the chain.** Medusa's session
workflow fails, because the old intent cannot be cancelled once it has
succeeded and `validateDeletedPaymentSessionsStep` throws. `PaymentForm`
then renders H3's "Payment could not be prepared just now. Nothing has been
charged. Try again shortly…" over a card that was charged. That is false, and
the retry it invites fails the same way until the webhook completes the cart.
A first review of H3 read the chain only as far as the step that swallows the
error, and concluded a fresh intent would re-arm the form. The workflow's
validation step says otherwise. No second charge is possible by this route,
but the false sentence is. Measure it on test before building.

**The planned design could not have worked, and the operator chose its
replacement on 2026-09-24.** The row said to treat a session whose Medusa
status is `authorized` or `captured` as paid. But Medusa writes that status
only when Medusa itself authorises, during completion or while processing the
webhook, and those are exactly the steps that have not happened in this
window. A live cart read on 2026-09-24 showed the Stripe session `pending`
with its `data` present. Only Stripe knows the card was charged. The
storefront's server cannot ask, because its pod has no HTTPS egress (only
`backend`, `worker` and `backup` do, in `deploys`). The browser can.

**Built 2026-09-24.**

- `getCheckoutCart` returns the Stripe session's client secret, which the
  default read carries in `payment_sessions.data`.
- The page hands it to `PaymentForm`. Before the form creates a collection,
  and so before any session, it asks Stripe with `retrievePaymentIntent`.
  `lib/pay-path.ts`'s `checkPriorPayment` decides from the intent's status:
  - `succeeded` or `requires_capture`: complete the cart and reload. The
    reload renders H2's server-side end state. If completion throws, H3's
    "card accepted" notice renders instead.
  - `processing`, or Stripe unreachable: the unknown notice.
  - Anything else: the flow as before.
- No form renders while a notice stands.

**What it costs, and what it does not cover.**

- Every checkout load that already holds a session makes one Stripe read
  first. That is every reload of an unpaid checkout. It also serialises the
  Stripe.js load ahead of the collection call, which used to run in parallel.
- **The unknown notice can reach a buyer who has paid nothing.** If Stripe.js
  cannot load (an ad blocker, a content policy), or the publishable key no
  longer matches the session's (a key rotation), the check cannot answer. It
  then says "Do not pay again yet" to a buyer who never paid, with no way
  onward. That buyer could not have paid before H5 either, because the card
  element never mounts, but the sentence is false for them. This is recorded
  as the conservative default, not fixed.
- The redirect return still completes on the server (H2), because it arrives
  with `redirect_status`.
- The check sits on `PaymentForm`'s mount, so it works only with scripting on.
  Without scripting, the form never loads anyway.
- **Not measured.** No real payment has been through this path. The build was
  deployed to test with the `deploy-test` label on 2026-09-24, but the
  measurement could not reach it. Test sits behind Cloudflare Access; an SSH
  forward through orange was refused ("administratively prohibited") although
  sshd's effective configuration permits it for this user and address; and
  orange has no browser. The operator chose to skip it. H5 rests on its tests
  and on the reading of Medusa's and Stripe.js's source that the review
  checked.

**From H5's review, applied before merge.**

- The "placed" answer used to reload unconditionally. A cart with an order
  link but no `completed_at` would have reloaded for ever. The reload now
  carries a `prior_completed` query parameter, and a second "placed" answer
  renders H3's charged notice instead. A parameter was used, not browser
  storage, so nothing is stored.
- The check has a ref guard, so development's double effect cannot complete
  a charged cart twice.
- The notice that replaces the form is an alert. The first version of that
  source match was vacuous: `PayButton` renders its own alert with the same
  markup, and the unanchored pattern found that one. It is now anchored on
  the assignment, and removing the role fails it.

- [x] Before a checkout replaces a Stripe session, ask Stripe whether its card
      was charged; complete a charged cart rather than replacing its session,
      and render the end state or H3's charged notice, never the form.
      Verified by `pay-path.test.ts` driving `checkPriorPayment` through every
      intent status, a failed completion and an unreachable Stripe;
      `store-checkout.test.ts` reading the secret from the Stripe session only;
      and source matches binding the page's prop, the collection gate and the
      reload. Ten mutations were run, each restoring only its own file after a
      commit. Nine failed first time. The tenth, an empty client secret kept,
      survived; a test was added, and it now fails.

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

**Built 2026-09-25. The operator settled three things with them rendered.**

- **The country starts empty.** Its first option is "Choose a country", and
  the select is `required`, so that option cannot be submitted.
- **It comes first in the address.** For a parcel it is the address
  fieldset's first field. A certificate-only cart has no address, so there
  it stays where it was.
- **`addressComplete` is not tightened; the quote is debounced instead.**
  The operator chose that over minimum lengths. A new rule, `quoteReady`,
  asks for a chosen country and a complete address. The quote effect then
  waits 600ms (`QUOTE_DEBOUNCE_MS`) after the last change, and each keystroke
  cancels the pending one. So only the address the buyer stopped on is
  written to the cart.

**The PaymentIntent count is not asserted, by the operator's choice.** The
row wanted a test that a parcel order, from first keystroke to pay, mints
exactly one PaymentIntent. That needs a DOM environment the suite does not
have, and the operator declined adding one. What is asserted:

- `quoteReady` refuses without a country, without a complete address, and
  without a province where one is needed.
- The effect is bound to `quoteReady`, to the debounce, and to the cleanup
  that cancels it.
- The rendered checkout starts on the empty choice, which is `required`, and
  renders the country once, first in the fieldset or alone.

Whether a real parcel checkout now mints one intent has not been measured,
because no browser route to test exists from here.

**Its review found that H4 brought J1's sideways scroll back, and it was
fixed before merge.** Moving the select into `fieldset.address` put it inside
a user-agent fieldset, whose `min-inline-size` is `min-content`. The fieldset
then refused to shrink below the select's widest option and set the page's
width, and J1's rule on `select` cannot reach that. The fix is the one
property `.inscription` already sets, `min-inline-size: 0`, and nothing else
about the box changes. It was measured in Chromium on the rendered `PayButton`
with the real stylesheet and the longest country name selected:

| Width | Overflow with the rule | Overflow without it |
| --- | --- | --- |
| 320 | 1px (font rounding, also on main) | 231px |
| 360 | 0px | 191px |
| 390 | 0px | 161px |

`tokens.test.ts` now guards the property the way it guards J1's. My nine
mutations had all been to the source and the markup, and none rendered a
page, which is how a layout regression passed all of them.

- [x] Move the country control above the address fieldset it governs, stop
      seeding `countryCode` to a country the buyer has not chosen, and debounce
      the quote effect. Verified by `checkout-address.test.ts`, as above. Three
      existing tests are updated: two source matches, and one that assumed the
      first country was preselected, which is the behaviour H4 removes. Nine
      mutations were run, each restoring only its own file after a commit, and
      each failed the test naming its defect: the seeded country, the missing
      placeholder, the select not `required`, the country after the address,
      the country rendered twice, a quote without a country, no debounce, no
      cancel, and a gate that ignores `quoteReady`.

## Where this slice stands, for whoever picks it up

**Seventeen of the plan's rows are closed with H4, and two J-rows with them.** Part one
repaired every defect live order #1 proved. Part two walked all six flows and
produced thirty-eight findings and twenty-two candidate fix rows; its stage 1
is closed. Part three is closed: H1 to H5.

**Nothing in part two is built until the operator selects it.** That is stage
2, and it has happened once: candidate `u` became J1. The other twenty-one
candidates are listed in
[`findings.md`](./ld-11-user-experience/findings.md) under each G-row, and
they are proposals — not work, not numbered, not ordered.

**Three groups of them are one piece of work each**, and whoever sizes them
should read them together rather than one at a time:

- **The country control.** Candidates `k`, `l` and `u`, plus H4, plus G3's
  finding 1 and G6's findings 1 and 2. J1 fixed the width. The control still
  defaults to a country nobody chose and still sits below the address it
  governs, which is what makes a parcel cart quote `$46.60` where the buyer
  owes `$40.39`.
- **The ledger's value column.** Candidates `c` and `v`. G6 settled that the
  money and the product names wrap because of one column at 390px, not because
  of two surfaces.
- **Whether merch is a browse path.** Candidates `a` and `b`. `/goods` is a
  404, nothing links a product page, and the four products are in the sitemap —
  so the only entrances are search and a cart that already holds something.
  One decision answers both.

**What the audits could not settle** is recorded row by row rather than left
implicit: whether the ledger is legible enough on its own (G2), whether a
certificate-only cart's country has an invisible consequence (G3), and
whether the certificate's closing line reads as a joke (G4). None proposes a
row, and none should be treated as a defect without deciding those first.

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
