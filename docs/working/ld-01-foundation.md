# LD-01 — Foundation

Stand up an independent Lousy Deal store: a Medusa backend, a Next.js
storefront, Stripe, the three deal tiers, one successful checkout, and a
deployment to the gated test environment.

The contract is [`fresh-build.md`](./fresh-build.md) §17. Gate A is passed and
its decisions are in `docs/decisions/`. This plan executes; the contract does
not.

**Execution.** `big-build`, one invocation. Its binding lives at
`myskills/skills/big-build/plans/ld-01-foundation.md` and supersedes any
sub-skill this document appears to mandate.

## Global constraints

Copied verbatim into every subagent's context packet.

1. **Never commit a secret.** No Stripe key, no webhook signing secret, no
   database password, no rendered Kubernetes Secret. `lousydeal` and `deploys`
   are public and must be safe to publish on every commit.
2. **Nothing that differs between test and live is baked into a built
   artifact.** No `NEXT_PUBLIC_*` value carries a per-environment value. Read
   such values server-side per request and hand the browser one serialized
   object. Decision `004`.
3. **One pull request closes one row.** Over 800 changed lines or over 10 files
   needs a named operator override in the pull-request body. Lockfiles are
   excluded from both counts and named separately.
4. **Comments explain non-obvious intent, constraints, invariants, or
   trade-offs. They do not narrate code.** No boilerplate above every function,
   no comment repeating a name or a type, no speculative `TODO`. Reasoning that
   wants a page goes to `docs/decisions/`.
5. **Test durable behaviour, not file existence.** Add a focused test for new
   logic in the same commit. Do not pursue exhaustive coverage.
6. **A row's file list stays inside one repository.** Cross-repository work is
   two rows with a stated order.
7. **The storefront LD-01 ships is provisional.** It is unstyled scaffolding
   that proves the checkout works. Gates B and C govern the real surfaces, and
   a later slice replaces this storefront rather than extending it. Do not
   invent brand, voice, or visual language here.
8. **Run `bash scripts/validate` before declaring a row done.** It is what CI
   runs.
9. **A row that falsifies a tracked document carries that document in its
   `Files` list.** If landing your change makes a sentence in `AGENTS.md`,
   `README.md`, or any tracked document untrue, correcting it is part of your
   row, not a later one's. Three documents in this repository were left stating
   the opposite of the truth because the row that falsified them had no
   authority to touch them, and no later row did either. A decision record is
   the exception: it states what was decided then, and is superseded rather than
   rewritten.

## Current repository facts

Verified 2026-08-28; the first three rows refreshed 2026-08-29 as milestone M1
merged. An absence below is declared in the binding. **Constraint 9 applies to
this table: a row that falsifies a line here refreshes it.**

| Fact | Value |
| --- | --- |
| `lousydeal` `main` | the root npm workspace, its TypeScript, ESLint and Vitest configuration, and `scripts/validate`; no application code yet |
| Declared languages | `[shell, typescript]`; `npm_project: true`; no `lifecycle` key |
| Branch ruleset | `deletion`, `non_fast_forward`, `pull_request`, `required_status_checks` on five `Validate` contexts, including `Canonical validation` |
| `deploys/lousydeal/` | **absent**; created by T13 |
| Argo CD `Application` for Lousy Deal | **absent**; created by T15 |
| OpenBao mounts `lousydeal`, `lousydeal-test` | **absent**; created by T14 |
| Namespaces | **absent**; created by T15 |
| Images in GHCR | **absent**; first published by T12 |
| Stripe | test mode only, held at `.keys/stripe-lousydeal-test`, provider-first per decision `006` |
| Reference implementation | `plepic` at `8f367cb`, Medusa 2.18.0, Node `>=24.18.0` |

## Target exposure

| Surface | Reachable by | Gate |
| --- | --- | --- |
| `test.lousydeal.com` | Cloudflare Access, Google identity, short session | T16 |
| `lousydeal.com` | nobody in this slice | publication gate, not LD-01 |
| Medusa Admin | no public hostname, in any encoding | never in LD-01 |
| GHCR packages | public read | T12 |
| Stripe | test mode only; a live key never reaches test | T14 |

**No live Stripe key, no public DNS for the apex, and no real customer
transaction in this slice.** The legal gate precedes publication and is not part
of this build.

## Completion criteria

| # | Criterion | Fed by |
| --- | --- | --- |
| C1 | `bash scripts/validate` passes and is what CI runs | T1, T2, T2b, T2c |
| C2 | The backend refuses to start on a missing or wrong Redis, and on absent required configuration | T3, T5 |
| C3 | Medusa migrates and starts against PostgreSQL with SSL resolved identically on both paths | T4, T6 |
| C4 | The three tiers exist at $5, $10 and $25, seeded idempotently | T7 |
| C5 | No per-environment value is inlined into either built artifact, enforced by a test | T8 |
| C6 | A cart reaches a paid Stripe test-mode order through the storefront | T9, T10 |
| C7 | Both images build, publish, and carry immutable digests | T11, T12 |
| C8 | Both overlays render and schema-check | T13 |
| C9 | Credentials reach the pods through External Secrets, and no value is committed | T14 |
| C10 | `test.lousydeal.com` serves the storefront behind Cloudflare Access | T15, T16 |
| C11 | One real-dependency smoke check passes against a running Medusa | T17 |

---

## T1 — Workspace skeleton

**Repository:** `lousydeal`.
**Files:** `package.json`, `package-lock.json`, `tsconfig.json`,
`eslint.config.js`, `vitest.config.ts`, `scripts/validate`,
`.github/workflows/validate.yml`, `.gitignore`, `AGENTS.md`, `README.md`.

`AGENTS.md` and `README.md` join the list because both describe this repository
as holding documentation and checks only, which stops being true the moment the
first row merges, and no other row in this plan can reach them. `scripts/validate`
additionally runs `npm run typecheck` per workspace: the root `tsc --noEmit` does
not recurse into `backend` or `storefront`, so without that fanout the gate
reports pass while the whole application sits outside it.

- [ ] Add the root workspace: `package.json` declaring workspaces `backend` and
      `storefront`, Node `>=24.18.0`, and the `lint`, `typecheck` and
      `test:unit` scripts; plus `tsconfig.json`, `eslint.config.js` and
      `vitest.config.ts`. Verified by `npm ci` succeeding and `npm run lint`
      exiting zero on an empty tree.
- [ ] Extend `scripts/validate` to run `npm run lint`, `npm run typecheck` and
      `npm run test:unit` after the existing shell, markdown, link and secret
      checks, and add the matching job to `.github/workflows/validate.yml` so
      the command and CI cannot diverge. Verified by `bash scripts/validate`
      passing locally and the new job appearing on the pull request.

## T2 — Declare TypeScript in the catalogue

**Repository:** `architecture`. **Runs immediately after T1 merges.**
**Files:** `universe/repositories.yaml`.

- [ ] Set `languages: [shell, typescript]` and `npm_project: true` for
      `lousydeal`, and drop `lifecycle: registered-not-implemented`. Verified by
      `tooling/universe audit lousydeal` reporting clean.

A language declared ahead of its code is a check that never runs; declared
behind it is a check that was skipped. T1 and T2 are adjacent for that reason.

## T2c — Resync the generated artifacts

**Repository:** `lousydeal`. **Runs after T2 merges, and only after.**
**Files:** `AGENTS.md`, `.habit-hooks/config.toml`.

- [ ] Commit the output of `tooling/universe sync-baseline lousydeal`, run from
      an `architecture` checkout that already carries T2's catalogue change.
      Verified by `tooling/universe audit lousydeal` reporting clean, and by the
      committed files being byte-identical to what the generator produces.

T2 declares the language in `architecture`; this materialises what that
declaration generates here. Two rows because they are two repositories, and this
one is second because `sync-baseline` reads the catalogue from `architecture`'s
`main` — run before T2 merges, it regenerates the old baseline and looks like it
worked. `architecture`'s own `Baseline drift` job reported exactly this pairing
on the merge that landed T2: *"1 repositories affected … fix: tooling/universe
sync-baseline lousydeal, then open a pull request."* It reports affected
repositories only when a push invalidates one, so after this row it reports
none.

The generated `.habit-hooks/config.toml` carries **two** defects that are not
this row's to fix, both recorded as Q3 and both tracked against `architecture`.
The `typescript` entry's own exclusions land before the generic fallback's
`**/*.md`, `**/*.yaml` and `**/*.yml` — the fallback's identical
`!**/node_modules/**` is the one de-duplicated away — and `pathspec` is
last-match-wins, so `node_modules` re-enters the root scan scope. And three
generated sensors have no installed tool, so `habit-hooks` reports
`incomplete-run` from this row onward. **A later row seeing that is looking at
Q3, not at something it broke.** Both predate this plan and `plepic` carries
both.

## T2b — Make the dependency refusal actually refuse

**Repository:** `lousydeal`. **Runs after T2 merges.**
**Files:** `scripts/validate`, `README.md`.

`README.md` is here under global constraint 9. It stated that the catalogue
records `languages: [shell]` and `npm_project: false`, which T2a falsified, and
no other open row could reach it.

- [ ] Refuse when `node_modules` is absent rather than inferring it from a tool
      that may also be installed globally, and run the pinned binaries from the
      lockfile rather than whatever `PATH` resolves. Verified by a checkout with
      no `node_modules` refusing and naming `npm ci`, on a machine that has
      global copies of the same tools installed.

Added after T1 closed. On a checkout that has not run `npm ci`, the missing-tool
check passed because a global `markdownlint-cli2` satisfied it, and `npm run
lint` then found a global ESLint 6 against the pinned 10 and failed with
*"couldn't find a configuration file"* — sending a developer to look for a file
that is present. The refusal T1b added never fired.

Two rows rather than one because T2 is in `architecture` and this file is in
`lousydeal`; global constraint 6 governs, and the order is stated above.

## T3 — Backend runtime configuration

**Repository:** `lousydeal`.
**Files:** `backend/package.json`, `backend/tsconfig.json`,
`backend/vitest.config.mts`, `backend/src/config/env.ts`,
`backend/src/config/runtime.ts`, `backend/tests/runtime-config.test.ts`.

- [ ] Add `backend/src/config/env.ts` as the only module that reads
      `process.env`, exposing trimmed required and optional readers and a
      `ConfigError`. Verified by a test that passes a plain object rather than
      the process environment.
- [ ] Add `backend/src/config/runtime.ts` assembling the backend's
      configuration and **failing closed**: a required value that is absent
      throws at load rather than defaulting. Verified by a test asserting the
      refusal names the missing variable.

## T4 — Database URL and SSL resolution

**Repository:** `lousydeal`.
**Files:** `backend/src/config/database-url.ts`,
`backend/tests/database-ssl.test.ts`.

- [ ] Resolve the database URL and driver options so the migration path and the
      runtime path choose SSL identically, and so `verify-full` is expressible.
      Verified by a test running Medusa's own resolver against the produced
      object and against the URL spellings that are stripped before either path
      reads them.

Plepic lost a day to these two paths disagreeing: the migrator sent an
SSLRequest to a server running `ssl = off` and reported a timeout naming two
candidate causes without saying which.

## T5 — Redis wiring and preflight

**Repository:** `lousydeal`.
**Files:** `backend/src/config/redis-preflight.ts`,
`backend/src/config/redis.ts`, `backend/tests/redis-preflight.test.ts`,
`backend/tests/redis-modules.test.ts`.

- [ ] Add a preflight that authenticates and sends a `PING` before Medusa
      loads, and refuses the workload when Redis is unreachable. Verified by a
      test asserting refusal against a closed port, and by the password
      appearing in the client options and never in the connection string.
- [ ] Declare the event bus, workflow engine and locking modules as three
      separate Redis wirings with their differing option shapes. Verified by a
      test running each loader against these exact objects and reading the
      connection it built.

The module loaders report success without connecting. Against a closed port
`event-bus-redis` logs *"Connection to Redis … established"* and does not throw,
which is how Plepic ran a worker that consumed a queue nothing published to.

## T6 — Medusa configuration and the Stripe module

**Repository:** `lousydeal`.
**Files:** `backend/medusa-config.ts`, `backend/src/config/payment.ts`,
`backend/tests/payment-provider-config.test.ts`,
`backend/tests/medusa-config.test.ts`.

- [ ] Assemble `medusa-config.ts` from the runtime configuration, registering
      the Stripe payment module and the three Redis modules. Verified by a test
      loading the config with a synthetic environment and asserting the module
      list.
- [ ] Wire `@medusajs/payment-stripe` from runtime configuration, in test mode.
      Verified by a test asserting the provider id and that no key is a literal.

## T7 — The three deal tiers

**Repository:** `lousydeal`.
**Files:** `backend/src/commerce/product-model.ts`,
`backend/src/scripts/seed-product.ts`,
`backend/src/scripts/configure-commerce.ts`,
`backend/tests/commerce-product-seed.test.ts`.

- [ ] Declare the three tiers — Lousy Deal $5, Lousy Deal Plus $10, Lousy Deal
      Pro $25 — in one module that is the single source for price and handle.
      Verified by a test asserting the amounts and that no price literal exists
      elsewhere.
- [ ] Seed the tiers and configure the region, sales channel and currency
      idempotently, so a re-run neither duplicates nor errors. Verified by a
      test running the seed twice against a stubbed Medusa and asserting one
      set of products.

Copy no tier *copy* here. The names are structural; the words are Gate B's.

## T8 — Storefront skeleton and runtime configuration

**Repository:** `lousydeal`.
**Files:** `storefront/package.json`, `storefront/next.config.ts`,
`storefront/tsconfig.json`, `storefront/src/config/env.ts`,
`storefront/src/config/runtime-config.ts`,
`storefront/src/app/layout.tsx`, `storefront/tests/no-next-public-env.test.ts`,
`storefront/tests/runtime-config.test.ts`.

- [ ] Add the storefront workspace and the runtime-configuration seam: one
      module reading `process.env`, one object assembled per request inside a
      dynamically rendered layout, handed to the browser as a single serialized
      blob. Verified by a test asserting the object is built from a passed
      record rather than the process environment.
- [ ] Add the `no-next-public-env` guard test, failing the build if any
      per-environment value is read as a `NEXT_PUBLIC_*` variable. Verified by
      the test failing against a deliberately added violation and passing once
      it is removed.

Decision `002` rests on this guard. Removing it removes the basis of the
promotion model.

## T9 — Provisional storefront surfaces

**Repository:** `lousydeal`.
**Files:** `storefront/src/app/page.tsx`, `storefront/src/app/cart/page.tsx`,
`storefront/src/lib/medusa-client.ts`, `storefront/src/lib/store-cart.ts`,
`storefront/tests/store-cart.test.ts`.

- [ ] Render the three tiers from the store API and let one be added to a cart.
      Verified by a test against a stubbed store API asserting the three tiers
      and the resulting cart line.

Unstyled and deliberately plain. Global constraint 7 governs: this is
scaffolding a later slice replaces, and no brand or visual decision is taken
here.

## T10 — Checkout and payment

**Repository:** `lousydeal`.
**Files:** `storefront/src/app/checkout/page.tsx`,
`storefront/src/lib/store-checkout.ts`, `storefront/src/lib/store-payment.ts`,
`storefront/src/app/api/store/[...path]/route.ts`,
`storefront/tests/store-checkout.test.ts`.

- [ ] Proxy the store API server-side so the browser never learns the backend
      origin, and complete a cart through Stripe test mode to a paid order.
      Verified by a test against a stubbed backend, and by the smoke check in
      T17 against a real one.

The final price is explicit before payment. That is a build requirement, not a
legal one, and it stays true when LD-06 adds surcharges.

## T11 — Both images

**Repository:** `lousydeal`.
**Files:** `backend/Dockerfile`, `backend/Dockerfile.dockerignore`,
`storefront/Dockerfile`, `storefront/Dockerfile.dockerignore`,
`scripts/images.test.ts`.

- [ ] Build both images from the repository root, each stage on one
      digest-pinned base, running as a non-root UID, declaring **no build
      argument at all**, and clearing the base `ENTRYPOINT` so Kubernetes `args`
      chooses the command. Verified by both images building locally and a test
      asserting no build argument and no baked environment value.

A build argument is how a per-environment value enters an artifact by accident.
There are none, so there is nothing to review later.

## T12 — Release and test promotion

**Repository:** `lousydeal`.
**Files:** `.github/workflows/release.yml`,
`.github/workflows/deploy-test.yml`, `scripts/update-gitops-digest.sh`,
`scripts/workflows.test.ts`.

- [ ] Add the digest guard and the label-triggered `Deploy Test` promotion,
      with the three-job split: the job that runs head code holds no
      credential, the job that holds the credential runs no head code. Verified
      by a test asserting each of those against the parsed document.
- [ ] Add `Release`, which validates, builds, scans and writes both digests
      into the live overlay on merge to `main`. Verified by a test asserting
      the promotion writes a digest matching `^sha256:[0-9a-f]{64}$` and never
      a tag.

**Effect gate.** Merging this row *is* a live promotion attempt, and it fires on
the merge that introduces it — not the one after. On the previous build the
equivalent workflow ran three seconds after its own merge, against an explicit
claim that it could not. Approve the merge as a deployment.

## T13 — Deployable state

**Repository:** `deploys`. **Runs after T12 merges.**
**Files:** `lousydeal/base/*.yaml`, `lousydeal/overlays/live/kustomization.yaml`,
`lousydeal/overlays/test/kustomization.yaml`, `lousydeal/tests/manifests.sh`.

- [ ] Add the base manifests — PostgreSQL, Redis, backend, worker, storefront,
      Service, NetworkPolicy, predeploy Job, RBAC — and both overlays carrying
      digest placeholders. Verified by
      `kubectl kustomize <overlay> | kubeconform -strict -summary` for both.
- [ ] Give the worker a readiness and a liveness probe. Verified by
      `grep -c Probe lousydeal/base/worker.yaml` returning a non-zero count.

Plepic's worker declares none, so "healthy" there means "running". Decision
`003` puts PostgreSQL in this base per environment; there is no shared server.

## T14 — Credentials

**Repository:** `orange`. **Runs after T13 merges.**
**Files:** `roles/openbao/defaults/main.yml`, `scripts/openbao-admin`,
`tests/openbao_templates.yml`, `tests/external_secrets_templates.yml`.

- [ ] Register the `lousydeal-…` and `lousydeal-test-…` sources, their OpenBao
      mounts, their ESO roles and the operator policy paths, following the
      Plepic entries. Verified by the existing template tests passing with the
      new entries.
- [ ] Seed the test environment's sources into OpenBao and confirm External
      Secrets renders them into the namespace. Verified by the Secret existing
      with the expected keys and no value appearing in any log or tracked file.

**Effect gate, one credential at a time.** Test and live are never written in
one step. A wrong value is a rotation, not a re-run. Decision `006` fixes the
names: the registered source is `lousydeal-test-runtime-credentials`, and the
Stripe values reach it as keys rather than as a source of their own.

## T15 — Argo CD

**Repository:** `orange`. **Runs after T14 merges.**
**Files:** `roles/argocd/defaults/main.yml`,
`roles/argocd/tasks/lousydeal.yml`, `roles/argocd/tasks/platform-verify.yml`,
`tests/lousydeal_argocd_templates.yml`.

- [ ] Render two Argo CD `Application` objects reading the two overlays, with
      the private NetworkPolicy and runtime patches injected, refusing a gated
      sync unless both overlays at one resolved revision carry real immutable
      digests. Verified by the template tests and by a check-mode run.

**Effect gate.** This is the row that creates namespaces and starts workloads.

## T16 — The test hostname

**Repository:** `orange`, plus operator action.
**Files:** `roles/cloudflared/defaults/main.yml`, `inventory-example/group_vars/orange.yml`.

- [ ] Publish DNS for `test.lousydeal.com` and apply a Cloudflare Access policy
      with a short session, gating it at the edge on Google identity. Verified
      by an unauthenticated request being refused and an authenticated one
      reaching the storefront.

**Effect gate, and DNS publication is its own approval.** Not application auth,
not a robots directive. A short session, not the 24-hour default the previous
build left on two applications.

## T17 — One real-dependency smoke check

**Repository:** `lousydeal`.
**Files:** `scripts/store-smoke`, `backend/vitest.smoke.config.mts`,
`backend/tests/smoke/store-api.test.ts`.

- [ ] Stand up PostgreSQL, Redis and a migrated Medusa, then assert the store
      API answers with the three tiers and that a cart can be created. Verified
      by `bash scripts/store-smoke` passing, and by it refusing rather than
      skipping when the backend URL is unset.

Every layer verified against the layer beneath it and nothing verifying the
assembly is how the previous build ran 2,959 green tests while the live backend
returned 500 on every catalogue load. This row is that check.

---

## Order

```text
T1 -> T2 -> T3 -> T4 -> T5 -> T6 -> T7 -> T8 -> T9 -> T10 -> T11 -> T12
                                                                     |
                                              T13 (deploys) <--------+
                                                 |
                                              T14 (orange, credentials)
                                                 |
                                              T15 (orange, Argo CD)
                                                 |
                                              T16 (DNS and Access)
                                                 |
                                              T17 (smoke, against test)
```

T3 through T7 are backend-only and touch disjoint files. T8 through T10 are
storefront-only. Neither group shares a file with the other, so the binding may
declare them parallel-safe; T11 onward is strictly sequential.

## What this slice does not deliver

Certificates, gifting, Printful, Baldrick, surcharges, Enterprise, and the
designed storefront. Also no live Stripe key, no apex DNS, no public launch, and
no legal or tax content — that gate follows the build and precedes publication.
