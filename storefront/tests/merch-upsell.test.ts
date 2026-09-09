/**
 * The upsell: what it says, what it computes, and what it refuses to claim.
 *
 * The rows are a pure function, so they are driven directly. The control is
 * rendered, for the reason `checkout-consent.test.ts` gives at its own head —
 * a rule asserted only in a test is a rule the component can lose.
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MerchForm } from "../src/components/document/MerchForm";
import {
  MERCH_ADD_LABEL,
  MERCH_APOLOGY,
  MERCH_HEADING,
  MERCH_TABLE_HEADINGS,
  MERCH_VALUE_PREFIX,
} from "../src/content/merch";
import type { MerchItem } from "../src/lib/medusa-client";
import { merchRowData, merchValue } from "../src/lib/merch-rows";

const MUG: MerchItem = {
  id: "prod_mug",
  handle: "this-mug-cost-extra",
  title: "This Mug Cost Extra",
  // **Major units.** `money.ts` records the research: Medusa is seeded with
  // `amountMinor / 100`, so a $15 mug is stored and returned as `15`.
  variants: [{ variantId: "var_mug", size: "11 oz", amount: 15, currencyCode: "usd" }],
};

const TEE: MerchItem = {
  id: "prod_tee",
  handle: "original-purchase-receipt",
  title: "Original Purchase Receipt",
  variants: ["S", "M", "L"].map((size, index) => ({
    variantId: `var_tee_${String(index)}`,
    size,
    amount: 32,
    currencyCode: "usd",
  })),
};

describe("the value column", () => {
  it("says NOT, and the figure the tier table already prints", () => {
    // **The one hard problem on this page.** Printing zero against a Gildan
    // shirt breaks the wall `brand.md` calls load-bearing; omitting the column
    // spends the running gag where an upsell needs it; inventing a figure is
    // the fabrication §11 forbids. `NOT` is literally true of all four items
    // and makes no claim anybody could be asked to defend.
    expect(merchValue("usd")).toBe(`${MERCH_VALUE_PREFIX} $0.00`);
  });

  it("follows the region's currency rather than hard-coding one", () => {
    // Composed through `formatMoney`, which is also what keeps the literal out
    // of `storefront/src` and past the hand-typed-price scan.
    expect(merchValue("eur")).toContain(MERCH_VALUE_PREFIX);
    expect(merchValue("eur")).not.toContain("$");
  });

  it("is the same value on every row, because it is a statement not a figure", () => {
    const rows = merchRowData([MUG, TEE]);
    expect(new Set(rows.map((row) => row.value)).size).toBe(1);
  });
});

describe("the rows", () => {
  it("carries every size, which is the one thing a printed item has that a tier does not", () => {
    expect(merchRowData([TEE])[0]?.sizes).toBe("S, M, L");
    expect(merchRowData([MUG])[0]?.sizes).toBe("11 oz");
  });

  it("shows one price per item, because the catalogue prices per item", () => {
    expect(merchRowData([TEE])[0]?.price).toBe("$32.00");
  });

  it("drops an item whose variants disagree about the price", () => {
    // Showing the lowest would understate what a buyer is charged, which §23
    // is about; the highest would overstate it. Dropping the row loses an
    // upsell and misleads nobody.
    const mixed: MerchItem = {
      ...TEE,
      variants: [
        { variantId: "a", size: "S", amount: 32, currencyCode: "usd" },
        { variantId: "b", size: "M", amount: 39, currencyCode: "usd" },
      ],
    };
    expect(merchRowData([mixed])).toEqual([]);
  });

  it("drops an item with no variants at all", () => {
    expect(merchRowData([{ ...MUG, variants: [] }])).toEqual([]);
  });

  it("keeps the variants, so the control can offer them", () => {
    expect(merchRowData([TEE])[0]?.variants.map((variant) => variant.size)).toEqual(["S", "M", "L"]);
  });
});

describe("what the upsell must not say", () => {
  const everything = [MERCH_HEADING, MERCH_APOLOGY, MERCH_ADD_LABEL, ...Object.values(MERCH_TABLE_HEADINGS)].join(" ");

  it("promises no delivery date, because nobody knows one", () => {
    // Constraint 7. Printful's own estimate is not repeated either: P13 has
    // not seen a real one, and omitted is the honest default until it has.
    expect(everything).not.toMatch(/\b(?:days?|weeks?|delivery by|arrives|dispatch(?:ed)? within|ships? in)\b/i);
  });

  it("promises no stock, because Printful prints on demand and this site cannot know", () => {
    expect(everything).not.toMatch(/\b(?:in stock|stock|available now|only \d+|remaining|left)\b/i);
  });

  it("names no amount of its own", () => {
    expect(everything).not.toMatch(/[$€£]\s?\d/);
  });

  it("carries no exclamation mark, like every other surface", () => {
    expect(everything).not.toContain("!");
  });

  it("apologises for the value rather than boasting about it", () => {
    // The line §7 asked for, and the joke's own resolution: the merch is the
    // only thing here worth anything, which is a lousy deal for the shop.
    expect(MERCH_APOLOGY).toMatch(/worth something/i);
    expect(MERCH_APOLOGY).toMatch(/apologise for the inconsistency/i);
  });

  it("asks the question §7 asked, in the second person and once", () => {
    expect(MERCH_HEADING).toBe("Would you like to make your deal worse?");
  });
});

describe("the control", () => {
  const render = (variants: readonly { variantId: string; size: string }[]) =>
    renderToStaticMarkup(
      createElement(MerchForm, { action: (async () => undefined) as never, title: "A Thing", variants }),
    );

  it("offers a size where there is a choice", () => {
    const html = render(merchRowData([TEE])[0]?.variants ?? []);
    expect(html).toContain("<select");
    for (const size of ["S", "M", "L"]) expect(html).toContain(`>${size}</option>`);
  });

  it("offers no select where there is one size, because it would do nothing", () => {
    // `brand.md`: a control that does nothing is a lie in a control.
    const html = render(merchRowData([MUG])[0]?.variants ?? []);
    expect(html).not.toContain("<select");
    expect(html).toContain('value="var_mug"');
  });

  it("posts the variant under the name the action reads, either way", () => {
    for (const variants of [merchRowData([TEE])[0]?.variants ?? [], merchRowData([MUG])[0]?.variants ?? []]) {
      expect(render(variants)).toContain('name="variantId"');
    }
  });

  it("names the item in the accessible name of both controls", () => {
    // Four rows of ADD are four identical entries in a controls list, and four
    // selects called Size are four more.
    const html = render(merchRowData([TEE])[0]?.variants ?? []);
    expect(html.match(/A Thing/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("sends no quantity, because nothing here offers one", () => {
    // A quantity the browser can send is a quantity a visitor can change.
    expect(render(merchRowData([TEE])[0]?.variants ?? [])).not.toContain('name="quantity"');
  });
});
