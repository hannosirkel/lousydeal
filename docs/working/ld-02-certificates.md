# LD-02 — Certificates

Issue a real certificate for a real order, address it at a URL nobody can
enumerate, render it as a page and as a vector PDF, and send the buyer the
confirmation the law requires on a durable medium.

The contract is [`fresh-build.md`](./fresh-build.md); this slice executes its
§17 LD-02 list against §5 (certificates), §16 (domain model) and §23 (legal and
payment UX). The visual layer it renders into is
[LD-09](./ld-09-visual-identity.md), complete on 2026-09-06.

**This is the slice the site cannot publish without.** VÕS § 53(4) p 7¹ removes
the right of withdrawal for digital content only where three conditions are met,
and the third is the trader's § 55(1)–(2) confirmation on a durable medium.
LD-09 shipped four documents that each say, truthfully, that we do not send one.
Until this slice does, every order keeps a 14-day right whatever the buyer
ticked. That is recorded as gate item 11 and as LD-09's one deferral that became
a hard precondition.

**Execution.** Directly, not through `big-build`. Nineteen rows, one pull
request each, across three repositories — sixteen as planned, with C3 and
C5 each split at execution for the reasons recorded there.

## Global constraints

LD-09's, carried forward unchanged except where noted. Constraint 7 was spent by
LD-09 and is replaced here.

1. **Never commit a secret.** `lousydeal` and `deploys` are public and must be
   safe to publish on every commit. No SMTP username, password, submission host
   or destination CIDR becomes a literal in either repository. The mail
   credentials are two username/password pairs, live and test, and they go to
   OpenBao — never to a manifest, a test fixture or a comment.
2. **Nothing that differs between test and live is baked into a built
   artifact.** No `NEXT_PUBLIC_*`. Per-environment values are read server-side
   per request through `src/config/runtime-config.ts`, or from the process
   environment in the backend through `src/config/runtime.ts`.
3. **One pull request closes one row.** Over 800 changed lines or over 10 files
   needs a named operator override in the pull-request body. Generated ORM
   migrations and lockfiles are excluded from the line count and named
   separately, as §18 allows.
4. **Comments explain non-obvious intent, constraints, invariants or
   trade-offs. They do not narrate code.**
5. **Test durable behaviour, not file existence.** A focused test in the same
   commit.
6. **A row's file list stays inside one repository.** Cross-repository work is
   two rows with a stated order.
7. **A certificate that exists is never restyled.** §5 fixes this: an issued
   deal keeps its layout version for life, a redesign is additive, and a retired
   layout stays in the codebase and stays tested. LD-09 recorded the field;
   this slice is where it starts carrying weight, so the first row that renders
   a certificate dispatches on it rather than reading it and ignoring it.
8. **Run `bash scripts/validate` before declaring a row done.**
9. **A row that falsifies a tracked document carries that document in its
   `Files` list.** Four legal documents currently state that no confirmation is
   sent. The row that starts sending one owns all four.
10. **A claim is bounded, cited, or executed. Otherwise it does not go in.**
11. **A claim proven false may be corrected by a maintenance pull request** in
    any file no open row declares.
12. **No surface invents brand.** [`brand.md`](../current/brand.md) is the
    authority for every colour, size, word and rule, including the words on a
    certificate and in an email.
13. **The billing name is never public.** §5 states it once; this slice touches
    every surface where it could leak — the deal record, the Store API
    response, the page, the PDF, the social card and the counter — so it is a
    constraint rather than a row's detail. A test asserts the absence on each.

## Current repository facts

Measured against `origin/main` at `a6a6584`, 2026-09-06. A plan that assumes a
codebase it has not read is how the previous build produced rows that could not
be executed.

| Fact | Where | Consequence for this slice |
| --- | --- | --- |
| The checkout collects **no email address** | `storefront/src/app/checkout/PaymentForm.tsx` | Medusa carries `cart.email` through to `order.email` and tolerates `null` (`@medusajs/core-flows/dist/cart/workflows/complete-cart.js:446,505`). There is nowhere to send a confirmation. C3b adds the field. |
| The checkout collects **no inscription** | same | §5's two fields do not exist at entry. `inscription.ts` filters at render only. |
| `certificate-model.ts` carries **one** `inscription` field | `storefront/src/lib/certificate-model.ts` | §5 and §16 want two — display name and dedication ≤120. C5 reconciles: two stored, one derived for the render. |
| `SPECIMEN_CERTIFICATE` is serial 0, at `/design/certificate` | same | Stays. It is not at a `/done-deals/` URL and must not move to one. |
| `backend/src/api` **does not exist** | `backend/src` | The public deal endpoint (C4) is the first custom Store API route in this repository. |
| `backend/src/modules` **does not exist** | `backend/src` | The deal module (C1) is the first custom module. The reference project's `modules/omniva` is service-only with no data model, so there is no local precedent for a migration. |
| The notification module is **already loaded** | `deploys/lousydeal/base/predeploy-job.yaml:105-113` names `notification-local` among the packages loaded at migrate time | Adding an SMTP provider is a provider registration, not a new module. |
| `predeploy-job.yaml` mounts ten `emptyDir`s over `dist/migrations` | same | MikroORM's `ensureMigrationsDirExists` creates the directory for every loaded package and fails under `readOnlyRootFilesystem`. A new module that **ships** a migrations directory needs no mount; one that does not, does. C10 verifies which, against the built image, rather than assuming. |
| The storefront has **five** runtime dependencies | `storefront/package.json` | The PDF renderer is the first addition since LD-01. It is justified in C6 rather than added quietly. |
| `third-party-disclosure.test.ts` guards external hosts by tag shape | `storefront/tests/` | C7's share links are anchors, not scripts or images. The row states which shapes the guard covers and extends it if anchors are not among them. |
| Four legal documents say we do not send a confirmation | `storefront/src/content/legal/{terms,refunds}.ts`, `checkout.ts`, and `legal-consistency.test.ts` asserts it across seven surfaces | C13 rewrites all four and inverts the guard. Until C13 merges, the statements stay true. |

## Target exposure

Both environments, both still behind Cloudflare Access. §23's legal gate
precedes publication and this slice does not close it. No live Stripe key is
seeded; the memory of that deferral stands.

**Mail is different, and this is the one place where the slice reaches
outward.** A confirmation email leaves the cluster and arrives at a real
address. In `test` that address is whoever completes a test order — the
operator. Nothing in this slice sends mail to anyone who did not just place an
order, there is no list, no marketing send, and no address is stored beyond the
order record the Privacy Policy already describes.

## Completion criteria

| # | Criterion | Row |
| --- | --- | --- |
| 1 | A completed order mints exactly one deal, with a sequential serial and an opaque slug | C1, C2 |
| 2 | A replayed `order.placed` mints nothing further — proven by firing it twice | C2 |
| 3 | The buyer can enter a display name and a dedication, is shown they are public, and is told what is filtered | C3c |
| 4 | `/done-deals/{slug}` renders the certificate from stored data and carries no billing name | C4, C5a, C5b |
| 5 | `/done-deals/{slug}/certificate.pdf` is a vector PDF with embedded fonts, produced without a browser | C6 |
| 6 | The page has share links and a per-deal social card, and neither loads a third-party asset | C7 |
| 7 | A confirmation email reaches the buyer, containing everything § 55(2) and § 54(1) require | C8, C9a, C9b |
| 8 | Both environments send mail, with credentials from OpenBao and egress restricted to the submission host | C10, C11 |
| 9 | The public counter reports real deals and nothing else | C12 |
| 10 | No document still says a confirmation is not sent | C13 |
| 11 | A withdrawal gets the § 56⁴(4) receipt on a durable medium | C14 |
| 12 | Gate D on every row, Gate E on the rendered site, and the record written | C15, C16 |

## Rows

Sixteen. Each names its repository, its files and its one checkbox. The order is
a dependency order, not a preference: C1 before C2, C8 before C9, C10 and C11
before either environment sends anything.

### C0 — This plan

**Repository:** `lousydeal`.
**Files:** `docs/working/ld-02-certificates.md`, `docs/working/status.md`.

- [ ] Land the plan and move the resume point to it.

### C1 — The deal module: what a deal is, its serial, and its slug

**Repository:** `lousydeal`.
**Files:** `backend/src/modules/deal/index.ts`, `.../models/lousy-deal.ts`,
`.../service.ts`, `.../slug.ts`, the generated migration and its schema
snapshot, `backend/src/config/deal.ts`, `backend/medusa-config.ts`,
`backend/tests/deal-module.test.ts`, `backend/tests/medusa-config.test.ts`.

- [x] Define the `LousyDeal` model against the installed Medusa (2.18.0), register
      it, generate its migration, and prove the serial is sequential and the
      slug is not derivable from it.

§16 gives the field list and says the exact schema must be designed against the
installed version. The row starts by reading `@medusajs/framework`'s `model`
helper in `node_modules`, not by copying a blog post: `model.define` and
`MedusaService` are the documented v2 shape, and `medusa db:generate <module>`
produces the migration.

**The serial is a database sequence, not a count.** `MAX(serial)+1` under two
concurrent orders returns the same number twice, and a serial is the one field
on the certificate whose whole job is being believed. A Postgres sequence is
monotonic under concurrency and does not care that gaps are possible — §5
forbids *inflating* the sequence, not skipping a number a rolled-back
transaction consumed.

**The slug is 16 characters of `crypto.randomBytes`, base32, no vowels.** §5:
opaque, random, not the serial, not sequential, not guessable. Dropping vowels
is not obfuscation; it stops the generator producing a word. The two fields are
independent, and the test asserts that neither is computable from the other by
generating a hundred and checking for correlation in neither direction.

**`order_id` carries a unique index, and that is the idempotency guarantee.**
Not a lock, not a check-then-insert — the constraint. C2 depends on it.

**`layout_version` is written at issuance and never updated.** Constraint 7.

**Three departures from the file list this row was planned with**, each forced
by how Medusa 2.18 actually behaves rather than chosen:

- **No `serial.ts`.** The DML has `model.autoincrement()`, which maps to a
  MikroORM `Property({ autoincrement: true })` and generates `"serial" serial`
  — a real `nextval('lousy_deal_serial_seq')` default. The plan called for a
  sequence and the framework already had one; a hand-rolled `nextval` helper
  would have been a second mechanism for the same guarantee.
- **The model is `models/lousy-deal.ts`, not `model.ts`.** Medusa discovers a
  module's models by scanning that one directory
  (`@medusajs/modules-sdk/dist/loaders/utils/load-internal.js:393`). Defined
  beside the service instead, everything compiled and registered and
  `medusa db:generate deal` answered `Skipped. No changes detected in your
  models.` against an empty database. Found by running it.
- **`src/config/deal.ts` exists**, matching `payment.ts` and `redis.ts`, and it
  supplies a `key`. Without one, `defineConfig` learns the module's name by
  `require`-ing it at config-assembly time (`define-config.js:74-91`) — Node's
  `require`, which cannot read a directory of `.ts` files unless something has
  registered `ts-node`. True under the Medusa CLI, false under Vitest, so
  `medusa-config.ts` became unimportable in its own test. `key` skips that
  branch; the cost is that the name is written twice, and a test binds the two.

**Verified against a real PostgreSQL**, not only against the DML: the migration
applied, `\d lousy_deal` shows `serial` defaulting to the sequence and all
three partial unique indexes, three inserts took serials 1, 2 and 3, and a
fourth insert reusing `order_1` was refused by
`IDX_lousy_deal_order_id_unique` with the row count unchanged. That last one is
C2's guarantee, proven at the level that enforces it.

### C2 — Issuance, and its idempotency under replay

**Repository:** `lousydeal`.
**Files:** `backend/src/subscribers/order-placed.ts`,
`backend/src/modules/deal/issue.ts`, `.../inscription.ts`, `.../service.ts`,
`.../models/lousy-deal.ts`, `backend/tests/deal-issuance.test.ts`.

- [x] Mint a deal from `order.placed`, reading the inscription from the order,
      and return the existing deal rather than a second one when the event is
      replayed.

The reference project's `subscribers/order-placed.ts` is the shape. Medusa's
Redis event bus is at-least-once and the Stripe webhook is retried by Stripe
independently, so a replay is expected traffic rather than an error path.

**Read first, then insert, then read again**, rather than the plan's original
"catch the unique-violation and re-read". The correction is that there is
nothing recognisable to catch: Medusa's `dbErrorMapper`
(`@medusajs/utils/dist/dal/mikro-orm/db-error-mapper.js:20-30`) rewrites a
Postgres 23505 into a `MedusaError` reading `"Lousy deal with order_id: …,
already exists."`, so the SQLSTATE is gone before a caller sees it and matching
that sentence would tie issuance to Medusa's phrasing. The discriminator is
instead *does the deal now exist* — the same question the error was answering,
and true however it is worded. An error that leaves no deal behind is rethrown.

The read-first step is not only an optimisation: without it a retry storm burns
a serial per delivery, and the test asserts the create count, not just the row
count, because both are 1 either way.

**Issuance never throws into the subscriber.** A failed issuance must not
retry-loop the event bus forever; it logs and leaves the order intact, because
an order that took money and has no certificate is recoverable by hand and an
event storm is not.

**A slug collision is not retried**, and the arithmetic is why: 16 characters
over a 30-character alphabet is ~78 bits, and at a million deals the chance any
two collide is around 10^-11. A retry loop for that is code no test can reach.

**`issued_at` is the order's own creation time, not the clock at issuance.** A
subscriber can run long after the order it is about — a backlog, a redelivery,
a replay after an outage — and a certificate dated by whenever the worker
caught up is wrong on its face. It also makes a replay produce the identical
record rather than a differently-dated one.

**Two findings that change later rows**, both from reading Medusa rather than
from reasoning about it:

- **Cart metadata is attacker-controlled.** The storefront writes the
  inscription through `POST /store/carts/:id`, whose validator is
  `metadata: z.record(z.string(), z.unknown()).nullish()`
  (`@medusajs/medusa/dist/api/store/carts/validators.js:11`) — public, and
  accepting any value under any key. So **§5's entry-side filter has to run at
  issuance in the backend, not only in the checkout form**; a filter in front
  of a public API filters nothing. C3's text below is amended accordingly. C2
  validates shape only (string, trimmed, length-capped), which is safe because
  nothing renders a stored inscription until C5 and C3c lands first.
- **An order can be for more than one certificate.** `addToCart` appends to
  whatever cart the cookie names and Medusa merges a repeated variant into one
  line of quantity two, while §16 gives the deal one `order_id` and no line
  reference. The subscriber therefore issues only for exactly one line of
  quantity one and otherwise logs and issues nothing — printing a single tier
  and price for a two-item order would be a fabricated transaction, which
  `AGENTS.md` forbids. **C3a owns making that unreachable**, and did. It is not reachable
  by a customer today: both environments are gated and no live payment key
  exists.

**60 characters for the display name is this row's number, not the
contract's.** §5 says "short" and gives 120 only for the dedication. 60 is what
fits the certificate's `BEARER` row on one line at 390px. `brand.md` should
adopt or replace it.

**Verified against a real PostgreSQL**, because one assumption underneath all
of this is not unit-testable: that `createLousyDeals` returns the
sequence-assigned serial rather than an unsaved row. Two orders through the
real module service returned serials 1 and 2 with distinct slugs
(`xbts2k3mmv3trv3n`, `rzfm61snnj1gnx9f`), a replay of the first returned the
identical id, serial and slug, and the table held two rows.

### C3 — The checkout, in three rows

**Split at execution.** C2's two findings each added work to what was one row,
and the whole of it came to twelve files against §18's bound of ten — with
`privacy.ts` among them, because the notice states in as many words that no
email address is held. §18 invites decomposing where useful, and these three
are each independently reviewable and independently rejectable:

| | |
| --- | --- |
| **C3a** | One certificate per order |
| **C3b** | The email address, and the notice that has to stop saying we hold none |
| **C3c** | The inscription: two fields, filtered on both sides of the boundary |

#### C3a — One certificate per order

**Repository:** `lousydeal`.
**Files:** `storefront/src/lib/cart-actions.ts`,
`storefront/src/lib/store-cart.ts`, `storefront/src/lib/store-checkout.ts`,
`storefront/src/lib/checkout-rules.ts`,
`storefront/src/app/checkout/page.tsx`, `storefront/src/content/checkout.ts`,
`storefront/tests/cart-actions.test.ts`,
`storefront/tests/store-checkout.test.ts`,
`storefront/tests/checkout-single-certificate.test.ts`.

- [x] Make `addToCart` replace rather than append, and refuse to offer payment
      for a cart that is not exactly one line of quantity one.

§16 gives the deal one `order_id` and no line reference, so an order for two
things has no single tier and no single price to certify. C2's subscriber
issues nothing for such an order rather than print a transaction that did not
happen — and an order that takes money and yields no certificate is the worst
outcome available, so the checkout must not offer to take one.

**Two checks, and the second is not redundant.** `addToCart` keeps the cart out
of the state; `checkout/page.tsx` refuses to render a pay control if it is in
it anyway. `POST /store/carts/:id/line-items` is public, so the state is
reachable by anyone who wants it, and a cart made before this row shipped can
still be in it.

**Replacing is also what the buyer means.** The three tiers are a choice
between things that deliver the same nothing (§4.1); pressing "add" on a second
one is changing your mind, not ordering a pair.

**Two pre-existing defects fell out of it**, both in the branch that reuses the
cookie's cart:

- **A cart id that no longer resolves threw out of the Server Action**, so a
  visitor got an error page for pressing a button. Nothing expires a cart here,
  but a restored database, a cookie carried between environments or a
  hand-edited value all produce one.
- **A completed cart was reused, which made a second purchase impossible.**
  Nothing clears the cart cookie at checkout and nothing could — it is
  `httpOnly`, so the Client Component that knows the order succeeded cannot
  reach it. Its lines can no longer be changed, so every add failed. Now a
  completed cart is replaced with a new one.

**The end-to-end stub in `store-checkout.test.ts` was not faithful**, and this
row's first failure exposed it: its `GET /store/carts/:id` answered with a cart
carrying no `items` at all, however many the test had just added. That passed
while nothing read them, and would have let the one-certificate rule be
asserted against a fiction. The stub now keeps its lines.

#### C3b — The email address

**Repository:** `lousydeal`.
**Files:** `storefront/src/app/checkout/PaymentForm.tsx`,
`storefront/src/lib/store-checkout.ts`, `storefront/src/content/checkout.ts`,
`storefront/src/content/legal/privacy.ts`,
`storefront/tests/legal-privacy.test.ts`,
`storefront/tests/checkout-email.test.ts`.

- [x] Collect a required email address, write it to the cart before
      completion, and correct the privacy notice that says we hold none.

**The email is required.** Without it there is no durable medium, and without
that the § 53(4) p 7¹ exclusion never bites — so an optional email would mean
two classes of order with different withdrawal rights and a checkout that
cannot tell the buyer which they are in. One class, one answer.

**Every order this storefront could place was unaddressed.** Not "carried a
default address" — nothing set `cart.email` at all, and Medusa carries that
straight through (`complete-cart.js:446,505` passes `cart.email` and
`cart.email || null` without requiring either). That is the state the § 55
confirmation could never have been sent from, whatever C8 and C9 build.

**Set before the card is charged**, not after. `setCartEmail` and
`setCartCountry` both run ahead of `stripe.confirmPayment`, so an address
Medusa refuses costs the buyer nothing. Medusa validates it for real
(`email: z.string().email().nullish()`, `carts/validators.js:18`), and the
function reads the value back — which is what separates "Medusa accepted it"
from "the request did not error".

**Five sentences in the privacy notice stopped being true**, and constraint 9
is why the document is in this row's file list rather than a later one:

| § | Was | Now |
| --- | --- | --- |
| 3 | "asks you for two things" | three, the address named first, and what it is for |
| 4 | "There is no name and no email address on it" | the address is listed; the *name* half is still true and is kept rather than dropped with it |
| 7 | "Keeping the accounting record is a legal obligation" | confirming the order on a durable medium is one too, and is the basis for holding the address |
| 7 | silent on how long the address is held | part of the order record: seven years, said outright |
| 8 | "Because we hold no name and no email address…" | identification rewritten around the address that now exists |

**The field says the confirmation is not sent yet.** Between this row and C9 it
would otherwise be the first surface on the site to imply the § 55 duty is
discharged; `legal-consistency.test.ts` holds the other six to that line and
this hint joins them.

**What the tests cannot reach**, stated rather than papered over: `handleSubmit`
needs a browser, a DOM and a live Stripe. So the field is asserted off real
markup, `setCartEmail` against a stub, and the one link between them — that the
address is set before the payment is confirmed — against the source, which is
the instrument `legal-routes.test.ts` already uses for the same reason.

#### C3c — The inscription

**Repository:** `lousydeal`.
**Files:** `tests/fixtures/inscription-cases.json`,
`storefront/src/app/checkout/PaymentForm.tsx`,
`storefront/src/lib/inscription.ts`, `storefront/src/lib/store-checkout.ts`,
`storefront/src/content/checkout.ts`,
`backend/src/modules/deal/inscription.ts`,
`backend/tests/inscription-filter.test.ts`,
`storefront/tests/certificate.test.ts`,
`storefront/tests/checkout-inscription.test.ts`.

- [x] Collect the two optional inscription fields, filter them at entry — **in
      the backend, at issuance** — and show the buyer what will be public
      before they pay.

**Entry-side filtering was the half §5 asks for that did not exist.**
`sanitiseInscription` already stripped markup, URLs, bare domains, addresses
and telephone numbers at render.

**Amended by C2: the entry-side filter belongs in the backend.** The plan first
put it in the checkout form alone. C2 found that the endpoint carrying the
inscription — `POST /store/carts/:id` — is public and accepts arbitrary
metadata, so the storefront form is not a boundary and filtering there protects
nothing. The filter runs in `backend/src/modules/deal/inscription.ts`, where
the trust boundary is. The checkout keeps its own copy for the preview it shows
before payment, which is a disclosure duty rather than a security one — and the
value that travels to the cart is the raw one, so the two cannot look agreed
when only one is load-bearing.

**Two implementations, and two mechanisms holding them together**, because they
catch different failures:

- `tests/fixtures/inscription-cases.json` says what the rules must *do*. Both
  suites run every case. It would still pass if one copy gained a rule the
  other lacks and no case exercised it.
- `backend/tests/inscription-filter.test.ts` compares the two files' shared
  regions **character for character**, between sentinels each file carries.
  That catches exactly what the fixture cannot. Proven: drifting one regex in
  one copy fails the comparison and no fixture case.

A third test guards the fixture rather than the filter — every rule the shared
region declares must be described by at least one case's stated reason, so a
rule cannot be protected by the character comparison alone and described
nowhere.

**One case is a deliberate keep, not a gap.** `javascript:alert(1)` survives
the filter. An inscription is rendered as text and never as an `href` or any
attribute, so it cannot execute; §5's targets are a billboard and a phishing
surface and this is neither; and the rule that would catch it — a word followed
by a colon — also eats `Note:` and `10:30`, which is the same over-eagerness
three Gate D findings already punished. The fixture records the reasoning
rather than leaving the case out.

**The limit is counted after filtering.** That is what makes 120 a limit on
what appears on the certificate rather than on what was typed; capping first
would let a buyer spend the allowance on text that was going to be removed and
arrive with a dedication shorter than the preview showed them.

**Dedication is capped at 120 characters**, §5's figure. The display name is
capped at 60 — C2's number, not the contract's — and both now live in the
fixture, with each workspace's constant asserted against it.

**Dedication is capped at 120 characters**, §5's figure, counted after
filtering rather than before. The display name is capped at 60 — C2's number,
not the contract's; see there.

The fields go to `cart.metadata` through the same `POST /store/carts/:id` that
already sets the country, and Medusa copies cart metadata to the order.

### C4 — The public deal endpoint

**Repository:** `lousydeal`.
**Files:** `backend/src/api/store/deals/[slug]/route.ts`,
`backend/tests/deal-route.test.ts`, `backend/tests/smoke/store-api.test.ts`.

- [x] Serve a deal by slug over the Store API, returning only what §5 makes
      public, and 404 for a slug that does not exist.

The first custom Store API route here. The response carries serial, tier,
amount, currency, issue date, layout version and the two inscription fields.
It carries no order id, no email, no billing name and no payment detail — and
the test asserts the response's key set exactly, so a later field added to the
model does not leak by default. That is the inverse of the usual test and it is
deliberate: an allowlist fails closed.

**404 rather than 403 for an unknown slug.** The slug is the only secret; a
response that distinguishes "no such deal" from "not yours" would make it
enumerable, which §5 says is the entire reason the slug exists. A hidden
certificate answers the same 404 in the same words, for the same reason — 410
Gone would leak the same fact more politely.

**No `middlewares.ts`, and that is a finding rather than an omission.** The
plan expected one. `ensurePublishableApiKeyMiddleware` is applied to the whole
`/store` namespace by the framework's own loader
(`@medusajs/framework/dist/http/router.js:98`), so a route file placed under
`src/api/store/` inherits it with nothing declared. Asserted rather than
assumed: the smoke suite makes the same request without the key and requires a
400 naming `x-publishable-api-key`.

**The date, not the moment.** §5 asks the certificate to carry an issuance
date; the exact second somebody bought something is more than the document
needs, and this endpoint is unauthenticated. Sliced rather than formatted, for
the reason `money.ts` gives about locale data moving.

**Verified against the running server** through `scripts/store-smoke`, which is
where the wiring lives that no unit test reaches — that the file's path becomes
the route at all. Two cases, neither needing a deal to exist: the keyed request
answers this route's own 404 body rather than the router's fallback, and the
unkeyed one answers 400. The 200 path needs a real order, and that is C15.

**`medusa build` refused the first version**, and so did `tsc`: `req.params.slug`
is `string | undefined`, and passing it unguarded would have reached MikroORM as
`{ public_slug: undefined }` — no condition at all, and therefore the first row
in the table answered to a request that named no deal. Vitest passed it,
because Vitest does not typecheck. Found by running the build, not by reasoning.

### C5 — The certificate on real data, in two rows

**Split at execution**, for the reason C3 was: the whole came to twelve files
against §18's bound of ten, `brand.md` among them because the document
described one inscription field where §5 gives two.

| | |
| --- | --- |
| **C5a** | The certificate carries §5's two fields |
| **C5b** | `/done-deals/{slug}`, and the layout registry |

#### C5a — The certificate carries §5's two fields

**Repository:** `lousydeal`.
**Files:** `docs/current/brand.md`,
`storefront/src/lib/certificate-model.ts`,
`storefront/src/components/document/Certificate.tsx`,
`storefront/src/app/globals.css`, `storefront/tests/certificate.test.ts`.

- [x] Split the model's one `inscription` into `displayName` and `dedication`,
      render the dedication as a quotation, and describe it in `brand.md`
      before the surface renders it.

**§5's requirement, not a layout preference.** An operator must be able to
"further sanitise, hide, or blank **either** field" later; one column would
make blanking the dedication a rewrite of the name. They are also different
kinds of thing — the name is a fact about the document and belongs in the
ledger; the dedication is somebody's voice — so a single string would have had
to be split to be rendered anyway.

**The dedication is the one element that disappears when empty.** Every ledger
row holds its place, because a missing row is a document with something wrong
with it. An empty quotation is not a deliberate blank; it is a pair of
quotation marks around nothing.

**The quotation marks are drawn by the stylesheet.** A buyer who types a quote
character would otherwise be nested inside the document's own, and `q` would
add locale-dependent marks — which a document made to be screenshotted and sent
on must not do, for the same reason `brand.md` §4 gives about the ISO date.

**`brand.md` moved first**, under constraint 12: it described one inscription
where §5 gives two, and a surface that needs something the document does not
give amends the document in the same pull request. Reviewing the copy as copy
rather than finding it in a diff is the whole point of the rule.

#### C5b — `/done-deals/{slug}`, and the layout registry

**Repository:** `lousydeal`.
**Files:** `storefront/src/app/done-deals/[slug]/page.tsx`,
`storefront/src/app/done-deals/[slug]/not-found.tsx`,
`storefront/src/lib/store-deal.ts`,
`storefront/src/lib/certificate-layouts.ts`,
`storefront/src/lib/certificate-model.ts`,
`storefront/tests/done-deals-page.test.ts`.

- [x] Mount the certificate at its real route against a real record, dispatch
      on the stored layout version, and 404 for an unknown slug.

**Layout dispatch, not layout reading.** A registry keyed by version, with
layout 1 as its only entry today, so adding layout 2 is a new entry rather than
an edit to a rendered certificate. Constraint 7 in code — and the test that
matters is that an unknown version does **not** fall back to layout 1, because
a silent fallback would restyle a certificate somebody already owns. The state
is reachable: roll an older image over a newer one and every deal issued in
between carries a version that image has never heard of.

**`Certificate.layout` widens from `1` to `number`.** It was the literal while
the only source was the specimen. The source is now a database row, which can
carry a version this build has never seen, and narrowing that at the type level
would be the compiler asserting something only the registry can check.

**Two allowlists, on both sides of one wire.** C4's projection publishes eight
fields; `getDeal` reads exactly those eight by name rather than spreading. The
duplication is deliberate — constraint 13 is an absence, and an absence needs
guarding wherever it could reappear. The test answers with `customer_name`,
`email` and `order_id` and asserts the record's key set is unchanged.

**A 404 is an answer; every other status is a failure.** `cart/page.tsx` set
that precedent and this follows it. Answering a 503 as "no such deal" would
tell somebody their certificate had been withdrawn because a database was
briefly unreachable.

**The route has its own `not-found.tsx`**, because the root one's copy is about
a page and the person reading this was sent a link. It names both reasons an
address can be empty — never issued, or withdrawn — and confirms neither, which
is the line C4 draws for the same reason. Its first draft claimed "this is not
a mistyped one", which is false: a mistyped link is the commonest cause.

`noindex, nofollow` on the route: an unguessable URL that a crawler publishes is
a guessable one.

### C6 — The PDF

**Repository:** `lousydeal`.
**Files:** `storefront/src/app/done-deals/[slug]/certificate.pdf/route.ts`,
`storefront/src/lib/certificate-pdf.ts`,
`storefront/src/lib/pdf-layout-1.ts`, `storefront/src/app/palette.ts`,
`storefront/package.json`, `package-lock.json`,
`storefront/next.config.ts`,
`storefront/tests/certificate-pdf.test.ts`,
`storefront/tests/third-party-disclosure.test.ts`.

- [x] Render the certificate as a vector PDF with embedded IBM Plex Mono,
      served by the application, with no browser and no object storage.

**PDFKit**, and the row states why rather than assuming. §5 forbids driving a
headless browser and forbids object storage; that leaves a drawing library.
PDFKit accepts a font as a `Buffer` for `registerFont` and streams the document
into one — so the vendored `public/fonts/IBMPlexMono-{Regular,Bold}.ttf` that
LD-09 committed for `next/og` serve the PDF too, from one provenance-tested
source. Never using a standard-14 font means the AFM metrics that make PDFKit
awkward under bundlers are never loaded; `serverExternalPackages` covers the
rest.

**It is a second layout and it is allowed to drift.** §5 says so explicitly.
The PDF is not a screenshot of the page and no test asserts they match; each is
tested for what its own medium requires. What both must satisfy is constraint
13 and the layout registry.

The test parses the produced bytes — and parsing them properly is most of the
row's test effort, because the words are not in the file. PDFKit embeds each
font as a subset and writes glyph ids, so `Jane` is four two-byte indices into
a subset built for that document. The helper walks the object graph to each
font's `ToUnicode` CMap and decodes the runs through it, which is how any
reader copies text out of a PDF. **Per font**: the document uses two cuts with
two subsets and two glyph-id spaces, and merging their maps decoded the title
correctly while turning the whole ledger into somebody else's letters.

**Three assertions were wrong before they were right**, each because a PDF is
not what it looks like from the outside:

- `/Subtype /TrueType` — PDFKit emits `/Type0` with a `/CIDFontType2`
  descendant, which is the composite form, not the simple one.
- `/Image` absent — PDFKit writes `/ProcSet [/PDF /Text /ImageB /ImageC
  /ImageI]` on every page, so the bare substring matches a document with no
  image in it. `/Subtype /Image` is the real test.
- the buffer's length as a proxy for content — which would pass against a page
  of question marks, and did not survive being replaced.

**`pdfkit` is the storefront's first new dependency since LD-01**, and
`third-party-disclosure.test.ts` states the whole list precisely so that an
addition is deliberate. It draws from a font buffer and coordinates: no socket,
no environment, nobody contacted, so it adds no third party to Privacy §5.

**`app/palette.ts` gains a second consumer.** A PDF has no cascade, exactly as
Satori has none, and `tokens.test.ts` bans a hex literal anywhere else under
`src` — so the file's "there are exactly two declared homes" note now says why
the count of *renderers* is not the point.

**An inscription the embedded font cannot set becomes `?`, visibly.** A browser
falls back to another face; a PDF has only what it embedded, and an unmapped
codepoint draws as `.notdef` — a gap that looks like the buyer typed a space.
Measured on these files: Latin, Latin Extended, Greek, Cyrillic, punctuation
and currency are present; CJK, emoji and the right-to-left scripts are not. A
visible substitution beats an invisible hole; the real fix is a fallback font
in the image, which is **not done and is recorded in the deferrals table**.

**Verified by looking at it**, which is the only way this row's actual defect
was ever going to be found: the first render put the closing rule at the page
foot, leaving about 270 points of white between the clause and the rule — a
document that stopped rather than one that finished. The rule now follows the
content. §14, in one page.

### C7 — Share links, and the per-deal social card

**Repository:** `lousydeal`.
**Files:** `docs/current/brand.md`,
`storefront/src/app/done-deals/[slug]/opengraph-image.tsx`,
`storefront/src/app/done-deals/[slug]/page.tsx`,
`storefront/src/components/document/ShareRow.tsx`,
`storefront/src/content/certificate.ts`, `storefront/src/app/globals.css`,
`storefront/tests/share-links.test.ts`,
`storefront/tests/done-deals-page.test.ts`,
`storefront/tests/third-party-disclosure.test.ts`.

- [x] Give the certificate page share links and its own 1200×630 card, without
      loading anything from a third party.

LD-09's `opengraph-image.tsx` is the pattern, including `await connection()` to
force dynamic rendering — the defect V13 shipped and had to fix was a card
baked at build time with no store reachable, and a per-deal card cannot be
prerendered at all.

**Share links are anchors, not widgets.** No script, no iframe, no image, no
button that phones anyone. An `<a>` sends nothing until somebody presses it.
Each carries `rel="noopener noreferrer"` — the second half being this site's
own posture rather than the security rule: without it the destination learns
the certificate's address from the `Referer` header before its owner has said
anything.

**These are the first external links this source has ever carried.** `grep
'href="http' storefront/src` was empty before this row. So they were added to
`PERMITTED` in `third-party-disclosure.test.ts` — a guard that already existed
and which this row found by tripping it — rather than by widening a pattern. A
fourth destination is now a decision somebody makes on that line.

**No processor is added to the Privacy Policy**, and the reason is stated on
the page rather than only in a document: the row's own fine print says nothing
reaches any destination until the reader presses a link, and that the page
loads nothing from them either way.

**The URL comes from the request's own host**, not a configured base URL.
There is none in this storefront and adding one would put an
environment-specific value where `next build` could see it, which decision
`002` forbids.

**`generateMetadata` replaces the static export**, because the title now
carries the serial — a link that unfurls identically for every certificate is
one nobody can tell apart. `noindex` had to move with it, which is exactly the
kind of thing that gets dropped, so the test asserts it through the function.

**`brand.md` gained both surfaces**, under constraint 12: it described no share
row at all, and its social-images section said only that certificate images
would arrive with LD-02.

**Verified against the built server**: the card renders at 1200×630 with the
serial in stamp red, `og:title` and `og:image` are attached, `noindex` survives,
all three links carry the encoded address, and an unknown slug answers 404 for
the card as well as the page.

### C8 — SMTP: the transport

**Repository:** `lousydeal`.
**Files:** `backend/src/notifications/smtp.ts`, `.../index.ts`,
`backend/src/config/runtime.ts`, `backend/src/config/notification.ts`,
`backend/medusa-config.ts`, `backend/package.json`, `package-lock.json`,
`backend/tests/smtp-provider.test.ts`,
`backend/tests/mail-submission-target.test.ts`,
`backend/tests/runtime-config.test.ts`.

- [x] Register an SMTP notification provider reading its host, port, TLS
      servername, envelope sender and credentials from the environment, and
      refuse to start if the transport is not TLS or the configuration is
      partial.

The reference project's `notifications/smtp.ts` is the shape and this row ports
it: `AbstractNotificationProviderService`, nodemailer, `requireTLS: true`,
`rejectUnauthorized: true`, `minVersion: "TLSv1.2"`, a `TransportFactory` seam
so the test never opens a socket. Provider id `lousydeal-smtp`.

**The submission-target test is not decoration.** It asserts the transport
options this file builds are the ones that refuse plaintext — a regression here
is a credential sent in the clear, and it would pass every other test in the
suite. Proven: dropping `requireTLS` fails that file and nothing else.

**Mail is the one nullable value in `BackendRuntimeConfig`, and that is this
row's one real departure.** The plan said "refuse to start if any is missing".
Every other value here does exactly that — but C8 teaches the backend to
*send*, and C10 and C11 are the rows that give either environment something to
send *through*. A required `SMTP_HOST` would take two running deployments down
for the length of three pull requests. `runtime.ts`'s own header already
records the identical reasoning for `MEDUSA_ADMIN_EMAIL`.

What makes it safe is that the absence is loud rather than silent:

- **A partial configuration throws and names what is missing.** A deployment
  with `SMTP_HOST` and no `SMTP_PASSWORD` is misconfigured, not unconfigured,
  and reading it as unconfigured would swallow the mistake exactly where it
  costs a buyer their § 55 confirmation.
- **The module is not registered at all when mail is absent**, rather than
  registered with nothing to send through — which would fail on the first
  order rather than at boot, and for every order rather than once.
- **A row after C11 should tighten this to required**, and the type says so.

**Port 587 exactly, and a TLS servername when the host is an IP.** 25 is relay
and 465 is implicit TLS, which `secure: false` + `requireTLS: true` cannot
speak; either would connect and then behave differently from what the file
documents. And `rejectUnauthorized: true` has nothing to match a certificate
against an IP address — the next reader would turn it off to make it work.

**The thrown error carries nothing from the original.** A transport failure's
message routinely quotes the server's response, which on an authentication
failure includes the username — and that error reaches a subscriber that logs
it.

**One assertion exists because the row could otherwise be dead code.**
`medusa-config.test.ts` asserts exactly five customised modules and passes
either way, because its environment sets no mail. So `smtp-provider.test.ts`
loads `medusa-config.ts` under a *configured* environment and asserts the
notification module is really there — without it, nothing in the suite would
notice the provider never being registered.

### C9 — The § 55 confirmation

**Repository:** `lousydeal`.
**Split at execution**, and then split again. Written as one row it came to 981
changed lines against §18's bound of 800; the remainder after C9a came to 865.
§18 gives the override to the operator rather than the author, so the row was
decomposed instead — which §18 invites in the same breath.

| | |
| --- | --- |
| **C9a** | The trader identity and the site's own address, in the backend |
| **C9b** | The § 55 confirmation, as a document |
| **C9c** | Sending it |

#### C9a — The trader identity, in the backend

**Repository:** `lousydeal`.
**Files:** `backend/src/config/merchant.ts`, `backend/src/config/runtime.ts`,
`backend/tests/merchant-identity.test.ts`,
`backend/tests/runtime-config.test.ts`.

- [x] Read the six `MERCHANT_*` values and `SITE_BASE_URL` in the backend, and
      decide what an absent one means.

**Neither was in the plan, and § 55(2) is why both are needed.** The
confirmation must carry the § 54(1) information; a link to `/legal/terms` is
the trader saying "it is somewhere you can reach", which is what § 54(1) asks
for *before* the contract and not what § 55(2) asks for after it. So the six
values the storefront already renders are read here too, from the same variable
names and the same private inventory — decision `004`'s mechanism, a second
reader rather than a second source.

`SITE_BASE_URL` is new to this repository. The storefront never needed one
because it always has a request — C7's share row reads the host from one — and
a subscriber runs on a queue.

**All six or nothing.** The consequence lands in C9b, where an incomplete
identity yields no confirmation at all rather than one naming no trader; this
is where "incomplete" is decided, and a reader that returned five fields and a
hole would move that decision somewhere nobody is looking.

**It does not throw where it is absent, unlike the mail configuration.** The
difference is what an absence means: half a mail configuration is a mistake
nobody makes on purpose, while an absent identity is the ordinary state of any
checkout Orange has not patched, including a developer's. Refusing to boot on
it would make the backend unrunnable locally to protect an email that is not
being sent.

#### C9b — The § 55 confirmation, as a document

**Repository:** `lousydeal`.
**Files:** `backend/src/content/confirmation.ts`,
`backend/src/notifications/order-confirmation.ts`,
`backend/tests/order-confirmation.test.ts`.

- [x] Send the buyer a confirmation on a durable medium containing everything
      § 55(2) and § 54(1) require, with the certificate's link, promptly after
      the order is placed.

**No `transactional-email.ts`.** The plan expected a shared wrapper, ported
from the reference project, which has two transactional emails to share it
between. This slice has one until C14 adds the withdrawal receipt, and a
wrapper around a single caller is a layer whose shape is guessed rather than
observed. C14 is where the second arrives and the common part becomes visible.

**A confirmation is complete or it is not sent.** The storefront renders
`[LEGAL NAME NOT CONFIGURED]` on a page under decision `004`, which is right
there — saying "this is missing" beats a blank and the reader can come back. It
is wrong in an email: § 55(2) is not satisfied by a confirmation that names no
trader, a duty performed badly cannot be taken back, and one visibly not yet
performed is recoverable from the order record. So an incomplete identity
yields `null`, and the subscriber logs which part was missing, per order.

**It does not say the right of withdrawal is gone.** Sending this is what makes
the third condition *capable* of being met; whether it was met for a given
order turns on facts the email cannot settle. A sentence asserting the right
had lapsed would be the trader deciding a question in its own favour, and a
test forbids one.

**The model form is compared across workspaces.** Directive 2011/83/EU
Annex I(B) fixes the wording and there is no package shared between the two, so
the test reads `storefront/src/content/legal/refunds.ts` and requires every
line to match. Two copies of a statutory text that disagree is worse than
either.

**The buyer's address is never logged.** It is the one piece of personal data
this subscriber handles, and a log line is a place it would outlive the order
record's own retention.

#### C9c — Sending it

**Repository:** `lousydeal`.
**Files:** `backend/src/subscribers/order-placed.ts`,
`backend/tests/order-placed-confirmation.test.ts`.

- [x] Send the built confirmation from `order.placed`, and say per order which
      precondition was missing when it could not.

**This row exists because C9b could otherwise be dead code.** Everything in
C9b's test drives `buildOrderConfirmation` directly, and a subscriber that
built the message and dropped it would pass all of it — the same lesson C8
learned about the notification module never being registered. So the subscriber
is driven with a fake container and the notification it creates is inspected.

**Four preconditions, and the log names whichever is missing**: the trader
identity, `SITE_BASE_URL`, a mail transport, and an address on the order. The
first three arrive with C10 and C11; the fourth arrived with C3b, and before it
every order this storefront could place was unaddressed.

**It never throws, and the address is never logged.** The subscriber's own
header records the first: Medusa retries a rejecting subscriber, so a defect
failing on every delivery of the same event is an event storm rather than a
logged failure. The second is because the buyer's address is the one piece of
personal data this subscriber handles, and a log line is a place it would
outlive the order record's own retention.

**Nothing is sent from either environment yet**, because three of the four
preconditions are absent until C10 and C11.

**This is the row the publication gate is waiting on.** The content is not a
receipt with a link; § 55(2) requires the confirmation to reproduce the
§ 54(1) information unless it was already given on a durable medium, and it was
not — a web page is not one. So the email carries: the trader's identity and
contact details, the main characteristics of what was bought, the total paid
with tax, the withdrawal information at points 12 and 13, the model withdrawal
form of Annex I(B), the § 53(4) p 7¹ consent as the buyer gave it, and the
complaints route.

**It is sent after issuance and names the certificate.** Ordering matters:
Terms §5 states the confirmation is owed no later than the moment supply begins,
and supply is the certificate existing.

**It is a link, not an attachment.** Attaching the PDF would make the send
depend on the renderer, and a confirmation that fails because a font failed to
embed is worse than one that links. The certificate URL is durable by
construction — the deal record is the source of truth and §5 forbids a storage
outage that can take it offline.

Both `text` and `html`, because a durable medium the recipient cannot read is
not one. The text body is the authoritative one, and a test asserts the HTML
says the same things — an HTML body that quietly dropped a section would be the
version most readers see while the text body still passed every other
assertion.

### C10 — Mail egress and environment, in `deploys`

**Repository:** `deploys`.
**Files:** `lousydeal/base/networkpolicy.yaml`, `lousydeal/base/backend.yaml`,
`lousydeal/base/worker.yaml`, `lousydeal/base/predeploy-job.yaml`,
`lousydeal/README.md`, `lousydeal/tests/*`.

- [ ] Add an `allow-smtp-submission-egress` policy and the SMTP environment to
      the workloads that send, with committed values that are placeholders the
      Orange patch supersedes.

The reference project's `allow-smtp-submission-egress` is the shape, and it is
patched per environment with the destination CIDR and port from private
inventory. **The CIDR is never committed here** — `deploys` is public, and a
`/32` in it is a private hostname by another name. The base policy carries a
documented placeholder and the header says so, exactly as `networkpolicy.yaml`
already does for its other patched rules.

The row also settles the `dist/migrations` question the current facts table
raises: whether the deal module ships a migrations directory in the built image,
checked against the image rather than assumed, and an `emptyDir` mount added if
it does not.

### C11 — Mail configuration and credentials, in `orange`

**Repository:** `orange`.
**Files:** `roles/argocd/defaults/main.yml`,
`roles/argocd/templates/lousydeal-application.yaml.j2`,
`inventory-example/group_vars/orange.yml`, `roles/argocd/tasks/lousydeal.yml`.

- [ ] Extend both environments with the four non-secret SMTP values and project
      `SMTP_USERNAME`/`SMTP_PASSWORD` from OpenBao, following the pattern the
      reference project already uses.

The pattern is settled and this row follows it rather than inventing a second
one: non-secret per-environment values (`submission_host`, `submission_port`,
`submission_servername`, `smtp_envelope_from`, `smtp_destination_cidr`) come
from `argocd_lousydeal_environments[*]` in the operator's private inventory and
are injected by the Application template; the two secret values are added to the
existing `lousydeal-runtime-credentials` projection as `smtpUsername` and
`smtpPassword`, alongside the Stripe and database values already there.

**Seeding the two credential pairs into OpenBao is build work**, §2b's own
heading. The values are in the operator's key store; they reach OpenBao and
nowhere else. `inventory-example` gets example values, never the real ones.

### C12 — The counter

**Repository:** `lousydeal`.
**Files:** `backend/src/api/store/deals/totals/route.ts`,
`backend/src/modules/deal/service.ts`, `storefront/src/lib/store-deal.ts`,
`storefront/src/components/document/Counter.tsx`,
`storefront/src/app/page.tsx`, `storefront/src/content/home.ts`,
`storefront/tests/counter.test.ts`.

- [ ] Publish the deal count, the nominal total and the latest serial, computed
      from real deals, on the home page.

LD-09 deferred this here in those words: "wired to real orders". §11 permits it
and `AGENTS.md` forbids the alternative — a counter reports real orders or does
not ship. So it aggregates the deal table and nothing else, there is no floor,
no offset and no seeded starting value, and the test asserts an empty table
renders zero rather than being hidden. **Zero is an honest number** and a
counter that hides at zero is a counter that lies about its floor.

### C13 — The four documents catch up

**Repository:** `lousydeal`.
**Files:** `storefront/src/content/legal/terms.ts`,
`storefront/src/content/legal/refunds.ts`,
`storefront/src/content/legal/privacy.ts`,
`storefront/src/content/checkout.ts`,
`storefront/src/content/home.ts`,
`storefront/tests/legal-consistency.test.ts`,
`storefront/tests/legal-terms.test.ts`,
`storefront/tests/legal-refunds.test.ts`,
`storefront/tests/checkout-consent.test.ts`.

- [ ] Rewrite every statement that a confirmation is not sent, state the
      withdrawal position that now applies, and invert the guards that
      currently assert the opposite.

**This row is why constraint 9 exists.** Seven surfaces currently assert, and
`legal-consistency.test.ts` enforces, that no confirmation is sent and the
14-day right therefore stands for every order. C9 makes all seven false on the
same deployment. The guard is inverted in the same pull request that makes the
claim it guards untrue, because a guard asserting a false thing is worse than no
guard.

The Privacy Policy also gains the email address as data it now processes, and
the lawful basis for sending a statutory confirmation, which is not consent.

This closes gate item 11 and narrows 12 and 13. It does not close the gate: §23
reserves that to the operator and a qualified human reader.

### C14 — The § 56⁴(4) receipt

**Repository:** `lousydeal`.
**Files:** `storefront/src/app/legal/withdraw/page.tsx`,
`storefront/src/app/legal/withdraw/actions.ts`,
`backend/src/api/store/withdrawals/route.ts`,
`backend/src/notifications/withdrawal-receipt.ts`,
`storefront/src/content/withdrawal.ts`,
`storefront/tests/withdrawal.test.ts`,
`backend/tests/withdrawal-receipt.test.ts`.

- [ ] Record a withdrawal and send its acknowledgement on a durable medium
      without delay, as § 56⁴(4) requires.

LD-09 built the button and said in the page itself that the receipt was LD-02's.
The current page is three GET steps and records nothing, which was correct while
there was no mail. This row makes the final step submit.

**It must keep working with scripting off.** The page's whole design is that a
statutory control does not depend on JavaScript, and V17 verified it end to end
with curl. A progressive-enhancement Server Action keeps that true; the test
re-runs the scripting-off path.

### C15 — Gate D, and Gate E on the rendered site

**Repository:** `lousydeal`.
**Files:** the findings, in this document.

- [ ] Review every row against the contract, then drive the built site with a
      real order end to end: pay, receive the mail, open the link, download the
      PDF, and check that no page carries the billing name.

Gate E is executed against a rendered site, at 390px and desktop, with scripting
disabled where the surface claims to work without it. §14: a passing unit suite
is not visual acceptance, and this slice adds two artifacts — a PDF and an email
— that no unit test can accept on a human's behalf.

**One thing here cannot be tested by a machine at all:** whether the
confirmation email arrives, in an inbox, readable, not in a spam folder. The row
sends one to a real address and says which.

### C16 — The record

**Repository:** `lousydeal`.
**Files:** `docs/working/ld-02-certificates.md`, `docs/working/status.md`,
`docs/current/brand.md`.

- [ ] Write the completion report, move the resume point, and record every
      deferral with its reason.

## What this slice does not do

Recorded here so the completion report lists them as deferrals rather than as
loose ends.

| Not done | Belongs to |
| --- | --- |
| Gift metadata on the deal, and the gift flow | LD-03 |
| Merch, and Printful as a named processor | LD-04 |
| Baldrick | LD-05 |
| A second certificate layout | the row that redesigns one; C5 and C6 make it additive |
| The deletion job for the seven-year accounting record | still unassigned — gate item 15 |
| A fallback font, so a CJK or emoji inscription sets in the PDF rather than becoming `?` | unassigned; C6 records the measurement |
| Deal milestones (§11) | LD-08, if wanted at all |
| Closing the legal gate | the operator, with a qualified human reader |
| Publishing — removing an Access policy, seeding a live Stripe key | after the legal gate and the print-on-demand provider |

## OWNER MUST FILL

| Value | Needed by | State |
| --- | --- | --- |
| SMTP submission host, port, TLS servername and destination CIDR, per environment | C10, C11 | in the operator's private inventory; not held by this plan |
| The envelope sender address for each environment | C9, C11 | not supplied |
| Retention period for the inscription, as distinct from the order | C13 | gate item 15's neighbour; the Privacy Policy states seven years for the accounting record and nothing for the inscription |
| Whether a buyer may ask for the certificate link again, and how | not scheduled | there are no accounts (§12); today the email is the only copy of the URL |
