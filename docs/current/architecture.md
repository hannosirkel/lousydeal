# Architecture

Lousy Deal is two images built from one repository: a Medusa 2.x backend and a
Next.js App Router storefront. Medusa owns products, carts, orders, payments
and fulfilment. A small custom `deal` module owns the certificate. The
storefront renders every page on the server and reads the backend over the
Store API. The browser never learns the backend origin.

This document describes how the parts are built and how they work together
today. It does not restate product behaviour, premise, voice or rationale:

| Topic | Home |
| --- | --- |
| Product behaviour (what a visitor sees and may do) | [specification.md](./specification.md), cited as "specification.md §N" |
| Product premise | [concept.md](./concept.md) |
| Voice, copy and visual identity | [brand.md](./brand.md) |
| Deployment, environments, secrets, runbooks | [operations.md](./operations.md) |
| Provider reports and social operations | [provider-reporting.md](./provider-reporting.md) |
| Why a choice was made | [docs/decisions/](../decisions/) |

The code is the source of truth. Most modules carry a header comment that
states their invariants; this document names the module so that a reader can
find it.

## 1. The two images

[Decision 001](../decisions/001-one-repository-two-images.md) puts both
deployables in one npm workspace. They release together.

| Image | Source | Runs as | Owns |
| --- | --- | --- | --- |
| Backend | `backend/` (Medusa 2.21) | A server process and a worker process, from the same image | Products, regions, tax, carts, payment collections, orders, fulfilment, notifications, the `deal` module, the Printful provider, operator scripts |
| Storefront | `storefront/` (Next.js 16, App Router) | One server process | Every page, the certificate page and PDF, Baldrick, analytics consent, the browser proxy to the Store API |

The backend server answers HTTP. The worker runs subscribers and workflow
steps that Medusa queues on Redis. Both read one configuration,
`backend/medusa-config.ts`, which calls `readBackendRuntimeConfig`
(`backend/src/config/runtime.ts`). A missing required value stops the process
before Medusa starts. Before Medusa loads, `npm start` runs a Redis preflight
(`backend/src/config/redis-preflight.ts`) that authenticates and sends `PING`,
because Medusa's Redis loaders log a failed connection and continue.

`medusa-config.ts` registers these modules:

| Module | Wiring | Present when |
| --- | --- | --- |
| Redis event bus, workflow engine, locking | `backend/src/config/redis.ts` | Always |
| Stripe payment provider (`pp_stripe_stripe`) | `backend/src/config/payment.ts` | Always |
| `deal` (certificates and Printful submissions) | `backend/src/config/deal.ts` | Always |
| SMTP notification provider (`lousydeal-smtp`) | `backend/src/config/notification.ts` | SMTP is configured |
| Printful fulfilment provider (`printful_printful`) | `backend/src/config/fulfilment.ts` | A Printful token and an artwork base URL are both configured |

The two optional modules are dropped from the list, not stubbed. A backend
without them boots: it sends no mail, and it offers no shipping option, so a
cart with printed goods cannot be paid for.

The backend's `predeploy` script (`backend/package.json`) migrates the
database, seeds the administrator, configures the commerce records, and seeds
the tiers and the merch. Each step is idempotent. How and where it runs is in
[operations.md](./operations.md).

## 2. How the storefront reaches the backend

The storefront has two paths to the Store API. Both attach the publishable
key on the server.

| Caller | Path | Module |
| --- | --- | --- |
| Server components, route handlers, Server Actions | Direct to the backend URL | `createStoreFetchJson` in `storefront/src/lib/medusa-client.ts` |
| Browser code (the checkout's payment step) | Same-origin `/api/store/<namespace>/...` | `storefront/src/app/api/store/[...path]/route.ts` |

**Server-side client.** `createStoreFetchJson` builds a `FetchJson` from the
backend URL and the publishable key. Every Store API helper
(`store-cart.ts`, `store-checkout.ts`, `store-payment.ts`, `store-deal.ts`)
takes a `FetchJson` as a parameter. The same helpers therefore run on the
server, in the browser through the proxy, and in tests against a stub. The
storefront does not use `@medusajs/js-sdk`.

**Browser proxy.** The proxy forwards only three namespaces:

- `store`: the Medusa Store API.
- `hooks`: exactly one path, `POST /hooks/payment/stripe_stripe`, the Stripe
  webhook.
- `webhooks`: exactly one path, `POST /webhooks/printful`, the Printful
  webhook.

It refuses path traversal and any other path, so the Admin API is not
reachable through the public hostname. The two webhook paths accept `POST`
only, and the proxy caps every forwarded body at 256 KiB. It forwards an
allowlist of request headers: `content-type`, `accept`, `stripe-signature`
and `x-pf-webhook-signature`. It removes `location`, `content-location` and `link` from responses,
and it removes the `Domain` attribute from `set-cookie`. A legitimate request
has the shape `/api/store/store/products`: the first `store` is the mount
point and the second is the Medusa namespace. Both provider webhooks
therefore reach the backend through the storefront's public origin. The
proxy's Printful path and the backend's `preserveRawBody` matcher in
`backend/src/api/middlewares.ts` must name the same path. If they differ, the
raw body is missing and every Printful delivery fails its signature check.

**Runtime configuration.** `storefront/src/config/runtime-config.ts` reads
`process.env` per request. The root layout awaits `connection()`, so no page
reads configuration at build time. No environment-specific value is in the
image ([decision 002](../decisions/002-rebuild-live-from-merged-main.md)), and
the storefront uses no `NEXT_PUBLIC_` variable. The layout serialises a
`ClientRuntimeConfig` into the page. It holds only three things: the Stripe
publishable key, the store-open flag and the analytics tag ids. The backend
URL, the Medusa publishable key and the trader identity stay on the server.

**Trader identity.** The six `MERCHANT_*` values are runtime configuration
([decision 004](../decisions/004-trader-identity-is-runtime-configuration.md)).
The storefront renders them in the legal pages and the footer; the backend
puts them in every email. A missing value renders as a named gap, never as a
blank.

**Canonical host.** `storefront/src/proxy.ts` (the Next.js request proxy)
redirects the `www.` alias of `SITE_BASE_URL` to the canonical origin with a
308.

**Store open flag.** `STORE_OPEN=true` opens the shop. Both images read it.
When it is not `true`, the backend middleware (`backend/src/api/middlewares.ts`)
answers every mutating `/store/*` request with `503 store_closed`, except
`/store/withdrawals`. The storefront refuses independently: every cart Server
Action calls `assertStoreOpen` (`storefront/src/lib/store-availability.ts`),
the proxy refuses purchase mutations (`storePurchaseMutationRefused`), and
the pages replace purchase controls with a closed notice.

**Cart cookie.** `lousydeal_cart_id` names the visitor's cart. It is
`httpOnly`, `secure` and `sameSite: lax`, so it survives the top-level return
from Stripe (`storefront/src/lib/store-session.ts`). There are no accounts
(specification.md §12).

## 3. Catalogue

The backend holds two kinds of product. Nothing in the storefront lists them
by handle.

| Kind | Declared in | Seeded by | Variant data |
| --- | --- | --- | --- |
| Certificate tiers | `backend/src/commerce/product-model.ts` (`PRODUCT_TIERS`) | `seed-product.ts` | One variant, no SKU, no metadata, no shipping profile |
| Printed goods | `backend/src/modules/printful/catalogue.ts` (`MERCH_CATALOGUE`) | `seed-merch.ts` | One variant per size, SKU, `metadata.printful_variant_id`, the `merch` shipping profile |

`product-model.ts` is the only file under `backend/src/` that may hold a tier
amount. `backend/tests/commerce-product-seed.test.ts` fails on a bare tier
amount anywhere else. Neither kind manages inventory.

**Catalogue reads.** `storefront/src/lib/medusa-client.ts` reads the default
region and then the product list with calculated prices. Three functions split
the list:

| Function | Returns | Callers |
| --- | --- | --- |
| `listTiers` | Certificate tiers | Home, tier page, checkout, cart actions, social card |
| `listMerch` | Printed goods, each with every priced variant | Goods page |
| `listCatalogue` | Both, from one read of the product list | Cart page, sitemap |

**The merch discriminator.** `isMerchProduct` returns true when any variant
carries a string `metadata.printful_variant_id`. The product list must
therefore request `*variants.metadata`. If that field stops arriving, every
product reads as a certificate. `medusa-client.test.ts` asserts that the
field list names it.

**Which line is the certificate.** The backend and the checkout identify a
certificate line by its product handle or title from `PRODUCT_TIERS`. The
checkout page asks `listTiers` for the handles rather than holding a copy.

## 4. Certificates: the `deal` module

The `deal` module (`backend/src/modules/deal/`) holds two models:
`lousy_deal` (the certificate) and `printful_submission` (section 6). Medusa
stays the source of truth for the order; the deal refers to it by
`order_id`. The domain model is specification.md §16.

### Issuance

`backend/src/subscribers/order-placed.ts` handles `order.placed`. In order,
it:

1. Submits any printed goods to Printful (section 6). This runs first and in
   its own `try`, so a Printful failure cannot stop the certificate.
2. Finds the one certificate line. It refuses (logs an error and issues
   nothing) for zero certificates, two certificates, a quantity other than
   one, or more than one surcharge line.
3. Computes the amount paid: the certificate line's own total plus the
   surcharge line's total, in integer cents. It never uses `order.total`,
   which includes goods and postage.
4. Reads the inscription and gift fields from order metadata and filters
   them.
5. Calls `issueDeal` (`backend/src/modules/deal/issue.ts`).
6. Sends the order confirmation, then the gift message (section 8).

The subscriber never throws. Medusa's event bus retries a subscriber that
rejects, so a thrown defect would repeat on every delivery. Every failure
writes one error line that names the order and the missing part.

**Idempotency.** `issueDeal` reads the deal for the order, inserts one if
none exists, and on any insert error reads again. Unique indexes on
`order_id`, `public_slug` and `serial` make the second insert fail. A
redelivered event therefore returns the existing deal. `issued_at` is the
order's creation time, not the worker's clock, so a replay yields the same
record.

### Numbering, slugs and layout

| Field | Rule | Source |
| --- | --- | --- |
| `serial` | A database sequence (`autoincrement`). Code never chooses it. | `models/lousy-deal.ts` |
| `public_slug` | 16 characters from a 30-character alphabet with no vowels (about 78 bits), drawn by rejection sampling from `crypto.randomBytes`. A collision is not retried. | `slug.ts` |
| `layout_version` | Set to `CURRENT_CERTIFICATE_LAYOUT` at issuance and never changed. | `issue.ts` |
| `status` | `issued` or `hidden`. A hidden deal answers 404 and still counts in the totals. | `models/lousy-deal.ts` |

The slug is the only authorisation for a certificate. Logs name the serial,
never the slug.

### Public and private data

`GET /store/deals/:slug` (`backend/src/api/store/deals/[slug]/route.ts`)
returns an allowlist of eight fields: serial, tier, amount paid, currency,
display name, dedication, layout version and the issue date. It never
returns the order id, the email, the billing name or the gift fields. An
unknown slug and a hidden deal both answer 404. `storefront/src/lib/store-deal.ts`
maps the same eight fields by name, so a new backend field cannot reach the
page by accident.

### Inscription

The buyer enters a display name (60 characters) and a dedication (120
characters) at checkout. The storefront writes them, with the gift fields, to
cart metadata in one `POST /store/carts/:id`, because Medusa replaces the
whole metadata object on each write (`setCartInscriptionAndGift` in
`storefront/src/lib/store-checkout.ts`). Medusa copies cart metadata to the
order.

The filter strips markup, URLs, bare domains, email addresses and telephone
numbers. It runs twice with identical rules:

- At issuance: `backend/src/modules/deal/inscription.ts`. This pass decides
  what is stored.
- At render: `storefront/src/lib/inscription.ts`. This pass lets an operator
  change the stored value without a reissue.

`backend/tests/inscription-filter.test.ts` compares the two rule sets. An
operator changes an issued inscription with `npm run edit:inscription`
(`backend/src/scripts/edit-inscription.ts`), which writes through the module
and keeps the serial.

### Certificate page and PDF

| URL | Module | Notes |
| --- | --- | --- |
| `/done-deals/{slug}` | `storefront/src/app/done-deals/[slug]/page.tsx` | Server-rendered, `noindex, nofollow` |
| `/done-deals/{slug}/certificate.pdf` | `.../certificate.pdf/route.ts`, `lib/certificate-pdf.ts`, `lib/pdf-layout-1.ts` | PDFKit, vector, rendered per request, not cached |
| Social card | `.../opengraph-image.tsx` | Rendered per request; alt text uses the serial, not the inscription |

All three read the deal through `getDeal`. `lib/certificate-layouts.ts` picks
the component from `layout_version` and throws on an unknown version; it
never falls back to the current layout. The PDF is a second layout, set on
A4. It shows the same facts as the page. There is no object storage and no
headless browser.

**Fonts and colours.** Pages use a renamed subset of IBM Plex Mono ("LD Mono",
`storefront/src/fonts/`, woff2) through `next/font/local`. The PDF and the
social cards cannot read woff2, so they embed the unmodified TTFs from
`storefront/public/fonts/`. The PDF never uses PDFKit's built-in fonts, and a
character the font lacks prints as `?`. Colours come from the `:root` tokens
in `globals.css`; `storefront/src/app/palette.ts` is the only other colour
source, for the PDF and Satori, and `tokens.test.ts` keeps the two equal. The visual rules are in
[brand.md](./brand.md) §4.

### Public counters

`GET /store/deals/totals` (`backend/src/api/store/deals/totals/route.ts`)
returns the count of deals, the sum of `amount_paid` and the latest serial.
The home page renders them through `components/document/Counter.tsx`. When
the read fails, the page omits the counter; it never shows zero in place of
an unknown figure. Behaviour is specification.md §11.

## 5. Gifting

A gift is four order-metadata keys: recipient email, recipient name, sender
name and message (`backend/src/modules/deal/gift.ts`). The order is a gift
only when a valid recipient address survives `readGift`. The three text
fields pass through the inscription filter. `issueDeal` stores the four
values on the deal, as explicit nulls for a non-gift. The subscriber decides
whether to send the gift message from the stored row, not from the event, so a
replay sends nothing new.

The gift message states the certificate's own amount, not the order total.
When the order also holds printed goods, it names the items and the
destination country, and nothing else about the address. Behaviour is
specification.md §6.

## 6. Printed goods and Printful

Printful is optional per deployment (section 1). It is split into five parts
under `backend/src/modules/printful/`.

| Part | Module | What it does |
| --- | --- | --- |
| Client | `client.ts` | One HTTP client for Printful API v1 and v2. The token never appears in an error. |
| Catalogue and sync | `catalogue.ts`, `sync.ts`, `scripts/sync-printful.ts` | `npm run sync:printful` reconciles the Printful store to `MERCH_CATALOGUE`. It creates and updates, and deletes nothing. The join key is `external_id` = the catalogue handle; each sync variant's `external_id` is the SKU. Artwork URLs must be pinned to a commit. |
| Shipping quote | `shipping.ts`, `fulfilment-provider.ts` | The fulfilment provider quotes postage live through `POST /v2/shipping-rates`. It stores the dispatch country as `departsFrom` on the shipping method. A failed quote blocks the checkout; there is no fallback price. |
| Submission | `from-order.ts`, `orders.ts`, `submission.ts` | Called from the `order.placed` subscriber. One Printful order per Medusa order. |
| Webhook | `webhook.ts`, `backend/src/api/webhooks/printful/route.ts` | Records shipment events and sends the shipping email. |

**Postage and VAT.** The quote is grossed up at the destination's VAT rate
for an EU destination, because every price is VAT-inclusive. An export is
not grossed up. `createFulfillment` places no Printful order; it only records
what Medusa needs. The rulings are decisions
[012](../decisions/012-vat-for-goods-printful-dispatches.md),
[013](../decisions/013-the-vat-arrangement.md),
[014](../decisions/014-special-territories-are-a-reporting-problem.md) and
[015](../decisions/015-where-the-parcel-is-dispatched-from.md).

**Which option a cart sees.** Medusa does not filter shipping options by
shipping profile. A certificate-only cart has no postage because the
storefront never asks for an option for it, and `calculatePrice` refuses a
cart with nothing to post. The shipping option exists only when Printful is
configured (`configure-commerce.ts` and `medusa-config.ts` both call
`printfulFulfilmentConfig`).

**Which line to post.** A line is posted unless it is a certificate or a
surcharge. A line with no SKU cannot be ordered; the subscriber logs the
count it skipped.

**Submission idempotency.** Printful's `external_id` (the Medusa order id) is
unique per Printful store, and Printful refuses a second create. The order is
created as a draft through v1 (`POST /orders`, because v2 cannot reference
sync products) and then confirmed through v2. Confirmation is the call that
spends money. The `printful_submission` row records the outcome:

| Status | Meaning | Retried on redelivery |
| --- | --- | --- |
| `submitted` | Confirmed at Printful | No |
| `skipped` | Nothing in the order to post | No |
| `failed` | A draft, a failed charge, or an error | Yes: a retry finds the order by `external_id` and confirms it |
| `canceled` | Cancelled at Printful; the id stays taken | No: a person must act |

**Webhook.** The route is public. It verifies an HMAC-SHA256 of the raw body
with the hex-decoded secret (`x-pf-webhook-signature`); the middleware keeps
the raw body for this path only. Without a configured secret it accepts
nothing. An unsigned request gets 401, so Printful retries it; any signed
request gets 200. It handles `shipment_sent`, `shipment_returned`,
`order_failed` and `order_canceled`. It orders events by Printful's
`occurred_at`, so a late retry cannot overwrite a newer state.
The shipping email carries the idempotency key `lousydeal:parcel-shipped:<order id>`.

## 7. Checkout and payment

The checkout is `storefront/src/app/checkout/page.tsx` (server) and
`PaymentForm.tsx` (client). Behaviour and copy are specification.md §23 and
[brand.md](./brand.md) §4.

### Tax model

There is one region, `Worldwide`, in USD. Prices are tax-inclusive and the
merchant absorbs the VAT. `backend/src/commerce/tax-model.ts` declares the
EU tax regions with the `tp_system` provider.
`backend/src/scripts/configure-commerce.ts` sets `is_tax_inclusive` on the
store currency and the region together; a price with no matching
preference reads as tax-exclusive. The region also carries the link to the
Stripe provider, which is what makes Stripe available to a cart. Medusa takes
the tax region from the shipping address, never the billing address. The
checkout therefore writes the buyer's country into a shipping address even
for a certificate-only cart (`setCartCountry` in `store-checkout.ts`). The
rulings are decisions
[007](../decisions/007-usd-and-tax-inclusive-pricing.md),
[008](../decisions/008-plepic-tax-treatment.md),
[009](../decisions/009-merchant-absorbs-the-vat.md) and
[013](../decisions/013-the-vat-arrangement.md).

### Payability

`storefront/src/lib/checkout-rules.ts` decides, from the cart lines:

- `isPayableCart`: exactly one certificate of quantity one, and at most one
  surcharge line. Printed goods are an upsell; a cart without a certificate
  is not payable.
- `cartNeedsAddress`: the cart holds printed goods.
- `payDisabled` and `paySubmitBlocked`: the pay button waits for consent,
  the postage quote and the payment session.

The checkout country control lists only the region's own countries, so
Medusa's country lookup cannot fail.

### The pay path

1. The server page loads the cart. It stops early for a closed store, an
   empty cart, a completed cart or an unpayable cart.
2. `PaymentForm` creates the payment collection (`POST /store/payment-collections`)
   and a Stripe session through the browser proxy (`store-payment.ts`). It
   creates the session only when the amount is final, and again when the
   postage changes (`paymentSessionNeeded` in `checkout-rules.ts`). Medusa
   deletes the session, and so cancels the PaymentIntent, whenever the cart
   total changes.
3. The buyer fills the Stripe Payment Element. It uses automatic payment
   methods, with Apple Pay, Google Pay and Link on `auto`.
4. `runPayPath` (`storefront/src/lib/pay-path.ts`) runs three steps:
   prepare (email, inscription, gift, shipping), `stripe.confirmPayment` with
   `redirect: "if_required"`, and `POST /store/carts/:id/complete`.
5. Medusa's complete-cart workflow authorises the session against Stripe
   last. A refused authorisation rolls the order back and drops the
   `order.placed` event. Capture is automatic (`capture: true`).

**Session lock.** The backend overrides
`POST /store/payment-collections/:id/payment-sessions`
(`backend/src/api/store/payment-collections/[id]/payment-sessions/route.ts`).
It takes the cart lock before calling Medusa's stock handler, so a surcharge
cannot change the amount between the read and the Stripe session.

### Failure notices

`runPayPath` classifies a failure by its position. The notices live in
`storefront/src/content/checkout.ts`.

| Position | Charged | Notice |
| --- | --- | --- |
| Prepare fails | No | Not started |
| Stripe refuses the card (`card_error`, `validation_error`, `invalid_request_error`) | No | Declined |
| Stripe refuses the request (`rate_limit_error`, `authentication_error`, `idempotency_error`) | No | Not started |
| The error carries an intent that `succeeded` or `requires_capture` | Yes | Unconfirmed: do not pay again |
| Anything else during confirm, or an intent in `processing` | Unknown | Unknown |
| Completion fails after a confirmed charge | Yes | Unconfirmed: do not pay again |

After a charge, or the chance of one, the form does not change the cart and
does not quote postage again.

### Paid-cart paths

A charged cart completes. It never renders the payment form again, because a
new session cancels the PaymentIntent that the buyer just paid. Three paths
complete a charged cart, and Medusa's workflow lock makes them safe to
overlap:

| Path | Trigger | Module |
| --- | --- | --- |
| Redirect return | Stripe returns to `/checkout?redirect_status=succeeded`. The server calls complete. The parameter is only a reason to ask; Medusa verifies the payment. | `checkout/page.tsx` (`returnedPaid`) |
| Prior session check | The cart holds a Stripe client secret. Before it creates a session, the form asks Stripe in the browser for the intent. A charged intent completes the cart and reloads once with `prior_completed=1`. | `PaymentForm.tsx`, `checkPriorPayment` in `pay-path.ts` |
| Stripe webhook | Stripe posts to `/api/store/hooks/payment/stripe_stripe`. Medusa emits `payment.webhook_received` with its default 5 s delay, and the worker then completes the cart. | Medusa's stock payment hook |

A completed cart renders `OrderPlaced.tsx`, the end state. The cookie keeps
naming the cart until the next add to cart replaces it.

## 8. Notifications

Mail leaves through one Medusa notification provider, `lousydeal-smtp`
(`backend/src/notifications/smtp.ts`). The transport requires STARTTLS and
verifies the certificate. Every message is built by a pure function and needs
the trader identity, `SITE_BASE_URL` and an SMTP configuration. When one is
missing, the sender logs which one and sends nothing.

| Message | Builder | Sent from | Idempotency key |
| --- | --- | --- | --- |
| Order confirmation (§ 55) | `notifications/order-confirmation.ts` | `order.placed` subscriber | `lousydeal:order-confirmation:<deal id>` |
| Gift message | `notifications/gift-message.ts` | `order.placed` subscriber, after the confirmation | `lousydeal:gift-message:<deal id>` |
| Parcel shipped | `notifications/parcel-shipped.ts` | Printful webhook | `lousydeal:parcel-shipped:<order id>` |
| Withdrawal receipt, buyer and trader copies | `notifications/withdrawal-receipt.ts` | `POST /store/withdrawals` | None |

Medusa's notification module skips a key that already has a non-failed
notification. A redelivered event therefore sends nothing, and a failed send
is retried on the next delivery. Two simultaneous deliveries can still both
send; the module does not lock. Copy is in [brand.md](./brand.md) §4 (Mail).

The confirmation states the order total and itemises every line. The gift
message states only the certificate's amount. Logs never contain an email
address.

## 9. Discounts that raise the price

A "discount" is a surcharge: a custom-priced cart line with no variant. It is
never a Medusa promotion, because a promotion cannot raise a price.
Behaviour is specification.md §9.

| Part | Module |
| --- | --- |
| Code table and arithmetic | `backend/src/commerce/surcharge.ts` (`SURCHARGE_CODES`, `priceSurcharge`) |
| Apply route | `POST /store/carts/:id/surcharge`, `backend/src/api/store/carts/[id]/surcharge/route.ts` |
| Workflow | `backend/src/workflows/apply-surcharge.ts` |
| Storefront recognition and label | `storefront/src/lib/surcharge.ts`; the action is `applyCode` in `lib/cart-actions.ts` |
| Report | `npm run report:discounts -- <test\|live>` (`scripts/report-discounts.ts`) |

**Arithmetic.** The code is normalised by trimming and ASCII upper-casing
only. Percentage codes take a share of the certificate's unit price in
integer cents, rounded half-up. Fee codes add a fixed amount. The file has no
subtraction, so no code can lower a price.

**Workflow.** The workflow takes the cart lock itself, because Medusa's child
workflows skip their own lock. It refuses a completed cart and a cart without
exactly one certificate of quantity one. It removes any existing variant-less
line, then adds the new one, tax-inclusive and not shippable. The route
answers `422` with `unknown_code`, `completed` or `no_certificate`.

**Identity.** A line is a surcharge because it has no variant. Its metadata
(`internal_type: baldrick_surcharge`, code, base amount, rate or fee) is for
display and reporting only, because a visitor can write metadata on any line
but cannot create a variant-less line. The backend (`isSurchargeLine` in
`backend/src/modules/printful/from-order.ts`) and the storefront apply the
same test. The certificate's `amount_paid` includes the surcharge.

## 10. Baldrick

Baldrick is a scripted character. He uses keyword matching over fixed
response pools. There is no LLM, no model call and no network request. Behaviour
is specification.md §8; voice is [brand.md](./brand.md) §2.

| Part | Module | Role |
| --- | --- | --- |
| Lines | `storefront/src/content/baldrick.ts` | Every line he says. No logic. |
| Intents | `lib/baldrick/intents.ts` | Lower-cases input and looks for listed keywords in a listed order. No match is a normal outcome. |
| Pools | `lib/baldrick/pool.ts` | Picks a line with a seed hashed from the visitor's exact inputs, so a conversation replays exactly. No `Math.random()`. |
| Conversation | `lib/baldrick/conversation.ts` | A pure reducer: state and input in, state out. |
| Presenter | `lib/baldrick/presenter.ts` | Message timing; honours reduced motion. |
| Documents | `lib/baldrick/documents.ts` | Turns a legal document he names into a link from `LEGAL_ROUTES`. |
| Widget | `components/baldrick/Baldrick.tsx`, `Surface.tsx` | Client wiring only. Not rendered without scripting. |

He is mounted on `/`, `/deal/[handle]`, `/goods/[handle]` and `/cart`, and
nowhere else; `storefront/tests/baldrick-reach.test.ts` holds that list. A
local error boundary removes him if he fails, so he cannot take a page down.
He persists nothing: no cookie, no storage, no fetch. He offers the surcharge
codes; a guard test keeps his script naming only codes in `SURCHARGE_CODES`.

## 11. Analytics and consent

Analytics is optional and off until the visitor grants consent.
Behaviour is specification.md §24.

- **Consent.** `components/analytics/ConsentManager.tsx` owns the choice. It
  stores one versioned `localStorage` value, `lousydeal.analytics-consent.v1`
  (`lib/consent.ts`). A missing or malformed value asks again.
- **Vocabulary.** `lib/analytics.ts` lists every event name
  (`ANALYTICS_EVENT_NAMES`). The payload is sanitised to four fields: a route
  class, a product handle, a currency and an integer amount.
- **Isolation.** Vendor code runs only inside `/analytics/frame`
  (`app/analytics/frame/route.ts`, `lib/analytics-frame.ts`): a hidden,
  sandboxed iframe with an opaque origin, `no-referrer` and a strict CSP. The
  parent sends it events by `postMessage`. The vendor never sees the page URL,
  title, forms or storage.
- **Vendors.** Google Analytics and the Meta Pixel, each enabled by its
  runtime tag id.

`robots.ts` disallows `/api/` and `/analytics/`.

## 12. Legal pages and withdrawal

The legal pages are under `storefront/src/app/legal/` and their text is under
`storefront/src/content/legal/`. `content/legal-routes.ts` is the one list of
their URLs; `legal-routes.test.ts` checks it against the route files.
[Decision 011](../decisions/011-legal-documents-inside-ld-09.md) covers their
authorship.

The withdrawal flow (`/legal/withdraw`) is three steps. The first two are GET
requests that carry the values in the query string. The third is a Server
Action (`app/legal/withdraw/actions.ts`), so it works without scripting. It
posts three fields to `POST /store/withdrawals`
(`backend/src/api/store/withdrawals/route.ts`). The route stores nothing: it
emails a trader copy, which is the record, and a buyer receipt. The response
reports separately that the withdrawal was received and whether the receipt
was sent. The store-open gate does not apply to this route.

## 13. Operator reports

| Report | Entry point | Output |
| --- | --- | --- |
| Commerce summary for Meeme | `GET /integrations/meeme-report` (`backend/src/api/integrations/meeme-report/route.ts`, `commerce/meeme-report.ts`) | Aggregate daily figures, behind a 64-hex key header. The trust boundary is [provider-reporting.md](./provider-reporting.md). |
| Discount conversion | `npm run report:discounts` | Carts and paid orders per code |
| VAT thresholds | `npm run report:vat-thresholds` (`commerce/vat-thresholds.ts`) | Year-to-date turnover against the thresholds in [decision 013](../decisions/013-the-vat-arrangement.md) |

Both scripts only read, and print their report. The report route is not in the
storefront proxy's allowlist.

## 14. Known limits

These are accepted today. Candidate work is in
[docs/working/backlog-candidates.md](../working/backlog-candidates.md).

- The cart price lock has a 600-second lease and no fencing token. A holder
  that outlives the lease can overlap the next one.
- Two simultaneous deliveries of one event can both send an email
  (section 8).
- A `processing` redirect (a delayed payment method) still renders the
  payment form.
- `purchase_completed` is not emitted when the order completes on the
  redirect path.
- `GET /store/deals/totals` reads every deal row. It needs a SQL aggregate
  before the table is large.
- The Unknown notice can reach a buyer who was not charged when Stripe.js
  cannot load.

## 15. Where to look first

| Question | Start at |
| --- | --- |
| Which environment value does what | `backend/src/config/runtime.ts`, `storefront/src/config/runtime-config.ts` |
| What happens after payment | `backend/src/subscribers/order-placed.ts` |
| Why a checkout will not pay | `storefront/src/lib/checkout-rules.ts` |
| What a browser may reach | `storefront/src/app/api/store/[...path]/route.ts` |
| What a certificate publishes | `backend/src/api/store/deals/[slug]/route.ts` |
| Open work | [docs/working/backlog-candidates.md](../working/backlog-candidates.md) |
