/**
 * The catalogue table, and the guard the plan says is the one that matters.
 *
 * **The margin is asserted arithmetically rather than by eye**, because this
 * table has been wrong twice and both times by eye. The first version derived
 * cost + 25% and printed the result as a shelf price, which silently spends
 * the VAT out of the margin — decision `007` makes every price on this site
 * tax-inclusive. The second corrected that at the Estonian rate and missed
 * that decision `013` sends cross-border sales through OSS at the buyer's
 * rate, between 17% and 27%.
 *
 * So the assertion is: at the **worst** rate this shop can meet, every variant
 * clears the operator's floor. A cost that moves and a price that does not is
 * a slow loss nobody notices.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  MARGIN_FLOOR,
  MERCH_CATALOGUE,
  UNMEASURED_WHOLESALE_VAT_RATE,
  WORST_VAT_RATE,
  margin,
  merchVariants,
  netRevenue,
  printfulLineFor,
} from "../src/modules/printful/catalogue";

const percent = (fraction: number): string => `${(fraction * 100).toFixed(1)}%`;

describe("the margin, which is the guard this row exists for", () => {
  it("clears the operator's floor on every variant at the worst VAT rate", () => {
    for (const { product, variant } of merchVariants()) {
      const realised = margin(product.retailPrice, variant.fulfilmentCost, WORST_VAT_RATE);
      expect(`${variant.sku}: ${realised >= MARGIN_FLOOR ? "clears" : `only ${percent(realised)}`}`).toBe(
        `${variant.sku}: clears`,
      );
    }
  });

  it("computes revenue by dividing, not by subtracting", () => {
    // The arithmetic error that cost the first version of this table its
    // margins. A $32 price at 27% is $25.20 of revenue, not $23.36.
    expect(netRevenue(3200, 0.27)).toBeCloseTo(2519.69, 1);
    expect(netRevenue(3200, 0.27)).not.toBeCloseTo(3200 * (1 - 0.27), 2);
  });

  it("prices against the highest rate in the union, not a convenient one", () => {
    // **Found by mutation.** Every price assertion above is relative to
    // `WORST_VAT_RATE`, so lowering that constant makes them all pass while
    // making the guard mean less — the exact failure this table has already
    // had twice, arriving through a third door.
    //
    // Pinned to a fact rather than a preference: Hungary's standard rate is
    // 27%, the highest in the union, and decision `013` sells to every member
    // state through OSS at the buyer's rate. A shop that stopped selling to
    // Hungary could lower this; nothing else could.
    expect(WORST_VAT_RATE).toBeGreaterThanOrEqual(0.27);
    expect(WORST_VAT_RATE).toBeLessThan(0.5);
  });

  it("is tightest on the largest shirt, which is what sets the price", () => {
    // Stated so the number is not mistaken for a comfortable one. One price
    // across all sizes is the operator's decision, on the ground that no
    // customer is charged more for being larger; the cost of that decision is
    // that the most expensive size sets the price for everybody.
    const variants = merchVariants().filter(({ product }) => product.key === "tee");
    const tightest = variants.reduce((worst, current) =>
      current.variant.fulfilmentCost > worst.variant.fulfilmentCost ? current : worst,
    );
    expect(tightest.variant.size).toBe("3XL");
    expect(margin(3200, tightest.variant.fulfilmentCost, WORST_VAT_RATE)).toBeGreaterThan(MARGIN_FLOOR);
    // And the size below it is comfortable, so the spread is visible.
    expect(margin(3200, 1558, WORST_VAT_RATE)).toBeGreaterThan(0.6);
  });

  it("still clears the floor at the Estonian rate, which is the common case", () => {
    for (const { product, variant } of merchVariants()) {
      expect(`${variant.sku}: ${String(margin(product.retailPrice, variant.fulfilmentCost, 0.24) >= MARGIN_FLOOR)}`).toBe(
        `${variant.sku}: true`,
      );
    }
  });
});

describe("what Printful's own VAT would do, which is not yet measured", () => {
  /**
   * **This reports rather than asserts, and the distinction is the point.**
   * Decision `013` records that Printful charges VAT on the wholesale leg for
   * orders it fulfils in Latvia, Spain, the UK and Northern Ireland, that none
   * of it is recoverable on the Estonian return, and that it is therefore cost
   * of goods — to be measured from a real invoice before this table is
   * trusted a third time.
   *
   * No invoice exists yet. Asserting against a guessed rate would be worse
   * than not asserting: it would look like the exposure had been handled.
   */
  it("would put most of the catalogue under the floor, and says so", () => {
    const under: string[] = [];
    for (const { product, variant } of merchVariants()) {
      const wholesale = variant.fulfilmentCost * (1 + UNMEASURED_WHOLESALE_VAT_RATE);
      if (margin(product.retailPrice, wholesale, WORST_VAT_RATE) < MARGIN_FLOOR) under.push(variant.sku);
    }
    // Not an assertion about the world — an assertion that the arithmetic
    // still says what decision 013 says it says. If a future price change
    // makes this list empty, the exposure is gone and this test should be
    // deleted rather than quietly kept passing.
    expect(under.length).toBeGreaterThan(0);
    expect(under).toContain("LD-CAP-OS");
    expect(under).toContain("LD-MUG-11");
  });

  it("names the rate as a placeholder rather than a measurement", () => {
    // A guard on the comment, in effect: if somebody raises this to a measured
    // figure they must also change the constant's name, and every reader who
    // sees `UNMEASURED_` knows what they are looking at.
    expect(UNMEASURED_WHOLESALE_VAT_RATE).toBeGreaterThan(0);
    expect(UNMEASURED_WHOLESALE_VAT_RATE).toBeLessThan(1);
  });
});

describe("the table itself", () => {
  it("has the four products the contract names, as amended", () => {
    expect(MERCH_CATALOGUE.map((product) => product.key)).toEqual(["tee", "mug", "cap", "sticker"]);
  });

  it("gives every variant a distinct SKU and a distinct Printful variant", () => {
    const skus = merchVariants().map(({ variant }) => variant.sku);
    const ids = merchVariants().map(({ variant }) => variant.printfulVariantId);
    expect(skus).toEqual([...new Set(skus)]);
    expect(ids).toEqual([...new Set(ids)]);
  });

  it("gives every product a distinct handle, because Medusa keys on it", () => {
    const handles = MERCH_CATALOGUE.map((product) => product.handle);
    expect(handles).toEqual([...new Set(handles)]);
    for (const handle of handles) expect(handle).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  it("points every product at a print file that exists on disk", () => {
    // The artwork is committed because Printful fetches design files by URL
    // and there is no route that hands it bytes. A table naming a file nobody
    // shipped would fail at P5, against the live API, for a reason nothing
    // here explained.
    // `__dirname`, not `import.meta.url`: `tsconfig.test.json` builds this
    // suite as CommonJS, where the meta-property is a compile error. The three
    // other backend tests that read a file off disk do the same.
    for (const product of MERCH_CATALOGUE) {
      const path = join(__dirname, "..", "..", "design", "merch", "print-files", product.printFile.file);
      expect(`${product.key}: ${String(existsSync(path))}`).toBe(`${product.key}: true`);
    }
  });

  it("records a print file at the size Printful asked for", () => {
    // Measured from `/mockup-generator/printfiles/{id}` on 2026-09-08, and
    // confirmed by Printful storing each file at exactly these dimensions when
    // the four products were created.
    const expected: Record<string, readonly [number, number, number]> = {
      tee: [1800, 2400, 150],
      mug: [2700, 1050, 300],
      cap: [1890, 765, 300],
      sticker: [1200, 1200, 300],
    };
    for (const product of MERCH_CATALOGUE) {
      const { width, height, dpi } = product.printFile;
      expect(`${product.key}: ${String(width)}x${String(height)}@${String(dpi)}`).toBe(
        `${product.key}: ${expected[product.key]!.join("x").replace(/x(\d+)$/, "@$1")}`,
      );
    }
  });

  it("prices every product in whole dollars, because the shelf is not a spreadsheet", () => {
    for (const product of MERCH_CATALOGUE) {
      expect(`${product.key}: ${String(product.retailPrice % 100)}`).toBe(`${product.key}: 0`);
    }
  });
});

describe("looking a variant up, which is the only way a call site may", () => {
  it("returns the Printful line for a SKU it knows", () => {
    expect(printfulLineFor("LD-CAP-OS")).toEqual({
      catalogVariantId: 4811,
      technique: "dtfilm",
      placement: "front_dtf_hat",
      printFile: { file: "cap-front.png", width: 1890, height: 765, dpi: 300 },
    });
  });

  it("returns null for a SKU it does not, rather than a half-filled line", () => {
    expect(printfulLineFor("LD-NOPE")).toBeNull();
  });

  it("resolves every SKU in the table", () => {
    for (const { variant } of merchVariants()) {
      expect(`${variant.sku}: ${String(printfulLineFor(variant.sku) !== null)}`).toBe(`${variant.sku}: true`);
    }
  });
});
