/**
 * The print files say what the operator settled, and nothing else.
 *
 * **Here rather than beside the renderer** because `design/` has no test
 * project of its own: `vitest.config.ts`'s `repo` project collects
 * `scripts/**` and this is the repository-level suite. The renderer is a
 * design tool nothing imports (its own header says so), so what is asserted is
 * its source — the copy is the operator's, and a design change that quietly
 * reinterprets it is the failure this guards.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * **Comments stripped, and a mutation is why.** The first version of this file
 * read the source whole, and `align-self:stretch` appears in the paragraph
 * explaining why that declaration matters as well as in the declaration — so
 * deleting the CSS left the assertion satisfied by the prose about it. Every
 * claim below is about what the renderer *does*, so the commentary is not part
 * of what it reads.
 */
const render = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../design/merch/render.mjs"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "");

/** The one sticker block, so a line from the cap cannot satisfy an assertion about the sticker. */
const sticker = render.slice(render.indexOf("const sticker = shell("), render.indexOf("const jobs = ["));

describe("the copy the operator settled", () => {
  it("says the sticker's line, in the words it was given in", () => {
    // 2026-09-09: "I make Lousy Deals". Set as two lines, which is
    // composition; the words and their case are not this file's to change.
    expect(sticker).toContain('<div class="d1">I make</div>');
    expect(sticker).toContain('<div class="d2">Lousy Deals</div>');
  });

  it("sets it as a sentence, not a label", () => {
    // `brand.md` licenses all-caps for labels, titles and buttons. The mug's
    // comment applies the same rule to merch in as many words, and the cap's
    // identical stem is already sentence case.
    expect(sticker).not.toContain("I MAKE LOUSY DEALS");
    expect(sticker).not.toMatch(/text-transform:\s*uppercase[^}]*}\s*$/);
  });

  it("carries no masthead, which would make it the cap in paper", () => {
    // The line is first person. A domain stacked over it turns the bearer's
    // voice into the shop's advertisement, and the cap already says
    // "I make my Lousy Deals at lousydeal.com" between rules.
    expect(sticker).not.toContain("LOUSYDEAL.COM");
  });

  it("carries no figure, because the tee owns the ledger", () => {
    // $0.00 beside a $6 object of real value is the wall P9 defended. On the
    // tee the figure is anchored by ITEM NOTHING / PRICE $5.00 and is plainly
    // about the certificate; free-floating on a sticker it is not.
    expect(sticker).not.toContain("$0.00");
    expect(sticker).not.toContain("VALUE");
  });

  it("keeps the stamp, whose words the product is named after", () => {
    // `catalogue.ts` titles this product "Certified Worthless" with the handle
    // `certified-worthless`, and P5 synced a Printful product under it.
    // Changing these two words is a rename wearing a design hat.
    expect(sticker).toContain('stampMark(["Certified", "worthless"])');
  });

  it("is square, which it was not before", () => {
    // The rule set only a width, so the height was whatever the content
    // stacked to: 3.60in x 3.35in on a 4in square die-cut, under a comment
    // claiming 1080px. The measure loop prints 3.60in x 3.60in now.
    expect(sticker).toMatch(/width:1080px;height:1080px/);
    // And the rule must stretch, or it collapses to nothing inside the
    // centred flex column and the stamp strikes empty paper.
    expect(sticker).toContain(".r{height:5px;background:${INK};align-self:stretch}");
  });

  it("reads the sticker alone and the stripping works, so nothing passes vacuously", () => {
    expect(sticker).toContain("const sticker = shell(");
    // The stripping itself, or a broken regex passes everything by emptying
    // the file -- and the comment that used to satisfy an assertion above is
    // proven gone.
    expect(render).not.toContain("a rule inside a centred flex column");
    expect(sticker).not.toContain("const cap = shell(");
    expect(sticker.length).toBeLessThan(render.length);
  });
});
