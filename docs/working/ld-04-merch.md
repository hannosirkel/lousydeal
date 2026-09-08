# LD-04 — Printful and the merch upsell

Make four printed things orderable on this site, fulfilled by Printful, without
telling a buyer anything untrue.

The second half of that sentence is the larger half. This site sells one
digital product, supplied immediately, and **every legal surface it has is
written for exactly that**. A mug is not that. The withdrawal period for goods
runs from delivery rather than from the contract; the § 53(4) p 7¹ exception the
whole checkout is built around does not reach physical goods at all; and the
checkout currently collects no address, because until now there was nothing to
send. Six of this plan's rows are the shop, and five are the consequences of
selling a thing that has to be posted.

---

## What the operator settled on 2026-09-08

| Question | Answer |
| --- | --- |
| Collection | **Four**: T-shirt, mug, trucker cap, sticker |
| Shipping | **Charged separately**, at Printful's live rates |
| T-shirt price | **One price, all sizes** |
| Garment | **Gildan 64000**, not Bella + Canvas 3001 |
| Token scopes | Full set; regenerated and verified the same day |

**Four products amends the contract, and the amendment is marked rather than
made quietly.** §7 names three — shirt, mug, sticker — and says "do not build a
broad merchandise catalog". The operator added the cap and kept the sticker. Four
is still tiny and still a punchline, so the spirit holds; but the list is a list,
and P1 amends it in the open the way `brand.md` records its own amendments.

---

## What was measured, not assumed

Everything below came from the live Printful API on 2026-09-08, through the
`Lousydeal Test` store's private token. Prices are USD, undiscounted, at the
per-variant endpoint — **not** the bulk price list, which returned rows
misaligned with the variant list and would have priced the shirt about four
dollars wrong.

### The four products

**Every cost below is the variant price *plus* its placement**, shown as both
terms because the first draft of this table showed only the sum and the review
read it as a bare variant price — and therefore as a table understating every
cost and overstating every margin. It was not; but a table that can be read
that way is a table to rewrite.

| Item | Catalogue | Technique | Variant | Placement | **Cost** |
| --- | --- | --- | --- | --- | --- |
| T-shirt S–L | Gildan 64000, White | DTG | $9.63 | `front` $5.95 | **$15.58** |
| T-shirt XL | | | $10.95 | $6.50 | **$17.45** |
| T-shirt 2XL | | | $11.63 | $5.95 | **$17.58** |
| T-shirt 3XL | | | $13.63 | $5.95 | **$19.58** |
| Mug | White Glossy 11 oz (#19, var 1320) | Sublimation | $8.95 | `default` $0.00 | **$8.95** |
| Trucker cap | Yupoong 6006 (#100) | DTF | $15.15 | `front_dtf_hat` $2.95 | **$18.10** |
| Sticker | Kiss-Cut 4″×4″ (#358, var 10164) | Digital | $3.25 | `default` $0.00 | **$3.25** |

Placement cost is added to the variant's technique price rather than included
in it, which is why both terms appear.

### The prices this produces

Operator rule: fulfilment cost plus 25%, rounded up to a marketable number.

**The first version of this table was wrong, and decision
[`012`](../decisions/012-vat-for-goods-printful-dispatches.md) records why.** It
took cost + 25% and printed the result as a shelf price. Decision `007` makes
every price on this site tax-inclusive, so that quietly spends the VAT out of
the margin: a $25 shirt nets $20.16 after Estonian VAT, and a 3XL costing $19.58
clears **3%**, not 25%. The mug cleared 8%. Only the small shirt was ever right.

Corrected, and derived at 27% — Hungary's rate, the worst in the EU — so one
number works in every country this shop posts to:

| Item | Cost | **Shelf** | Net at 27% | Margin |
| --- | --- | --- | --- | --- |
| T-shirt S–2XL | $15.58–17.58 | **$28** | $22.05 | 25%–42% |
| T-shirt 3XL | $19.58 | **$32**, or the size goes | $25.20 | 29% |
| Mug | $8.95 | **$15** | $11.81 | 32% |
| Trucker cap | $18.10 | **$29** | $22.83 | 26% |
| Sticker | $3.25 | **$6** | $4.72 | 45% |

The sticker no longer costs exactly what the certificate costs, which was the
better joke and is a real loss.

Shipping is not in these numbers and is not marked up. It is quoted live and
passed through.

### Shipping, quoted live and measured

`POST /v2/shipping-rates` answers for every destination tried, for one tee:

| Destination | Cheapest | Options | Printful's minimum |
| --- | --- | --- | --- |
| Estonia, Latvia, Spain | $5.22 | 1 | — |
| Germany | $5.22 | 2 | — |
| United Kingdom | $5.10 | 1 | — |
| United States | $5.45 | 2 | 4 days |
| Canada | $9.29 | 2 | 2 days |
| Australia | $7.90 | 1 | 4 days |
| Norway | $10.80 | 1 | 5 days |
| Brazil | $12.78 | 2 | 8 days |

Two things follow, and the second is what makes a legal row cheap.

**The rate call is real and P7 can be built on it.** Every quote above came back
in one request against the live API, with the artwork URL in the payload.

**The response carries `min_delivery_days`**, which discharges the § 54(1)
delivery-time duty without inventing anything. Constraint 7 says a delivery
window is a claim about the future and only Printful's own estimate may be
repeated, attributed — and here it is, per destination, from the same call that
produces the price. The site quotes Printful and says it is quoting Printful.

Two quotes require a subdivision and fail without one: the United States and
Australia want a state code, Japan a prefecture. That is P7's address form, not
an obstacle.

### Print files

| Item | Print file | DPI |
| --- | --- | --- |
| T-shirt front | 1800 × 2400 | 150 |
| Mug wrap | 2700 × 1050 | 300 |
| Cap front | 1890 × 765 | 300 |
| Sticker | 1200 × 1200 | 300 |

### What the API can and cannot do

- **v2 has no product management.** "Product management, with sync products or
  product templates, is not available in version 2 of the API yet." Sync
  products are v1 only, at `POST /store/products`.
- **v2 can order without them**, from `catalog_variant_id` plus a `placements`
  array carrying the design file URL. It also owns shipping rates
  (`POST /v2/shipping-rates`), order estimation, webhooks and mockups.
- `POST /files` is **permanently removed**; the file library is reached through
  its v2 endpoint or by giving Printful a public URL to fetch.
- **The DTF cap is a sync product, measured.** The v1 mockup-generator lists
  only the cap's embroidery placements, which read like a restriction and is
  not one — that endpoint describes what the *mockup generator* supports, not
  what `/store/products` accepts. Probed on 2026-09-08: all four placements
  (`front`, `default`, `front_dtf_hat`, `default`) were accepted, the products
  created, and every probe deleted afterwards. The cap keeps DTF, and nothing
  forces the slice catalogue-side.
- **File upload is URL-only.** `POST /v2/files` refuses multipart —
  "Request body must be a JSON object" — so Printful fetches every design file
  from a URL it can reach. There is no route that hands it bytes.

---

## Constraints

| | | |
| --- | --- | --- |
| 1 | No Printful token, store id, or any per-environment value becomes a literal in `lousydeal` or `deploys`. Both are public. The token goes to OpenBao by the sanctioned path, the way LD-02's mail credentials did | P3 |
| 2 | Merch uses the real Medusa product, order and fulfilment model. No webhook hacks, and no abandoned community integration | P6, P8 |
| 3 | A Printful order is created **once** per Medusa order, whatever Stripe or a retry does — enforced by a database unique index and Printful's `external_id`, **not** by the notification module's `idempotency_key`, which does not reach a non-notification effect and carries a documented race | P8 |
| 4 | The certificate path does not regress. An order with no merch in it must reach exactly the code it reaches today, and must still need no address | P6, P8, P12 |
| 5 | Every legal surface that becomes untrue when a physical good is sold is corrected in this slice, not after it | P9, P10, P11 |
| 6 | The withdrawal consent box does not appear to cover the merch. It is about digital content, § 53(4) p 7¹ reaches nothing else, and a box that seems to waive a mug's return right would be worse than no box | P10 |
| 7 | No fabricated stock level or review, §11 — but a delivery time is **not** optional. § 54(1) requires the trader to state when it undertakes to deliver, so silence breaches a duty rather than avoiding a claim. Printful's estimate attributed, or the statutory outer bound | P9 |
| 8 | Test and live are separated at the credential, not in code. The test store is `Lousydeal Test`; no live Printful order is created before §23's gate | P3, P13 |
| 9 | A row that falsifies a tracked document carries that document | all |
| 10 | No figure this site prints about a purchase may come from anywhere but that purchase. A mixed order must not let a mug inflate what a certificate says was paid | P6 |
| 11 | The legal rows carry the operator's authority, recorded, or they do not run. Decision `011` gave LD-09 an exception and said the rule stands for every other slice | P10, P11 |

---

## What the review changed

Fable reviewed this plan on 2026-09-08, before any row ran. Every finding below
was checked against the repository rather than accepted; one was wrong and is
recorded as wrong.

**The two that change the slice's shape.**

*The existing single-certificate machinery blocks the whole thing.* Two
mechanisms enforce one-certificate orders today, and no row named either.
`checkout.ts`'s `CART_NOT_SINGLE_NOTICE` replaces the pay control when the cart
is not exactly one certificate — **add a mug today and the pay button
disappears**. And `order-placed.ts`'s `soleTier()` returns `null` for any order
where `items.length !== 1`, so a mixed order that somehow paid would issue no
certificate at all. Constraint 4 defended the no-merch path and nobody defended
the merch path. **P6a is new.**

*Quoting a rate is not charging it.* P6 made products shipping-required and P7
quoted Printful; nothing in between turned a quote into money. A
shipping-required Medusa cart cannot complete without a shipping option backed
by a fulfilment provider, and §7 asks for "fulfillment creation" in as many
words. **P7a is new**, and P8 no longer bolts Printful onto a subscriber.

**The one that may stop the slice.** VAT. Decision `009` rests the tax position
on the Article 59c threshold, and Art 59c(1)(b) conditions that threshold on
goods being dispatched **from the Member State of establishment**. Printful
dispatches from Latvia, Spain and the US — not Estonia. The threshold reasoning
does not transpose, which points at destination-country VAT from the first euro,
OSS registration, or a registration in the dispatch state. Decision 009's own
consequences said the row that finally collects an address "reopen[s] work
adjacent to this record"; this is that row, and the plan cited neither. **P14 is
new and it is on the operator's gate.**

**Six more, each real.**

- `order-placed.ts:166` sets `amountPaid: total` — the *order* total. A $5
  certificate bought beside a $12 mug would mint a deal recording $25, print it
  on the certificate, and add it to the public counter. A fabricated transaction
  total, which §11 forbids in as many words. **Constraint 10 is new.**
- The § 55 confirmation builder (`order-confirmation.ts`) was in no row's file
  list, though § 55(2) makes it the document that discharges the duty.
- Terms §12 and Refunds §8 tell the buyer the Consumer Disputes Committee takes
  disputes worth at least €30, "which is more than anything sold here costs". A
  shirt and a cap and a mug is $62. The sentence inverts, and misleads in the
  direction that costs the buyer a remedy.
- `PRICE_NOTICE` ("the amount shown is the amount charged") and
  `ORDER_SUMMARY_LINES` ("one numbered digital certificate … the whole of what
  you receive") are both falsified by merch and separately-charged shipping.
- Privacy §4 ("our own code never asks for" a name) and §9 ("We hold no name")
  become false the day P7 collects a shipping name.
- P9 planned to give merch the tier table's `VALUE $0.00` column "because the
  joke is consistent". It is not consistent: the certificate's $0.00 is *true*,
  and that is the load-bearing wall of the whole identity. A Gildan shirt has
  non-zero value, so `VALUE $0.00` on it would be the first false figure this
  site ever printed. **On the operator's gate.**

**Three claims of this plan's own were false**, and are corrected above: that
P2 reuses "the same headless Chromium" (there is no such pipeline — the
certificate is PDFKit, the social images are Satori); that the checkout
"collects an email and nothing else" (it collects a country too, and this plan's
own P11 depends on the Privacy Policy saying three things); and that P3 could
span `orange` and `lousydeal` in one row, which §2b forbids in exactly those
words.

**Two citations are unverified and must not ship as written.** This plan put the
goods withdrawal clock at § 56(1) and the delivery-cost refund at § 56²(1). The
repository's own provision map in `refunds.ts` reads § 56(1) as the bare 14-day
right and § 56² as the *consumer's* obligations, which suggests the goods start
is § 56(1¹) and the delivery-cost rule belongs to the § 56¹ reimbursement
scheme. **P10 verifies both against the redaction in force before writing a
word**, the way the refunds document says every provision in it was.

**One finding was wrong.** The review read the cost table as bare variant prices
with placement missing, and concluded every margin was overstated and the 3XL
shirt breached the 25% floor. It did not: every figure already included its
placement. The margins stand. But a table that can be misread that way is a
table to rewrite, and it has been — both terms now appear.

---

## The rows

### P1 — The plan lands, and §7 is amended

**Repository:** `lousydeal`.
**Files:** this document; `docs/working/fresh-build.md`; `docs/working/status.md`.

- [ ] Land the plan, amend the contract's merch list, and move the resume point.

§7 says three products and names a sticker. The operator's collection is four
and adds a cap. The amendment is written into §7 as an amendment — dated,
attributed, and giving the reason — rather than edited in place, because a
contract quietly rewritten to match what was built is not a contract.

### P2 — The artwork

**Repository:** `lousydeal`.
**Files:** `design/merch/*.svg`, `design/merch/render.ts`, `storefront/tests/merch-artwork.test.ts`.

- [ ] Draw four print files, from source, and look at every one.

The designs are the site's identity on cotton: IBM Plex Mono, black on white,
ruled lines, uppercase labels with letterspacing. The operator's copy is fixed
and this row sets it rather than reinterpreting it.

> **T-shirt** — a purchase receipt.
> `LOUSYDEAL.COM` / `ORIGINAL PURCHASE` over a ruled ledger: `ITEM NOTHING`,
> `PRICE $5.00`, `VALUE $0.00`, `ROI -100%`, then `STATUS COMPLETED`.
>
> **Mug** — `I PAID $5 FOR NOTHING.` / `THIS MUG COST EXTRA.`
>
> **Cap** — `I make my Lousy Deals at lousydeal.com`
>
> **Sticker** — copy not yet given; P2 proposes and the operator settles.

**Generated, not drawn by hand**, from source in the repository, rendered to
PNG at Printful's exact print-file size using the same `.woff2` files the site
serves — so the shirt and the site cannot drift apart.

**The renderer does not exist yet, and the first draft of this row said it
did.** It claimed reuse of "the same headless Chromium", and there is no such
pipeline here: the certificate is PDFKit (§5 chose vector precisely so as not
to ship a browser in the backend image) and the social images are Satori.
Chromium appears in this repository only as Gate E's driving tool. So P2 builds
a renderer, and its dependency is a decision this row takes in the open rather
than one it inherits — a headless browser is ~150MB of devDependency for four
files that change rarely.

**The mug is the one with a trap.** An 11 oz wrap is 2700 × 1050 and the handle
interrupts it. The text block is placed twice, so it reads from either side, and
this row renders a wrap preview rather than trusting the arithmetic.

**The cap's line is 38 characters**, which is long for a cap front and the
reason the technique question in P5 matters: DTF prints it, embroidery would
turn it into three rows of unreadable stitching.

### P3a — The token reaches the cluster

**Repository:** `orange`.
**Files:** `orange` inventory and playbook.

- [ ] Seed the Printful credential by the sanctioned path.

Split from P3b because `fresh-build.md` §2b forbids a row spanning two
repositories in exactly those words: "this is always two rows with a stated
order, never one row spanning both." The first draft of this plan spanned both.

The path is the one LD-02's C10 and C11 walked: the operator's file in
`orange/.keys/`, into OpenBao, into the deployment's environment. **No value
reaches a public repository in any form** — and the store id is a
per-environment value too, so it travels the same way rather than becoming a
literal.

### P3b — One way to call Printful

**Repository:** `lousydeal`.
**Files:** `backend/src/modules/printful/client.ts` and its tests.

- [ ] Give the backend a single typed client.

Base URL, bearer auth, one retry policy, errors that say which endpoint failed
and carry no token. It knows nothing about mugs.

### P4 — What Medusa needs to know about a Printful product

**Repository:** `lousydeal`.
**Files:** `backend/src/modules/printful/catalogue.ts` and its test.

- [ ] Write the mapping down once, as data, and guard it.

Four products, their variants, their Printful catalogue ids, their techniques,
their placements, their print files, their costs and their shelf prices — as one
typed table with the measurements above beside them. Every later row reads this;
nothing hard-codes a variant id in a call site.

The guard that matters: **the shelf price must clear the operator's margin on
every variant**, asserted arithmetically rather than by eye. A cost that moves
and a price that does not is a slow loss nobody notices.

### P5 — The products exist in Printful

**Repository:** `lousydeal` (the script and its record).
**Files:** `backend/src/modules/printful/sync.ts`, its test, and the recorded ids.

- [ ] Create the four products in the store, from the mapping, repeatably.

**This row resolves the sync-versus-catalogue question**, and it is the plan's
sharpest architectural fork:

- **Sync products (v1).** Printful holds the products; Medusa holds
  `sync_variant_id`. Mockups come free, the dashboard shows real products, and
  an order names one id. Two systems must agree.
- **Catalogue orders (v2).** Nothing exists in Printful at all; every order
  carries `catalog_variant_id` plus the design file URL. One source of truth —
  this repository — and no drift. Needs the artwork served publicly, which it
  can be, and gives up the mockup generator.

The first draft inclined to **sync products**, on the ground that the operator
has a dashboard and a fulfilment problem at two in the morning is diagnosed
there. **The review took that argument apart**, correctly: orders appear in the
dashboard under *both* models — the 2 a.m. diagnosis happens in the orders view,
not the product list — so the decisive benefit was largely illusory. What the
sync path actually buys is a product listing and the mockup generator, and this
plan's own non-goals rule mockups off the site because §6 forbids raster images.
Against that it costs two sources of truth that can drift, and a v1 + v2
straddle that builds durable state on the version Printful is winding down.

The review's recommendation was **catalogue orders (v2)** unless the operator
personally wanted the listing. Two things then settled it the other way, and
both are measurements rather than preferences:

1. **The cap constraint evaporated.** The fork's forcing function was whether a
   DTF cap could be a sync product. It can.
2. **The operator asked for the products in Printful**, which is the listing the
   review said would be the only reason to prefer sync.

And the cost the review named — needing artwork Printful can fetch — turns out
to fall on *both* paths equally, because file upload is URL-only either way. So
it is not a cost of choosing sync.

**Sync products, then**, with the review's argument preserved rather than
deleted: two sources of truth can drift, and P4's mapping table plus its guard
is what stops them. If Printful retires v1 sync products, the catalogue path is
the exit and P4's table is what makes it cheap.

**And the file-hosting snag joins up here.** Catalogue orders carry a design
file URL, and `POST /v2/files` takes a URL Printful fetches — but
`test.lousydeal.com` answers 302 to Cloudflare Access, measured on 2026-09-08,
so **Printful cannot fetch a print file from the test environment**.

The operator settled this the same day: Access may be removed from the live URL
or a subset of it. **The subset is the answer, and the distinction is not
pedantry.** A bypass scoped to one static path — `/print-files/*`, four PNGs and
nothing else — lets Printful fetch artwork that is going to be printed on
publicly-sold shirts anyway. Removing Access from the whole host would publish
an unfinished shop wired to a test Stripe key, before §23's gate, which is the
one thing the gate exists to prevent. P5 asks for the prefix, not the host.

Creation is idempotent: run it twice, get four products, not eight.

### P6 — Merch as Medusa products

**Repository:** `lousydeal`.
**Files:** `backend/src/scripts/*`, `backend/src/modules/printful/*`, tests.

- [ ] Four real Medusa products, with variants, priced, and shipping-required.

The contract asks for "the proper Medusa product/order/fulfillment model" and
this is that row. The certificate stays exactly what it is; merch arrives beside
it as ordinary products whose variants carry the Printful mapping in metadata.

**Constraint 4 lives here.** A cart with no merch in it must produce the same
order, the same certificate and the same email as it does today, and must not
acquire a shipping step. The test is not "merch works" but "the certificate did
not change".

### P6a — The cart stops insisting on exactly one certificate

**Repository:** `lousydeal`.
**Files:** `storefront/src/content/checkout.ts`, the cart and checkout pages,
`backend/src/subscribers/order-placed.ts`, tests.

- [ ] Let a cart hold a certificate and a mug, and still issue exactly one certificate.

**Nothing else in this slice works until this row does.** Today
`CART_NOT_SINGLE_NOTICE` takes the pay control away from any cart that is not
exactly one certificate, and `soleTier()` refuses issuance for any order with
more than one line. A merch cart currently cannot be paid for, and if it could,
it would produce nothing.

Three changes, and the third is the one with a lie in it:

1. the cart gate becomes "at most one certificate", not "exactly one line";
2. `soleTier` finds the certificate among the lines rather than requiring it to
   be alone, and still refuses two certificates;
3. **`amountPaid` comes from the certificate's own line, not the order total.**
   Constraint 10. Left alone, a mug inflates what the certificate says was paid
   and what the public counter reports — a fabricated figure, on the two
   surfaces §11 exists to protect.

### P7 — An address, and what it costs to send something to it

**Repository:** `lousydeal`.
**Files:** `storefront/src/app/checkout/*`, `storefront/src/content/checkout.ts`, `backend/src/modules/printful/shipping.ts`, tests.

- [ ] Ask for an address only when there is something to post, and quote the real rate.

The checkout collects an email, a country, the consent box, two optional
inscription fields and four optional gift fields. **It collects no address**, and
the first draft of this row said "an email and nothing else", which is false and
contradicted this plan's own P11 — the Privacy Policy §3 says three things.

A mug needs a name, a street, a city, a postcode and a country. That is new
personal data, which is why P11 exists, and a new tax fact, which is why P14
does.

The address appears **only** when the cart contains a physical line. A form that
asks everyone for a postcode to sell them a PDF would be collecting data it does
not need, which is a principle this repository has already applied twice.

Rates come from `POST /v2/shipping-rates`, live, per address. What the buyer
sees is what Printful charges, not marked up. **A rate call that fails does not
guess** — §11 and §23 both bar an invented number, so the checkout says the rate
could not be fetched and does not proceed to payment.

### P7a — A shipping option Medusa can actually charge

**Repository:** `lousydeal`.
**Files:** `backend/src/modules/printful/fulfilment-provider.ts`, `medusa-config.ts`, a seed script, tests.

- [ ] Turn a Printful quote into a line the buyer pays.

A quote is not a charge. A shipping-required Medusa cart needs a shipping option
backed by a registered fulfilment provider, and the quoted amount has to become
the cart's shipping method so that Stripe collects it and the order total agrees
with what the buyer was shown. §7 lists "fulfillment creation" among the things
to handle, and this is it.

The provider is calculated-price, not flat: `calculatePrice` asks P7's rate
function. It fulfils nothing itself — P8 does that — but it is what makes the
fulfilment a real Medusa fulfilment rather than a side effect.

### P8 — The order reaches Printful

**Repository:** `lousydeal`.
**Files:** `backend/src/subscribers/order-placed.ts`, `backend/src/modules/printful/fulfil.ts`, tests.

- [ ] One Printful order per Medusa order, exactly once, with the merch lines only.

`order-placed.ts` already knows how to be idempotent — LD-02 settled the
`idempotency_key` argument by reading Medusa's notification module rather than
trusting its type, and LD-03 reused it for gift mail. This row uses the same
mechanism for something that costs money to get wrong.

**Idempotency is a unique index, not a notification key.** The first draft of
this row said it would reuse `order-placed.ts`'s existing mechanism. That
mechanism is `CreateNotificationDTO.idempotency_key`, enforced by Medusa's
notification module — it dedupes notifications and reaches nothing else, and the
subscriber's own comment records a race window in it that was accepted for a
duplicate email. A duplicate $18 cap, printed and posted, is not a duplicate
email. So: a table with a unique index on the Medusa order id, written in the
same transaction as the submission, plus Printful's `external_id` set to that
order id and a look-up before create. That second half is what answers the
hardest failure mode below, which no local record can.

**The failure modes are named before they are handled**, because the interesting
ones are not the obvious ones: a Stripe retry after the Printful call succeeded
but before the record was written; an order with merch *and* a certificate,
where the certificate must issue even if Printful is down; and an address
Printful rejects after payment has already been taken. The third is the one with
a person on the other end of it, and it ends in a message that says what
happened rather than a silent failure.

### P9 — What the storefront says about physical things

**Repository:** `lousydeal`.
**Files:** `storefront/src/content/merch.ts`, the cart page, `globals.css`, tests.

- [ ] The upsell, in the identity, claiming nothing that is not measured.

§7's UX concept, which this row takes literally:

> **Would you like to make your deal worse?**

It sits at the cart, where the decision is. Four rows in the ledger register the
site already uses — item, price, and the same `VALUE $0.00` column the tier
table has, because the joke is consistent.

**`VALUE` reads `NOT $0.00`, and that is the resolution rather than a joke about
one.** Printing `$0.00` against a Gildan shirt would break the wall `brand.md`
calls load-bearing — "accuracy is the joke's load-bearing wall" — because a
shirt is worth something. Omitting the column spends the running gag exactly
where an upsell needs it. Inventing a defensible dollar figure is the
fabrication §11 forbids. So the column stays and the entry inverts: `NOT $0.00`
is **literally true of all four items**, makes no claim that could ever need
defending, keeps the ledger register, and turns the inconsistency into the
punchline — the merch is the only thing here with any value, which is itself a
lousy deal for the shop. Beneath the merch ledger:

> "Unlike the certificate, these objects are worth something. We apologise for
> the inconsistency."

**Constraint 7 is the whole risk here.** No stock level, because Printful
prints on demand and this site does not know. No delivery date, because nobody
does. Printful's own estimate may be repeated, attributed to Printful, or
omitted entirely — and omitted is the honest default until P13 has seen a real
one.

### P10 — Withdrawal, for a thing that arrives in a box

**Repository:** `lousydeal`.
**Files:** `storefront/src/content/legal/refunds.ts`, `terms.ts`, `checkout.ts`, `storefront/tests/legal-*.test.ts`.

- [ ] Correct every document that currently describes a shop with one digital product.

This is the row the slice actually turns on, and it is legal work rather than
code. What is wrong the moment a mug is orderable:

- **The clock.** Refunds §2 says the 14 days run from the day the contract is
  concluded, under § 56(1³). True for a certificate. **False for goods**, where
  **§ 56(1¹)** runs the period from the day the consumer physically takes
  possession — and p 1 of it, for several goods ordered together and delivered
  separately, from the **last** item. Printful splits orders across facilities
  routinely, so a mixed cart carries **two clocks**: conclusion for the
  certificate, last delivery for the goods.
- **The exception.** § 53(4) p 7¹ is about digital content not supplied on a
  physical medium. It reaches nothing in a box. Every sentence that currently
  reads as a general position about "your order" has to be scoped to the
  certificate.
- **The consent box.** Constraint 6. It is a condition of ordering the
  certificate and it waives nothing about a T-shirt. Its label must say which.
- **Who pays return postage: the consumer**, which § 56²(3) permits by default
  and § 54(1) p 14 makes conditional on saying so first. The trader already eats
  the print cost of a good Printful will not take back, refunds the price and
  the outbound delivery, and absorbs the VAT; adding return postage would make
  withdrawal a pure loss engine. The sentence, in the document's register:

  > "If you withdraw, you send the item back to the address in the Imprint
  > within 14 days, and you pay the direct cost of sending it; we refund the
  > price and the outbound delivery up to the cheapest standard option we
  > offered."

  Printful does not accept consumer returns of on-demand goods, so the parcel
  comes to the registered address. **The operator confirms they are content to
  receive it, or this position changes.**

- **Made to order is not made to measure.** § 53(4) p 3 removes the right for
  goods made to the consumer's specifications. These are fixed designs printed
  on demand, chosen from a list — **the exception does not apply**, and the plan
  states that rather than leaving a tempting reading available.
- **Return costs and delivery refunds**, now verified against the redaction in
  force rather than guessed. Both of this plan's first citations were wrong.

  | Rule | Provision |
  | --- | --- |
  | Clock for goods, and the last-item rule | **§ 56(1¹)**, p 1 |
  | Refund including outbound delivery | **§ 56¹(1)** |
  | Capped at the cheapest ordinary delivery offered | **§ 56¹(3)** |
  | Trader may withhold until return or proof of dispatch | **§ 56¹(5)** |
  | Consumer returns within 14 days | **§ 56²(1)** |
  | Consumer bears direct return cost — **only if told beforehand** | **§ 56²(3)** |
  | Diminished value, and the disclosure that conditions it | **§ 56²(4)** |
  | The pre-contractual duty to say who pays return postage | **§ 54(1) p 14** |

  § 56²(4) is the one with teeth in the wrong direction: fail the § 54(1) p 12
  and p 13 disclosures and the consumer is liable for **no** diminished value at
  all.

- **§ 56¹(5) versus a guard this repository already has.**
  `legal-consistency.test.ts` bans `provided|only if|so long as` anywhere in the
  § 56¹ section, because Gate D once added an unlawful condition to the refund
  promise. Withholding until the goods come back is a **lawful** condition, and
  it lives in that same section. The clause and the guard have to be written
  together, or the guard will reject a sentence the statute permits.
- **Non-conformity.** § 62¹¹'s two years applies to goods too, and the current
  wording is about a certificate.

**No sentence in this row is written to be clever.** Where the answer is
uncomfortable — and at least one is — the document says the uncomfortable thing,
which is the standard the refunds document already set.

### P11 — A third party, and a stranger's address

**Repository:** `lousydeal`.
**Files:** `storefront/src/content/legal/privacy.ts`, `imprint.ts`, `storefront/tests/third-party-disclosure.test.ts`, `legal-privacy.test.ts`.

- [ ] Say who now receives a buyer's address, and on what basis.

Printful becomes a **processor** the moment an order carries a name and a street.
That is a new recipient in the Privacy Policy, a new entry in the third-party
disclosure guard, an international transfer question, and an Article 28
processing agreement the operator has to actually hold.

A carrier also receives the address, and a carrier is not Printful.

LD-03 already wrote §6 for a gift recipient — a person whose data the site never
obtained from them. This row is easier than that one and must not therefore be
done casually.

### P11a — Status, and where the parcel is

**Repository:** `lousydeal`.
**Files:** `backend/src/api/webhooks/printful/*`, `backend/src/notifications/*`, tests.

- [ ] Tell the buyer it shipped, and where it is.

§7 asks for "status synchronization as reasonably required" and the first draft
of this plan had no row for it. A buyer who has paid for a physical object and
can never learn whether it shipped is a support burden and a distance-selling
problem at once.

Printful's webhooks, verified, mapped onto the Medusa fulfilment, and one email
carrying the tracking number. Returned-to-sender and lost-in-transit are named
here even though the answer to both is a person reading the Imprint address.

### P14 — Tax

**Repository:** `lousydeal`.
**Files:** `docs/decisions/012-vat-for-goods-printful-dispatches.md`, the cart
and checkout content, a turnover counter, tests.

- [ ] Implement decision `012`, and count the thing that decides when it changes.

Decision [`012`](../decisions/012-vat-for-goods-printful-dispatches.md) settles
the scheme: Estonian VAT while cross-border EU turnover is under €10,000, Union
OSS after that, no registration in Latvia, Spain, the UK or Northern Ireland
because those are Printful's own obligations on its invoice to us, Printful's
IOSS for EU imports under €150, and **no country blocked**.

This row builds three things, none of which is a tax filing:

1. **A counter for cross-border EU turnover.** The threshold is a fact about
   turnover and the one way to get it wrong is to pass it without noticing. It
   is measured, not estimated — §11's rule applies to a number the operator will
   act on as much as to one a visitor reads.
2. **The pre-contractual sentence for buyers outside the EU**, saying they may
   owe local import charges. § 54(1) requires it before the ordering process
   begins, and it is the honest form of `PRICE_NOTICE`'s "the amount shown is
   the amount charged" — which P10 also has to reconcile.
3. **The cost line P4 was missing.** Printful charges its own VAT on orders it
   fulfils in Latvia, Spain, the UK and Northern Ireland. An Estonian
   registration does not recover that through the Estonian return, and a
   Directive 2008/9 reclaim is not worth filing at this volume, so it is simply
   a cost. **Measured from a real invoice before the margin table is trusted**,
   not assumed — the last two versions of that table were wrong.

**This row no longer blocks Gate E.**

### P12 — Gate D

**Repository:** `lousydeal`.
**Files:** the findings, in this document.

- [ ] Review every row against the contract, §23, and the legal position.

### P13 — Gate E

**Repository:** `lousydeal`.
**Files:** the record.

- [ ] Buy a shirt.

A real order on the test environment: certificate plus merch in one cart, a
Stripe test card, a real address, a real shipping quote, and a real Printful
order in the test store — **placed as a draft and cancelled, not confirmed**, so
nothing is printed and nobody is charged for a joke.

LD-02's Gate E found a defect that made every paid order produce nothing while
1,318 tests passed. This one has a physical object and a courier in it.

---

## What this slice does not do

| Not this | Why |
| --- | --- |
| A live Printful order | §23. The gate is the operator's and this slice does not open it |
| More than four products | §7, as amended. Four is the punchline; a catalogue is a different business |
| Printful's mockup generator on the site | The storefront renders its own artwork already, in its own identity. A photorealistic mockup of a mug is a raster image, which §6 forbids |
| Stock, restock, or backorder logic | Print on demand has none of those states |
| Returns processing | A return is a person emailing the Imprint address. Automating it before one has happened is guessing |
| Marking merch up on shipping | The operator set 25% on the goods. Shipping is passed through |

---

## For the operator

Two things need a human, and one needs a decision.

1. **VAT, and it is much the largest thing on this list.** The 2026-09-08 ruling
   — below €10,000, charge Estonian VAT — holds for the certificate and for
   merch delivered to Estonian addresses, and **fails for everything else**, not
   because of the threshold but because Art 32 puts the supply where dispatch
   begins and Printful dispatches from Riga and Barcelona. KMS § 10¹(5) says
   *from Estonia* in as many words. What is needed: a Union OSS registration
   before the first cross-border merch order; a position on Latvia- and
   Spain-domestic orders, which OSS cannot carry; and IOSS or an import-charges
   disclosure for US-dispatched EU orders. **And the shelf prices need
   re-deriving** — a $25 shirt absorbing 27% destination VAT nets $19.69 against
   a 3XL costing $19.58. P14 blocks Gate E. This needs EMTA or an Estonian VAT
   adviser, and Printful's routing table; it is not mine to settle.
2. **An Article 28 processing agreement with Printful**, and confirmation of
   where they process. P11 writes the disclosure; it cannot create the
   agreement.
3. **Return costs — resolved, pending one confirmation.** P10 takes the position
   that the consumer pays return postage, which § 56²(3) permits if § 54(1) p 14
   is discharged first. All that is left is the operator confirming they are
   content to receive returned parcels at the registered address, because
   Printful will not.
4. **`VALUE` — resolved.** `NOT $0.00`, per P9. Recorded here because it is the
   operator's gag and they may want a different answer.
5. **Authority for the legal rows.** Decision `011` gave LD-09 an exception for
   legal drafting inside a slice and said the rule stands for every other one.
   P10 and P11 need the same exception recorded, or they do not run.
6. **The sticker's copy**, which P2 proposes and the operator settles.
7. ~~**The Access bypass** for `/print-files/*`.~~ **Not needed.** Printful
   fetched the print files from this public repository at a pinned commit,
   measured on 2026-09-08. A commit-pinned raw URL is also a better artefact
   than a served one: it cannot change under a product that has already been
   ordered against it.

The §23 legal gate gains everything in P10, P11 and P14. It was already seven
items.
