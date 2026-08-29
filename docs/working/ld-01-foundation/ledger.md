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
| T1a | T1 | lousydeal | `e6e994deea2a` | AGENT | in-progress | agent | — | 2026-08-29 |
| T1b | T1 | lousydeal | `6b6396cec6d0` | AGENT | open | agent | — | — |
| T2a | T2 | architecture | `a13b02ed37da` | AGENT | open | agent | — | — |
| T3a | T3 | lousydeal | `1bcf52d9f1db` | AGENT | open | agent | — | — |
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
| E1 | First publish to GHCR | T12b | not requested |
| E2 | Merging T12 — `Release` fires on the merge that introduces it | T12b | not requested |
| E3 | First write to `deploys/lousydeal/overlays/*` | T12b, T13a | not requested |
| E4 | Seeding OpenBao, test sources | T14b | not requested |
| E5 | Creating namespaces and starting workloads | T15a | not requested |
| E6 | Publishing DNS for `test.lousydeal.com` | T16a | not requested |
| E7 | Applying the Cloudflare Access policy | T16a | not requested |

E7 precedes E6. Publishing the hostname before the policy exists leaves it
public and ungated for the width of the gap.
