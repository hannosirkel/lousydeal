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
