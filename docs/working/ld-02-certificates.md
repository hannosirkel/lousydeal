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

**Execution.** Directly, not through `big-build`. Sixteen rows, one pull request
each, across three repositories.

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
| The checkout collects **no email address** | `storefront/src/app/checkout/PaymentForm.tsx` | Medusa carries `cart.email` through to `order.email` and tolerates `null` (`@medusajs/core-flows/dist/cart/workflows/complete-cart.js:446,505`). There is nowhere to send a confirmation. C3 adds the field. |
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
| 3 | The buyer can enter a display name and a dedication, is shown they are public, and is told what is filtered | C3 |
| 4 | `/done-deals/{slug}` renders the certificate from stored data and carries no billing name | C4, C5 |
| 5 | `/done-deals/{slug}/certificate.pdf` is a vector PDF with embedded fonts, produced without a browser | C6 |
| 6 | The page has share links and a per-deal social card, and neither loads a third-party asset | C7 |
| 7 | A confirmation email reaches the buyer, containing everything § 55(2) and § 54(1) require | C8, C9 |
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
**Files:** `backend/src/modules/deal/index.ts`, `.../model.ts`,
`.../service.ts`, `.../serial.ts`, `.../slug.ts`, the generated migration,
`backend/medusa-config.ts`, `backend/tests/deal-module.test.ts`,
`backend/tests/medusa-config.test.ts`.

- [ ] Define the `LousyDeal` model against the installed Medusa (2.18.0), register
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

### C2 — Issuance, and its idempotency under replay

**Repository:** `lousydeal`.
**Files:** `backend/src/subscribers/order-placed.ts`,
`backend/src/modules/deal/service.ts`, `backend/tests/deal-issuance.test.ts`.

- [ ] Mint a deal from `order.placed`, reading the inscription from the order,
      and return the existing deal rather than a second one when the event is
      replayed.

The reference project's `subscribers/order-placed.ts` is the shape. Medusa's
Redis event bus is at-least-once and the Stripe webhook is retried by Stripe
independently, so a replay is expected traffic rather than an error path. The
service catches the unique-violation on `order_id`, re-reads, and returns the
deal that already exists — the test fires the subscriber twice with the same
order and asserts one row, one serial, one slug.

**Issuance never throws into the subscriber.** A failed issuance must not
retry-loop the event bus forever; it logs and leaves the order intact, because
an order that took money and has no certificate is recoverable by hand and an
event storm is not.

### C3 — The checkout: an email address, and the two inscription fields

**Repository:** `lousydeal`.
**Files:** `storefront/src/app/checkout/PaymentForm.tsx`,
`storefront/src/lib/store-checkout.ts`, `storefront/src/lib/inscription.ts`,
`storefront/src/content/checkout.ts`,
`storefront/src/components/document/OrderForm.tsx`,
`storefront/tests/checkout-inscription.test.ts`,
`storefront/tests/inscription.test.ts`.

- [ ] Collect a required email address and the two optional inscription fields,
      filter them at entry, show the buyer what will be public, and write all
      three to the cart before completion.

**The email is required.** Without it there is no durable medium, and without
that the § 53(4) p 7¹ exclusion never bites — so an optional email would mean
two classes of order with different withdrawal rights and a checkout that
cannot tell the buyer which they are in. One class, one answer.

**Entry-side filtering is the half §5 asks for that does not exist.**
`sanitiseInscription` already strips markup, URLs, bare domains, addresses and
telephone numbers at render. This row applies the same function at entry and
shows the buyer the result before they pay, because a filter that silently eats
what someone typed is worse than one that says so.

**Dedication is capped at 120 characters**, §5's figure, counted after
filtering rather than before.

The fields go to `cart.metadata` through the same `POST /store/carts/:id` that
already sets the country, and Medusa copies cart metadata to the order.

### C4 — The public deal endpoint

**Repository:** `lousydeal`.
**Files:** `backend/src/api/store/deals/[slug]/route.ts`,
`backend/src/api/middlewares.ts`, `backend/tests/deal-route.test.ts`.

- [ ] Serve a deal by slug over the Store API, returning only what §5 makes
      public, and 404 for a slug that does not exist.

The first custom Store API route here. The response carries serial, tier,
amount, currency, issue date, layout version and the two inscription fields.
It carries no order id, no email, no billing name and no payment detail — and
the test asserts the response's key set exactly, so a later field added to the
model does not leak by default. That is the inverse of the usual test and it is
deliberate: an allowlist fails closed.

**404 rather than 403 for an unknown slug.** The slug is the only secret; a
response that distinguishes "no such deal" from "not yours" would make it
enumerable, which §5 says is the entire reason the slug exists.

### C5 — `/done-deals/{slug}`

**Repository:** `lousydeal`.
**Files:** `storefront/src/app/done-deals/[slug]/page.tsx`,
`storefront/src/app/done-deals/[slug]/not-found.tsx`,
`storefront/src/lib/certificate-model.ts`,
`storefront/src/lib/store-deal.ts`,
`storefront/src/components/document/Certificate.tsx`,
`storefront/src/content/certificate.ts`,
`storefront/tests/done-deals-page.test.ts`,
`storefront/tests/certificate.test.ts`.

- [ ] Render the certificate from a real deal, with the layout dispatched on the
      stored version, and 404 for an unknown slug.

**The model gains its second inscription field.** LD-09's `Certificate` carries
one; §5 and §16 carry two. The stored record keeps `display_name` and
`dedication` separately — an operator must be able to blank one without
touching the other, §5's moderation requirement — and the component takes both.
The empty-pair case is already proven to render deliberately; the test extends
to name-without-dedication and dedication-without-name.

**Layout dispatch, not layout reading.** A registry keyed by version, with
layout 1 as its only entry today, so adding layout 2 is a new entry rather than
an edit to a rendered certificate. Constraint 7 in code.

`noindex, nofollow` on the route: an unguessable URL that a crawler publishes is
a guessable one.

### C6 — The PDF

**Repository:** `lousydeal`.
**Files:** `storefront/src/app/done-deals/[slug]/certificate.pdf/route.ts`,
`storefront/src/lib/certificate-pdf.ts`,
`storefront/src/lib/pdf-layout-1.ts`,
`storefront/package.json`, `package-lock.json`, `next.config.ts`,
`storefront/tests/certificate-pdf.test.ts`.

- [ ] Render the certificate as a vector PDF with embedded IBM Plex Mono,
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

The test parses the produced bytes: `%PDF-` header, one page at the stated size,
the font embedded rather than referenced, the serial present as text, and the
billing name absent.

### C7 — Share links, and the per-deal social card

**Repository:** `lousydeal`.
**Files:** `storefront/src/app/done-deals/[slug]/opengraph-image.tsx`,
`storefront/src/components/document/ShareRow.tsx`,
`storefront/src/content/certificate.ts`,
`storefront/tests/opengraph.test.ts`,
`storefront/tests/third-party-disclosure.test.ts`,
`storefront/tests/share-links.test.ts`.

- [ ] Give the certificate page share links and its own 1200×630 card, without
      loading anything from a third party.

LD-09's `opengraph-image.tsx` is the pattern, including `await connection()` to
force dynamic rendering — the defect V13 shipped and had to fix was a card
baked at build time with no store reachable, and a per-deal card cannot be
prerendered at all.

**Share links are anchors, not widgets.** No script, no iframe, no button that
phones anyone. An `<a>` to a share intent sends nothing until the visitor
clicks it, which is why it adds no processor to the Privacy Policy — the row
states that reasoning and confirms the third-party guard covers or is extended
to cover anchor hosts.

The card carries the serial and the inscription. It does not carry the billing
name, and `third-party-disclosure.test.ts` gains the assertion.

### C8 — SMTP: the transport

**Repository:** `lousydeal`.
**Files:** `backend/src/notifications/smtp.ts`, `.../index.ts`,
`backend/src/config/runtime.ts`, `backend/src/config/notification.ts`,
`backend/medusa-config.ts`, `backend/package.json`, `package-lock.json`,
`backend/tests/smtp-provider.test.ts`,
`backend/tests/mail-submission-target.test.ts`.

- [ ] Register an SMTP notification provider reading its host, port, TLS
      servername, envelope sender and credentials from the environment, and
      refuse to start if any is missing or if the transport is not TLS.

The reference project's `notifications/smtp.ts` is the shape and this row ports
it: `AbstractNotificationProviderService`, nodemailer, `requireTLS: true`,
`rejectUnauthorized: true`, `minVersion: "TLSv1.2"`, a `TransportFactory` seam
so the test never opens a socket. Provider id `lousydeal-smtp`.

**The submission-target test is not decoration.** It asserts the transport
options this file builds are the ones that refuse plaintext — a regression here
is a credential sent in the clear, and it would pass every other test in the
suite.

`readBackendRuntimeConfig` throws at import time on a missing value, which is
already this codebase's rule and is why a misconfigured deployment fails the
readiness probe instead of silently not sending mail.

### C9 — The § 55 confirmation

**Repository:** `lousydeal`.
**Files:** `backend/src/notifications/order-confirmation.ts`,
`backend/src/notifications/transactional-email.ts`,
`backend/src/subscribers/order-placed.ts`,
`backend/src/content/confirmation.ts`,
`backend/tests/order-confirmation.test.ts`.

- [ ] Send the buyer a confirmation on a durable medium containing everything
      § 55(2) and § 54(1) require, with the certificate's link, promptly after
      the order is placed.

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
not one.

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
