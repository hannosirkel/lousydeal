# 017. Close the Lousy Deal initiative

- **Date:** 2026-09-27
- **Status:** accepted

## Context and problem statement

The Lousy Deal initiative ran as numbered slices, LD-00 to LD-11, under one
contract and one status file in `docs/working/`. By 2026-09-27 every V1 slice
was complete and live, and LD-11 had built every row selected for it. LD-11
still had nine unselected candidates, and LD-07 was deferred. The operator had to
decide whether the initiative stays open for that remaining work.

## Considered options

- Keep LD-11 open until its unselected candidates are built or rejected.
- Close the initiative, and move the unselected candidates to a backlog.

## Decision

**The operator closed the initiative on 2026-09-27.**

- **V1 is complete and live.** V1 is LD-00 to LD-06, LD-08, LD-09 and LD-10.
  The gates it passed are in [`016`](./016-v1-gate-acceptances.md). The live
  store opened under LD-08 on 2026-09-13.
- **LD-11, user experience, is closed.** It was post-V1 work. All seventeen
  planned rows (F1–F6, G1–G6, H1–H5) and all twelve selected J-rows are built and
  deployed.
- **LD-07, Enterprise, stays deferred out of V1.** It is a numbered slot, not
  work ([`specification.md`](../current/specification.md) §10, §26).
- **The remaining candidates move to
  [`backlog-candidates.md`](../working/backlog-candidates.md).** They are
  proposals, not scheduled work.

### How LD-11's candidates were selected

LD-11's audit rows (G1–G6) walked six flows and produced candidate fix rows. The
plan reserved the selection, stage 2, to the operator. The operator delegated
stage 2 to TypeSafe's Jev model on 2026-09-25.

Jev received a neutral brief: the shop, the slice's objective and limits, and
each candidate in its finding's own words. For each candidate, Jev gave the
probability that building it succeeds. Success meant a real, verifiable
improvement to comprehension or truthfulness, within the limits, delivered as
one small change. The operator set the bar: build every candidate above 0.80.

Ten candidates cleared the bar and became J3–J12. Jev also chose the new
buyer-facing copy in those rows from drafted options. Candidate `u` was
selected earlier and became J1; J2 came from a review finding. The unselected
candidates and their scores are in
[`backlog-candidates.md`](../working/backlog-candidates.md). There, `c` and `v`
are one entry, because the audit found one cause for both.

### Where the durable documentation went

| Content | Home |
| --- | --- |
| The V1 contract, from `fresh-build.md` | [`specification.md`](../current/specification.md), with the § numbers unchanged |
| How the system is built | [`architecture.md`](../current/architecture.md) |
| How the system is run | [`operations.md`](../current/operations.md) |
| Brand, voice and visual direction | [`brand.md`](../current/brand.md) |
| Decisions and gate acceptances | `docs/decisions/` |

The retired plans (`status.md`, `fresh-build.md` and the slice plans) stay
readable in git history.

## Rationale

The selected work was done, and the unselected candidates had no owner and no
date. An open initiative with no next action misleads the next reader about
what is in progress. A backlog keeps each candidate visible without implying
that someone works on it.

A fixed probability bar made the selection repeatable and recorded. The
trade-off: a model, not the operator, chose what to build. Candidates at or
near the bar were left out on a margin, for example `m` at exactly 0.80.

## Consequences

- No initiative is open in `docs/working/`. New work starts a new plan.
- A reader looks in `docs/current/` for present state and in `docs/decisions/`
  for why. A reference to a retired plan uses git history.
- A backlog candidate needs a new selection before it becomes work.
