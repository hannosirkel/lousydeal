# Operations

The shop runs in two environments on the Orange cluster: **live**, public at
`lousydeal.com` and open for orders, and **test**, gated by Cloudflare Access
and paid with Stripe's sandbox. A merge to `main` releases to live. A
`deploy-test` label puts one pull request's own build on test. Images move by
digest through `hannosirkel/deploys`, and Argo CD applies them. **A merge is
not a deployment:** before you claim anything about a store, confirm that Argo
is Synced and that the pods started after the promotion. The operator runs
every report and reconciliation by hand; nothing in this repository schedules
one.

The rules behind this shape are in [`specification.md`](./specification.md)
§15 (deployment, environments and domains) and §2a (secrets and publication).
This document states how the shop is operated today.

## Environments

| | live | test |
| --- | --- | --- |
| Storefront host | `lousydeal.com`; `www` redirects permanently to the apex | `test.lousydeal.com` |
| Storefront access | public | Cloudflare Access, named Google identities |
| Admin access | Cloudflare Access, one Google identity ([`010`](../decisions/010-the-admin-is-reachable-and-gated.md)) | Cloudflare Access |
| `STORE_OPEN` | `true` | `true`, through Orange's test-only override |
| Stripe | live keys | sandbox keys |
| Printful | live store | test store |
| Analytics identifiers | configured | absent |
| What deploys there | the build of each merge to `main` | the build of one labelled, open pull request |
| Database | its own PostgreSQL ([`003`](../decisions/003-own-postgresql-per-environment.md)) | its own PostgreSQL |

`STORE_OPEN` is runtime configuration from Orange's private inventory, not a
build value. When it is `false`, the whole site still renders, but every cart,
checkout and payment mutation refuses with `store_closed`. Test data never
reaches the public counters; see [`specification.md`](./specification.md) §11.

## Deployment and release

### Who owns what

| Stage | Owner |
| --- | --- |
| Source, tests, image build | this repository |
| Desired state per environment (`lousydeal/overlays/live`, `lousydeal/overlays/test`) | `hannosirkel/deploys` |
| Argo CD Applications, External Secrets projections, Cloudflare Access | `hannosirkel/orange` |
| Private values, including `STORE_OPEN` per environment | Orange's private inventory |

### Release to live

1. Merge a pull request to `main`. The merge is the deployment approval.
2. The `Release` workflow validates, builds both images and scans them with
   Trivy.
3. It writes the two image digests into `lousydeal/overlays/live` in
   `deploys`.
4. Argo CD syncs the live Application.
5. The predeploy Job runs as a Sync hook before the workloads roll.

Live rebuilds from merged `main`; it does not reuse the digest test ran
([`002`](../decisions/002-rebuild-live-from-merged-main.md)).

The predeploy Job runs `npm run predeploy` from `backend/package.json`. The
chain is: Redis preflight, `medusa db:migrate --execute-safe-links`,
`seed:administrator`, `configure:commerce`, `seed:product`, `seed:merch`.
Every step is idempotent. When the Job fails, Argo holds the Application
OutOfSync, and the previous images keep running.

### Deploy a pull request to test

1. Open the pull request from a branch of this repository, not a fork.
2. Wait for its `Validate` run to pass.
3. Add the `deploy-test` label.

The `Deploy Test` workflow re-checks the pull request, builds both images and
writes their digests into `lousydeal/overlays/test`. Test runs only a pull
request's own build. A merge to `main` does not change test.

### Roll back or stop

- **Roll back:** promote a known-good digest pair. Do not edit live cluster
  state. Do not use an image older than the `STORE_OPEN` gate as a
  payment-isolating rollback, because it ignores `STORE_OPEN`.
- **Stop taking orders:** set live `STORE_OPEN=false` in the private
  inventory. Then run Orange's normal reconciliation. The public site stays
  readable.

### Verify a deployment

Do these checks before you record anything about the live or test store.

1. Confirm that the Argo CD Application is Synced and Healthy.
2. Confirm that the running backend, worker and storefront images match the
   digests in the overlay.
3. Confirm that those pods started after the `deploys` promotion commit.
4. Only then, check the store itself.

A merge that did not deploy looks exactly like one that did. A failing Sync
hook can hold both environments on old images while merges continue.

## Access to the stores

### Cloudflare Access

| Surface | Access |
| --- | --- |
| Live storefront | public |
| Live admin | gated |
| Test storefront | gated, except the paths below |
| Test admin | gated |

On the gated test storefront, two paths bypass Access, each scoped to its
path only: the Stripe webhook path and the Printful webhook path. The
storefront proxy admits exactly these webhook paths. Printful fetches print
files from this public repository at a pinned commit, so no path serves
them.

### Automated walks of the test store

Headless walks of the test store use an Access service token. Decision 025
in the private `orange` repository permits it.

- The token admits requests only from Orange's public address.
- The development VM holds it. The operator's Orange tooling delivers it.
- Send the two `CF-Access-Client-Id` and `CF-Access-Client-Secret` headers
  only on requests to `test.lousydeal.com`.
- Never send them to a third party, such as Stripe. The secret leaks to
  whoever receives them.
- No token exists for live or for either admin.

## External services

No value below is in this repository. Credentials live in OpenBao and reach
the workloads through External Secrets ([`006`](../decisions/006-two-naming-categories-in-keys.md)
names the sources).

| Service | test | live |
| --- | --- | --- |
| Stripe | sandbox keys and webhook | live keys; one webhook endpoint pinned to API version `2026-02-25.clover` with the eight Payment Intent events Medusa needs |
| Stripe payment methods | card, Google Pay, Apple Pay, Link and PayPal, set in the Stripe Dashboard | the same |
| SMTP | sends mail; egress only to the provider's address range | the same |
| Printful | test store: token, webhook, four products; no billing method, so fulfilment orders fail at Printful | live store: four products, nine variants, billing method on file |
| Printful webhook | signed deliveries accepted, unsigned refused | subscribed to `shipment_sent`, `shipment_returned`, `order_failed`, `order_canceled` |
| Google Analytics, Meta pixel | absent | configured; they load only after consent ([`specification.md`](./specification.md) §24). Account settings below |
| Buffer, GA Data API, B2 campaign media | not used | Meeme's reporting and drafts; see [`provider-reporting.md`](./provider-reporting.md) |

**Stripe payment methods are Dashboard settings, not code.** The code does
not pin `payment_method_types`, so the Payment Element shows what the
Dashboard enables. Keep card, Google Pay, Apple Pay, Link and PayPal enabled,
and disable the other methods, for example Bancontact, iDEAL and OXXO.
Register each storefront hostname as a payment-method domain; without it no
wallet renders. `STRIPE_PAYMENT_METHOD_CONFIGURATION_ID` is optional and holds
a `pmc_…` identifier, which is not a secret. PayPal through Stripe needs a
merchant account in Europe, Switzerland or the United Kingdom.

**SMTP egress is restricted.** A NetworkPolicy in `deploys` lets the backend
and worker reach only the provider's address range, which the operator holds
for each environment.

**The analytics accounts carry settings that code cannot set.** Keep Google's
enhanced measurement off (history, scroll, form, outbound-link and download
events). Keep Google signals, advertising personalisation and user-provided
data off. Keep Meta's automatic events and automatic advanced matching off.
No record in this repository shows that these settings were read back
([`backlog-candidates.md`](../working/backlog-candidates.md)).

Other things the shop holds:

| Item | State |
| --- | --- |
| Domain `lousydeal.com` | held |
| Trader identity, Aislopica OÜ | rendered in both environments from Orange's private inventory ([`004`](../decisions/004-trader-identity-is-runtime-configuration.md)) |
| Estonian VAT, Union OSS, small-enterprise scheme | registered; registrations and filing cadence are in [`013`](../decisions/013-the-vat-arrangement.md) |
| Article 28 agreement with Printful | held through Printful's Data Processing Terms, incorporated by its terms of service |
| Destination VAT rates | agree with TEDB for all 27 member states, verified on 2026-09-10; re-verify when a rate changes |
| Meta owned-asset API access | not held and not needed |

## Standing procedures

### Where to run a backend command

Run each `npm run` command below in the backend of the environment you mean.
In the backend image the built server is in `/app`, and the commands resolve
their compiled scripts there. The command reads that environment's database.
Nothing in this repository records how to reach the cluster.

### Commands

| Command | What it does | When to run it |
| --- | --- | --- |
| `npm run report:vat-thresholds -- [year]` | Counts the year's Union turnover against €100,000 and Latvian supplies against €50,000. Writes nothing. | Before each quarterly filing, and whenever sales grow. Nothing schedules it. |
| `npm run report:discounts -- test` or `-- live` | Reports coded carts, captured coded orders and conversion by code. The label records provenance only. | When you want the discount figures. |
| `npm run sync:printful` | Reconciles the selected Printful store with the committed merch catalogue. Prints handles and counts only. | After the merch catalogue or its artwork changes. A second run reports no change. |
| `npm run edit:inscription -- <serial> <display-name> <dedication>` | Replaces both inscription fields of an issued certificate. An empty argument blanks that field. | When a certificate must be sanitised, hidden or blanked. |
| `npm run seed:merch`, `seed:product`, `configure:commerce`, `seed:administrator` | Apply the catalogue, commerce and administrator records idempotently. | Automatically, in every predeploy. Run by hand only to repair. |

### VAT thresholds

1. Run `npm run report:vat-thresholds` against live.
2. Compare the Union total with €100,000.
3. If it has crossed €100,000, notify EMTA within 15 working days.

The report counts in the store's currency and states the ceilings in euro. It
does not convert. It over-counts on purpose: every order delivered to Latvia
counts as Latvian, and an order with no address counts as domestic. See
[`013`](../decisions/013-the-vat-arrangement.md) and
[`015`](../decisions/015-where-the-parcel-is-dispatched-from.md).

### Quarterly VAT returns

Prepare the OSS return and the small-enterprise report from the quarter's
orders. Reclassify the special-territory postcodes by hand, as
[`014`](../decisions/014-special-territories-are-a-reporting-problem.md)
describes. The small-enterprise report is due even when turnover is zero.

### Change the merch catalogue or its artwork

Printful fetches each print file from this public repository, at a pinned
commit, through `PRINTFUL_ARTWORK_BASE_URL`. The value is not a secret. It is
set on the Argo CD Application in Orange. `assertPinnedArtworkBase` refuses a
branch URL, so an order placed today stays reproducible later.

1. Render changed artwork with `design/merch/render.mjs`, and commit it under
   `design/merch/print-files/`.
2. Merge the catalogue or artwork change.
3. Move `PRINTFUL_ARTWORK_BASE_URL` to the merge commit, in Orange.
4. Run `npm run sync:printful` against the test store, then against the live
   store.
5. Let the next predeploy run `seed:merch`, which joins the Printful variants
   into Medusa.
6. Run `design/merch/fetch-mockups.mjs` once to refresh the product photographs
   in `storefront/public/goods/`, and commit them.
7. Compare handles, SKUs, artwork URLs and counts. Do not compare remote
   identifiers.

### Subscribe the Printful webhook

1. Read the store's current webhook configuration first.
   `POST /v2/webhooks` replaces it without a warning.
2. Subscribe `default_url` at the Printful webhook path, with the four events
   `webhook.ts` accepts: `shipment_sent`, `shipment_returned`, `order_failed`
   and `order_canceled`. Set no expiry.
3. Printful shows the hex `secret_key` once. Write it straight into its
   OpenBao source, and do not print it.
4. Verify from outside: a correctly signed body returns 200, and a wrong key
   or a malformed signature returns 401.

### Replace a credential

1. Write the new value as a new OpenBao version of its source.
2. Force the ExternalSecret to refresh.
3. Restart the backend, worker and storefront that consume it.
4. Verify the provider accepts the new value.
5. Revoke the old value.

A wrong value is a rotation, not a re-run.

### Replace the live Stripe webhook

1. Set live `STORE_OPEN=false`.
2. Create the new endpoint and verify it.
3. Advance its signing secret's OpenBao version.
4. Force the ExternalSecret to refresh, and restart the consumers.
5. Delete the endpoint you are replacing.
6. Set `STORE_OPEN=true` again.

### Keep the accounting record seven years

No job deletes order records. Retention is enforced by hand. The first record
reaches seven years old in 2033.

### Recover a Meeme provider

Follow "Runtime and recovery" in
[`provider-reporting.md`](./provider-reporting.md).

## Known operational characteristics

- **Argo CD sometimes does not roll a new digest promptly.** The Applications
  are automated with self-heal, but a promotion has sat in `deploys` with the
  old pod still running. A manual sync is the accepted workaround.
- **The storefront's readiness probe renders the home page.** It requests `/`
  every five seconds on live and test. Each probe costs three Store API reads,
  whether or not anyone visits. See
  [`backlog-candidates.md`](../working/backlog-candidates.md).
- **Cloudflare blocks some HTTP clients before the origin.** A probe of the
  Printful webhook from Python's `urllib` gets 403. `curl` and Printful's own
  client get through. A 403 from such a probe does not mean the webhook is
  broken.
- **Test fulfilment stops at Printful.** The test store has no billing
  method, so a test order reaches Printful and fails there by design.

## Build and test gate

Run this before every handoff:

```bash
npm ci
bash scripts/validate
```

`scripts/validate` runs the shell, Markdown, link, secret, lint, typecheck and
unit-test checks that CI runs. It refuses, rather than skips, when a tool is
missing or when Node is older than the `engines.node` floor in `package.json`.

| Check | Where it runs |
| --- | --- |
| `scripts/validate` | locally; the `Validate` workflow on every pull request and every push to `main`; again in `Release` |
| Workflow lint (zizmor), documentation layout | the `Validate` workflow only |
| gitleaks on staged changes | the tracked `.githooks/pre-commit` hook; enable it once per checkout as [`AGENTS.md`](../../AGENTS.md) states |
| `bash scripts/store-smoke` | locally, with `podman`: a real Medusa, the predeploy chain in order, and the Store API smoke test |
| `node storefront/tests/browser/analytics.mjs` | a workstation with Playwright and Chromium; set `PLAYWRIGHT_MODULE` and `CHROMIUM_EXECUTABLE` |
