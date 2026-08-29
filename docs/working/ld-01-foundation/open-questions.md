# LD-01 — open questions

Batched at task boundaries rather than asked one at a time. A question whose
answer blocks the very next action is asked immediately and recorded here
anyway.

## Open

**Q2 · raised at T1b, for the M1 boundary. The link checker is flaky against
GitHub, and now runs twice per pull request.**

During T1b's local testing `lychee` failed three separate runs with
`504 Gateway Timeout` on `github.com` URLs and passed on retry. `lychee.toml`
sets `accept = ["200", "204", "206", "429"]` and `max_retries = 2`; a 504 is
neither accepted nor reliably survived by two retries.

Before this row, CI ran `lychee` once, in the `Documentation` job. The canonical
job now runs it again through `scripts/validate`, so a pull request has two
independent chances to fail on a transient upstream timeout. That is the cost of
the row's own goal — CI running the identical command — and is not a defect in
it.

`lychee.toml` is in **no row's `Files` list** in the 26-row plan, so no row is
authorised to change it. Options, for the operator:

1. Accept the flakiness and re-run failed jobs. Costs nothing now.
2. Add `lychee.toml` to a later row's `Files` list and add `502`, `503`, `504` to
   `accept`, or raise `max_retries`. Trades strictness for stability.
3. Treat it as the first `docs/issues/` entry.

Not urgent — it is a re-run, not a wrong result. But it will recur.

**Q3 · answered by the operator; the work it points at is open in another
repository. Raised at T2a and T2c. Declaring a language inherits two defects in
the universe renderer.**

Both were confirmed by measurement, both predate this plan, and `plepic` — same
profile, same generated config — carries both today. The operator has ruled them
universe-level work against `architecture` rather than part of LD-01.

**1. The generated root file list re-includes `node_modules`.**
`tooling/universe_render.py` emits each language's globs then the generic
fallback, de-duplicating, so `!**/node_modules/**` lands *before* `**/*.md`,
`**/*.yaml` and `**/*.yml`. `pathspec` is last-match-wins. Confirmed with
habit-hooks' own library:

```text
before  node_modules/foo/README.md: excluded   node_modules/foo/action.yml: excluded
after   node_modules/foo/README.md: INCLUDED   node_modules/foo/action.yml: INCLUDED
```

No ordering of `languages` avoids it; the fallback's exclusions need a
guaranteed-last position. It was latent until `npm ci` ran, and is now
observable — `habit-hooks` lists `node_modules/*/README.md`.

**2. Three generated sensors have no installed tool.**

```text
sensor 'knip'    needs the 'knip' command, which is not installed
sensor 'comment' failed: ts-morph is not installed in this project
sensor 'jscpd'   needs the 'jscpd' command, which is not installed
⚠️ this run did not complete — a tool broke, so a clean result cannot be trusted
```

Measured across the config change, the `incomplete-run` marker goes from
**absent to present**, carrying 3 failing sensors; total markers go 1 to 2, the
other being `oversized-file`. So T2c does introduce `incomplete-run` to
`lousydeal`. `plepic` has the identical three failures. `npm_project: true` additionally drops the `[sensors.jscpd] disabled = true` block that had been suppressing one of them.

**Consequence for the rest of LD-01, and the reason this is recorded here rather
than only in `architecture`:** `AGENTS.md` says *"Run `habit-hooks` before
declaring an edit done."* From T2c onward that command cannot return a
trustworthy result in this repository. **A later row seeing `incomplete-run` is
looking at this, not at something it broke.** The pre-commit hook runs `gitleaks`
only, so commits are unaffected.

**Q4 · raised at the T2c review. `README.md` states the catalogue is behind, and
no open row can correct it.**

`README.md` lines 13–14 say *"The catalogue still records `languages: [shell]`
and `npm_project: false` — that is row T2's to correct."* T2a merged, so that is
false. It is the same failure Q1 raised, recurring one row later.

`AGENTS.md` carried the same claim in different words and **was** fixed here,
because it is in T2c's `Files` list. `README.md` is not. Q1's answer put `README.md` in T1b's
list, and T1b has closed, so **no open row has the authority.**

`docs/decisions/001` line 52 says the same thing, but a decision record states
what was decided at the time and is not rewritten when the world moves on. That
one is correctly left alone.

Options are the same three Q1 had: add `README.md` to an open row's `Files`
list, fix it as a standalone orchestrator repair, or open it as the first
`docs/issues/` entry.

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
