# LD-01 — execution ledger

Authoritative row state for `ld-01-foundation.md`, executed under `big-build`.
One row per plan checkbox. Row identity is the task number plus a hash of the
checkbox text, never a line number — the plan file moves and this file must
survive it.

`status` is one of `open`, `in-progress`, `done`, `blocked`.
`evidence-ref` points at the journal entry holding the pasted command and its
output. A row without one is not done, whatever it claims.

Started 2026-08-29. Preflight confirmed the same day.

| id | task | repo | hash | class | status | owner | evidence-ref | timestamp |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T1a | T1 | lousydeal | `e6e994deea2a` | AGENT | done | agent | journal, T1a | 2026-08-29 |
| T1b | T1 | lousydeal | `6b6396cec6d0` | AGENT | done | agent | journal, T1b | 2026-08-29 |
| T2a | T2 | architecture | `a13b02ed37da` | AGENT | done | agent | journal, T2a | 2026-08-29 |
| T2b | T2b | lousydeal | `f0b51aac9587` | AGENT | done | agent | journal, T2b | 2026-08-29 |
| T2c | T2c | lousydeal | `c248bf499315` | AGENT | done | agent | journal, T2c | 2026-08-29 |
| T3a | T3 | lousydeal | `1bcf52d9f1db` | AGENT | done | agent | journal, T3a | 2026-08-29 |
| T3b | T3 | lousydeal | `89c962fc4c8b` | AGENT | done | agent | journal, T3b | 2026-08-30 |
| T4a | T4 | lousydeal | `63e00ca45012` | AGENT | done | agent | journal, T4 | 2026-08-30 |
| T5a | T5 | lousydeal | `a0e14c6818fc` | AGENT | done | agent | journal, T5a | 2026-08-30 |
| T5b | T5 | lousydeal | `6529013e47b8` | AGENT | done | agent | journal, T5b | 2026-08-30 |
| T6a | T6 | lousydeal | `3e544245f6b8` | AGENT | done | agent | journal, T6a | 2026-08-30 |
| T6b | T6 | lousydeal | `31224de76ebd` | AGENT | done | agent | journal, T6b | 2026-08-30 |
| T7a | T7 | lousydeal | `34188f6dd639` | AGENT | done | agent | journal, T7a | 2026-08-30 |
| T7b | T7 | lousydeal | `bcbbb3fb0acc` | AGENT | done | agent | journal, T7b | 2026-08-30 |
| T7c | T7 | lousydeal | `93a5605cdcad` | AGENT | done | agent | journal, T7c | 2026-08-30 |
| T7d | T7 | lousydeal | `8a528e862ef2` | AGENT | done | agent | journal, T7d | 2026-08-31 |
| T8a | T8 | lousydeal | `a26c7572984b` | AGENT | done | agent | journal, T8a | 2026-08-31 |
| T8b | T8 | lousydeal | `b2127ede8a79` | AGENT | done | agent | journal, T8b | 2026-08-31 |
| T9a | T9 | lousydeal | `22cc7f437c32` | AGENT | done | agent | journal, T9 | 2026-08-31 |
| T10a | T10 | lousydeal | `c3a7e99c1078` | AGENT | done | agent | journal, T10 | 2026-08-31 |
| T10b | T10 | lousydeal | `61a28edfad62` | AGENT | done | agent | journal, T10b | 2026-08-31 |
| T11a | T11 | lousydeal | `81ee905861f8` | AGENT | done | agent | journal, T11 | 2026-08-31 |
| T13a | T13 | deploys | `7a9e39588f5a` | AGENT | done | agent | journal, T13 | 2026-08-31 |
| T13b | T13 | deploys | `247bd5352e35` | AGENT | done | agent | journal, T13 | 2026-08-31 |
| T12a | T12 | lousydeal | `234cf0544066` | AGENT | done | agent | journal, T12a | 2026-09-01 |
| T12b | T12 | lousydeal | `0c6ea7af7367` | AGENT | done | agent | journal, T12b | 2026-09-01 |
| T14a | T14 | orange | `fb76dadcfabe` | AGENT | done | agent | journal, T14a | 2026-09-02 |
| T14b | T14b | lousydeal | `5b597cbbfad6` | AGENT | done | agent | journal, T14b | 2026-09-02 |
| T14c | T14b | deploys | `8d000bb603d2` | AGENT | done | agent | journal, T14b | 2026-09-02 |
| T14d | T14b | orange | `34ed48cbeed6` | AGENT | done | agent | journal, T14b | 2026-09-02 |
| T15c | T15c | orange | `90c360e0352d` | AGENT | open | agent | — | — |
| T15b | T15b | orange | `4a2ff1e326c2` | JOINT | done | operator | journal, T15b | 2026-09-03 |
| T15d | T15d | orange | `f81af780ac52` | AGENT | done | agent | journal, T15a | 2026-09-03 |
| T19a | T19 | deploys | `d7d3ca6dd22c` | AGENT | done | agent | journal, T19 | 2026-09-03 |
| T20a | T20 | deploys | `a0073b7ba64f` | AGENT | done | agent | journal, T20 | 2026-09-04 |
| T20b | T20 | orange | `2752980ec3a8` | JOINT | done | operator | journal, T20 | 2026-09-04 |
| T18a | T18 | lousydeal | `082a19d0a94c` | AGENT | done | agent | journal, T18a | 2026-09-04 |
| T18b | T18 | orange | `d1efa3329d35` | JOINT | open | operator | — | — |
| T15a | T15 | orange | `d0eaff8881f5` | JOINT | done | operator | journal, T15a | 2026-09-03 |
| T16a | T16 | orange | `abf2a5101f88` | JOINT | done | operator | journal, T16 | 2026-09-04 |
| T17a | T17 | lousydeal | `68930b0016e5` | AGENT | done | agent | journal, T17 | 2026-09-03 |
| T21a | T21 | orange | `aa31b8133cdc` | AGENT | open | agent | — | — |

## Amendments

**2026-09-04 · T21 added; row count 41 to 42.**
**`playbooks/platform-verify.yml` aborts at task 14, for every tenant**, on
`main`. One `set_fact` defines two keys and the second references the first;
Ansible resolves keys within one task in no guaranteed order.

Introduced by `fc08f33` (T15), implementing that review's **MAJOR C4** —
existence conjoined into readiness. The requirement was right and survives; the
implementation was not.

**Nothing that has run since could have caught it.** The 42 contract playbooks,
every render diff and T20b's own suite render task text and resolve no runtime
fact; `platform-verify.yml` is operator-invoked and had not run since T15
merged. **The same shape as `plepic.yml`'s allowlist at T15d** — correct-looking,
unfalsifiable by reading, found in seconds by a real run.

Recorded as a row rather than a maintenance fix: this is broken behaviour, not a
false claim, so constraint 11 does not reach it.

**All 41 prior hashes recomputed, no drift.**

**2026-09-03 · T20 added; row count 39 to 41. Decision `010`.**
**The operator reversed two Target exposure lines.** `lousydeal.com` was
"nobody in this slice" and the Medusa Admin was "no public hostname, in any
encoding, never in LD-01". Both now resolve, gated behind Cloudflare Access on
one Google identity, matching the posture the reference already runs.

**This is not a DNS change.** `deploys/lousydeal/base/service.yaml:24` gives the
backend no `externalIPs` and `networkpolicy.yaml:30-31` states no ingress path
to that pod exists — deliberately, across three rows. Making the Admin reachable
needs a port, an `externalIPs` entry and a NetworkPolicy rule before any tunnel
route can point anywhere, and **T13a's recorded trap constrains where that rule
may go**: index 0 is the storefront's pod selector, and anything that replaces
it hands a CIDR a route to `backend:9000`.

Recorded as a decision rather than an edit **because it enlarges the blast
radius**: an authenticated commerce Admin, one Access policy deep. The deferral
it reverses had already cost real work — the publishable key could only be
minted by port-forwarding from the cluster host, because nothing else could
reach the Admin API.

**All 39 prior hashes recomputed, no drift.**

**2026-09-03 · T19 added; row count 38 to 39.**
The first constraint in this build that no amount of correct code could satisfy:
**the node ran out of CPU.** T13 set `requests: cpu: 200m` for every Lousy Deal
workload in both overlays; measured against the running deployment, actual usage
is **1–19m per pod**, 77m across all ten against 1700m requested. Requests now
total 99% of 12 allocatable CPUs and live's predeploy Job cannot schedule.

Live is `Healthy` on its previous images — what is blocked is adopting a new
digest, which is every future release.

**Memory is not over-requested**: the backend uses 298Mi against a 256Mi
request, so only CPU changes. **All 38 prior hashes recomputed, no drift.**

**2026-09-03 · T15d added; row count 37 to 38.**
`roles/argocd/tasks/plepic.yml:45-47` asserts every entry of the **global**
enabled-optional-sources list is one of **Plepic's** optional sources. Correct
while Plepic was the only consumer with any; T14a gave Lousy Deal six, and
`plepic.yml` imports before `lousydeal.yml`, so enabling one takes the whole
`argocd` role down for every tenant.

**Six review passes across T14a and T15 missed it, and none could have caught
it.** Both enable lists were empty until an operator enabled something, so the
assert had nothing to reject. **A real run found it in seconds**, failing closed
before any Application was created.

The allowlist is derived from the projection contract instead, covering every
consumer. **No existing checkbox text changed; all 37 prior hashes recomputed,
no drift.**

**2026-09-03 · T15c and T18 added; row count 34 to 37.**
Two gaps surfaced while preparing T15b's seed, both found by looking rather than
by a review.

**Lousy Deal sends email and nothing carried the credential.** The operator
supplied `lousydeal-mail-keys`, one pair per environment. The reference carries
the equivalent inside `plepic-runtime-credentials` as `smtpUsername`/
`smtpPassword`; T14a's field list omitted them correctly, because it was derived
from what the manifests consume and nothing consumed SMTP. **T15c widens the
source before T15b seeds it**, because seeding at the wrong width is a rotation,
not a re-run. Sending itself — a notification provider, SMTP environment, a
submission egress policy — is **not in LD-01**.

**Stripe cannot deliver to this application, for three reasons, not two —
T18a's own review pass found the third.** The storefront proxy admitted the
`store` namespace alone, so `hooks/payment/…` was refused; the reference
admits it and T10 narrowed ours deliberately. Its request-header allowlist
also omitted `stripe-signature`, so an admitted delivery still failed Stripe's
signature verification silently. T18a fixes both. T16 separately gates the
hostname on Google identity, which a webhook cannot satisfy;
`STRIPE_WEBHOOK_SECRET` is consumed by a backend nothing can reach until T18b's
Cloudflare Access bypass also lands. Its row is an effect gate: a bypass is a
hole in an Access policy, and its scope is one path.

**Neither was found by a review.** Both surfaced from reading what a credential
is for before writing it down — the same question that found the publishable-key
gap at T14a. **All 34 prior hashes recomputed, no drift.**

**2026-09-03 · T15b runs before T15. Row count unchanged at 34.**
T15's own verification waits for its Applications to become Healthy. **Neither
can**, in either environment: `deploys/lousydeal/base/postgresql.yaml`'s
wave `-20` StatefulSet reads `lousydeal-database-admin` and
`lousydeal-runtime-credentials`, and all six `lousydeal{,-test}` projections
carry `optional_source` against an `argocd_openbao_enabled_optional_sources`
that is empty. Those Secrets exist only once T15b enables and seeds the sources.

**And T15b never needed T15.** The ExternalSecrets are rendered by
`roles/argocd/tasks/openbao-consumers.yml`, import 18, on `orange` `main` since
T14a; `applications.yml` is import 30. The reason recorded for the original
order — *"the SecretStores that render into them are reconciled at T15"* — is
false, and was false when written.

So the rows swap. Neither row's text, files or hash changes; **all 34 hashes
recomputed, no drift.** E4 now fires before E5.

**This was found by a review of T15, not by the amendment that created T15b.**
A row's ordering premise is a claim like any other, and this one was carried
through three amendments without being opened.

**2026-09-02 · T14b added; row count 31 to 34.**
T14a found that **nothing in this build mints the Medusa publishable key**, while
`storefront.yaml` consumes it without `optional: true` — so the storefront cannot
start in either environment. Two comments in the row under review claimed
`configure:commerce` mints it; `configure-commerce.ts`'s own header says it
configures no sales channel, and the predeploy chain seeds no Admin user, so
there is no identity for the Admin API either. The operator chose the reference's
answer: seed an initial administrator, as
`plepic/backend/src/scripts/seed-administrator.ts` does. Three rows, one per
repository, all before T15b. **No existing checkbox text changed; all 31 prior
hashes recomputed, no drift.**

*The identifier is reused.* An earlier `T14b` — T14's second checkbox — was
re-keyed to `T15b` in the 2026-08-31 amendment below and no longer exists under
that name. This `T14b` is a different task and shares nothing with it but the
letter.

**2026-08-30 · global constraint 10 added at T5a; row count unchanged at 28.**
A claim is bounded, cited, or executed. Added after twenty instances across nine
rows of text asserting something untrue of the code it described; the diagnosis
is in the journal. `backend/src/config/env.ts` joined T5a's `Files` list to
correct a header T3 had frozen, and T8's brief and the note beside T3a's
checkbox were corrected in the same pass. No checkbox text changed; all 28 hashes
recomputed, no drift.

**2026-08-30 · plan audit; row count unchanged at 28, one row re-keyed.**
The same defect had bitten six times — a file created by an early row that no
later row may touch — so rather than discover the seventh at T4, a top-tier audit
read every remaining row against what its checkbox text actually requires. It
found roughly twenty gaps and two problems that were not file-list gaps at all.

*Applied, all hash-safe:*

- **Files-list additions across T4–T17.** Mostly dependencies (npm workspaces
  share one root lockfile), scripts that another row's tooling invokes, and
  documents falsified under global constraint 9.
- **`backend/src/config/runtime.ts` named as the single configuration
  assembler**, in T3's section, and added to T4, T5 and T6. No rule about
  `Files` lists would have found this: "configuration is assembled somewhere" is
  a design fact, not a textual one.
- **T13 now runs before T12.** T12's `Release` writes both digests into
  `deploys/lousydeal/overlays/live/kustomization.yaml` on the merge that
  introduces it, and T13 creates that file. In the original order the first
  promotion would have written to a path that does not exist, on a merge
  approved as a deployment.
- **T14 split; its second checkbox becomes T15b.** The checkbox confirms a
  Secret exists *in a namespace*; namespaces are created at T14 and the
  SecretStores that render into them reconcile at T15, so it could not be
  verified before both landed. **Row `T14b` is re-keyed to `T15b`. The checkbox
  text is unchanged, so the hash `4a2ff1e326c2` is unchanged; only the task
  moved.** T14 additionally gained `roles/argocd/defaults/main.yml`, where the
  ESO roles actually live, and `roles/argocd/tasks/namespaces.yml` — enrolling a
  consumer in the projection contract without creating its namespace made
  `kubectl diff` exit 2 and failed the whole argocd role for every consumer on
  2026-08-17.
- **T12 owns the shell gate.** `scripts/validate` and the validate workflow
  hardcode `shellcheck scripts/validate .githooks/pre-commit`; T12 adds one
  shell file and T17 another, and neither would be linted. T12 derives the set
  from `git ls-files`, as the reference and the `deploys` repository do.

All 28 hashes recomputed after the amendment: no drift.

**2026-08-29 · three file-list additions at T3a; row count unchanged at 28.**
Review found that `backend/tsconfig.json` sets `noEmit: true`, which Medusa's
compiler spreads into `createProgram` while guarding only on `emitSkipped` — a
flag TypeScript leaves `false` when `noEmit` suppresses output. `medusa build`
would write zero files, report success, exit 0, and yield an image that cannot
start. Reproduced directly: `noEmit=true → emitSkipped=false, filesWritten=0`.

The fix is assigned to T3b, which shares T3's `Files` list and is the last row
authorised to touch that file. Separately, `backend/package.json` had the same
one-row authority while T6 must add Medusa dependencies and T11 must run a
`build` script neither could declare, so T6 gained `backend/package.json` and
`package-lock.json`, and T11 gained both workspace manifests.

The plan's parallel-safety paragraph was corrected in the same pass: T3 and T6
now share two files, so T3–T7 are no longer disjoint and the binding's conflict
map must not treat them as parallel-safe.

No checkbox text changed; all 28 hashes recomputed, no drift.

**2026-08-29 · global constraint 9 added at T2b; row count unchanged at 28.**
Not a new row — a new rule. A row that falsifies a tracked document now carries
that document in its `Files` list. Added after the third occurrence of that
failure, and `README.md` was added to T2b's `Files` list under it. The plan's
"Current repository facts" table, stale on three counts since M1 merged, was
refreshed at the same time and now carries a note that the constraint applies to
it.

Constraints are copied verbatim into every subagent's context packet, so the
remaining rows inherit this with their work. No checkbox text changed; all 28
hashes recomputed, no drift.

**2026-08-29 · T2c added, 27 rows to 28.** T2's stated verification —
`tooling/universe audit lousydeal` reporting clean — is unreachable from inside
T2. Clearing the catalogue findings reveals `stale-baseline` and
`stale-habit-config`, fixed by `sync-baseline` writing `AGENTS.md` and
`.habit-hooks/config.toml` in `lousydeal`. `.habit-hooks/config.toml` was in no
row's `Files` list anywhere in the plan.

T2a and T2c are a cross-repository pair under the mechanism's §11.2: two pull
requests, stated merge order, neither merged alone. T2a first, because
`sync-baseline` reads the catalogue from `architecture`'s `main`.

All existing hashes recomputed after the edit: **no drift**, one row added.

**2026-08-29 · T2b added, 26 rows to 27.** A defect merged in T1b: on a checkout
without `node_modules` the missing-tool check passes anyway when the same tools
exist globally, so `npm run lint` reaches a global ESLint 6 against the pinned 10
and fails with a message about a missing configuration file. The refusal T1b
added never fires. `scripts/validate` is in T1's `Files` list and no other, and
T1 had closed, so no existing row could repair it.

Operator chose to amend the plan rather than open an issue. Implemented as a
second row rather than an addition to T2's file list, because T2 is in
`architecture` and this file is in `lousydeal` — global constraint 6 requires two
rows with a stated order, and the plan states it.

Every existing checkbox hash was recomputed after the edit: **no drift**. No row
identity moved; one row was added.

## Classification note

The binding's §4 lists T14 and T16 as JOINT and T1–T13 and T17 as AGENT. **T15
appears in neither list.** Its stated verification is the template tests and a
check-mode run, and the mechanism forbids accepting a check-mode pass as runtime
verification, so the row cannot close without the real sync — effect gate E5,
which creates namespaces and starts workloads. Classified JOINT under the
ambiguity rule.

T14 is split at the row rather than the task: registering the sources closes on
the existing template tests and is AGENT; seeding OpenBao is the write the
operator authorises and is JOINT.

## Effect gates

Approved one at a time, immediately before execution. `approved` is tracked
separately from `executed`, and an approval that does not fire in the same turn
expires.

| # | Effect | Row | State |
| --- | --- | --- | --- |
| E0 | Add `Canonical validation` to the branch ruleset's required contexts | T1b, after merge | **executed 2026-08-29** |
| E1 | First publish to GHCR | T12b | **approved 2026-09-01**, operator, merging PR #40 |
| E2 | Merging T12 — `Release` fires on the merge that introduces it | T12b | **approved 2026-09-01**, operator, merging PR #40 |
| E3 | First write to `deploys/lousydeal/overlays/*` | T13a, then T12b | **approved 2026-09-01** for T12b's live write, operator |
| E4 | Seeding OpenBao, test sources | T15b | **executed 2026-09-03**, operator; live sources seeded separately the same day |
| E5 | Creating namespaces (T14a) and starting workloads (T15a) | T14a, T15a | **executed 2026-09-03**, operator; all five live workloads Running, `lousydeal` Synced/Healthy |
| E6 | Publishing DNS for `test.lousydeal.com` | T16a | not requested |
| E7 | Applying the Cloudflare Access policy | T16a | not requested |

**E0 was not in the binding's inventory.** It was discovered at T1b: a new CI job
produces a status-check context the ruleset does not require, so the job runs and
displays but cannot block a merge. The mechanism's category list is a floor, not
a ceiling, and an access-policy change on a public repository's default branch is
an effect gate whether or not the binding enumerated it. Rollback is a `PATCH` of
the pre-change ruleset JSON, captured before the request was made.

E7 precedes E6.

**E3, E4 and E5 moved with the audit.** T13 now lands the overlays before T12's
`Release` writes into them, so E3's first write is T13a's rather than a
promotion into a path that does not exist. E4 belongs to T15b, which was split
out of T14 because a Secret cannot be confirmed in a namespace before the
namespace and its SecretStore exist. E5 is now two rows: T14a creates the
namespaces, because enrolling a consumer in the projection contract without one
breaks a gate for every other consumer, and T15a starts the workloads. Publishing the hostname before the policy exists leaves it
public and ungated for the width of the gap.

## Size overrides

Constraint 3 bounds a row at 800 changed lines or 10 files without a named
operator override.

| Row | Size | Override |
| --- | --- | --- |
| T7b | 913 lines | operator, 2026-08-30 |
| T10 | 921 lines | operator, 2026-08-31 |
| T13a | 17 files, 1,847 lines | operator, 2026-08-31 |
| T12a | 5 files, 1,637 lines | operator, 2026-09-01 |
| T12b | 4 files, 4,130 lines | operator, 2026-09-01 |
| T14a | 10 files, 1,200 lines | operator, 2026-09-02 |
| T15 | 8 files, 3,587 lines | operator, 2026-09-03 |

**T12b remains the largest, with T15 second, and both reasons are on the record.** Five
review passes applied 278 mutations and found the same defect five times; the
assertion mechanism that finally closed it — pinning four jobs to their exact
step content, and closing the job, root and file-set key sets — is most of the
growth. About 1,300 lines began as a byte-identical port of the reference's
guard and its tests, both since grown by this row's own fixes.
