# 006. Name provider staging files provider-first, and registered sources application-first

- **Date:** 2026-08-28
- **Status:** accepted
- **Supersedes:** [`005`](./005-secret-source-naming.md)

## Context and problem statement

Decision `005` said Lousy Deal's secret sources are named `lousydeal-…` and
`lousydeal-test-…`, and had the operator rename the supplied Stripe file
accordingly. It was wrong, and the operator renamed a file that was already
right.

`005` compared the operator's Stripe key file against Plepic's *registered
OpenBao source* names and concluded they disagreed. They are not the same kind
of thing. `.keys/` holds two categories, and each has its own convention.

## Considered options

- One convention for everything in `.keys/`, as `005` assumed.
- Two conventions, one per category, matching what `plepic` actually does.

## Decision

Two categories, two conventions.

| Category | Convention | Plepic | Lousy Deal |
| --- | --- | --- | --- |
| Registered OpenBao source | application-first | `plepic-runtime-credentials`, `plepic-test-database-admin` | `lousydeal-runtime-credentials`, `lousydeal-test-database-admin` |
| Provider staging file, not registered | provider-first | `stripe-plepic-sandbox`, `stripe-plepic-live`, `brevo-plepic` | `stripe-lousydeal-sandbox`, later `stripe-lousydeal-live` |

The Stripe file returns to `stripe-lousydeal-sandbox`, the name it was supplied
under.

## Rationale

The distinction is not cosmetic; the two categories are read by different
things.

A **registered source** appears in `openbao_seed_allowed_sources` and is written
into an OpenBao mount by `playbooks/openbao-seed.yml`. The seed list is read by
application — an operator seeding an environment wants one application's sources
adjacent — so application-first is right, and `005` got that half correct.

A **provider staging file** is registered nowhere. Verified: there are zero
`stripe` entries in `openbao_seed_allowed_sources`. Its values are folded into a
registered source — `plepic-runtime-credentials` carries `stripePublishableKey`,
`stripeSecretKey`, `stripeWebhookSecret` and
`stripePaymentMethodConfigurationId` — and the file itself is the operator's own
scratch copy of what a provider issued. Provider-first is right there, because
the operator's question at that moment is *"where did I put the Stripe keys"*,
not *"what does Lousy Deal need"*.

The trade-off accepted: two conventions in one directory, which needs the
distinction written down or it will be re-litigated. This decision is that
writing-down.

The error is worth naming rather than quietly fixing. `005` inferred a
convention from one half of a directory listing and did not check whether the
thing it was comparing was the same kind of thing. The listing that would have
falsified it — `stripe-plepic-sandbox` sitting beside `plepic-runtime-credentials`
— was one command away and was not run.

## Consequences

- The operator renames the file back to `stripe-lousydeal-sandbox`. It is a
  staging file that nothing reads by name, so this costs nothing beyond the
  rename itself.
- Lousy Deal's registered sources are still `lousydeal-…` and `lousydeal-test-…`.
  That half of `005` survives and is restated above.
- The Stripe values reach the runtime inside `lousydeal-runtime-credentials` and
  `lousydeal-test-runtime-credentials`, as keys, not as a source of their own.
- The LD-01 plan and its `big-build` binding both named the `005` filename in
  their preflight facts. Both are corrected in the same change.
