import { spawnSync } from "node:child_process";
import {
  chmodSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

/**
 * The digest guard is the only thing standing between a job holding a GitOps
 * write token -- `deploy-test.yml`'s `promote` (`pull_request_target`) or
 * `release.yml`'s `promote` (`push` to main) -- and the deploys repository.
 * Its refusals are the deliverable, so every one of them is exercised here
 * against a real Git fixture rather than asserted in prose.
 */

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const guard = join(repoRoot, "scripts", "update-gitops-digest.sh");

const BACKEND_IMAGE = "ghcr.io/hannosirkel/lousydeal-backend";
const STOREFRONT_IMAGE = "ghcr.io/hannosirkel/lousydeal-storefront";

const SENTINEL = `sha256:${"0".repeat(64)}`;
const BACKEND_DIGEST = `sha256:${"a".repeat(64)}`;
const STOREFRONT_DIGEST = `sha256:${"b".repeat(64)}`;

const HEADER = [
  "---",
  "apiVersion: kustomize.config.k8s.io/v1beta1",
  "kind: Kustomization",
  "namespace: lousydeal-test",
  "nameSuffix: -test",
  "resources:",
  "  - ../../base",
  "images:",
].join("\n");

const TRAILER = [
  "patches:",
  "  - target:",
  "      kind: Service",
  "      name: lousydeal-storefront",
  "    patch: |-",
  "      - op: replace",
  "        path: /spec/ports/0/port",
  "        value: 8111",
  "",
].join("\n");

function imageBlock(name: string, digest: string): string {
  return [`  - name: ${name}`, `    newName: ${name}`, `    digest: ${digest}`].join("\n");
}

function kustomization(backend: string = SENTINEL, storefront: string = SENTINEL): string {
  return [
    HEADER,
    imageBlock(BACKEND_IMAGE, backend),
    imageBlock(STOREFRONT_IMAGE, storefront),
    TRAILER,
  ].join("\n");
}

const roots: string[] = [];

function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "lousydeal-gitops-guard-"));
  roots.push(root);
  return root;
}

function git(repository: string, ...args: string[]): void {
  const result = spawnSync("git", ["-C", repository, ...args], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  }
}

interface FixtureOptions {
  /** Extra overlay directories to create and commit, relative to the repository. */
  readonly extraOverlays?: readonly string[];
  /** Replacement content for `lousydeal/overlays/test/kustomization.yaml`. */
  readonly testOverlayContent?: string;
}

/** Creates a committed, clean Git worktree shaped like `hannosirkel/deploys`. */
function fixture(options: FixtureOptions = {}): string {
  const repository = join(makeRoot(), "deploys");
  const overlays = [
    "lousydeal/overlays/live",
    "lousydeal/overlays/test",
    ...(options.extraOverlays ?? []),
  ];
  for (const overlay of overlays) {
    const directory = join(repository, overlay);
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, "kustomization.yaml"), kustomization());
  }
  if (options.testOverlayContent !== undefined) {
    writeFileSync(
      join(repository, "lousydeal/overlays/test/kustomization.yaml"),
      options.testOverlayContent,
    );
  }
  git(repository, "init", "--quiet", "--initial-branch=main");
  git(repository, "config", "user.name", "fixture");
  git(repository, "config", "user.email", "fixture@example.invalid");
  git(repository, "config", "commit.gpgsign", "false");
  git(repository, "add", "--all");
  git(repository, "commit", "--quiet", "-m", "fixture");
  return repository;
}

function run(...args: string[]): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync("sh", [guard, ...args], { encoding: "utf8" });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function overlayFile(repository: string, overlay: string): string {
  return readFileSync(join(repository, overlay, "kustomization.yaml"), "utf8");
}

function porcelain(repository: string): string {
  const result = spawnSync("git", ["-C", repository, "status", "--porcelain"], {
    encoding: "utf8",
  });
  return result.stdout;
}

function numstat(repository: string): string {
  const result = spawnSync("git", ["-C", repository, "diff", "--numstat"], {
    encoding: "utf8",
  });
  return result.stdout.trim();
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("the guard's shape", () => {
  it("is a POSIX shell script allowlisting only this application's overlays", () => {
    const source = readFileSync(guard, "utf8");
    expect(source.split("\n")[0]).toBe("#!/bin/sh");
    expect(source).toMatch(/^ {2}lousydeal\/overlays\/live\|lousydeal\/overlays\/test\) ;;$/m);
    expect(source).not.toMatch(/servitium/);
  });
});

describe("the success path", () => {
  it("writes both digests and leaves every other byte alone", () => {
    const repository = fixture();
    const before = overlayFile(repository, "lousydeal/overlays/test");
    const mode = statSync(join(repository, "lousydeal/overlays/test/kustomization.yaml")).mode;

    const result = run(
      BACKEND_DIGEST,
      STOREFRONT_DIGEST,
      join(repository, "lousydeal/overlays/test"),
    );

    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(overlayFile(repository, "lousydeal/overlays/test")).toBe(
      kustomization(BACKEND_DIGEST, STOREFRONT_DIGEST),
    );
    expect(before).toBe(kustomization());
    expect(numstat(repository)).toBe("2\t2\tlousydeal/overlays/test/kustomization.yaml");
    expect(statSync(join(repository, "lousydeal/overlays/test/kustomization.yaml")).mode).toBe(mode);
  });

  it("leaves the live overlay untouched when writing the test overlay", () => {
    const repository = fixture();

    expect(
      run(BACKEND_DIGEST, STOREFRONT_DIGEST, join(repository, "lousydeal/overlays/test")).status,
    ).toBe(0);

    expect(overlayFile(repository, "lousydeal/overlays/live")).toBe(kustomization());
    expect(porcelain(repository)).toBe(" M lousydeal/overlays/test/kustomization.yaml\n");
  });

  it("accepts the live overlay too", () => {
    const repository = fixture();

    expect(
      run(BACKEND_DIGEST, STOREFRONT_DIGEST, join(repository, "lousydeal/overlays/live")).status,
    ).toBe(0);

    expect(overlayFile(repository, "lousydeal/overlays/live")).toBe(
      kustomization(BACKEND_DIGEST, STOREFRONT_DIGEST),
    );
  });

  it("changes only the image whose digest moved", () => {
    const repository = fixture({
      testOverlayContent: kustomization(BACKEND_DIGEST, SENTINEL),
    });

    const result = run(
      BACKEND_DIGEST,
      STOREFRONT_DIGEST,
      join(repository, "lousydeal/overlays/test"),
    );

    expect(result.status).toBe(0);
    expect(numstat(repository)).toBe("1\t1\tlousydeal/overlays/test/kustomization.yaml");
    expect(overlayFile(repository, "lousydeal/overlays/test")).toBe(
      kustomization(BACKEND_DIGEST, STOREFRONT_DIGEST),
    );
  });

  it("is a no-op when re-run with the same digests", () => {
    const repository = fixture();
    const overlay = join(repository, "lousydeal/overlays/test");

    expect(run(BACKEND_DIGEST, STOREFRONT_DIGEST, overlay).status).toBe(0);
    git(repository, "add", "--all");
    git(repository, "commit", "--quiet", "-m", "promote");
    const promoted = overlayFile(repository, "lousydeal/overlays/test");

    const rerun = run(BACKEND_DIGEST, STOREFRONT_DIGEST, overlay);

    expect(rerun.stderr).toBe("");
    expect(rerun.status).toBe(0);
    expect(overlayFile(repository, "lousydeal/overlays/test")).toBe(promoted);
    expect(porcelain(repository)).toBe("");
  });

  it("leaves no temporary files behind", () => {
    const repository = fixture();

    expect(
      run(BACKEND_DIGEST, STOREFRONT_DIGEST, join(repository, "lousydeal/overlays/test")).status,
    ).toBe(0);

    expect(porcelain(repository)).toBe(" M lousydeal/overlays/test/kustomization.yaml\n");
  });
});

describe("malformed digests", () => {
  const rejected: ReadonlyArray<readonly [string, string]> = [
    ["too short", `sha256:${"a".repeat(63)}`],
    ["too long", `sha256:${"a".repeat(65)}`],
    ["out of charset", `sha256:${"g".repeat(64)}`],
    ["uppercase", `sha256:${"A".repeat(64)}`],
    ["missing prefix", "a".repeat(64)],
    ["wrong algorithm", `sha512:${"a".repeat(64)}`],
    ["empty", ""],
    ["shell metacharacters", `sha256:${"a".repeat(57)}; id`],
  ];

  for (const [label, digest] of rejected) {
    it(`refuses a ${label} backend digest`, () => {
      const repository = fixture();

      const result = run(digest, STOREFRONT_DIGEST, join(repository, "lousydeal/overlays/test"));

      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/malformed digest/);
      expect(overlayFile(repository, "lousydeal/overlays/test")).toBe(kustomization());
    });

    it(`refuses a ${label} storefront digest while the backend digest is valid`, () => {
      const repository = fixture();

      const result = run(BACKEND_DIGEST, digest, join(repository, "lousydeal/overlays/test"));

      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/malformed digest/);
      expect(overlayFile(repository, "lousydeal/overlays/test")).toBe(kustomization());
      expect(porcelain(repository)).toBe("");
    });
  }

  it("refuses the wrong number of arguments", () => {
    const repository = fixture();
    const overlay = join(repository, "lousydeal/overlays/test");

    for (const args of [
      [BACKEND_DIGEST, overlay],
      [BACKEND_DIGEST, STOREFRONT_DIGEST],
      [BACKEND_DIGEST, STOREFRONT_DIGEST, overlay, "extra"],
      [],
    ]) {
      const result = run(...args);
      expect(result.status).toBe(2);
      expect(result.stderr).toMatch(/usage:/);
    }
    expect(porcelain(repository)).toBe("");
  });
});

describe("linked and replaced kustomizations", () => {
  it("refuses a symlinked kustomization", () => {
    const repository = fixture();
    const overlay = join(repository, "lousydeal/overlays/test");
    renameSync(join(overlay, "kustomization.yaml"), join(overlay, "kustomization-target.yaml"));
    symlinkSync("kustomization-target.yaml", join(overlay, "kustomization.yaml"));
    git(repository, "add", "--all");
    git(repository, "commit", "--quiet", "-m", "symlink");

    const result = run(BACKEND_DIGEST, STOREFRONT_DIGEST, overlay);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/kustomization is unavailable/);
    expect(readFileSync(join(overlay, "kustomization-target.yaml"), "utf8")).toBe(kustomization());
  });

  it("refuses a hard-linked kustomization without touching the other link", () => {
    const repository = fixture();
    const overlay = join(repository, "lousydeal/overlays/test");
    const outside = join(dirname(repository), "hardlink-target.yaml");
    linkSync(join(overlay, "kustomization.yaml"), outside);

    const result = run(BACKEND_DIGEST, STOREFRONT_DIGEST, overlay);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/must not be hard-linked/);
    expect(readFileSync(outside, "utf8")).toBe(kustomization());
    expect(overlayFile(repository, "lousydeal/overlays/test")).toBe(kustomization());
  });

  it("refuses a missing kustomization", () => {
    const repository = fixture();
    const overlay = join(repository, "lousydeal/overlays/test");
    rmSync(join(overlay, "kustomization.yaml"));

    const result = run(BACKEND_DIGEST, STOREFRONT_DIGEST, overlay);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/kustomization is unavailable/);
  });

  it("refuses a checkout the dirty-check cannot vouch for because a file is unreadable", () => {
    // Not the message its own name suggests. Revoking read permission on the
    // kustomization was meant to isolate `cp -p "$kustomization" "$original"`
    // failing -- the first thing that actually opens the file -- and prove
    // "could not snapshot kustomization" separately from every check that
    // came before it. It does not reach that far: `git status --porcelain`,
    // one step earlier, cannot confirm the file is unchanged without reading
    // it either, and reports it dirty first. Kept anyway, retitled to the
    // property it actually demonstrates -- the dirty-checkout refusal is not
    // limited to a file with different *content*, and fires just as reliably
    // when it cannot be read to compare at all.
    const repository = fixture();
    const overlay = join(repository, "lousydeal/overlays/test");
    const kustomizationPath = join(overlay, "kustomization.yaml");
    chmodSync(kustomizationPath, 0o000);

    const result = run(BACKEND_DIGEST, STOREFRONT_DIGEST, overlay);

    chmodSync(kustomizationPath, 0o644);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/digest update rejected: checkout is not clean/);
    expect(overlayFile(repository, "lousydeal/overlays/test")).toBe(kustomization());
    expect(porcelain(repository)).toBe("");
  });
});

describe("overlays outside the worktree", () => {
  it("refuses a directory that is not in a Git worktree", () => {
    const outside = join(makeRoot(), "lousydeal/overlays/test");
    mkdirSync(outside, { recursive: true });
    writeFileSync(join(outside, "kustomization.yaml"), kustomization());

    const result = run(BACKEND_DIGEST, STOREFRONT_DIGEST, outside);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/not in a Git worktree/);
    expect(readFileSync(join(outside, "kustomization.yaml"), "utf8")).toBe(kustomization());
  });

  it("refuses a directory that does not exist", () => {
    const repository = fixture();

    const result = run(
      BACKEND_DIGEST,
      STOREFRONT_DIGEST,
      join(repository, "lousydeal/overlays/absent"),
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/overlay is unavailable/);
  });

  it("refuses a `..` traversal that lands outside any Git worktree", () => {
    // Four levels up from the overlay is the temporary directory holding the
    // fixture, so this is the not-a-worktree refusal reached by traversal --
    // `/digest update rejected: /` matched every refusal the guard has, and
    // so could not tell which one had fired, or that one had fired at all.
    const repository = fixture();
    const escape = join(repository, "lousydeal/overlays/test", "..", "..", "..", "..");

    const result = run(BACKEND_DIGEST, STOREFRONT_DIGEST, escape);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/digest update rejected: overlay is not in a Git worktree/);
    expect(overlayFile(repository, "lousydeal/overlays/test")).toBe(kustomization());
    expect(porcelain(repository)).toBe("");
  });

  it("refuses a `..` traversal back to the worktree root", () => {
    // The worktree-escape branch proper: a path that resolves inside a Git
    // worktree but not underneath its top level.
    const repository = fixture();
    const escape = join(repository, "lousydeal/overlays/test", "..", "..", "..");

    const result = run(BACKEND_DIGEST, STOREFRONT_DIGEST, escape);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/digest update rejected: overlay is outside its Git worktree/);
    expect(porcelain(repository)).toBe("");
  });

  it("resolves `..` before consulting the allowlist", () => {
    const repository = fixture({ extraOverlays: ["otherapp/overlays/test"] });
    const traversal = join(
      repository,
      "lousydeal/overlays/live",
      "..",
      "..",
      "..",
      "otherapp/overlays/test",
    );

    const result = run(BACKEND_DIGEST, STOREFRONT_DIGEST, traversal);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/overlay is not permitted/);
    expect(overlayFile(repository, "otherapp/overlays/test")).toBe(kustomization());
    expect(porcelain(repository)).toBe("");
  });
});

describe("the overlay allowlist", () => {
  const forbidden = [
    "servitium/overlays/live",
    "servitium/overlays/test",
    "lousydeal/overlays/preview",
    "lousydeal/base",
    "overlays/test",
    "otherapp/overlays/test",
  ];

  for (const overlay of forbidden) {
    it(`refuses ${overlay}`, () => {
      const repository = fixture({ extraOverlays: [overlay] });

      const result = run(BACKEND_DIGEST, STOREFRONT_DIGEST, join(repository, overlay));

      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/overlay is not permitted/);
      expect(overlayFile(repository, overlay)).toBe(kustomization());
      expect(porcelain(repository)).toBe("");
    });
  }

  it("refuses the repository root", () => {
    const repository = fixture();
    writeFileSync(join(repository, "kustomization.yaml"), kustomization());
    git(repository, "add", "--all");
    git(repository, "commit", "--quiet", "-m", "root kustomization");

    const result = run(BACKEND_DIGEST, STOREFRONT_DIGEST, repository);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/overlay is outside its Git worktree/);
    expect(readFileSync(join(repository, "kustomization.yaml"), "utf8")).toBe(kustomization());
  });
});

describe("a dirty checkout", () => {
  it("refuses when an unrelated tracked file is modified", () => {
    const repository = fixture();
    writeFileSync(join(repository, "lousydeal/overlays/live/kustomization.yaml"), "tampered\n");

    const result = run(
      BACKEND_DIGEST,
      STOREFRONT_DIGEST,
      join(repository, "lousydeal/overlays/test"),
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/checkout is not clean/);
    expect(overlayFile(repository, "lousydeal/overlays/test")).toBe(kustomization());
  });

  it("refuses when an untracked file is present", () => {
    const repository = fixture();
    writeFileSync(join(repository, "unexpected.txt"), "untracked\n");

    const result = run(
      BACKEND_DIGEST,
      STOREFRONT_DIGEST,
      join(repository, "lousydeal/overlays/test"),
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/checkout is not clean/);
    expect(overlayFile(repository, "lousydeal/overlays/test")).toBe(kustomization());
  });
});

describe("malformed overlays", () => {
  it("refuses an overlay carrying only one image", () => {
    const repository = fixture({
      testOverlayContent: [HEADER, imageBlock(BACKEND_IMAGE, SENTINEL), TRAILER].join("\n"),
    });

    const result = run(
      BACKEND_DIGEST,
      STOREFRONT_DIGEST,
      join(repository, "lousydeal/overlays/test"),
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/expected one digest per image/);
    expect(porcelain(repository)).toBe("");
  });

  it("refuses an overlay carrying a duplicated image entry", () => {
    const repository = fixture({
      testOverlayContent: [
        HEADER,
        imageBlock(BACKEND_IMAGE, SENTINEL),
        imageBlock(BACKEND_IMAGE, SENTINEL),
        TRAILER,
      ].join("\n"),
    });
    const before = overlayFile(repository, "lousydeal/overlays/test");

    const result = run(
      BACKEND_DIGEST,
      STOREFRONT_DIGEST,
      join(repository, "lousydeal/overlays/test"),
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/expected one image entry/);
    expect(overlayFile(repository, "lousydeal/overlays/test")).toBe(before);
    expect(porcelain(repository)).toBe("");
  });

  it("refuses a duplicated entry even when the first copy alone is well-formed", () => {
    // The test above duplicates a fully well-formed entry, so the global
    // digest-count precheck (one digest line per image, counted before any
    // per-image match) already refuses it -- three digest lines for two
    // images -- regardless of whether the duplicate-name check that follows
    // still works. This fixture was built to isolate that later check
    // instead: the second backend entry carries no digest line, so at the
    // time this test was written the digest-count precheck still passed and
    // only the per-image duplicate check could be what refused it.
    //
    // MAJOR 3 (review pass 3) changed that. `imageEntries` now refuses any
    // total entry count other than `images.length` (two), and this fixture
    // has three -- backend, its malformed duplicate, and storefront -- so
    // that bound now refuses it first, before the per-image duplicate check
    // ever runs. Re-verified this is not a hole: the two checks are
    // jointly exhaustive given the entry-count bound. Any duplicate that
    // fits inside a two-entry budget necessarily leaves the *other*
    // required name with zero entries, which the per-image check's own
    // "at least one" arm still refuses independent of how its "at most
    // one" arm is written -- so a `>1` -> `>=1` weakening of the per-image
    // check, on its own, is no longer reachable at all. This fixture is
    // kept because it is still a real malformed shape this script must
    // refuse, not because it isolates one specific line anymore.
    const repository = fixture({
      testOverlayContent: [
        HEADER,
        imageBlock(BACKEND_IMAGE, SENTINEL),
        `  - name: ${BACKEND_IMAGE}\n    newName: ${BACKEND_IMAGE}`,
        imageBlock(STOREFRONT_IMAGE, SENTINEL),
        TRAILER,
      ].join("\n"),
    });
    const before = overlayFile(repository, "lousydeal/overlays/test");

    const result = run(
      BACKEND_DIGEST,
      STOREFRONT_DIGEST,
      join(repository, "lousydeal/overlays/test"),
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/expected one image entry/);
    expect(overlayFile(repository, "lousydeal/overlays/test")).toBe(before);
    expect(porcelain(repository)).toBe("");
  });

  it("refuses an overlay carrying a third digest line", () => {
    const repository = fixture({
      testOverlayContent: [
        HEADER,
        imageBlock(BACKEND_IMAGE, SENTINEL),
        imageBlock(STOREFRONT_IMAGE, SENTINEL),
        imageBlock("ghcr.io/hannosirkel/lousydeal-worker", SENTINEL),
        TRAILER,
      ].join("\n"),
    });

    const result = run(
      BACKEND_DIGEST,
      STOREFRONT_DIGEST,
      join(repository, "lousydeal/overlays/test"),
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/expected one digest per image/);
    expect(porcelain(repository)).toBe("");
  });

  it("refuses an overlay naming an unknown image", () => {
    const repository = fixture({
      testOverlayContent: [
        HEADER,
        imageBlock(BACKEND_IMAGE, SENTINEL),
        imageBlock("ghcr.io/hannosirkel/lousydeal-worker", SENTINEL),
        TRAILER,
      ].join("\n"),
    });

    const result = run(
      BACKEND_DIGEST,
      STOREFRONT_DIGEST,
      join(repository, "lousydeal/overlays/test"),
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/expected one image entry/);
    expect(porcelain(repository)).toBe("");
  });

  it("refuses an overlay whose image block has no digest line", () => {
    const repository = fixture({
      testOverlayContent: [
        HEADER,
        `  - name: ${BACKEND_IMAGE}`,
        `    newName: ${BACKEND_IMAGE}`,
        imageBlock(STOREFRONT_IMAGE, SENTINEL),
        TRAILER,
      ].join("\n"),
    });

    const result = run(
      BACKEND_DIGEST,
      STOREFRONT_DIGEST,
      join(repository, "lousydeal/overlays/test"),
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/expected one digest per image/);
    expect(porcelain(repository)).toBe("");
  });

  it("refuses an image block carrying a fourth key after the digest line", () => {
    // M7: this is a divergence from plepic/scripts/update-gitops-digest.sh --
    // that reference's block pattern ends at the digest line's own `$`, so a
    // key trailing the digest (same 4-space indent, one line further down)
    // sits outside the match and rides through untouched. Against a real
    // clone this let `newTag: latest` survive a promotion and reach
    // `kubectl kustomize` as `backend:latest@sha256:...` -- a tag riding
    // beside the digest the guard exists to keep as the only thing written.
    const repository = fixture({
      testOverlayContent: [
        HEADER,
        `${imageBlock(BACKEND_IMAGE, SENTINEL)}\n    newTag: latest`,
        imageBlock(STOREFRONT_IMAGE, SENTINEL),
        TRAILER,
      ].join("\n"),
    });
    const before = overlayFile(repository, "lousydeal/overlays/test");

    const result = run(
      BACKEND_DIGEST,
      STOREFRONT_DIGEST,
      join(repository, "lousydeal/overlays/test"),
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/expected one image entry/);
    expect(overlayFile(repository, "lousydeal/overlays/test")).toBe(before);
    expect(porcelain(repository)).toBe("");
  });

  it("refuses a fourth key separated from the digest line by a blank line", () => {
    // MAJOR 7 (review pass 2): the lookahead this replaced --
    // `(?!\n {4}\S)` -- is anchored to the digest line's own end, so it only
    // ever looked at the *immediately following* line. YAML does not require
    // a fourth key to sit there: one blank line between `digest:` and
    // `newTag: latest` (same 4-space indent) put the lookahead past the only
    // place it was checking, and the tag rode a promotion through to
    // `kubectl kustomize` untouched -- a floating tag in the live overlay on
    // a green run, the exact thing this row's checkbox says never happens.
    // The structural parse above has no adjacency to be blind to: every
    // non-blank, non-comment line between one `- name:` entry and the next
    // counts, however far apart they are laid out.
    const repository = fixture({
      testOverlayContent: [
        HEADER,
        `${imageBlock(BACKEND_IMAGE, SENTINEL)}\n\n    newTag: latest`,
        imageBlock(STOREFRONT_IMAGE, SENTINEL),
        TRAILER,
      ].join("\n"),
    });
    const before = overlayFile(repository, "lousydeal/overlays/test");

    const result = run(
      BACKEND_DIGEST,
      STOREFRONT_DIGEST,
      join(repository, "lousydeal/overlays/test"),
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/expected one image entry/);
    expect(overlayFile(repository, "lousydeal/overlays/test")).toBe(before);
    expect(porcelain(repository)).toBe("");
  });

  it("tolerates a legitimate 4-space comment line trailing the digest, and still promotes", () => {
    // The lookahead this replaced refused this too: `(?!\n {4}\S)` cannot
    // distinguish a `#`-led kustomize comment from a fourth key, so a
    // perfectly ordinary comment inside the images: block made every
    // promotion targeting that overlay fail -- an over-refusal, not a
    // security property. The structural parse drops comment-only lines
    // before counting an entry's items, the same way it drops blank ones.
    const repository = fixture({
      testOverlayContent: [
        HEADER,
        `${imageBlock(BACKEND_IMAGE, SENTINEL)}\n    # pinned by CI, do not edit by hand`,
        imageBlock(STOREFRONT_IMAGE, SENTINEL),
        TRAILER,
      ].join("\n"),
    });

    const result = run(
      BACKEND_DIGEST,
      STOREFRONT_DIGEST,
      join(repository, "lousydeal/overlays/test"),
    );

    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(overlayFile(repository, "lousydeal/overlays/test")).toBe(
      [
        HEADER,
        `${imageBlock(BACKEND_IMAGE, BACKEND_DIGEST)}\n    # pinned by CI, do not edit by hand`,
        imageBlock(STOREFRONT_IMAGE, STOREFRONT_DIGEST),
        TRAILER,
      ].join("\n"),
    );
  });

  it("tolerates a column-0 comment inside the images: block, and still promotes", () => {
    // MINOR 6 (review pass 4): the section boundary ended on the first line
    // not starting with a space, full stop -- which included a `#` comment
    // written at column 0. `deploys/lousydeal/overlays/live/kustomization.
    // yaml` writes an eleven-line column-0 comment immediately above `images:`
    // -- this file's own established editing convention -- and the same
    // convention applied *inside* the block (documenting one entry, say)
    // truncated the entry list and refused a promotion `kubectl kustomize`
    // accepts without complaint. A promotion that refuses valid input is
    // exactly as broken as one that accepts invalid input, so a `#`-led
    // line, at any column, no longer ends the section.
    const repository = fixture({
      testOverlayContent: [
        HEADER,
        [
          imageBlock(BACKEND_IMAGE, SENTINEL),
          "# not indented at all -- this file's own convention for the",
          "# comment immediately above this key, applied one line lower",
          imageBlock(STOREFRONT_IMAGE, SENTINEL),
        ].join("\n"),
        TRAILER,
      ].join("\n"),
    });

    const result = run(
      BACKEND_DIGEST,
      STOREFRONT_DIGEST,
      join(repository, "lousydeal/overlays/test"),
    );

    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(overlayFile(repository, "lousydeal/overlays/test")).toBe(
      [
        HEADER,
        [
          imageBlock(BACKEND_IMAGE, BACKEND_DIGEST),
          "# not indented at all -- this file's own convention for the",
          "# comment immediately above this key, applied one line lower",
          imageBlock(STOREFRONT_IMAGE, STOREFRONT_DIGEST),
        ].join("\n"),
        TRAILER,
      ].join("\n"),
    );
  });

  it("refuses a fourth key disguised as a trailing comment on its own line", () => {
    // Companion to the comment-tolerance test above, and to a mutation of
    // this file's own comment detection: widening it from "the line starts
    // with a comment" (`/^\s*#/`) to "the line contains a `#` anywhere"
    // (`/#/`) let a real fourth key hide behind a trailing comment --
    // `newTag: latest  # pinned` -- because the widened pattern matched the
    // whole line and skipped it as if it were comment-only. This line still
    // sets `newTag: latest`; the `#` merely trails it. The correct
    // structural parse keeps this line as real entry content -- it does not
    // start with `#` -- so it must still be refused as a fourth key.
    const repository = fixture({
      testOverlayContent: [
        HEADER,
        `${imageBlock(BACKEND_IMAGE, SENTINEL)}\n    newTag: latest  # pinned`,
        imageBlock(STOREFRONT_IMAGE, SENTINEL),
        TRAILER,
      ].join("\n"),
    });
    const before = overlayFile(repository, "lousydeal/overlays/test");

    const result = run(
      BACKEND_DIGEST,
      STOREFRONT_DIGEST,
      join(repository, "lousydeal/overlays/test"),
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/expected one image entry/);
    expect(overlayFile(repository, "lousydeal/overlays/test")).toBe(before);
    expect(porcelain(repository)).toBe("");
  });

  it("refuses a second images: key, rather than rewriting the first and shadowing the second", () => {
    // MAJOR 3 (review pass 3): `lines.indexOf('images:')` -- this file's
    // previous version -- takes the *first* occurrence. Two top-level
    // `images:` keys is invalid YAML by the spec, but kustomize (v5.8.1,
    // verified against a real clone of `hannosirkel/deploys`) accepts the
    // document anyway and uses the *last* one. A first, well-formed "decoy"
    // block that this script happily rewrites, followed by a second, real
    // one holding attacker-controlled floating tags, made
    // `kubectl kustomize` render `image: attacker.example/evil-backend:
    // latest` into the live overlay while this guard exited 0. Caught
    // downstream by `deploys/lousydeal/tests/manifests.sh`, which `promote`
    // runs before `git add` -- so nothing pushes -- but that is a backstop
    // in another repository, not this script's own guarantee.
    const decoyThenReal = [
      HEADER,
      imageBlock(BACKEND_IMAGE, SENTINEL),
      imageBlock(STOREFRONT_IMAGE, SENTINEL),
      "images:",
      "  - name: ghcr.io/hannosirkel/lousydeal-backend",
      "    newName: attacker.example/evil-backend",
      "    newTag: latest",
      "  - name: ghcr.io/hannosirkel/lousydeal-storefront",
      "    newName: attacker.example/evil-storefront",
      "    newTag: latest",
      TRAILER,
    ].join("\n");
    const repository = fixture({ testOverlayContent: decoyThenReal });
    const before = overlayFile(repository, "lousydeal/overlays/test");

    const result = run(
      BACKEND_DIGEST,
      STOREFRONT_DIGEST,
      join(repository, "lousydeal/overlays/test"),
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/expected exactly one images: key/);
    expect(overlayFile(repository, "lousydeal/overlays/test")).toBe(before);
    expect(porcelain(repository)).toBe("");
  });

  describe.each([
    ['double-quoted: "images":', '"images":'],
    ["single-quoted: 'images':", "'images':"],
    ["trailing whitespace: 'images:   '", "images:   "],
    ["trailing comment: 'images: # second'", "images: # second"],
  ])("refuses a second images: key spelled as %s", (_label, spelling) => {
    // MAJOR 1 (review pass 4): this is the fourth review in a row to find
    // the identical shape of defect -- `wget` vs `curl … | sh` (pass 1),
    // `SECRETS.` vs `secrets.` (pass 2), unquoted vs quoted `$GITHUB_OUTPUT`
    // (pass 3), and here, `lines[i] === 'images:'` -- byte equality on one
    // spelling of the key. `"images":`, `'images':`, trailing whitespace,
    // and a trailing comment are the identical top-level key to any YAML
    // reader and all defeated the exact-string check the same way its three
    // predecessors were defeated. Proven against a real clone of
    // `hannosirkel/deploys` for every one of these four: the pre-fix guard
    // exits 0 and `kubectl kustomize` renders four attacker images.
    it("refuses this spelling", () => {
      const decoyThenReal = [
        HEADER,
        imageBlock(BACKEND_IMAGE, SENTINEL),
        imageBlock(STOREFRONT_IMAGE, SENTINEL),
        spelling,
        "  - name: ghcr.io/hannosirkel/lousydeal-backend",
        "    newName: attacker.example/evil-backend",
        "    newTag: latest",
        "  - name: ghcr.io/hannosirkel/lousydeal-storefront",
        "    newName: attacker.example/evil-storefront",
        "    newTag: latest",
        TRAILER,
      ].join("\n");
      const repository = fixture({ testOverlayContent: decoyThenReal });
      const before = overlayFile(repository, "lousydeal/overlays/test");

      const result = run(
        BACKEND_DIGEST,
        STOREFRONT_DIGEST,
        join(repository, "lousydeal/overlays/test"),
      );

      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/expected exactly one images: key/);
      expect(overlayFile(repository, "lousydeal/overlays/test")).toBe(before);
      expect(porcelain(repository)).toBe("");
    });
  });

  describe.each([
    ["flow-style value: images: [{name: …}]", "images: [{name: x, newTag: latest}]"],
    ["anchor: images: &a", "images: &a"],
    ["explicit tag: images: !!seq [...]", "images: !!seq [x]"],
  ])("refuses a second images: key with a %s (value position, not just key spelling)", (_label, spelling) => {
    // MAJOR 1 (review pass 5): the fix in the block above required the line
    // to *end* after the colon (`\s*(?:#.*)?$`), so a value in the flow
    // style, an anchor, or an explicit tag on the same line still fell
    // outside the pattern and was not counted as a second key. Executed by
    // the reviewer against a real clone: `guard=0`, and because kustomize
    // takes the *last* `images:` key, both images were subverted and the
    // storefront entry lost its digest outright. `IMAGES_KEY` now opens the
    // value position -- anything may follow the colon -- so it matches the
    // key by what precedes the colon, not by what shape of value follows.
    it("refuses this spelling", () => {
      const decoyThenReal = [
        HEADER,
        imageBlock(BACKEND_IMAGE, SENTINEL),
        imageBlock(STOREFRONT_IMAGE, SENTINEL),
        spelling,
        TRAILER,
      ].join("\n");
      const repository = fixture({ testOverlayContent: decoyThenReal });
      const before = overlayFile(repository, "lousydeal/overlays/test");

      const result = run(
        BACKEND_DIGEST,
        STOREFRONT_DIGEST,
        join(repository, "lousydeal/overlays/test"),
      );

      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/expected exactly one images: key/);
      expect(overlayFile(repository, "lousydeal/overlays/test")).toBe(before);
      expect(porcelain(repository)).toBe("");
    });
  });

  it("refuses a deep-indented decoy carrying the real names and well-shaped forged digests", () => {
    // The worst case named in the review: a decoy block first, spelled
    // exactly like the real key so it reads as the *only* one to a naive
    // scanner, using the real image names and a well-shaped (but never
    // built, never scanned) forged digest for each -- everything downstream
    // of a byte-equality duplicate check would still be green: the
    // rewriter "fixes" the decoy's digests, `manifests.sh` sees two
    // digest-pinned images by name and passes, `git diff --check` passes,
    // and the staged set is exactly the one allowed path. This differs from
    // the fixture above only in what the second, real block carries --
    // digests, not tags -- to show the duplicate-key refusal fires before
    // any digest-shape reasoning is reached at all, regardless of which the
    // attacker chooses.
    const decoyThenReal = [
      HEADER,
      imageBlock(BACKEND_IMAGE, SENTINEL),
      imageBlock(STOREFRONT_IMAGE, SENTINEL),
      "images:",
      "  - name: ghcr.io/hannosirkel/lousydeal-backend",
      "    newName: attacker.example/evil-backend",
      `    digest: sha256:${"e".repeat(64)}`,
      "  - name: ghcr.io/hannosirkel/lousydeal-storefront",
      "    newName: attacker.example/evil-storefront",
      `    digest: sha256:${"f".repeat(64)}`,
      TRAILER,
    ].join("\n");
    const repository = fixture({ testOverlayContent: decoyThenReal });
    const before = overlayFile(repository, "lousydeal/overlays/test");

    const result = run(
      BACKEND_DIGEST,
      STOREFRONT_DIGEST,
      join(repository, "lousydeal/overlays/test"),
    );

    expect(result.status).not.toBe(0);
    // Whichever check fires first -- the global digest-count precheck (four
    // well-shaped digest lines for two images) or the duplicate-key
    // refusal -- both are this script's own, not a downstream backstop.
    expect(result.stderr).toMatch(/expected (exactly one images: key|one digest per image)/);
    expect(overlayFile(repository, "lousydeal/overlays/test")).toBe(before);
    expect(porcelain(repository)).toBe("");
  });

  it("refuses a third, unbound, name-first entry at the end of one images: block", () => {
    // MAJOR 3's other half: nothing previously bounded how many entries one
    // `images:` block may hold. Two well-formed entries under the expected
    // names, resolved correctly by the per-image lookup, plus a third entry
    // under neither name sat entirely unexamined -- the per-image loop only
    // ever looks *for* `backend`/`storefront`, so this shape -- `- name:`
    // first, well-formed, appended after both real entries -- was never
    // inspected at all and rode through untouched. Named precisely (review
    // pass 5): this test is what is actually exercised here, not "a third
    // entry however it is shaped" -- the entry-count bound below fires for
    // any shape that still leaves `entries.length` at 3, but a third entry
    // that does *not* start with `- name: ` is a different code path,
    // covered by the next test instead.
    const repository = fixture({
      testOverlayContent: [
        HEADER,
        imageBlock(BACKEND_IMAGE, SENTINEL),
        `${imageBlock(STOREFRONT_IMAGE, SENTINEL)}\n  - name: attacker.example/evil-extra\n    newName: attacker.example/evil-extra\n    newTag: latest`,
        TRAILER,
      ].join("\n"),
    });
    const before = overlayFile(repository, "lousydeal/overlays/test");

    const result = run(
      BACKEND_DIGEST,
      STOREFRONT_DIGEST,
      join(repository, "lousydeal/overlays/test"),
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/expected one image entry/);
    expect(overlayFile(repository, "lousydeal/overlays/test")).toBe(before);
    expect(porcelain(repository)).toBe("");
  });

  describe.each([
    [
      "flow-style item, before the first entry",
      "  - {name: attacker.example/evil-extra, newTag: latest}",
    ],
    ["anchor-first item, before the first entry", "  - &decoy\n    name: attacker.example/evil-extra"],
    [
      "reordered item (newName: before name:), before the first entry",
      "  - newName: attacker.example/evil-extra\n    name: attacker.example/evil-extra\n    newTag: latest",
    ],
  ])("refuses a rogue sequence item that never starts with '- name: ' (%s)", (_label, rogue) => {
    // MAJOR 2 (review pass 5): a sequence item under `images:` whose first
    // line is not `  - name: …` -- because it never starts a `current` entry
    // -- fell into `if (current === null) continue`, a silent skip rather
    // than a refusal. `entries.length` still counted only the two real
    // entries found afterward, so the entry-count bound above, and every
    // per-image lookup below, both stayed green while this line rode
    // through untouched. Placed *before* the two real entries so `current`
    // is still `null` when the parser reaches it -- the exact condition the
    // fix closes.
    it("refuses this shape", () => {
      const repository = fixture({
        testOverlayContent: [
          HEADER,
          `${rogue}\n${imageBlock(BACKEND_IMAGE, SENTINEL)}`,
          imageBlock(STOREFRONT_IMAGE, SENTINEL),
          TRAILER,
        ].join("\n"),
      });
      const before = overlayFile(repository, "lousydeal/overlays/test");

      const result = run(
        BACKEND_DIGEST,
        STOREFRONT_DIGEST,
        join(repository, "lousydeal/overlays/test"),
      );

      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/unexpected content in images: block/);
      expect(overlayFile(repository, "lousydeal/overlays/test")).toBe(before);
      expect(porcelain(repository)).toBe("");
    });
  });
});

describe("an overlay directory that resolves to a different overlay than requested", () => {
  it("refuses when live is replaced by a symlink to test", () => {
    // Minor 3: `pwd -P` resolves every symlink in the path, so a `live`
    // directory replaced by a symlink to `test` resolves to `test` --
    // legitimately allowlisted -- and without this check the guard would
    // write the test overlay while believing (and reporting, via `promote`'s
    // `git add …/live/…` staging nothing) that it had promoted live.
    const repository = fixture();
    rmSync(join(repository, "lousydeal/overlays/live"), { recursive: true });
    symlinkSync("test", join(repository, "lousydeal/overlays/live"));
    git(repository, "add", "--all");
    git(repository, "commit", "--quiet", "-m", "replace live with a symlink to test");
    const testBefore = overlayFile(repository, "lousydeal/overlays/test");

    const result = run(
      BACKEND_DIGEST,
      STOREFRONT_DIGEST,
      join(repository, "lousydeal/overlays/live"),
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(
      /digest update rejected: overlay resolved to a different overlay than requested/,
    );
    expect(overlayFile(repository, "lousydeal/overlays/test")).toBe(testBefore);
  });

  it("refuses when test is replaced by a symlink to live, and does not touch live", () => {
    const repository = fixture();
    rmSync(join(repository, "lousydeal/overlays/test"), { recursive: true });
    symlinkSync("live", join(repository, "lousydeal/overlays/test"));
    git(repository, "add", "--all");
    git(repository, "commit", "--quiet", "-m", "replace test with a symlink to live");
    const liveBefore = overlayFile(repository, "lousydeal/overlays/live");

    const result = run(
      BACKEND_DIGEST,
      STOREFRONT_DIGEST,
      join(repository, "lousydeal/overlays/test"),
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(
      /digest update rejected: overlay resolved to a different overlay than requested/,
    );
    expect(overlayFile(repository, "lousydeal/overlays/live")).toBe(liveBefore);
  });
});

describe("the post-write integrity checks", () => {
  /**
   * The guard's own rewriter only ever produces two well-formed digest lines,
   * so from the outside its post-write checks can never be reached: the input
   * that would trip them cannot be expressed. They are reached here by
   * replacing the rewriter -- `node - ORIGINAL CANDIDATE BACKEND STOREFRONT`,
   * the first heredoc -- with a stub that writes chosen bytes and reports a
   * chosen count. Every other `node` call, including the final exactness
   * verification, reaches the real interpreter.
   *
   * That leaves the checks between lines 237 and 326 as the only thing
   * standing between a hostile rewrite and a push to hannosirkel/deploys,
   * which is what they exist for. Delete any one of them and one of these
   * tests goes red.
   */
  interface RewriterStub {
    /** The exact bytes the stubbed rewriter writes to the candidate file. */
    readonly candidate: string;
    /** The number of moved digest lines it claims to have written. */
    readonly changedCount: string;
    /**
     * A tracked file the stubbed rewriter also writes, and its contents. The
     * dirty-checkout refusal runs before the rewriter, so a file that moves
     * *during* the rewrite is the only out-of-band tampering the checks after
     * it can still see.
     */
    readonly tamper?: { readonly file: string; readonly content: string };
  }

  function runWithStubbedRewriter(
    stub: RewriterStub,
    ...args: string[]
  ): { status: number | null; stdout: string; stderr: string } {
    const staging = makeRoot();
    const candidate = join(staging, "candidate.yaml");
    writeFileSync(candidate, stub.candidate);
    const tamperContent = join(staging, "tamper.yaml");
    writeFileSync(tamperContent, stub.tamper?.content ?? "");
    const shim = join(staging, "node");
    writeFileSync(
      shim,
      [
        "#!/bin/sh",
        '# `node - ORIGINAL CANDIDATE BACKEND STOREFRONT` is the rewriter; the',
        '# four-argument form is the final verification, and passes through.',
        'if [ "$#" -eq 5 ] && [ "$1" = "-" ]; then',
        '  cat "$GITOPS_STUB_CANDIDATE" >"$3"',
        '  if [ -n "$GITOPS_STUB_TAMPER_TARGET" ]; then',
        '    cat "$GITOPS_STUB_TAMPER_CONTENT" >"$GITOPS_STUB_TAMPER_TARGET"',
        "  fi",
        '  printf "%s" "$GITOPS_STUB_CHANGED_COUNT"',
        "  exit 0",
        "fi",
        'exec "$GITOPS_REAL_NODE" "$@"',
        "",
      ].join("\n"),
    );
    chmodSync(shim, 0o755);
    const realNode = spawnSync("/bin/sh", ["-c", "command -v node"], {
      encoding: "utf8",
    }).stdout.trim();

    const result = spawnSync("sh", [guard, ...args], {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${staging}:${process.env["PATH"] ?? ""}`,
        GITOPS_REAL_NODE: realNode,
        GITOPS_STUB_CANDIDATE: candidate,
        GITOPS_STUB_CHANGED_COUNT: stub.changedCount,
        GITOPS_STUB_TAMPER_TARGET: stub.tamper?.file ?? "",
        GITOPS_STUB_TAMPER_CONTENT: tamperContent,
      },
    });
    return { status: result.status, stdout: result.stdout, stderr: result.stderr };
  }

  /** Every one of these must leave the deploys checkout exactly as found. */
  function expectUntouched(repository: string, before: string): void {
    expect(overlayFile(repository, "lousydeal/overlays/test")).toBe(before);
    expect(overlayFile(repository, "lousydeal/overlays/live")).toBe(kustomization());
    expect(porcelain(repository)).toBe("");
  }

  it("refuses a rewrite that claims to have moved more lines than there are", () => {
    const repository = fixture();
    const before = overlayFile(repository, "lousydeal/overlays/test");

    const result = runWithStubbedRewriter(
      { candidate: kustomization(BACKEND_DIGEST, STOREFRONT_DIGEST), changedCount: "12" },
      BACKEND_DIGEST,
      STOREFRONT_DIGEST,
      join(repository, "lousydeal/overlays/test"),
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/unexpected update count/);
    expectUntouched(repository, before);
  });

  it("refuses a rewrite that introduces trailing whitespace", () => {
    const repository = fixture();
    const before = overlayFile(repository, "lousydeal/overlays/test");

    const result = runWithStubbedRewriter(
      {
        candidate: kustomization(BACKEND_DIGEST, STOREFRONT_DIGEST).replace(
          `digest: ${STOREFRONT_DIGEST}`,
          `digest: ${STOREFRONT_DIGEST} `,
        ),
        changedCount: "2",
      },
      BACKEND_DIGEST,
      STOREFRONT_DIGEST,
      join(repository, "lousydeal/overlays/test"),
    );

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toMatch(/trailing whitespace/);
    expectUntouched(repository, before);
  });

  it("refuses a rewrite whose diff is a different size from the count it reported", () => {
    const repository = fixture();
    const before = overlayFile(repository, "lousydeal/overlays/test");

    const result = runWithStubbedRewriter(
      { candidate: kustomization(BACKEND_DIGEST, STOREFRONT_DIGEST), changedCount: "1" },
      BACKEND_DIGEST,
      STOREFRONT_DIGEST,
      join(repository, "lousydeal/overlays/test"),
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/unexpected diff size/);
    expectUntouched(repository, before);
  });

  it("refuses a rewrite whose changed lines do not all reach the diff", () => {
    // The changed-line count and the diff size are close relatives, and this
    // is the gap between them: `grep -Ev '^(---|\+\+\+)'` drops the removal
    // of a line that is itself `---`, because the diff renders it `----`.
    // The document separator therefore vanishes from the counted lines while
    // still being counted by `--numstat`, and only the changed-line check is
    // left to notice that the header was rewritten.
    const repository = fixture({
      testOverlayContent: kustomization(BACKEND_DIGEST, SENTINEL),
    });
    const before = overlayFile(repository, "lousydeal/overlays/test");

    const result = runWithStubbedRewriter(
      {
        candidate: kustomization(BACKEND_DIGEST, STOREFRONT_DIGEST).replace(
          /^---$/m,
          "--- # tampered",
        ),
        changedCount: "2",
      },
      BACKEND_DIGEST,
      STOREFRONT_DIGEST,
      join(repository, "lousydeal/overlays/test"),
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/unexpected changed lines/);
    expectUntouched(repository, before);
  });

  it("refuses a rewrite that changes a line other than a digest line", () => {
    // Both digests land exactly as asked, so the final verification passes;
    // the namespace does not, and nothing but this check ever looks at it.
    const repository = fixture({
      testOverlayContent: kustomization(BACKEND_DIGEST, SENTINEL),
    });
    const before = overlayFile(repository, "lousydeal/overlays/test");

    const result = runWithStubbedRewriter(
      {
        candidate: kustomization(BACKEND_DIGEST, STOREFRONT_DIGEST).replace(
          "namespace: lousydeal-test",
          "namespace: lousydeal-live",
        ),
        changedCount: "2",
      },
      BACKEND_DIGEST,
      STOREFRONT_DIGEST,
      join(repository, "lousydeal/overlays/test"),
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/non-digest line changed/);
    expectUntouched(repository, before);
  });

  it("refuses a rewrite that records a digest nobody asked for", () => {
    // Two digest lines, two changed lines, a diff of exactly the expected
    // size -- and the backend image now pinned to an unrelated digest. Only
    // the closing verification reads what was actually written.
    const repository = fixture();
    const before = overlayFile(repository, "lousydeal/overlays/test");
    const substituted = `sha256:${"c".repeat(64)}`;

    const result = runWithStubbedRewriter(
      { candidate: kustomization(substituted, STOREFRONT_DIGEST), changedCount: "2" },
      BACKEND_DIGEST,
      STOREFRONT_DIGEST,
      join(repository, "lousydeal/overlays/test"),
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/replacement was not exact/);
    expectUntouched(repository, before);
  });

  // `changed_count == 0` is the re-promotion path: the overlay already
  // records both digests, so the guard writes nothing and exits successfully.
  // It is the quietest branch in the script and the two refusals guarding it
  // were the only ones with no test. Neither can produce a bad write here --
  // the candidate is never moved into place on this path -- so what they
  // actually protect is the claim that a no-op run is a no-op, and that a
  // deploys checkout which moved under the guard is reported rather than
  // shrugged off.

  it("refuses an unchanged update that rewrote the kustomization anyway", () => {
    // A rewriter reporting no change must produce bytes identical to what is
    // already on disk. Different bytes and a count of zero is a contradiction:
    // one of the two is a lie, and the guard cannot tell which.
    const repository = fixture({
      testOverlayContent: kustomization(BACKEND_DIGEST, STOREFRONT_DIGEST),
    });
    const before = overlayFile(repository, "lousydeal/overlays/test");

    const result = runWithStubbedRewriter(
      {
        candidate: kustomization(BACKEND_DIGEST, STOREFRONT_DIGEST).replace(
          "namespace: lousydeal-test",
          "namespace: lousydeal-live",
        ),
        changedCount: "0",
      },
      BACKEND_DIGEST,
      STOREFRONT_DIGEST,
      join(repository, "lousydeal/overlays/test"),
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(
      /digest update rejected: unchanged update rewrote the kustomization/,
    );
    expectUntouched(repository, before);
  });

  it("refuses an unchanged update that modified a tracked file", () => {
    // The one check on this path that never looks at the candidate. The
    // checkout was clean when the guard inspected it, so a tracked file that
    // has moved by the time the rewriter returns moved during the rewrite --
    // and a no-op run that leaves the deploys checkout dirty would hand the
    // next step a change nobody asked for.
    const repository = fixture({
      testOverlayContent: kustomization(BACKEND_DIGEST, STOREFRONT_DIGEST),
    });
    const before = overlayFile(repository, "lousydeal/overlays/test");
    const live = join(repository, "lousydeal/overlays/live/kustomization.yaml");

    const result = runWithStubbedRewriter(
      {
        candidate: before,
        changedCount: "0",
        tamper: { file: live, content: "tampered\n" },
      },
      BACKEND_DIGEST,
      STOREFRONT_DIGEST,
      join(repository, "lousydeal/overlays/test"),
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(
      /digest update rejected: unchanged update modified a tracked file/,
    );
    expect(overlayFile(repository, "lousydeal/overlays/test")).toBe(before);
    expect(readFileSync(live, "utf8")).toBe("tampered\n");
  });

  it("still promotes normally when the rewriter writes what it should", () => {
    // The stub is only as convincing as its faithful case: with the bytes the
    // real rewriter would produce, the same path ends in a clean promotion.
    const repository = fixture();

    const result = runWithStubbedRewriter(
      { candidate: kustomization(BACKEND_DIGEST, STOREFRONT_DIGEST), changedCount: "2" },
      BACKEND_DIGEST,
      STOREFRONT_DIGEST,
      join(repository, "lousydeal/overlays/test"),
    );

    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(overlayFile(repository, "lousydeal/overlays/test")).toBe(
      kustomization(BACKEND_DIGEST, STOREFRONT_DIGEST),
    );
    expect(porcelain(repository)).toBe(" M lousydeal/overlays/test/kustomization.yaml\n");
  });

  it("the final re-read refuses a fourth key already on disk, when nothing needed to change", () => {
    // MAJOR 7 (review pass 2): the closing structural check has its own copy
    // of the rewriter's parse (see the header comment on the second `node -`
    // invocation, below) and it had never been driven independently -- every
    // fixture that reaches it with a malformed entry is refused by the
    // rewriter's identical check first, so a bug unique to this second copy
    // could ship undetected. Bypassing the rewriter with the stub (as every
    // test in this describe block does) and taking the `changed_count == 0`
    // path -- the digests already match what a defective overlay records, so
    // nothing is written and `$kustomization` is never touched -- reaches
    // this file's own final re-read with its argument unchanged from disk:
    // the one line of defense a rewriter bug, not merely a rewriter bypass,
    // could not already have caught.
    const testOverlayContent = [
      HEADER,
      `${imageBlock(BACKEND_IMAGE, SENTINEL)}\n\n    newTag: latest`,
      imageBlock(STOREFRONT_IMAGE, SENTINEL),
      TRAILER,
    ].join("\n");
    const repository = fixture({ testOverlayContent });
    const before = overlayFile(repository, "lousydeal/overlays/test");

    const result = runWithStubbedRewriter(
      { candidate: before, changedCount: "0" },
      SENTINEL,
      SENTINEL,
      join(repository, "lousydeal/overlays/test"),
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/replacement was not exact/);
    expect(overlayFile(repository, "lousydeal/overlays/test")).toBe(before);
  });
});

describe("concurrent mutation", () => {
  it("refuses when the kustomization is replaced between the snapshot and the mid-flight check", () => {
    // M8: `target_matches_original` (the mid-flight re-check between the
    // guard's own snapshot of `$kustomization` and its later verification of
    // it, before anything is written) had no test. The script writes only to
    // `$candidate` throughout that window and never re-reads
    // `$kustomization` itself until this check -- so a concurrent replacement
    // landing in that window is exactly the case this check exists to catch,
    // and nothing else in this file drives it. A `node` shim -- the same
    // technique the `git` shim below uses -- replaces the kustomization the
    // instant the guard's own heredoc script runs (`node -` is the shape only
    // the two heredoc invocations use; every `node -e` snapshot call passes
    // straight through unshimmed), landing the tamper deterministically
    // between the snapshot phase and the check, not by a timing guess.
    const repository = fixture();
    const overlay = join(repository, "lousydeal/overlays/test");
    const kustomizationPath = join(overlay, "kustomization.yaml");
    const before = overlayFile(repository, "lousydeal/overlays/test");

    const binary = join(makeRoot(), "bin");
    mkdirSync(binary, { recursive: true });
    const shim = join(binary, "node");
    const tamperedOnce = join(binary, "tampered-once");
    writeFileSync(
      shim,
      [
        "#!/bin/sh",
        // Single-shot: the guard's *second* heredoc invocation (the final
        // post-write replacement check, well after the mid-flight check this
        // test targets) also matches `node -`. Tampering there too would let
        // that later, unrelated check catch the replacement instead, and this
        // test would keep passing for the wrong reason even with the
        // mid-flight check deleted.
        'if [ "$1" = "-" ] && [ ! -e "$GITOPS_TEST_TAMPERED_ONCE" ]; then',
        '  : > "$GITOPS_TEST_TAMPERED_ONCE"',
        '  rm -f "$GITOPS_TEST_TARGET"',
        '  printf %s "$GITOPS_TEST_TAMPERED_CONTENT" > "$GITOPS_TEST_TARGET"',
        "fi",
        'exec "$GITOPS_REAL_NODE" "$@"',
        "",
      ].join("\n"),
    );
    chmodSync(shim, 0o755);
    const realNode = spawnSync("/bin/sh", ["-c", "command -v node"], {
      encoding: "utf8",
    }).stdout.trim();

    const result = spawnSync("sh", [guard, BACKEND_DIGEST, STOREFRONT_DIGEST, overlay], {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${binary}:${process.env["PATH"] ?? ""}`,
        GITOPS_REAL_NODE: realNode,
        GITOPS_TEST_TARGET: kustomizationPath,
        GITOPS_TEST_TAMPERED_CONTENT: "tampered-mid-flight\n",
        GITOPS_TEST_TAMPERED_ONCE: tamperedOnce,
      },
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/digest update rejected: kustomization changed during update/);
    // Untouched by the guard's own restore path: `restore_needed` is set only
    // after the write this check runs *before*, so the guard has nothing of
    // its own to roll back here -- it detected the tamper and stopped.
    expect(readFileSync(kustomizationPath, "utf8")).toBe("tampered-mid-flight\n");
    expect(before).toBe(kustomization());
  });

  it("refuses and restores when the kustomization changes under it", () => {
    const repository = fixture();
    const overlay = join(repository, "lousydeal/overlays/test");
    const before = overlayFile(repository, "lousydeal/overlays/test");

    // A `git` shim that mutates a second tracked file at the moment the guard
    // inspects its own diff, so the post-write verification must refuse and
    // roll the kustomization back without clobbering the concurrent change.
    const binary = join(makeRoot(), "bin");
    mkdirSync(binary, { recursive: true });
    const shim = join(binary, "git");
    writeFileSync(
      shim,
      [
        "#!/bin/sh",
        'if [ "${1:-}" = "-C" ] && [ "${3:-}" = "diff" ] && [ "${4:-}" = "--name-only" ]; then',
        '  printf "%s\\n" "concurrent mutation" > "$GITOPS_TEST_MUTATION_FILE"',
        "fi",
        'exec "$GITOPS_REAL_GIT" "$@"',
        "",
      ].join("\n"),
    );
    chmodSync(shim, 0o755);
    const realGit = spawnSync("/bin/sh", ["-c", "command -v git"], {
      encoding: "utf8",
    }).stdout.trim();

    const result = spawnSync("sh", [guard, BACKEND_DIGEST, STOREFRONT_DIGEST, overlay], {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${binary}:${process.env["PATH"] ?? ""}`,
        GITOPS_REAL_GIT: realGit,
        GITOPS_TEST_MUTATION_FILE: join(repository, "lousydeal/overlays/live/kustomization.yaml"),
      },
    });

    expect(result.status).not.toBe(0);
    expect(overlayFile(repository, "lousydeal/overlays/test")).toBe(before);
    expect(overlayFile(repository, "lousydeal/overlays/live")).toBe("concurrent mutation\n");
  });

  it("preserves a recovery snapshot when the target is replaced by a directory", () => {
    const repository = fixture();
    const overlay = join(repository, "lousydeal/overlays/test");

    const binary = join(makeRoot(), "bin");
    mkdirSync(binary, { recursive: true });
    const shim = join(binary, "git");
    writeFileSync(
      shim,
      [
        "#!/bin/sh",
        'if [ "${1:-}" = "-C" ] && [ "${3:-}" = "diff" ] && [ "${4:-}" = "--name-only" ]; then',
        '  rm -f "$GITOPS_TEST_TARGET"',
        '  mkdir "$GITOPS_TEST_TARGET"',
        "fi",
        'exec "$GITOPS_REAL_GIT" "$@"',
        "",
      ].join("\n"),
    );
    chmodSync(shim, 0o755);
    const realGit = spawnSync("/bin/sh", ["-c", "command -v git"], {
      encoding: "utf8",
    }).stdout.trim();

    const result = spawnSync("sh", [guard, BACKEND_DIGEST, STOREFRONT_DIGEST, overlay], {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${binary}:${process.env["PATH"] ?? ""}`,
        GITOPS_REAL_GIT: realGit,
        GITOPS_TEST_TARGET: join(overlay, "kustomization.yaml"),
      },
    });

    expect(result.status).not.toBe(0);
    expect(statSync(join(overlay, "kustomization.yaml")).isDirectory()).toBe(true);
    expect(`${result.stderr}`).toMatch(/recovery snapshot preserved:/);
    const snapshot = /recovery snapshot preserved: (\S+)/.exec(result.stderr)?.[1];
    expect(snapshot).toBeDefined();
    expect(readFileSync(snapshot as string, "utf8")).toBe(kustomization());
  });
});
