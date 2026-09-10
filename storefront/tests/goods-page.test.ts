/**
 * The page every printed thing now has, and the photograph on it.
 *
 * **The operator reported all three defects this closes**: no images, no pages,
 * nothing to click. The comment in `cart/page.tsx` that declined to link — "a
 * printed thing has no page of its own, and a link to one that does not exist
 * is worse than plain text" — was true when written, and is why the guard
 * below asserts it is gone rather than merely that a link is present.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { MERCH_CATALOGUE_HANDLES } from "./fixtures/merch-handles";
import { goodsImagePath, goodsPath } from "../src/lib/merch-rows";

const here = dirname(fileURLToPath(import.meta.url));
const strip = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\/.*$/gm, "");

const page = strip(readFileSync(join(here, "../src/app/goods/[handle]/page.tsx"), "utf8"));
const cart = strip(readFileSync(join(here, "../src/app/cart/page.tsx"), "utf8"));

describe("where a printed thing lives", () => {
  it("is not under the certificate's namespace", () => {
    // `/deal/<handle>` is a *quotation* for a tier, Form LD-2. A mug is not a
    // quotation for nothing.
    expect(goodsPath("this-mug-cost-extra")).toBe("/goods/this-mug-cost-extra");
    expect(goodsPath("x")).not.toContain("/deal/");
  });

  it("refuses a handle the store does not sell", () => {
    // An empty specification is worse than a page saying there is nothing
    // here — the rule the tier page already states.
    expect(page).toContain("if (row === undefined) notFound();");
  });
});

describe("the photograph", () => {
  it("is served by this site, never hotlinked", () => {
    // `brand.md` §6's amendment: the site loads nothing from anybody else's
    // server, and Printful does not promise its URLs outlive the product.
    expect(goodsImagePath("this-mug-cost-extra")).toBe("/goods/this-mug-cost-extra.png");
    expect(page).not.toContain("printful.com");
    expect(page).not.toContain("https://");
  });

  it("exists for every product the catalogue sells", () => {
    // A page whose picture 404s is worse than the plain text it replaced.
    for (const handle of MERCH_CATALOGUE_HANDLES) {
      const file = join(here, "../public/goods", `${handle}.png`);
      expect(`${handle}: ${String(existsSync(file))}`).toBe(`${handle}: true`);
    }
  });

  it("has no photograph of anything that is not for sale", () => {
    // The amendment admits a photograph "of a good actually on sale" and of
    // nothing else, so the directory is asserted in both directions.
    const files = readdirSync(join(here, "../public/goods")).filter((name) => name.endsWith(".png"));
    expect(files.map((name) => name.replace(/\.png$/, "")).sort()).toEqual([...MERCH_CATALOGUE_HANDLES].sort());
  });

  it("is captioned and framed, which is the condition the amendment attached", () => {
    expect(page).toContain("goods-figure");
    // **Rendered, not merely imported.** The first version asserted the
    // constant appeared in the file, which an unused import satisfies -- so
    // deleting the `<figcaption>` passed.
    expect(page).toMatch(/<figcaption>\{GOODS_FIGURE_CAPTION\}<\/figcaption>/);
    // Reserved dimensions, or the page jumps when it loads.
    expect(page).toMatch(/width=\{800\} height=\{800\}/);
  });

  it("carries the item in its alt text, because the name alone is a joke", () => {
    expect(page).toMatch(/alt=\{`\$\{row\.title\}, \$\{row\.kind \?\? ""\}`\}/);
  });
});

describe("the cart's upsell, now that the page exists", () => {
  it("links each row to it", () => {
    expect(cart).toContain("href: goodsPath(row.handle)");
  });

  it("shows the photograph beside the row", () => {
    expect(cart).toContain("thumbnail: goodsImagePath(row.handle)");
  });

  it("no longer says the page does not exist", () => {
    // The comment retires with the thing it described. Left behind, it would
    // read as intent to the next person.
    const raw = readFileSync(join(here, "../src/app/cart/page.tsx"), "utf8");
    expect(raw).not.toContain("a printed thing has no page of its own");
  });
});

describe("what the specification states", () => {
  it("states no figure of its own", () => {
    // §11. The price is Medusa's and the value is composed by `merchValue`,
    // the same call the cart makes, so the gag cannot drift between them.
    expect(page).toContain("value={row.price}");
    expect(page).toContain("value={row.value}");
    expect(page).not.toMatch(/[$€£]\s?\d/);
  });

  it("promises no date and no stock, like every other surface", () => {
    /**
     * **Bans the promise, not the word** — the first version banned "in
     * stock" and "day" outright and failed on a notice that *denies* stock
     * and states the statutory 14-day clock. A regex spanning a denial is a
     * mistake this repository has made before and written down twice.
     */
    const content = readFileSync(join(here, "../src/content/merch.ts"), "utf8");
    const goods = content.slice(content.indexOf("GOODS_NOTICE"), content.indexOf(";", content.indexOf("GOODS_NOTICE")));
    expect(goods).not.toMatch(/\d+\s*(?:business |working )?(?:days?|weeks?)\b/i);
    expect(goods).not.toMatch(/\b(?:arrives?|delivery by|ships? in|expected? (?:on|by)|in stock now|only \d+ left)\b/i);
    // And it says both absences out loud, because silence reads as an
    // oversight where a buyer is looking for a date.
    expect(goods).toMatch(/nothing here is in stock/i);
    expect(goods).toMatch(/no arrival date is promised/i);
  });

  it("is a form and not a record, which is the opposite of a certificate", () => {
    // `brand.md`: a certificate carries a serial and no form number, because a
    // certificate is not a form. A printed good is the other way round —
    // nothing about one mug is unique.
    const content = readFileSync(join(here, "../src/content/merch.ts"), "utf8");
    expect(content).toContain('form: "Form LD-6"');
    expect(page).not.toContain("serial");
  });
});
