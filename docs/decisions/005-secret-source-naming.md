# 005. Name secret sources `lousydeal-…` and `lousydeal-test-…`

- **Date:** 2026-08-28
- **Status:** superseded by [`006`](./006-two-naming-categories-in-keys.md)

## Context and problem statement

A credential reaches the runtime as a named source in the Orange checkout's
ignored `.keys/` directory, registered in `openbao_seed_allowed_sources` and
imported into a per-environment OpenBao mount. The name is the identifier in all
three places and in every seeding command. The operator supplied the first
credential as `stripe-lousydeal-sandbox`, which puts the provider first;
`plepic` names its sources application-first, `plepic-…` and `plepic-test-…`.
The build contract asks for the convention to be settled once and recorded.

## Considered options

- Application-first, matching `plepic`: `lousydeal-stripe`,
  `lousydeal-test-stripe`.
- Provider-first, matching the file as supplied: `stripe-lousydeal-sandbox`.

## Decision

Application-first. Sources are `lousydeal-<thing>` and `lousydeal-test-<thing>`.
The supplied file is renamed to `lousydeal-test-stripe` when it is registered.

## Rationale

The list in `openbao_seed_allowed_sources` is read by application, not by
provider: an operator seeding an environment wants every source one application
needs, adjacent. Provider-first scatters them, and the existing list already
sorts application-first for every application on the cluster.

The `-test` infix also carries the property that matters most. `plepic` and
`plepic-test` are separate OpenBao mounts with separate policies, and the naming
is what makes a seeding command that mixes them visibly wrong. `sandbox` names
the Stripe mode rather than the environment, and the two are not the same axis —
the test environment will hold non-Stripe credentials that have no sandbox.

The trade-off accepted: the operator renames a file they already created, and
any note written before today that names `stripe-lousydeal-sandbox` is stale.

## Consequences

- The Stripe sandbox source is `lousydeal-test-stripe`, holding `publishableKey`
  and `secretKey`.
- The live Stripe source will be `lousydeal-stripe`, and it does not exist until
  the publication gate.
- Every later Lousy Deal source follows the same shape, and a source that does
  not is a review finding.
- The rename happens before the first seed, so no OpenBao path carries the old
  name and nothing needs migrating.
