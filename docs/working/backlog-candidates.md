# Backlog candidates

This file lists the work that remained open when the operator closed the build
initiative on 2026-09-27 ([decision 017](../decisions/017-close-the-v1-initiative.md)).
Nothing here is committed work. To start an item, select it, then write a plan
for it in `docs/working/` to
[`standards/planning.md`](https://github.com/hannosirkel/architecture/blob/main/standards/planning.md),
and remove the item from this file in the same change.

Each item was still open in the code on 2026-09-27. Verify it again before you
plan it: the code, not this file, is the authority.

## User-experience candidates

These came from the LD-11 user-experience audit, which walked the live store
on 2026-09-22, mostly at 390 pixels and, for some flows, also at 1280. The operator delegated the selection to
TypeSafe's Jev model, with a bar of a success probability above 0.80. These
candidates did not clear it. The letter is the audit's identifier, and some
code comments cite it.

| Id | What it does | Why | Jev |
| --- | --- | --- | --- |
| `m` | State the total, or state that it is not known yet, before the consent and the pay control. | On a parcel cart, `TOTAL` is a sentence until the address is complete. The page asks for the consent and shows `ORDER WITH OBLIGATION TO PAY` before it shows the amount. No card field exists before the address is complete, and nothing says why. | 0.80 |
| `t` | Make Baldrick's fallback list the topics that he actually answers. | The fallback says that he knows about "the certificate, gifts, refunds and complaints". He also answers eight other intents, for example licensing and support. A visitor who reads the list can conclude that he cannot help. The text is in `storefront/src/content/baldrick.ts`. | 0.74 |
| `a` | Decide if merch is a browse path or cart-only. Then build and link a `/goods` index, or remove the product pages from `sitemap.xml`. | `/goods` is a 404. No page links to a product page until the cart holds something. But `sitemap.xml` lists the product pages, so search can bring a visitor to a page the shop later refuses to sell from alone. | 0.73 |
| `p` | Link the certificate PDF from the certificate page, the order confirmation, or both. | The PDF is one of the two certificate URLs that [`specification.md` §5](../current/specification.md) fixes. No page and no email links to it. An owner finds it only if they add `/certificate.pdf` to the URL. | 0.72 |
| `c`+`v` | Stop money figures and product names wrapping in the narrow value column at 390 pixels. | The cart ledger shows `$6.00` as `$6.0` and `0` on two lines. The checkout ledger wraps `$29.00` the same way. At 1280 pixels nothing wraps. The audit found one cause, the value column's width, on two pages. Jev scored the merged change at 0.70, and the cart fix alone at 0.52. | 0.70 |
| `g` | Give the visitor a link back to the cart. | Only the checkout has a link to `/cart`; adding an item also goes there. A visitor who leaves the cart for a deal page must add another item or type the URL to return. | 0.68 |
| `d` | Widen the upsell's item column at 390 pixels. | Every multi-word product name wraps over three or four lines. `Certified Worthless` also breaks inside a word. Measure first: this can have the same cause as `c`+`v`. | 0.58 |
| `e` | Give each commerce page its own `<title>`. | `/`, `/deal/*`, `/goods/*` and `/cart` all show `LOUSYDEAL.COM`. Two open tiers show two tabs with the same name. The legal pages already have their own titles. | 0.42 |

## Checkout and payment

- **No live payment has gone through the paid-cart paths.** A Stripe sandbox
  payment on the test store completed a cart after the storefront lost its
  first completion request. The page showed the "card accepted" notice, and a
  reload completed the order. The live store has taken no payment through
  these paths.
- **Some paid-cart branches are not measured on a deployed store.** These are:
  Stripe unreachable; an intent still `processing`; a completion that fails;
  the second answer of the one-reload guard (`prior_completed`); completion of
  a cart that Medusa already completed; and the reload of an unpaid checkout
  that holds a session. The last one is where the cost of one Stripe read for
  each such reload occurs.
- **The "do not pay again" notice can reach a buyer who paid nothing.** If
  Stripe.js does not load, or the publishable key does not match the session,
  the prior-payment check cannot answer. The page then says "Do not pay again
  yet", with no way to continue. This is the conservative default, not a fix.
- **A forged `?redirect_status=succeeded` on an unpaid cart** shows "Your card
  was accepted…" with no way to continue. Only the visitor who forges it sees
  it, but the sentence is false.
- **A failure after a successful redirect completion shows the error page.**
  The cart read and `listTiers` are outside the `try` block, so the page does
  not say that the card was charged.
- **The withdrawal-waiver consent is enforced only in the browser.** The pay
  control stays disabled until the box is ticked, but nothing records the
  consent on the cart or the order. The order confirmation tells every buyer
  that they ticked it. Record the consent with the order, or change the
  sentence.
- **A "not ready" race shows the Unknown notice falsely.** The payment wrapper
  can reject with "not ready" only in a race, and the page then says it could
  not hear back from the payment provider.
- **A completed cart with no email throws.** Only a cart completed directly
  through the public Store API can have no email.
- **The number of PaymentIntents a parcel checkout creates is not measured.**
  The quote waits for a complete address, which should keep it to one. Test it
  with a browser walk of the test store.
- The limits in [`architecture.md`](../current/architecture.md) §14 are also
  candidates, for example a `processing` redirect that still shows the form.

## Operations and performance

- **The storefront readiness probe renders the home page every five
  seconds.** Each probe costs three Store API reads, on the live store and the
  test store, whether or not anybody visits. A probe path that renders nothing
  removes them. The probe is in `deploys/lousydeal/base/storefront.yaml`, so
  the change is in the `deploys` repository.
- **The region is read twice** on the checkout page (through `listTiers`, then
  `getDefaultRegion`), and when `addToCart` creates a new cart (through
  `listTiers`, then `cartToAddTo`). `listCatalogue` removed the same waste
  from the cart page and the sitemap.
- **The notification provider sends to one recipient, with no CC.** The
  operator ruled it out of LD-11's scope on 2026-09-19.
- **Merch orders never get a Medusa fulfilment, and `order.status` stays
  `pending`.** The Printful provider's `createFulfillment` records what Medusa
  needs, and nothing calls it. Admin shows every merch order as unfulfilled,
  and only the shop's own `printful_submission` table holds the tracking
  number. An operator cannot tell a shipped order from a stalled one in
  Admin.

## Legal and privacy

- **Four changes to the legal text came after the gate accepted it.**
  [Decision 016](../decisions/016-v1-gate-acceptances.md) lists them. The two
  privacy changes, which added Google Analytics and Meta Pixel, have no
  recorded authority. The operator decides whether to accept them, and a
  decision records it.
- **No record shows the analytics account settings were read back.**
  [`operations.md`](../current/operations.md) lists the settings that code
  cannot set. A probe on 2026-09-12 saw Google send an automatic `scroll`
  event. Read the settings back and record the vendors' retention periods.
- **The privacy notice promises to remove an address on request, and no
  command does it.** A buyer's or a gift recipient's address stays on the
  order record. Removing it today is a manual database change.

## Rendering and copy

- **Characters outside the embedded font print as `?` in the PDF.** This
  affects Chinese, Japanese and Korean text, emoji and right-to-left scripts.
  A fallback font in the image fixes it.
- **An unknown deal page answers 404 with an empty body when scripting is
  off.** `requireTier` calls `notFound()`, and a reader without scripting sees
  nothing.
- **The address note and the dedication preview are not announced.** Both
  appear out of view as the buyer fills the form, and neither has
  `aria-live`.
- **Two cart notices are slightly wrong in edge cases.** Choosing the same
  tier again checks the cart's shape, not its prices, so a stale price stays
  and "already applied" can be said of it. "Could not be re-priced" also
  covers a doubled line that was removed. Neither state is reachable through
  the site's own controls.
- **Share previews are not verified.** No test shows that X and Bluesky
  unfurl the certificate's `og:image`, and there is no `twitter:card` tag.

- **Nothing limits the inscription length where it renders.** The checkout
  and the `edit:inscription` command enforce `DEAL_INSCRIPTION_LIMITS` (60
  and 120 characters). The certificate, its PDF and its OpenGraph card do not
  check length, so a longer stored value prints in full.
- **The checkout's two field groups use different styles.** `.inscription` is
  one rule with its name on it. `.address` still draws as a browser-default
  box. A merch cart shows both. Style `fieldset` once to fix it.
- **Much copy still uses straight apostrophes.** [`brand.md`](../current/brand.md)
  requires U+2019, because React escapes `'` in markup. A test that asserts
  copy with `'` against rendered HTML then passes when the text is absent.
  `GOODS_NOTICE` in `content/merch.ts` and several lines in
  `content/baldrick.ts` are examples; the content files hold many more.
- **Some copy writes "Refunds and Withdrawal"** with a capital W: two
  sentences in `content/checkout.ts`, one in `content/legal/terms.ts` and one
  in `content/legal/privacy.ts`. The page title, the footer and Baldrick write
  "Refunds and withdrawal". The terms and the privacy notice are legal text,
  so change them only with the legal documents' owner.

- **Some source comments are out of date.** The header of
  `storefront/src/lib/medusa-client.ts` says the browser proxy does not
  exist, and `storefront/src/lib/store-payment.ts` says `backend/src/api`
  does not exist; both exist. A comment in
  `backend/src/subscribers/order-placed.ts` calls a merch-only order "complete
  and correct", but the code logs it as an error. Comments in
  `backend/src/config/runtime.ts`, `config/fulfilment.ts`,
  `commerce/tax-model.ts` and the Printful webhook route say that §23 keeps a
  live Printful store or live payment keys out "until the publication gate".
  The gate closed on 2026-09-10, and both are live.

## Questions for the operator

- **Does the footer keep its social icons?** The footer shows TikTok,
  Instagram and X as icon links. [`brand.md`](../current/brand.md) §3 allows
  no icon set, and the stamp is the only vector artwork. Either remove the
  icons, or amend the brand rule and describe the column.

- **Does the buyer see what the recipient's gift email says?** The buyer
  never sees it. The email quotes a figure and says something about parcels.
  A preview is the obvious option.
- **Does the recipient need the surcharge explained?** A certificate bought
  with a code is worth more than one bought without. Without the reason, the
  higher figure can look like an error. The certificate states the amount and
  not the reason.

## Deferred features

The [specification](../current/specification.md) lists what the build left
out on purpose. None of it is built.

- **Accounts and order lookup** (§12). The confirmation email is the only copy
  of a certificate link.
- **The §25 non-goals and the §26 future ideas**, for example Lousy Deal of
  the Month, physical certificates, social leaderboards, corporate bulk
  purchases, a public API and scheduled gift delivery.
- **Enterprise (LD-07).** An annual certificate licence that a buyer unlocks
  by negotiating with Baldrick. It needs subscription billing, entitlement,
  expiry and renewal, which Medusa does not provide. The design is in
  [`specification.md` §10](../current/specification.md). §26 keeps the
  current code compatible with it.
