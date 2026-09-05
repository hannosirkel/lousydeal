/**
 * Holds `src/lib/money.ts` to the unit the Store API actually returns and to
 * one figure shape site-wide.
 */

import { describe, expect, it } from "vitest";

import { formatMoney } from "../src/lib/money";

describe("formatMoney", () => {
  // The three tier prices as `listTiers` returns them. Medusa is seeded with
  // `amountMinor / 100` (`backend/src/scripts/seed-product.ts:122`), so a
  // $5.00 tier arrives as `5`. A formatter that assumed cents would render
  // these as $0.05, $0.10 and $0.25 -- wrong, and wrong in the direction a
  // customer would not complain about.
  it.each([
    [5, "$5.00"],
    [10, "$10.00"],
    [25, "$25.00"],
  ])("formats the tier amount %d as %s", (amount, expected) => {
    expect(formatMoney(amount, "usd")).toBe(expected);
  });

  it("always shows two decimal places", () => {
    expect(formatMoney(5.5, "usd")).toBe("$5.50");
    expect(formatMoney(0, "usd")).toBe("$0.00");
  });

  it("groups thousands", () => {
    expect(formatMoney(1234.5, "usd")).toBe("$1,234.50");
    expect(formatMoney(1234567, "usd")).toBe("$1,234,567.00");
  });

  it("puts the sign before the symbol", () => {
    expect(formatMoney(-5, "usd")).toBe("-$5.00");
  });

  it("rounds to the nearest cent rather than truncating", () => {
    expect(formatMoney(5.006, "usd")).toBe("$5.01");
    expect(formatMoney(5.004, "usd")).toBe("$5.00");
  });

  it("rounds a binary-inexact half down, and that is pinned rather than hidden", () => {
    // 5.005 is not representable: the nearest double is 5.00499999999999989…,
    // so rounding it to two places gives 5.00 and no amount of rewriting this
    // function changes that while it takes a `number`. Asserted so the next
    // person to notice sees it was known, and so a switch to half-up rounding
    // is a deliberate change with a failing test rather than a silent one.
    //
    // It does not reach a price today: every amount the Store API returns for
    // this shop is 5, 10 or 25 (`backend/src/commerce/product-model.ts`), and
    // nothing renders `tax_total`, which is the only field decision `009`
    // makes fractional beyond two places.
    expect(formatMoney(5.005, "usd")).toBe("$5.00");
  });

  it("accepts the API's lower-case currency code", () => {
    // Medusa normalises `currency_code` to lower case on write
    // (`@medusajs/utils/dist/common/normalize-currency-code.js`), so the value
    // reaching this function is `usd`, never `USD`.
    expect(formatMoney(5, "usd")).toBe(formatMoney(5, "USD"));
  });

  it("shows an ISO code rather than guessing a symbol for another currency", () => {
    // Never a `€` or a `£` picked by inference. A wrong symbol on a price is a
    // dishonest checkout, which is what the build contract §23 forbids.
    expect(formatMoney(5, "eur")).toBe("5.00 EUR");
    expect(formatMoney(5, "eur")).not.toContain("$");
  });

  it("refuses a non-finite amount rather than rendering NaN", () => {
    expect(() => formatMoney(Number.NaN, "usd")).toThrow(/non-finite/);
    expect(() => formatMoney(Number.POSITIVE_INFINITY, "usd")).toThrow(/non-finite/);
  });
});
