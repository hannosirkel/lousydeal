# LD-01 — open questions

Batched at task boundaries rather than asked one at a time. A question whose
answer blocks the very next action is asked immediately and recorded here
anyway.

## Open

None.

## Answered

**2026-08-29 · T1 boundary batch.** Q1 below, and the workspace typecheck gap
raised at review pass 2. Both answered; see `decisions.md`. Q1 resolved by
option 1 — `AGENTS.md` and `README.md` added to T1b's `Files` list. The
typecheck gap resolved by guarding it in `scripts/validate`, which T1b owns.

**Q1 · raised at the T1a review, for the T1 boundary. Three documents describe
this repository as holding no application code, and no row's `Files` list can
correct them.**

`AGENTS.md` lines 60–62 and `README.md` lines 12–13 both say the repository
"holds documentation and the checks that gate it" and that `typescript` joins the
catalogue "in the same commit as the first TypeScript file, never ahead of it".
`docs/decisions/001` line 53 says `npm_project` becomes `true` "at the same
moment".

T1a introduces the first TypeScript file. The plan defers the catalogue flip to
T2 as a separate pull request against `architecture`, which is correct under
Global Constraint 6 — a row's file list stays inside one repository. But the
consequence is that from the moment T1a merges, three tracked documents in this
repository state something false about it, and **no row in the 26-row plan
declares `AGENTS.md` or `README.md` in its `Files` list**, so no subagent has the
authority to fix them.

The `AGENTS.md` paragraph sits outside the managed architecture baseline markers,
so it is editable here rather than regenerated from `architecture`.

Three ways to close it, for the operator to choose:

1. Add `README.md` and the `AGENTS.md` prose section to T1b's `Files` list and
   correct them there, one row after the statement stops being true.
2. Carry it to LD-01 retirement, where the binding already relocates durable
   facts to `docs/current/`. The documents stay wrong for the width of the slice.
3. Treat it as out of scope for LD-01 and open it as the first entry in
   `docs/issues/`, which the binding declares absent "and correctly so, until the
   first known issue".

Editing the plan changes what the ledger hashes, so option 1 is a plan edit that
must happen before T1b is classified, not after.

**2026-08-29 · preflight batch.** Five account-ownership questions, the T13a
size override, and the two absent tools. All answered; see `decisions.md`.
