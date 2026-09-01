#!/bin/sh
set -eu

# Writes the two published image digests into one allowlisted deploys overlay.
#
# This runs inside a job that holds a write token for hannosirkel/deploys, in
# either `deploy-test.yml` (`pull_request_target`, test overlay) or
# `release.yml` (`push` to main, live overlay). Everything it refuses, it
# refuses because accepting it would let a promotion write something other
# than exactly two digest lines in exactly one file.
#
# `scripts/update-gitops-digest.test.ts` exercises every refusal reachable
# from a fixture it fully controls -- the overlay's location, its contents,
# both digests -- plus the one mid-flight replacement race
# (`target_matches_original`) it can force deterministically, by shimming the
# one command the guard itself runs at the exact point the race needs, rather
# than by timing. It does not independently exercise the snapshot phase's own
# I/O-failure branches (`could not snapshot/verify/hash/inspect/prepare
# kustomization …`, `kustomization link count is unavailable`) or `unexpected
# changed file`: each needs a *second* failure timed to a point inside one
# script invocation that a fixture set up beforehand cannot reach without
# triggering the first failure it would be caught by already. Also
# unexercised (review pass 5): the post-write verification's own copy of the
# `entries.length !== images.length` bound. Every fixture that would trip it
# is refused by the rewriter's identical check first, so no test drives this
# specific copy of it independently -- unlike the rest of that verification
# copy's checks, which the stubbed-rewriter fixtures below do reach by
# bypassing the rewriter outright.

if [ "$#" -ne 3 ]; then
  echo 'usage: update-gitops-digest.sh sha256:BACKEND_DIGEST sha256:STOREFRONT_DIGEST OVERLAY_DIRECTORY' >&2
  exit 2
fi

backend_digest="$1"
storefront_digest="$2"
overlay_input="$3"
candidate=''
original=''
verification=''
restore_needed=0

for digest in "$backend_digest" "$storefront_digest"; do
  case "$digest" in
    sha256:????????????????????????????????????????????????????????????????) ;;
    *)
      echo 'digest update rejected: malformed digest' >&2
      exit 1
      ;;
  esac
  if ! printf '%s' "$digest" | grep -Eq '^sha256:[0-9a-f]{64}$'; then
    echo 'digest update rejected: malformed digest' >&2
    exit 1
  fi
done

# Baselined pre-existing finding, not a fix. `CDPATH=` is a deliberate empty
# assignment scoped to this one `cd`, which is how a `cd` is made to ignore an
# inherited CDPATH at all.
# shellcheck disable=SC1007
if ! overlay="$(CDPATH= cd "$overlay_input" && pwd -P)"; then
  echo 'digest update rejected: overlay is unavailable' >&2
  exit 1
fi
if ! repository="$(git -C "$overlay" rev-parse --show-toplevel 2>/dev/null)"; then
  echo 'digest update rejected: overlay is not in a Git worktree' >&2
  exit 1
fi
# Baselined pre-existing finding, not a fix. Same deliberate `CDPATH=` prefix.
# shellcheck disable=SC1007
repository="$(CDPATH= cd "$repository" && pwd -P)"
case "$overlay" in
  "$repository"/*) relative_overlay="${overlay#"$repository"/}" ;;
  *)
    echo 'digest update rejected: overlay is outside its Git worktree' >&2
    exit 1
    ;;
esac
# `pwd -P` above resolved every symlink in `$overlay_input`, so a `live`
# directory replaced by a symlink to `test` (or the reverse) resolves to the
# other, legitimately allowlisted, overlay -- writing it silently under the
# name the caller never asked for. Comparing the caller's own last path
# segment against the resolved one catches exactly that redirection, without
# needing to know which overlay was intended beyond what was asked for.
requested_overlay="${overlay_input%/}"
requested_overlay="${requested_overlay##*/}"
resolved_overlay="${relative_overlay##*/}"
if [ "$requested_overlay" != "$resolved_overlay" ]; then
  echo 'digest update rejected: overlay resolved to a different overlay than requested' >&2
  exit 1
fi
case "$relative_overlay" in
  lousydeal/overlays/live|lousydeal/overlays/test) ;;
  *)
    echo 'digest update rejected: overlay is not permitted' >&2
    exit 1
    ;;
esac

kustomization="$overlay/kustomization.yaml"
if [ ! -f "$kustomization" ] || [ -L "$kustomization" ]; then
  echo 'digest update rejected: kustomization is unavailable' >&2
  exit 1
fi
if ! link_count="$(node -e 'process.stdout.write(String(require("node:fs").statSync(process.argv[1]).nlink))' "$kustomization")"; then
  echo 'digest update rejected: kustomization link count is unavailable' >&2
  exit 1
fi
if [ "$link_count" -ne 1 ]; then
  echo 'digest update rejected: kustomization must not be hard-linked' >&2
  exit 1
fi
if [ -n "$(git -C "$repository" status --porcelain)" ]; then
  echo 'digest update rejected: checkout is not clean' >&2
  exit 1
fi

original="$(mktemp "$overlay/.update-gitops-digest.XXXXXX")"
if ! cp -p "$kustomization" "$original"; then
  rm -f "$original"
  echo 'digest update rejected: could not snapshot kustomization' >&2
  exit 1
fi
verification="$original.verify"
if ! cp -p "$original" "$verification"; then
  rm -f "$original" "$verification"
  echo 'digest update rejected: could not verify kustomization snapshot' >&2
  exit 1
fi
if ! snapshot_hash="$(node -e 'const crypto = require("node:crypto"); const fs = require("node:fs"); process.stdout.write(crypto.createHash("sha256").update(fs.readFileSync(process.argv[1])).digest("hex"))' "$verification")"; then
  rm -f "$original" "$verification"
  echo 'digest update rejected: could not hash kustomization snapshot' >&2
  exit 1
fi
if ! original_inode="$(node -e 'process.stdout.write(String(require("node:fs").statSync(process.argv[1]).ino))' "$kustomization")"; then
  rm -f "$original" "$verification"
  echo 'digest update rejected: could not inspect kustomization snapshot' >&2
  exit 1
fi
# Baselined pre-existing finding, not a fix. The single quotes hold JavaScript
# for `node -e`, where a backtick template literal is the program's own syntax
# and must not be expanded by the shell.
# shellcheck disable=SC2016
if ! original_metadata="$(node -e 'const stat = require("node:fs").statSync(process.argv[1]); process.stdout.write(`${stat.mode & 0o7777}:${stat.uid}:${stat.gid}`)' "$kustomization")"; then
  rm -f "$original" "$verification"
  echo 'digest update rejected: could not inspect kustomization metadata' >&2
  exit 1
fi
candidate="$(mktemp "$overlay/.update-gitops-digest-candidate.XXXXXX")"
if ! cp -p "$original" "$candidate"; then
  rm -f "$candidate" "$original" "$verification"
  echo 'digest update rejected: could not prepare kustomization candidate' >&2
  exit 1
fi
restore_needed=0
preserve_recovery_snapshot() {
  if [ -f "$original" ] && [ ! -L "$original" ]; then
    recovery_snapshot="$original"
  else
    recovery_snapshot="$verification"
  fi
  echo "digest update rejected: recovery snapshot preserved: $recovery_snapshot" >&2
}
target_matches_original() {
  if [ ! -f "$kustomization" ] || [ -L "$kustomization" ]; then
    return 1
  fi
  if ! current_inode="$(node -e 'process.stdout.write(String(require("node:fs").statSync(process.argv[1]).ino))' "$kustomization")"; then
    return 1
  fi
  if [ "$current_inode" != "$original_inode" ]; then
    return 1
  fi
  if ! current_link_count="$(node -e 'process.stdout.write(String(require("node:fs").statSync(process.argv[1]).nlink))' "$kustomization")"; then
    return 1
  fi
  if [ "$current_link_count" != "$link_count" ]; then
    return 1
  fi
  # Baselined pre-existing finding, not a fix. Same `node -e` program as above.
  # shellcheck disable=SC2016
  if ! current_metadata="$(node -e 'const stat = require("node:fs").statSync(process.argv[1]); process.stdout.write(`${stat.mode & 0o7777}:${stat.uid}:${stat.gid}`)' "$kustomization")"; then
    return 1
  fi
  if [ "$current_metadata" != "$original_metadata" ]; then
    return 1
  fi
  if ! current_hash="$(node -e 'const crypto = require("node:crypto"); const fs = require("node:fs"); process.stdout.write(crypto.createHash("sha256").update(fs.readFileSync(process.argv[1])).digest("hex"))' "$kustomization")"; then
    return 1
  fi
  [ "$current_hash" = "$snapshot_hash" ]
}
restore_kustomization() {
  if [ -d "$kustomization" ]; then
    preserve_recovery_snapshot
    return 1
  fi
  if ! mv -f "$original" "$kustomization"; then
    preserve_recovery_snapshot
    return 1
  fi
  if [ -d "$kustomization" ] || [ ! -f "$kustomization" ] || [ -L "$kustomization" ]; then
    preserve_recovery_snapshot
    return 1
  fi
  if ! restored_link_count="$(node -e 'process.stdout.write(String(require("node:fs").statSync(process.argv[1]).nlink))' "$kustomization")"; then
    preserve_recovery_snapshot
    return 1
  fi
  if [ "$restored_link_count" -ne 1 ]; then
    preserve_recovery_snapshot
    return 1
  fi
  if ! restored_hash="$(node -e 'const crypto = require("node:crypto"); const fs = require("node:fs"); process.stdout.write(crypto.createHash("sha256").update(fs.readFileSync(process.argv[1])).digest("hex"))' "$kustomization")"; then
    preserve_recovery_snapshot
    return 1
  fi
  if [ "$restored_hash" != "$snapshot_hash" ]; then
    preserve_recovery_snapshot
    return 1
  fi
  rm -f "$verification" || true
}
cleanup() {
  status="$?"
  if [ "$restore_needed" -eq 1 ]; then
    if ! restore_kustomization; then
      status=1
    fi
  fi
  if [ "$restore_needed" -eq 0 ]; then
    rm -f "$candidate" "$original" "$verification" || true
  fi
  trap - EXIT HUP INT TERM
  exit "$status"
}
trap cleanup EXIT HUP INT TERM

# Rewrites both digest lines and reports how many of them actually moved, so a
# re-promotion of an already-recorded pair is a no-op rather than a failure and
# the expected diff size below is derived rather than assumed.
changed_count="$(node - "$original" "$candidate" "$backend_digest" "$storefront_digest" <<'NODE'
'use strict';

const fs = require('node:fs');
const [file, candidate, backendDigest, storefrontDigest] = process.argv.slice(2);
const input = fs.readFileSync(file, 'utf8');
const images = [
  ['ghcr.io/hannosirkel/lousydeal-backend', backendDigest],
  ['ghcr.io/hannosirkel/lousydeal-storefront', storefrontDigest],
];
const digestLines = input.match(/^    digest: sha256:[0-9a-f]{64}$/gm) || [];
if (digestLines.length !== images.length) {
  process.stderr.write('digest update rejected: expected one digest per image\n');
  process.exit(1);
}

// Diverges from plepic/scripts/update-gitops-digest.sh here, and from this
// file's own earlier version: a lookahead anchored to the digest line's own
// `$` -- `(?!\n {4}\S)` -- requires the offending fourth key to sit on the
// line immediately following the digest. YAML does not require that: one
// blank line between `digest:` and a trailing `newTag: latest` (same
// 4-space indent) put the lookahead past the only place it was looking and
// let the tag ride through to a promoted overlay untouched. This instead
// parses the `images:` block structurally: every non-blank, non-comment
// line belonging to one `- name:` entry, however far apart they are laid
// out on disk, must be exactly three -- `name`, `newName`, `digest` -- which
// is what "no fourth key" (deploys/lousydeal/overlays/live/kustomization.yaml)
// actually means. A `#`-led comment line is not a fourth key and is
// deliberately not counted: kustomize accepts one there, and the previous
// lookahead refused it too, as a false positive this parse does not repeat.
//
// Bounded, not exhaustive (M9, review pass 3): the entry-item test keys on a
// literal space (`' '`) as the indent character. A fourth key indented with
// a tab, NBSP or vertical tab instead of a space is not counted by this
// parse and is not refused here. That shape is invalid or non-standard YAML
// indentation that `kubectl kustomize` (which `promote` runs before
// `git add`, on both overlays) fails closed on, so nothing reaches the
// cluster -- but that is a downstream backstop, not a guarantee this script
// makes about the bytes it writes.
//
// MINOR 6 (review pass 4): the section boundary used to end on the first
// line not starting with a space, full stop -- which included a `#`
// comment written at column 0. `deploys/lousydeal/overlays/live/
// kustomization.yaml` writes exactly that: an eleven-line column-0 comment
// immediately above `images:`, the file's own established editing pattern,
// and the same pattern placed *inside* the block (documenting one entry, say)
// truncated the entry list and refused a legitimate promotion --
// `guard_exit=1` against input `kubectl kustomize` accepts cleanly. A
// promotion that refuses valid input is exactly as broken as one that
// accepts invalid input, so a `#`-led line, at any column, no longer ends
// the section; only a non-comment, non-blank line starting outside the
// block's own indentation does.
//
// MAJOR 1 (review pass 4): `lines[i] === 'images:'` -- byte equality on one
// spelling of the key -- was the fourth time across four review passes this
// row was defeated the identical way (`wget` vs `curl … | sh`; `SECRETS.`
// vs `secrets.`; unquoted vs quoted `$GITHUB_OUTPUT`). `"images":`,
// `'images':`, trailing whitespace, and a trailing comment (`images: #
// second`) are all the same top-level key to any YAML reader and all
// defeated it -- proven against a real clone: every one of those four
// spellings, plus a fifth, deep-indented decoy carrying the real image
// names and well-shaped forged digests (so the guard's rewriter "fixes" the
// decoy and every downstream check -- `manifests.sh`, `git diff --check`,
// the staged-path assertion -- stays green on the *real*, untouched,
// attacker-controlled block), gave `guard_rc=0` and four attacker images
// rendered by `kubectl kustomize`.
//
// Still incomplete after that fix (review pass 5): `IMAGES_KEY` required
// the line to *end* after the colon (`\s*(?:#.*)?$`), so any value in the
// flow style -- `images: [{name: …, newTag: latest}]`, an anchor
// (`images: &a`), or an explicit tag (`images: !!seq [...]`) -- still sat
// outside the pattern, was not counted as a second key, and the review
// executed it against a real clone: `guard=0`, and because kustomize takes
// the *last* `images:` key, both images were subverted and the storefront
// entry lost its digest outright. `IMAGES_KEY` below now opens the value
// position -- anything may follow the colon on that line -- so it matches
// the key by what precedes the colon, block or flow, not by what shape of
// value follows it. It still matches only single-line block, flow, anchor
// and explicit-tag spellings of the key itself; a key spread across an
// explicit `?`/`:` mapping-entry pair on separate lines, which no
// kustomization in this repository or its reference uses, is not one of
// them.
//
// One spelling checked and deliberately not closed: a mid-document UTF-8
// BOM immediately before a second `images:` (`﻿images:`) is not
// matched by `IMAGES_KEY` and is not refused. Verified inert rather than
// left unexamined: a BOM is only meaningful at the very start of a byte
// stream, so a compliant YAML reader -- kustomize v5.8.1 included, checked
// against a real clone -- does not fold `﻿images` into the same key as
// `images` either, and renders nothing from the block behind it. This is
// the one set in this row where "cannot be exploited" was verified directly
// rather than assumed, and is recorded here rather than silently declared
// closed.
const IMAGES_KEY = /^(?:images|"images"|'images')\s*:(?:\s.*)?$/;

// MAJOR 2 (review pass 5): a sequence item under `images:` whose first
// non-blank, non-comment line was not `  - name: …` -- a flow-style item,
// an anchor-first item (`  - &a`), a reordered item (`  - newName: … `
// before `name:`) -- fell into `if (current === null) continue`, the same
// silent-skip shape `remoteCodeOffences`'s allowlist replaced a blacklist
// with, here reintroduced by omission rather than by enumeration: nothing
// refused it, `entries.length` still counted only the two real entries
// found afterward, and every per-entry check downstream passed because it
// never saw the skipped line at all. Any non-blank, non-comment line inside
// the section that does not start a recognised entry, and is not already
// part of one that is open, is now a refusal rather than a `continue`.
function imageEntries(text) {
  const lines = text.split('\n');
  const imagesKeyLines = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (IMAGES_KEY.test(lines[i])) imagesKeyLines.push(i);
  }
  if (imagesKeyLines.length > 1) {
    process.stderr.write('digest update rejected: expected exactly one images: key\n');
    process.exit(1);
  }
  if (imagesKeyLines.length === 0) return [];
  const imagesIndex = imagesKeyLines[0];
  let sectionEnd = lines.length;
  for (let i = imagesIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() === '' || /^\s*#/.test(line)) continue;
    if (line.length > 0 && line[0] !== ' ') {
      sectionEnd = i;
      break;
    }
  }
  const entries = [];
  let current = null;
  for (let i = imagesIndex + 1; i < sectionEnd; i += 1) {
    const line = lines[i];
    if (line.trim() === '' || /^\s*#/.test(line)) continue;
    if (line.startsWith('  - name: ')) {
      current = { name: line.slice('  - name: '.length), items: [] };
      entries.push(current);
      current.items.push({ index: i, text: line });
      continue;
    }
    if (current === null) {
      process.stderr.write('digest update rejected: unexpected content in images: block\n');
      process.exit(1);
    }
    current.items.push({ index: i, text: line });
  }
  return entries;
}

/** The one well-formed entry for `name` -- exactly `name`, `newName`, `digest` -- or `null`. */
function wellFormedEntry(entries, name) {
  const forName = entries.filter((entry) => entry.name === name);
  if (forName.length !== 1) return null;
  const [entry] = forName;
  if (entry.items.length !== 3) return null;
  const [nameItem, newNameItem, digestItem] = entry.items;
  if (nameItem.text !== `  - name: ${name}`) return null;
  if (newNameItem.text !== `    newName: ${name}`) return null;
  if (!/^    digest: sha256:[0-9a-f]{64}$/.test(digestItem.text)) return null;
  return { digestItem };
}

const lines = input.split('\n');
const entries = imageEntries(input);
if (entries.length !== images.length) {
  // Bounds the entry set itself: two individually well-formed, correctly
  // named entries plus a third, unrelated one all resolve the per-image
  // lookup below without ever inspecting the third -- this is what refuses
  // it, before either name is even looked up.
  process.stderr.write('digest update rejected: expected one image entry\n');
  process.exit(1);
}
let changed = 0;
for (const [name, digest] of images) {
  const wellFormed = wellFormedEntry(entries, name);
  if (wellFormed === null) {
    process.stderr.write('digest update rejected: expected one image entry\n');
    process.exit(1);
  }
  const replacement = `    digest: ${digest}`;
  if (lines[wellFormed.digestItem.index] !== replacement) changed += 1;
  lines[wellFormed.digestItem.index] = replacement;
}
fs.writeFileSync(candidate, lines.join('\n'));
process.stdout.write(String(changed));
NODE
)"

case "$changed_count" in
  0|1|2) ;;
  *)
    echo 'digest update rejected: unexpected update count' >&2
    exit 1
    ;;
esac

if ! target_matches_original; then
  echo 'digest update rejected: kustomization changed during update' >&2
  exit 1
fi

if [ "$changed_count" -eq 0 ]; then
  if ! cmp -s "$original" "$candidate"; then
    echo 'digest update rejected: unchanged update rewrote the kustomization' >&2
    exit 1
  fi
  if [ -n "$(git -C "$repository" diff --name-only)" ]; then
    echo 'digest update rejected: unchanged update modified a tracked file' >&2
    exit 1
  fi
else
  if ! mv -f "$candidate" "$kustomization"; then
    if target_matches_original; then
      restore_needed=0
    else
      restore_needed=1
    fi
    exit 1
  fi
  restore_needed=1

  changed="$(git -C "$repository" diff --name-only)"
  if [ "$changed" != "$relative_overlay/kustomization.yaml" ]; then
    echo 'digest update rejected: unexpected changed file' >&2
    exit 1
  fi

  git -C "$repository" diff --check

  expected_numstat="$(printf '%s\t%s\t%s/kustomization.yaml' \
    "$changed_count" "$changed_count" "$relative_overlay")"
  if [ "$(git -C "$repository" diff --numstat)" != "$expected_numstat" ]; then
    echo 'digest update rejected: unexpected diff size' >&2
    exit 1
  fi

  changed_lines="$(
    git -C "$repository" diff --unified=0 -- "$relative_overlay/kustomization.yaml" \
      | grep -E '^[+-]' | grep -Ev '^(---|\+\+\+)' || true
  )"
  if [ "$(printf '%s\n' "$changed_lines" | grep -c .)" -ne "$((changed_count * 2))" ]; then
    echo 'digest update rejected: unexpected changed lines' >&2
    exit 1
  fi
  if [ "$(printf '%s\n' "$changed_lines" | grep -Ec '^[-+]    digest: sha256:[0-9a-f]{64}$')" \
    -ne "$((changed_count * 2))" ]; then
    echo 'digest update rejected: non-digest line changed' >&2
    exit 1
  fi
fi

node - "$kustomization" "$backend_digest" "$storefront_digest" <<'NODE'
'use strict';

const fs = require('node:fs');
const [file, backendDigest, storefrontDigest] = process.argv.slice(2);
const input = fs.readFileSync(file, 'utf8');
const images = [
  ['ghcr.io/hannosirkel/lousydeal-backend', backendDigest],
  ['ghcr.io/hannosirkel/lousydeal-storefront', storefrontDigest],
];
const digestLines = input.match(/^    digest: sha256:[0-9a-f]{64}$/gm) || [];
if (digestLines.length !== images.length) {
  process.stderr.write('digest update rejected: replacement was not exact\n');
  process.exit(1);
}

// Same structural parse as the rewriter above, and for the same reasons
// (MAJOR 3 and M9, review pass 3; MINOR 6 and MAJOR 1, review pass 4; MAJOR
// 1 and MAJOR 2, review pass 5, apply identically here): a stray fourth key
// at 4-space indent -- already on disk before this run, or introduced by a
// defect in the rewriter that this independent re-read exists to catch --
// must fail here too, however far it sits from the digest line it follows;
// a second `images:` key, matched by what precedes the colon rather than
// one spelling of it or one shape of value after it (`IMAGES_KEY`), is
// refused outright rather than shadowed; the entry count is bounded to
// exactly `images.length` (this copy of that bound is the one named in the
// file header as not independently exercised); a `#`-led line, at any
// column, never ends the section -- only a
// genuine sibling key does; a sequence item that never starts with
// `  - name: ` is refused rather than silently skipped; and, per M9, the
// entry-item test keys on a literal space as the indent character -- a
// non-space-indented fourth key is not counted by this parse and relies on
// `kubectl kustomize` failing closed downstream, not on this check. Kept as
// its own copy, not a shared function, because each runs in its own
// `node -` invocation with no file between them to hold one.
const IMAGES_KEY = /^(?:images|"images"|'images')\s*:(?:\s.*)?$/;

function imageEntries(text) {
  const lines = text.split('\n');
  const imagesKeyLines = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (IMAGES_KEY.test(lines[i])) imagesKeyLines.push(i);
  }
  if (imagesKeyLines.length > 1) {
    process.stderr.write('digest update rejected: expected exactly one images: key\n');
    process.exit(1);
  }
  if (imagesKeyLines.length === 0) return [];
  const imagesIndex = imagesKeyLines[0];
  let sectionEnd = lines.length;
  for (let i = imagesIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() === '' || /^\s*#/.test(line)) continue;
    if (line.length > 0 && line[0] !== ' ') {
      sectionEnd = i;
      break;
    }
  }
  const entries = [];
  let current = null;
  for (let i = imagesIndex + 1; i < sectionEnd; i += 1) {
    const line = lines[i];
    if (line.trim() === '' || /^\s*#/.test(line)) continue;
    if (line.startsWith('  - name: ')) {
      current = { name: line.slice('  - name: '.length), items: [] };
      entries.push(current);
      current.items.push({ index: i, text: line });
      continue;
    }
    if (current === null) {
      process.stderr.write('digest update rejected: unexpected content in images: block\n');
      process.exit(1);
    }
    current.items.push({ index: i, text: line });
  }
  return entries;
}

const entries = imageEntries(input);
if (entries.length !== images.length) {
  process.stderr.write('digest update rejected: replacement was not exact\n');
  process.exit(1);
}
for (const [name, digest] of images) {
  const forName = entries.filter((entry) => entry.name === name);
  const entry = forName.length === 1 ? forName[0] : null;
  const exact =
    entry !== null &&
    entry.items.length === 3 &&
    entry.items[0].text === `  - name: ${name}` &&
    entry.items[1].text === `    newName: ${name}` &&
    entry.items[2].text === `    digest: ${digest}`;
  if (!exact) {
    process.stderr.write('digest update rejected: replacement was not exact\n');
    process.exit(1);
  }
}
NODE

restore_needed=0
rm -f "$candidate" "$original" "$verification" || true
trap - EXIT HUP INT TERM
