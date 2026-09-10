/**
 * The four codes and what each costs, priced in integer cents.
 *
 * LD-06 constraint 3 is the invariant under test: a surcharge is zero or
 * more, and nothing -- no code, no input, no rounding -- lowers a price. The
 * sweep below is that constraint measured rather than assumed. The plan's
 * asserted figures (`ld-06-discounts.md`, D1) are stated as literals here, so
 * a change to the table has to change this file as well.
 */

import { describe, expect, it } from "vitest";

import {
  SURCHARGE_CODES,
  SURCHARGE_INTERNAL_TYPE,
  normalizeSurchargeCode,
  priceSurcharge,
} from "../src/commerce/surcharge";

const TIER_PRICES = [5, 10, 25] as const;

const price = (amount: number, code: string) => {
  const line = priceSurcharge(amount, code);
  if (line === null) throw new Error(`expected ${code} to be a code`);
  return line;
};

describe("the committed table", () => {
  it("holds exactly the four codes the operator chose", () => {
    expect(SURCHARGE_CODES.map((entry) => entry.code)).toEqual(["BALDRICK20", "SAVE10", "FREE", "BLACKFRIDAY"]);
  });

  it("names the internal type §9 gives the line", () => {
    expect(SURCHARGE_INTERNAL_TYPE).toBe("baldrick_surcharge");
  });
});

describe("the figures the plan asserts", () => {
  it("BALDRICK20 adds a fifth of the certificate", () => {
    expect(TIER_PRICES.map((amount) => price(amount, "BALDRICK20").unitPrice)).toEqual([1, 2, 5]);
  });

  it("SAVE10 on $25 adds $2.50", () => {
    expect(price(25, "SAVE10").unitPrice).toBe(2.5);
  });

  it("FREE is a flat dollar on every tier", () => {
    expect(TIER_PRICES.map((amount) => price(amount, "FREE").unitPrice)).toEqual([1, 1, 1]);
  });

  it("BLACKFRIDAY is a real line at zero", () => {
    expect(TIER_PRICES.map((amount) => price(amount, "BLACKFRIDAY").unitPrice)).toEqual([0, 0, 0]);
  });

  it("titles the line as the discount it is not", () => {
    expect(price(5, "BALDRICK20").title).toBe("Discount (BALDRICK20)");
    expect(price(5, "free").title).toBe("Discount (FREE)");
  });
});

describe("rounding", () => {
  // Both are exact halves of a cent, so half-up must round each up. Only $1.45
  // tells integer arithmetic from float: `1.45 * 0.1 * 100` is
  // 14.499999999999998, and `Math.round` of that gives 14 cents, not 15. At
  // $0.15 the float product is exactly 1.5, so that case is a plain half-up
  // check and would pass either way.
  it("rounds a half cent up, in integer arithmetic", () => {
    expect(price(0.15, "SAVE10").unitPrice).toBe(0.02);
    expect(price(1.45, "SAVE10").unitPrice).toBe(0.15);
  });

  it("accepts a two-decimal price that binary cannot hold exactly", () => {
    expect(price(19.99, "BALDRICK20").unitPrice).toBe(4);
    expect(price(19.99, "SAVE10").unitPrice).toBe(2);
    expect(price(0.01, "SAVE10").unitPrice).toBe(0);
  });

  it("never lowers a price and never returns a fraction of a cent, on every two-decimal price to $100", () => {
    for (let cents = 0; cents <= 10_000; cents += 1) {
      const amount = cents / 100;
      for (const { code } of SURCHARGE_CODES) {
        const { unitPrice } = price(amount, code);
        expect(unitPrice).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(unitPrice)).toBe(true);
        expect(Number(unitPrice.toFixed(2))).toBe(unitPrice);
      }
    }
  });
});

describe("what is not a code", () => {
  it.each(["", "   ", "BALDRICK 20", "BALDRlCK20", "BALDRICK21", "VIP", "SAVE10%"])("%j is null, not zero", (input) => {
    expect(priceSurcharge(5, input)).toBeNull();
  });
});

describe("normalization", () => {
  it("forgives surrounding whitespace and case", () => {
    expect(normalizeSurchargeCode("baldrick20")).toBe("BALDRICK20");
    expect(normalizeSurchargeCode("  BALDRICK20 ")).toBe("BALDRICK20");
    expect(normalizeSurchargeCode("\tSave10\n")).toBe("SAVE10");
    expect(price(5, "  baldrick20 ").unitPrice).toBe(1);
  });

  it("forgives nothing else", () => {
    expect(normalizeSurchargeCode("BALDRICK 20")).toBe("BALDRICK 20");
    expect(normalizeSurchargeCode("BALDRlCK20")).toBe("BALDRLCK20");
    expect(normalizeSurchargeCode("BALD-RICK20")).toBe("BALD-RICK20");
  });

  it("does not let a non-ASCII letter fold onto a code", () => {
    // U+017F LATIN SMALL LETTER LONG S uppercases to "S" under Unicode
    // rules. A code nobody typed must not match.
    expect(priceSurcharge(5, "ſave10")).toBeNull();
  });
});

describe("metadata", () => {
  it("carries the code, the base and the rate for a percentage code", () => {
    expect(price(25, "save10").metadata).toEqual({
      internal_type: "baldrick_surcharge",
      code: "SAVE10",
      base_amount_major: 25,
      percentage: 10,
    });
    expect(price(5, "BLACKFRIDAY").metadata).toEqual({
      internal_type: "baldrick_surcharge",
      code: "BLACKFRIDAY",
      base_amount_major: 5,
      percentage: 0,
    });
  });

  it("carries the code, the base and the fee for a flat code", () => {
    expect(price(10, "FREE").metadata).toEqual({
      internal_type: "baldrick_surcharge",
      code: "FREE",
      base_amount_major: 10,
      fee_amount_major: 1,
    });
  });

  it("survives a round trip through JSON unchanged, because it is stored as line-item metadata", () => {
    for (const { code } of SURCHARGE_CODES) {
      const { metadata } = price(19.99, code);
      expect(JSON.parse(JSON.stringify(metadata))).toEqual(metadata);
    }
  });
});

describe("a price that is not a two-decimal amount", () => {
  it.each([-1, -0.01, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 1.005, 0.001, 1e300])(
    "%s throws rather than returning null",
    (amount) => {
      expect(() => priceSurcharge(amount, "BALDRICK20")).toThrow(RangeError);
    },
  );

  // Otherwise a corrupt certificate price would be reported as "no such
  // code", and a data defect would read as a typo.
  it("throws even when the code is unknown", () => {
    expect(() => priceSurcharge(Number.NaN, "NOPE")).toThrow(RangeError);
  });
});
