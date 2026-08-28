<!-- BEGIN MANAGED ARCHITECTURE BASELINE -->
<!-- Generated from hannosirkel/architecture. Do not edit inside these markers.
     Regenerate with: tooling/universe sync-baseline lousydeal -->

Governed by [`architecture`](https://github.com/hannosirkel/architecture).

| | |
| --- | --- |
| Profile | `application-public` |
| Visibility | declared public, currently public |
| Languages | shell |

**Standards that apply here.** Read a standard before you change something it
governs.

- [Agent operation](https://github.com/hannosirkel/architecture/blob/main/standards/agent-operation.md) — worktrees, branches, multi-agent safety, delegation
- [Security](https://github.com/hannosirkel/architecture/blob/main/standards/security.md) — secrets, public and private boundaries, workflow hardening
- [Code quality](https://github.com/hannosirkel/architecture/blob/main/standards/code-quality.md) — gates, coaching, testing, review cutoff
- [Repository contract](https://github.com/hannosirkel/architecture/blob/main/standards/repository-contract.md) — required files, profiles, skills
- [Work routing](https://github.com/hannosirkel/architecture/blob/main/standards/work-routing.md) — where a change starts, and where a working plan belongs
- [Planning](https://github.com/hannosirkel/architecture/blob/main/standards/planning.md) — how a plan row is sized, the pull-request size gate
- [GitOps and deployment](https://github.com/hannosirkel/architecture/blob/main/standards/gitops-and-deployment.md) — promotion by digest, rollback, the sanctioned secrets path
- Language standards: [shell](https://github.com/hannosirkel/architecture/blob/main/standards/languages/shell.md)

**Never commit to a default branch.** Work in `~/app/.worktrees/lousydeal/<task>`.
Branch from `origin/main`. Open a pull request.

**A working plan for this repository goes in `docs/working/`.** A change
spanning several repositories with no clear owner starts in `architecture`
instead.

**This repository must be safe to publish.** Never commit a password, token, key, kubeconfig,
rendered Secret, or live export. No repository in this universe holds a secret
value, and a private one is no exception.

**Run `habit-hooks` before declaring an edit done.** If it is not on `PATH`:

```bash
uv tool install "habit-hooks[python,typescript]"
```

That command names every language plugin **this universe** uses, not this
repository's. Install it whole: a later install naming fewer extras silently
removes the rest.

<!-- END MANAGED ARCHITECTURE BASELINE -->

## What this repository is

The store behind [lousydeal.com](https://lousydeal.com): a novelty shop that
sells a deliberately poor deal and issues a certificate documenting it. The
premise is absurd; the implementation is not.

It owns the storefront, the backend, the certificate renderer, Baldrick, and
this repository's documentation. It does not own deployment state
(`hannosirkel/deploys`), cluster or DNS configuration (`hannosirkel/orange`),
or any secret value.

At the time of writing it holds documentation and the checks that gate it.
`universe/repositories.yaml` records `languages: [shell]` — `scripts/validate`
and the pre-commit hook — and `npm_project: false`. `typescript` joins the list
in the same commit as the first TypeScript file, never ahead of it.

## Commands

```bash
bash scripts/validate
```

It refuses rather than skipping when a tool it needs is absent.

## Workflow

A fresh checkout does not carry the secret scan. Enable the tracked
`.githooks/pre-commit` gitleaks hook once per checkout:

```bash
git config --local core.hooksPath .githooks
```

Never bypass it.

## Security and scope

- This repository is public. Never commit a credential, token, private key,
  rendered Secret, live hostname, or per-environment value.
- Nothing that differs between the live and test environments is baked into a
  built artifact. Per-environment values are read server-side at runtime.
- Baldrick has no LLM backend, and is not to be given one. He is scripted
  flows, keyword matching, and response pools. See
  [`docs/working/fresh-build.md`](./docs/working/fresh-build.md).
- Never publish fabricated customers, transaction totals, testimonials, or
  reviews. The public counters report real orders or they do not ship.

## Where things live

| Question | Answer |
| --- | --- |
| Where did the last agent stop? | [`docs/working/status.md`](./docs/working/status.md) |
| What is the product? | [`docs/current/concept.md`](./docs/current/concept.md) |
| What is being built now? | [`docs/working/fresh-build.md`](./docs/working/fresh-build.md) |
| Why is it like this? | `docs/decisions/` |

Read `docs/working/status.md` before you start, and update it before you stop.
It is the only place that records where the work actually is.
