# 001. Keep the storefront and the backend in one repository

- **Date:** 2026-08-28
- **Status:** accepted

## Context and problem statement

Lousy Deal ships two deployables: a Medusa backend and a Next.js storefront.
They share a dependency tree, a type contract at the store API, and a release.
Before the first line of application code exists, the repository layout has to
be settled, because it decides what a pull request can contain, what one
lockfile covers, and whether one workflow can promote both images together.

## Considered options

- One repository with npm workspaces, as `plepic` does.
- Two repositories, one per deployable.
- One repository with no workspaces, and two independent dependency trees.

## Decision

One repository, `lousydeal`, with npm workspaces `backend` and `storefront`.

## Rationale

The two deployables version together and are released together. Two
repositories would make every store-API change a cross-repository pull request
with a stated order — the shape `standards/planning.md` requires and the shape
that costs the most to run — for a store whose custom surface is small.

`plepic` demonstrates the alternative working at a larger scale than Lousy Deal
will reach: one lockfile, one lint and typecheck pass, one release workflow that
builds both images and writes both digests in the same promotion commit. Copying
a proven layout is worth more here than any independence two repositories would
buy.

The trade-off accepted: a change touching only the storefront still runs the
backend's checks, and the two cannot be released independently. Both are cheap
at this size, and the second is arguably a benefit — a storefront that assumes a
backend change is prevented from shipping ahead of it.

Rejecting workspaces without rejecting the monorepo was not seriously
considered: two dependency trees in one repository is the cost of both options
and the benefit of neither.

## Consequences

- A store-API change is one pull request, not two with an ordering.
- The pull-request size gate is measured against a repository containing both
  applications, so an incidental storefront edit inside a backend task counts.
- The release workflow builds two images and promotes two digests atomically.
- `universe/repositories.yaml` gains `typescript` in the same commit as the
  first TypeScript file, and `npm_project` becomes `true` at the same moment.
