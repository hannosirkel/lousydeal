# LD-06 — Worse discounts

Let a buyer type a discount code, watch the total go up, and pay the higher
figure knowingly — with the increase a visible line everywhere a total is shown
before payment.

The contract is [`fresh-build.md`](./fresh-build.md); this slice executes its
§17 LD-06 line against §9 (Baldrick discount mechanics), §22 ("bad-discount
pricing"), §23 (legal and payment UX) and §24 (analytics). It builds on
[LD-04](./ld-04-merch.md)'s cart and [LD-05](./ld-05-baldrick.md)'s Baldrick,
both complete.

**The surcharge is a cart line, and that line is the whole design.** §9 already
settled the mechanism and this plan does not reopen it: an ordinary
custom-priced line item carrying `internal_type: "baldrick_surcharge"`, so
totals, tax, checkout and the order agree on one figure without a pricing
engine beside them. Not a Medusa promotion — "a promotion reduces a price. It
cannot raise one."

**Execution.** Directly, not through `big-build`. Eleven rows, one pull request
each, in `lousydeal` only. No `deploys` or `orange` change: no secret, no
environment value, no network destination. The codes are committed. §2a's
exception covers unlock keywords, and none of these unlocks anything.

## Decisions the operator took on 2026-09-10

| Question | Answer |
| --- | --- |
| How "asked Baldrick for a discount" is tracked | **It is not.** Tracking is server-side only: codes applied at the cart, orders paid with one, and which codes convert, read from Medusa's own line-item metadata. Baldrick still makes no network call, and his disclaimer and Privacy §2's "There is no analytics here" stay true unamended |
| What the certificate and the counter record | **The surcharge is included.** A $5 certificate bought with `BALDRICK20` reads `AMOUNT WASTED $6.00`, and the counter adds $6 |
| What a percentage is taken of | **The certificate line only.** Merch and postage are never surcharged, so adding or removing a mug never re-prices anything |
| Which of §9's mechanics ship | `BALDRICK20` +20%, `SAVE10` +10%, `FREE` a flat convenience fee, `BLACKFRIDAY` 0% off. The VIP unlock does not: the only thing to unlock is Enterprise, which §10 defers |

## Global constraints

LD-05's, carried forward. Constraints 1, 3 and 9 there are unchanged; what
follows is what this slice adds or sharpens.

1. **Never commit a secret.** Unchanged. None is introduced.
2. **One pull request closes one row**, 800 lines and 10 files, operator
   override by name. Unchanged.
3. **The price only goes up, and never silently.** A surcharge is zero or more.
   No code, no input and no rounding can produce a negative line. The line is a
   visible row on every page that shows a total before payment — the cart and
   the payment authorisation — and not only on the first. §23: "the surcharge
   is a visible cart line rather than a silent adjustment."
4. **The server decides the figure.** The storefront sends a code string and
   nothing else. The backend looks the code up in a committed table and prices
   it against the certificate line Medusa already holds. Nothing the browser
   sends is a price.
5. **VAT is inside the surcharge, never on top of it.** Decision `009` makes
   the advertised price what the buyer pays. Medusa defaults a variant-less
   line to tax-exclusive (facts, below), which would turn a $1.00 surcharge
   into $1.24 for an Estonian buyer. The line is written `is_tax_inclusive:
   true`, and that is asserted against a running Medusa, not a fake.
6. **A surcharge is neither a parcel nor a certificate, and every reader learns
   that before any writer exists.** Four functions classify cart and order
   lines by `product_handle` and treat a missing handle as merch. A surcharge
   line has no handle. So the rows that teach those readers land **before**
   the route that can create a surcharge — once a writer is deployed to test,
   the public can reach it.
7. **Baldrick is unchanged in kind.** LD-05's constraints 2, 5 and 7 stand: no
   network call, no figure, nothing stored. He names a code and says where to
   type it. The cart states what it costs. He cannot apply it, and must not
   say he has — the contract's example line "I've applied BALDRICK20" would be
   a claim about a cart he cannot see.
8. **Tracking is Medusa's own data.** No table, no event, no analytics host, no
   third party. §9 says the line's metadata "carries the analytics … without a
   second table to keep in step". §24's funnel events are LD-08's.
9. **A row that falsifies a tracked document carries it.** Four documents are
   false the moment a code works, and each is named in the row that falsifies
   it: `content/baldrick.ts`'s discount steps, `brand.md`'s worked example
   "There is a discount code. I have not finished it.", `terms.ts`'s "no fee
   … nothing whatever is added to it", and `home.ts`'s "The one thing that can
   be added at checkout is postage".
10. **One code per cart, and applying is idempotent.** Applying a code replaces
    any surcharge already there. Applying the same code twice leaves one line,
    not a line of quantity two.

## Current repository facts

Measured against `origin/main` at `b2f1861`, 2026-09-10.

| Fact | Where | Consequence for this slice |
| --- | --- | --- |
| The public add-line-item route accepts `variant_id`, `quantity` and `metadata` — no `unit_price` | `@medusajs/medusa/dist/api/store/carts/validators.js:55-58` | A visitor cannot create a custom-priced line through Medusa's own route. The surcharge needs this repository's own route, and constraint 4 holds by construction |
| `addToCartWorkflow` takes `unit_price` and sets `is_custom_price` when it is defined | `@medusajs/core-flows/dist/cart/workflows/add-to-cart.js:196-203` | The supported path §9 names exists in 2.20.1 |
| A variant-less line's `is_tax_inclusive` is `item.is_tax_inclusive ?? variant's` — `!!undefined`, so **false** | same, `:199-200`; `utils/prepare-line-item-data.js:53` | Constraint 5. Without the flag Medusa adds VAT on top |
| A variant-less line's `requires_shipping` is false unless set | `utils/prepare-line-item-data.js:27-29`; `steps/validate-shipping.js:48` | Completion does not demand a shipping method for a surcharge. Written `false` explicitly anyway, so a later Medusa default cannot change it |
| Custom-priced lines merge when metadata and `unit_price` match | `utils/find-matching-line-item.js:26-30` | Re-applying a code could make a quantity-two surcharge. The route removes before it adds (constraint 10) |
| Money on the wire is in major units; the seed divides `amountMinor` by 100 | `backend/src/scripts/seed-product.ts:122` | A surcharge is computed in major units and rounded to the cent. §9's `base_amount: 500` is an illustration in minor units, so the metadata key says which unit it holds |
| `cartNeedsAddress` treats a line with no handle as a parcel | `storefront/src/lib/checkout-rules.ts:154-156` | Constraint 6. An ordinary certificate with a code would ask for a postal address and a Printful quote, and the pay control would wait for postage that never arrives |
| `printfulSubmissionFrom` treats a line with no handle as merch | `backend/src/modules/printful/from-order.ts:166-172` | Constraint 6. Every surcharge would be counted `unorderable` and logged as a parcel arriving short |
| `certificateLine` takes the certificate line's own total | `backend/src/subscribers/order-placed.ts:163-168` | Under the operator's decision the surcharge line's total is added to `amountPaid`. It is P6a's constraint 10 again: the certificate's figure, never the order's |
| The cart renders every line as merchandise, and `Remove` only for merch variants | `storefront/src/app/cart/page.tsx:136-158` | A surcharge renders as an adjustment and is removable. Undoing a worse deal must be as easy as making it |
| The payment authorisation shows the total alone | `storefront/src/app/checkout/page.tsx:149-151` | Constraint 3. That ledger gains the surcharge row above the total |
| `addToCart` removes certificate lines by variant when the tier changes | `storefront/src/lib/cart-actions.ts:58-62` | A surcharge priced against the old tier would go stale. The action re-applies the code the old line carried |
| Baldrick is on `/`, `/deal/[handle]`, `/goods/[handle]` and `/cart`, never `/checkout` | `storefront/tests/baldrick-reach.test.ts` | The code field goes on the cart, beside him. LD-05's B6 recorded this adjacency so this slice would not have to discover it |
| The Terms say "no fee" and "nothing whatever is added"; the home fine print says postage is the one addition | `storefront/src/content/legal/terms.ts:125-126`, `storefront/src/content/home.ts:96` | Constraint 9. D8 |
| Privacy §2: "There is no analytics here" | `storefront/src/content/legal/privacy.ts:112` | Stays true under the operator's tracking decision. **This slice has no privacy row**, and D9 states why |
| Refunds and Withdrawal returns "everything you paid" | `storefront/src/content/legal/refunds.ts:251` | Already covers a surcharge. No change |
| The counter sums `amount_paid`; the VAT report sums `order.total` | `backend/src/api/store/deals/totals/route.ts:69`, `backend/src/commerce/vat-thresholds.ts:145` | The surcharge reaches the counter through issuance and nothing else. It is consideration, so the thresholds are already right to count it |

## Target exposure

Both environments, both behind Cloudflare Access. §23's legal gate precedes
publication and this slice does not close it.

**One new public write: a store route that puts a custom-priced line into a
cart named by its id.** The cart id is the bearer token, exactly as it is for
Medusa's own line-item route, which can already add a mug to anybody's cart
that id reaches. The worst a holder of someone else's cart id can do here is
make that stranger's deal visibly worse before they pay, with a `Remove` beside
it. The route refuses a negative figure, a completed cart and a cart with no
certificate. No new secret, no new environment value, no network destination.

## Completion criteria

| # | Criterion | Row |
| --- | --- | --- |
| 1 | Four codes price a surcharge from the certificate's price, never below zero, rounded to the cent | D1 |
| 2 | Every line reader treats a surcharge as neither parcel nor certificate: no address, no Printful line, no second certificate | D2, D3 |
| 3 | A code applied through the store route yields one tax-inclusive line and the total §9 prints, measured on a running Medusa | D4 |
| 4 | The cart takes a code with scripting off, shows the surcharge as an adjustment, removes it, and re-prices it on a tier change | D5 |
| 5 | The payment authorisation shows the surcharge row above the total | D3 |
| 6 | The certificate and the counter carry the surcharge; the § 55 confirmation says why the total is higher | D2, D6 |
| 7 | Baldrick issues `BALDRICK20` without a figure, a network call, or a claim to have applied it | D7 |
| 8 | An operator report answers how many carts took a code, how many paid, and which codes convert | D9 |
| 9 | No document still says nothing is added to the price | D7, D8 |
| 10 | Gate D on every row, Gate E on a real order with a code, and the record | D10 |

## Rows

Eleven. Each names its files and its one checkbox. **The order is a
dependency order and constraint 6 is why:** the pure table first, then every
reader, then the one writer, then what shows it.

### D0 — This plan

**Repository:** `lousydeal`.
**Files:** `docs/working/ld-06-discounts.md`, `docs/working/status.md`.

- [ ] Land the plan and move the resume point to it.

### D1 — The codes and their arithmetic

**Repository:** `lousydeal`.
**Files:** `backend/src/commerce/surcharge.ts`,
`backend/tests/surcharge.test.ts`.

- [ ] Price a surcharge from a code and a certificate price, as a pure
      function.

The committed table of four codes, a normaliser, and one function:
certificate unit price and code in, `{ unitPrice, title, metadata }` out, or
`null` for a code that is not one. No Medusa import, so every case is a plain
unit test. `commerce/` is where `product-model.ts` and `tax-model.ts` already
declare what the shop charges.

**Normalisation is trim and case, and nothing more.** `baldrick20` is the code;
`BALDRICK 20` is not. A code that forgives spacing starts forgiving spelling,
and a code that works when mistyped is one nobody chose.

**The metadata is §9's shape with its units named:** `internal_type`, `code`,
`base_amount` in major units (named so in the key), and `percentage` or
`fee_amount`, whichever applies. It is the analytics as well as the price
(constraint 8), so D9 reads exactly this and nothing else.

**Asserted:** `BALDRICK20` on $5, $10 and $25 gives $1.00, $2.00 and $5.00, and
`SAVE10` on $25 gives $2.50. `BLACKFRIDAY` gives $0.00. Rounding is half-up to
the cent. No input in a sweep of prices and codes produces a negative. An
unknown code is `null`, not zero. `FREE`'s fee is the one number this row
proposes rather than derives, and it is `OWNER MUST FILL` until the operator
names it.

`SURCHARGE_INTERNAL_TYPE` is exported from here. The storefront writes the
same string again in D3, because there is no shared package, and D3's test
holds the two equal the way `inscription-filter.test.ts` holds its block equal.

### D2 — The backend's readers learn the surcharge

**Repository:** `lousydeal`.
**Files:** `backend/src/subscribers/order-placed.ts`,
`backend/src/modules/printful/from-order.ts`,
`backend/tests/order-placed-surcharge.test.ts`,
`backend/tests/printful-from-order.test.ts`.

- [ ] Keep a surcharge out of Printful, and put it on the certificate it was
      priced against.

**Printful:** a line whose metadata says `baldrick_surcharge` is not posted, is
not counted `unorderable`, and does not make an order look like it has goods.
`hasPostedGoods` is derived from the same function, so the confirmation stops
claiming a parcel in the same change.

**Issuance:** `certificateLine` still finds exactly one certificate by handle.
A surcharge line is not one, so it never makes two. `amountPaid` becomes the
certificate line's total plus the surcharge lines' totals — the operator's
decision, and still never `order.total`, which would put a mug on the
certificate. The query gains `items.metadata`.

**Asserted** against orders shaped as Medusa returns them, `BigNumber` totals
included: a $5 certificate with a $1 surcharge issues at 6, and a mug alongside
changes nothing. A surcharge with no certificate issues nothing, exactly as a
mug alone does. A replayed event still issues one deal.

### D3 — The storefront's readers learn it, and the authorisation shows it

**Repository:** `lousydeal`.
**Files:** `storefront/src/lib/surcharge.ts`,
`storefront/src/lib/store-checkout.ts`,
`storefront/src/lib/checkout-rules.ts`,
`storefront/src/app/checkout/page.tsx`,
`storefront/src/content/checkout.ts`,
`storefront/tests/checkout-surcharge.test.ts`, `docs/current/brand.md`.

- [ ] Stop a surcharge asking for an address, and show it above the total
      before payment.

`getCheckoutCart` reads `metadata.internal_type` and `unit_price` per line.
`cartNeedsAddress` and `cartHasCertificate` skip a surcharge, and
`isPayableCart` keeps counting certificate units alone. That rule already
admits the shape, but it gains the test that proves so.

**The authorisation ledger gains the row §9 draws:** `Discount (BALDRICK20)`,
`+$1.00`, above `TOTAL`. The figure is Medusa's `unit_price` for that line,
formatted and not computed, the same rule `cart/page.tsx` states at its head. A
`+` is written because this is the one ledger on the site where a value adds
to the row beneath it.

**Why here and not only in the cart.** A buyer can arrive at `/checkout` by URL
or by the back button, and the page that takes the money is the one §23 is
about. A total that exceeds the tier's price with nothing on the page saying
why is the silent adjustment §23 forbids, even though the line is visible one
page earlier.

The label formatter lives in `lib/surcharge.ts`, beside the constant, so D5's
cart and this page print the same words.

**`brand.md` §4 specifies the adjustment row here, because this is the first
surface to render it.** That covers the label, its place above `TOTAL`, and the
`+` on its value. `brand.md` wins over a slice plan about what a surface says,
so a row that drew the adjustment before the identity described it would be
deriving its own permission. LD-05's B1 made the same argument.

### D4 — The route that applies a code

**Repository:** `lousydeal`.
**Files:** `backend/src/api/store/carts/[id]/surcharge/route.ts`,
`backend/src/workflows/apply-surcharge.ts`, `backend/src/api/middlewares.ts`,
`backend/tests/surcharge-route.test.ts`,
`backend/tests/smoke/store-api.test.ts`.

- [ ] Apply a code to a cart, server-priced and tax-inclusive, replacing any
      surcharge already there.

`POST /store/carts/:id/surcharge`, body `{ code }`, validated in
`middlewares.ts` as a string of bounded length. A workflow, locked on the cart
id as Medusa's own cart workflows are, that:

1. reads the cart and refuses one that is completed or holds no certificate;
2. prices the code with D1 against the certificate line's `unit_price`, and
   refuses one D1 does not know;
3. deletes any existing surcharge line (constraint 10);
4. adds one line with `unit_price`, `quantity: 1`, `is_tax_inclusive: true`,
   `requires_shipping: false`, D1's title and metadata;
5. returns the cart.

A refusal is `422` with a stable reason — `unknown_code`, `no_certificate`,
`completed` — that the storefront maps to copy. Status text is not parsed.

**The slice's only writer, and it waits for D2 and D3** (constraint 6). Once a
writer reaches test the public can reach it, so every reader must already be
merged.

**Verified on a running Medusa, not only by fakes.** The smoke suite gains a
case: a $5 cart in `EE` takes `BALDRICK20` and reads `total` 6 with one
surcharge line, `is_tax_inclusive` true, and `tax_total` inside the 6 rather
than beside it. Re-applying leaves one line. `BLACKFRIDAY` leaves a line at 0
that `validateLineItemPricesStep` accepts. An unknown code leaves the cart
byte-identical. That same run confirms `metadata` survives cart completion onto
the order line, which D2 and D9 depend on and which no unit test can show.

### D5 — The cart takes a code

**Repository:** `lousydeal`.
**Files:** `storefront/src/lib/cart-actions.ts`,
`storefront/src/lib/store-cart.ts`, `storefront/src/app/cart/page.tsx`,
`storefront/src/components/document/CodeForm.tsx`,
`storefront/src/content/checkout.ts`, `storefront/tests/cart-code.test.ts`,
`storefront/tests/cart-actions.test.ts`, `docs/current/brand.md`.

- [ ] Take a code at the order summary, show the surcharge as an adjustment,
      and let the buyer remove it.

**A form and a Server Action, so it works with scripting off.** Every purchase
path on this site does, and LD-05 kept Baldrick's arrival from changing that.
`applyCode` reads one field, as `cart-actions.ts`'s header requires of anything
it exports. Every export there is a public POST endpoint. A refusal redirects
to `/cart` with the reason in the query string, and the page renders the notice
from `content/`. No state is held anywhere else.

**The surcharge row is an adjustment, not merchandise.** It uses D3's label
and a `Remove` control, which `removeFromCart` already handles: the line id is
in the cart, and nothing about removing a surcharge needs a new path.

**A tier change re-prices it.** `addToCart` reads the code off any surcharge
line before replacing the certificate, then re-applies it through D4.
Otherwise a buyer who moves from $5 to $25 carries a $1 surcharge labelled 20%.
If the re-apply fails, the old line is removed rather than left wrong. The cart
is re-read from Medusa either way, so what it shows is what Medusa holds.

**`brand.md` §4's cart section gains the field.** It says "line items as ledger
rows … and one button", and a code field beside that button needs its
specification written where the identity lives: the label, the placement
(under the lines, above `PROCEED TO PAYMENT`), and the refusal notices. The
adjustment row's own specification landed with D3.

**Checked at 390px and with scripting disabled**, on the rendered page.

### D6 — The confirmation says why the total is higher

**Repository:** `lousydeal`.
**Files:** `backend/src/notifications/order-confirmation.ts`,
`backend/src/content/confirmation.ts`,
`backend/src/subscribers/order-placed.ts`,
`backend/tests/order-confirmation.test.ts`.

- [ ] Name the surcharge in the § 55 confirmation, beside the total it raised.

A buyer's durable record reads `ITEM: Lousy Deal` and `Total paid: $6.00`.
Without a line between them, the one document the law makes permanent is
the one that cannot explain its own figure. One line, in the paid section:
`Discount (BALDRICK20): +$1.00`. It loses nothing § 55(2) requires, and
`legal-consistency.test.ts` still passes unchanged. The gift message is not
touched: "Someone spent $6.00 on absolutely nothing for you" is already true.

### D7 — Baldrick issues the code

**Repository:** `lousydeal`.
**Files:** `storefront/src/content/baldrick.ts`,
`storefront/tests/baldrick-copy.test.ts`, `docs/current/brand.md`.

- [ ] Replace "not finished" with a code, and keep every guard LD-05 wrote.

The forward liability `content/baldrick.ts` records at its head, discharged.
The discount step names `BALDRICK20` and says to type it on the order summary,
and that it makes the deal worse. He does not say by how much — the cart does,
in a figure read from Medusa, which is LD-05's constraint 5 working rather than
being worked around. He does not say he has applied it, because he has not and
cannot.

**The figure guard admits the four code names verbatim, and nothing else.**
`BALDRICK20` contains digits and LD-05's guard refuses a bare amount. An
exception that matched "any word with a number in it" would be the guard
switched off. So the allowance is the four code names, written out in the test.
The same test reads D1's table and fails if the two lists ever differ, the way
D3's test holds the internal type equal across the workspaces.

**`brand.md`'s worked example is false the same day and changes in the same
commit** (constraint 9): "There is a discount code. I have not finished it. It
makes your deal worse." The contract's example, "I've applied BALDRICK20. Your
price is now 20% higher", is recorded as what he does not say, with the reason.

`SAVE10`, `FREE` and `BLACKFRIDAY` are not issued by him. They work because
somebody types them, which is the joke in the other direction.

### D8 — The documents stop saying nothing is added

**Repository:** `lousydeal`.
**Files:** `storefront/src/content/legal/terms.ts`,
`storefront/src/content/home.ts`, `storefront/tests/legal-terms.test.ts`,
`storefront/tests/home-page.test.ts`.

- [ ] Say that a code the buyer chooses to enter can raise the price, is shown
      as its own line, and can be removed before paying.

`terms.ts:125-126` says there is "no fee, and no charge you were not shown
before you paid" and that "nothing whatever is added" to a certificate's
price. The second half of the first sentence stays true and is the one worth
keeping. The rest is false once `FREE` adds a convenience fee. The clause
states:

- a code is optional and entered by the buyer;
- it raises the price and never lowers it;
- the increase is its own line, with its amount, before payment;
- it can be removed before paying;
- the total at the payment authorisation is the amount charged.

`home.ts:96` gains the second addition beside postage, in the same register.

**This does not close §23.** Whether a price increase labelled "discount" is
lawful, with the increase disclosed as its own line before payment, is the
question §23 reserves to the operator and a qualified human reader. §23 itself
already permits the mechanic on exactly those terms. The row states the
position and does not settle it.

### D9 — The report

**Repository:** `lousydeal`.
**Files:** `backend/src/commerce/discount-report.ts`,
`backend/src/scripts/report-discounts.ts`, `backend/package.json`,
`backend/tests/discount-report.test.ts`.

- [ ] Answer §9's three questions from Medusa's own data, and say plainly which
      one is not measured.

`npm run report:discounts`, in the shape of `report:vat-thresholds`: a pure
function over rows, a `medusa exec` script that queries them, and nothing that
schedules it.

| §9 asks | The report prints |
| --- | --- |
| how many customers asked Baldrick for a discount | `not measured`, and the operator decision that made it so |
| how many accepted a worse price | carts holding a surcharge line, completed or not, by code |
| which codes convert | orders carrying each code, against carts carrying it |

**Carts are counted, not visitors.** One person with two carts is two, and the
report says so rather than implying a population. §11's rule against
fabricated totals binds an operator's report too, because an operator will
repeat what it says.

**It runs in whichever environment it is invoked in**, and prints that
environment's name first. A test cart counted as a customer is §21 Gate F's
named failure. The report is never public and feeds no counter.

### D10 — Gate D, Gate E with a real code, and the record

**Repository:** `lousydeal`.
**Files:** the findings, in this document; `docs/working/status.md`.

- [ ] Review every row against the contract, pay with a code on the test
      environment, and read everything it produced.

Gate E, on the test environment carrying D1–D9, at 390px and desktop:

1. ask Baldrick for a discount, and type the code he gives on the order
   summary;
2. see the surcharge as its own row and the total §9 draws, then remove it and
   re-apply it with scripting off;
3. change tier and see it re-priced;
4. at the payment authorisation, see the row above the total;
5. pay, with a mug in the cart so Printful is exercised;
6. read the certificate — `AMOUNT WASTED` includes the surcharge;
7. read the counter, the § 55 confirmation's surcharge line, and the Printful
   submission, which must hold the mug and no surcharge;
8. read `report:discounts` against that environment.

## What this slice does not do

| Not done | Why |
| --- | --- |
| The VIP unlock | §10 defers Enterprise, the only thing it could unlock. A code that unlocked nothing would be a control that does nothing |
| Counting Baldrick's discount conversations | The operator's decision, 2026-09-10. It would need a network call LD-05 forbids, and it would make his disclaimer and Privacy §2 false |
| §24's funnel events, `bad_discount_issued` and `bad_discount_accepted` | LD-08 owns analytics. D9 answers §9's questions without an event pipeline |
| Surcharging merch or postage | The operator's decision: the certificate only |
| Stacking codes | Constraint 10. One per cart |
| Expiry, usage limits, per-customer codes | No usage yet justifies them. A code is a committed row, and changing one is a pull request |
| An admin screen for codes | Same. §25: no CMS for a tiny amount of copy |
| Medusa promotions | §9 forbids it: a promotion cannot raise a price |
| Closing the legal gate | The operator, with a qualified human reader. §23 |

## OWNER MUST FILL

| Value | Needed by | State |
| --- | --- | --- |
| `FREE`'s convenience fee, in dollars | D1 | the row proposes; the operator names it |
| Whether the Terms clause is acceptable | D8 | judgement, not a value; §23 reserves it |
| Whether Baldrick's discount lines read as him | D7 | judgement; the row proposes and the operator disposes |
