/**
 * Holds the home page to `docs/current/brand.md` §4, and holds the tier table
 * to being one markup tree with two layouts.
 *
 * `TierTable` is rendered directly rather than through `HomePage`: the page is
 * an async Server Component that calls `connection()` and `cookies()`, neither
 * of which exists outside a request. What the page adds on top of this
 * component -- which tiers, in what order, formatted how -- is asserted
 * through the same pure functions the page uses.
 */

import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TierTable, type TierRow } from "../src/components/document/TierTable";
import { TERMS_OF_OFFER, TIER_DESCRIPTIONS } from "../src/content/home";
import { formatMoney } from "../src/lib/money";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

/** The three tiers exactly as `listTiers` returns them, units included. */
const TIERS = [
  { id: "prod_1", handle: "lousy-deal", title: "Lousy Deal", variantId: "var_1", amount: 5, currencyCode: "usd" },
  { id: "prod_2", handle: "lousy-deal-plus", title: "Lousy Deal Plus", variantId: "var_2", amount: 10, currencyCode: "usd" },
  { id: "prod_3", handle: "lousy-deal-pro", title: "Lousy Deal Pro", variantId: "var_3", amount: 25, currencyCode: "usd" },
] as const;

const rows: TierRow[] = TIERS.map((tier) => ({
  id: tier.id,
  handle: tier.handle,
  title: tier.title,
  description: TIER_DESCRIPTIONS[tier.handle] ?? "",
  value: formatMoney(0, tier.currencyCode),
  price: formatMoney(tier.amount, tier.currencyCode),
  action: createElement("button", { type: "submit" }, "Acquire"),
}));

const html = renderToStaticMarkup(createElement(TierTable, { rows }));

describe("the tier table", () => {
  it("is a table of rows, not a set of cards", () => {
    expect(html).toMatch(/^<table/);
    expect(html.match(/<tbody>[\s\S]*<\/tbody>/)?.[0].match(/<tr>/g)).toHaveLength(3);
  });

  it("names each tier as the row header the other cells describe", () => {
    for (const tier of TIERS) {
      expect(html).toContain(`<th scope="row" data-label="Item"><span class="cell-value">${tier.title}</span></th>`);
    }
  });

  it("carries the deadpan descriptions the brand document approved", () => {
    expect(html).toContain("Official numbered certificate of poor judgment.");
    expect(html).toContain("Identical, but labelled Plus.");
    expect(html).toContain("Professional-grade poor judgment.");
  });

  it("prices every tier differently and values every tier at nothing", () => {
    expect(html).toContain(formatMoney(5, "usd"));
    expect(html).toContain(formatMoney(10, "usd"));
    expect(html).toContain(formatMoney(25, "usd"));
    // The joke is that this column is identical down the table, and it is
    // identical because it is true.
    const zero = formatMoney(0, "usd");
    expect(html.split(zero)).toHaveLength(4);
  });

  it("renders a tier it has no description for rather than failing the page", () => {
    const unknown: TierRow[] = [
      {
        id: "prod_4",
        handle: "lousy-deal-enterprise",
        title: "Lousy Deal Enterprise",
        // The lookup the page performs, for a handle the record does not hold.
        description: TIER_DESCRIPTIONS["lousy-deal-enterprise"] ?? "",
        value: formatMoney(0, "usd"),
        price: formatMoney(999, "usd"),
        action: createElement("button", { type: "submit" }, "Acquire"),
      },
    ];
    const markup = renderToStaticMarkup(createElement(TierTable, { rows: unknown }));
    expect(markup).toContain('data-label="Description"');
    expect(markup).not.toContain("undefined");
  });
});

describe("the table's second layout", () => {
  it("is one markup tree, so no price is in the DOM twice", () => {
    // A duplicated small-screen tree is the usual way this is built, and it
    // reads every figure to a screen reader twice.
    expect(html.split(formatMoney(5, "usd"))).toHaveLength(2);
  });

  it("carries the label for the collapsed view on the cell itself", () => {
    for (const label of ["Item", "Description", "Value", "Price"]) {
      expect(html).toContain(`data-label="${label}"`);
    }
  });

  it("stacks below the narrow measure and supplies the labels from CSS", () => {
    const query = /@media \(max-width: 640px\) \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";
    expect(query).toContain("content: attr(data-label)");
    expect(query).toContain("display: none");
    // Label, leader, value -- the ledger row's shape. Without the orders the
    // cell would read label, value, leader.
    expect(query).toMatch(/\[data-label\]::before \{[^}]*order: -1/);
    expect(query).toMatch(/\[data-label\]::after \{[^}]*order: 0/);
    expect(query).toMatch(/\.cell-value \{[^}]*order: 1/);
  });

  it("hides the action column's heading from sight but not from the reader", () => {
    expect(html).toContain('<span class="visually-hidden">Order</span>');
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
