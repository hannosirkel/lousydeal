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
| How "asked Baldrick for a discount" is tracked | **It is not.** Tracking is server-side only: codes applied at the cart, orders paid with one, and which codes convert, read from Medusa's own line-item data. Baldrick still makes no network call, and his disclaimer and Privacy §2's "There is no analytics here" stay true unamended |
| What the certificate and the counter record | **The surcharge is included.** A $5 certificate bought with `BALDRICK20` reads `AMOUNT WASTED $6.00`, and the counter adds $6 |
| What a percentage is taken of | **The certificate line only.** Merch and postage are never surcharged, so adding or removing a mug never re-prices anything |
| Which of §9's mechanics ship | `BALDRICK20` +20%, `SAVE10` +10%, `FREE` a flat $1.00 convenience fee, `BLACKFRIDAY` 0% off. The VIP unlock does not: the only thing to unlock is Enterprise, which §10 defers |
| Whether this slice may correct legal text a code makes false | **Yes, on the operator's authority, recorded here** — as LD-04's constraint 11 did. Decision `011` keeps the rule for every slice after LD-09. Whether the corrected wording is *right* stays reserved to §23's gate |

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
6. **A surcharge is a line with no variant, and nothing else is.** Metadata is
   not the test, because the public line-item routes let a visitor write
   metadata onto any line (facts). A line with no `variant_id` cannot be made
   by any of the three public writes — creating a cart with `items`, adding a
   line, updating one — and none of them can take a variant away. So the
   classifier is `variant_id === null`. The metadata supplies the code and base
   for display and tracking, never the identity. **One surcharge line, of
   quantity one**: the public update route can change its quantity, so the
   payability rule and issuance both refuse anything else rather than print
   `+$1.00` beside a total that rose by two.
7. **Every classifier of lines learns the surcharge before the writer lands.**
   The functions that decide address, Printful, payability and issuance land in
   D2 and D3, before D4's route — once a writer reaches test, the public can
   reach it. The cart page's rendering and the tier-change re-price land in D5,
   after D4. Between those two merges a surcharge is reachable only by a direct
   POST to the route. It renders as a plain line with no `Remove` control, and a
   tier change would strand it. That is untidy and not unsafe, and it is stated
   rather than hidden.
8. **The payment session follows the total.** Medusa's completion does not
   compare the captured amount with the cart's total (facts). What keeps them
   equal is the payment-collection refresh inside Medusa's own cart workflows.
   D4 composes those workflows rather than lower-level steps, so applying or
   removing a code refreshes the collection exactly as adding a mug does.
   **And it takes the cart lock itself.** A lock step inside a workflow run as
   a sub-workflow is skipped (facts), so the locks the two composed workflows
   carry do nothing there. Only the outer workflow's lock stops two applies,
   or an apply and Medusa's own line-item route, from interleaving.
9. **Baldrick is unchanged in kind.** LD-05's constraints 2, 5 and 7 stand: no
   network call, no figure, nothing stored. He names one code and says where to
   type it. The cart states what it costs. He cannot apply it, and must not say
   he has — the contract's example line "I've applied BALDRICK20" would be a
   claim about a cart he cannot see.
10. **Tracking is Medusa's own data.** No table, no event, no analytics host,
    no third party. §9 says the line's metadata "carries the analytics …
    without a second table to keep in step". §24's funnel events are LD-08's.
11. **A row that falsifies a tracked document carries it.** Five documents are
    false the moment a code works, and each is named in the row that falsifies
    it:
    - `content/baldrick.ts`'s discount steps;
    - `brand.md`'s worked example "There is a discount code. I have not
      finished it.";
    - `terms.ts`'s "no fee … nothing whatever is added to it";
    - `home.ts`'s "The one thing that can be added at checkout is postage";
    - `content/confirmation.ts`'s "no tax line, no fee, and no charge you were
      not shown", in the § 55 confirmation.
12. **The legal rows carry the operator's authority, recorded, or they do not
    run.** Recorded above. D6 and D8 are those rows.
13. **One code per cart, and applying is idempotent.** Applying a code replaces
    any surcharge already there. Applying the same code twice leaves one line.

## Current repository facts

Measured against `origin/main` at `b2f1861`, 2026-09-10, Medusa 2.20.1. Paths
under `@medusajs/` are in `backend/node_modules/`.

| Fact | Where | Consequence for this slice |
| --- | --- | --- |
| The public add-line-item route takes `variant_id` (required), `quantity` and `metadata` — no `unit_price` | `@medusajs/medusa/dist/api/store/carts/validators.js:55-59`; creating a cart with `items` requires one too, `:8-11,20` | A visitor cannot create a custom-priced line, nor any line without a variant, through any public write. Constraints 4 and 6 hold by construction |
| The public update-line-item route takes `quantity` and `metadata` | same, `:60-63` | Metadata is visitor-writable on every line, and a surcharge's quantity is too. Constraint 6 |
| `addToCartWorkflow` takes `unit_price` and sets `is_custom_price` when it is defined | `@medusajs/core-flows/dist/cart/workflows/add-to-cart.js:196-203` | The supported path §9 names exists in 2.20.1 |
| A variant-less line's `is_tax_inclusive` is `item.is_tax_inclusive ?? variant's` — `!!undefined`, so **false** | same, `:200-201`; `cart/utils/prepare-line-item-data.js:53` | Constraint 5. Without the flag Medusa adds VAT on top |
| A variant-less line's `requires_shipping` is false unless set | `cart/utils/prepare-line-item-data.js:27-29`; `cart/steps/validate-shipping.js:48` | Completion does not demand a shipping method for a surcharge. Written `false` explicitly anyway, so a later Medusa default cannot change it |
| Existing lines are matched for merging by `variant_id` first | `cart/steps/get-line-item-actions.js:28-40` | A variant-less line matches nothing, so re-applying without removal would leave **two** surcharge lines. D4 removes before it adds (constraint 13) |
| Completion captures the payment session's own amount and never compares it with the cart's total | `cart/workflows/complete-cart.js:40-44` | Constraint 8. A total changed without a refresh is charged at the old figure |
| `addToCartWorkflow` and `deleteLineItemsWorkflow` each run `refreshCartItemsWorkflow`, which refreshes the payment collection | `cart/workflows/add-to-cart.js:253`, `line-item/workflows/delete-line-items.js:41`, `cart/workflows/refresh-cart-items.js:184` | Composing these two keeps the session honest. D4 |
| Both carry a lock step (`add-to-cart.js:95`, `delete-line-items.js:35`), but a lock step **run inside a sub-workflow returns `skip()`** | `locking/steps/acquire-lock.js:27-29`, `locking/steps/release-lock.js:25-27` | Composed inside D4's workflow, neither locks anything. D4 acquires and releases the cart lock itself (constraint 8) |
| An order line is built by `prepareLineItemData`, which copies the cart line's metadata | `cart/utils/prepare-line-item-data.js:54` | The code and base reach the order for D2 and D9. Confirmed live in D10, not in the smoke suite, which never completes an order |
| The smoke suite never reaches Stripe, and Stripe is the only payment provider | `backend/tests/smoke/store-api.test.ts:28-33`, `backend/src/config/payment.ts` | D4's smoke case can price a cart. It cannot complete one |
| Money on the wire is in major units, with two decimals; the seed divides `amountMinor` by 100 | `backend/src/scripts/seed-product.ts:122` | D1 computes in integer cents and returns major units. The metadata key says which unit it holds |
| `cartNeedsAddress` treats a line with no handle as a parcel | `storefront/src/lib/checkout-rules.ts:154-156` | An ordinary certificate with a code would ask for a postal address and a Printful quote, and the pay control would wait for postage that never arrives. `cartHasCertificate` (`:171-173`) already excludes a null handle |
| `printfulSubmissionFrom` treats a line with no handle as merch | `backend/src/modules/printful/from-order.ts:166-172` | A surcharge would count `unorderable`, and a certificate-and-surcharge order would be recorded `failed` (`submission.ts:252-261`) and retried on every redelivery |
| `certificateLine` takes the certificate line's own total | `backend/src/subscribers/order-placed.ts:163-168` | Under the operator's decision the surcharge line's total is added. It is LD-04's constraint 10 again: the certificate's figure, never the order's |
| The store cart's default fields carry `items.unit_price` and not `items.total` | `storefront/src/app/cart/page.tsx:11-15` | The storefront prints a surcharge's `unit_price`, which is its figure only because constraint 6 makes its quantity one. The backend reads `items.total` |
| The cart renders every line as merchandise, and `Remove` only for merch variants | `storefront/src/app/cart/page.tsx:136-158` | A surcharge renders as an adjustment and is removable. Undoing a worse deal must be as easy as making it |
| The payment authorisation shows the total alone | `storefront/src/app/checkout/page.tsx:149-151` | Constraint 3. That ledger gains the surcharge row above the total |
| `addToCart` removes certificate lines by variant when the tier changes | `storefront/src/lib/cart-actions.ts:58-62` | A surcharge priced against the old tier would go stale. The action re-applies the code |
| Baldrick is on `/`, `/deal/[handle]`, `/goods/[handle]` and `/cart`, never `/checkout` | `storefront/tests/baldrick-reach.test.ts` | The code field goes on the cart, beside him. LD-05's B6 recorded this adjacency |
| The Terms, the home page and the § 55 confirmation each say nothing but postage is added | `storefront/src/content/legal/terms.ts:125-126`, `storefront/src/content/home.ts:96`, `backend/src/content/confirmation.ts:118-121` | Constraint 11. D6 and D8 |
| Privacy §2: "There is no analytics here" | `storefront/src/content/legal/privacy.ts:112` | Stays true under the operator's tracking decision, so this slice has no privacy row |
| Refunds and Withdrawal returns "everything you paid" | `storefront/src/content/legal/refunds.ts:251` | Already covers a surcharge. No change |
| The counter sums `amount_paid`; the VAT report sums `order.total` | `backend/src/api/store/deals/totals/route.ts:69`, `backend/src/commerce/vat-thresholds.ts:145` | The surcharge reaches the counter through issuance and nothing else. It is consideration, so the thresholds are already right to count it |

## Target exposure

Both environments, both behind Cloudflare Access. §23's legal gate precedes
publication and this slice does not close it.

**One new public write: a store route that puts a custom-priced line into a
cart named by its id.** The cart id is the bearer token, exactly as it is for
Medusa's own line-item routes, which can already add a mug to any cart that id
reaches. The worst a holder of someone else's cart id can do here is make that
stranger's deal visibly worse before they pay, with a `Remove` beside it. The
route refuses a completed cart and a cart with no certificate, and D1 cannot
produce a negative figure. No new secret, no new environment value, no network
destination.

## Completion criteria

| # | Criterion | Row |
| --- | --- | --- |
| 1 | Four codes price a surcharge from the certificate's price in integer cents, never below zero | D1 |
| 2 | Every classifier treats a variant-less line as a surcharge: no address, no Printful line, no second certificate, and a second surcharge or a quantity above one refused | D2, D3 |
| 3 | A code applied through the store route yields one tax-inclusive line and the total §9 prints, measured on a running Medusa, through workflows that refresh the payment collection | D4 |
| 4 | The cart takes a code with scripting off, shows the surcharge as an adjustment, removes it, and re-prices it on a tier change | D5 |
| 5 | The payment authorisation shows the surcharge row above the total | D3 |
| 6 | The certificate and the counter carry the surcharge; the § 55 confirmation names it and stops saying nothing was added | D2, D6 |
| 7 | Baldrick issues `BALDRICK20` without a figure, a network call, or a claim to have applied it | D7 |
| 8 | An operator report answers how many carts took a code, how many paid, and which codes convert | D9 |
| 9 | No document still says nothing but postage is added to the price | D6, D7, D8 |
| 10 | Gate D on every row, Gate E on a real order with a code, and the record | D10 |

## Rows

Eleven. Each names its files and its one checkbox. **The order is a
dependency order, and constraint 7 is why:** the pure table first, then every
classifier, then the one writer, then what shows it.

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

**Integer cents, not floats.** The certificate's major price times 100 is exact
because the seed writes two decimals. The percentage is applied to that integer
and rounded half-up there, then divided once on the way out.
`Math.round(x * 100) / 100` on a float is not half-up at binary boundaries.

**The metadata is §9's shape with its units named:** `internal_type`, `code`,
`base_amount` in major units (named so in the key), and `percentage` or
`fee_amount`, whichever applies. It is the analytics as well as the display
(constraint 10), so D9 reads exactly this. It is not what identifies the line
(constraint 6).

**Asserted:** `BALDRICK20` on $5, $10 and $25 gives $1.00, $2.00 and $5.00.
`SAVE10` on $25 gives $2.50. `FREE` gives $1.00 on every tier, and
`BLACKFRIDAY` gives $0.00. No input in a sweep of two-decimal prices and codes
produces a negative. An unknown code is `null`, not zero.

### D2 — The backend's classifiers learn the surcharge

**Repository:** `lousydeal`.
**Files:** `backend/src/subscribers/order-placed.ts`,
`backend/src/modules/printful/from-order.ts`,
`backend/tests/order-placed-surcharge.test.ts`,
`backend/tests/printful-from-order.test.ts`.

- [ ] Keep a surcharge out of Printful, and put it on the certificate it was
      priced against.

A surcharge is a line with no `variant_id` (constraint 6), and the query gains
`items.variant_id` and `items.metadata`.

**Printful:** a surcharge is not posted and not counted `unorderable`, so a
certificate-and-surcharge order is recorded `skipped`, not `failed`.
`hasPostedGoods` needs no change, since it already counts only posted lines.

**Issuance:** `certificateLine` still finds exactly one certificate by handle.
`amountPaid` becomes the certificate line's total plus the surcharge line's
total — the operator's decision, and still never `order.total`, which would put
a mug on the certificate. An order with more than one surcharge line, or one of
quantity other than one, is `unreadable`: nothing issues, and the error line
says why. D3 keeps an honest buyer out of that state, just as it keeps them out
of a two-certificate order.

**Asserted** against orders shaped as Medusa returns them, `BigNumber` totals
included: a $5 certificate with a $1 surcharge issues at 6, and a mug alongside
changes nothing. A mug carrying the surcharge's metadata is still a mug, and
still goes to Printful. A surcharge with no certificate issues nothing, as a mug
alone does. A replayed event still issues one deal.

### D3 — The storefront's classifiers learn it, and the authorisation shows it

**Repository:** `lousydeal`.
**Files:** `storefront/src/lib/surcharge.ts`,
`storefront/src/lib/store-checkout.ts`,
`storefront/src/lib/checkout-rules.ts`,
`storefront/src/app/checkout/page.tsx`,
`storefront/src/content/checkout.ts`,
`storefront/tests/checkout-surcharge.test.ts`,
`storefront/tests/store-checkout.test.ts`, `docs/current/brand.md`.

- [ ] Stop a surcharge asking for an address, refuse a cart that carries it
      twice, and show it above the total before payment.

`getCheckoutCart` reads each line's `variant_id`, `unit_price` and code, so
`store-checkout.test.ts`'s exact assertion on `lines` changes with it.
The new field on `CartLine` is optional, and only an explicit `null` marks a
surcharge. An absent value means "not known" and keeps today's reading, so
`checkout-consent.test.ts`'s `{ quantity, handle }` literals keep their
meaning — the reason `shippingSettled` was made optional for existing callers.
`cartNeedsAddress` skips a surcharge. `isPayableCart` still counts certificate
units, and refuses a cart with more than one surcharge line or a surcharge of
quantity other than one. That third refusal gets its own notice. The two
existing notices tell a buyer to choose or add a certificate, which is the
wrong fix.

**The authorisation ledger gains the row §9 draws:** `Discount (BALDRICK20)`,
`+$1.00`, above `TOTAL`. The figure is Medusa's `unit_price` for that line,
formatted and not computed, and it is the line's whole figure because the
payability rule has just proved its quantity is one.

**Why here and not only in the cart.** A buyer can arrive at `/checkout` by URL
or by the back button, and the page that takes the money is the one §23 is
about. A total that exceeds the tier's price with nothing on the page saying why
is the silent adjustment §23 forbids, even though the line is visible one page
earlier.

The label formatter lives in `lib/surcharge.ts`, beside the classifier, so D5's
cart and this page print the same words. `SURCHARGE_INTERNAL_TYPE` is written
here again, because there is no shared package. This row's test reads D1's file
and holds the two equal, as `inscription-filter.test.ts` holds its block equal.

**`brand.md` §4 specifies the adjustment row here, because this is the first
surface to render it.** That covers the label, its place above `TOTAL`, and the
`+` on its value. `brand.md` wins over a slice plan about what a surface says,
so a row that drew the adjustment before the identity described it would be
deriving its own permission.

### D4 — The route that applies a code

**Repository:** `lousydeal`.
**Files:** `backend/src/api/store/carts/[id]/surcharge/route.ts`,
`backend/src/workflows/apply-surcharge.ts`, `backend/src/api/middlewares.ts`,
`backend/tests/surcharge-route.test.ts`,
`backend/tests/smoke/store-api.test.ts`.

- [ ] Apply a code to a cart, server-priced and tax-inclusive, replacing any
      surcharge already there, through workflows that refresh the payment
      collection.

`POST /store/carts/:id/surcharge`, body `{ code }`, validated in
`middlewares.ts` as a string of bounded length. It:

1. reads the cart and refuses one that is completed or holds no certificate;
2. prices the code with D1 against the certificate line's `unit_price`, and
   refuses one D1 does not know;
3. removes every existing surcharge line through `deleteLineItemsWorkflow`
   (constraint 13);
4. adds one line through `addToCartWorkflow`, with `unit_price`, `quantity: 1`,
   `is_tax_inclusive: true`, `requires_shipping: false`, and D1's title and
   metadata;
5. returns the cart.

**Medusa's own workflows, not their steps** (constraint 8). Both run
`refreshCartItemsWorkflow`, so tax lines, totals and the payment collection are
recomputed on the removal and again on the addition. A version composed from
`createLineItemsStep` would leave an open checkout's session at the old amount,
and Medusa would capture that.

**Its own lock, first and last.** `acquireLockStep` on the cart id before step
1 and `releaseLockStep` after step 4, the shape both composed workflows use at
top level. Their lock steps are skipped inside it (constraint 8), so this is
the only lock there is. It keeps two concurrent applies — a double-submit, two
tabs — and Medusa's own line-item route off the cart until the removal and the
addition have both run. `surcharge-route.test.ts` fires two applies at once and
asserts one surcharge line, as `printful-submission.test.ts` tests its race.

A refusal is `422` with a stable reason — `unknown_code`, `no_certificate`,
`completed` — that the storefront maps to copy. Status text is not parsed.

**The slice's only writer, and it waits for D2 and D3** (constraint 7).

**Verified on a running Medusa, not only by fakes.** The smoke suite gains a
case: a $5 cart in `EE` takes `BALDRICK20` and reads `total` 6 with one
surcharge line, `is_tax_inclusive` true, and `tax_total` inside the 6 rather
than beside it. Re-applying leaves one line. `BLACKFRIDAY` leaves a line at 0.
An unknown code leaves the cart unchanged. The smoke suite cannot create a
Stripe session or complete an order, so the session refresh and the metadata's
arrival on the order line are confirmed in D10's Gate E order.

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

**Only the cart applies a code.** `/checkout` is always re-entered by
navigation, so its payment form mounts with no session and
`paymentSessionNeeded` creates one against the refreshed total. No checkout
code path changes.

**The surcharge row is an adjustment, not merchandise.** It uses D3's label,
shows `quantity × unit_price` the way `lineValue` already does for any line, and
carries a `Remove` control, which `removeFromCart` already handles. The
`PROCEED TO PAYMENT` link keeps its `href` verbatim, because
`baldrick-reach.test.ts` reads it.

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

- [ ] Name the surcharge in the § 55 confirmation, and stop its price sentence
      saying nothing was added.

A legal row, run on the authority recorded at the head (constraint 12).

**The line.** A buyer's durable record reads `ITEM: Lousy Deal` and `Total paid:
$6.00`. Without a line between them, the one document the law makes permanent
cannot explain its own figure. So the paid section carries `Discount
(BALDRICK20): +$1.00`, read from the order line's `total`.

**The sentence.** `CONFIRMATION_PAID` has two shapes today, and both say "no
fee" and "no charge you were not shown". It gains the surcharge as a third fact
beside postage: with a surcharge, with or without a parcel, it names the code's
increase as a line the buyer was shown before paying. Nothing § 55(2) requires
is lost. `order-confirmation.test.ts` asserts the existing sentence and changes
with it. LD-04's Gate D found this same sentence false once already, for
postage.

The gift message is not touched. "Someone spent $6.00 on absolutely nothing for
you" is already true.

### D7 — Baldrick issues the code

**Repository:** `lousydeal`.
**Files:** `storefront/src/content/baldrick.ts`,
`storefront/tests/baldrick-copy.test.ts`,
`storefront/tests/baldrick-widget.test.ts`, `docs/current/brand.md`.

- [ ] Replace "not finished" with a code, and keep every guard LD-05 wrote.

The forward liability `content/baldrick.ts` records at its head, discharged.
The discount step names `BALDRICK20` and says to type it on the order summary,
and that it makes the deal worse. He does not say by how much — the cart does,
in a figure read from Medusa, which is LD-05's constraint 5 working rather than
being worked around. He does not say he has applied it, because he has not and
cannot.

**The figure guard admits `BALDRICK20` verbatim, and nothing else.** It
contains digits, and LD-05's guard refuses a bare amount. An exception matching
"any word with a number in it" would be the guard switched off, and admitting
all four codes would admit three he never says. The test reads D1's table and
fails if `BALDRICK20` stops being in it.

`baldrick-widget.test.ts` renders the discount step's live quick replies, so
removing or renaming that step's buttons would break it. Rewording them would
not.

**`brand.md`'s worked example is false the same day and changes in the same
commit** (constraint 11): "There is a discount code. I have not finished it. It
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

A legal row, run on the authority recorded at the head (constraint 12).

`terms.ts:125-126` says there is "no fee, and no charge you were not shown
before you paid" and that "nothing whatever is added" to a certificate's
price. "No charge you were not shown" stays true and is worth keeping. The rest
is false once `FREE` adds $1.00. The clause states:

- a code is optional and entered by the buyer;
- it raises the price and never lowers it;
- the increase is its own line, with its amount, before payment;
- it can be removed before paying;
- the total at the payment authorisation is the amount charged.

`home.ts:96` gains the second addition beside postage, in the same register.

**Authority to write is not acceptance.** Whether a price increase labelled
"discount" is lawful, with the increase disclosed as its own line before
payment, is the question §23 reserves to the operator and a qualified human
reader. §23 itself permits the mechanic on exactly those terms. The row states
the position and does not settle it.

### D9 — The report

**Repository:** `lousydeal`.
**Files:** `backend/src/commerce/discount-report.ts`,
`backend/src/scripts/report-discounts.ts`, `backend/package.json`,
`backend/tests/discount-report.test.ts`.

- [ ] Answer §9's three questions from Medusa's own data, and say plainly which
      one is not measured.

`npm run report:discounts`, in the shape of `report:vat-thresholds`: a pure
function over rows, a `medusa exec` script that fetches them, and nothing that
schedules it. Medusa's query does not filter on JSON metadata, so the script
fetches cart and order lines and the pure function selects surcharges by
constraint 6's rule. The code comes from the metadata.

| §9 asks | The report prints |
| --- | --- |
| how many customers asked Baldrick for a discount | `not measured`, and the operator decision that made it so |
| how many accepted a worse price | carts holding a surcharge line, completed or not, by code |
| which codes convert | orders carrying each code, against carts carrying it |

**Carts are counted, not visitors.** One person with two carts is two, and the
report says so rather than implying a population. §11's rule against
fabricated totals binds an operator's report too, because an operator will
repeat what it says. A surcharge whose metadata a visitor has stripped counts as
`unknown code` rather than disappearing.

**It runs in whichever environment it is invoked in**, and prints that
environment's name first. A test cart counted as a customer is Gate F's named
failure. The report is never public and feeds no counter.

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
4. **open the payment authorisation first, go back, apply the code, and return**
   — the row is above the total, and Stripe's PaymentIntent is for the new
   total, not the old one (constraint 8);
5. pay, with a mug in the cart so Printful is exercised;
6. read the certificate — `AMOUNT WASTED` includes the surcharge;
7. read the counter, and the § 55 confirmation's surcharge line and sentence;
8. read the order's lines, whose surcharge carries its metadata, and the
   Printful submission, which holds the mug and no surcharge;
9. read `report:discounts` against that environment.

## What the review changed

Fable reviewed this plan twice on 2026-09-10, before any row ran. Every finding was
checked against the repository before it was accepted.

| Finding | Disposition |
| --- | --- |
| **Blocking.** D6 and D8 wrote legal text on the plan's own authority, which decision `011` forbids | Taken to the operator, who authorised it. Recorded at the head and as constraint 12 |
| The classifier was metadata, which both public line-item routes let a visitor write, and a surcharge's quantity was editable | Constraint 6: a surcharge is a variant-less line. D2 and D3 refuse a second surcharge or a quantity above one |
| Nothing said the payment session follows a changed total, and Medusa captures the session's amount | Constraint 8. D4 names the workflows, and D10 step 4 checks it |
| A fifth false document: the § 55 confirmation's "no fee" sentence | Constraint 11's list, and D6 |
| D4 claimed the smoke suite could prove metadata survives completion; it never completes an order | Cited by reading, confirmed live in D10 |
| `FREE`'s fee gated D1 while `status.md` said nothing was blocked | The operator named it: $1.00 |
| Merging is scoped by variant first; the Printful consequence was `failed`, not only a log line; `cartHasCertificate` already excluded a null handle | Facts corrected |
| "Every reader before the writer" overstated what D5 renders | Constraint 7 states the D4–D5 window |
| Files the rows implied and did not list | `store-checkout.test.ts` added to D3, `baldrick-widget.test.ts` to D7. The reviewer's line in the widget test was a fixture, but the file does read the discount step's quick replies |
| The figure guard admitted four codes he does not all say; float rounding is not half-up; D9 implied a metadata query | D7 admits one; D1 uses integer cents; D9 says it filters in code |
| **Pass 2, major.** Constraint 8 said the composed workflows lock the cart themselves. Inside a sub-workflow Medusa skips their lock steps, so D4 would have run unlocked | Constraint 8, a new fact row, and D4 take the lock at top level and test two concurrent applies |
| Pass 2, minor: three public writes rather than two; `CartLine` literals in `checkout-consent.test.ts`; a stale constraint number in `status.md`; an off-by-one citation | Constraint 6 names the third; D3 makes the field optional; the rest corrected |

## What this slice does not do

| Not done | Why |
| --- | --- |
| The VIP unlock | §10 defers Enterprise, the only thing it could unlock. A code that unlocked nothing would be a control that does nothing |
| Counting Baldrick's discount conversations | The operator's decision, 2026-09-10. It would need a network call LD-05 forbids, and it would make his disclaimer and Privacy §2 false |
| §24's funnel events, `bad_discount_issued` and `bad_discount_accepted` | LD-08 owns analytics. D9 answers §9's questions without an event pipeline |
| Surcharging merch or postage | The operator's decision: the certificate only |
| Stacking codes | Constraint 13. One per cart |
| Expiry, usage limits, per-customer codes | No usage yet justifies them. A code is a committed row, and changing one is a pull request |
| An admin screen for codes | Same. §25: no CMS for a tiny amount of copy |
| Medusa promotions | §9 forbids it: a promotion cannot raise a price |
| Closing the legal gate | The operator, with a qualified human reader. §23 |

## OWNER MUST FILL

| Value | Needed by | State |
| --- | --- | --- |
| Whether the Terms clause and the confirmation's sentence are acceptable | D6, D8 | judgement, not a value; §23 reserves it |
| Whether Baldrick's discount lines read as him | D7 | judgement; the row proposes and the operator disposes |
