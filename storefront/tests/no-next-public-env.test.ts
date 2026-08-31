/**
 * The static guard behind Global Constraint 2
 * (`docs/working/ld-01-foundation.md:22-25`) and decision 002's first
 * condition (`docs/decisions/002-rebuild-live-from-merged-main.md:32-35`):
 * "no environment-specific value is ever baked into an image".
 *
 * Next.js replaces a **direct** `process.env.NEXT_PUBLIC_*` reference with a
 * literal at build time; the same page adds that "dynamic property lookups on
 * process.env will not be inlined"
 * (`next`, `docs/01-app/02-guides/environment-variables.mdx`). So scanning for
 * the prefix is deliberately broader than what Next actually inlines: it also
 * trips on reads Next would leave alone. That is the safe direction, and it is
 * what Global Constraint 2 asks for — the constraint forbids the prefix, not
 * only the subset of it that gets baked in.
 *
 * This is a scan of the storefront's own source, not an analysis of whether a
 * value differs between environments, and not a claim that the built artifact
 * is inspected. There is no dynamic counterpart in this repository: running a
 * build inside the unit gate is outside this row.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

const storefrontDir = join(__dirname, "..");
const srcDir = join(storefrontDir, "src");

function listSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSourceFiles(path));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(path);
    }
  }
  return files;
}

/**
 * Strips block comments, and line comments **only where `//` opens the line**,
 * so prose about `NEXT_PUBLIC_` does not trip the scan below.
 *
 * Stripping every `//` to end of line — what the reference implementation does
 * (`plepic/storefront/tests/no-next-public-env.test.ts`) — is blinding, not
 * merely imprecise: the `//` inside a URL literal eats the rest of its own
 * line, so `const u = "https://x" + process.env.NEXT_PUBLIC_LEAK;` passes.
 * Measured against that exact line before this rule replaced it.
 *
 * A trailing `// … NEXT_PUBLIC_ …` after code therefore still trips the scan.
 * That is the stricter direction and the intended one: prose about the prefix
 * belongs in a block comment or on its own line.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
}

describe("no NEXT_PUBLIC_ anywhere in the storefront's own source", () => {
  const files = [...listSourceFiles(srcDir), join(storefrontDir, "next.config.ts")];
  const relativePaths = files.map((file) => relative(storefrontDir, file).split(sep).join("/"));

  // Named by path rather than counted, so a walker that stops recursing, or
  // an extension filter that stops matching .tsx, goes red on the specific
  // file it dropped instead of merely finding fewer than some floor. T9 adds
  // four files in two directories this list never had (src/app/cart/,
  // src/lib/); named directly here rather than left for the derived check
  // below, so today's four are covered by this commit and not only once a
  // later `git add` makes them visible to that check.
  it("scans every file this guard exists to cover", () => {
    expect(relativePaths).toContain("src/config/env.ts");
    expect(relativePaths).toContain("src/config/runtime-config.ts");
    expect(relativePaths).toContain("src/app/layout.tsx");
    expect(relativePaths).toContain("next.config.ts");
    expect(relativePaths).toContain("src/app/page.tsx");
    expect(relativePaths).toContain("src/app/cart/page.tsx");
    expect(relativePaths).toContain("src/lib/medusa-client.ts");
    expect(relativePaths).toContain("src/lib/store-cart.ts");
  });

  /**
   * The check above is a fixed list, and T8b recorded exactly the failure
   * mode that produces: a row adds files, the list is not extended, and the
   * test's own name -- "scans every file this guard exists to cover" --
   * becomes false while the test keeps passing on the four names it already
   * had. This derives the expected set instead, from `git ls-files`, so a
   * later row's new file is covered without anyone remembering to add a
   * ninth `toContain` line above.
   *
   * Subset, not equality: `git ls-files` only sees what has been `git add`ed,
   * and a file created earlier in this same change (before it is staged)
   * exists on disk -- so `relativePaths`, a live filesystem walk, legitimately
   * contains files `git ls-files` does not yet know about. Equality would go
   * red on exactly that ordinary mid-change state. Subset in this direction
   * still catches the failure this guards against: a walker that stops
   * recursing, or narrows its extension filter, drops a file `git` already
   * tracks, and that file then fails to appear in `relativePaths`.
   */
  // Computed once, above both tests below, rather than re-declared in each:
  // two independent copies of this `git ls-files` call and filter can drift
  // out of step with each other and with the live predicate they claim to
  // exercise, which is exactly the failure class this file exists to catch
  // in the walker itself.
  const repoRoot = join(storefrontDir, "..");
  const trackedUnderStorefront = execFileSync("git", ["ls-files", "storefront"], { cwd: repoRoot, encoding: "utf8" })
    .split("\n")
    .filter((path) => path.length > 0)
    .map((path) => path.replace(/^storefront\//, ""));
  const trackedGuardFiles = trackedUnderStorefront.filter(
    (path) => (path.startsWith("src/") && /\.(ts|tsx)$/.test(path)) || path === "next.config.ts",
  );

  it("covers every git-tracked source file, so a walker regression is caught even before this list above is updated", () => {
    for (const path of trackedGuardFiles) {
      expect(relativePaths).toContain(path);
    }
  });

  // Proves the subset check above actually discriminates, without needing a
  // real walker regression to demonstrate it: a `relativePaths` that is
  // missing one git-tracked file is a `relativePaths` the check above would
  // reject, on the same predicate it uses live.
  it("would reject a walker that dropped one of those git-tracked files", () => {
    const missingOne = relativePaths.filter((path) => path !== "src/config/env.ts");

    expect(trackedGuardFiles.every((path) => missingOne.includes(path))).toBe(false);
  });

  // The scan is only as good as what survives stripping, and the reference's
  // strip-every-`//` rule hides a read that shares a line with a URL. Both
  // directions are asserted here because a stripper that removed nothing
  // would also pass the first of them.
  it("keeps a read that shares its line with a URL, and still drops prose", () => {
    expect(stripComments('const u = "https://x" + process.env.NEXT_PUBLIC_LEAK;')).toMatch(
      /NEXT_PUBLIC_/,
    );
    expect(stripComments("  // a comment mentioning NEXT_PUBLIC_FOO")).not.toMatch(/NEXT_PUBLIC_/);
    expect(stripComments("/** a doc block mentioning NEXT_PUBLIC_FOO */")).not.toMatch(
      /NEXT_PUBLIC_/,
    );
  });

  for (const file of files) {
    const relativePath = relative(storefrontDir, file).split(sep).join("/");
    it(`${relativePath} does not mention NEXT_PUBLIC_ outside a comment`, () => {
      const code = stripComments(readFileSync(file, "utf8"));
      expect(code).not.toMatch(/NEXT_PUBLIC_/);
    });
  }
});
