# 003. Give each environment its own PostgreSQL

- **Date:** 2026-08-28
- **Status:** accepted

## Context and problem statement

Medusa requires PostgreSQL. Lousy Deal needs one for live and one for test, and
the two must not share state: test payment events, test orders and test deal
serials must never reach live data. The cluster already runs PostgreSQL for
other workloads, so the question is whether Lousy Deal joins something or stands
up its own.

## Considered options

- An own StatefulSet per environment, as `plepic` and `authentik` have.
- A new shared PostgreSQL service, with a database and role per application.
- Lousy Deal's databases inside `plepic-postgresql`.

## Decision

An own StatefulSet per environment: `lousydeal-postgresql` and
`lousydeal-postgresql-test`, each with its own PVC, credentials and backups.

## Rationale

There is no shared PostgreSQL service to join. `authentik-postgresql` serves one
platform component and `plepic-postgresql` is per-application and
per-environment. The shared service that exists is MySQL, and `orange` ADR `019`
already recorded why it was not extended for Medusa: *"Medusa requires
PostgreSQL and Redis; the existing shared MySQL service is neither compatible
nor an acceptable place to merge those environments."*

So "shared" was never the cheap option it appears to be. It meant either new
platform infrastructure in `orange` before Lousy Deal could deploy at all, or
putting Lousy Deal into Plepic's instance — which the build contract forbids in
its own words: *do not couple Lousy Deal availability or product behavior to
Plepic Games*. One restart would reach both stores.

The trade-off accepted: two more StatefulSets and two more PVCs on a small
cluster, two more backup targets, and two more credentials in the seeding path.
That is real operational surface, and it buys an independent failure domain for
a store that takes payments.

## Consequences

- Two StatefulSets, two PVCs, and two database credentials to seed through
  OpenBao and External Secrets.
- Backups are Lousy Deal's own, and the restore must be exercised before the
  live gate. On the previous build restores were never performed at all.
- A test archive must be refused by the live environment, and vice versa. That
  property needs proving, not assuming.
- Storage is local-path and single-node, as `plepic`'s is, so there is no
  replication behind the volume.
