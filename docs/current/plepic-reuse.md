# What Lousy Deal takes from Plepic, and what it does not

**Copy the seams, not the repository.** Plepic Games solved the same
infrastructure problem — a Medusa 2.18 store on the Orange cluster, with Stripe,
Redis, SMTP, and promotion by digest — and it solved it under load, in public,
with the scars recorded. Lousy Deal reuses those solutions as *patterns copied
into its own repository*, not as a shared library and not as a fork. Nothing is
extracted into a package yet.

This is the contract's §2 deliverable. It records what exists on 2026-08-28 and
what Lousy Deal does with it. Where it names a decision rather than a fact, the
decision is still open and is listed in *Decisions this forces*.

## The one-line answer per area

| Area | Verdict |
| --- | --- |
| Medusa 2.18, npm workspaces monorepo | copy the shape |
| Runtime configuration seam | **copy verbatim**, adapted only in field names |
| Redis wiring and preflight | **copy verbatim** |
| Database URL and SSL resolution | copy verbatim |
| Stripe payment module | copy the wiring, re-key it |
| SMTP notification provider | copy the provider, rewrite the templates |
| Guard tests | **copy verbatim**, they enforce §2a mechanically |
| CI validation shape | copy the shape, not the contents |
| Release and promotion workflows | copy the shape, re-point every name |
| `deploys/` overlay layout | copy the layout, fix the worker probe gap |
| Storefront proxy and canonical host | copy the rule, not the redirect map |
| Legal content structure | copy the placeholder mechanism only |
| Tax model | copy it — the operator ruled it inherited on 2026-08-30, decision `008` |
| Analytics and consent | copy the consent seam, re-choose the events |
| Catalogue import, Turnstile, newsletter | **do not copy** — Plepic-specific |

## The stack, as it actually is

Facts, verified on 2026-08-28 in `~/app/plepic` at `8f367cb`.

| Thing | Value |
| --- | --- |
| Medusa | 2.18.0, every `@medusajs/*` package pinned exactly |
| Node | `>=24.18.0` |
| Layout | one repository, npm workspaces: `backend`, `storefront` |
| Backend test runner | `vitest`, plus a separate smoke config |
| Storefront tests | `vitest`, plus Playwright |
| Lint | `eslint` 10 flat config at the root |
| Payment | `@medusajs/payment-stripe` 2.18.0 |
| Email | `nodemailer` 9, behind a custom Medusa notification provider |
| Redis | `redis` 6.2.1, wired into four separate Medusa concerns |
| Images | two, `plepic-backend` and `plepic-storefront`, built and scanned in CI |

The monorepo is the right shape to copy. Two images from one repository, one
lockfile, one lint and typecheck pass, one release workflow that builds both and
promotes both digests together. Lousy Deal has the same two deployables.

## The seams worth copying verbatim

These are the parts where Plepic paid for the knowledge and the code is the
cheapest way to carry it.

### The runtime configuration seam

`storefront/src/config/env.ts` is the only place `process.env` is read, and
`runtime-config.ts` assembles one object per request, handed to the browser as a
single serialized blob. Nothing is a `NEXT_PUBLIC_*` value, because Next.js
inlines those at build time and a per-environment value must not enter a built
artifact.

Three files, roughly 390 lines, and they are the mechanical implementation of
the contract's §2a rule. Copy them. The backend has the same seam in
`backend/src/config/runtime.ts`, which additionally **fails closed**: a required
value that is absent refuses the workload rather than defaulting.

Copy the `MerchantConfig` shape with it. Plepic keeps the trader's identity in
runtime configuration, resolved into content at render through literal
`{merchantLegalName}`-style placeholders, with `null` meaning "not configured"
and never a fabricated value. That is precisely what the contract's §23 asks
for — disclosures addable without rework, and no copy a lawyer must later unpick
from logic — so Aislopica OÜ's details reach a rendered page the same way.

### The Redis preflight

`backend/src/config/redis-preflight.ts` authenticates and sends a `PING` before
Medusa loads. It exists because the Redis module loaders *report success without
connecting*: against a closed port, `event-bus-redis` logs "Connection to Redis …
established" and does not throw. Without the preflight, a backend and its worker
run as two halves of a system that share no queue, and nothing fails visibly.

Copy the preflight, and copy the four separate Redis wirings in
`medusa-config.ts` with it — sessions, event bus, workflow engine, and locking
are four things, and three of them are required separately. Copy
`tests/redis-modules.test.ts` too: it runs each loader against the exact config
objects, so a Medusa upgrade that moves an option turns a suite red instead of
leaving a silently disconnected worker.

Keep the password in the client options and out of the connection string.

### The guard tests

Plepic's storefront suite includes tests that enforce policy rather than
behaviour:

| Test | What it prevents |
| --- | --- |
| `no-next-public-env.test.ts` | a per-environment value entering the built artifact |
| `no-live-hostname.test.ts` | a live hostname reaching a tracked file |
| `no-hardcoded-price.test.ts` | a price existing in two places that can disagree |
| `no-unresolved-placeholder.test.tsx` | a `{placeholder}` rendering to a visitor |
| `deployment-contract.test.ts` | the image and the manifests disagreeing |

These are the cheapest controls in the repository and they are directly
applicable. Lousy Deal needs all five, plus two of its own: the certificate
inscription must never render unsanitised, and the buyer's billing name must
never reach a public surface.

### Promotion by digest

`release.yml` builds both images, verifies each digest matches
`^sha256:[0-9a-f]{64}$`, scans them, and writes the exact digests into the
`deploys` overlay. `deploy-test.yml` promotes a pull request's head into test on
a `deploy-test` label, under a three-job split where the job that checks out head
code holds no credential and the job that holds the credential runs no head code.

Copy both, including that split. It is the pre-authorised `pull_request_target`
exception in `standards/security.md`, and the reasoning is written into the file.

## What must not leak into Lousy Deal

Plepic-specific behaviour, all of it load-bearing there and meaningless here:

- **The catalogue import.** Nine test files and a Job exist to migrate a legacy
  shop's products. Lousy Deal has three products and seeds them.
- **Turnstile on checkout.** Plepic gates a public contact and newsletter
  surface. Lousy Deal has no such surface in V1, and Baldrick is not one.
- **The newsletter and contact relay.** Brevo is Plepic's newsletter tool. The
  contract already rules that transactional email and newsletter stay separate,
  and V1 has no newsletter.
- **The redirect map and the alternate-brand host.** Plepic redirects a second
  brand's domain. Lousy Deal has one host plus `www`.
- **Locale routing and Estonian content.** Multilingual support is an explicit
  §25 non-goal.
- **The assets PVC and media provider.** Certificates are derived and served by
  the application. The contract forbids object storage, and a PVC is the same
  dependency wearing a different hat.
- **The tax model — reversed 2026-08-30.** Plepic's is a settled operator
  decision about a EUR 25.00 net price at 24 % Estonian VAT. This line made Lousy
  Deal's a legal-gate question under §23, not to be inherited by copying a file.
  The operator reversed that on 2026-08-30 and ruled it inherited —
  [`008`](../decisions/008-plepic-tax-treatment.md).

## What Plepic got wrong, and what Lousy Deal does instead

Each of these is checkable in the repository today, not recalled.

| Finding | Evidence | What Lousy Deal does |
| --- | --- | --- |
| `README.md` is 135,084 bytes | `ls -l ~/app/plepic/README.md` | `docs/` exists first; §19 governs |
| Comment-to-code ratio inverted in config | `medusa-config.ts` is 164 lines: 108 comment, 56 code | the reasoning goes to `docs/decisions/`, the invariant stays in the code |
| The worker declares no probe | `grep -c Probe deploys/plepic/base/worker.yaml` → `0` | the worker gets a probe in its first manifest |
| Restores have never been performed | retired plan `STATUS.md`, row `T9.78d1dac1` | a restore is exercised before the live gate, not after |
| A rollback from the previous digest was never deliberately exercised | retired plan `STATUS.md`, row `T6.f27e7ec7` | one controlled rollback before publication |

## Why live is rebuilt, which is not a failure

Plepic rebuilds the live image from merged `main` rather than re-promoting the
digest the test environment was approved on, so the two digests differ. That
looked like a deviation. It is not, and the reason is worth recording because it
is the kind of thing a later reader re-opens.

`standards/gitops-and-deployment.md` says *"promote by digest, never by tag"* and
*"a live promotion is merge-promoted."* Plepic does exactly both: the merge
triggers the promotion, and what is written into the overlay is an immutable
digest. Nothing is promoted by tag anywhere.

The model came from Servitium — the plan says *"exactly as Servitium's does"* —
and `orange` ADR `019` accepted it on stated conditions: the image contains no
environment value, dependencies and base images are pinned, and the promotion
commit records the source revision beside the digest. `Release` also re-runs the
full validation before it builds.

The one property it does not give is that the binary serving live is the binary
that was tested. That is real, and the conditions above are what stand in for
it. Lousy Deal can satisfy the same conditions, and the `no-next-public-env`
guard test is what keeps the first one true rather than assumed.

The alternative — re-promoting the tested digest — costs more than a workflow
change. It requires every live release to have had a test promotion of that
exact revision first, and the `deploy-test` label is per-pull-request and
optional. Adopting it means making a test deployment mandatory before any merge.

## What could be shared, and why it is not yet

`runtime/env.ts`, the Redis preflight, the SMTP provider and the digest guard
script are all genuinely generic. Extracting them into a package now would mean
publishing and versioning infrastructure for two consumers, one of which does
not exist yet, and would couple Lousy Deal's release to Plepic's — which the
contract's §2 forbids in its own words: *do not couple Lousy Deal availability
or product behavior to Plepic Games*.

Copy them. Revisit extraction when a third consumer appears or when the same fix
has been applied twice by hand.

## Decisions this forces

Open questions for Gate A. None is answered here.

1. **Repository layout.** One repository with `backend` and `storefront`
   workspaces, matching Plepic. Recommended, and it is what the rest of this
   document assumes.
2. **Digest promotion.** Follow the Servitium and Plepic model, or make a test
   promotion mandatory and re-promote the tested digest. See *Why live is
   rebuilt*; the governed default is to follow.
3. **Certificate PDF renderer.** The contract requires vector rendering with no
   headless browser. Plepic offers no precedent; this is new, and it is the one
   substantial dependency choice in LD-02.
4. **Secret source naming.** `stripe-lousydeal-sandbox` as supplied, against
   Plepic's `plepic-…` / `plepic-test-…` convention. Already recorded as open.
5. **Where the trader identity is rendered.** Runtime configuration with
   placeholder resolution, as Plepic does, versus committed content. The
   recommendation is Plepic's mechanism, because §23 requires it.
6. **Database.** There is **no shared PostgreSQL service** on the cluster to
   join. `authentik-postgresql` serves one platform component, and
   `plepic-postgresql` and `plepic-postgresql-test` are per-environment and
   per-application. The shared service that does exist is MySQL, and `orange`
   ADR `019` records why it was not extended for Medusa: *"Medusa requires
   PostgreSQL and Redis; the existing shared MySQL service is neither compatible
   nor an acceptable place to merge those environments."* So sharing means
   either standing up a new shared PostgreSQL, or putting Lousy Deal into
   Plepic's instance.

## What this does not cover

Deliberate gaps, each with an owner:

- **Cutover, DNS, and Cloudflare Access.** They name live hosts and identities,
  so under `standards/work-routing.md` they belong in `orange-inventory`.
- **The legal and tax position.** Out of build scope by operator decision (§23).
- **Brand, copy, and visual direction.** Gates B and C, and this document
  deliberately says nothing about how the store should look.
