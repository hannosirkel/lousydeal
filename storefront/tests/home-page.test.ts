/**
 * Holds the home page to `docs/current/brand.md` §4.
 *
 * **The mapping under test is the page's own.** `src/lib/tier-rows.ts` holds
 * the functions `page.tsx` calls, so this file imports them rather than
 * re-implementing them: a test that rebuilds the mapping and then asserts a
 * renderer echoed it passes while the page swaps two columns.
 *
 * What cannot be reached from here is the page component itself, which awaits
 * `connection()` and `cookies()` and so needs a request. The form it builds is
 * a component (`OrderForm`) for that reason -- the field the server action
 * reads is assertable without one.
 *
 * `renderToStaticMarkup` rather than a DOM library: the storefront Vitest
 * project is `environment: node`.
 */

import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { OrderForm } from "../src/components/document/OrderForm";
import { TierTable, type TierRow } from "../src/components/document/TierTable";
import { NO_OFFER_NOTICE, TERMS_OF_OFFER, TIER_TABLE_HEADINGS } from "../src/content/home";
import type { Tier } from "../src/lib/medusa-client";
import { formatMoney } from "../src/lib/money";
import { cheapest, tierRowData } from "../src/lib/tier-rows";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

/** The three tiers exactly as `listTiers` returns them, units included. */
const TIERS: readonly Tier[] = [
  { id: "prod_2", handle: "lousy-deal-plus", title: "Lousy Deal Plus", variantId: "var_2", amount: 10, currencyCode: "usd" },
  { id: "prod_1", handle: "lousy-deal", title: "Lousy Deal", variantId: "var_1", amount: 5, currencyCode: "usd" },
  { id: "prod_3", handle: "lousy-deal-pro", title: "Lousy Deal Pro", variantId: "var_3", amount: 25, currencyCode: "usd" },
];

const rows: TierRow[] = TIERS.map((tier) => ({
  ...tierRowData(tier),
  action: createElement(OrderForm, {
    action: async () => undefined,
    variantId: tierRowData(tier).variantId,
    label: "Acquire",
    forTier: tier.title,
  }),
}));

const html = renderToStaticMarkup(createElement(TierTable, { rows }));

describe("the page's own mapping", () => {
  it("prices each tier from the API amount and values every one at nothing", () => {
    // The row's fields, from the function the page calls -- not rebuilt here.
    expect(tierRowData(TIERS[1] as Tier)).toMatchObject({
      title: "Lousy Deal",
      description: "Official numbered certificate of poor judgment.",
      price: formatMoney(5, "usd"),
      value: formatMoney(0, "usd"),
      variantId: "var_1",
    });
    for (const tier of TIERS) {
      expect(tierRowData(tier).value).toBe(formatMoney(0, tier.currencyCode));
    }
  });

  it("describes a tier it has no copy for with nothing, rather than failing", () => {
    const unknown: Tier = { ...(TIERS[0] as Tier), handle: "lousy-deal-enterprise" };
    expect(tierRowData(unknown).description).toBe("");
  });

  it("quotes the cheapest tier in the offer block, whatever order the API returns", () => {
    // The fixture is deliberately out of price order.
    expect(cheapest(TIERS)?.title).toBe("Lousy Deal");
    expect(cheapest([])).toBeUndefined();
  });
});

describe("the order form", () => {
  const form = renderToStaticMarkup(
    createElement(OrderForm, { action: async () => undefined, variantId: "var_1", label: "Acquire for $5.00" }),
  );

  it("posts the variant id the server action reads", () => {
    // `page.tsx`'s `addToCart` reads exactly this field and throws without it.
    expect(form).toContain('<input type="hidden" name="variantId" value="var_1"/>');
    expect(form).toMatch(/^<form/);
    expect(form).toContain('type="submit"');
  });

  it("keeps the space inside its label, so the name is not run together", () => {
    // React renders `{a} {b}` as separate text nodes and the accessible name
    // comes out as "ACQUIRE FOR$5.00". Measured. One string, one text node.
    expect(form).toContain("Acquire for $5.00");
    expect(form).not.toContain("Acquire for<!-- -->");
  });

  it("names the tier for a screen reader when the visible label cannot", () => {
    // Three table buttons reading only "ACQUIRE" are three identical entries
    // in a controls list for three different prices.
    const named = renderToStaticMarkup(
      createElement(OrderForm, { action: async () => undefined, variantId: "var_3", label: "Acquire", forTier: "Lousy Deal Pro" }),
    );
    expect(named).toContain('<span class="visually-hidden"> Lousy Deal Pro</span>');
    // And without putting a second copy of the price into the markup. (React
    // injects a form-replay script containing `$$reactFormReplay`, so the test
    // is for a currency figure, not for the character.)
    expect(named).not.toMatch(/[$€£]\d/);
  });
});

describe("the tier table", () => {
  it("is a table of rows, not a set of cards", () => {
    expect(html).toMatch(/^<table/);
    expect(html.match(/<tbody>[\s\S]*<\/tbody>/)?.[0].match(/<tr>/g)).toHaveLength(3);
  });

  it("names each tier as the row header the other cells describe", () => {
    for (const tier of TIERS) {
      expect(html).toContain(`<th scope="row" data-label="${TIER_TABLE_HEADINGS.item}"><span class="cell-value">${tier.title}</span></th>`);
    }
  });

  it("carries the deadpan descriptions the brand document approved", () => {
    expect(html).toContain("Official numbered certificate of poor judgment.");
    expect(html).toContain("Identical, but labelled Plus.");
    expect(html).toContain("Professional-grade poor judgment.");
  });

  it("puts each price in the markup once, so no figure can drift from itself", () => {
    for (const amount of [5, 10, 25]) {
      expect(html.split(formatMoney(amount, "usd"))).toHaveLength(2);
    }
    expect(html.split(formatMoney(0, "usd"))).toHaveLength(4);
  });

  it("aligns figures by an attribute rather than by the heading's wording", () => {
    // The headings are content, meant to be edited. A stylesheet reading them
    // un-aligns the column the day someone rewords one.
    expect(html.match(/data-align="figure"/g)).toHaveLength(8);
    expect(css).toMatch(/\.tier-table \[data-align="figure"\] \{[^}]*text-align: right/);
  });
});

describe("the table's second layout", () => {
  it("is one markup tree, so no price is in the DOM twice", () => {
    expect(html.split(formatMoney(5, "usd"))).toHaveLength(2);
  });

  it("carries the label for the collapsed view on the cell itself", () => {
    for (const label of Object.values(TIER_TABLE_HEADINGS).filter((l) => l !== TIER_TABLE_HEADINGS.action)) {
      expect(html).toContain(`data-label="${label}"`);
    }
  });

  // These read the stylesheet as text, which is the most this suite can do:
  // `environment: node` has no CSSOM and no layout. They pin the declarations
  // the collapsed layout depends on; whether it *renders* correctly was
  // measured under CDP and is Gate E's to re-check, not this file's claim.
  it("declares the rules the collapsed layout depends on", () => {
    const query = /@media \(width < 640px\) \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";
    expect(query).toContain("content: attr(data-label)");
    // Label, leader, value. Without the orders the cell reads label, value,
    // leader, because `::after` follows the text in document order.
    expect(query).toMatch(/\[data-label\]::before \{[^}]*order: -1/);
    expect(query).toMatch(/\[data-label\]::after \{[^}]*order: 0/);
    expect(query).toMatch(/\.cell-value \{[^}]*order: 1/);
  });

  it("draws the leader from the same declaration the ledger uses", () => {
    // Two copies of the signature motif drift. One selector list, one rule.
    expect(css).toMatch(/\.ledger-label::after,\n\.tier-table \[data-label\]::after \{/);
    expect(css).toMatch(/\.ledger-value,\n\.tier-table \.cell-value \{/);
  });

  it("hides the action column's heading from sight but not from the reader", () => {
    expect(html).toContain(`<span class="visually-hidden">${TIER_TABLE_HEADINGS.action}</span>`);
    const block = /\.visually-hidden \{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(block).not.toContain("display: none");
    expect(block).toContain("clip-path");
  });
});

describe("the terms of this offer", () => {
  it("says what is bought, when it arrives, what it costs, and what is consented to", () => {
    expect(TERMS_OF_OFFER).toHaveLength(4);
    expect(TERMS_OF_OFFER[0]).toContain("nothing else of value");
    expect(TERMS_OF_OFFER[1]).toContain("immediately");
    expect(TERMS_OF_OFFER[2]).toContain("price shown is the price charged");
  });

  it("does not claim the right of withdrawal is already gone", () => {
    // VOS s 53(4) p 7-1 removes it only once the trader has also given the
    // s 55(1)-(2) confirmation on a durable medium, which is LD-02's email.
    // The checkout collects consent; it does not by itself complete the
    // waiver, and this line must not say otherwise.
    const consent = TERMS_OF_OFFER[3] ?? "";
    expect(consent).toContain("asked to consent");
    expect(consent).toContain("not ticked for you");
    expect(consent).not.toMatch(/you (?:have )?waive[d]? /i);
    expect(consent).not.toMatch(/no right of withdrawal/i);
  });

  it("uses no exclamation mark, anywhere", () => {
    // brand.md section 2: none, in any surface, ever.
    for (const line of TERMS_OF_OFFER) expect(line).not.toContain("!");
  });
});

describe("when the store offers nothing", () => {
  it("has a notice to render instead of an empty invoice band", () => {
    // `listTiers` drops any tier the API prices with no `calculated_price`, so
    // zero tiers is reachable. A headed table with no rows above terms for a
    // product nobody can buy is a rendering artefact, not a document.
    expect(cheapest([])).toBeUndefined();
    expect(NO_OFFER_NOTICE).toContain("No items of record");
  });
});
