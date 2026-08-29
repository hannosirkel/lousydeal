# LD-01 — execution journal

Append-only. Every action, every command, every result. Never rewritten, never
compacted in place. Evidence referenced from `ledger.md` lives here in full.

`lousydeal` is public. No credential, no live private hostname, no rendered
Secret, and no secret-bearing command output reaches this file.

---

## 2026-08-29 — preflight

Ran the full preflight of the mechanism's §4 across `lousydeal`,
`architecture`, `deploys`, `orange`, and the `plepic` reference.

**Repositories.** All four plan repositories clean, on `main`, level with
`origin`, remotes verified rather than inferred from directory names.

```text
lousydeal     067dbbd  clean  = origin/main
architecture  a451e1e  clean  = origin/main
deploys       94a2875  clean  = origin/main
orange        1a22343  clean  = origin/main
plepic        8f367cb  clean  = origin/main
```

`git config --local core.hooksPath` in `lousydeal` reports `.githooks`, so the
gitleaks pre-commit hook is live in this checkout.

**Branch ruleset.** `21687602` active, carrying `deletion`, `non_fast_forward`,
`pull_request`, and `required_status_checks` on `Documentation`, `Shell`,
`Workflow lint` and `Secret scan`, each pinned to `integration_id` 15368.

**Skill install.** `./install --check` in `~/app/myskills` reports `OK: no
drift, up to date` against `8ca0f92`.

**Toolchain.** `bash scripts/validate` in `lousydeal` runs and passes:
shellcheck, markdownlint over 14 files with 0 issues, lychee over 41 links with
0 errors, gitleaks over 15 commits with no leaks. `validate: clean`, exit 0.

Node is `v24.18.1`, above the plan's `>=24.18.0` floor. `kubeconform` and
`ansible-playbook` were absent; see the resolution in `decisions.md`.

**Egress.** `api.github.com` 200, `registry.npmjs.org` 200, `ghcr.io/v2/` 401,
`api.stripe.com/v1` 404. The 401 and 404 are authentication and routing
responses from the hosts themselves, so all four are reachable.

**Remote access.** No WireGuard interface; `orange` does not resolve. Recorded,
not a failure — the binding's §3.5 puts the first need at T14.

**Plan-specific facts.** The catalogue still declares `languages: [shell]`,
`npm_project: false`, `lifecycle: registered-not-implemented`.
`tooling/universe audit lousydeal` reports `clean: 1 repositories audited`.
`plepic` sits at `8f367cb` with `"@medusajs/medusa": "2.18.0"`. Decisions `001`
through `006` are present, with `006` superseding `005`. The Stripe staging file
is at `~/app/orange/.keys/stripe-lousydeal-test`, mode `0600` — property checked
by `ls`, never opened.

**Plan conformance.** 17 tasks, 26 checkboxes, no duplicate checkbox text within
any task, every task declaring a `Files` list confined to one repository. All
three context-packet anchors resolve. C1 through C11 are each fed by at least
one task and T1 through T17 each feed at least one criterion. One size finding
against T13a, resolved by pre-approved override in `decisions.md`.

**Declared absences.** All twelve confirmed absent, none existing ahead of the
row that creates it: the root workspace and lockfile, `node_modules`,
`backend/`, `storefront/`, every Dockerfile, `release.yml`, `deploy-test.yml`,
`deploys/lousydeal/`, the OpenBao mounts, the Argo CD Application and
namespaces, DNS and the Access policy, `scripts/store-smoke`, and
`docs/issues/`. `.github/workflows/` holds `validate.yml` only and `scripts/`
holds `validate` only.

Preflight presented to the operator and confirmed.

---

## 2026-08-29 — T1a, workspace skeleton

Worktree created per the repository's own agent instructions rather than
committing to a default branch:

```text
~/app/.worktrees/lousydeal/t1a-workspace
branch big-build/ld-01-foundation/t1a-workspace from origin/main at 067dbbd
core.hooksPath set to .githooks in the new worktree
```

State directory created at `docs/working/ld-01-foundation/`. Because the
repository forbids direct commits to `main` and the ruleset enforces it, state
commits ride the unit's own branch under the `chore(big-build):` prefix rather
than landing separately; the prefix is what keeps them filterable at review.

**Implementer dispatched**, mid tier. Produced `package.json`, `tsconfig.json`,
`eslint.config.js`, `vitest.config.ts` and the generated lockfile. Dependency
ranges matched to `plepic` `8f367cb` exactly. `.gitignore` was overwritten in
error and restored by the implementer, which it self-reported; `git diff --
.gitignore` is empty and the file is not in the staged set, so the restore is
verified rather than accepted.

The brief anticipated that `npm ci` might refuse `workspaces: ["backend",
"storefront"]` with both directories absent. It does not — npm treats a literal
workspace entry with no matching directory as a silent no-op. No conflict
between the plan's file list and its verification command.

Orchestrator re-ran the evidence independently:

```text
npm run lint       exit 0
npm run typecheck  exit 0
npm run test:unit  exit 0
package-lock.json  2423 lines, lockfileVersion 3
                   every resolved URL on registry.npmjs.org, no other host
                   six top-level devDependencies, matching package.json
```

**Review pass 1**, top tier, fresh context, not the author. Two Major findings.

The root `vitest.config.ts` used `include: ["scripts/**/*.test.ts"]`, which
covers the two suites the plan puts under `scripts/` and none of the thirteen
under `backend/tests/` and `storefront/tests/`. The file's comment deferred the
fix to T3 and T8; the reviewer established that neither row can perform it,
because root `vitest.config.ts` appears in exactly one `Files` list in the whole
plan — T1's. The debt was not deferred but unpayable. One of the orphaned suites
is the guard decision `002` rests on.

`tsconfig.json` used `"include": ["vitest.config.ts"]`, type-checking one file
and skipping `scripts/`, which exists today and receives test files at T11 and
T12. Demonstrated rather than asserted: `const n: number = "definitely a
string";` in `scripts/` passed both `typecheck` and `lint`.

**Fix pass**, mid tier, not the author of the original. Applied both. Its report
also flagged, under unanticipated findings, that the `"./backend/*"` glob it had
chosen discovers every immediate entry under `backend/` as a project.

**Orchestrator caught the fix as wrong.** Tested against the tree T3 actually
creates:

```text
Error: The projects glob matched a file "backend/package.json", but it should
also either start with "vitest.config"/"vite.config" or match the pattern
"(vitest|vite).*.config.*".
exit 1
```

`backend/package.json` is the first file T3 writes, so the fix would have passed
its own verification, merged clean, and hard-failed startup on the next row —
in a file T3 has no authority to repair. Three forms were tested. An explicit
path and a bare directory are both startup errors while absent; a directory glob
survives absence and breaks on first contact. `"./backend/vitest.config.*"`
holds in both states.

**Review pass 2**, top tier, fresh context. Confirmed the backend half resolved
and found two further Major findings.

The storefront half was still broken, and for a reason specific to the plan:
T8's `Files` list ships `storefront/tests/` but no storefront vitest config, so
a config reference there matches nothing, ever. Reproduced — a failing
storefront test on disk with `npm run test:unit` reporting green. Fixed with an
inline project rooted at the directory, which needs no file from T8.

`npm run typecheck` never reaches either workspace, because `tsc --noEmit` does
not recurse. Escalated to the operator; see `decisions.md`.

Orchestrator verification of the storefront fix, all three states:

```text
both absent                              exit 0
storefront/tests + no config, failing    exit 1, |storefront| suite caught
backend + storefront, one failing        exit 1, 2 projects, 2 files
after cleanup, git status --short        no trace of either directory
```

**Review pass 3**, top tier, fresh context. **Minor only — no Blocking, no
Major.** The reviewer exercised every earlier Major rather than reading the
fixes, including reverting the rejected `"./backend/*"` form to confirm it
really does fail at startup, and confirming that `./backend/vitest.config.*`
correctly leaves T17's `vitest.smoke.config.mts` in its own gate. It accounted
for all fifteen test paths the plan names against the three projects.

Independent verification it ran: `npm ci` on a cleared `node_modules`,
`bash scripts/validate` end to end, `gitleaks` over the five files, a parse of
the lockfile confirming 156 entries all resolving to `registry.npmjs.org` with
integrity hashes and no workspace link entries, and ESLint probes over `.ts`,
`.tsx` with real JSX, `.mts` and `.js` to confirm the config will not hard-fail
when T8 lands TSX.

Its one Minor was the wording of the `passWithNoTests` comment, which claimed
the flag "becomes removable once any suite does" — no row can remove it, since
this file is in T1's list and no other. Reworded to state that it stays on and
that a project resolving to zero files therefore does not announce itself.
**Comment-only, applied after pass 3 and so not itself reviewed**; recorded in
the pull-request body as such.

**Row closed.** Two commits, work and state kept separate:

```text
943df5c  Add the root npm workspace
80e0357  chore(big-build): open the LD-01 ledger and record the T1 boundary
         decisions
```

Pre-commit gates run before each: `git diff --check` clean, staged-diff
credential scan clean, `gitleaks protect --staged` no leaks, and the tracked
`.githooks` gitleaks hook fired on both commits.

**Carried to T1b's review**, raised by pass 3 and belonging to that row rather
than this one. `npm run typecheck --workspace backend` exits 1 with
`No workspaces found: --workspace=backend` on the current tree, so T1b cannot
copy the reference implementation's three lines literally — the presence guard
is the only thing keeping `scripts/validate` green between T1b and T3. But a
presence guard is itself a silent skip, and nothing in the plan obliges T3 or T8
to tighten it once their workspace lands; `scripts/validate` is in no row's file
list but T1's. T1b's reviewer should be pointed at that specific question.

---

## 2026-08-29 — T1b, one canonical validation command

Worktree `~/app/.worktrees/lousydeal/t1b-validate`, branch
`big-build/ld-01-foundation/t1b-validate` from `origin/main` at `e6d2821`.

Post-merge check of T1a's declared absences: all flipped from expected-absent to
required and all present. The catalogue absence correctly did **not** flip —
`languages: [shell]` and `npm_project: false` remain T2's to change, in
`architecture`.

**Three review passes, one Blocking and one Major.** Both were introduced by a
change that fixed something real, and neither would have shown in a green run.

**Pass 1 — Blocking.** The `Install lychee` step used `tar -xzf "$archive"
lychee`, copied from the gitleaks step above it. The two archives differ:

```text
lychee-x86_64-unknown-linux-gnu/lychee    nested under a top-level directory
gitleaks                                  at the archive root
```

Under `set -euo pipefail` the job died there on every run, before reaching the
validation command. The pinned checksum was correct; only the member path was
wrong. The job would have been permanently red, and the pending ruleset change
would have added a required context that could never go green. The reviewer also
identified the trap in the obvious fix: extracting the whole archive into the
checkout puts its own `README.md` and `docs/*.md` inside markdownlint's `**/*.md`
glob and lychee's scan path, since `lychee.toml` excludes only `node_modules`,
`.next` and `.medusa`. Fixed by extracting the single member into `RUNNER_TEMP`,
for both tools, with a comment at the site recording the layout difference.

**Pass 2 — Major, and the orchestrator's own error.** The fix brief had ordered
the workspace list derived from `package.json` rather than hardcoded, to remove a
maintenance hazard. The implementation used
`mapfile -t workspaces < <(node -e …)`, and `set -euo pipefail` does not cover
process substitution while `mapfile` returns 0 regardless. Verified: three
legitimate npm `workspaces` forms each produced an empty list, a silently skipped
fanout, and `validate: clean`.

```text
key absent                      mapfile exit 0, empty, skipped
{"packages":["backend"]}        mapfile exit 0, empty, skipped
["apps/*"]                      literal apps/*, guard false, skipped
```

A hardcoded list that was always right had been replaced by a derived list right
for one of three legal forms — in the file whose own comment says a check that
silently did not run reports as a pass. Fixed with a command substitution, which
`set -e` does abort on, plus explicit refusal of non-array and glob forms.

Pass 2 also corrected the orchestrator's reasoning on a carried item: enforcing
the local Node floor had been deferred as needing `.npmrc` or `.nvmrc`, which no
row owns, but `scripts/validate` is in this row's `Files` list and no later
row's, and already refuses on a missing `node`. It now checks `engines.node`.

**Pass 3 — minor only.** Four minors. One was a residual fail-open the
orchestrator fixed rather than carried: the `engines.node` parser matched the
prefix `>=`, so `">=24.18.0 <25"` compared as one string and silently ignored the
upper bound, and `">= 24.18.0"` produced a false refusal. Both now refuse, with
every case exercised:

```text
>=24.18.0 <25   exit 2   cannot parse ... only a bare >=x.y.z floor
>= 24.18.0      exit 2   cannot parse ... only a bare >=x.y.z floor
^24.18.0, 24.x  exit 2   cannot parse
>=24.18.0       exit 0   passes
>=24.18.1       exit 0   passes (boundary, equal)
>=24.19.0       exit 2   refuses
```

`package.json` verified byte-identical to the index after each experiment.

**Other outcomes.** `markdownlint-cli2` became an exact-pinned devDependency
rather than a global install, which removed a `zizmor: ignore[adhoc-packages]`
suppression entirely — the suppression's stated justification had rested on the
orchestrator's over-tight file list, not on the plan's. `node_modules/.bin` is
appended rather than prepended to `PATH`, so no dependency shipping a `bin` named
`gitleaks` can displace the secret scan. `actions/setup-node` bumped to v7.0.0,
SHA verified against the tag.

**Transient, not a defect.** The link checker failed three runs with GitHub
`504 Gateway Timeout` during repeated local testing and passed on retry.
`lychee.toml` accepts `200/204/206/429` and retries twice; a 504 is neither.
Both the `Documentation` job and the new canonical job now run lychee, so a PR
has two chances to hit it. Recorded as an open question rather than changed —
`lychee.toml` is in no row's `Files` list.

**Row closed.** Pre-commit gates run before each commit: `git diff --check`
clean, credential scan of the staged non-lockfile diff clean, `gitleaks protect
--staged` no leaks, and the tracked `.githooks` hook fired.

---

## 2026-08-29 — E0, and a defect found on merged main

**T1b merged** as `ba9cb1a`. CI on `main` green. Task T1 closed.

**A defect in the merged code, found by running the command on a real checkout.**
`~/app/lousydeal` has never had `npm ci` run. `bash scripts/validate` there:

```text
==> lint
ESLint: 6.4.0.
ESLint couldn't find a configuration file.
exit=2
```

The missing-tool check passed because a global `markdownlint-cli2` exists at
`/usr/local/bin` and satisfies `command -v` — so the one proxy for "dependencies
are installed" was defeated. `npm run lint` then fell through to a global ESLint
`6.4.0` against the pinned `^10.8.1`, four majors apart, and ESLint 6 cannot read
flat config. The developer is sent to look for a configuration file that exists.

Review pass 3 raised the ingredient and rated it Minor, framing the consequence as
version drift with a safe failure direction. That was right about
`markdownlint-cli2` and missed that the same check was load-bearing for
`node_modules` as a whole. The orchestrator accepted that framing. CI is
unaffected because it runs `npm ci` first, which is why every gate was green.

The lesson is narrow and worth keeping: **a check that passes in CI and on the
author's machine has been tested on two configured environments and no
unconfigured one.** The defect was only visible on a checkout nobody had prepared.

**E0 — effect gate, approved and executed.** Adding `Canonical validation` to
ruleset `21687602`. Not in the binding's inventory; discovered at T1b. The
mechanism's category list is a floor, and an access-policy change on a public
repository's default branch is an effect gate whether the binding enumerated it
or not.

State was committed before the write and again immediately after. Verified after
executing:

```text
required contexts: Documentation, Shell, Workflow lint, Secret scan,
                   Canonical validation
rules:             deletion, non_fast_forward, pull_request,
                   required_status_checks
enforcement:       active
```

The four pre-existing contexts and all other rules are unchanged — the patch
appended rather than rewrote. Rollback JSON retained.

**Plan amended, 26 rows to 27.** T2b added to repair the defect. The operator
chose amendment over an issue entry. Implemented as a second row rather than an
addition to T2's file list: T2 is in `architecture`, `scripts/validate` is in
`lousydeal`, and global constraint 6 requires two rows with a stated order.

Every existing checkbox hash recomputed after the edit — **no drift**, one row
added. Row identity is keyed on checkbox text, and no checkbox text changed.
