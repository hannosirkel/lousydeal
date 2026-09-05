/**
 * Holds the tier page's selection logic to `docs/current/brand.md` §4.
 *
 * The page component itself awaits `connection()` and `cookies()` and cannot
 * be rendered outside a request, so what it decides — which tier a handle
 * names, which tiers are upgrades, in what order — lives in
 * `src/lib/tier-rows.ts` and is called here rather than re-implemented.
 */

import { describe, expect, it } from "vitest";

import { NO_UPGRADES_LINE, UPGRADES_LINE, WITHDRAWAL_NOTICE } from "../src/content/deal";
import type { Tier } from "../src/lib/medusa-client";
import { tierByHandle, tierPath, upgrades } from "../src/lib/tier-rows";

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

  it("returns nothing for a handle no tier has, so the page can 404", () => {
    // The page calls `notFound()` on this, rather than rendering a quotation
    // with no item -- which would tell a crawler the deal exists.
    expect(tierByHandle(TIERS, "lousy-deal-enterprise")).toBeUndefined();
    expect(tierByHandle(TIERS, "")).toBeUndefined();
    expect(tierByHandle([], "lousy-deal")).toBeUndefined();
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

  it("offers none on the most expensive, which is what the page says so", () => {
    expect(upgrades(TIERS, at("lousy-deal-pro"))).toEqual([]);
    expect(NO_UPGRADES_LINE).toContain("worst deal available");
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
