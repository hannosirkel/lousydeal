# LD-01 — operator decisions

Every operator answer, approval, and gate acceptance, dated. This is durable
evidence and is relocated at retirement rather than deleted with the working
state.

## 2026-08-29 — preflight

**Preflight result.** All checks pass. Two mismatches were raised and both are
resolved below. Orange host reachability is absent, which the binding
anticipates: it is first needed at T14 and no earlier row touches it.

**External accounts held.** Asked once, per the mechanism's batched question.
The operator holds all five:

| Account | Held | First needed |
| --- | --- | --- |
| Stripe, test mode | yes | T6, key itself at T14 |
| Cloudflare DNS and Access for `lousydeal.com` | yes | T16 |
| GitHub write to `hannosirkel/deploys` | yes | T12 |
| GHCR publish under `hannosirkel` | yes | T12 |
| Orange host access and OpenBao operator credentials | yes | T14 |

Stripe live keys were not requested and are not in scope. They belong to the
publication gate, which follows this build.

**Missing tools, resolved.** `kubeconform` and `ansible-playbook` were absent
and undeclared. The operator directed that Ansible be used from the `orange`
repository's virtualenv and that `kubeconform` be installed.

- `ansible-playbook`: `~/app/orange/.venv/bin/ansible-playbook`, core 2.21.2.
- `kubeconform`: installed to `~/.local/bin/kubeconform`, v0.8.0.

Both verification commands in the binding's §9 contract are now executable.

**T13a size override, pre-approved.** T13a declares `lousydeal/base/*.yaml`
plus both overlay kustomizations plus the manifest test. The glob's stated
contents enumerate nine resources, so the row lands at roughly twelve to
thirteen files against a bound of ten. The binding's §8 claim that no unit
exceeds the bound does not hold for this row.

The operator approved the override in advance: one coherent theme — the base
manifest set — and splitting it would leave an overlay that does not render.
Exact file and line counts go in the pull-request body when T13a is presented.

**Classification and pull-request split confirmed.** 23 AGENT rows, 3 JOINT,
one pull request per row, six milestones. T15 was classified JOINT to close a
gap in the binding; see `ledger.md`.

## 2026-08-29 — T1a review, pass 2

Two operator decisions, both arising from review findings that no subagent had
the authority to act on. Both were batched at the T1 boundary.

**The workspace typecheck gap → T1b guards it in `scripts/validate`.** The root
`tsc --noEmit` does not recurse into workspaces, so from T3 onward the entire
application's type checking would sit outside the CI gate while the gate
reported pass. The reference implementation solves this with per-workspace
`npm run typecheck --workspace <name>` lines in `scripts/validate`, guarded so
they are skipped while the workspace does not exist.

The alternative — a zero-workspace-tolerant script in root `package.json` — was
rejected on evidence. `npm run typecheck --workspaces --if-present` exits 1 with
`No workspaces found!` on an empty tree, and the `|| tsc --noEmit` fallback that
makes it pass also swallows real workspace failures. A working form needs an
`npm query` guard inside a JSON string, which is materially harder to read and
to keep correct than the same guard in bash.

`scripts/validate` was already in T1's `Files` list, so this needs no plan edit
and no re-keying. It does go beyond T1b's checkbox text, which enumerates the
three root commands only; the operator chose the interpretation over amending
the text, and the plan edit below records the requirement in the `Files` note
rather than in the checkbox, keeping the row's hash stable.

**Q1, the stale prose → `AGENTS.md` and `README.md` join T1b's `Files` list.**
Both describe this repository as holding documentation and checks only, and
`docs/decisions/001` says `npm_project` flips at the same moment as the first
TypeScript file. T1a makes all three false, and no row in the plan could reach
them. Corrected one row after the statement stops being true.

**Plan edit, verified hash-safe.** T1's `Files` line gained `AGENTS.md` and
`README.md` plus a note on the typecheck fanout. No checkbox text changed:
recomputing every hash gives 26 rows and zero drift against the ledger, so no
row identity moved.

## Model tier substitutions

The binding's §11 assigns T1 to the low tier. T1a was raised to mid and the
substitution is recorded here rather than taken silently: the workspace
configuration this row produces — the TypeScript, ESLint and Vitest setup — is
the substrate every one of the twenty-five later rows compiles and lints
against, and an error in it does not surface locally but as noise spread across
the rows that follow. Raising an implementer is safe under the tier floor;
lowering a reviewer is not, and no reviewer has been lowered.
