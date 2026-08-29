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
| T2c | T2c | lousydeal | `c248bf499315` | AGENT | done | agent | journal, T2c | 2026-08-29 |
| T2b | T2b | lousydeal | `f0b51aac9587` | AGENT | done | agent | journal, T2b | 2026-08-29 |
| T3a | T3 | lousydeal | `1bcf52d9f1db` | AGENT | done | agent | journal, T3a | 2026-08-29 |
| T3b | T3 | lousydeal | `89c962fc4c8b` | AGENT | open | agent | — | — |
| T4a | T4 | lousydeal | `63e00ca45012` | AGENT | open | agent | — | — |
| T5a | T5 | lousydeal | `a0e14c6818fc` | AGENT | open | agent | — | — |
| T5b | T5 | lousydeal | `6529013e47b8` | AGENT | open | agent | — | — |
| T6a | T6 | lousydeal | `3e544245f6b8` | AGENT | open | agent | — | — |
| T6b | T6 | lousydeal | `31224de76ebd` | AGENT | open | agent | — | — |
| T7a | T7 | lousydeal | `34188f6dd639` | AGENT | open | agent | — | — |
| T7b | T7 | lousydeal | `bcbbb3fb0acc` | AGENT | open | agent | — | — |
| T8a | T8 | lousydeal | `a26c7572984b` | AGENT | open | agent | — | — |
| T8b | T8 | lousydeal | `b2127ede8a79` | AGENT | open | agent | — | — |
| T9a | T9 | lousydeal | `22cc7f437c32` | AGENT | open | agent | — | — |
| T10a | T10 | lousydeal | `c3a7e99c1078` | AGENT | open | agent | — | — |
| T11a | T11 | lousydeal | `81ee905861f8` | AGENT | open | agent | — | — |
| T12a | T12 | lousydeal | `234cf0544066` | AGENT | open | agent | — | — |
| T12b | T12 | lousydeal | `0c6ea7af7367` | AGENT | open | agent | — | — |
| T13a | T13 | deploys | `7a9e39588f5a` | AGENT | open | agent | — | — |
| T13b | T13 | deploys | `247bd5352e35` | AGENT | open | agent | — | — |
| T14a | T14 | orange | `fb76dadcfabe` | AGENT | open | agent | — | — |
| T14b | T14 | orange | `4a2ff1e326c2` | JOINT | open | operator | — | — |
| T15a | T15 | orange | `d0eaff8881f5` | JOINT | open | operator | — | — |
| T16a | T16 | orange | `abf2a5101f88` | JOINT | open | operator | — | — |
| T17a | T17 | lousydeal | `68930b0016e5` | AGENT | open | agent | — | — |

## Amendments

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
| E1 | First publish to GHCR | T12b | not requested |
| E2 | Merging T12 — `Release` fires on the merge that introduces it | T12b | not requested |
| E3 | First write to `deploys/lousydeal/overlays/*` | T12b, T13a | not requested |
| E4 | Seeding OpenBao, test sources | T14b | not requested |
| E5 | Creating namespaces and starting workloads | T15a | not requested |
| E6 | Publishing DNS for `test.lousydeal.com` | T16a | not requested |
| E7 | Applying the Cloudflare Access policy | T16a | not requested |

**E0 was not in the binding's inventory.** It was discovered at T1b: a new CI job
produces a status-check context the ruleset does not require, so the job runs and
displays but cannot block a merge. The mechanism's category list is a floor, not
a ceiling, and an access-policy change on a public repository's default branch is
an effect gate whether or not the binding enumerated it. Rollback is a `PATCH` of
the pre-change ruleset JSON, captured before the request was made.

E7 precedes E6. Publishing the hostname before the policy exists leaves it
public and ungated for the width of the gap.
