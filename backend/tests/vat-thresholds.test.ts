/**
 * The two counters decision `013` watches.
 *
 * These are numbers the operator acts on, and §11's rule about not inventing a
 * figure applies to them exactly as it applies to one a visitor reads. So the
 * tests are about what is counted, what is deliberately over-counted, and what
 * is refused rather than guessed.
 */

import { describe, expect, it } from "vitest";

import { EU_MEMBER_STATE_CODES } from "../src/commerce/tax-model";
import {
  LATVIAN_DOMESTIC_CEILING_EUR,
  UNION_TURNOVER_CEILING_EUR,
  foreignCurrencies,
  thresholdReport,
  type CountedOrder,
} from "../src/commerce/vat-thresholds";
import { countedOrders } from "../src/scripts/report-vat-thresholds";

const order = (over: Partial<CountedOrder> = {}): CountedOrder => ({
  total: 100,
  currencyCode: "usd",
  destinationCountry: "DE",
  placedAt: new Date("2026-03-01T00:00:00Z"),
  ...over,
});

const report = (orders: readonly CountedOrder[], year = 2026) =>
  thresholdReport(orders, EU_MEMBER_STATE_CODES, year, "usd");

describe("what counts toward Union turnover", () => {
  it("counts a supply to any member state", () => {
    const result = report([order({ destinationCountry: "DE" }), order({ destinationCountry: "FR" })]);
    expect(result.unionTurnover).toBe(200);
    expect(result.orders).toBe(2);
  });

  it("leaves an export out entirely", () => {
    // An export is outside the Union figure the scheme measures.
    const result = report([order({ destinationCountry: "US" }), order({ destinationCountry: "BR" })]);
    expect(result.unionTurnover).toBe(0);
  });

  it("counts an order with no address as domestic, not as nothing", () => {
    // **A certificate has no address** and is supplied where the trader is.
    // Leaving it out would understate the one threshold that ends the scheme,
    // and the certificate is most of what this shop sells.
    expect(report([order({ destinationCountry: null })]).unionTurnover).toBe(100);
  });

  it("counts only the year asked for", () => {
    // Both ceilings are annual figures about a calendar year. The year is a
    // parameter rather than a clock reading, so last year's answer -- which
    // decides whether the scheme survives into this one -- can be asked for.
    const orders = [
      order({ placedAt: new Date("2025-12-31T23:00:00Z") }),
      order({ placedAt: new Date("2026-01-01T01:00:00Z") }),
    ];
    expect(report(orders, 2026).unionTurnover).toBe(100);
    expect(report(orders, 2025).unionTurnover).toBe(100);
  });

  it("reads the destination however it arrives", () => {
    expect(report([order({ destinationCountry: "de" }), order({ destinationCountry: " FR " })]).unionTurnover).toBe(200);
  });
});

describe("the Latvian figure, which over-counts on purpose", () => {
  it("counts every order delivered to Latvia", () => {
    const result = report([order({ destinationCountry: "LV" }), order({ destinationCountry: "DE" })]);
    expect(result.latvianSupplies).toBe(100);
    // And it is inside the Union figure too: one supply, two thresholds.
    expect(result.unionTurnover).toBe(200);
  });

  it("does not need the dispatch country, which no order stores", () => {
    // What the €50,000 threshold measures is supplies *located* in Latvia --
    // dispatched from there and delivered there. The dispatch country is
    // answered by the shipping quote and is not on the order, so this counts
    // every Latvia-delivered order and over-states the figure.
    //
    // Over-counting a threshold warns early. Under-counting warns after the
    // letter from EMTA.
    expect(report([order({ destinationCountry: "LV" })]).latvianSupplies).toBe(100);
  });
});

describe("crossing a ceiling", () => {
  it("says nothing at all in the ordinary case", () => {
    expect(report([order()]).crossed).toEqual([]);
  });

  it("reports the Union ceiling, and what crossing it costs", () => {
    // 15 working days to EMTA, and the scheme for the following year. A
    // message that said only "threshold exceeded" would leave the operator to
    // find out the deadline from somewhere else.
    const crossed = report([order({ total: UNION_TURNOVER_CEILING_EUR })]).crossed;
    expect(crossed).toHaveLength(1);
    expect(crossed[0]).toMatch(/15 working days/);
    expect(crossed[0]).toMatch(/scheme is lost for the following year/);
  });

  it("reports the Latvian ceiling separately, and says what it costs", () => {
    const crossed = report([order({ destinationCountry: "LV", total: LATVIAN_DOMESTIC_CEILING_EUR })]).crossed;
    expect(crossed.some((line) => /no longer exempt without a Latvian registration/.test(line))).toBe(true);
  });

  it("reports both when both are crossed, Union first", () => {
    // Worst first: the Union ceiling ends the scheme outright, which is what
    // makes the Latvian one matter at all.
    const crossed = report([order({ destinationCountry: "LV", total: UNION_TURNOVER_CEILING_EUR })]).crossed;
    expect(crossed).toHaveLength(2);
    expect(crossed[0]).toMatch(/Union turnover/);
  });

  it("fires at the ceiling, not past it", () => {
    // The threshold is reached, not exceeded: Article 284(2) ends the scheme
    // when turnover *reaches* the ceiling.
    expect(report([order({ total: UNION_TURNOVER_CEILING_EUR - 0.01 })]).crossed).toEqual([]);
    expect(report([order({ total: UNION_TURNOVER_CEILING_EUR })]).crossed).toHaveLength(1);
  });
});

describe("the figures themselves", () => {
  it("rounds to the cent once, at the end", () => {
    // Summing tax-inclusive prices leaves the floating residue decision `009`
    // records on every tier. A total ending in fifteen decimal places, read
    // against a legal threshold, is noise that looks like precision.
    const orders = Array.from({ length: 3 }, () => order({ total: 5 / 3 }));
    expect(report(orders).unionTurnover).toBe(5);
  });

  it("names the currency it counted in, because the ceilings are in another", () => {
    expect(report([order()]).currencyCode).toBe("usd");
  });

  it("counts a foreign-currency order at face value rather than dropping it", () => {
    // Converting needs an ECB rate for a stated date, which this does not
    // have and will not invent. Dropping the order understates the threshold,
    // which is the one direction that matters -- so it is counted and the
    // currency is reported.
    const orders = [order(), order({ currencyCode: "eur" })];
    expect(report(orders).unionTurnover).toBe(200);
    expect(foreignCurrencies(orders, "usd")).toEqual(["eur"]);
  });

  it("finds no foreign currency in the ordinary case", () => {
    expect(foreignCurrencies([order(), order()], "usd")).toEqual([]);
  });
});

describe("reading an order out of Medusa", () => {
  it("takes a total however Medusa carries the money", () => {
    // `order-placed.ts` records the same trap: a `.numeric`, a `valueOf`, or a
    // plain number depending on where it came from.
    const { counted } = countedOrders([
      { total: 10, currency_code: "usd", created_at: "2026-03-01T00:00:00Z" },
      { total: { numeric: 20 }, currency_code: "usd", created_at: "2026-03-01T00:00:00Z" },
      { total: { valueOf: () => 30 }, currency_code: "usd", created_at: "2026-03-01T00:00:00Z" },
    ]);
    expect(counted.map((entry) => entry.total)).toEqual([10, 20, 30]);
  });

  it("skips an unreadable order and says how many, rather than counting it as zero", () => {
    // **A zero understates the threshold**, which is the failure this whole
    // file exists to prevent. An order that cannot be read is reported as a
    // gap in the count, not absorbed into it.
    const { counted, unreadable } = countedOrders([
      { total: 10, currency_code: "usd", created_at: "2026-03-01T00:00:00Z" },
      { total: "twelve", currency_code: "usd", created_at: "2026-03-01T00:00:00Z" },
      { total: 10, created_at: "2026-03-01T00:00:00Z" },
      { total: 10, currency_code: "usd", created_at: "not a date" },
    ]);
    expect(counted).toHaveLength(1);
    expect(unreadable).toBe(3);
  });

  it("takes the destination from the shipping address, and null where there is none", () => {
    const { counted } = countedOrders([
      { total: 1, currency_code: "usd", created_at: "2026-03-01T00:00:00Z", shipping_address: { country_code: "lv" } },
      { total: 1, currency_code: "usd", created_at: "2026-03-01T00:00:00Z" },
    ]);
    expect(counted.map((entry) => entry.destinationCountry)).toEqual(["lv", null]);
  });
});
