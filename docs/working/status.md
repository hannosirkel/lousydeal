# Initiative status

**The resume point.** Read this first, do `Next action`, and update this file
before you stop for any reason. The contract this executes is
[`fresh-build.md`](./fresh-build.md); §27 there states what belongs here and what
does not.

| | |
| --- | --- |
| Updated | 2026-08-29 |
| Current slice | LD-01, in execution. Row 1 of 26 done, in review as a pull request. |
| Next action | `resume implementing lousydeal/docs/working/ld-01-foundation.md using big-build`, once T1a's pull request merges. |

Nothing in this file is a secret. No credential value, no live private hostname,
no rendered Secret. It is public, like the rest of the repository.

## Next action, in full

LD-01 is executing. [`ld-01-foundation.md`](./ld-01-foundation.md) holds 17
tasks and 26 rows, and its `big-build` binding is at
`myskills/skills/big-build/plans/ld-01-foundation.md`. **The authoritative row
state is [`ld-01-foundation/ledger.md`](./ld-01-foundation/ledger.md)**, which
survives a compaction this file does not attempt to.

Preflight ran clean on 2026-08-29 and was confirmed. All five external accounts
are held, all twelve declared absences verified absent, and two missing tools
resolved: Ansible from `orange`'s virtualenv, `kubeconform` installed.

**T1a — the root npm workspace — is done and open as a pull request.** When it
merges:

```text
resume implementing lousydeal/docs/working/ld-01-foundation.md using big-build
```

Resume re-runs the whole preflight, recomputes every checkbox hash against the
ledger, and re-verifies external state before continuing. Next row is **T1b**,
extending `scripts/validate` and the CI workflow.

### What T1a cost, and why it matters to the rows after it

Three review passes, four Major findings, all the same shape: configuration that
passes its own verification today and fails **silently** later, in a file no
later row has the authority to repair. The root Vitest config would have left
thirteen of the plan's test suites running in no gate — the same failure the
reference implementation records having already suffered. Treat every row that
configures something for later rows with that suspicion.

Two carried forward:

- **T1b must guard its per-workspace typecheck.** `npm run typecheck --workspace
  backend` fails today because no workspace exists. The guard is also a silent
  skip, and no row is obliged to tighten it once T3 lands. T1b's review should be
  pointed at that.
- **`AGENTS.md` and `README.md` still say this repository holds documentation
  only.** False from T1a's merge. T1b corrects them; they are now in its file
  list.

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

Nothing. The last pull request is merged and `main` is green.

## Done

| What | Evidence |
| --- | --- |
| Catalogue entry | `architecture` `universe/repositories.yaml`, `lousydeal:`, `lifecycle: registered-not-implemented` |
| `sync-baseline`, then a clean audit | `tooling/universe audit lousydeal` → `clean: 1 repositories audited`, 2026-08-28 |
| Repository bootstrap | `README.md`, `AGENTS.md`, `CLAUDE.md`, commit `a201410` |
| One canonical validation command, and CI runs it | `scripts/validate`, `.github/workflows/validate.yml` |
| Secret scanning | `gitleaks` 8.30.1 pinned by version and SHA256, `fetch-depth: 0`; tracked `.githooks/pre-commit` |
| Workflow hardening | every action pinned to a commit SHA, top-level `permissions: contents: read`, `persist-credentials: false`, `zizmor` |
| Markdown and link gates | `.markdownlint-cli2.jsonc`, `lychee.toml` |
| Dependency automation | `renovate.json` extending the `architecture` default template |
| Plan registered centrally | `architecture` `notable_local_work`, by link |
| Branch ruleset, complete | `deletion`, `non_fast_forward`, `pull_request`, and `required_status_checks` on the four `Validate` contexts, restricted to the GitHub Actions app, ruleset 21687602, 2026-08-28 |
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
| LD-01 | foundation: store, Stripe, three products, checkout, test deploy | **planned**, 17 tasks and 26 rows; not started |
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
