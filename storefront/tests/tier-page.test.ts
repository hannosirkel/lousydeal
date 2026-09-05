/**
 * Holds the tier page's selection logic to `docs/current/brand.md` §4.
 *
 * The page component itself awaits `connection()` and `cookies()` and cannot
 * be rendered outside a request, so what it decides — which tier a handle
 * names, which tiers are upgrades, in what order — lives in
 * `src/lib/tier-rows.ts` and is called here rather than re-implemented.
 */

import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import NotFound from "../src/app/not-found";
import { Quotation } from "../src/components/document/Quotation";
import { NO_UPGRADES_LINE, UPGRADES_LINE, UPGRADES_TITLE, WITHDRAWAL_NOTICE } from "../src/content/deal";
import type { Tier } from "../src/lib/medusa-client";
import { formatMoney } from "../src/lib/money";
import { NO_VALUE, requireTier, tierByHandle, tierPath, upgrades } from "../src/lib/tier-rows";

/** Deliberately out of price order, as the Store API is under no obligation. */
const TIERS: readonly Tier[] = [
  { id: "prod_3", handle: "lousy-deal-pro", title: "Lousy Deal Pro", variantId: "var_3", amount: 25, currencyCode: "usd" },
  { id: "prod_1", handle: "lousy-deal", title: "Lousy Deal", variantId: "var_1", amount: 5, currencyCode: "usd" },
  { id: "prod_2", handle: "lousy-deal-plus", title: "Lousy Deal Plus", variantId: "var_2", amount: 10, currencyCode: "usd" },
];

const at = (handle: string) => tierByHandle(TIERS, handle) as Tier;

describe("finding the tier a handle names", () => {
  it("finds each of the three", () => {
    for (const tier of TIERS) {
      expect(tierByHandle(TIERS, tier.handle)?.id).toBe(tier.id);
    }
  });

  it("returns nothing for a handle no tier has", () => {
    expect(tierByHandle(TIERS, "lousy-deal-enterprise")).toBeUndefined();
    expect(tierByHandle(TIERS, "")).toBeUndefined();
    expect(tierByHandle([], "lousy-deal")).toBeUndefined();
  });
});

describe("the not-found path", () => {
  // Executed, not described. `notFound()` throws `NEXT_HTTP_ERROR_FALLBACK;404`,
  // so the branch the page depends on is a thing this suite can catch --
  // which the earlier version, asserting only the lookup, could not: deleting
  // the page's `notFound()` call left it green.
  it("is taken for a handle no tier has", () => {
    expect(() => requireTier(TIERS, "lousy-deal-enterprise")).toThrowError(/NEXT_HTTP_ERROR_FALLBACK;404/);
    expect(() => requireTier([], "lousy-deal")).toThrowError(/NEXT_HTTP_ERROR_FALLBACK;404/);
    expect(() => requireTier(TIERS, "")).toThrowError(/NEXT_HTTP_ERROR_FALLBACK;404/);
  });

  it("is not taken for a handle that exists", () => {
    expect(requireTier(TIERS, "lousy-deal").title).toBe("Lousy Deal");
  });

  it("does not match on a prefix or a different case", () => {
    expect(tierByHandle(TIERS, "lousy")).toBeUndefined();
    expect(tierByHandle(TIERS, "Lousy-Deal")).toBeUndefined();
  });
});

describe("upgrades available", () => {
  it("offers the two worse deals on the cheapest tier, cheapest first", () => {
    expect(upgrades(TIERS, at("lousy-deal")).map((t) => t.title)).toEqual(["Lousy Deal Plus", "Lousy Deal Pro"]);
  });

  it("offers one on the middle tier", () => {
    expect(upgrades(TIERS, at("lousy-deal-plus")).map((t) => t.title)).toEqual(["Lousy Deal Pro"]);
  });

  it("offers none on the most expensive tier", () => {
    expect(upgrades(TIERS, at("lousy-deal-pro"))).toEqual([]);
  });

  it("never lists the tier being quoted, nor one priced the same", () => {
    const twin: Tier = { ...at("lousy-deal"), id: "prod_twin", handle: "lousy-deal-twin", title: "Lousy Deal Twin" };
    const withTwin = [...TIERS, twin];
    const listed = upgrades(withTwin, at("lousy-deal")).map((t) => t.handle);
    expect(listed).not.toContain("lousy-deal");
    // Paying the same amount for the same nothing is not an upgrade, and this
    // site does not make that joke.
    expect(listed).not.toContain("lousy-deal-twin");
  });
});

describe("the quotation's copy", () => {
  it("states the upgrade proposition as a fact", () => {
    expect(UPGRADES_LINE).toBe("Pay more. Receive the same.");
  });

  it("does not claim the right of withdrawal is already lost", () => {
    // VOS s 53(4) p 7-1 needs the trader's s 55(1)-(2) confirmation on a
    // durable medium as well as the buyer's consent. That is LD-02's email.
    expect(WITHDRAWAL_NOTICE).toContain("asked to consent");
    expect(WITHDRAWAL_NOTICE).toContain("not ticked for you");
    expect(WITHDRAWAL_NOTICE).not.toMatch(/you (?:have )?waive[d]? /i);
    expect(WITHDRAWAL_NOTICE).not.toMatch(/no right of withdrawal/i);
  });

  it("uses no exclamation mark", () => {
    for (const line of [UPGRADES_LINE, NO_UPGRADES_LINE, WITHDRAWAL_NOTICE]) {
      expect(line).not.toContain("!");
    }
  });
});

describe("the route a tier is served at", () => {
  it("is built in one place, so the table and the upgrade list cannot differ", () => {
    expect(tierPath("lousy-deal-pro")).toBe("/deal/lousy-deal-pro");
  });
});

describe("the rendered quotation", () => {
  const render = (tier: Tier) =>
    renderToStaticMarkup(
      createElement(Quotation, {
        title: tier.title,
        price: formatMoney(tier.amount, tier.currencyCode),
        value: formatMoney(NO_VALUE, tier.currencyCode),
        action: createElement("button", { type: "submit" }, "Acquire"),
        upgrades: upgrades(TIERS, tier).map((u) => ({
          id: u.id,
          title: u.title,
          price: formatMoney(u.amount, u.currencyCode),
          href: tierPath(u.handle),
        })),
      }),
    );

  const cheapestHtml = render(at("lousy-deal"));
  const dearestHtml = render(at("lousy-deal-pro"));

  it("values the deal at nothing rather than at its price", () => {
    // The one substitution that would be invisible in a helper test and
    // catastrophic on the page.
    expect(cheapestHtml).toContain(`<dd class="ledger-value">${formatMoney(0, "usd")}</dd>`);
    expect(cheapestHtml.split(formatMoney(5, "usd"))).toHaveLength(2);
  });

  it("marks the total loss with the accent, from the home page's own figure", () => {
    expect(cheapestHtml).toContain('class="ledger-value is-stamp"');
    expect(cheapestHtml).toContain("-100%");
  });

  it("lists the worse deals as ledger rows linking their own quotations", () => {
    expect(cheapestHtml).toContain(UPGRADES_TITLE);
    expect(cheapestHtml).toContain(UPGRADES_LINE);
    expect(cheapestHtml).toContain(`<a href="/deal/lousy-deal-plus">Lousy Deal Plus</a>`);
    expect(cheapestHtml).toContain(`<a href="/deal/lousy-deal-pro">Lousy Deal Pro</a>`);
    expect(cheapestHtml).toContain(formatMoney(10, "usd"));
    expect(cheapestHtml).toContain(formatMoney(25, "usd"));
  });

  it("drops the heading with the list, so nothing announces upgrades that are not there", () => {
    expect(dearestHtml).toContain(NO_UPGRADES_LINE);
    expect(dearestHtml).not.toContain(UPGRADES_TITLE);
    expect(dearestHtml).not.toContain(UPGRADES_LINE);
    expect(dearestHtml).not.toContain("<a href=\"/deal/");
  });

  it("carries the withdrawal notice as fine print on both", () => {
    for (const markup of [cheapestHtml, dearestHtml]) {
      expect(markup).toContain('<p class="fine-print">');
      expect(markup).toContain("asked to consent");
    }
  });
});

describe("the 404 the tier page can reach", () => {
  const html = renderToStaticMarkup(createElement(NotFound));

  it("renders as a document, server-side, with no client JavaScript", () => {
    // Without this route Next serves its own: an empty body under server
    // rendering, filled in by client JS, in the UA serif, with a dark-mode
    // block this identity does not have.
    expect(html).toContain('<section class="document">');
    expect(html).toContain("<h1");
    expect(html).not.toContain("prefers-color-scheme");
  });

  it("says what the brand document says, read from the brand document", () => {
    const brand = readFileSync(new URL("../../docs/current/brand.md", import.meta.url), "utf8");
    const title = "DOCUMENT NOT FOUND";
    const body = "This page has even less content than our products.";
    expect(brand).toContain(title);
    expect(brand).toContain(body);
    // Written sentence case, capitalised by CSS, like every other heading.
    expect(html).toContain("Document not found");
    expect(html).toContain(body);
  });
});
