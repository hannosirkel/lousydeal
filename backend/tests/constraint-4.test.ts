/**
 * Gifting's constraint 4 is stated, whole, in `brand.md`.
 *
 * The constraint says the recipient's name and email are never public. It was
 * settled for gifting, and `brand.md` is its one home: it is the document a
 * copy change is written against. Two HTML comments delimit it there, so a
 * test can read it without parsing markdown.
 *
 * Until 2026-09-27 the constraint also lived in the gifting plan, and this
 * file checked that the two copies agreed. The plan is retired, so one copy
 * remains, and this file checks that it is found, that it is bounded, and
 * that it still says what the constraint has to say.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const OPEN = "<!-- constraint-4 -->";
const CLOSE = "<!-- /constraint-4 -->";

// `join(__dirname, …)` and not `import.meta.url`: this workspace's test
// tsconfig emits CommonJS, where `import.meta` is a compile error. The
// storefront suite is configured differently and uses the other form.
const BRAND = join(__dirname, "../../docs/current/brand.md");

/** The quotation between the markers, with markdown's `> ` prefixes removed. */
function constraintFromBrand(source: string): string {
  const start = source.indexOf(OPEN);
  const end = source.indexOf(CLOSE);
  if (start === -1 || end === -1 || end < start) return "";
  return source
    .slice(start + OPEN.length, end)
    .split("\n")
    .map((line) => line.replace(/^\s*>\s?/, "").trim())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

describe("constraint 4", () => {
  const constraint = constraintFromBrand(readFileSync(BRAND, "utf8"));

  it("is found in brand.md", () => {
    // An empty string satisfies every `not.toContain` below, so the one way
    // this file could go quietly useless is for the markers to stop matching.
    expect(constraint.length).toBeGreaterThan(400);
  });

  it("stops at the constraint, and does not swallow the exception after it", () => {
    // The deal #1 exception sits outside the markers on purpose: it is an
    // exception to the rule, not part of it.
    expect(constraint).not.toContain("Re-settled");
    expect(constraint).not.toContain("deal #1");
    expect(constraint.endsWith("this slice does not do it.")).toBe(true);
  });

  it("still says the recipient's name and email are never public", () => {
    expect(constraint).toContain("The recipient's name and email are never public.");
    expect(constraint).toContain("A gift adds no public field.");
  });
});
