# LD-01 — open questions

Batched at task boundaries rather than asked one at a time. A question whose
answer blocks the very next action is asked immediately and recorded here
anyway.

## Open

**Q5 · raised at T4, for the publication gate. Medusa 2.18.0 brings 17 advisories
with it.**

Installing `@medusajs/framework@2.18.0` — the version the plan names as the
reference implementation and records as a Current Repository Fact — added **593
packages**, and `npm audit` reports **17 vulnerabilities: 4 moderate, 13 high**,
all in Medusa's own transitive tree rather than in anything this repository
chose.

The operator ruled on 2026-08-30 that the pin stays. Moving off the reference
version unilaterally would break the alignment the whole plan is built on, and
the advisories are not reachable from anything LD-01 ships to a public surface:
nothing is deployed until T15, and the apex is not published in this slice at
all.

**This belongs to the publication gate, not to a build row.** That gate already
precedes any live deployment and already owns the legal and tax questions; the
dependency posture is the same kind of decision. Before it, someone should
establish which advisories are actually reachable, whether a patched transitive
version exists that does not diverge the lockfile from the reference, and whether
Medusa has released a later 2.18.x.

Recorded rather than acted on, deliberately. A row scoped to database SSL
resolution is not the place to take a security judgement about a framework's
dependency tree.

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

## Answered

**Q4 · answered at T2b, and the answer is a rule rather than a patch.**

`README.md` stated that the catalogue records `languages: [shell]` and
`npm_project: false`. T2a falsified it. `AGENTS.md` had carried the same claim
and was corrected at T2c because it happened to be in that row's `Files` list;
`README.md` was in no open row's, and Q1's answer had put it in T1b's, which had
closed.

That was the third occurrence of one failure: a tracked document falsified by a
merge, with no row authorised to correct it. The operator chose a class-level
answer over a third patch.

**The plan gained global constraint 9 at T2b:** *a row that falsifies a tracked
document carries that document in its `Files` list.* Constraints are copied
verbatim into every subagent's context packet, so the remaining rows inherit it
with their work rather than depending on the orchestrator remembering. A
decision record is exempt — it states what was decided then, and is superseded
rather than rewritten.

`README.md` was added to T2b's `Files` list and corrected in the same row. The
plan's own "Current repository facts" table, stale on three counts, was
refreshed under the new constraint at the same time.

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
