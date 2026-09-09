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

- [x] Land the plan, amend the contract's merch list, and move the resume point.

§7 says three products and names a sticker. The operator's collection is four
and adds a cap. The amendment is written into §7 as an amendment — dated,
attributed, and giving the reason — rather than edited in place, because a
contract quietly rewritten to match what was built is not a contract.

### P2 — The artwork

**Repository:** `lousydeal`.
**Files:** `design/merch/*.svg`, `design/merch/render.ts`, `storefront/tests/merch-artwork.test.ts`.

- [x] Draw four print files, from source, and look at every one.

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

- [x] Give the backend a single typed client.

Base URL, bearer auth, one retry policy, errors that say which endpoint failed
and carry no token. It knows nothing about mugs.

### P4 — What Medusa needs to know about a Printful product

**Repository:** `lousydeal`.
**Files:** `backend/src/modules/printful/catalogue.ts` and its test.

- [x] Write the mapping down once, as data, and guard it.

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

- [x] Create the four products in the store, from the mapping, repeatably.

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

- [x] Four real Medusa products, with variants, priced, and shipping-required. **P6b** wrote the target this row left as a seam, and **P7d** created all four in a real Medusa.

> **This was ticked and should not have been.** Found on 2026-09-09 while
> building P9c. `seed-merch.ts` defines `merchSeedRecords`, `seedMerch` and a
> `MerchSeedTarget` seam — and **nothing implements the seam**. There is no
> `MedusaMerchSeedTarget`, no `default export` command, and no entry in
> `predeploy`. So the four products have never existed in Medusa and cannot be
> created.
>
> What the row did land is real and is kept: the records, the catalogue they
> derive from, the Printful mapping in variant metadata, and the constraint-4
> test that the certificate did not change. What it did not land is the half
> the checkbox described.
>
> **P6b** finishes it.

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

- [x] Let a cart hold a certificate and a mug, and still issue exactly one certificate.

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

- [x] Ask for an address only when there is something to post, and quote the real rate.

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
sees recovers what Printful charges and no more — grossed up by the destination
VAT, because Art 78(b) puts transport inside the taxable amount and decision
`007` makes the price VAT-inclusive. A rate shown ungrossed loses about a fifth
of itself on every order.

**And the quote answers a question decision `013` thought was unanswerable.**
Printful states `shipments[].departure_country` in the rate response, before the
buyer pays. Routing is not *controllable*, which turns out to be a different
thing from not being *knowable*. Measured on 2026-09-08, for one tee and one
mug:

| To | Charged | Departs | Customs possible |
| --- | --- | --- | --- |
| Estonia | $13.56 | **LV** | no |
| Latvia | $13.56 | **LV** | no |
| Spain | $13.56 | **ES** | no |
| United States | $12.42 | **US** | no |
| Brazil | $25.56 | **LV** | **yes** |

Every case `013` reasoned about in the abstract is there: Latvia→Estonia is the
intra-Community distance sale that goes in OSS; Latvia→Latvia and Spain→Spain
are the two domestic supplies, one covered by the SME scheme and one the
accepted exposure; and the export to Brazil is the only one Printful flags for
customs, which is exactly where §54(1)'s import-charge disclosure is owed. **A rate call that fails does not
guess** — §11 and §23 both bar an invented number, so the checkout says the rate
could not be fetched and does not proceed to payment.

### P7a — A shipping option Medusa can actually charge

**Repository:** `lousydeal`.
**Files:** `backend/src/modules/printful/fulfilment-provider.ts`, `medusa-config.ts`, a seed script, tests.

- [x] Turn a Printful quote into a line the buyer pays. **P7b** built the delivery configuration this row assumed, and **P7d** watched a real cart be offered it.

> **Also ticked prematurely, and found the same day.** The provider is written,
> registered and tested; `calculatePrice` asks P7's rate function and refuses
> to invent a figure. But a Medusa cart cannot *select* it, because nothing in
> this repository creates a **stock location, a fulfillment set, a service
> zone, a shipping profile or a shipping option** — `configure-commerce.ts`
> says so in as many words: "no stock location, no fulfillment set, and no
> shipping profile or option — this shop has no physical delivery yet."
>
> So `listCartShippingOptions` would answer with nothing, and P7's checkout
> would show `SHIPPING_UNAVAILABLE_NOTICE` for every parcel. The provider is a
> real provider with nothing pointing at it.
>
> **P7b** finishes it.

A quote is not a charge. A shipping-required Medusa cart needs a shipping option
backed by a registered fulfilment provider, and the quoted amount has to become
the cart's shipping method so that Stripe collects it and the order total agrees
with what the buyer was shown. §7 lists "fulfillment creation" among the things
to handle, and this is it.

The provider is calculated-price, not flat: `calculatePrice` asks P7's rate
function. It fulfils nothing itself — P8 does that — but it is what makes the
fulfilment a real Medusa fulfilment rather than a side effect.

### P6b — The merch seed target, which P6 left as a seam

**Repository:** `lousydeal`.
**Files:** `backend/src/scripts/seed-merch.ts`, `package.json`, tests.

- [x] A `MedusaMerchSeedTarget`, and a command that runs it.

Mirrors `MedusaProductSeedTarget`: look up by handle, create or update, never a
bare create. It differs in three ways and each is why it is not a copy —
several variants per product rather than one, a `Size` option, and the Printful
mapping carried in variant metadata.

**It also has to settle the unit conversion.** `seed-product.ts` stores
`amountMinor / 100` and `money.ts` records why: every amount the storefront
formats is a major-unit decimal. This row does the same and says so, because
P9c found the postage path doing the opposite.

### P7b — A shipping option a cart can actually select

**Repository:** `lousydeal`.
**Files:** `backend/src/scripts/configure-commerce.ts`, tests.

- [x] The delivery configuration P7a assumed and nothing built.

Four new record kinds in `commerceRecords`, in dependency order: a stock
location, a fulfillment set with a service zone over the same worldwide country
list the region uses, the `merch` shipping profile `seed-merch.ts` already
names, and a shipping option bound to `PRINTFUL_FULFILMENT_IDENTIFIER` with a
**calculated** price type — flat would be wrong everywhere except one
destination, which is the argument `fulfilment-provider.ts` already makes.

**The certificate must not acquire a shipping step**, which is constraint 4
again: the tiers are seeded into no shipping profile, and a cart holding only a
certificate must still reach payment without an address.

### P7c — The postage units, settled by measurement

**Repository:** `lousydeal`.
**Files:** `backend/src/modules/printful/shipping.ts`, `fulfilment-provider.ts`, tests.

- [x] Charge what Printful quoted, on the scale Medusa reads.

`chargeForRate` returned `Math.ceil(gross * 100)` — minor units — into a
`calculated_amount` every other amount on that path treats as major. A $5.22
rate to Estonia became `663`, which a cart reads as **$663.00 of postage**.

**Settled by reading Medusa, and then measured.**
`list-shipping-options-for-cart-with-pricing.js:320-338` builds a shipping
option's `amount` from two branches into one field — a **flat** option from the
pricing module's `calculated_amount`, a **calculated** one from whatever the
provider returned — so the two are necessarily on one scale, and `money.ts`
already established which. P7d then put a mug in a real cart: `item_total` 15,
`shipping_total` **6.93**, `total` 21.93.

**This row's record did not land when the row did**, and Gate D found it. The
commit touched four source files and neither document; the `str.replace` that
was meant to tick it matched nothing and said nothing, and the PR body claimed
a record that did not exist.

### P7d — What a real boot found

**Repository:** `lousydeal`.
**Files:** `backend/src/modules/printful/fulfilment-provider.ts`,
`backend/src/scripts/configure-commerce.ts`, tests.

- [x] Run the whole thing once, against Postgres, Redis and a live Printful.

Everything from P6b back to P7a had only ever met fixtures. One boot found
**four things**, three of which stopped the application dead:

1. **The provider module exported a bare class.** Medusa reads `services` off a
   provider module and iterates; a class is not iterable, so a deployment with
   a Printful token dies at startup with `moduleProviderServices is not
   iterable`. Nothing caught it for four rows because §23 keeps the token out
   of every deployment — **the first boot with one was the first boot that
   could fail**.
2. **The provider id is `printful_printful`, not `printful`.** Medusa composes
   it from the service's `static identifier` and the module option `id`, the
   way its own `manual_manual` is composed. `configure:commerce` refused with
   `Could not resolve 'fp_printful'`.
3. **The provider has to be linked to the stock location**, separately from the
   sales channel. Without it, `validate-fulfillment-providers.js` refuses to
   create the option: "Providers (printful_printful) are not enabled for the
   service location".
4. **P7b's reason for constraint 4 was wrong.**
   `list-shipping-options-for-cart.js:203-208` filters on the fulfillment set
   and the address only; `shipping_profile_id` is selected as a field and is
   **not a filter**. A certificate-only cart with an address *is* offered
   Postage. What keeps postage off it is the storefront never asking
   (`cartNeedsAddress` is false) and `calculatePrice` refusing — measured: a
   500, not a charge. The comment and the test now say so.

**And the measurement P7c was written for.** A cart holding one mug, delivered
to Tallinn:

| | |
| --- | --- |
| `item_total` | **15** |
| `shipping_total` | **6.93** |
| `total` | **21.93** |

Major units, end to end. Before P7c that postage read **693**, which the
checkout would have shown as $693.00 on a $15 mug.

Two other rows confirmed against the live Store API at the same time:
`*variants.metadata` **does** arrive, carrying `printful_variant_id` on the four
merch products and on none of the three tiers (P9a's discriminator, whose
failure mode was silence); and every price comes back in major units — 5, 10,
25 for the tiers and 32, 15, 29, 6 for the merch (P6b's conversion).

### P8 — The order reaches Printful

**Repository:** `lousydeal`.
**Files:** `backend/src/subscribers/order-placed.ts`, `backend/src/modules/printful/submission.ts`,
`backend/src/modules/deal/models/printful-submission.ts`, tests.

- [x] **P8a** — the exactly-once argument, the table, and the submission logic.
- [x] **P8b** — the three order methods, and confirmation.
- [x] **P8c** — the subscriber, the Privacy Policy paragraph, and the guard P11 wrote.

**Three facts measured against the live API on 2026-09-09, and each changed the
design.** The plan said "a unique index plus `external_id`", and the first of
these is why the index alone would not have been enough.

1. **Printful enforces `external_id` uniqueness.** Creating the same one twice
   answers `HTTP 400 … "Order with this External ID already exists"`,
   `api_error_code: OR-13`. The field is documented only as "Order ID from the
   external system", so this was established rather than assumed. It is the
   constraint the whole argument rests on: a local index cannot stop a second
   charge after a crash between the call and the write, because the fact to be
   remembered was created somewhere else.
2. **v2 cannot order what this store sells.** `POST /v2/orders` refuses
   `source: "sync"` — "Source must be one of: catalog, warehouse,
   product_template". Ordering through v2 would mean re-specifying the artwork
   per order, which is the same artwork described twice and free to drift from
   the pinned print files. **v1 takes `sync_variant_id`**, so P8 uses v1 to
   create while `shipping.ts` uses v2 for rates.
3. **Deleting an order cancels it and keeps the external id taken.** So a
   successful look-up does not mean the item is coming, and `canceled` is a
   recorded state rather than an absence.

**A created order is a `draft`** and nothing prints a draft. **P8b closed
this**, and the shape it chose is the point: confirmation stays a *separate*
call rather than a `?confirm=1` on the create, and a draft maps to `failed`
rather than to `submitted`.

That makes a draft **retryable**. A crash between creating and confirming
leaves an order the next redelivery finds by `external_id` and confirms; an
atomic create-and-confirm would make that same crash indistinguishable from one
that never created anything. The order is placed either way, so a failed
confirmation is recorded and **not** rethrown — throwing would be right if
nothing had happened.

**A SKU resolves through the join `sync.ts` already made.** That file sets each
sync variant's `external_id` to the SKU, so `GET /store/variants/@{sku}` answers
directly — measured. Nothing new is stored, and the mapping cannot drift from
the products because it is them.

**P8b also has to fix a guard P11 wrote.** `third-party-disclosure.test.ts`
ties the Privacy Policy's "does not yet hand its orders over for printing" to
`createFulfillment` being inert — but P8b wires the **subscriber**, and
`createFulfillment` stays inert. **The guard would pass while the sentence
became false.** It has to key on the subscriber's path instead.

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

- [x] **P9a** — tell the two catalogues apart, which nothing did.
- [x] **P9b** — adding a certificate must not delete the merch.
- [x] **P9c** — the upsell, in the identity, claiming nothing that is not measured.

`TERMS_OF_OFFER` line 3 is corrected with it, which P10b recorded as this
row's debt: "nothing is added at checkout" stayed true only until there was
something to add.

**Two things found while building it, both money and neither in this row's
scope:**

1. **`MerchSeedTarget` has no Medusa implementation.** `seedMerch` takes a
   seam and nothing satisfies it, so the four products have never been created
   in Medusa and cannot be. That is why P9a's defect was latent rather than
   live. A row has to write the target, and it is the row that must also settle
   (2).
2. **The unit conversion is unsettled for merch, and looks wrong for
   postage.** `seed-product.ts` stores `amountMinor / 100`, and `money.ts`
   records the research: every amount the storefront formats is a **major-unit
   decimal**. `chargeForRate` returns `Math.ceil(gross * 100)` — minor units —
   and `fulfilment-provider.ts` hands that to Medusa as `calculated_amount`.
   **If Medusa reads a fulfilment provider's calculated price on the same scale
   as a product price, a $5.22 rate is charged as $663.00.** P7a's own test
   asserts `663` as correct. Not fixed here: it needs a live cart to confirm
   which scale Medusa applies, and guessing at a money bug is how the first one
   arrived.

**A second defect of the same family**, found the same way. `addToCart`
removed *every* line before adding the chosen tier. "Replace what is in the
cart" and "keep at most one certificate" were the same sentence while a
certificate was the only thing sold; they are not now. A buyer with a mug in
the cart, changing their mind about which tier they wanted, would have had the
mug deleted — by a control labelled `ACQUIRE`, with nothing on the page saying
so. Only certificate variants are cleared now, decided from `listTiers`.

**A defect found while starting this row, and it outranked the upsell.**
`listTiers` fetched `/store/products` with **no filter** and called every
product a tier. Harmless while the store held three certificates; a defect the
moment `seed-merch.ts` ran:

- the home page offers a Gildan shirt as a tier, with `VALUE` zero, `RETURN
  -100%` and an empty description;
- **`checkout/page.tsx` derives `certificateHandles` from that same call**, so a
  mug counts as a certificate — `cartNeedsAddress` returns false, no address is
  asked for and no postage is quoted;
- `isPayableCart` reads a certificate and a mug as two certificates and refuses
  payment.

Every rule P7 and P10c built is defeated by it, and **every test passed**,
because each of those tests passes its handle list in by hand.

The two are told apart by the Printful mapping `seed-merch.ts` writes on every
variant, not by a list of handles — a handle list in the storefront would be a
second copy of `catalogue.ts`, free to drift the day a product is added, and
drifting silently.

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

- [x] Correct every document that currently describes a shop with one digital product.

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

  **The last clause of that draft was not used**, for the § 56¹(3) reason above:
  with one delivery method there is nothing dearer to have chosen, and the
  sentence would have understated the refund by capping something that cannot
  be exceeded.

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
  | ~~Capped at the cheapest ordinary delivery offered~~ — **misread.** It bites only where the buyer *expressly chose* a method other than the cheapest ordinary one offered. This shop offers one method, so the whole postage is refunded | **§ 56¹(3)** |
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
- **Non-conformity.** ~~§ 62¹¹'s two years applies to goods too~~ — **wrong, and
  the row corrected it.** § 62¹¹ is headed *digitaalse sisu või digitaalse
  teenuse* and sits in the division § 62⁵ confines to digital content and
  digital services. The provision for a thing in a parcel is **§ 218(2)**, with
  § 218(2²)'s one-year presumption, § 220(1)'s two months to notify, § 222 and
  § 223's remedies, and § 237(1) where the certificate has § 62²²(1). The number
  two years is the same under both, which is what made the wrong citation read
  perfectly.

**The offer page's own terms are P9's, not this row's.** `TERMS_OF_OFFER`
line 3 says "nothing is added at checkout", and that stays true until the
upsell exists to add something. Correcting it now would describe a mechanism
this repository does not have, which `terms.ts` bans in as many words. **P9
owns it, and P9's Gate D should fail if it ships without it.**

**No sentence in this row is written to be clever.** Where the answer is
uncomfortable — and at least one is — the document says the uncomfortable thing,
which is the standard the refunds document already set.

### P11 — A third party, and a stranger's address

**Repository:** `lousydeal`.
**Files:** `storefront/src/content/legal/privacy.ts`, `imprint.ts`, `storefront/tests/third-party-disclosure.test.ts`, `legal-privacy.test.ts`.

- [x] Say who now receives a buyer's address, and on what basis.

**Two facts the row would have got wrong from memory, both checked against
primary sources.** Printful is **not** in the EU–US Data Privacy Framework — its
certification was withdrawn in 2021 and the Framework's own list records it
inactive — so its transfers rest on the 2021 standard contractual clauses alone,
and the natural edit of adding a third name to the sentence about Stripe and
Cloudflare would have been false. And the Article 28 agreement is **held by
incorporation**: Printful's Data Processing Terms form part of its Terms of
Service, so acceptance concluded it and there is nothing countersigned.

**Its terms are silent on carriers** — not "sub-processor", not "independent
controller", silent. §5 says what a carrier receives and declines to classify
the relationship, rather than picking the reading that sounds tidier.

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

- [x] **P11a** — the webhook, verified, and the parcel's status recorded.
- [x] **P11b** — the one email carrying the tracking number. **P11a is complete, and with it every build row of LD-04.**

**Sent once, by two guards that do different jobs.** The submission row is read
before it is written, so a redelivery against one already marked
`shipment_sent` records and says nothing — cheap, and it covers the ordinary
retry. The notification's idempotency key covers two deliveries arriving
together, which the read cannot, and Medusa enforces it inside a transaction.

**It promises no arrival date and says why.** Constraint 7, and the same rule
P9c applies to the shelf. Silence would read as an oversight in the one message
a buyer opens looking for exactly that.

It works with no tracking number, which is the ordinary case for the first
hours, and says so rather than printing an empty line.

**v2 webhooks, and that is the whole reason for v2 here.** Event signing was
introduced with them; a v1 endpoint carries no signature at all, so it is a URL
that marks orders shipped for anybody who learns it. Printful's own spec says
to ignore an event whose signature is missing or invalid.

**Two details that would each have produced a silent failure.** The secret is
returned as *the hexadecimal representation of the key* and has to be decoded
before it is used — keying with the string rejects every genuine event, and
looks like a Printful outage. And the signature is over the **raw** body:
`JSON.parse` then `JSON.stringify` moves whitespace and unescapes, so Medusa is
asked to preserve the raw body for this one path.

**Returned to sender and lost in transit** are `shipment_returned` and the
absence of anything, and the answer to both is a person reading the Imprint
address. P7d settled the liability: risk stays with the trader until the parcel
reaches the buyer's hands.

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

- [x] **P14a** — a destination VAT rate per member state.
- [x] **P14b** — the postage grossed up at the buyer's own rate.
- [x] **P14c** — the two counters decision `013` asks for. **P14 is complete.**

`npm run report:vat-thresholds [year]` — a command an operator runs, not a job
and not an alert. A scheduled warning nobody reads is worse than a number
somebody asks for, and Union turnover reaching €100,000 develops over months.

**Two things it over-counts on purpose**, because over-counting a threshold
warns early and under-counting warns after the letter:

- **Latvian supplies** are every order delivered to Latvia, whatever Printful
  printed it in. What the €50,000 threshold measures is supplies *located*
  there — dispatched from Latvia and delivered to Latvia — and the dispatch
  country is answered by the shipping quote and stored on no order.
- **An order with no address counts as domestic.** A certificate is supplied
  where the trader is, and it is most of what this shop sells; leaving it out
  would understate the one threshold that ends the scheme.

**And one thing it refuses.** The totals are in the store's currency and the
ceilings are in euro. Converting needs an ECB rate for a stated date, which the
report does not have and will not invent — so it reports the currency it
counted in, states the ceilings in euro, and says the comparison warns early
while a unit of the store's currency is worth less than a euro. A
foreign-currency order is counted at face value and flagged rather than
dropped, because dropping understates.

**P14b.** The gross-up used `WORST_VAT_RATE` — Hungary's 27% — for every EU
buyer, "for the same reason the shelf prices are derived at it: one number,
safe everywhere, and no rate table to go stale". P14a built the table, so the
argument is spent.

**And the sentence defending it had the direction wrong.** It said the
over-recovery was "at most ten points against a buyer in Luxembourg, which is
the direction that cannot hurt anybody". It is the buyer who is hurt: a larger
gross-up is a larger charge, so a Luxembourg buyer at 17% paid ten points of
postage nobody owed and the merchant kept it.

`catalogue.ts`'s `WORST_VAT_RATE` is untouched and still worst-case, because a
**margin floor** wants the worst case and a **charge** wants the true one.

**P14a.** `tax-model.ts` said "One rate, not twenty-seven" and charged every EU
destination Estonia's 24%, on the Article 59c threshold reading `008` records.
Decision `013` reopened it: the operator registered for the Union OSS on
2026-09-09, and OSS *is* destination-rate taxation.

Because prices are tax-inclusive and the merchant absorbs the VAT, **no buyer
pays differently** — what was wrong is the figure reported to each member state
through the Estonian OSS return.

**The rates take effect 1 October 2026**, not on merge: Art 57d of Implementing
Regulation 282/2011 starts the scheme on the first day of the quarter after
application, and EMTA carries the same rule with an on-point example. §23 is
what makes shipping them early safe — this deployment can make no supply before
then, having no live payment keys.

Three things it does not answer, all in `status.md`: TEDB has not been read
directly, the special territories are wrong in both directions, and Northern
Ireland needs two answers for one postcode.

Decision [`013`](../decisions/013-the-vat-arrangement.md) is the arrangement and
this row implements it: everything filed in Estonia — the KMD and a Union OSS
return — plus the small-enterprise scheme's `EX` number for supplies located in
Latvia. **No other country's registration is taken and no country is blocked.**
Spain's fulfil-and-deliver-inside-Spain case and the United Kingdom are recorded
there as decisions rather than coverage; the UK is settled on a first-sale basis
and blocks nothing.

This row builds three things, none of which is a tax filing:

1. **Two counters**, measured rather than estimated — §11's rule applies to a
   number the operator acts on as much as to one a visitor reads. Union turnover
   against the small-enterprise ceiling of €100,000, and Latvian supplies
   against €50,000. Crossing the first must reach EMTA within 15 working days
   and costs the scheme for the following year, so it is watched rather than
   discovered.
2. **A destination VAT rate per member state**, because the reported figure is
   computed backwards out of a tax-inclusive price at the buyer's rate, and
   **the shipping quote grossed up** by it — Art 78(b) puts transport inside the
   taxable amount, so passing Printful's charge through ungrossed loses about a
   fifth of it every time.
3. **The pre-contractual sentence for buyers outside the EU and the UK**, saying
   they may owe local import charges. § 54(1) requires it before the ordering process
   begins, and it is the honest form of `PRICE_NOTICE`'s "the amount shown is
   the amount charged" — which P10 also has to reconcile.
4. **The cost line P4 was missing.** Printful charges its own VAT on orders it
   fulfils in Latvia, Spain, the UK and Northern Ireland. An Estonian
   registration does not recover that through the Estonian return, and a
   Directive 2008/9 reclaim is not worth filing at this volume, so it is simply
   a cost. **Measured from a real invoice before the margin table is trusted**,
   not assumed — the last two versions of that table were wrong.

**This row no longer blocks Gate E.**

### P12 — Gate D

**Repository:** `lousydeal`.
**Files:** the findings, in this document.

- [x] Review every row against the contract, §23, and the legal position.

Two adversarial reviewers, one on the money and correctness paths and one on
the legal and disclosure surfaces, plus my own audit of the plan's own claims.
**Twenty-one findings.** The shape of them, before the list: the statute work
P10 and P11 did is sound — a reviewer read every citation against the in-force
redaction and found none wrong — but **three whole surfaces escaped the sweep**,
and the guard that exists to catch exactly that has a frozen list.

### Fixed in P12a

1. **A merch-only cart could not be paid for, silently.** `handleSubmit` kept
   an unconditional `!consented` guard. P10c stopped rendering the consent box
   for a cart with no certificate and taught `payDisabled` to stop waiting for
   it — and did not touch the submit handler, so `consented` stayed `false`
   forever with no control that could change it. The button enabled, the click
   did nothing: no error, no request, no state. **Every merch-alone order — a
   state `isPayableCart` admits deliberately and P10c spent a row making
   lawful — was unpayable.** The guard's own comment records why it exists: a
   previous Gate D completed a cart with the box visibly unticked, because
   `form.requestSubmit()` ignores `disabled`. It stays, scoped.

2. **The province was collected and thrown away.** `readShippingContext`
   declared `province` and never read it, so `state_code` never reached
   Printful — which answers "State code is missing" for the United States and
   Australia, measured. The checkout demands the province in exactly those
   countries, marks it required, and blocks the quote until it is filled; the
   quote then discarded it and failed. **No US, AU, CA or JP buyer could buy
   merch at all.** Both halves were tested: `quoteShipping` with a `stateCode`
   handed in, `readShippingContext` with an Estonian address that needs none.
   The composition was tested nowhere.

3. **The § 55 confirmation named `items[0]`.** `certificateLine` finds which
   line is the certificate; `sendConfirmation` read the first one, a leftover
   from when there was only ever one. A buyer who added a mug before a
   certificate got a statutory confirmation reading `ITEM: This Mug Cost
   Extra`.

### Found and not yet fixed

- **4. Dissolved by an operator decision, in P12c.** The operator settled it on
  2026-09-09: **merch is an upsell**, so there is no order here that is only a
  mug. `isPayableCart` requires exactly one certificate now — it required at
  most one — and the shape this finding was about cannot be paid for. The
  surfaces that said a confirmation is sent are true again, because every order
  that can exist has a certificate to confirm.

  A cart that reaches the checkout without one is refused with a notice that
  says to **add** one, rather than the one telling a buyer with two to choose
  between them: two ways to be unpayable and two different things to do.

  The Store API's line-item route is public, so the state stays *reachable*.
  `order-placed.ts` treats an order that arrives without a certificate as the
  anomaly it now is — a **log line at error**, where it used to report the same
  thing at info and call it "a complete order" — because something was paid for
  and nothing issued. Not a throw: the merch still reaches Printful, since
  `submitMerch` runs before it and does not depend on it.

  **Superseded, not merely fixed.** LD-04 read §7's upsell as admitting three
  cart shapes and spent rows on the third: P10c hid the consent box for it, and
  this Gate D finding was about the § 55 confirmation it never got. One
  sentence from the operator removed the shape and the questions with it.

- **4a. Was:** **A merch-only order gets no § 55 confirmation at all**, and four surfaces
   say it does. `sendConfirmation` is reached only after the no-certificate
   early return. § 55(1) makes it due no later than delivery of the goods, so
   this is a breach on every merch-only order — asserted as discharged in
   Terms §5, Refunds §4, Privacy §3 and `EMAIL_HINT`.

- **5. Fixed in P12b.** **The confirmation misquotes the consent box, dropping the scoping.** It
   reproduces "I acknowledge that I will lose my right of withdrawal once
   supply has begun"; the box says "…**for that certificate** once supply has
   begun". P10c added that phrase precisely so no buyer could read the box as
   waiving anything about a mug. **The durable record claims the buyer signed
   the wider waiver** — an overstatement in the trader's favour on the one
   document a dispute turns on. Nothing compares the two constants.

- **6. Fixed in P12b.** **The confirmation's own copy was never updated for goods.** It states the
   withdrawal clock as running from conclusion (false for a printed item —
   § 56(1¹)); says "A numbered digital certificate, and nothing else of value"
   (false for a mixed order); says "nothing was added at checkout" (postage
   is); and still carries **the inverted €30 sentence** that Terms §12 and
   Refunds §8 were corrected to remove.

- **7. Fixed in P12d.** **The Imprint was never corrected.** §3 says "A numbered digital
   certificate, and nothing else of value" — Terms §2 now says two kinds of
   thing are sold. §4 carries the inverted €30 claim **and cites the Terms for
   it**, which is the document that explicitly retracts it. The banned-phrase
   guard is scoped to `REFUNDS` alone; the suite's own header says a guard
   aimed at one file is not a guard on a claim.

- **8. Fixed in P12d.** **Refunds §5 says "we send no email at all", and a test requires it.**
   False since LD-02, and the withdrawal route sends the § 56⁴(4) receipt —
   `withdrawals/route.ts` sends both copies and the page's own success text
   says so. `legal-refunds.test.ts` asserts the sentence, so **removing the
   falsehood fails the build**: the Backblaze shape the privacy suite warns
   about. It escaped the consistency guard because "we send no email at all"
   matches neither of its two patterns.

- **9. Fixed in P12d.** **Privacy §9 says "We hold no name".** False three ways: §4 of the same
   document says the order holds the delivery name, §6 says a gift recipient's
   name is held, and the withdrawal form stores one. The plan flagged §4 and §9
   together; §4 was corrected and §9 was not — in the section about exercising
   GDPR rights.

- **10.** **Terms §3 rests the certificate's VAT on a threshold decision `013` says
  was surrendered.** Registering for OSS gives up the Article 59c
  simplification, and P14a's destination rates take effect 1 October 2026.
  The buyer-facing consequence stays true; the stated reason will not be.

- **11.** **Terms §6 and Refunds §4/§6 disclaim the exception at different widths.**
  The Terms promise never to refuse on § 53(4) p 7¹ at all; Refunds §4
  disclaims only the third condition, and §6 says that where all three are
  met "there is nothing to return". A buyer reading one is promised something
  the other withdraws.

- **12. Dissolved by the upsell decision, in P12c.** Every payable cart holds a
  certificate now, so the box is a condition of ordering again and the
  unscoped sentences in Terms §4 and Refunds §4 are true. **Was:** **"It is a
  condition of ordering" is no longer true of every order.** P10c
  made the box conditional on the cart holding a certificate; Terms §4 and
  Refunds §4 both state the condition unscoped.

- **13.** **Privacy §3 enumerates "three things" and omits the inscription fields** —
  a name and a dedication, typed by the buyer, stored on the deal and
  **published**. Article 13 completeness, and a false count pinned by a test.

- **14. Fixed in P12d.** **The consistency guard's surface list is frozen at nine** and collects
  nothing LD-04 added: `GIFT_CONFIRMATION_NOTE`, `orderSummaryLines`'
  output, `POSTED_PRICE_NOTICE`, `ADDRESS_NOTE`, all of `merch.ts` — and the
  backend confirmation copy, which is outside the guard's repository half
  entirely. **That is where findings 5 and 6 survived undetected.**

- **15. Fixed in P12d.** **Baldrick still says "There is one product and I know most of it."**

- **16. Fixed in P12e.** **The `skipped` state hides a paid order that will never be printed.** A
  merch order whose address `recipientFrom` refuses records `skipped`, which
  is terminal and which the subscriber logs at no level at all. Buyer
  charged, nothing sent, no line anywhere, and no later attempt because
  `skipped` is settled. A test blesses it, calling the case "a bug upstream".

- **17.** **The Stripe session is created before the postage exists.** The session is
  initiated on mount against a goods-only total; attaching the shipping
  method changes the cart total, which by the code's own citation drops the
  session. Nothing re-initiates one. Either a confusing first-attempt failure
  on every merch order, or an authorisation for the goods without the
  postage. **Measure before Gate E.**

- **18. Fixed in P12g, and a third thing found with it.** **The pay gate accepts a stale quote.** The quote effect does not reset
  `shippingAmount` when a new quote starts, and `payDisabled` ignores
  `quoting` — so a buyer who edits the address and pays inside the window
  pays the old postage. Estonia to Brazil is $6.48 against a measured $25.56.

  A reviewer established what Medusa does with an attached method when the
  address changes: `refreshCartShippingMethodsWorkflow` runs unconditionally
  on every cart update and **re-prices or removes** the method, so the
  server-side outcome of paying on a stale quote is a *failed* payment rather
  than a wrong one — `handleSubmit` writes the address before `confirmPayment`.
  The window where it is neither is between `confirmPayment` and
  `completeCheckoutCart`: a quote landing there changes the total after the
  card is charged, Medusa answers a changed total by deleting the payment
  session, Stripe cannot cancel a *succeeded* PaymentIntent, and
  `deletePaymentSessionsStep` swallows that failure with a log line. The
  capture is then recorded against the new total. Closed from both sides: no
  submit starts while a quote is in flight, and no quote starts while a submit
  is.

  **And `paySubmitBlocked` did not take `shippingSettled` at all** — the
  parameter was `Omit`-ed away. The same `requestSubmit()` bypass this
  codebase has already patched once for consent could submit a merch cart
  with no method attached: the session still matches the goods-only total, so
  Stripe charges, and completion throws at `validate-shipping`. Charged and
  refunded for a parcel nobody could post. The two rules now take the same
  input, and the agreement sweep covers it.

- **19. Fixed in P12e.** **A late `shipment_sent` retry overwrites `shipment_returned`.** The route
  records whatever arrived without comparing `occurredAt` to the state it
  holds, and nulls `shipped_at` on every other event. Printful retries over
  about eighteen hours, so the ordering is not hypothetical.

- **20. Fixed in P12e.** **`order_failed` and `order_canceled` webhooks reach nobody.** The
  submission path calls these "the one outcome that has to reach a person"
  and logs at error; the same outcome arriving later by webhook is logged at
  info, leaves the local `status` at `submitted`, and tells no one.

- **21.** **Two stale doc comments on the money path that already had a 100× bug**,
  one directly contradicting the line above it, plus a superseded § 56¹(3)
  citation in `shipping.ts` that P10 corrected in the documents.

**And one finding about the record itself**, which is why the list above is
written out in full rather than summarised: **P7c's commit touched four source
files and neither document.** The `str.replace` meant to tick the row matched
nothing and said nothing, `git add -A` committed only what had changed, and I
read the test count instead of the diff. The plan still carried the bug in the
present tense and `status.md` still called the postage "unknown, and suspected
wrong by 100×". P11a's operator row failed the same way. Both corrected here;
the edits in this row were applied through a helper that **exits non-zero when
a replacement matches nothing**.

### P15 — Printful can reach the webhook

**Repository:** `lousydeal`.
**Files:** `storefront/src/app/api/store/[...path]/route.ts` and its tests.

- [x] **P15a** — a public path that resolves to the webhook.
- [ ] **P15b** — the Access bypass, in the infrastructure repository. *Operator.*
- [ ] **P15c** — the subscription, and the secret. *Operator.*

**P11a built a webhook nothing could reach.** Measured on 2026-09-09: an
unsigned POST to the Stripe hook path answers 200 from the origin, and the
same POST to `/webhooks/printful` answers a 302 to the Cloudflare Access
login. The backend has no public hostname at all — T10 and decision `010` —
and the storefront host is gated but for one narrow bypass, carved for Stripe.

**The shape, and the alternative it was chosen over.** The obvious move is to
give the backend its own hostname with an unauthenticated bypass. It **fails
open**: behind a bypass on that host there is no second gate, so a bypass
drawn one character too wide exposes the whole Medusa API, Admin included —
which is the blast radius decision `010` already names. Behind a bypass on the
*storefront* host there is `resolveStoreApiPath`, so the same careless bypass
exposes only what the resolver resolves. A regression there is a 404: lost
webhooks, retried for about eighteen hours and visible in logs, rather than an
exposed Admin. It also costs one literal instead of an `externalIPs` entry, a
port on the shared address, a NetworkPolicy rule and T13a's index-0 trap.

**And not by widening the `hooks` branch**, which was the first design. That
branch is admitted for one thing — Medusa core's payment webhook — and its
whole comment is about that one thing. Widening it would have meant either
relocating the backend route under `hooks`, moving a path
`printful-webhook.test.ts` pins in three places, or rewriting the path on the
way through and losing the property that the resolver returns the backend's
own spelling. `webhooks` is a sibling namespace holding exactly one path, the
same defensive shape one place over, and **the backend is untouched**.

**Both segments are compared undecoded**, and this gate is simpler than the
Stripe one for a stated reason: that branch decodes its provider segment
because Express resolves a route *parameter* with `decodeURIComponent`, so two
spellings are one request. Nothing in `/webhooks/printful` is a parameter.

**Two things the review found that the tests would not have caught.** The
existing Stripe delivery probe signs over canonical JSON — `JSON.stringify(JSON.parse(x))`
reproduces it byte for byte — so a re-serialisation in the forward path would
have passed it; the Printful probe uses a body with an escaped solidus, a
unicode escape, interior spaces and a trailing newline, and asserts the body
really is one that re-encoding changes. And nothing anywhere pinned the proxy's
literal against the backend's `preserveRawBody` matcher: if those two drift,
`req.rawBody` is absent, every genuine delivery answers 401, and it looks
exactly like a wrong secret.

Eleven mutations, eleven caught.

### P13 — Gate E

**Repository:** `lousydeal`.
**Files:** the record.

- [ ] Buy a shirt.

A real order on the test environment: certificate plus merch in one cart, a
Stripe test card, a real address, a real shipping quote, and a real Printful
order in the test store — **placed as a draft and cancelled, not confirmed**, so
nothing is printed and nobody is charged for a joke.

> **Gate D: this procedure is impossible as the code now stands.** P8b made
> confirmation part of submission — `submitPrintfulOrder` confirms a draft
> because a draft that nobody confirms is never printed, and leaving it
> unconfirmed was P8a's loose end. So a Gate E order would be **confirmed
> automatically**, which is the step that spends money.
>
> Three ways out, and the row has to choose one before it runs:
>
> 1. **Cancel immediately after.** Simplest, and it exercises the real path
>    including confirmation. Printful cancels rather than deletes and keeps the
>    external id — P8a measured that — so the order stays visible as
>    `canceled`, which is the honest artefact. Whether a confirmed-then-
>    cancelled order is billed is **not known and must be established before
>    the run, not after**.
> 2. **A test store with no billing attached**, where confirmation fails on its
>    own. Safe, but it verifies that confirmation is refused rather than that
>    it works — which is the half Gate E most wants to see.
> 3. **Do not confirm for this run**, by whatever narrow means, and accept that
>    the confirmation call is the one step Gate E does not exercise.
>
> The plan's own sentence — "nothing is printed and nobody is charged for a
> joke" — is the constraint. It was written before P8b and is still right.

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
