/**
 * LD-03's constraint 4 says the same thing in both documents that carry it.
 *
 * **LD-11 F6.** The constraint lives in `ld-03-gifting.md`, which is the plan
 * that settled it, and in `brand.md`, which is the document a copy change is
 * written against. Two copies of a rule is how a rule quietly becomes two
 * rules; LD-02's constraint 9 is in this repository because three documents
 * once said gifting did not exist.
 *
 * Nothing else here parses markdown, and this is the cheapest thing that stops
 * the drift: an HTML comment either side of the block in each file, and a
 * comparison of what is between them.
 *
 * **It compares the wording, not the bytes.** The row asked for byte-identical
 * and the two files cannot be: in LD-03 the block is item 4 of a numbered list
 * and carries its `4. ` marker and a three-space continuation indent; in
 * `brand.md` it is quoted under a paragraph. The numbering and the indentation
 * are markdown, not the constraint. Everything else — every word, every
 * backtick, every em dash — has to match exactly, and the normalisation below
 * is deliberately the smallest one that lets both render correctly.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const OPEN = "<!-- constraint-4 -->";
const CLOSE = "<!-- /constraint-4 -->";

// `join(__dirname, …)` and not `import.meta.url`: this workspace's test
// tsconfig emits CommonJS, where `import.meta` is a compile error. The
// storefront suite is configured differently and uses the other form.
const documents = {
  "ld-03-gifting.md": join(__dirname, "../../docs/working/ld-03-gifting.md"),
  "brand.md": join(__dirname, "../../docs/current/brand.md"),
} as const;

/** The text between the markers, with markdown's list numbering and indentation removed. */
function constraintFrom(source: string): string {
  const start = source.indexOf(OPEN);
  const end = source.indexOf(CLOSE);
  if (start === -1 || end === -1 || end < start) return "";
  return source
    .slice(start + OPEN.length, end)
    .replace(/^\s*\d+\.\s+/, "")
    .split("\n")
    .map((line) => line.trim())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

describe("constraint 4", () => {
  it("is marked in both documents", () => {
    // If a marker is lost the comparison below would pass on two empty
    // strings, which is the one way this file could go quietly useless.
    for (const [name, url] of Object.entries(documents)) {
      const source = readFileSync(url, "utf8");
      expect(source, `${name} is missing ${OPEN}`).toContain(OPEN);
      expect(source, `${name} is missing ${CLOSE}`).toContain(CLOSE);
      expect(constraintFrom(source).length, `${name}'s block is empty`).toBeGreaterThan(200);
    }
  });

  it("reads the same in both documents", () => {
    const [plan, brand] = Object.values(documents).map((url) =>
      constraintFrom(readFileSync(url, "utf8")),
    );
    expect(brand).toBe(plan);
  });

  it("still says the recipient's name and email are never public", () => {
    // The agreement above is satisfied by two identical *wrong* blocks. This
    // is the half that says what the constraint has to be.
    const plan = constraintFrom(readFileSync(documents["ld-03-gifting.md"], "utf8"));
    expect(plan).toContain("The recipient's name and email are never public.");
    expect(plan).toContain("A gift adds no public field.");
  });
});
