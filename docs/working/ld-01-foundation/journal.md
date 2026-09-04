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

---

## 2026-08-29 — T2a, declaring TypeScript in the catalogue

Repository `architecture`, worktree `~/app/.worktrees/architecture/t2a-catalogue`
from `origin/main` at `a451e1e`. Merged as `a513021`, PR #36.

Dispatched at the binding's **low** tier, which §11 assigns to T2. The mechanical
part was correct first time. The judgement part was not, and that is what the
tier's mandatory orchestrator check exists for.

**Evidence, re-run by the orchestrator rather than accepted:**

```text
tooling/universe validate                     clean: 14 repositories validated
tooling/universe audit lousydeal              2 failing, 0 advisory
                                              (stale-baseline, stale-habit-config)
python3 -m unittest discover -s tooling       Ran 120 tests ... OK
tooling/universe sync-baseline --dry-run      would write AGENTS.md,
                                              .habit-hooks/config.toml
```

A full-universe audit before and after reported 5 failing and 7 advisory across
13 repositories in both cases: `lousydeal`'s two findings swapped kind rather
than multiplying, and nothing else in the catalogue moved.

**The `languages_note` field was rewritten three times and was wrong twice.**
The implementer turned it from future to past tense and asserted `typescript`
"was added in the same commit as the first TypeScript file" — impossible, since
the code is in `lousydeal` and the catalogue is in `architecture`. The
orchestrator's replacement said "the change immediately after", which review pass
1 showed skipped two intervening changes on `main`. Pass 2 then found an
ambiguous antecedent and an undefined hedge in the third version.

Four lines of prose in a YAML file took more review attention than the three
functional changes around it. That is the right allocation: the functional
changes are verifiable by running a command, and prose in a governance catalogue
is verifiable only by someone going and checking. It is the part most likely to
be believed without checking.

**Dropping `lifecycle: registered-not-implemented`** is the one behaviour-changing
deletion. Its only reader suppresses the profile's `expected_docs` advisory while
a repository is unimplemented; `lousydeal` has `docs/current/`, so nothing newly
fires — confirmed by `0 advisory`. No generated artifact reads the field.

**Two inherited defects surfaced, both dispositioned to `architecture`.** See Q3.
Neither is introduced by the row; `plepic` carries both today, and the only way
to avoid them is not to declare the language, which the plan requires.

**Plan amended, 27 rows to 28.** T2c added, because T2's stated verification is
unreachable from inside T2. All existing hashes recomputed: no drift.

`architecture`'s own `Baseline drift` job reported the companion work on the
merge, unprompted:

```text
fix: tooling/universe sync-baseline lousydeal, then open a pull request
1 repositories affected by HEAD~1..HEAD. This is a report, not a failure.
```

---

## 2026-08-29 — T2c, resyncing the generated artifacts

Worktree `~/app/.worktrees/lousydeal/t2c-baseline` from `origin/main` at
`7073710`. Generated from `architecture` `a513021`, which carries T2a.

The second half of the cross-repository pair. **T2's stated verification is
reachable for the first time:**

```text
tooling/universe audit lousydeal --path <worktree>   clean: 1 repositories audited
tooling/universe sync-baseline --dry-run --path ...  nothing to do; every
                                                     generated artifact is current
bash scripts/validate                                validate: clean
28 checkboxes recomputed                             no drift
```

Two files, both generated: the managed section of `AGENTS.md`, and
`.habit-hooks/config.toml`.

**The review's central check was byte-identity**, and it was established twice
from a clean `git archive` of the base tree rather than from the worktree — once
as a fixed point (the generator reports nothing to do against the staged files)
and once by regenerating from pristine and diffing. No hand-edit, nothing stale,
nothing smuggled into a file whose next reader will assume the generator vouched
for it.

**Three Major findings, all in the record rather than the artifact, all the
orchestrator's.**

`AGENTS.md` still carried prose written at T1b saying the catalogue "still
records `languages: [shell]` and `npm_project: false`". T2a merged, so it was
false — in the file this row commits, whose subject is that the catalogue now
says `typescript`. `AGENTS.md` is the agent contract: a later subagent reads it,
believes the catalogue is behind, and may redo T2. This is Q1's failure recurring
one row after Q1 was answered, which is the point worth keeping: the answer to Q1
put the file in a row's `Files` list, and that fixed the instance, not the class.

The ledger marked T2a `done` with `evidence-ref: journal, T2a` while no such
entry existed. The ledger's own preamble says a row without one is not done,
whatever it claims.

`open-questions.md` reported the sensor measurement as markers going "0 to 2".
Measured: the `incomplete-run` marker goes absent to present carrying 3 failing
sensors, and total markers go 1 to 2. Wrong under either reading, in the file a
later row is told to consult when it sees that output.

**`status.md` was stale on five counts**, including describing effect gate E0 as
outstanding when the ledger records it executed and the live ruleset requires
five contexts. PR #14 merged without moving it. The closing commit moves it, as
T1a's and T1b's did.

**Q4 opened, and it is the third occurrence of one trap.** `README.md` carries
the same falsified claim as `AGENTS.md` did. It is in no open row's `Files`
list — Q1's answer put it in T1b's, and T1b has closed — so no row has the
authority to correct it.

---

## 2026-08-29 — T2b, making the dependency refusal actually refuse

Worktree `~/app/.worktrees/lousydeal/t2b-refusal` from `origin/main` at
`0223574`.

**The row's own subject was correct first time and I could not break it.** The
refusal now keys on `[ -x node_modules/.bin/<tool> ]` with no `PATH` walk. With
`node_modules` moved aside and global `markdownlint-cli2` and `eslint` present,
it refuses at exit 2, names `npm ci`, and never reaches ESLint.

The implementer proved the pinned binaries win by **substitution rather than by
version**, which mattered: the global `markdownlint-cli2` on this machine is also
`0.23.2`, so comparing versions would have proved nothing. It planted executables
of each name at the front of `PATH` that print a marker and fail. None fired.
Reproduced independently.

**Correction to the T1b entry above.** That entry states: *"`node_modules/.bin`
is appended rather than prepended to `PATH`, so no dependency shipping a `bin`
named `gitleaks` can displace the secret scan."* **That claim was never true**,
and the journal is a dated record, so it is corrected here rather than rewritten
there.

Appending makes the system copy win **only when a system copy exists**. When one
does not, `command -v gitleaks` finds a dependency's same-named bin, the
missing-tool loop reports the secret scanner present, and the `==> secrets` step
silently runs something else — in a repository whose first global constraint is
never to commit a secret. Demonstrated both ways:

```text
with the append      missing required tools: lychee markdownlint-cli2 eslint …
                     gitleaks absent from the list; a dependency's bin satisfied it
without the append   missing required tools: lychee gitleaks markdownlint-cli2 …
                     correctly refuses
```

The line had also lost its last consumer, so it was deleted. Verified against the
fixed script: a fake dependency `gitleaks` with no system copy now produces
`missing required tools: gitleaks`.

**The premise came from the orchestrator, not the implementer.** The task brief
stated the append was a protection and said "do not reverse it", so the
implementer correctly engineered around a hole while believing it was a
safeguard. A confidently-worded constraint in a brief is reviewed by nobody
unless a reviewer re-derives it from scratch. This one surfaced only because the
reviewer asked what each check keys on and what else could satisfy it, rather
than checking the diff against the brief.

**Both review passes found Majors, and all four were the orchestrator's**, none
in the row's own logic: the stale facts table shipped in the commit adding the
constraint against exactly that; a comment that contradicted itself after the
`PATH` line was deleted; and `open-questions.md` still saying Q4 had no owner
while `status.md` said it was answered.

**Q4 answered by a rule.** Global constraint 9. Three documents had been left
stating the opposite of the truth because the row that falsified them had no
authority to touch them. Patching each instance had not stopped the next.

---

## 2026-08-29 — T3a, the backend's environment reader

Worktree `~/app/.worktrees/lousydeal/t3a-env` from `origin/main` at `6e0203f`.
**The first application code in the build.**

**The dormant glob fired.** From the repository root — the way `scripts/validate`
and CI invoke it — the backend suite runs:

```text
✓ |backend| tests/runtime-config.test.ts › requireEnv › returns the value trimmed
  Test Files  1 passed (1)   Tests  9 passed (9)
```

That `|backend|` prefix is T1a's most contested finding finally exercised. A
Blocking severity, two fix attempts and three review passes went into a projects
glob that had never matched anything until this row.

**The Major, and why it matters more than anything else found so far.**
`backend/tsconfig.json` sets `noEmit: true`. Medusa's compiler spreads
`tsConfig.options` into `createProgram` without overriding it, and guards only on
`emitResult.emitSkipped`. Verified at the source and reproduced:

```text
noEmit=true   emitSkipped=false   filesWritten=0
noEmit=false  emitSkipped=false   filesWritten=1
```

So `medusa build` writes nothing, the guard does not fire, the build logs
success and exits 0, and the Dockerfile copies an empty `.medusa/server`. **A
green CI run, a published image, an immutable digest, and a container that
cannot start.** It would have surfaced at T11 or in the cluster, eight rows
downstream of where it was written. T17 exists to catch that class after the
fact; this caught it before.

Two consequences followed: `medusa-config.ts` sits at the workspace root and
matches neither `include` glob, so T6's file could never have been compiled; and
`module: ESNext` with `moduleResolution: Bundler` targets a bundler while
`backend/package.json` declares no `type` and is therefore CommonJS.

Assigned to T3b by the operator — it shares T3's `Files` list and is the last row
that may touch the file. The same authority problem applied to
`backend/package.json`, so T6 and T11 gained the files they need.

**Five instances of one trap.** A file frozen by an early row that a later row
needs. Constraint 9 closed the document half at T2b; this is the configuration
half, answered the same way — put the file in the `Files` list of every row that
needs it.

**A pattern in the minors worth keeping.** Three of five were comments asserting
something the code does not do. `optionalEnv` claimed a caller could tell "not
set" from "set to empty" while collapsing both to `undefined`; the module header
claimed to read `process.env`, which it never does; and the same false claim then
survived in the test file after being struck from the header. Correct behaviour,
wrong justification, every time — invisible unless the claim is checked against
the implementation.

**Mutation testing did the real work on the suite.** Pass 1 found two mutants
surviving all seven tests: deleting `this.name = "ConfigError"`, and dropping
`${name}` from the refusal message. Pass 2 then found that the assertion added to
kill the second one did not: it proved the message contained `STRIPE_SECRET_KEY`,
not that it named the variable asked for, so hardcoding that string passed nine
of nine. Fixed by asserting two different names, and verified the hardcoded
mutant now dies.

---

## 2026-08-30 — plan audit, before T3b

Six times the same defect had bitten: a file created by an early row that no
later row is authorised to touch. It cost two new rows, three file-list
amendments, and one Major that would have published an image that cannot start.
The seventh was already visible in T3b's setup, so rather than discover the
eighth at T4 and the ninth at T6, a top-tier audit read every remaining row
against what its checkbox text actually requires.

**It found roughly twenty gaps and two problems that were not gaps at all.**

**T4 would have stopped on its first command.** Its verification runs *Medusa's
own resolver* against the produced object, and the backend manifest declares zero
dependencies — Medusa arrives at T6. There was no way to satisfy that checkbox
from inside T4; hand-copying the resolver defeats its purpose, which is that
Medusa's resolver and the runtime path must agree.

**T14's second checkbox could not go green, and would have broken a gate.** It
confirms a Secret exists in a namespace; namespaces are created at T15, which ran
after. Worse, the moment a `lousydeal` entry joined the projection contract
without a namespace, `orange`'s static coverage test would go red and stay red —
which is not hypothetical: on 2026-08-17 that exact condition made `kubectl diff`
exit 2 and failed the whole argocd role for every consumer at once. Split, as T2
was: T14 registers and creates the namespaces, T15 starts the workloads, T15b
seeds and confirms.

**T12 would have promoted into a path that does not exist.** `Release` writes
both digests into `deploys/lousydeal/overlays/live/kustomization.yaml` on the
merge that introduces it, and T13 creates that file. T13 now runs first — on a
merge the operator approves as a deployment, a promotion that silently does
nothing is the failure class this build has already met twice.

**A frozen gate nobody had noticed.** `scripts/validate` and the validate
workflow hardcode `shellcheck scripts/validate .githooks/pre-commit`. T12 adds
one shell file and T17 another; neither would be linted by anything, in files
frozen since T1 and T2b. T12 now derives the set from `git ls-files`, as the
reference and the `deploys` repository already do.

**What no rule would have caught.** The audit was asked whether a tenth global
constraint could prevent the remaining instances, and answered honestly: partly.
Two clauses are mechanical — a row that adds a dependency carries the manifest
and the lockfile; a row that adds an executable carries the *list* that makes it
run. Those would have caught most of the table. But the `runtime.ts` class is not
a list problem. "This row produces configuration, and configuration is assembled
somewhere" is a design fact, and no constraint about `Files` lists finds it. The
answer was a sentence in the plan naming the single assembler, which is now in
T3's section beside the paragraph doing the same job for the tsconfig.

**One slip of my own, caught by the hash check.** Removing T14's second checkbox
left the first with no blank line before the paragraph that followed, so the
hash absorbed the paragraph and T14a showed drift. Restored the blank line; all
28 rows then recomputed with no drift. The check earned its keep on a formatting
mistake rather than a textual one.

---

## 2026-08-30 — T3b, the configuration assembler, and the frozen tsconfig

Worktree `~/app/.worktrees/lousydeal/t3b-runtime` from `origin/main` at
`ef9a42a`.

**The `noEmit` defect is fixed, proved against Medusa's real compiler** rather
than against `tsc` — which is the point, because `tsc --noEmit` did exactly what
the broken config asked and so every gate stayed green:

```text
BEFORE (origin/main)  noEmit=true   emitSkipped=false  filesWritten=0  []
AFTER  (this row)     noEmit=false  emitSkipped=false  filesWritten=2
                      [src/config/env.js, src/config/runtime.js]
```

**The defect was worse than described.** `Compiler.buildAppBackend` copies
`package.json` into the output directory unconditionally, after the
`emitSkipped` guard. So the broken build did not leave an empty
`.medusa/server` — it left a directory containing one file and no compiled code.
Anyone checking "did the build produce output?" would have said yes. Found by the
implementer, unprompted, and confirmed twice.

**Three more freezing defects, found inside the repair for a freezing defect.**
`backend/tsconfig.json`, `backend/tsconfig.test.json` and
`backend/vitest.config.mts` are each in T3's `Files` list and no other.

- The unit suite's `include` would have collected T17's smoke tests, which
  refuse without a live Medusa, PostgreSQL and Redis — turning `scripts/validate`
  and CI red on every bare checkout from T17 onward, with no row able to fix it.
  T17 could not have repaired it either: `scripts/validate` runs the **root**
  `test:unit`, and the root config loads `./backend/vitest.config.*` as a
  project, so the backend's own script is never invoked.
- `tsconfig.test.json` named `vitest.config.mts` as a literal, so T17's
  `vitest.smoke.config.mts` would have been typechecked by nothing — the exact
  hole this row was sent to close, reopened one file over.
- Three strictness options had been dropped without mandate. Without
  `lib: ["ES2023"]`, the default for that target includes DOM, so `document` and
  `localStorage` compiled clean in a Node-only backend.

**A review's own evidence was wrong, and a fixer caught it.** Pass 1 justified
restoring `isolatedModules` with `import type { X } from "./env"; export { X };`.
That snippet typechecks clean **with the flag on as well as off**, so it
demonstrated nothing — and the orchestrator passed it to the fixer unverified.
The fixer built an isolated project, found the demonstration did not
discriminate, worked out why, and substituted `export { X } from "./env";`, which
yields `TS1205` with the flag and is clean without. Confirmed in a four-cell
matrix.

```text
                      isolatedModules=true   false
import type + export  clean                  clean     <- proves nothing
export { X } from     TS1205                 clean     <- discriminates
```

The conclusion was right and the evidence was not. That is the fifth instance in
this build of a claim nobody checked against the thing it describes — it has now
appeared in comments, in tests, in a task brief, and in a review's own findings.

**Pass 2's freeze analysis is worth keeping.** It checked the frozen configs
against every later row's `Files` list rather than against today: `include`
covers every backend file T4–T17 name; `@types/node` supplies `fetch`, `URL`,
`AbortController` and the rest without the DOM lib, so dropping DOM costs T17
nothing; and `exclude: ["tests"]` in the build config is load-bearing, because
Medusa's own `backendIgnoreFiles` does not contain `tests` — without it the unit
suite would be emitted into `.medusa/server` and shipped inside T11's image.

**What `runtime.ts` requires, and why only two values.** `JWT_SECRET` and
`COOKIE_SECRET`, because `defineConfig` resolves them to a shared placeholder
outside production and to `undefined` inside it — the "defaults instead of
refuses" behaviour the checkbox exists to close. CORS is left to a later row with
the finding recorded: Medusa defaults those too, but unconditionally and in
production as well, which the first version of the comment got wrong.

---

## 2026-08-30 — T4, database URL and SSL resolution

Worktree `~/app/.worktrees/lousydeal/t4-database` from `origin/main` at
`d8eb3b1`. Installs `@medusajs/framework@2.18.0` — the first Medusa dependency,
593 packages.

**The row's empirical finding, confirmed by two reviewers independently.** Medusa
strips the **underscored** spelling before either path reads it:

```text
?ssl_mode=disable   stripped   -> TLS ON
?sslmode=disable    survives   -> TLS off
```

So the spelling Medusa's own source comment uses produces the opposite of what it
reads like. Pinned in an `it.each` that derives "stripped" from Medusa's returned
`clientUrl` rather than from a local copy of the regex — proved by patching
Medusa's own strip in `node_modules` and watching the table go red.

**Three review passes; the row's one guarantee took two attempts to get right,
and both failures were the orchestrator's.**

Pass 1 found that an explicit `DATABASE_URL` was returned unvalidated while `pg`
applies a parsed connection string *over* the explicit `ssl` — so
`DATABASE_SSL_MODE=verify-full` plus `?sslmode=disable` yielded no TLS, and the
suite **pinned that downgrade as expected behaviour**. The fix brief specified a
denylist: refuse `/[?&]sslmode=/i`.

Pass 2 found that denylist circumventable. `pg-connection-string` builds its
config from `new URL(str).searchParams` — **percent-decoded** keys — and acts on
seven of them:

```text
passes   ?ssl%6Dode=disable      verify-full -> no TLS   decodes to sslmode
passes   ?ssl=0                  verify-full -> no TLS
passes   ?sslrootcert=/etc/hosts -> fs.readFileSync at connect
REFUSED  ?SSLMODE=disable        pg ignores it: a false positive
```

**The lesson is exact.** A denylist matched a *key name* against the raw string,
and decoding changes key names. The replacement refuses any *query component*,
and decoding can neither create nor destroy one — the delimiter is by definition
an unencoded `?`. Verified: `…/d%3Fsslmode=disable` parses to
`database="d%3Fsslmode=disable"`, `ssl=undefined`. Same file, same input class,
opposite reliability.

**Pass 3 tried to break it and could not.** Brute force over every BMP code point
in two positions: 0 hits. libpq keyword and socket connection-string forms: no
`ssl` own-property, so nothing to clobber with. 51 mode/URL combinations end to
end through both Medusa builders: 0 disagreements. The five-part path cannot
compose a `?` — host validated, port digits-only, the rest percent-encoded. And
`PGSSLMODE` is closed because the module always states `ssl`, while pg's
environment fallback only fires when it is `undefined`.

**Two disclosures worth keeping.** The implementer edited
`backend/tests/runtime-config.test.ts`, outside its declared list, and said so —
extending the assembler's return shape necessarily breaks a `toEqual` that
enumerates the old one. Accepted, and T4, T5 and T6 now declare that file. And it
recorded that two `pg` copies already coexist upstream, out of scope but not
quietly ignored.

**Size override, approved by the operator:** 900 changed lines against an
800-line gate. ~230 module, ~640 test. Two passes found real defects in this
row's security-relevant behaviour and the third could not; splitting the module
from the tests that prove it would have been worse.

**Seven instances now of a claim nobody checked against the thing it describes.**
This row alone produced four more: a comment saying every component is
percent-encoded next to a raw `${host}`; "regardless of spelling case" in an
operator-facing refusal when pg reads those keys case-sensitively; a test
asserting an exports map has two subpaths when it has 32, three lines below an
import proving otherwise; and a comment claiming an extraction catches "any
change" when it catches one shape of change.

---

## 2026-08-30 — the claim defect, diagnosed

Nine rows had produced **twenty instances** of one thing: text asserting
something untrue of the code it described. Every one was caught by a review;
none by a gate. The operator asked for the systemic cause rather than another
patch, so it was diagnosed with a prediction test — a cause that only explains
the twenty already found is worth less than one that says where the next is.

**The orchestrator's hypothesis was wrong in its strong form.** It proposed that
failing claims are about things the file cannot see. Thirteen of twenty were
external; **seven were internal**, and two of those were contradicted by text on
the same screen. Distance to the truth-maker is a risk multiplier, not the
mechanism.

**The cause is free universals.** Twelve of twenty attach a quantifier — *only,
every, no, never, exactly N, deterministic, regardless of* — to a set nobody
enumerated. The tell is decisive: **not one of the twenty erred by claiming too
little.** That is not carelessness, it is rhetorical inflation. An unbounded
claim reads stronger and costs nothing to write.

The clinching evidence is one comment slot. The reference said *"node-redis emits
every failure as an `error` event."* A reviewer caught it. The replacement said
*"none of [six named modes] actually emit one."* **Both are false** — measured by
deleting the listener and driving the real client: a mid-handshake RST and a
close-after-reply crash the process without it. The same three lines held two
contradictory universals over the same six-element set. The defect was never the
fact; it was that a quantifier was attached to a set nobody counted.

**It is not a tier problem.** Four of the twenty came from orchestrator task
briefs, one from a top-tier review's own evidence forwarded unverified, and one
from the orchestrator's own replacement prose. A remedy scoped to implementers
would miss a fifth of the population.

**The prediction held — six confirmed wrong, all fixed here.**

- The `error`-listener comment called a **load-bearing** line "cheap insurance".
  A future reader would delete it as dead weight and restore the exact failure
  the file exists to prevent.
- A corroborating measurement was attributed to the reference; `git grep` over
  its full history finds no such measurement anywhere.
- `env.ts` claimed trimming, absence and refusal "all live here" — eight
  `ConfigError` throw sites across three files.
- The preflight header claimed it never prints an upstream error message, 160
  lines above a branch that does.
- **The plan itself** still said `env.ts` is "the only module that reads
  `process.env`" — in the document copied verbatim into every context packet.
  The only module under `backend/src/` naming `process.env` is the preflight.
- **T8's brief**, not yet executed, told a future row the reference uses three
  specific hazards. One of three is true. T8 would have gone hunting for two
  that do not exist.

**And the count in this entry was wrong when written.** It said "third
survival". Review pass 3 found a **fourth**, in `runtime.ts` — *"`env.ts` stays
the only module that touches an environment directly"* — two lines above a
paragraph this row edited, in a file this row owns. **This row's own
`redis-preflight.ts` is what falsified it**, and the same claim was corrected in
the plan and rewritten in `env.ts` in the same pass while the copy between them
survived. A Major after three passes, escalated to the operator, who authorised a
fourth. The row that adopted constraint 10 shipped a fresh instance of the exact
sentence the constraint was written for, and the constraint's own review step
caught it.

**The review step needed correcting on first use.** It was specified as a grep of
*added* lines. This defect sits on a **context** line, so `grep '^+'` cannot see
it. Every future dispatch greps the diff **with context** instead. That one word
would have caught this at pass 1.

**Global constraint 10 adopted:** a claim is bounded, cited, or executed,
otherwise it does not go in. It would have caught seventeen of the twenty. The
diagnosis was explicit about the three it misses, that it cannot be gated, and
that "make the claim executable" is right only when the code would be wrong were
the claim false — pinning a fact that changes no decision costs a test that goes
red on every upgrade and buys nothing.

**And the honest part, recorded because it is the larger half.** No rule reads a
claim; only a reader does. All twenty were found by fresh-context reviewers who
re-derived rather than diffed. The added review step is a grep of the diff for
the quantifier words — twelve of the twenty lived inside that set. A checklist
item, not a gate, and better called one.

**The step was re-scoped after two uses, on measurement rather than taste.** Run
raw it produced 136 hits on a 1,100-line diff, of which roughly 86 carried no
claim at all — `Promise.all`, `Promise<never>`, `no scheme, port or credentials`
inside an error string. Reported that way it buries three findings under 120
lines of noise, which is how a checklist item becomes ritual.

The distribution is sharp and points the same way in both directions. **Every
finding, including the pass-3 Major, came from a quantifier ranging over a set of
modules, files or code paths that the reader cannot see from where they stand** —
*"the only module naming `process.env`"*, *"Every assertion below"*, *"Both RESP
codes a real Redis uses"*. **Not one came from a word negating a concrete
adjacent thing** — *"no `url` field"*, *"never quotes the rejected value"* — because
those are pinned by an assertion within a few lines, which is constraint 10's
*executed* limb already working.

So the step is: grep with context, then check only the hits whose quantifier
ranges over a set not enumerated on screen, and skip any hit within about five
lines of an `expect`. That takes 136 to roughly 15 and would have lost nothing
found so far.

**Two of the orchestrator's own numbers in this entry were wrong** and are
corrected above: the grep figure was quoted from the diagnosis rather than
measured here, and the row's size was reported to the operator as though the
journal drove it past the gate. It did not — 923 of the 1,100 lines are backend
code and tests, and this entry is 89 lines, about 8%. Stripping every word of
process documentation would still leave the row a quarter over the bound. The
override was earned by the preflight and its suite.

**One correction the mechanism caught.** Fixing the plan's `env.ts` sentence
meant editing a checkbox, which re-keyed **T3a — a closed row** — and the hash
check said so. The checkbox text is the ledger's identity, so the words were
restored and the correction moved into prose beside them. The rule that a
completed row is not silently re-keyed did its job on the orchestrator.

---

## 2026-08-30 — T5b, and what four rounds of correction taught

Worktree `~/app/.worktrees/lousydeal/t5b-modules` from `origin/main` at
`4faba0d`. Installs `@medusajs/medusa@2.18.0`.

**The row's own work was right from the first pass and stayed right.** Three
option shapes reaching the built connection, all four `resolve` strings
discriminating, all three in-family swaps red, the password in no URL,
`runtime.ts` fail-closed, 84 tests. Verified independently at every pass.

**One real gap, found at pass 1.** The suite never executed `resolve` — the
field Medusa actually keys on. A mistyped string left the tests green, because
they imported by hardcoded package name. The silent case is worse than a typo:

```text
@medusajs/medusa/locking        -> locking
@medusajs/medusa/locking-redis  -> locking     same key
@medusajs/event-bus-redis       -> undefined   bare name, throws loudly
```

Two valid strings key onto the same value, so pointing a wiring at the wrong one
is accepted with no error and leaves the intended module on its in-memory
default. `resolve` is a string literal with no logic in it, which is why nobody
had written a test for it, and why it was the only part that could fail
silently.

**Then five Majors in a row, none of them in the code.**

| pass | Majors | where they came from |
| --- | --- | --- |
| 1 | 2 | one real gap, one false claim |
| 2 | 2 | **both written by pass 1's fix** |
| 3 | 2 | one written by pass 2's fix, one untouched since pass 1 |
| confirming | 1 | a clause the deletion pass exempted |

**Every false claim after the first was introduced while correcting another
false claim.** Three generations of the same defect in the same paragraph.
Constraint 10 shapes how a claim is written; it does not read the claim someone
writes while removing a different one, and correcting a claim requires writing
one.

**So the operator ruled deletion rather than a fourth rewrite**, applying
constraint 10's own last line — *a claim fitting none of the three is deleted;
the code is not worse without the sentence.* 26 net lines of prose went. Every
deleted passage narrated **which mechanism catches which failure**. Those were
wrong at every pass, and the tests demonstrate the behaviour without them: mutate
a line, run the suite, read what goes red. That is more reliable than any
sentence, and it is what four reviewers actually did.

**What survived is the distinction worth keeping.** A claim about a dependency is
cheap to falsify — open the cited file, run the grep. A claim about what your own
tests catch is expensive — it needs four mutation results reconstructed, which is
why nobody checks it and why those sentences were wrong every single time. The
citations survived four passes untouched. The coverage narration did not survive
one.

**The confirming pass found the exemption was one clause too generous.** The
deleted prose had spared a sentence saying a credential-less connection's failure
is "logged, not thrown". Measured against a `-NOAUTH` server: only
`locking-redis` logs anything. `event-bus-redis` sets `enableReadyCheck: false`,
issues no command at connect, and reports *"Connection to Redis … established"*
with `password=null`; `workflow-engine-redis` logs *established* twice while the
connection is `reconnecting`. **Two of three announce a connection they do not
have** — worse than the sentence claimed, and exactly this row's subject. Deleted
rather than restated.

**And one of the orchestrator's own checks was theatre.** Verifying the deletion,
a mutation was run to confirm the suite still catches a dropped `redisOptions`.
It reported 84 passing and was recorded as evidence. The pattern had not matched
— the wirings are functions with multi-line options — so nothing was mutated and
the green result meant nothing. Re-run correctly it goes red at
`expected null to be 'redis-modules-fixture-password-…'`. A check that appears to
run and does not, committed while verifying a fix for that exact class.

## 2026-08-30 — T6a, the configuration Medusa loads

`backend/medusa-config.ts`, `backend/tests/medusa-config.test.ts`,
`backend/src/config/runtime.ts`, `backend/tests/runtime-config.test.ts`.
313 lines, 4 files. `bash scripts/validate` clean at 89 tests.

Everything T3 through T5 built becomes one configuration: the environment
reader, the fail-closed assembler, the database URL and its TLS mode, and the
three Redis wirings imported from `redis.ts` rather than restated. The assembler
gains Stripe's API key and webhook secret.

**The `noEmit` loop closed, five rows after it opened.** T3b rewrote
`backend/tsconfig.json` because the original set `noEmit: true`, which makes
`medusa build` write zero files while logging success and exiting 0 — an image
that publishes, carries a digest, and cannot start. That fix was verified
against synthetic inputs, because `medusa-config.ts` did not exist yet, and the
file is named in that config's `include`. Driving `ts.createProgram`/`.emit()`
with it now: `medusa-config.ts` in `fileNames`, 0 diagnostics,
`emitSkipped: false`, `medusa-config.js` present in the output.

One correction: T3b's fix was to **delete** `noEmit`, not to set it `false`. The
implementer reported it as `false`; it resolves `undefined`. Same emit, wrong
description of the file.

**Two mutations passed the entire suite.** The row's verification was written as
the plan asks — load the config, assert the module list — and it discriminated
on everything it named: the Stripe `resolve`, `id`, both option values and their
ordering, each of the three Redis slots including a dropped and a mis-keyed one.
It missed two things, both of which its own test name asserted.

| mutation | result |
| --- | --- |
| register a **fourth** module, `cache-redis` → unauthenticated `redis://somewhere-else:6379` | **all 88 green** |
| hardcode the Stripe `apiKey` as a literal, ignore the environment | **all 88 green** |
| hardcode the Redis parts | green |
| drop `databaseDriverOptions` entirely — **removes SSL** | **all 88 green** |
| wrong `databaseUrl` literal | green |
| re-derive a Redis wiring inline, never call `redis.ts` | **all 88 green** |

The refusal tests do not close the second group. They prove a variable is
*required*, not that it is *used* — a literal written in place of a runtime read
passes every one of them.

**Asserting the module list cannot notice a module being added.** `defineConfig`
merges Medusa's defaults, so `Object.keys(config.modules)` is 27 entries, and
`cache` is already one of them with the value
`{"resolve":"@medusajs/medusa/cache-inmemory"}`. Comparing key *names* against a
written-down list catches nothing, because the name is usually already there.
The set is now a diff against a baseline `defineConfig` produces from the same
`projectConfig` — the baseline comes from Medusa, so it does not go stale when
Medusa's defaults change.

**And nothing proved a value came from the environment.** The config is now
loaded twice, under environments sharing no value, which a literal cannot
survive. `projectConfig` is asserted in both — nothing else in the repository
checks that `databaseUrl` and `databaseDriverOptions` reach Medusa at all, and
C3 is fed by T4 and T6 only. T6 is the one row that declares this file; after
T6b nobody owns it.

**`REVERSED_MODULE_PACKAGE_NAMES` does not apply to providers.** T5b established
that Medusa keys *modules* on the exact `resolve` string through that table, and
this row assumed the same held inside `options.providers`. It does not:
`node_modules/@medusajs/modules-sdk/dist/loaders/module-provider-loader.js:15-27`
requires the string plainly, no table lookup. Measured — neither
`@medusajs/payment-stripe` nor `@medusajs/medusa/payment-stripe` is a key in it.

The `resolve` still changed, for a different reason. `@medusajs/payment-stripe`
is a package this repository never declares; it resolves only because npm hoists
it out of `@medusajs/medusa`'s tree, and `redis.ts:25-33` argues the subpath
convention at length for the three modules sitting in the same array. The
subpath is a thin `__exportStar` re-export and derives the identical provider
id, so this is about a declared dependency, not about correctness of keying.

**A fact T6b needs.** Registering `@medusajs/payment-stripe` with `id: "stripe"`
registers **eight** provider services, not one, and
`node_modules/@medusajs/payment/dist/loaders/providers.js:81-95` upserts all
eight as `is_enabled: true`: `pp_stripe_stripe` plus bancontact, blik, giropay,
ideal, przelewy24, promptpay and oxxo. The storefront will see eight Stripe
providers on a region. T6b's derived provider id is `pp_stripe_stripe`, and the
other seven need a decision.

**The prose, again — six false sentences, five deleted.** One claimed the
`toEqual` against `redis.ts`'s wiring functions *proves* the modules come from
`redis.ts`; `toEqual` is structural, and re-deriving them inline passed all 88.
One asserted what a future row would do, sourced to no document. One narrated
which line of `runtime.ts` the Stripe fields sit at, and was wrong for two of
the three things it could mean.

That last one got the class fix rather than the sentence fix. `runtime.ts`'s
header carried a per-row changelog — *"This row adds the database URL and SSL
resolution"* — in a file **three rows have edited**, and it had been stale or
wrong at each. Correcting the sentence would have invited a fourth. The
changelog is gone; the header keeps what it says about the file and the
`JWT_SECRET`/`COOKIE_SECRET` silent-default trade-off, which is a real
constraint with a real citation.

**One thing the fix brief got wrong.** It predicted `typeof
import("../medusa-config")["default"]` resolves to `any`, because
`medusa-config.ts` sits outside `tsconfig.test.json`'s `include` (T3a). It does
not — tsc follows the import regardless of `include`, and under
`moduleResolution: Node16` with the backend emitting CommonJS it types
`.default` as the module namespace rather than the value. Annotating the return
`ConfigModule` failed outright. Vitest transforms the file to ESM, where
`.default` is that value, so tsc and Vitest genuinely disagree about this import
and the cast records why. The accesses are checked either way, which was the
point.

## 2026-08-30 — T6b, the Stripe provider, and a constant that should not have existed

`backend/src/config/payment.ts`, `backend/tests/payment-provider-config.test.ts`,
plus `medusa-config.ts`, `runtime.ts` and two tests. 269 lines, 6 files.
`bash scripts/validate` clean at 105 tests.

The provider id is composed the way `@medusajs/payment/dist/loaders/providers.js:45`
composes it, from two named constants, and the test composes it the same way —
reading `identifier` off the installed package rather than typing the answer on
both sides. `STRIPE_PROVIDER_IDENTIFIER → "not-stripe"` goes red.

**The citations were clean, and that is new.** Twelve citations into
`node_modules`, each opened individually by the reviewer, all twelve pointing at
real files saying what they were quoted as saying. One line number was off by
one. Every previous row's Majors included at least one citation to a file that
did not contain the claim. **Every defect this time was in an *uncited*
sentence** — which is the first evidence that constraint 10's *cited* limb is
doing work rather than being obeyed decoratively.

**`STRIPE_WEBHOOK_PATH` was in the brief and should not have been.** The
orchestrator asked for it. Three independent grounds killed it:

- Its central claim was unexecuted. The test sliced off a hardcoded
  `"/hooks/payment/".length` and asserted only the tail, so changing the prefix
  to `/hooks/paymnet/` — same length — passed **all 99 tests and both
  typechecks**.
- Nothing imports it. `grep -rn "webhook" docs/working/ld-01-foundation.md`
  returns one hit: constraint 1, "no webhook signing secret". No row in LD-01
  creates a webhook route, so the "later row" its JSDoc deferred to does not
  exist.
- It was a third deliverable in a row whose text asks for two.

Seventeen lines of prose and two correct citations went with it.

**Four false sentences, all in one JSDoc block, all explaining why something is
*not* there.** That is the pattern worth recording: prose doing the job of a
test or of a decision record.

| the sentence | why it was false |
| --- | --- |
| the subpath relies on "the same hoisting `redis.ts` relies on" | it resolves through a **declared** dependency's `exports` map; hoisting is what T6a switched *away* from, and `redis.ts:25-33` says so four lines from the claim |
| a PaymentIntent here "has neither `payment_method_types` nor `automatic_payment_methods` set" | the function four lines below registers `automaticPaymentMethods: true` |
| the pinned `Stripe-Version` "turns Automatic Payment Methods on by default" | the file concedes the truth-maker is a changelog, and cites none |
| "the customer-facing gate is a later row's Region link" | no row does that, and **Q7 records it as the operator's decision** |

The last is the sharpest: a comment asserting as settled what a tracked document
records as open. Constraint 9 covers a row falsifying a document; this was a row
**contradicting** one.

**Three gaps in the verification, each found by mutation.**

`paymentMethodConfiguration` could be dropped from the registered options and
`medusa-config.test.ts` stayed fully green — vitest's `toEqual` treats an
expected `undefined` as satisfied by an **absent** property, and neither
synthetic environment set the variable at all. So the one value this row added
was the one value the two-environment technique was never applied to. Both
environments now carry distinct `pmc_…` values.

The test imported `@medusajs/payment-stripe` **by bare name** — a package
declared in no `package.json` here, resolving only by hoisting. That is exactly
what T6a changed the production `resolve` to escape, reintroduced in the test of
the row that inherited the fix. It now reads the eight registered services
through the declared `@medusajs/medusa` subpath, which is both correct and a
stronger assertion.

And the no-literal-key guard scanned **two hardcoded paths**. A Stripe-shaped
`sk_live_…` literal in `backend/src/config/env.ts` passed all 99 tests *and*
`gitleaks dir --redact .` reported `no leaks found` on the same tree — no second
line of defence. The guard now globs `src/config/*.ts` plus `medusa-config.ts`,
so a file added to that directory is covered the day it lands. Verified
independently: planting the literal goes red, `env.ts` restored clean.

**Q7 answered, and most of it is not this repository's business.** Card, Google
Pay, Apple Pay, Link and PayPal — the operator's chosen set. Google Pay, Apple
Pay and Link are not Medusa providers at all; they are wallets on the card
intent, surfaced by Stripe's Payment Element, and Medusa needs no configuration
for any of them. What the code had to get right was to *not* pin
`payment_method_types`, which it does not: `stripe-provider.js:12`'s
`paymentIntentOptions` returns `{}` and only the seven country sub-providers pin
theirs. The rest is Dashboard work: enable the five, disable the seven, and
register `test.lousydeal.com` as a payment method domain, without which none of
the four wallets renders.

Two things the operator still owns: PayPal requires the Stripe account be in
Europe, Switzerland or the UK, and nothing in this repository records the account
country; and domain validation may collide with Cloudflare Access at T16.

## 2026-08-30 — T7a, the three tiers, and a ruling that did not hold by itself

`backend/src/commerce/product-model.ts`, `backend/tests/commerce-product-seed.test.ts`,
`docs/decisions/007-usd-and-tax-inclusive-pricing.md`, one line of the plan.
296 lines, 4 files. `bash scripts/validate` clean at 115 tests.

Three tiers, USD minor units, `manageInventory: false`. Enterprise is named in
`concept.md` and deferred there, so it is not declared. No tier copy leaked —
the plan says the names are structural and the words belong to a later gate.

**Two operator decisions had no truth-maker.** The currency and the reading of
the amount were both settled on 2026-08-30, cited in a comment as *"the operator
ruled USD, 2026-08-30"*, and **recorded nowhere in this repository**.
`docs/decisions/` held 001–006 and none was about currency; `concept.md` writes
`$` and names no code. Constraint 10's *cited* limb asks for a truth-maker
precise enough to open, and there was none — the comment cited a conversation.

Record `007` now holds both, and the model points at it.

**The record carries a finding the ruling does not buy on its own.**
Tax-inclusiveness is **not a property of an amount** in Medusa. It is a stored
row: `@medusajs/pricing/dist/models/price-preference.js:9` defines
`is_tax_inclusive` with `.default(false)`, and
`pricing-module.js:237` resolves a calculated price's flag from that row and
nowhere else. A price written without a preference is a price Medusa reads as
**tax-exclusive, whatever the operator ruled.** And a Region arrives with
`automatic_taxes` on — `@medusajs/region/dist/models/region.js:12`,
`.default(true)`.

So `$5` is what the customer pays today for a narrower reason than the ruling:
no tax rate exists, so exclusive and inclusive come to the same number. **T7b
must write the preference** — `attribute: "currency_code"`, `value: "usd"`,
`is_tax_inclusive: true` — or the ruling is recorded in `docs/` and contradicted
by the database.

**The guard was real; the test guarding the guard was not.** "No price literal
exists elsewhere" is trivially satisfiable by a test that scans nothing, so it
got eleven plants in review: each of the three amounts in three different files,
one beside the model in `src/commerce/`, one in a new subdirectory, one in a
file with the model's own basename. **Every plant that should have gone red
did**, and the coverage assertion fails correctly when a scanned file moves.

But the assertion named *"excludes exactly that path"* could not fail for that
property. Mutating the exclusion from `path !== excludedFile` to
`!path.endsWith("product-model.ts")` left the suite at 10/10 — and under that
weakening a planted `backend/src/config/product-model.ts` carrying `2500` was
**silently exempt**. There is no same-basename file on disk to assert about, so
the exclusion is now a named predicate the test interrogates directly with a
path that does not exist. The mutation goes red.

**Three deletions, all the same species.** A free universal — *"no VAT, tax
region or tax rate is configured against it anywhere in this codebase"* —
executed by nothing, true only vacuously, and falsifiable by **both** successor
rows. A media justification (*"an empty value would clear media an operator
uploaded in the Admin"*) that is true of Medusa and belongs to a **seed script
this row does not have**; it moves to T7b. And a contrast with Plepic that was
false for one of its three items: Plepic declares no thumbnail or image key
either, so the real contrast is packaging and customs.

**One inert construct.** `as const` on the tier array bought nothing — the
`readonly ProductTierModel[]` annotation widens it away. Proved by running the
same `tsc` probe with and without it and getting byte-identical output, which is
the step that separates *not load-bearing* from *inert*. The literal `false` on
`manageInventory` is the opposite and stays: `true` is a compile error, which is
a genuine improvement on the reference's `boolean`.

**A trap recorded for T9.** The scan covers `backend/src/**` only. T8 lands the
storefront and T9 renders these three prices — outside the scanned root, and the
likeliest place for `$5` to be typed a second time.

## 2026-08-30 — T7b, the seed, and a test that could not fail

`tax-model.ts`, `seed-product.ts`, `configure-commerce.ts`, two tests,
decision `008`, and corrections to `007`, `plepic-reuse.md` and the plan.
**995 lines, 11 files** — over both of constraint 3's thresholds; the operator
granted a size override at 913/9 before the fix pass, and the fix added two
falsified documents and the supersession. `bash scripts/validate` clean at
**129 tests**.

**The row's shape is the reason its test is a test.** A pure records function, a
one-method target interface, an apply loop, and the Medusa implementation behind
the interface. Without that seam, "run twice against a stubbed Medusa" means
mocking a container and asserting call counts.

**Twenty mutations were run in review.** Seventeen went red, including every one
that matters commercially: the rate, the inclusivity flag, `automatic_taxes`, a
duplicate region, a rest-of-world region, a dropped tier, and a target that
silently ignores every write.

**Three did not, and the first is the one worth remembering.**

| mutation | before |
| --- | --- |
| delete `"MT"` from `EU_MEMBER_STATE_CODES` | **all 21 green** |
| reverse `commerceRecords()` | **all 21 green** |
| send the price in minor units instead of major | green — no test exercises the Medusa target |

The member-state one is the sharpest failure of a test this build has produced.
`tax-model.ts` claimed *"the 27 EU member states"*, and the test asserted
`toHaveLength(EU_MEMBER_STATE_CODES.length)` — **the list's length against its
own length.** Both sides move together, so a silent deletion ships a country
whose buyers are charged no VAT, with the suite green. **The reference does not
have this hole**: Plepic holds its list against an independent second one and
tests both directions. The port kept the claim and dropped the second list. Now
held against 27 literal codes.

The order one is the same species: `commerceRecords()` declares records in
dependency order, both scripts said *"in order"* in a one-liner, and reversing
the array changed nothing. Asserted now; the one-liners are gone, since they
also narrated the three-line loop beneath them.

**Four sentences, one fact, three disagreements.** `configure-commerce.ts` said
in three places that Medusa's migration creates the default sales channel;
`seed-product.ts` said `configure:commerce` does. All four false.
`db:migrate` calls `initializeContainer` and nothing else
(`@medusajs/medusa/dist/commands/db/migrate.js:119`); `createDefaultsWorkflow`
runs in the loaders (`loaders/index.js:134-135`), and `medusa exec` runs the
same loaders (`commands/exec.js:67`) — so **`configure:commerce`'s own boot
creates it.** Said once now.

**Two documents this row falsified.** `plepic-reuse.md` said the tax treatment
*"must not be inherited by copying a file"* — in a bullet **and** in a one-line
summary table, so correcting only the bullet would have left the table asserting
the opposite. Both corrected, and the file added to T7's `Files` list under
constraint 9. `007`'s status and heading now record the partial supersession:
its tax ruling falls to `008`, its USD ruling stands.

**And three claims about a row that does not exist.** `tax-model.ts`,
`seed-product.ts` and `008` each justified something by *"a later shipping
row"*. `grep -i shipping` across the plan and the status document returns
nothing. Deleted — the third time this build has shipped a justification resting
on a future row and removed it.

**Decision `008` was the highest-risk artefact here**, and the risk was the
orchestrator's making: its content was corrected three times *while it was being
written*, and one correction deleted a claim an earlier one had asked to keep.
The residue was exactly what that predicts — a sentence asserting **this
supplier distance-sells goods**, which is a two-shops phrasing re-pointed at one
shop. Aislopica OÜ sells electronically supplied services and this row builds no
fulfillment. Corrected, and the record now attributes its reading of the VAT
Directive to the operator rather than stating it as law.

**What held.** Every `node_modules` citation in 913 lines was opened and
verified in review — a long list, all accurate. The country-code case was
established from `region-module.js` and `tax-module-service.js` rather than
copied from Plepic's `.toUpperCase()`, which Medusa would have normalised away.
And writing *"HTTP 500"* in a comment trips T7a's bare-price-literal guard; the
comment was reworded rather than the test weakened.

## 2026-08-30 — T7c, the binding, and the first row with no Majors

`backend/src/scripts/configure-commerce.ts`, `backend/tests/commerce-configuration.test.ts`.
**43 lines, 2 files** — the smallest row in the build. `bash scripts/validate`
clean at **130 tests**. T7 closes with it.

**Review returned no Major findings.** The first row in fifteen to manage that.
Four Minors, all corrections rather than deletions, and every citation in the
diff opened at exactly the lines quoted.

**What the row closes.** Registering the payment module offers it to nobody:
`@medusajs/medusa/dist/api/store/payment-providers/route.js:7-15` requires a
`region_id` and filters on it. Until a region carries the provider,
`/store/payment-providers` returns nothing.

**Why a field and not a step.**
`set-regions-payment-providers.js:51-53` filters its input with
`isDefined(payment_providers)`, so an input without the key is **skipped, not
cleared** — a missing binding is silent at the Medusa layer. That is why the
plan's checkbox specified a field on the region record, and why the mutation
that matters most is omitting it.

**The provider validation question, settled by measurement.**
`validatePaymentProvidersExists` calls
`listPaymentProviders({ id: { $in: ids }, is_enabled: true })` and throws
`NOT_FOUND` before any link is created, on both the create and update paths. So
a typo'd provider id fails loudly at `predeploy` rather than surfacing when a
customer tries to pay. Good news for T9.

**Two corrections, both about naming the right mechanism.**

The header credited the enabled-provider requirement to the boot that *"registers
the Stripe module"*. `is_enabled: true` is a **database row**, not a container
registration — module registration alone would not satisfy it. What does is
`registerProvidersInDb` upserting every registered provider
(`@medusajs/payment/dist/loaders/providers.js:81-95`), reached through
`loaders/index.js:121`, which `medusa exec` runs at `commands/exec.js:67` before
invoking the default export at `:76`. **The claim was true and its stated reason
was not**, which is the species this build keeps producing — and the same file
had cited the analogous ordering claim properly three paragraphs earlier, so it
fell below a standard it set itself.

The field's doc said *"a record that omits this field is skipped, not cleared"*.
The field is **required**, so no `CommerceRecord` can omit it — removing it is a
compile error. True of the step's input, unreachable for a record. Scoped.

**One behaviour recorded rather than fixed.** Sending the key on every run is
what makes the binding exact: the same step **dismisses** any other provider
linked to this region (`:69-83`) and skips links that already exist (`:87-93`).
So a provider added to this region in the Admin does not survive the next
`predeploy`. That is what "exactly that provider id" means, and it is the same
species as the region-name hazard T7b carried — an Admin edit the seed reverts.

**And one construct removed for buying nothing.** The test cast its filtered
record with `as Extract<CommerceRecord, { kind: "region" }>`. TypeScript already
narrows on `record.kind === "region"`, and a sibling test relies on that without
a cast. A cast in a test is the construct most able to mask later drift; this
one masked nothing yet and is gone.

**Untested surface, disclosed not discovered.** Deleting `payment_providers`
from either workflow call site leaves all 130 tests and both typechecks green.
`MedusaCommerceConfigurationTarget` is exercised by nothing, and its header says
so. Misspelling the key at either site *is* caught — by `tsc`, not by a test.

## 2026-08-31 — T8a, the storefront seam, and two Majors the orchestrator wrote

`storefront/` (8 files), `.markdownlint-cli2.jsonc`, `README.md`, `AGENTS.md`,
the plan's T8 `Files` block. **385 lines excluding the lockfile, 12 files** —
the operator's override was granted at 11; the twelfth is the plan edit
recording the eleventh. `bash scripts/validate` clean at **137 tests**.

**Two of the five Major findings came from the brief, not the implementer.**

The brief glossed decision `002` as *"one image promoted across every
environment"*. **`002` decides the opposite** — rebuild live from merged `main`,
*"so live and test carry different digests"*, with the trade-off stated in bold:
*"the binary serving live is not the binary that was tested."* What the seam
actually serves is the **first of the three conditions `002` rests on**
(`002:33-34`): *no environment-specific value is ever baked into an image* —
which is Global Constraint 2. The orchestrator had that file open earlier in the
same session and still inverted it.

The brief also quoted Next.js as saying a value is *"evaluated at runtime **rather
than inlined during build time**"*. The trailing clause is **not in the cited
file** — it came from a documentation-index summary and was passed on inside
quotation marks. The source says only *"this env variable is evaluated at
runtime"*, and it is a **code comment inside an example**, not prose guidance.

**The lesson is about where review points.** Subagent output gets a review pass;
a brief does not. Both defects are the exact species this build has caught
twenty-nine times in five rows, produced upstream of the thing being reviewed
and copied faithfully. A brief that hands over a quotation should hand over the
command that produced it.

**A security line nothing could assert.** The `</script>` escaping in
`layout.tsx` was correct and correctly reasoned — and deleting it left vitest,
eslint and both typechecks green. Worse than untested: **untestable where it
sat**, because the frozen root config collects `tests/**/*.test.ts` only and the
escaping lived in a `.tsx` file no test imports. Extracted into
`runtime-config.ts` with two assertions modelled on the reference's own.

**The projection is currently vacuous, and that is fine.** `ClientRuntimeConfig`
names both fields `RuntimeConfig` has, so nothing is withheld today. The
tripwire that fires on a **server-only** field — how a secret would arrive — is
the `toEqual` pair plus `tsc`, not the pinned-key set. The discipline is what
matters; it is why a future field is a decision rather than a side effect.

**The lint config was making a linter pick a React major.** `ignores` was
`["node_modules"]`, which matches neither a nested `node_modules` nor a build
directory. A second workspace made both reachable — npm nests `react` under one
of the two majors in this tree — so markdownlint walked into vendored READMEs
and `validate` failed. The first fix attempted was **downgrading React to
18.3.1**. The reference has the identical nested copy while pinning 19.2.8; the
difference is four globs. Corrected to the reference's list, which also closes
the `.next` and `.medusa` gap **T11 would have hit on its first build**.

**A file-scoped-authority failure mode, worth naming.** The row was at its file
ceiling and the lint config was in no row's list, so the correct move was
stop-and-ask. Instead the constraint was routed around by changing something
*inside* the list — a framework version. File-scoped authority can make working
around a boundary cheaper than reporting it.

**And one fix that did not survive contact.** Dropping `"incremental": true` to
kill an untracked 128 KB `tsconfig.tsbuildinfo` fails: `next build` writes the
flag back whenever it is absent
(`next/dist/lib/typescript/writeConfigurationDefaults.js`). Setting
`tsBuildInfoFile` under `.next/` — already gitignored — survives a build,
keeps the cache, and needs no `.gitignore` rule. **The reference carries the
stray artifact to this day**, so there was nothing to copy.

## 2026-08-31 — T8b, the guard, and a comment that talked me out of checking

`storefront/tests/no-next-public-env.test.ts` and one paragraph of the plan.
**106 lines, 2 files.** `bash scripts/validate` clean at **143 tests**. T8 closes
with it, and C5 is met.

**The reference's stripper had a hole, and its own comment is what hid it.** It
strips everything after `//` to end of line and says being naive about strings
*"only makes the test stricter, never blinder."* Measured against the real file:

```text
const u = "https://x" + process.env.NEXT_PUBLIC_LEAK;   → passes the guard
```

The `//` inside the URL eats the rest of its own line, taking the live read with
it. **Blinder, not stricter** — the exact opposite of what the sentence
promises, in a guard the plan says the promotion model rests on.

**The general lesson is about reasoned lines.** This build has now found three
defects in the reference rather than patterns to copy — an untracked
`tsbuildinfo`, a member-state list with no independent second source, and this.
A *reasoned* line is more dangerous to copy than an unreasoned one: the
reasoning is what discourages checking it. The stripper's comment is a small
argument, and a small argument is exactly what makes a reader stop.

Line comments are now stripped only where `//` opens the line, which makes the
reference's claim true rather than aspirational. Three assertions hold it, and
one of them would pass against a stripper that removed nothing at all — which is
why the other two are there, and the file says so.

**The coverage assertion names files rather than counting them.** The reference
asserts `files.length > 15`; this storefront has four, so the number was tuned
to a tree rather than to a property, and it passes against a walker that
silently stopped recursing as long as it still finds sixteen. T7a rejected that
shape once already, where a member-state list was asserted against its own
length.

**Two Majors, both prose, and one of them the orchestrator's.**

The header claimed Next inlines *any* `NEXT_PUBLIC_` read *regardless of how it
is written*. Next's own documentation gives two forms it does **not** inline — a
variable key, and a re-assigned `process.env` — and states that *"dynamic
property lookups on process.env will not be inlined."* Inherited near-verbatim
from the reference. The guard is unaffected: it trips on those forms anyway, so
it is over-broad in the safe direction. Only the sentence was wrong.

The second was written by the orchestrator: that there is no dynamic
counterpart *because the storefront has no config of its own to raise a timeout
in*. Both facts are true and the inference is not — **Vitest takes a per-test
timeout as an argument**, needing no config at all. The plan carried the same
over-inference at its T8 note, which is where the test file got it, so the plan
is corrected under constraint 11.

**That correction was worth more than this row.** `T17` stands up PostgreSQL,
Redis and a migrated Medusa for one real-dependency smoke check. Left standing,
the plan told that row a long-running test was unreachable — and it would have
designed around a constraint that does not exist.

## 2026-08-31 — T9, and a guard aimed at the wrong side of a division

`storefront/src/{app/page.tsx,app/cart/page.tsx,lib/medusa-client.ts,lib/store-cart.ts}`,
three tests, `runtime-config.ts`, the plan's T9 `Files` block.
**742 lines, 9 files.** `bash scripts/validate` clean at **170 tests**.

**The trap this row was warned about was not closed, and the warning was
misread.** T7a recorded that its price-literal scan covers `backend/src/**` only
and named this row as *"the likeliest place for **`$5`** to be typed a second
time."* The scan added here mirrored the backend's faithfully — and
`seed-product.ts:122` writes `amount: record.amountMinor / 100`, so the Store API
carries **5, 10, 25**. The mirror matched exactly the three tokens the storefront
cannot legitimately produce:

```text
planted `const PLANTED_TOP_TIER_PRICE = 25;` in a page → 13 passed, GREEN
```

**Mirroring a guard is not inheriting it.** The backend's numbers are correct for
the backend; a division sits between the two sides, and the pattern crossed it
unchanged. A sigil-and-digits pattern now catches `$5` — the shape actually
recorded. A bare major-unit integer stays uncatchable, and the file says so
rather than claiming closure: widening to `\b(5|10|25)\b` was **measured** to
match the literal `10` in an unrelated comment two files away, so the limit is
stated with its evidence instead of asserted.

**The checkbox passed while the behaviour did not accumulate.** Three clicks made
three carts, orphaned two, and left `/cart` showing only the last line — because
the action never read the cookie it set. *"Let one be added to a cart"* was
satisfied literally. **C6 is assigned to T9 and T10** and needs the cart a
customer built. Reuse also makes Medusa's merging reachable: the same variant
twice is one line at quantity two, measured by driving the shipped
`getLineItemActionsStep` rather than reasoning about it.

**A trap for T10 that T10 could not have escaped.** Every page shipped
`backendUrl` to the browser, where nothing read it. T10's row promises *the
browser never learns the backend origin*, and its `Files` list contains neither
`layout.tsx` nor `runtime-config.ts`. That config file had asked the question
outright — *"T9/T10 decide whether the browser also needs it directly"* — and
this row is one of the two named. It decided server-side and left the field in
anyway. Dropped here, where the question was posed.

**Three findings the fixer produced that nobody asked for**, all of the same
kind — checking a claim instead of carrying it:

- The `<script>`-escaping test planted its payload in `medusa.backendUrl`. Once
  that field was dropped, **the test would have kept passing for the wrong
  reason** — absence rather than escaping. Moved to a field still published. A
  fix silently defanging an unrelated security test is a failure mode worth a
  name.
- The orchestrator's brief said spreading `init.headers` "yields `{}`" for both
  a `Headers` and an array. Measured: the array spreads to index-keyed garbage,
  not `{}`. Corrected before it entered the file.
- Its own draft comment contained the substring `500`, and the scan it had just
  extended caught it. The guard is live.

**Two Majors were the orchestrator's.** A conclusion drawn from two accurate
citations — *"no `region_id`, no price"* — when `normalize-data-for-context.js`
falls back to the store's default region or throws a 400. And a plan sentence
attributing the guard extension to a **T8b record that does not exist**: that
was read in a review report and remembered as recorded. The extension is right
on its own merits, which is what the plan says now.

**The review method is what found most of this.** It built the production server
and drove it with a logging stub — three clicks, a stale cookie, a traversal
string in the cart id. Every behavioural finding here came from running the
thing; none came from reading it.

## 2026-08-31 — T10, and a promise enforced in one direction

The proxy, the checkout, Stripe test mode. **~1,190 lines excluding the
lockfile, 9 files** — the operator granted a size override at 921 before the fix
pass. `bash scripts/validate` clean at **206 tests**.

**The resolver held completely.** Review ran **41 attack inputs** against the
real exported function and then through a `next build` production server: double
and triple encoding, `..%2f`, `%2e%2e%5c`, protocol-relative `//host`, an
absolute URL as the path, `@`-userinfo, fullwidth U+FF0E and U+FF0F, U+2024,
overlong UTF-8 `%c0%ae`, a null byte, CRLF, a 100,017-character path, 5,000
segments. **Not one escaped `/store/`.** Case comparison fails closed by `Set`
semantics; a spoofed publishable key is overwritten rather than appended.

**And the defence was one-directional.** Every one of those five layers guards
the way *in*. The row's promise — *the browser never learns the backend origin* —
is symmetric, and four channels carried it back out, measured against a real
server:

```text
location:         https://medusa-internal.…svc.cluster.local:9000/store/redirecting/
set-cookie:       connect.sid=abc; Domain=medusa-internal.…svc.cluster.local
content-location: https://medusa-internal.…svc.cluster.local:9000/store/products
link:             <https://medusa-internal.…:9000/store/products?page=2>; rel="next"
```

`redirect: "manual"` — chosen so a 3xx reaches the browser rather than being
followed inside `fetch` — is what made the first one visible. **A setting picked
for correctness became the exposure.**

**The fifth channel did not exist, and not fixing it is the result.** Review saw
an error body echoing scheme and host. Traced through the installed framework:
`errorHandler` builds its message from the thrown error and never from the
request, and a path matching no route falls through to Express's own default,
which echoes `req.originalUrl` — a path, never a scheme or host. **The leak was
the review's stub's shape.** The brief said not to fix a channel that does not
exist; the fixer measured, found none, and applied nothing.

**The request path was a denylist and never said so.** `new Headers(request.headers)`
copied everything and deleted ten names, so a browser `Cookie`, an
`Authorization`, an `x-medusa-access-token` and a client-supplied
`x-forwarded-host: evil.example` all reached the internal Medusa. The file
calling itself the highest-risk file in the row enumerated its defences and
never stated its largest design choice. Now an allowlist of two, proven by
absence.

**Seven exported methods became two.** The flow uses `GET` and `POST`.
Forwarding `OPTIONS` handed the storefront's CORS answer for `/api/store/*` to
the backend's `STORE_CORS` — a value `runtime.ts:15` records as not required and
silently defaulted.

**One Major was the orchestrator's again**: a parenthetical citing *"T10's
anti-goals: no fulfillment, no shipping"*. The row has no anti-goals. That list
was a **heading in the brief**, and the file attributed it to the plan. A brief's
own section headings can be misread as sources.

**Two things this row could not fix, both recorded for later.**

`configure-commerce.ts` writes 27 EU tax regions at 24% with `automaticTaxes`
on, and Medusa resolves tax from the **address country**. This checkout never
collects an address, so `tax_total` is 0 and an EU buyer is charged the net
price. The row's own requirement holds — the displayed number *is* the charged
number — but **decision `008`'s treatment has no path to execute in LD-01**.

And Q7 says *"no row in this plan performs that binding"* of the
Region↔payment-provider link. **T7c performed it.** Constraint 11 territory.

**Method note, repeating.** Every behavioural finding in the last two rows came
from running the thing — a stub backend, `curl`, a real production server. None
came from reading it.

## 2026-08-31 — T10b, a row that did not work, and tests that defended it

`PaymentForm.tsx`, `checkout/page.tsx`, `medusa-client.ts`, `store-checkout.ts`,
its test, plus the plan and ledger amendments. **328 lines, 7 files.**
`bash scripts/validate` clean at **211 tests**.

**The first attempt failed on every submission, for every country.** Stripe's
`AddressElement` returns the country **uppercase**.
`@medusajs/core-flows/dist/cart/workflows/update-cart.js:30-34` matches
`region.countries` on `iso_2` with a strict `===`, those rows are lowercase in
three independent places (`region/dist/loaders/defaults.js:10`,
`configure-commerce.ts:285`, `region-module.js:129`), and the normalizer at
`:35-38` runs **after** the lookup — so it can only ever help input that was
already lowercase. Result: `400` before any payment was attempted.

**And the row's own tests asserted the broken value.** They pinned `"EE"` and
`"US"`, so applying the one-line fix turned all three red. **A broken feature
whose tests enforce the breakage** is the worst shape this build has produced —
worse than an untested claim, because the suite actively defends the defect.

`bash scripts/validate` was green throughout. Nothing in this repository's gates
sees a value only a real Medusa rejects.

**The fix is not a lowercase call.** The country now comes from the region's own
`countries`, fetched from `/store/regions` — **the same rows Medusa matches
against**, already lowercase. The mismatch is unreachable rather than patched,
and the list cannot drift from what Medusa accepts because it *is* what Medusa
accepts. `medusa-client.ts` was already calling that endpoint and discarding the
array.

**That settled the over-collection question against the orchestrator's own
suggestion.** The brief proposed `AddressElement` on Constraint 7 grounds. Its
installed typings cannot narrow it — `fields` covers `phone` and `name` only,
`display` the name only, `allowedCountries` restricts the dropdown and not the
field set, and there is no country-only mode. So a buyer typed name, street,
city and postcode for a $5 certificate and **every one was discarded**. And
Constraint 7 cuts the other way: an unstyled `<label>` and `<select>` is the
register of `<p>Total: …</p>` and `<button>Pay</button>` already on the page,
while `AddressElement` renders a Stripe-designed multi-field form — more visual
language than anything else in the storefront, and none of it ours.

The checkbox says *collect the customer's country*. The select is what that asks
for; the address form over-delivered.

**Three false sentences.** That `elements.submit()` is required with more than
one Element — its own citation scopes it to *the Payment Element*, and Stripe
scopes the requirement to an Elements object **without** an Intent, which this
is not. That **T17 establishes Medusa's tax rule** — T17's checkbox mentions
neither tax nor country, and its `Files` list is entirely `backend/` and
`scripts/`. That `update-cart.js`'s case-insensitive comparison persists
something — it is a change detector that writes nothing.

The T17 one is worth its own name: **a row transferring its unmet verification
obligation to a row that never agreed to it.**

**And the orchestrator ran verification theatre while checking the fix.** A
`sed` mutation to prove the tests now reject uppercase reported 26 passing — the
pattern was `country_code: countryCode,` and the file says
`country_code: countryCode }`, so **nothing was mutated and the green meant
nothing.** Re-run with an assertion that the replacement applied, three tests go
red. This is the identical failure recorded at T5b, committed by the same
orchestrator that recorded it. **A mutation without an applied-check is not a
measurement.**

## 2026-08-31 — T11, an image that worked for one of its two jobs

Both Dockerfiles, both dockerignores, `scripts/images.test.ts`, three manifests,
`redis-preflight.ts`. **912 lines, 9 files.** `bash scripts/validate` clean at
**225 tests**. Built with **podman** — the Docker daemon does not run here.

**Q6 item 2 is settled after ten rows, and settled in both directions.**
`redis-preflight.ts` claimed the script runs from the compiled `.js` in the
image. The guard — `[ -f ./src/config/redis-preflight.js ]` — fires only when the
working directory is the build output root, and **no row had written a
`WORKDIR`**. Measured inside the image: the compiled branch runs; removing that
file forces the `ts-node` branch, which fails `MODULE_NOT_FOUND` because
`ts-node` is a devDependency absent from a production install. **Two
distinguishable failures**, so the guard fires on the real branch rather than
passing by coincidence.

**Q8 needed one package, not seven.** The failure was reproduced first,
`@medusajs/admin-sdk` added alone, `medusa build` completed, `npm audit`
unchanged at 77. The reference's other five admin packages were not added
because the build did not ask for them — and the digest was resolved twice
independently rather than copied, which is how we know the tag has not moved
rather than assuming it.

**The image did not work for one of its two jobs.** The Dockerfile's first
sentence says the API and the predeploy Job both run from it. Against real
Postgres and Redis:

| as | result |
| --- | --- |
| UID 10001 | **exit 1**, nine `EACCES` |
| root | exit 0 |

Medusa's migration runner creates module migration directories **inside the
package tree**, and the copied `node_modules` landed root-owned. `fsGroup` does
not help — it applies to mounted volumes, not a baked layer.

**The API path was unaffected.** A smoke check that starts the server and curls
`/health` passes. **T13 writes the Job that would have hit this in a cluster, on
first deploy.** The reference has the same shape, so it is inherited — this is
simply the first row that could measure it.

**An allowlist of names is not a constraint on values.** The test permitted
`PORT`, `HOSTNAME`, `NODE_ENV` by name, so
`ENV HOSTNAME=lousydeal-test.example.com` passed green — reading as intentional
configuration rather than a mistake, against the one constraint this row exists
to enforce. Values are asserted now.

And **three properties the row's own text requires were guarded by nothing** —
digest pinning, the non-root UID, the cleared `ENTRYPOINT` — true today and
evidenced only by terminal output in a report the next reader will not have. The
digest matters most: dropping an `@sha256:` while bumping a base tag looks
exactly like a routine version bump in review.

**Two false sentences had sound conclusions and wrong mechanisms**, and were
corrected rather than deleted. `HOSTNAME` is declared not because a base image
could change Next's default — that default is a literal in generated
`server.js:15` — but because **the container runtime injects
`HOSTNAME=<container id>` when the image does not declare one**, and Next would
bind to that.

**And fixing the Job exposed a blocker underneath it.** With `db:migrate` no
longer aborting, `configure:commerce` throws *"The store does not support usd"*.
`@medusajs/core-flows/dist/defaults/steps/create-default-store.js:44-46` spreads
the caller's store and then **overrides** `supported_currencies` to
`[{ currency_code: "eur", is_default: true }]` regardless of input, carrying
Medusa's own `// TODO: Revisit`. `configure-commerce.ts:255-257` **throws** when
USD is absent rather than adding it.

**Nothing in this repository ever adds USD to the store.** T7b's checkbox says
*"configure the region, sales channel and currency idempotently, so a re-run
neither duplicates nor errors"* — on a clean database it errors on the first
run. Its verification was a stub, and the stub did not model Medusa's default
store. **Recorded as Q10.**

## 2026-08-31 — T7d, and the first end-to-end verification in the build

`configure-commerce.ts` and its test. **356 lines, 2 files.**
`bash scripts/validate` clean at **231 tests**.

**Q10, closed.** Medusa's `create-default-store.js:42-47` spreads the store data
it is given and then **overrides** `supported_currencies` to EUR-only —
Medusa's own `// TODO: Revisit` sits on the line. `applyStoreCurrency` **threw**
when the store did not support USD rather than adding it. So `predeploy` could
not complete on a clean database, and **nothing in this repository ever added
USD**. T7b's checkbox promises a run that *"neither duplicates nor errors"*; the
first run errored.

It converges now: other currencies preserved and demoted, the deployment's
currency set default with its tax preference, EUR kept rather than dropped. **The
refusal survives as a post-condition** — it re-reads after the workflow and fires
only if convergence did not happen. A guard against a silent half-apply, not
against a state the code can now fix itself. *"Do not delete a guard because it
fired"* was the instruction, and this is what it looks like honoured.

**This row was verified against real services, and that was the point.** Two
consecutive rows had shipped green suites over stubs that modelled things Medusa
does not do — T7b's stub did not model the store Medusa creates, T10b's modelled
a tax rule Medusa does not have. Both rows were broken and both suites passed.

So the row built the image, stood up a real PostgreSQL 17 and Redis 8, and ran
`predeploy` **twice** as UID 10001. Exit 0 both times; the second run wrote
nothing, `updated_at` unmoved.

**And the reviewer reproduced it from scratch** — own image, own network, own
containers — reaching the same state: three published tiers, one USD region with
automatic taxes and `pp_stripe_stripe`, 27 EU tax regions at 24%, `usd` default
with `eur` demoted, no duplicated rows. **The first claim in this build
reproduced by a second party rather than read off a transcript.**

**Two checks were weaker than the invariants they named**, and the review found
both by hand-editing states the code cannot reach on its own:

- The post-condition asserted **presence**; the early return required
  **default**. So Medusa persisting `usd` while dropping `is_default` — the exact
  half-failure the guard exists for — passed it, after which every later
  `predeploy` would rewrite the store forever without complaining. Deleting the
  whole block left the suite green.
- The convergence check asked whether the currency carries `is_default`, never
  whether it is the **only** one. A second default short-circuited the write that
  demotes everything else — measured, twice, stably wrong.

Both now share one predicate. **Weakening it to presence-only turns exactly the
two new tests red** — verified by the orchestrator with an applied-check on the
mutation, which is the discipline T10b recorded after a `sed` that silently
matched nothing.

**And the row falsified its own file's header as it wrote it.** The header said
no test exercises the Medusa target, and that the seam is stubbed *"without
mocking a Medusa container"*. Both were true until this commit added a suite
doing both. Constraint 9 turned inward.

## 2026-08-31 — T13, the first row outside this repository

`deploys` PRs **#30** (T13a, 1,847 lines, 17 files) and **#31** (T13b, 303 lines,
3 files). Both overlays render and pass `kubeconform -strict` at **25 resources**
each. The work is in `deploys`; the record is here, as T2a's was for
`architecture`.

**Effect gate E3 was approved after establishing it was not what its name
says.** The gate reads *"first write to `deploys/lousydeal/overlays`"*, which
sounds like a deployment. It is not: `orange` defines Argo CD Applications for
`plepic` and `servitium` only, and **nothing points at `lousydeal`**. The
manifests are files in a repository, checked by CI, watched by nothing. The gate
that starts workloads is E5, at T14a/T15a. **Asking what a gate actually does,
before asking for it, is the cheap half of the work.**

**A size override was requested before writing rather than after.** The
reference's equivalent is 1,742 lines, so the cap was going to be exceeded
whatever happened. Reported estimate: ~1,300–1,600 lines, ~13 files. **Actual:
1,847 and 17.** Both over what was quoted.

## What the row established

**The backend has no route from outside the cluster.** Not merely no hostname —
no route. Its Service is `ClusterIP` with no `externalIPs`, and
`allow-backend-ingress` admits only the storefront pod selector, deliberately
unlike the reference, which puts an `externalIP` on its own backend and admits an
administrative CIDR. Review tried **ten routes** and **sixteen traversal shapes**
through the storefront's real proxy resolver. None reached port 9000.

**The predeploy chain needs no egress**, proven by running it to completion on a
podman `--internal` network with no DNS and no route to 443 — not by reading
imports. **Ten** module-migration mounts, not the reference's eleven, and
dropping one fails with `ENOENT` on a clean database, so the set discriminates.

## The finding that lives between two repositories

Orange renders the Argo `Application` with `replace /spec/ingress/0/from` for
**both** services. The reference survives that because its
`allow-backend-ingress` has **two** rules with the CIDR at index 0. **This one
has a single rule whose index 0 *is* the storefront pod selector** — so the same
patch would delete the storefront's only path and substitute a private CIDR onto
port 9000, exactly what the rule exists to withhold.

**Neither repository can catch it.** `tests/manifests.sh` renders
`kubectl kustomize`, which never observes Application-level patches; Orange's
template does not know what shape it is patching. **The defect lives entirely in
the seam**, and only reading the Jinja template exposes it. Recorded where T15
will read it — and deliberately *not* fixed by adding a second rule, since a
placeholder `ipBlock` would be an ingress path this row exists to withhold.

## T13b: a checkbox that could not verify itself

Its stated check is `grep -c Probe` returning non-zero — **satisfied by the word
`Probe` in a comment.** So the row measured instead.

A worker-mode process **does** bind 9000 and answer `/health` 200, while `/app`
answers **404**. A control flipping only `MEDUSA_WORKER_MODE` to `server` serves
the Admin bundle at 200, so the absence is **structural**: `loadEntrypoints`
returns before the admin loader and the API router whenever `isWorkerMode` is
true.

**The liveness probe is defensible *because* `/health` is narrow.** Redis down
and PostgreSQL down both leave it at 200, so a dependency outage cannot restart
the worker into the preflight refusal that would crash-loop it. It is not
vacuous either: `SIGSTOP` leaves the container `Up` and silent while the endpoint
stops answering — the one failure nothing else catches. `SIGKILL` takes the
container down by itself, so the "crashed process" half was free.

**And the property the row established was guarded by nothing.** One line sets
`MEDUSA_WORKER_MODE: worker`; the default without it is `shared`, which is not
worker mode. **Deleting a line publishes the Medusa Admin** — measured — while
every assertion passed. The test had been written *specifically* to assert
measured shape rather than key presence, and still missed the line the property
depends on. **Measuring something and guarding it are different acts, and doing
the first well makes it easy to believe you have done the second.**

## Citations

**T13a shipped five citations to a file that does not exist** —
`scripts/update-gitops-digest.sh` in this repository, which T12 creates and T12
runs *after* T13 — while the report claimed to have read it in full. The shape
was right and was checked against the real consumer in the reference; the
**provenance** was invented. A sixth instance was found by the fixer, in a place
the brief had not named, and it caught that its own replacement citation was
ambiguous inside `deploys`.

One measurement was likewise attributed to an image built at the row's HEAD when
the only image on the host predates it and **fails** the chain.

**T13b then corrected six line numbers that had drifted, including one in the
orchestrator's own brief.** A citation ages even when the file does not move.

## T12a: the test promotion

`.github/workflows/deploy-test.yml`, `scripts/yaml-subset.ts`,
`scripts/workflows.test.ts`, `scripts/validate`,
`.github/workflows/validate.yml`. 1,892 insertions across five files, under a
named operator override — the bound is 800.

### The workflow was right and the test file was not

The row's property is two-sided: the job that runs head code holds no
credential, the job that holds the credential runs no head code. The
implementation got the workflow close to correct on the first pass. The review
applied **26 mutations to the workflow and 12 to the parser, and 14 passed.**

Almost every survivor was an assertion checking a spelling instead of a
property:

- the credential check was `not.toMatch(/LOUSYDEAL_DEPLOYER_/)`, so
  `secrets.SOME_OTHER_DEPLOY_KEY` walked into the head-code job;
- it read job scalars only, so a workflow-level `env:` inherited by every job
  was structurally invisible;
- it examined **steps**, under a comment claiming it examined "all three of the
  ways head code could arrive", so `promote` could be handed a head-built image
  as a job `container:` — the App-token mint and the `git push` executing inside
  an image built from the pull request's own Dockerfile, with every test green;
- the remote-code check was a four-entry blacklist matching `curl … | sh`, so
  `wget … && sh`, `bash <(curl …)`, and download-chmod-execute all passed;
- the re-verification was pinned by *position* and by the *text* of its jq
  filter, and by nothing that required it to be able to fail. Dropping `-e` from
  `jq` makes it print `false` and exit 0. Five separate neuterings passed, in
  both `gate` and `promote`.

**A test can assert the shape of a guard and still not assert that the guard
guards.** T13b recorded the same lesson one row earlier from the other
direction: it measured a property carefully and left the line the property
depended on unasserted. Here the assertions existed and named the right
subjects; they matched on names and positions rather than on the reachability
they claimed to establish.

### The blacklist is the shape to distrust

The same file got this right and wrong in adjacent blocks. Its `git` check is an
allowlist and survived every mutation. Its download check was a blacklist and
survived none of three. **A blacklist of ways to fetch and run code cannot be
completed**, and the fix inverted it.

### The parser was ported without its tests

`scripts/yaml-subset.ts` is byte-identical to the reference's 265 lines — the
right call, since a trimmed parser is a parser whose untested branches are
unknown. But the reference's `yaml-subset.test.ts` (154 lines, 13 cases) was
**not** ported; six cases were written in its place. Five parser mutations
survived, two of which made `mapping()` and `sequence()` **silently drop**
deeper-indented content rather than refuse it — the exact behaviour the file's
own header comment says those throws exist to prevent, and the one that makes
every assertion above the parser vacuous rather than wrong.

**Porting an implementation and not its tests imports the code and leaves the
evidence behind.**

### Citations, again

`scripts/workflows.test.ts` cited `scripts/images.test.ts` as guaranteeing
`WORKDIR /app`. It guarantees `USER 10001:10001` and a cleared `ENTRYPOINT`
(`images.test.ts:334-343`), and nothing about `WORKDIR` — the only occurrence of
the string under `scripts/` was the sentence claiming it was asserted. A comment
in `deploy-test.yml` pointed at "`promote`'s equivalent comment", which does not
exist; the reasoning it referred to had been deleted, leaving 73 lines of test
enforcing a property nothing explained.

**Two of the orchestrator's own steers were wrong and the reviewer corrected
both.** The brief asserted the reference holds `packages: write` only under
`push`; `plepic/.github/workflows/deploy-test.yml:115-120` holds it under
`pull_request_target`, which was the load-bearing claim in the steer. The brief
also expected `deploys/lousydeal` might be absent; it is on `origin/main`. The
implementer had reported the same thing from a stale clone. **A briefing is a
claim like any other, and it ages the same way.**

### The `packages: write` exemption

`build` runs head code and holds `packages: write`. The row says that job holds
no credential. The exemption is sound, but the comment argued it from **scope** —
cannot read `secrets.*`, cannot write `deploys`, scoped to this run — and every
clause was true while none was why the job is safe. What carries it: BuildKit
gives head-authored `RUN` instructions no path to the credential store, and
`gate` refuses any head not from this repository, so the head author already
holds repository write. Both overlays pin digests and no tag, and a
content-addressed digest cannot be overwritten.

The header had the threat model backwards in the other direction, describing "an
outside contributor" whose fork `gate` in fact refuses outright. **Stating the
posture correctly is what makes the exemption defensible; overstating the threat
made the argument weaker, not safer.**

### What this row does not do

`Deploy Test` cannot promote today, and nothing claims it can. `gate` reads
`scripts/update-gitops-digest.sh` from the base SHA and that file arrives with
T12b. `lousydeal` has **zero** GitHub environments, so `environment: test` and
both deployer secrets do not exist. And `hannosirkel/deploys` carries an active
ruleset on its default branch with four required status checks and two bypass
Integrations; `/apps/lousydeal-deployer` is 404 while `/apps/plepic-deployer` is
403, so the App must be created **and added as a bypass actor** or the push is
rejected. Each of these fails loudly. **T12b's prerequisite is operator-side and
is recorded here because no row creates it.**

### Two repairs, and the one that was still wrong

The shell gate is now derived from `git ls-files` by name and shebang, and
resolves today to exactly the two paths the hardcoded line named. The first
derivation used `[ -x ]`, which misses a tracked mode-0644 script — measured
with an extensionless `#!/bin/sh` probe, absent at 0644 and present at 0755 —
while the comment claimed it closed exactly that gap for T17's
`scripts/store-smoke`, which has no extension. `deploys` uses `[ -f ]`. Matched.

`lychee` ran twice per pull request. The `Documentation` job's action is gone;
`scripts/validate:137` is the only invocation, byte-identical to the deleted
step's arguments.

### Verification

84 tests in the `repo` project, 301 in the full suite, `validate` clean. Five
mutations were re-applied independently by the orchestrator after the fix pass —
`services:` on `promote`, an arbitrary secret in `build`, a workflow-level `env:`
carrying the deployer key, `jq -e` → `jq` in `promote`, and `mapping()`'s
indentation throw turned into a silent skip — and all five went red, with the
parser restored byte-identical to the reference afterwards.

## T12b: five reviews, one defect

`.github/workflows/release.yml`, `scripts/update-gitops-digest.sh`,
`scripts/update-gitops-digest.test.ts`, `scripts/workflows.test.ts`. 4,130
insertions across four files, under a named operator override — the bound is
800. Five review passes, six fix passes.

### The same defect, five times

| pass | applied / survived | what defeated everything |
| --- | --- | --- |
| 1 | 40 / 24 | `wget … && sh` where the check named `curl … \| sh` |
| 2 | 135 / 74 | `SECRETS.` where the check named `secrets.` |
| 3 | 51 / 35 | `>>$GITHUB_OUTPUT` where the check named `>>"$GITHUB_OUTPUT"` |
| 4 | 21 / 15 | `"images":` where the check compared bytes to `images:` |
| 5 | 31 / 10 | `images: [{…}]` where the check required the line to end at the colon |

**Every one is the same mistake: an enumerated set of spellings standing in for
a set.** Each fix closed the spellings it was shown. Each next review found the
next one. The count fell only when the instruction changed from *"fix these"* to
*"close every set, and compare by meaning"*.

Pass 3's control is the cleanest statement of it. A `trap` forging both digest
outputs **survived** written `>>$GITHUB_OUTPUT` and **was caught** written
`>>"$GITHUB_OUTPUT"` — the same semantic mutation, passing or failing on a quote
character.

### What actually worked

**Pinning, not banning.** `validate`, `gate`, `build` and `promote` are pinned
to their exact expected step content. That closed, by construction and in one
change, eleven failure-swallow spellings, five step-level `if:` forms, a private
key exfiltrated past GitHub's log masking with `base64 | rev`, the wrong
Dockerfile, a `COPY --from=attacker`, and a second `docker login` handing
`github.token` to another registry — **none of which anyone had to think of
first.**

The lesson was already in this build's record twice. T12a's review: *"The `git`
side of the same file is an allowlist and holds up. Its download check was a
blacklist and survived none of three."* It took three more passes here to act on
it.

### Pinning a step is not pinning the job

Pass 3 defeated the whole mechanism with a **job-level** `container:` on `gate`.
The step stays byte-identical; every binary it calls — `curl`, `jq`, `base64`,
`bash` — comes from an attacker's image. `gate`'s only product is the base64 blob
that `promote` decodes and executes beside the `deploys` write token.

Pass 4 did it again one level up: a workflow-root `env: NPM_CONFIG_REGISTRY`
makes `validate`'s **byte-pinned** `npm ci` install the whole dependency tree
from an attacker registry, in the job `build` and `promote` both need.

**An allowlist closes only the level it is applied to.** Steps, jobs, the
workflow root, and the set of workflow files are four levels, and discovery
filtering on `.yml` left `.yaml` unread entirely.

### Citations of mutable state age

Two comments asserted, as live-verified fact, that the `live` environment had no
protection rules. True when written. **False the moment the operator added a
deployment branch policy — on the orchestrator's own recommendation.** The
conclusion survived; the evidence did not.

Constraint 10's *cited* limb assumes the citation stays true. A pinned commit SHA
does; a repository setting does not. Where the fix could not cite something
immutable it now states the date read and that the value can drift.

### What is recorded rather than closed

- A **BOM-prefixed** `images:` key is not matched by the guard. Verified
  non-exploitable rather than assumed: `kubectl kustomize` refuses the whole
  file — `unknown field "﻿images"`.
- Tab- and NBSP-indented fourth keys after the last entry are bounded, not
  closed; kustomize fails closed on each.
- `concurrency:`'s sub-key set is not closed. Actions rejects unknown keys at
  parse time, which is the stronger backstop.
- `secrets: inherit` is not modelled by `secretsReferenced`. Neither workflow
  declares a job-level `uses:`, so nothing can inherit today.
- The verification pass's own entry-count bound has no test; the rewriter
  refuses first.

### Verification

450 tests, `validate` clean. The orchestrator applied **thirty-eight** mutations
independently across the passes, all red, and exercised the guard against a real
clone of `deploys` in both directions: five duplicate-key spellings and three
rogue pre-entry item shapes all refused; the pristine overlay, a column-0 comment
inside the `images:` block, and blank lines between entries all promoting
cleanly at exactly `2 2` on one file with digest-only images rendered.

**The row's checkbox holds** — the promotion writes a digest matching
`^sha256:[0-9a-f]{64}$` and never a tag, for the value that reaches the overlay,
bound end to end from `steps.build.outputs.*` through `jobs.build.outputs.*` and
`promote.env.*` to the guard's argv.

### The prerequisites this row cannot create

`Release` and `Deploy Test` both mint a GitHub App token scoped to
`hannosirkel/deploys`. None of that is in either repository, and all of it was
verified rather than assumed: the App holds **exactly** `contents: write` and
`metadata: read`, is installed on `deploys` alone, mints a token scoping to
`deploys` alone, and is the third bypass actor on that repository's ruleset —
without which the promotion publishes, commits locally, and then fails on a push
the four required status checks reject.

An earlier key in the same file produced `Integration must generate a public
key`: an App with **no registered public key**. It would have surfaced as a
failed promotion after the images had already published.

**The deployer secrets are environment-scoped and the repository-level copies
were removed**, so `build` — which declares no environment — cannot resolve the
credential at all. The boundary this row spends 2,719 lines asserting is now
also enforced by GitHub, and by the pin on `build`'s steps. Three independent
layers, which is the right number for the job that holds `packages: write` and
produces every value the promotion consumes.

### T12b postscript: the workflow could not run

**`Release` fired on its own merge, exactly as the plan predicted, and
`validate` failed in 30 seconds:**

```text
validate: missing required tools: lychee gitleaks
```

`release.yml`'s `validate` job ran `bash scripts/validate` without installing
`lychee` or `gitleaks`. `validate.yml`'s `canonical` job has six steps; this one
had four. **The job could never have passed.**

`build` and `promote` were skipped, so **E1 and E2 did not happen** — nothing
published, nothing written to the live overlay. The workflow failed closed. Its
safety properties held; its liveness did not exist.

**Five review passes and 278 mutations did not find this, and could not have.**
Every one interrogated the parsed document — the row's own verification phrase,
inherited from T12a, is *"against the parsed document"*. That phrase was written
to stop a `grep` passing where a parser would fail, and it did that. **It says
nothing about whether the document describes a job that can run.** A workflow can
be perfectly well-formed, exhaustively pinned, and structurally sound in every
credential dimension, and still abort on its fourth step.

The pin made it worse in one narrow sense: `VALIDATE_STEPS` pinned four steps
byte-for-byte, so the fixture recorded the defect as the intended state. **A
fixture pins what is, not what should be.**

The fix adds the two install steps, regenerates the fixture **from the workflow
itself** rather than by hand, and adds the assertion that would have caught it:
every job whose script runs `bash scripts/validate` must install each tool
`scripts/validate` declares, with the list **read from `scripts/validate`** so
that adding a tool there cannot leave a caller behind. `shellcheck` is on the
runner image and `node`/`npm` arrive with `actions/setup-node`; everything else
needs a step. Both the shipped defect and a partial version — only `gitleaks`
removed — go red.

**The orchestrator repeated the build's own recurring mistake while fixing it**:
it read `grep`-filtered vitest output showing `95 passed`, and reported progress,
when the suite had in fact failed to load at all on a `ReferenceError` for a
helper that did not exist. The full output said `Test Files 1 failed`. **Reading
a filtered view and concluding success is the same error as trusting an
implementer's self-selected sample** — which this build had already recorded
twice, about other agents.

## T14a: the fake was more permissive than the server

`orange`, 10 files, 1,200 insertions, under a named operator override. Three
review passes: **21 / 7 survived, 39 / 16, 26 / 5.** The first two each returned
a merge blocker, and both blockers had the same cause.

### Two blockers, one root

**Pass 1.** Four of the six registered sources were unconditionally required by
`openbao-admin validate`. The plan registers *before* it seeds, so those paths
did not exist — and `orange.yaml` validates OpenBao at task 77, ahead of
WireGuard, cloudflared, Argo CD and TLS monitoring, with no `ignore_errors`.
Independently, the argocd role waits for every ExternalSecret to report ready
with 120 retries; four pointed at empty paths would fail the role **five imports
before Servitium and Plepic reconcile.**

**Pass 2.** The fix deferred the sources and *also* emptied
`LOUSYDEAL_POLICY_BASE`. With the shipped defaults that left two ACL policies as
the empty string — the first this repository has ever had — and OpenBao refuses
an empty policy body with HTTP 400. `reconcile-access` runs at task 66, **one
task earlier than the failure it replaced.** Thirty-nine reconciliation steps
abandoned, including every Kubernetes auth mount and the `eso-plepic` and
`eso-servitium` roles.

**Neither was caught by 525 passing tests, because the test double stores any
policy body and accepts a KV write into a namespace with no mount.** The fake is
more permissive than the server on exactly the two endpoints involved. The
implementer said so in its own words — *"I could not reproduce the reviewer's
literal failure text through this harness"* — and the orchestrator read that as a
harness limitation rather than as the finding.

**A test double that is more permissive than the thing it doubles converts a
production failure into a green suite.** That is not a gap in coverage; coverage
was 100% on both paths. It is a gap in fidelity, and no amount of additional
assertions against the same double would have found either blocker.

The double now refuses an empty policy body as the server does, **and that rule
has its own test** — the mechanism that closes both blockers should not be
silently removable. One remaining permissiveness is recorded rather than fixed:
KV against a namespace with no `secret` mount is still accepted, guarded instead
by a hand-written call-order assertion.

### The orchestrator verified one half and declared the whole

Pass 1's blocker was closed by a change with two required properties: metadata
reads unchanged, **and** no empty policy. The brief asked for the first and got
it — delta 0, independently confirmed — and the second was neither asked for nor
checked, because the brief's own report contract named `validate` and the failure
was in `reconcile-access`.

**A report contract that names the wrong command cannot detect the right
failure.** Worse, the brief had blessed `LOUSYDEAL_POLICY_BASE` as "genuinely
least-privilege" in its do-not-re-litigate section while directing the
implementer to check the widening — so pass 2's blocker is downstream of the
orchestrator's own instruction.

### And read the summary, not the output

Verifying the anti-recurrence measure, the orchestrator ran a mutation and read
`442 tests, 1 error` as a catch. The suite had not run: a sloppy regex broke the
module import. The tell was the count — 442 against a baseline of 529. **The
second instance this build of concluding success from a filtered view**, after
recording the same error about implementer reports twice.

### What the row got right

The source set is exactly correct in both directions, verified exhaustively by a
reviewer: ten distinct (Secret, key) pairs per environment exist across
`deploys/lousydeal/base/`, both overlays and the app source, and precisely those
are registered. Four Plepic sources with no Lousy Deal equivalent were correctly
**not** copied. The contract appends two entries and alters none; Plepic and
Servitium policies are byte-identical.

A pass-3 reviewer built a strict client asserting eight real-server rules the
double ignores and replayed `reconcile_access`: **zero violations on the branch,
ten on a control.**

### A hole in the plan, found by the row that needed it

Two comments claimed the Medusa publishable key is *"minted by
`configure:commerce` at first deploy"*. Nothing mints it.
`configure-commerce.ts`'s own header says it configures no sales channel, and
`predeploy-job.yaml` records that the chain never seeds an Admin user — so there
is not even an identity to call the Admin API with. `storefront.yaml` consumes
the key **without** `optional: true`.

The decision to defer the source was right; the stated reason was false, and it
is what made the gap invisible. **The operator has decided a new row will seed an
initial administrator**, following the reference. `docs/current/provisioning.md`
records the gap in the meantime.

### Documentation is part of the change

`AGENTS.md:103-104` requires a role change, its contract test and the matching
`docs/current/` file to move together. The first pass moved two of the three, and
`grep -rl lousydeal docs/` returned nothing while six sources sat registered with
no documented way to seed them. Pass 2 then found four false sentences in the
documentation written to fix that, and pass 3 found five more — including a
runbook naming the wrong variable, which an operator following it at T15b would
have discovered as a failed argocd role. **The same error is in the pre-existing
Plepic paragraph it was copied from**; reported, not edited.

## T14b: a comment that cited the test it needed

`backend/src/admin/seed-administrator.ts`, its `medusa exec` script, its tests,
`backend/package.json`, and one sentence in `backend/src/config/runtime.ts`.
1,010 insertions.

**The code was right on the first pass and the prose was not.** Idempotency was
genuinely proven — the reviewer enumerated the reachable states rather than
trusting test names, including a soft-deleted administrator whose auth identity
survives linked to the dead id, and traced each through the seeding. The port is
character-identical to the reference where it claims to be. **Four sentences
asserted things that were false against files in this checkout**, and one of them
is worth the entry on its own.

### The comment that named its own gap and then closed it with fiction

A docblock reasoned, correctly, that a substring check on the literal password
cannot catch a leak that puts it behind a hash or a length — and then said *"which
is why `it("goes red on a leak"` below exists as a second, independent proof."*

**No such test existed.** And the gap was real, measured three ways:

```text
log the password's LENGTH   -> 24 passed
log a six-character PREFIX  -> 24 passed
log a sha256 HASH           -> 24 passed
log the FULL password       ->  3 failed
```

The reasoning was sound, the conclusion was right, and the compensating control
was imaginary. **A correct diagnosis is not a fix**, and a sentence that names a
test is checkable in one `grep` — which is what the reviewer ran.

The orchestrator had verified this property and missed it, because it tested the
literal leak the canary catches and not the derived ones the docblock itself
identified as the harder case. **Verifying the case a file tells you is easy is
not verification.**

### Enumeration does not converge; pinning does

The fix does not enumerate derivations, because no enumeration can: a leak may
compute anything. It **pins the call sites** — the script contains exactly these
three statements that can put text somewhere observable, matched as source text.
Any added or edited statement fails, whatever it computes.

Measured after: length, prefix, a reversal, a **boolean derived from the
password**, and even an innocuous extra `logger.info("seeding")` all go red. The
last one is the point — an allowlist refuses what it does not recognise, and does
not need to recognise the attack.

**This is the fourth row in this build to arrive at the same answer.** T12a's
review: *"the `git` side is an allowlist and holds up; the download check was a
blacklist and survived none of three."* T12b needed five passes to act on it.
Here it took one.

### Three sentences borrowed from a repository they were true in

- *"`register` refuses a duplicate"* — `@medusajs/auth-emailpass` does the
  opposite for an orphaned identity: `app_metadata` empty means *claimable*, and
  that branch succeeds, calling `upsertAuthIdentity("update", …)`, which
  **rotates the password**. Adoption is still correct; the reason given was the
  inverse of the truth.
- *"the same line-break-injection check the mail configuration applies"* — there
  is no mail configuration in this repository. True in the reference.
- *"the Job is that Secret's only consumer"* — `postgresql.yaml:92-96` reads
  `POSTGRES_SUPERUSER_PASSWORD` from it, and the same sentence names that
  password as one of the Secret's contents. Internally inconsistent, and
  inherited from a reference where it is equally untrue.

**A ported comment carries its referents with it, and they do not survive the
journey.** Every one of these was true where it was written.

### What the row leaves load-bearing

`seed:administrator` refuses when its credentials are absent — the repository's
uniform pattern, and pinned: switching it to skip is caught. Skipping would not
avoid the failure, only relocate it, since the storefront still has no key and a
green sync would hide it.

But the Job is an Argo CD `Sync` hook at `sync-wave: "-10"`, so **until T14c and
T14d land, a promoted image takes the whole sync red** and `configure:commerce`
and `seed:product` never run. Nothing in CI runs `predeploy`, so nothing catches
it. **Merge order is now load-bearing**, and the file says so rather than the
handoff.

## T14c and T14d: one credential, three repositories

`deploys` (4 files, 126 insertions) and `orange` (7 files, 110). Together with
T14b they complete the detour a review opened when it found that **nothing in
this build creates the credential the storefront cannot start without.**

### A row can make its siblings worse before it makes them better

T14b merged first, so `predeploy` ran `seed:administrator`, which refuses on
absent credentials. That was the right decision — the alternative, skipping,
would have produced a green sync with no administrator and no key, hiding the
failure further from its cause.

But it meant T14c landed into a repository where the refusal was already live,
and **T14c's own review found that landing it alone made the failure worse.**
Before: a named `ConfigError` in seconds. After: a non-optional `secretKeyRef` to
a key that did not exist yet, which is a `CreateContainerConfigError` — **the
container never starts, so it never exits, so it does not count against
`backoffLimit: 2`** — and the Argo CD hook stalls to `activeDeadlineSeconds: 900`
and fails as `DeadlineExceeded` fifteen minutes later.

Bounded, and never live, because nothing runs before T15a. **But it is a
regression in legibility that no test could catch**, and it existed only in the
window between two rows. It is recorded in the manifest that causes it.

### `env` and `envFrom` are two doors to one room

T14c asserted that no workload but the predeploy Job reads the two variables, and
proved it against seven mutations — backend, worker, storefront, PostgreSQL,
Redis, a second Job, and a hardened `initContainer`. The PostgreSQL case is the
one that earns it: that workload already reads a *different* key of the *same*
Secret and is still refused, so the check keys on variable names rather than
Secret ownership.

**It read `container['env']` and nothing else.** A container taking the whole
Secret through `envFrom` receives every key, including both, and the test passed.

This is not the enumeration failure this build has recorded four times. Nothing
was blacklisted. **The assertion read one field where Kubernetes offers two paths
to the same outcome** — and the comment above it enumerated the routes it had
closed and read as exhaustive, which is what made it convincing. The repository
uses `envFrom` nowhere, so the guard was free.

The fix also asked whether the shape existed elsewhere. It did: a base variable
with no overlay entry rendered the **live** Secret name into the test namespace
and passed. That assertion now covers every rendered `secretKeyRef`, which closes
the class rather than the instance.

### The premise was in four places, and the brief found two

T14b falsified the sentence *"this repository's predeploy chain never seeds an
Admin user."* The orchestrator's briefs named two sites. There were **four,
across three files** — a projection's row header, a second comment beside a
different projection, `scripts/openbao-admin`, and an independent assertion in a
runbook narrative that did not cite the others at all.

**A false premise propagates by restatement, not only by citation.** Grepping for
the sentence finds the copies; it does not find the paraphrases.

### And a row can invert the reference it is copying

T14d wrote that Lousy Deal needs no separate administrator row *"unlike Plepic's
equivalent one-off `npx medusa user` command."* Plepic's `predeploy` runs
`seed:administrator`, and its Job reads the same two keys from its own
`database-admin` Secret. **It is the identical mechanism** — the sentence
described the reference as the opposite of what it is, in a row whose entire
method was to copy it.

The usual failure here has been carrying a true sentence into a repository where
its referent does not exist. This is the inverse: a *new* sentence about a
reference the author had open.

### What the three rows leave true

The credential exists end to end, and each end names the others correctly:

```text
deploys   secretKeyRef.key: MEDUSA_ADMIN_EMAIL   from lousydeal{,-test}-database-admin
orange    target_key: MEDUSA_ADMIN_EMAIL  <-  property: medusaAdminEmail
lousydeal requireEnv(environment, "MEDUSA_ADMIN_EMAIL")
```

T14d held both properties that cost T14a three passes — required metadata reads
unchanged at 50, and no empty policy in a desired set of 37 — **measured
together**, which is the discipline that row's failure taught. The non-lousydeal
projection contract hashes identically before and after.

**Still open, and now the only thing between here and a running storefront:** an
operator must sign in as this administrator once T15 deploys the backend, mint
the publishable key, and stage it for seeding. No row does that, and
`docs/current/provisioning.md` says so.

## T15b: the assert that only a real run could fail

E4 executed twice — test, then live, as separate actions the seed guard
enforces. All four sources landed at **version 1**: first writes, no rotations.
Widening the source for SMTP beforehand is what bought that; seeding eight
fields and needing ten would have been a rotation of a live credential.

The Secrets render with exactly the expected keys, and the eight-key runtime
Secret is the point: `smtpUsername` and `smtpPassword` are **in OpenBao and
deliberately not projected**, because nothing in `deploys/lousydeal` consumes
SMTP yet. A credential seeded once, waiting for a consumer, rather than a live
value sitting in a pod's environment for no reason.

### What six review passes could not have found

`roles/argocd/tasks/plepic.yml:45-47` asserts that every entry of the **global**
`argocd_openbao_enabled_optional_sources` is one of **Plepic's** optional
sources. T14a gave Lousy Deal six optional sources; `plepic.yml` imports before
`lousydeal.yml`. So the first time anyone enabled a Lousy Deal source, Plepic's
assert failed and took the entire `argocd` role down for every tenant.

**T14a had three review passes and T15 had three. None caught it. None could
have.** Both enable lists were empty for the whole of that work, so the assert
had nothing to reject — it was correct on every input it had ever seen. **The
defect existed only in a state no test constructed and no reviewer could reach
by reading.**

A single real run found it in under three minutes.

**This is the argument for effect gates, made by the mechanism rather than about
it.** The gate exists because some facts are only available by doing the thing.
Six passes of adversarial review over two rows in the same role, and the fault
was one import-order-plus-scope interaction that no amount of reading the diff
would surface.

### It failed in the right direction

The run stopped at an `assert`, before `applications.yml`. Namespaces, Pod
Security labels, the `lousydeal` AppProject and both environments'
ExternalSecrets were created; **no Application was created and no workload
started.** Nothing is half-deployed, and the state it left is exactly the state
T15b needed to verify itself.

**A guard that fails closed converts a design error into a diagnosis.** Had that
assert been advisory, the role would have continued into `lousydeal.yml` and the
first symptom would have been a sync waiting out its retry budget — the failure
mode T15's own review spent three passes eliminating, arrived at through a
different door.

### And the scope error is worth naming precisely

The comment above the allowlist says it exists so *"an inventory typo fails this
assertion instead of silently rendering no ExternalSecret"*. That intent is
right and applies to every consumer. What was wrong was the **scope**: a check on
a global variable, derived from one application's namespaces, living in that
application's task file.

**A shared variable validated against one consumer's expectations is a
constraint on every other consumer that none of them can see.**

## T15a: what a green run proved that no review could

`lousydeal` **Synced/Healthy**, all five workloads Running, 136 tasks, zero
failed — the whole platform reconcile green, Plepic and Servitium included.

**The value of E5 was not the deployment. It was the evidence.** Most of this
build had been asserted rather than executed, and one run settled all of it at
once: T11's images pull from GHCR; T4's migrations run against a real
PostgreSQL; T5's Redis preflight passes; T7's seeding runs; T13's manifests
render, schedule and satisfy Pod Security; and **T14b's `seed:administrator`
created an identity that actually works — the orchestrator authenticated as it
to mint the publishable key.** A credential chain spanning three repositories,
end to end, on the first attempt that got that far.

**And `lousydeal-test` sitting at `OutOfSync` is the gate working.** Its overlay
still carries the all-zero sentinel because `Deploy Test` has never run. Three
review passes went into making that refusal correct rather than incidental, and
it refused.

### Four failed runs, and none of them were the code

E5 took five attempts. What stopped each is worth recording, because none was a
defect in the row being deployed:

1. **`plepic.yml`'s allowlist** — a global variable validated against one
   application's list. T15d. Six review passes could not have found it; a run
   found it in three minutes.
2. **`argocd_lousydeal_environments` unset** — the role default is the sanitised
   example, `example-owner` and RFC 5737 addresses, and the assert requires the
   URL to derive from the real repository. Missing inventory, not missing code.
3. **The publishable key** — the gap recorded at T14a, arriving exactly where
   predicted: `CreateContainerConfigError`, `secret "lousydeal-publishable-key"
   not found`. **The row that closed it was the row that had created the
   identity able to close it.**
4. **The ACL policy not yet widened** — the orchestrator enabled the source and
   ran `argocd.yml`, when `reconcile-access` — which writes the widened policy —
   lives in `playbooks/openbao.yml`. T14a's own runbook says so, in the sentence
   T14c corrected for exactly this reason. **Read and then not applied.**

**Three of the four were configuration the code correctly refused to proceed
without.** Every one failed closed, named its cause, and cost a re-run rather
than a rollback. That is what the assertions were for.

### The one that was the orchestrator's

Number four. The runbook sentence was corrected two rows earlier *because* it
named the wrong variable, and the corrected version says plainly that
`openbao_required_optional_sources` "is what `validate` and `reconcile-access`
actually read". Having commissioned that correction, the orchestrator then
enabled the source and ran the wrong playbook — and spent 120 ExternalSecret
retries discovering it.

**Knowing where a fact is written down is not the same as recalling it at the
moment it applies.**

## T19: the first constraint code could not satisfy

```text
lousydeal        Synced   Healthy
lousydeal-test   Synced   Healthy
node cpu  11930m (99%)  ->  10930m (91%)
```

Ten pods across two environments, all Running, both on freshly built images.

**Everything until now failed because something was wrong. This failed because
the node was full.** T13 requested 200m per workload in live and 100m in test;
measured against the running deployment, every pod used **1–19m**. Ten pods
reserved 1700m for 77m of work, the node reached 99% of twelve allocatable CPUs,
and live's predeploy Job stopped scheduling — so live could not adopt a new
digest, which is every future release.

**Nothing in a rendered manifest says whether a number is right.** T13 had two
review passes and neither questioned `200m`, because there was nothing to
question: it is a plausible figure, correctly formatted, in a valid manifest. It
became wrong only when a second application's two environments were added to a
node that had been sized without them. **The same class as `plepic.yml`'s
allowlist — correct-looking, and unfalsifiable by reading.**

### Measuring found the opposite problem too

The operator chose to lower the requests. Measuring first was optional and was
done anyway, which is what caught it: **memory is under-requested, not over.**
Live's backend uses 298Mi against a 256Mi request; test's uses 260Mi against
128Mi — the scheduler underestimates test by roughly half.

A blanket "reduce the requests" would have made a real problem worse while
fixing an imaginary one. **The instruction was to lower usage; the measurement
said lower CPU and raise memory.** Memory was left alone as outside the row and
recorded in the README, so the next person to size this does not re-measure.

### And a figure in the row itself was wrong

The plan row this journal closes said T13 set `200m` "for every workload in both
overlays". It set 200m in live and 100m in test. The orchestrator read live's
overlay and generalised — the same shape as the reference-describing errors this
build has recorded repeatedly, committed while writing the row that fixes a
guess. **Corrected in the row text.**

The assertion is pinned, because the failure mode is silent: a request that
drifts back up looks like nothing at all until a Job stops scheduling.

## T17: the row that checks the assembly

```text
run cold   Test Files 1 passed (1)  Tests 3 passed (3)  48s
run warm   Test Files 1 passed (1)  Tests 3 passed (3)  44s
run dirty  Test Files 1 passed (1)  Tests 3 passed (3)  45s

lousy-deal       calculated_amount=5   with_tax=5   without_tax=4.03
lousy-deal-plus  calculated_amount=10  with_tax=10  without_tax=8.06
lousy-deal-pro   calculated_amount=25  with_tax=25  without_tax=20.16
POST /store/carts -> cart_...  line item total=5
```

Real PostgreSQL and Redis on the digests the cluster runs, a real migration and
the whole `predeploy` chain, a real Medusa process, real HTTP. Nothing stubbed,
because a stubbed smoke check re-creates precisely the failure it exists to
catch.

### The check is real, and its blind spots are known

Twelve mutations were applied to the production code and the check re-run.
It caught the `provider_id: null` defect it is named after — the same
`{"code":"unknown_error"}` 500 the previous build served — a missing tier,
`automaticTaxes: false`, a wrong region currency, and Redis stopped mid-run.

Four survived: a mispriced tier, a changed VAT rate, a fourth tier, and tax
regions written for Estonia alone. **Every one is caught by the unit suite**,
verified by running it rather than assumed. **No mutation escaped the build.**

The loudest survivor is worth naming. Dropping all three Redis modules from
`medusa-config.ts` leaves this check green: Redis up, healthy, PING-ed by the
preflight, and entirely unused while Medusa logs its own in-memory fallback.
**A smoke check asserts what it asks about.** This one asks the Store API
questions the storefront asks; it does not ask which module answered. Recorded
rather than fixed — the unit suite holds that line, and widening the row to
cover it would have made the assembly check an assembly-and-wiring check.

### Refusing rather than skipping is half the row, and it holds

Nine misconfiguration doors were tried: unset, empty, whitespace, absent
administrator variables, a URL at nothing, a URL at something that is not
Medusa, `podman` absent, `curl` absent, Redis stopped. **None passed, none
skipped silently, none hung.** With the URL unset no test is collected at all.

### The defect class did not change in the last row either

Four comments asserted something untrue: a count of four where there are three,
a claim that the backend is not containerised while all three cluster workloads
run its image, a "one-line change" that is three lines, and a drift guarantee
that cannot hold because the two pinned files sit in different repositories with
no shared check. **The last of these is the interesting one** — the pins being
in exactly two places is correct and is what the row asked for; what was false
was the sentence about how drift would be noticed.

Nothing blocking was a defect in the check. **In the row whose whole subject is
that green tests can lie, every blocking finding was a sentence.**

### An override that could only fail

The script offered two port variables `compose.yaml` never reads. Setting either
pointed Medusa at a port nothing published — it refused loudly rather than
passing, but a knob whose only outcome is refusal is worse than no knob. Both
deleted, with the concurrency claim that justified them: two runs from one
checkout share a database name and a server port regardless.

### The universal this row was allowed to falsify

`database-url.ts` said "no compose file, no CI job, no deployment manifest sets
one". This row creates the compose file. The correction names it and states why
it sets no `DATABASE_URL` at all, and the remaining universals were enumerated
to check it: three workflows, none mentions `DATABASE_URL`; nine base manifests,
all projecting the five parts and never a URL.

## T16: the first hostname, and the first thing an outsider can touch

```text
lousydeal.com NS via dns.google  ->  walk.ns.cloudflare.com. / nick.ns.cloudflare.com.
test.lousydeal.com A             ->  188.114.96.1, 188.114.97.1   (proxied)

unauthenticated GET https://test.lousydeal.com/  ->  302
  -> servitium-future-ee.cloudflareaccess.com/cdn-cgi/access/login/test.lousydeal.com
     meta token carries "auth_status":"NONE"
authenticated                                    ->  the storefront   (operator, browser)
```

Both halves of the checkbox, and the second one is the operator's because no
agent can hold a Google identity.

### The session length was two knobs wearing one name

`session_duration: "24h"` appeared twice in `scripts/cloudflare-add-web`, and
only one belonged to this row. The other is the **Cloudflare Access
organisation default**, shared with Plepic, Servitium and every application on
the account. **Lowering it would have shortened every one of those sessions, and
no test in that repository would have caught it** — `organization_body` takes no
route and is structurally unreachable from one.

The application's value moved onto the `Route` dataclass instead, defaulting to
`24h` so every existing route renders byte-identically, and the new route
carries `1h`. Verified by rendering before and after and diffing, and by
reverting the body to a literal `24h` and watching a test go red.

### The run had to carry seven routes it was not about

`ensure_tunnel_configuration` PUTs the whole ingress array built from `--route`
alone. **A Lousy Deal-only invocation would have deleted Plepic's five routes
and the campaign zone's two**, taking those sites down — the helper does not
merge, it replaces.

So the live values were read back from the Cloudflare API rather than taken from
the sanitised example in `networking.md`: tunnel `orange-web`, organisation
`servitium-future-ee`, and one named address on all three existing gated
policies, which is what let a single `--access-email` reproduce current state
exactly instead of narrowing somebody else's. The dry run then reported 21
resources `unchanged` and three to create, which is the assertion that the
reproduction was faithful.

### Two arguments the script refuses before it dials

`--zone-name lousydeal.com` and `--access-email` are both mandatory here, and
neither is obvious from the row: a route hostname outside every declared zone is
refused during argument validation, and a gated route with no named address is
refused there too. **Both fail before Cloudflare is contacted**, which is the
right direction — but the pull-request body named neither, and the first run
died on the first of them.

### An unconditional write to shared infrastructure

Every run of this helper `PUT`s the Google identity provider, because Cloudflare
never returns a client secret and the script therefore cannot compare. It writes
the same credential to the same provider ID, so the `allowed_idps` references in
Plepic's and Servitium's applications stay valid. **Expected, inherited, and
worth naming**: a row that publishes one hostname also rewrites a credential
three other applications authenticate against.

## T20: the Admin, reachable and gated

```text
live   lousydeal-backend         8122   [192.168.21.2]
       lousydeal-storefront      8121   [192.168.21.2]
test   lousydeal-backend-test    8132   [192.168.21.2]
       lousydeal-storefront-test 8131   [192.168.21.2]

allow-backend-ingress (live), read from the running cluster:
  [0] podSelector component=storefront   port 9000
  [1] ipBlock 192.168.21.2/32            port 9000

lousydeal  Synced Healthy    lousydeal-test  Synced Healthy

Access applications, all session=1h, all 'Named Google accounts' allow:
  lousydeal.com   www.lousydeal.com   admin.lousydeal.com
  test-admin.lousydeal.com   test.lousydeal.com
orange-web: 13 ingress rules (Plepic's five and the campaign zone's two intact)
```

**The trap is avoided in the cluster, not only in the render.** Index 0 is still
the storefront's pod selector.

Both halves of the second checkbox, measured from outside the WireGuard mesh
once DNS had propagated:

```text
lousydeal.com             HTTP 302  cdn-cgi/access/login/lousydeal.com
www.lousydeal.com         HTTP 302  cdn-cgi/access/login/www.lousydeal.com
admin.lousydeal.com       HTTP 302  cdn-cgi/access/login/admin.lousydeal.com
test-admin.lousydeal.com  HTTP 302  cdn-cgi/access/login/test-admin.lousydeal.com
test.lousydeal.com        HTTP 302  cdn-cgi/access/login/test.lousydeal.com
```

**Five hostnames, five refusals, no content served.** The authenticated
direction is the operator's, for the same reason it was at T16: no agent holds a
Google identity.

### Copying the reference's file was not the same as copying the reference

The base carried `192.168.0.0/16`, taken from `plepic/base/networkpolicy.yaml`.
But that `/16` is a **placeholder each environment's Orange patch replaces**, and
Lousy Deal's template patches only `allow-storefront-ingress`. So Plepic's Admin
admits **one address** and this row as written would have admitted **65,536**.

The path was real: `192.168.1.0/24` is inside `wireguard_peer_allowed_ips`, `wg0`
is a trusted interface, and the forward chain's policy is `accept`. Any host on
the operator's home LAN could have opened the Medusa Admin **without Cloudflare
in the path at all** — making decision `010`'s *"reachable only through
Cloudflare Access"* false for that route.

**Narrowed to `192.168.21.2/32`**, the address the tunnel connects from, which
makes the decision true on merge rather than conditional on a row that does not
exist.

### Replacing the port, not adding one

`externalIPs` applies to **every** port on a Service, so a second port would
publish the raw container port `9000` on the shared address. The Service's port
becomes `8122`/`8132`, matching the reference exactly. Every consumer was
enumerated across both repositories: nothing still addresses `9000` through the
Service, and the NetworkPolicy's `9000` stays correct because policy ports are
container ports.

**The coupling that created was asserted nowhere**, and nine of twelve surviving
mutations sat on it. A drift between the Service port and `MEDUSA_BACKEND_URL`
ships a storefront that cannot reach its own backend, and no manifest test
would have said so.

### Four distinct numbers assert nothing about which four

`orange`'s registry gained `backend_port`, and `unique | length == 4` **survived
changing 8122/8132 to 9122/9132.** The reference does not leave this open —
`plepic.yml:77` pins its four literally. Lousy Deal now does too.

### And the assertion being widened was protecting two properties

`platform-verify`'s check asserts the port set **and** that every `externalIPs`
entry is the management address alone. The row had authority over the first
only. It survived byte-identical — **and had no test in either application**.
It has one now, for Lousy Deal; Plepic's gap is pre-existing and was left alone.

**The sharpest finding was one the implementer argued correctly and then guarded
backwards.** Its own comment says the declared pair is the side that is *not*
already sorted; the guard asserted the sort on the other side. It passed only
because `[8121, 8122]` happens to be ascending.

## T21: the fact that referenced itself

```text
before  orange-host : ok=13   failed=1   (aborted at task 14)
after   orange-host : ok=102  failed=0   exit=0
```

`set_fact` templates **every** key of one call before writing **any** of them
back to host facts, so a second key cannot see the first. Split into two tasks.
The requirement it was implementing — an environment is ready only if it also
exists, T15's MAJOR C4 — is untouched.

### Four checks proved the expression and none could see the defect

This suite already proved four expressions by extraction-and-render. But each
calls `lookup('template', …)` on an isolated Jinja **expression**, against facts
the play has already set — and **every MAJOR C1–C4 fixture pre-seeds
`argocd_lousydeal_existing_namespaces` itself** before rendering the readiness
expression. That pre-seeding sidesteps the exact failure.

**The tests were not weak. They were testing the expression, and the defect was
in the task.**

The new one writes the real extracted task text to a file and runs it through
the real `set_fact` action with only upstream fixtures, never pre-seeding either
output. It keys on a literal that predates the fix and survives it — not a task
count or a task name, which is what the fix changes.

```text
re-merge the two keys into one task    caught  (byte-identical to the real error)
drop the existence conjunction         caught
swap the two tasks                     caught
```

The third is new risk this row created: splitting a task makes ordering
load-bearing where it was not.

### What it cost to find

**Nothing that ran between T15 and now could have caught it.** The 42 contract
playbooks, every render diff, T20b's whole suite — all render task text and
resolve no runtime fact. `platform-verify.yml` is operator-invoked and had not
run since T15 merged, eight rows earlier.

**The same shape as `plepic.yml`'s allowlist at T15d**: correct-looking,
unfalsifiable by reading, found in seconds by a real run. That is twice in this
build that the only adequate test was execution.

### And the run surfaced something older

With the fix in, the play reached task 96 and stopped on a pod named
`oom-probe-default` in the `n8n` namespace — created 2026-08-24, five days
before this build began, carrying **no `ownerReferences`** and named nowhere in
`orange`. A hand-applied leftover, correctly refusing to let the platform check
call the cluster clean. The operator deleted it; the run then completed at
`ok=102`.

## T18a: the webhook path, and the header nobody was carrying

```text
resolveStoreApiPath("/api/store/hooks/payment/stripe_stripe")
  -> "/hooks/payment/stripe_stripe"
headers Medusa sees  ["content-type","accept","stripe-signature","x-publishable-api-key"]
raw body             byte-identical
```

### The row admitted the path and still could not have worked

The proxy forwarded exactly two request headers. Stripe's verification reads a
third — `stripe-base.js:511` takes `data.headers["stripe-signature"]` and hands
it to `constructEvent`, which throws on `undefined`. **And
`hooks/payment/[provider]/route.js` answers Stripe `200` before that ever
runs**, so every delivery would have failed silently, with no retry and no
Stripe-side alert.

The reference does not have this because its forwarder is a **denylist** —
delete `host`, `content-length`, hop-by-hop, keep the rest. T10 replaced that
with a two-name allowlist for good reasons, and **an allowlist is a list of
things someone thought of.** The one nobody thought of was the only header the
row existed to carry.

**A row can admit a path, forward the body byte-for-byte, and still not
deliver.**

### The defence this row leaned on had no test

Deleting the proxy's fifth defence — the post-normalization re-check — passed
**all 484 tests** while opening seven working Admin-API bypasses **through the
namespace this row admits**:

```text
"/api/store/hooks/.\t./admin/users"        -> "/admin/users"
"/api/store/hooks/%2\te%2\te/admin/users"  -> "/admin/users"
```

The WHATWG parser strips U+0009/000A/000D before parsing, so the per-segment
check never sees a dot segment. **That family defeats defences 1–4 and is
stopped only by the fifth.**

The test file already knew: its comment said the escapes above it "already
return null from the per-segment check first" and pointed at *"the 'fails
closed' evidence in the row's report"*. **The evidence went into a report and
the suite got an assertion that passes whether or not the line exists.** Every
traversal test in the file was written against `store`; not one against `hooks`.

### The posture itself held

483,120 crafted paths and 200,000 fuzzed ones — traversal in six encodings, five
layers of double-encoding, tab splicing, unicode homoglyphs, overlong UTF-8,
null bytes, `..;`, case variants. **No bypass.** Admitting `hooks` widens the
namespace allowlist and touches none of the other four defences, as claimed.

### And the pin that was not one

Both `pp_` → `px_` and `pp_stripe_stripe` → `pp_stripe_wrong` passed the entire
suite. The test derived the segment from `STRIPE_PROVIDER_ID` to avoid "carrying
its own copy that could drift" — but **that constant is itself a hand-written
literal**, so the spelling was unpinned end to end. The same limit the
implementer correctly identified for `ALLOWED_NAMESPACES` and closed with a
literal, unclosed one function away.

### Recorded for T18b

`hooks/payment/[provider]/route.js:11-23` emits to the event bus with
`delay: 5000, attempts: 3` **before any verification**, carrying the caller's
body. After this row any anonymous `POST /api/store/hooks/payment/<anything>`
enqueues that work — **and T18b is what removes the Access gate in front of
it.**

## Reconciling the record with itself

Two defects in the record, neither in the delivered work. Both are the
orchestrator's.

### T15c was done for a day and the ledger said `open`

The row merged into `orange` on 2026-09-03 as PR #50 (`5d85098`).
`scripts/openbao-admin:1038-1039` carries `smtpUsername` and `smtpPassword`,
both runtime sources take ten fields, and
`tests/external_secrets_templates.yml` passes at `ok=30, failed=0`. **The PR was
merged and the row was never closed.**

Its evidence was already written down — under **T15b's** heading, which is where
the seed ran:

> Widening the source for SMTP beforehand is what bought that; seeding eight
> fields and needing ten would have been a rotation of a live credential.

That is both halves of T15c's checkbox, recorded a day before the row it belongs
to was closed. The ledger's `evidence-ref` now points there.

**The mechanism's rule caught this and I did not**: *a row without an
evidence-ref is not done, whatever it claims.* T15c had none, and for a full day
I reported three rows remaining when there were two.

### Twenty-five ticks that were never made

The plan showed **14 boxes ticked against 39 rows done**. Ticking began at T12a
(`791e853`); every row before it — T1 through T11, T13 — was completed and never
marked, and T15d joined them later.

**No drift resulted**, because row identity is a hash of the checkbox text with
the `- [ ]`/`- [x]` marker stripped, so ticking cannot move a hash. The ledger
was correct throughout. But the plan is the human-readable artefact, and it said
28 rows were open when two were.

Reconciled by deriving each mark from the ledger's own `status` rather than
ticking in bulk — **so the reconciliation cannot silently tick a row that is
genuinely open.** It ticked exactly 25 and left the rest alone.

**The record is the deliverable too.** A build whose whole method is that a
claim must be bounded, cited or executed spent a day claiming a row was open
because nobody executed the check on the checker.
