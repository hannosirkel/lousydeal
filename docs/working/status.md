# Initiative status

**The resume point.** Read this first, do `Next action`, and update this file
before you stop for any reason. The contract this executes is
[`fresh-build.md`](./fresh-build.md); §27 there states what belongs here and what
does not.

| | |
| --- | --- |
| Updated | 2026-08-29 |
| Current slice | LD-01, in execution. M2 begun; 8 of 28 rows done. Plan audited 2026-08-30. |
| Next action | `resume implementing lousydeal/docs/working/ld-01-foundation.md using big-build`, once T4's pull request merges. Next row is T5, Redis wiring and preflight. |

Nothing in this file is a secret. No credential value, no live private hostname,
no rendered Secret. It is public, like the rest of the repository.

## Next action, in full

LD-01 is executing. [`ld-01-foundation.md`](./ld-01-foundation.md) holds 28
rows — it began at 26; see *Rows added during execution* below — and its
`big-build` binding is at
`myskills/skills/big-build/plans/ld-01-foundation.md`. **The authoritative row
state is [`ld-01-foundation/ledger.md`](./ld-01-foundation/ledger.md)**, which
survives a compaction this file does not attempt to.

Preflight ran clean on 2026-08-29 and was confirmed. All five external accounts
are held, all twelve declared absences verified absent, and two missing tools
resolved: Ansible from `orange`'s virtualenv, `kubeconform` installed.

**T1a, T1b, T2a and T2c are merged; milestone M1 is complete. T2b — making the
dependency refusal actually refuse — is done and open as a pull request.** When
it merges:

```text
resume implementing lousydeal/docs/working/ld-01-foundation.md using big-build
```

Resume re-runs the whole preflight, recomputes every checkbox hash against the
ledger, and re-verifies external state before continuing. **M2 begins at T3**,
the backend runtime configuration — the first row of application code in this
build.

**Effect gate E0 is executed, not outstanding.** The branch ruleset now requires
five contexts — `Documentation`, `Shell`, `Workflow lint`, `Secret scan` and
`Canonical validation`. The pre-change JSON is retained as rollback. No further
effect gate fires until T12.

### Rows added during execution

The plan began at 26 rows and is at 28. Each addition repaired a defect that no
existing row had the authority to touch, which is the `Files`-list discipline
working rather than failing.

| Row | Why |
| --- | --- |
| T2b | `scripts/validate`'s `npm ci` refusal never fires when the same tools exist globally |
| T2c | T2's verification was unreachable from inside T2 — `sync-baseline` writes here, not in `architecture` |

T2b also carried the plan's ninth global constraint, added because the same
class of failure had by then occurred three times.

No checkbox text was ever edited, so no ledger row has been re-keyed. Every
amendment recomputed all hashes and reported no drift.

### Open questions, and one that will mislead you

Read [`ld-01-foundation/open-questions.md`](./ld-01-foundation/open-questions.md)
before starting a row. **Q3 in particular:** from T2c onward `habit-hooks`
reports `incomplete-run` in this repository, because three generated sensors have
no installed tool. `AGENTS.md` tells you to run `habit-hooks` before declaring an
edit done. **That output is Q3, not something you broke.** `plepic` has the same
three failures; the remedy is in `architecture` and is tracked outside LD-01.

### What milestone M1 cost, and what it teaches the rows after it

Four rows, eleven review passes, two Blocking and eight Major findings. Almost
every one had the same shape: **a change that passes its own verification today
and fails silently later, in a file no later row has the authority to repair.**

- The root Vitest config would have left thirteen of the plan's test suites
  running in no gate at all — the failure the reference implementation records
  having already suffered once.
- A CI job installed a binary from an archive member that does not exist, so it
  would have been red on every run, permanently.
- A workspace list derived through `mapfile < <(node …)` swallowed failure,
  because `set -euo pipefail` does not cover process substitution.

Two habits earned their cost and should continue: **run the command on an
unconfigured checkout**, since CI and an author's machine are both configured
environments and neither exercises the refusal path; and **check what a test
actually demonstrated**, since two separate fixtures here passed for the wrong
reason before anyone noticed.

Carried forward:

**Q4 is answered, and the answer is a rule rather than a patch.** Three tracked
documents had been left stating the opposite of the truth because the row that
falsified them had no authority to touch them. The plan gained **global
constraint 9** at T2b: a row that falsifies a tracked document carries that
document in its `Files` list. It is copied verbatim into every subagent's
context packet, so the remaining rows inherit it. `README.md` was corrected in
the same row.

### The gates this slice will ask for

| Gate | When |
| --- | --- |
| Merging T12 | it *is* a live deployment, and `Release` fires on the merge that introduces it |
| Seeding OpenBao, T14 | one credential at a time, test only |
| Creating namespaces, T15 | the row that starts workloads |
| Access policy, then DNS, T16 | in that order — the reverse leaves a public ungated hostname |

### The Gate A decisions this plan executes

| Decision | Outcome |
| --- | --- |
| [`001`](../decisions/001-one-repository-two-images.md) | one repository, `backend` and `storefront` workspaces |
| [`002`](../decisions/002-rebuild-live-from-merged-main.md) | rebuild live from merged `main`, as Servitium and Plepic do |
| [`003`](../decisions/003-own-postgresql-per-environment.md) | an own PostgreSQL StatefulSet per environment |
| [`004`](../decisions/004-trader-identity-is-runtime-configuration.md) | trader identity from runtime configuration, resolved into placeholders |
| [`005`](../decisions/005-secret-source-naming.md) | superseded by `006` |
| [`006`](../decisions/006-two-naming-categories-in-keys.md) | registered sources application-first; provider staging files provider-first |

The certificate PDF renderer is the one Gate A question deferred, to LD-02
planning. No LD-01 row depends on it.

Gates B and C — brand and copy, then visual direction — gate the storefront
surfaces, not the LD-01 foundation. They can run in parallel with LD-01.

## In flight

**T4**, open as a pull request: the database URL and its TLS resolution, and the
first Medusa dependency. Carries an operator-approved size override.

**The plan was audited on 2026-08-30 and the order changed.** T13 now runs before
T12; T14's second checkbox became T15b, after T15. Roughly twenty file-list gaps
were closed, including one that would have stopped T4 on its first command. See
the ledger's Amendments section before starting any row.

**T3b must fix `backend/tsconfig.json` before anything builds.** It sets
`noEmit: true`, which Medusa's compiler passes through while guarding only on a
flag TypeScript leaves `false` — so `medusa build` writes zero files, reports
success, and yields an image that cannot start. T3b is the last row authorised to
touch that file. This is written into the plan's T3 section; do not start T3b
without reading it.

## Done

| What | Evidence |
| --- | --- |
| Catalogue entry | `architecture` `universe/repositories.yaml`, `lousydeal:`, `languages: [shell, typescript]`, `npm_project: true`; `lifecycle` dropped at T2a |
| `sync-baseline`, then a clean audit | `tooling/universe audit lousydeal` → `clean: 1 repositories audited`, 2026-08-28 |
| Repository bootstrap | `README.md`, `AGENTS.md`, `CLAUDE.md`, commit `a201410` |
| One canonical validation command, and CI runs it | `scripts/validate`, `.github/workflows/validate.yml` |
| Secret scanning | `gitleaks` 8.30.1 pinned by version and SHA256, `fetch-depth: 0`; tracked `.githooks/pre-commit` |
| Workflow hardening | every action pinned to a commit SHA, top-level `permissions: contents: read`, `persist-credentials: false`, `zizmor` |
| Markdown and link gates | `.markdownlint-cli2.jsonc`, `lychee.toml` |
| Dependency automation | `renovate.json` extending the `architecture` default template |
| Plan registered centrally | `architecture` `notable_local_work`, by link |
| Branch ruleset, complete | `deletion`, `non_fast_forward`, `pull_request`, and `required_status_checks` on five `Validate` contexts — `Canonical validation` added by effect gate E0 at T1b — restricted to the GitHub Actions app, ruleset 21687602 |
| This resume point, and contract §2b | pull request #3, merged 2026-08-28, four checks green |
| Reuse assessment against `plepic` (§2) | [`docs/current/plepic-reuse.md`](../current/plepic-reuse.md), 2026-08-28, against `plepic` at `8f367cb` |
| Gate A, and decisions `001`–`005` | pull request #8, merged 2026-08-28; `005` later superseded by `006` |
| LD-01 plan and its `big-build` binding | [`ld-01-foundation.md`](./ld-01-foundation.md), conformance-checked; binding in `myskills` |

## Blocked and open

| Item | State | Needed by |
| --- | --- | --- |
| Certificate PDF renderer | deferred by Gate A — no LD-01 row depends on it | LD-02 planning |
| Release-failure notifier | open, not yet applicable — there is no build to fail | before the first LD-01 deployment |
| `docs/issues/` | correctly absent — an empty directory fails conformance | the first known issue |

## Gates

Contract §21.

| Gate | What it approves | State |
| --- | --- | --- |
| A | product scope is internally coherent | **passed 2026-08-28**, operator, decisions `001`–`005` |
| B | brand and copy, reviewed as copy | not started |
| C | visual direction, before any major surface is built | not started |
| D | per-task code review, top tier, fresh context | not started |
| E | rendered UI, desktop and mobile, against the approved design | not started |
| F | integration, before production | not started |
| Legal | operator gate, blocks publication (§23) | not started |

## Slices

Contract §17. None are started.

| Slice | What it delivers | State |
| --- | --- | --- |
| LD-00 | governance foundation | closed, except the release-failure notifier, which has no build to watch yet |
| LD-01 | foundation: store, Stripe, three products, checkout, test deploy | **in execution**, 28 rows; M1 complete |
| LD-02 | certificates, public page, vector PDF, email, idempotency | not started |
| LD-03 | gifting | not started |
| LD-04 | Printful, three merch items | not started |
| LD-05 | Baldrick | not started |
| LD-06 | price-increasing discount codes, and their tracking | not started |
| LD-07 | Enterprise | deferred by operator decision, not in V1 |
| LD-08 | launch polish, accessibility, analytics, final reviews | not started |

Each slice gets its own plan at `docs/working/ld-0N-<slice>.md` when it starts,
and its own `big-build` binding. LD-01's is written; no other exists.

## Operator items

What is actually held, as against what the contract expects in §2b.

| Item | Held | Note |
| --- | --- | --- |
| Domain `lousydeal.com` | yes | DNS not yet published |
| Company identity, Aislopica OÜ | yes | §2b |
| Stripe test-mode keys | yes | `.keys/stripe-lousydeal-test` in the Orange checkout, provider-first per `006`; not yet seeded into OpenBao |
| Stripe live keys | no | not before the publication gate, by design |
| Printful account and sandbox | no | request before LD-04 |
| SMTP transactional credentials | no | request before LD-02 |
| Cloudflare Access policy for `test.lousydeal.com` | no | request before the LD-01 deploy |

No credential has been seeded into OpenBao yet. The path is §2b, step 1 to 6.

## Deployment

Nothing is deployed. There is no `deploys/lousydeal/` overlay, no Argo CD
`Application`, no namespace, and no image. The cutover plan, when it exists,
goes to `orange-inventory/docs/working/` and not here.

## Deferred ideas

None recorded. When there is one, it goes to `docs/working/backlog.md` rather
than quietly into V1 scope (§25).
