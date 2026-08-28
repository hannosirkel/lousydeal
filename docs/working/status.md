# Initiative status

**The resume point.** Read this first, do `Next action`, and update this file
before you stop for any reason. The contract this executes is
[`fresh-build.md`](./fresh-build.md); §27 there states what belongs here and what
does not.

| | |
| --- | --- |
| Updated | 2026-08-28 |
| Current slice | none. LD-00 closed, Gate A passed, LD-01 not yet planned. |
| Next action | Write `docs/working/ld-01-foundation.md`, then its `big-build` binding. See below. |

Nothing in this file is a secret. No credential value, no live private hostname,
no rendered Secret. It is public, like the rest of the repository.

## Next action, in full

Gate A is passed. Five of the six decisions are recorded in `docs/decisions/`;
the sixth, the certificate PDF renderer, is deferred to LD-02 planning because
nothing in LD-01 depends on it.

| Decision | Outcome |
| --- | --- |
| [`001`](../decisions/001-one-repository-two-images.md) | one repository, `backend` and `storefront` workspaces |
| [`002`](../decisions/002-rebuild-live-from-merged-main.md) | rebuild live from merged `main`, as Servitium and Plepic do |
| [`003`](../decisions/003-own-postgresql-per-environment.md) | an own PostgreSQL StatefulSet per environment |
| [`004`](../decisions/004-trader-identity-is-runtime-configuration.md) | trader identity from runtime configuration, resolved into placeholders |
| [`005`](../decisions/005-secret-source-naming.md) | sources named `lousydeal-…` and `lousydeal-test-…` |

The route to executable work, in order:

1. **`docs/working/ld-01-foundation.md`** — the plan, sized to
   `standards/planning.md`: one pull request closes one `- [ ]` row, each row
   names its files, each row states how it is verified, and every file list
   stays inside one repository.
2. **The `big-build` binding** at `myskills/skills/big-build/plans/`. Eleven
   required items, including the effect-gate inventory, the conflict map, the
   context-packet anchors, the pull-request split, and the declared absences —
   a greenfield plan has many, and an undeclared absence fails preflight.
3. **Execute** with `start implementing <plan> using big-build`.

Write the plan to big-build's §4.8 conformance shape from the start. Repairing
checkbox text afterwards re-keys the ledger and needs an explicit operator
instruction, so it is much cheaper to get right first.

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

## Blocked and open

| Item | State | Needed by |
| --- | --- | --- |
| `docs/working/ld-01-foundation.md` | not written — this is the next action | before the binding |
| `big-build` binding for the LD-01 plan | not written — big-build refuses a plan with no binding | before execution |
| Rename `.keys/stripe-lousydeal-sandbox` to `lousydeal-test-stripe` | operator action, decided in [`005`](../decisions/005-secret-source-naming.md) | before the first OpenBao seed |
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
| LD-01 | foundation: store, Stripe, three products, checkout, test deploy | not started |
| LD-02 | certificates, public page, vector PDF, email, idempotency | not started |
| LD-03 | gifting | not started |
| LD-04 | Printful, three merch items | not started |
| LD-05 | Baldrick | not started |
| LD-06 | price-increasing discount codes, and their tracking | not started |
| LD-07 | Enterprise | deferred by operator decision, not in V1 |
| LD-08 | launch polish, accessibility, analytics, final reviews | not started |

Each slice gets its own plan at `docs/working/ld-0N-<slice>.md` when it starts.
None exist yet.

## Operator items

What is actually held, as against what the contract expects in §2b.

| Item | Held | Note |
| --- | --- | --- |
| Domain `lousydeal.com` | yes | DNS not yet published |
| Company identity, Aislopica OÜ | yes | §2b |
| Stripe sandbox keys | yes | `.keys/stripe-lousydeal-sandbox` in the Orange checkout, not yet seeded into OpenBao |
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
