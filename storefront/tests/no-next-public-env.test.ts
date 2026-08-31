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
  // file it dropped instead of merely finding fewer than some floor.
  it("scans every file this guard exists to cover", () => {
    expect(relativePaths).toContain("src/config/env.ts");
    expect(relativePaths).toContain("src/config/runtime-config.ts");
    expect(relativePaths).toContain("src/app/layout.tsx");
    expect(relativePaths).toContain("next.config.ts");
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
