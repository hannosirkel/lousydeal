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
 * **It compares the wording, not the bytes, and the reason is markdown.** In
 * LD-03 the constraint is item 4 of the numbered constraints list, so it
 * carries a `4.` marker and a three-space continuation indent. In `brand.md`
 * it is a quotation, so every line carries `> `. Neither prefix is the
 * constraint, and neither file can drop its own without rendering wrongly —
 * an earlier draft of this row put the same list item in both and produced a
 * stray one-item list in `brand.md`'s prose, two markdownlint failures, and an
 * HTML comment rendered as visible text inside LD-03's item 3.
 *
 * Everything else — every word, every backtick, every em dash — has to match
 * exactly. The normalisation is the smallest one that lets both files render
 * correctly, which is now checked: `scripts/validate` runs markdownlint over
 * both.
 *
 * **The two sides are found differently, and deliberately.** `brand.md`'s copy
 * is delimited by HTML comments, which a quotation can carry without
 * disturbing anything. LD-03's cannot — a comment placed in that list breaks
 * it — so its constraint is located the way the list itself defines it: the
 * item that begins `4.`, up to the next numbered item.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const OPEN = "<!-- constraint-4 -->";
const CLOSE = "<!-- /constraint-4 -->";

// `join(__dirname, …)` and not `import.meta.url`: this workspace's test
// tsconfig emits CommonJS, where `import.meta` is a compile error. The
// storefront suite is configured differently and uses the other form.
const PLAN = join(__dirname, "../../docs/working/ld-03-gifting.md");
const BRAND = join(__dirname, "../../docs/current/brand.md");

/** One block of prose, with markdown's quoting, numbering and indentation removed. */
function normalise(block: string): string {
  return block
    .split("\n")
    .map((line) => line.replace(/^\s*>\s?/, "").trim())
    .join(" ")
    .replace(/^\d+\.\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * LD-03's constraint 4: the first paragraph of item 4.
 *
 * Bounded by the blank line rather than by the next numbered item, because
 * item 4 also carries the deal #1 exception as a second paragraph — and that
 * is an exception to the constraint, not part of it. `brand.md` keeps the same
 * split, with the exception outside the markers.
 */
function constraintFromPlan(source: string): string {
  const lines = source.split("\n");
  const start = lines.findIndex((line) => /^4\.\s+\*\*The recipient's name/.test(line));
  if (start === -1) return "";
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.trim() === "");
  return normalise([lines[start], ...(end === -1 ? rest : rest.slice(0, end))].join("\n"));
}

/** `brand.md`'s quotation: the text between the markers. */
function constraintFromBrand(source: string): string {
  const start = source.indexOf(OPEN);
  const end = source.indexOf(CLOSE);
  if (start === -1 || end === -1 || end < start) return "";
  return normalise(source.slice(start + OPEN.length, end));
}

describe("constraint 4", () => {
  it("is found in both documents", () => {
    // Two empty strings compare equal, so the one way this file could go
    // quietly useless is for either side to stop being located at all.
    expect(constraintFromPlan(readFileSync(PLAN, "utf8")).length).toBeGreaterThan(400);
    expect(constraintFromBrand(readFileSync(BRAND, "utf8")).length).toBeGreaterThan(400);
  });

  it("reads the same in both documents", () => {
    expect(constraintFromBrand(readFileSync(BRAND, "utf8"))).toBe(
      constraintFromPlan(readFileSync(PLAN, "utf8")),
    );
  });

  it("stops at the constraint, and does not swallow what follows it", () => {
    // LD-03's side is bounded by the next numbered item and `brand.md`'s by a
    // marker. Either boundary failing would pull the deal #1 exception in —
    // which sits outside the constraint on purpose, because it is an exception
    // to the rule and not part of it.
    for (const text of [
      constraintFromPlan(readFileSync(PLAN, "utf8")),
      constraintFromBrand(readFileSync(BRAND, "utf8")),
    ]) {
      expect(text).not.toContain("Re-settled");
      expect(text).not.toContain("deal #1");
      expect(text.endsWith("this slice does not do it.")).toBe(true);
    }
  });

  it("still says the recipient's name and email are never public", () => {
    // The agreement above is satisfied by two identical *wrong* blocks. This
    // is the half that says what the constraint has to be.
    const plan = constraintFromPlan(readFileSync(PLAN, "utf8"));
    expect(plan).toContain("The recipient's name and email are never public.");
    expect(plan).toContain("A gift adds no public field.");
  });
});
