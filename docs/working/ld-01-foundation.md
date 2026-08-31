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
10. **A claim is bounded, cited, or executed. Otherwise it does not go in.**
    This governs comments, JSDoc, test names, error messages, task briefs and
    review findings alike — the last three because more than half the claims this
    rule exists for came from briefs and reviews, not from implementers.
    - **Bounded.** *only, every, each, both, none, no, any, all, never, always,
      exactly N, deterministic, regardless of* are permitted when the set they
      range over is
      enumerated where the reader stands. Otherwise name the members or drop the
      quantifier. "Every failure emits X" is not allowed; "the two of the six
      measured here emit X" is.
    - **Cited.** If the truth-maker is outside this file — a dependency, a tool's
      semantics, another repository, an artefact a later row builds — name it
      precisely enough to open: a path and symbol under `node_modules/`, a
      repository and commit, or the command run and its output. A measurement
      carries the conditions it was taken under, including the ones that would
      move it.
    - **Executed.** If the claim is *the reason a line of code exists* — if the
      code would be wrong were the claim false — a test asserts it against the
      real thing, not a local model of it, and goes red when it stops being true.

    A claim fitting none of the three is deleted. The code is not worse without
    the sentence. *each*, *both* and *none* joined the list at T5b, where the
    worst instance found sat on an "each" that the list did not then cover. Added after twenty instances across nine rows of text asserting
    something untrue of the code it described; **not one of the twenty erred by
    claiming too little.**
11. **A claim proven false may be corrected by a maintenance pull request, in
    any file, when no open row declares that file.** The correction cites what
    disproved it and changes no behaviour. Constraint 9 covers a row that
    falsifies a document; this covers a claim already false, in a file every
    row that could have fixed it has closed — which happened four times before
    it was named.

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
`backend/src/config/runtime.ts`, `backend/tests/runtime-config.test.ts`,
`backend/tsconfig.test.json`, `package-lock.json`, `README.md`, `AGENTS.md`.

**T3a's first checkbox below is inaccurate and is left unchanged deliberately.**
`env.ts` does not read `process.env` — it reads an object it is handed, which is
what makes it testable and is what the row's own verification requires. The only
module under `backend/src/` naming `process.env` is `redis-preflight.ts`, which
passes it in; the test files name it too. The row
is closed and its checkbox text is its ledger identity, so correcting the words
would re-key a completed row; the correction goes here instead. Global constraint
10 exists because this sentence was struck from a module header and from a test
file and still survived here, in the document copied into every context packet.

**`backend/src/config/runtime.ts` is the one module that assembles backend
configuration. Every later row that produces a configuration value carries it.**
That is a design fact rather than a textual one, so no rule about `Files` lists
would have found it: T4 resolves the database URL, T5 the three Redis wirings and
T6 the Stripe module, and each has to reach the assembler. T4, T5 and T6 declare
it for that reason.

`package-lock.json` is here because npm workspaces share one root lockfile, so a
backend dependency necessarily writes it; the binding's conflict map already
says as much, and the row that adds it must own it. `README.md` and `AGENTS.md`
are here under global constraint 9: both state that `backend/` does not exist
yet, which this task makes untrue. Both belong to the first row of the task, not
the second.

- [ ] Add `backend/src/config/env.ts` as the only module that reads
      `process.env`, exposing trimmed required and optional readers and a
      `ConfigError`. Verified by a test that passes a plain object rather than
      the process environment.
- [ ] Add `backend/src/config/runtime.ts` assembling the backend's
      configuration and **failing closed**: a required value that is absent
      throws at load rather than defaulting. Verified by a test asserting the
      refusal names the missing variable.

**This row also owns `backend/tsconfig.json`, and it is the last row that may
touch it.** T3a shipped it as a typecheck-only config — `noEmit: true`, and an
`include` of `src/**` and `tests/**` only. Medusa's compiler spreads
`tsConfig.options` into `createProgram` without overriding `noEmit`, and guards
only on `emitSkipped`, which TypeScript leaves `false` when `noEmit` suppresses
output. `medusa build` would therefore write **zero files**, report success, exit
0, and hand T11 an image that cannot start. `medusa-config.ts` sits at the
workspace root and matches neither `include` glob, so T6's file could never be
compiled either.

Split it the way the reference implementation does: a build config
(`module`/`moduleResolution` `Node16`, `outDir` `.medusa/server`, `rootDir` `.`,
including `medusa-config.ts` and `src/**`, excluding `tests`) and a
`tsconfig.test.json` extending it with `noEmit` for the test surface, with
`typecheck` running both. Add `vitest.config.mts` to the typechecked set — today
a type error in it is caught by nothing.

## T4 — Database URL and SSL resolution

**Repository:** `lousydeal`.
**Files:** `backend/src/config/database-url.ts`,
`backend/tests/database-ssl.test.ts`, `backend/src/config/runtime.ts`,
`backend/package.json`, `package-lock.json`, `README.md`, `AGENTS.md`,
`backend/tests/runtime-config.test.ts`.

The row's verification runs **Medusa's own resolver** against the produced
object, and Medusa is not installed until this row installs it — the manifest and
the shared root lockfile are here for that. Hand-copying the resolver into the
test would defeat its purpose, which is precisely that Medusa's resolver and the
runtime path must agree.

`README.md` and `AGENTS.md` are here under global constraint 9, and this row
should end the recurring cost rather than pay it again. Both currently
**enumerate** what `backend/` holds — "the environment reader and configuration
assembler so far" — which T4, T5, T6 and T7 each falsify in turn. Rewrite the
sentence so it describes the backend at a level that stays true as modules are
added, and no later row has to touch either file for this reason again.

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
`backend/tests/redis-modules.test.ts`, `backend/src/config/runtime.ts`,
`backend/package.json`, `package-lock.json`,
`backend/tests/runtime-config.test.ts`, `backend/src/config/env.ts`.

`env.ts` is here under global constraint 10. Its header claims trimming, absence
and refusal "all live here"; there are eight `ConfigError` throw sites across
three files. T3 is closed and owned it, so no open row could correct it.

The preflight must run **before Medusa loads**, which means an npm script, not
just a module; the test spawns that script, so it has to exist. The Redis client
is a dependency, and the host, port and password shape lives in the assembler —
the password reaches the client options and never the connection string.

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
`backend/tests/medusa-config.test.ts`, `backend/package.json`,
`package-lock.json`, `backend/src/config/runtime.ts`,
`backend/tests/runtime-config.test.ts`.

**A row that extends the assembler carries the assembler's test.** Its
`toEqual` enumerates the shape `readBackendRuntimeConfig` returns, so adding a
field to the assembler necessarily changes that assertion — no ordering or
restructuring avoids it. T4 hit this and disclosed it; T5 and T6 declare the file
so they do not have to.

`backend/package.json` and the root lockfile are here because this row registers
the Stripe payment module and three Redis modules, which means adding Medusa
dependencies — and npm workspaces share one lockfile. Without them the row could
declare modules it cannot install.

- [ ] Assemble `medusa-config.ts` from the runtime configuration, registering
      the Stripe payment module and the three Redis modules. Verified by a test
      loading the config with a synthetic environment and asserting the module
      list.
- [ ] Wire `@medusajs/payment-stripe` from runtime configuration, in test mode.
      Verified by a test asserting the provider id and that no key is a literal.

## T7 — The three deal tiers

**Repository:** `lousydeal`.
**Files:** `backend/src/commerce/product-model.ts`,
`backend/src/commerce/tax-model.ts`,
`backend/src/scripts/seed-product.ts`,
`backend/src/scripts/configure-commerce.ts`,
`backend/tests/commerce-product-seed.test.ts`,
`backend/tests/commerce-configuration.test.ts`, `backend/package.json`,
`docs/decisions/007-usd-and-tax-inclusive-pricing.md`,
`docs/decisions/008-plepic-tax-treatment.md`,
`docs/current/plepic-reuse.md`.

Both scripts are `medusa exec` entry points and are unreachable code without the
npm scripts that invoke them. The predeploy Job in `deploys` runs
`npm run predeploy`, and that chain is declared here — the other repository
cannot add it.

The region carries the payment provider, which is why the third checkbox is
here rather than with T6. `@medusajs/medusa`'s `/store/payment-providers`
route filters by `region_id`, so the Region link — not the module
registration — is what a storefront can see. Registering the Stripe package
registers eight provider services and offers none of them until this row runs.

- [ ] Declare the three tiers — Lousy Deal $5, Lousy Deal Plus $10, Lousy Deal
      Pro $25 — in one module that is the single source for price and handle.
      Verified by a test asserting the amounts and that no price literal exists
      elsewhere.
- [ ] Seed the tiers and configure the region, sales channel and currency
      idempotently, so a re-run neither duplicates nor errors. Verified by a
      test running the seed twice against a stubbed Medusa and asserting one
      set of products.
- [ ] Bind the region's payment providers to the id
      `src/config/payment.ts` derives, as a field on the region record
      rather than a separate step. Verified by a test asserting the region
      carries exactly that provider id.

Copy no tier *copy* here. The names are structural; the words are Gate B's.

## T8 — Storefront skeleton and runtime configuration

**Repository:** `lousydeal`.
**Files:** `storefront/package.json`, `storefront/next.config.ts`,
`storefront/tsconfig.json`, `storefront/src/config/env.ts`,
`storefront/src/config/runtime-config.ts`,
`storefront/src/app/layout.tsx`, `storefront/tests/no-next-public-env.test.ts`,
`storefront/tests/runtime-config.test.ts`, `package-lock.json`,
`storefront/next-env.d.ts`, `README.md`, `AGENTS.md`,
`.markdownlint-cli2.jsonc`.

`README.md` and `AGENTS.md` are here under global constraint 9: both say
`storefront/` does not exist, and no row after T3 owned either until this one.
`next-env.d.ts` is generated by Next on first build and nothing ignores it.
`.markdownlint-cli2.jsonc` is the row's eleventh file, an operator-granted
override on 2026-08-31 (constraint 3): the bare `node_modules` ignore matched
neither a nested `node_modules` nor a build output directory, and this row's
second workspace made both reachable.

**The storefront cannot have its own Vitest config.** The root `vitest.config.ts`
lists it as an *inline* project, not a config glob, and that file is frozen — a
`storefront/vitest.config.ts` would never be loaded. So no `@/*` path alias in
anything a test imports, no *config-level* raised timeout, no non-`node`
environment.

**A per-test timeout needs no config**, and this paragraph previously implied
otherwise — corrected at T8b under global constraint 11, after that inference
reached a test file's comment. Vitest takes one as a third argument,
`it("…", async () => {…}, 120_000)`, or as `{ timeout }` in an options object.
So a row that needs one long-running test can have it; what it cannot have is a
raised default for every test at once. **T17 depends on this** — its smoke check
stands up real services, and the frozen config is not what would stop it.

Of those three, the reference implementation
(`plepic` `8f367cb`, `storefront/vitest.config.ts`) uses **one**: it raises
`testTimeout` to 120s and `hookTimeout` to 180s. It sets `environment: "node"`
explicitly and declares no `resolve.alias` — the `@/*` alias exists only in its
`storefront/tsconfig.json`, for application code, and no test there imports
through it. The raised timeout is the real hazard to watch when copying.

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
`storefront/tests/store-cart.test.ts`, `storefront/package.json`,
`package-lock.json`.

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
`storefront/tests/store-checkout.test.ts`, `storefront/package.json`,
`package-lock.json`.

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
`scripts/images.test.ts`, `backend/package.json`, `storefront/package.json`,
`storefront/next.config.ts`, `backend/src/config/redis-preflight.ts`,
`package-lock.json`.

`next.config.ts` is here because a standalone image runs `node server.js`, which
Next emits only under `output: "standalone"` — T8 has no reason to set it and is
the last row before this one that names the file.

`redis-preflight.ts` is here because two of its claims are about a container
image that does not exist until this row, and this is the row that can check
them against the real thing.

Both workspace manifests are here because an image has to run a build, and
neither manifest declares a `build` script before this row. A Dockerfile that
invokes one that does not exist fails at image build; a Dockerfile that invokes
one which emits nothing fails only in the cluster.

**`medusa build` cannot complete on the lockfile as it stands** (Q8): the
backend half compiles and the admin-frontend half fails, because
`@medusajs/admin-sdk` is declared nowhere and `defineRouteConfig` resolves to
`__vite-optional-peer-dep`. The operator ruled on 2026-08-30 that it is added.
The reference declares it at `2.18.0` alongside six further admin-side
packages, so this row proves the build completes rather than assuming one
dependency is enough — and the root lockfile is here for that.

- [ ] Build both images from the repository root, each stage on one
      digest-pinned base, running as a non-root UID, declaring **no build
      argument at all**, and clearing the base `ENTRYPOINT` so Kubernetes `args`
      chooses the command. Verified by both images building locally and a test
      asserting no build argument and no baked environment value.

A build argument is how a per-environment value enters an artifact by accident.
There are none, so there is nothing to review later.

## T12 — Release and test promotion

**Repository:** `lousydeal`. **Runs after T13 merges.**
**Files:** `.github/workflows/release.yml`,
`.github/workflows/deploy-test.yml`, `scripts/update-gitops-digest.sh`,
`scripts/workflows.test.ts`, `scripts/validate`,
`.github/workflows/validate.yml`, `scripts/yaml-subset.ts`, `lychee.toml`.

**T13 runs first, and the order is not cosmetic.** `Release` writes both digests
into `deploys/lousydeal/overlays/live/kustomization.yaml` on the merge that
introduces it. T13 creates that file. In the original order the first promotion
would have written to a path that does not exist, on a merge the operator had
just approved as a deployment — a promotion that silently does nothing is the
failure class this build has already been bitten by twice.

**This row also fixes the shell gate, and it is the last row that can.**
`scripts/validate` and the validate workflow both hardcode
`shellcheck scripts/validate .githooks/pre-commit`. This row adds
`scripts/update-gitops-digest.sh` and T17 adds `scripts/store-smoke`, and neither
would be linted by anything. Derive the set from `git ls-files` by name and
shebang, as the reference implementation and the `deploys` repository already do,
rather than appending one path per row. `scripts/yaml-subset.ts` is here because
the row verifies "against the parsed document" and nothing in this repository
parses YAML; the reference hand-rolls it rather than taking a dependency.

`lychee.toml` is here because this row already declares
`.github/workflows/validate.yml`, and is where the duplicate link-check run in
the `Documentation` job can be removed.

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

**Repository:** `deploys`. **Runs after T11 merges, and before T12.**
**Files:** `lousydeal/base/*.yaml`, `lousydeal/overlays/live/kustomization.yaml`,
`lousydeal/overlays/test/kustomization.yaml`, `lousydeal/tests/manifests.sh`,
`.github/workflows/validate.yml`, `README.md`, `AGENTS.md`,
`lousydeal/README.md`.

Both overlays ship carrying sentinel digests, so T12's first promotion has
somewhere to write. The workflow is here because its `Manifests` job names each
application root literally — without an edit, the new manifest test and both
overlays run in **no gate**, and C8 is a claim about CI rather than about one
person's terminal. `README.md` and `AGENTS.md` in that repository both enumerate
its application roots, which this row falsifies; global constraint 9 applies
there too.

- [ ] Add the base manifests — PostgreSQL, Redis, backend, worker, storefront,
      Service, NetworkPolicy, predeploy Job, RBAC — and both overlays carrying
      digest placeholders. Verified by
      `kubectl kustomize <overlay> | kubeconform -strict -summary` for both.
- [ ] Give the worker a readiness and a liveness probe. Verified by
      `grep -c Probe lousydeal/base/worker.yaml` returning a non-zero count.

Plepic's worker declares none, so "healthy" there means "running". Decision
`003` puts PostgreSQL in this base per environment; there is no shared server.

## T14 — Credentials

**Repository:** `orange`. **Runs after T12 merges.**
**Files:** `roles/openbao/defaults/main.yml`, `scripts/openbao-admin`,
`tests/openbao_templates.yml`, `tests/external_secrets_templates.yml`,
`roles/argocd/defaults/main.yml`, `roles/argocd/tasks/namespaces.yml`,
`tests/test_openbao_admin.py`.

**The ESO roles are not in the openbao role.** The SecretStores, the
`eso-lousydeal` roles and every ExternalSecret projection live in
`argocd_openbao_projection_contract`, in `roles/argocd/defaults/main.yml` — which
is exactly what `tests/external_secrets_templates.yml` reads.

**This row creates the namespaces, and must.** The namespace-coverage test is a
static parser: the moment a `lousydeal` entry joins the projection contract
without a namespace, it goes red and stays red. That is not hypothetical — on
2026-08-17 a contract entry with no namespace made `kubectl diff` exit 2 and
failed the whole argocd role for *every* consumer at once. Enrolling a consumer
and creating its namespace are one row because the gate treats them as one fact.

- [ ] Register the `lousydeal-…` and `lousydeal-test-…` sources, their OpenBao
      mounts, their ESO roles and the operator policy paths, following the
      Plepic entries. Verified by the existing template tests passing with the
      new entries.

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

**Effect gate.** This is the row that starts workloads. The namespaces they run
in were created at T14, because enrolling a consumer in the projection contract
without its namespace breaks a gate for every other consumer.

## T15b — Seed the test credentials and confirm they render

**Repository:** `orange`, plus operator action. **Runs after T15 merges.**
**Files:** `scripts/openbao-admin`.

- [ ] Seed the test environment's sources into OpenBao and confirm External
      Secrets renders them into the namespace. Verified by the Secret existing
      with the expected keys and no value appearing in any log or tracked file.

Split out of T14 after the audit. The checkbox confirms a Secret exists **in a
namespace**, and the namespaces are created at T14 while the SecretStores that
render into them are reconciled at T15 — so this cannot be verified before both
have landed. Its text is unchanged from T14's second checkbox, so its ledger row
keeps its hash and changes only its task.

**Effect gate, one credential at a time.** Test and live are never written in one
step. A wrong value is a rotation, not a re-run.

## T16 — The test hostname

**Repository:** `orange`, plus operator action. **Runs after T15b merges.**
**Files:** `scripts/cloudflare-add-web`, `tests/test_cloudflare_web.py`,
`inventory-example/group_vars/orange.yml`.

**The session duration is hardcoded in the script, twice.** DNS publication and
the Access application are both `scripts/cloudflare-add-web`, and it sets
`session_duration: "24h"` for the application and for the org. The row's whole
distinguishing requirement — a short session, not the 24-hour default the previous
build left on two applications — cannot be expressed in a defaults file.
`roles/cloudflared/defaults/main.yml` is **not** needed: the reference routes over
the existing `web` tunnel and has no instance entry of its own. A dedicated tunnel
would be a separate decision this row does not take.

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
`backend/tests/smoke/store-api.test.ts`, `backend/package.json`, `compose.yaml`,
`backend/src/config/database-url.ts`.

`scripts/store-smoke` invokes `npm run build`, `predeploy`, `start` and
`test:smoke` in the backend workspace, and only `build` is promised before this
row. `compose.yaml` stands up PostgreSQL and Redis on the digests the cluster
runs — inlining `docker run` here would put the same pins in a third place.

`database-url.ts` is here because this row declares `compose.yaml`, the
artefact that can falsify that file's "no compose file" universal.

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
T1 -> T2 -> T3 -> T4 -> T5 -> T6 -> T7 -> T8 -> T9 -> T10 -> T11
                                                                |
                                     T13 (deploys, overlays) <--+
                                        |
                                     T12 (lousydeal, Release writes into them)
                                        |
                                     T14 (orange, registration + namespaces)
                                        |
                                     T15 (orange, Argo CD, starts workloads)
                                        |
                                     T15b (seed credentials, confirm rendering)
                                        |
                                     T16 (Access policy, then DNS)
                                        |
                                     T17 (smoke, against test)
```

T4, T5 and T7 are backend-only and touch disjoint files. T8 through T10 are
storefront-only. T11 onward is strictly sequential.

**T3 and T6 are not parallel-safe with anything, including each other.** Both own
`backend/package.json` and the root `package-lock.json`, which npm workspaces
share; T3 additionally owns `README.md` and `AGENTS.md` under global constraint 9.
This paragraph previously said T3 through T7 were backend-only and disjoint, and
the file-list amendments made both halves false. **The binding's conflict map must
not declare T3–T7 parallel-safe on the strength of the older wording.**

## What this slice does not deliver

Certificates, gifting, Printful, Baldrick, surcharges, Enterprise, and the
designed storefront. Also no live Stripe key, no apex DNS, no public launch, and
no legal or tax content — that gate follows the build and precedes publication.
