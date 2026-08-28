# 002. Rebuild the live image from merged `main`

- **Date:** 2026-08-28
- **Status:** accepted

## Context and problem statement

`standards/gitops-and-deployment.md` requires promotion by digest and states
that a live promotion is merge-promoted and a test promotion is label-promoted.
It does not say whether the digest promoted to live must be the digest the test
environment was approved on. `plepic` and `servitium` both rebuild from merged
`main`, so live and test carry different digests, and a reader who notices that
will reasonably ask whether it is a deviation.

## Considered options

- Rebuild live from merged `main`, as `servitium` and `plepic` do.
- Re-promote the exact digest the test environment was approved on.

## Decision

Rebuild live from merged `main`. The merge triggers `Release`, which validates,
builds, scans, and writes the resulting digests into `deploys`.

## Rationale

It is not a deviation. The standard's rule is *promote by digest, never by tag*,
and both models promote a digest — the question is only which one. The standard
separately states that a live promotion is merge-promoted, which is exactly what
this is.

`orange` ADR `019` already accepted the model for `plepic` on three stated
conditions, and Lousy Deal can satisfy all three: no environment-specific value
is ever baked into an image, dependencies and base images are pinned, and the
promotion commit records the source revision beside the immutable digest.
`Release` re-runs the full validation before it builds, so the rebuild is gated
rather than assumed faithful.

The trade-off accepted, stated plainly: **the binary serving live is not the
binary that was tested.** It is a rebuild of the same source with the same
locked dependencies. The three conditions stand in for the property, and the
first of them is the one that can silently stop being true — which is why the
`no-next-public-env` guard test is not optional here.

Re-promoting the tested digest was rejected on cost rather than on merit. It
requires a test promotion of the exact merged revision before every live
release, which makes a test deployment mandatory before any merge to `main`.
That is a process change, not a workflow change, and it is not worth making
before the store has ever deployed. If it becomes worth making, it supersedes
this decision rather than amending it.

## Consequences

- **Every merge to `main` is a live deployment.** There is no second gate beyond
  the `live` GitHub Environment, so approval must precede the merge.
- A pull request that *adds* the `push`-triggered `Release` workflow fires it on
  merge. On the previous build that happened three seconds after the merge,
  against an explicit claim that it could not.
- The `no-next-public-env` guard test carries a load it would not otherwise
  carry, and removing it removes the basis of this decision.
- Rollback stays a promotion of a known-good digest, unchanged by this.
