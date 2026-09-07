/**
 * What the counter is allowed to say, computed from rows.
 *
 * §11 forbids fabricating a transaction total and `AGENTS.md` puts the
 * condition plainly: a public counter reports real orders or does not ship.
 * These assertions are about arithmetic honesty rather than formatting.
 */

import { describe, expect, it } from "vitest";

import { dealTotals } from "../src/api/store/deals/totals/route";

const deal = (serial: number, amount: number, currency = "usd") => ({
  serial,
  amount_paid: amount,
  currency_code: currency,
});

describe("the totals", () => {
  it("counts the rows and sums what was actually paid", () => {
    expect(dealTotals([deal(1, 5), deal(2, 25), deal(3, 10)])).toEqual({
      count: 3,
      amount: 40,
      currency_code: "usd",
      latest_serial: 3,
    });
  });

  it("reports an empty shop as zero, with nothing else invented", () => {
    // Zero is the honest answer and the only figure available: there is no
    // currency to name and no latest deal to number.
    expect(dealTotals([])).toEqual({
      count: 0,
      amount: null,
      currency_code: null,
      latest_serial: null,
    });
  });

  it("takes the latest serial as the maximum, not as the count", () => {
    // They are equal today and need not stay so: a rolled-back insert consumes
    // a sequence number, so a gap makes the highest serial exceed the number of
    // deals. Reporting the count as the latest number understates the last
    // certificate's own name; reporting the maximum as the count overstates
    // volume, which §11 forbids.
    const gapped = dealTotals([deal(1, 5), deal(2, 5), deal(9, 5)]);

    expect(gapped.latest_serial).toBe(9);
    expect(gapped.count).toBe(3);
  });

  it("is unmoved by the order the rows arrive in", () => {
    // `listLousyDeals` promises no ordering, so a maximum taken as "the last
    // row" would be right only by luck.
    expect(dealTotals([deal(9, 5), deal(1, 5), deal(4, 5)]).latest_serial).toBe(9);
  });

  it("adds no floor and no offset", () => {
    // The prompt's `TOTAL VOLUNTARILY WASTED` invites a flattering starting
    // number. One deal is one deal.
    const one = dealTotals([deal(1, 5)]);

    expect(one.count).toBe(1);
    expect(one.amount).toBe(5);
    expect(one.latest_serial).toBe(1);
  });

  it("counts a hidden certificate, because the sale still happened", () => {
    // §5 lets an operator hide one without a new serial and without
    // reissuing. That is a decision about a page, not a claim that the money
    // was never taken -- and excluding it would make the count disagree with
    // the serial sequence. Nothing here filters on status, and this is what
    // says so.
    const withHidden = dealTotals([deal(1, 5), deal(2, 25)]);

    expect(withHidden.count).toBe(2);
    expect(withHidden.amount).toBe(30);
  });
});
