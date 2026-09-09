/**
 * What the checkout says a buyer is ordering, once a cart can hold three
 * different things.
 *
 * **§ 62²(2)'s sanction is that the buyer is not bound by the order.** The
 * subsection requires the § 54(1) p 4, 6, 10 and 11 information immediately
 * before the order is transmitted — the main characteristics, the total with
 * taxes, any minimum duration, and the term of a continuing contract. A line
 * describing the wrong goods is therefore worse than a line describing none,
 * and the old single line said of a cart with a mug in it that the certificate
 * "is the whole of what you receive".
 *
 * `isPayableCart` admits three shapes and all three are tested. Merch alone is
 * not hypothetical: the Store API's line-item route is public, and
 * `order-placed.ts` already handles an order that issues no certificate.
 */

import { describe, expect, it } from "vitest";

import {
  ORDER_SUMMARY_LINES,
  POSTED_PRICE_NOTICE,
  PRICE_NOTICE,
  orderSummaryLines,
  priceNotice,
} from "../src/content/checkout";

const certificateOnly = orderSummaryLines({ hasCertificate: true, hasPostedGoods: false });
const mixed = orderSummaryLines({ hasCertificate: true, hasPostedGoods: true });
const goodsOnly = orderSummaryLines({ hasCertificate: false, hasPostedGoods: true });

describe("a cart holding only a certificate", () => {
  it("says exactly what it said before this row", () => {
    // The shop's oldest cart, and the one a regression here would reach first.
    expect(certificateOnly).toEqual(ORDER_SUMMARY_LINES);
  });

  it("still claims the certificate is the whole of what is received", () => {
    // True here and nowhere else, which is the entire reason this is a
    // function now.
    expect(certificateOnly.join(" ")).toMatch(/the whole of what you receive/i);
  });
});

describe("a cart holding both", () => {
  it("stops claiming the certificate is all of it", () => {
    // The false sentence, in the one cart it is false in.
    expect(mixed.join(" ")).not.toMatch(/the whole of what you receive/i);
  });

  it("describes each of the two, and how they arrive", () => {
    const text = mixed.join(" ");
    expect(text).toMatch(/one numbered digital certificate/i);
    expect(text).toMatch(/shown to you as soon as you have paid/i);
    expect(text).toMatch(/confers nothing/i);
    expect(text).toMatch(/printed goods/i);
    expect(text).toMatch(/made after you order them and posted/i);
  });
});

describe("a cart holding only merch", () => {
  it("does not say a certificate is being ordered", () => {
    // A summary naming a certificate on an order that issues none is the
    // § 62²(2) failure in its plainest form.
    expect(goodsOnly.join(" ")).not.toMatch(/you are ordering one numbered digital certificate/i);
  });

  it("says so, rather than leaving the buyer to notice the absence", () => {
    expect(goodsOnly.join(" ")).toMatch(/no certificate is issued, because you have not ordered one/i);
  });
});

describe("what every cart is told", () => {
  it("answers § 54(1) p 10 and p 11 in all three shapes", () => {
    // Nothing here continues, and saying so is shorter than making a reader
    // infer it from silence.
    for (const lines of [certificateOnly, mixed, goodsOnly]) {
      expect(lines.join(" ")).toMatch(/no subscription, no renewal, no minimum term/i);
    }
  });

  it("names no amount, since the total is the ledger row above", () => {
    for (const lines of [certificateOnly, mixed, goodsOnly]) {
      expect(lines.join(" ")).not.toMatch(/[$€£]\s?\d/);
    }
  });

  it("carries no exclamation mark, like every other surface", () => {
    for (const lines of [certificateOnly, mixed, goodsOnly]) {
      expect(lines.join(" ")).not.toContain("!");
    }
  });
});

describe("the return-cost disclosure, where it does most good", () => {
  /**
   * § 54(1) p 14 is the duty to say the buyer bears the cost of returning
   * goods, and **§ 56²(3) makes that cost shift conditional on having said
   * it**: no disclosure, no cost. Refunds §6.1 performs it in a document
   * reached from the footer. Saying it beside the pay control as well costs
   * one sentence and removes the argument about whether a footer link is
   * information given before the contract is concluded.
   */
  it("appears wherever something is posted", () => {
    for (const lines of [mixed, goodsOnly]) {
      expect(lines.join(" ")).toMatch(/you send it back at your own cost/i);
    }
  });

  it("gives the buyer's side of it too, not only the cost", () => {
    // The same sentence carries the 14 days and the refund of postage. A
    // disclosure that stated only the burden would be accurate and
    // one-sided, which is the failure `legal-refunds` guards against
    // throughout.
    const text = mixed.join(" ");
    expect(text).toMatch(/14 days from receiving it/i);
    expect(text).toMatch(/return the price and the postage you paid/i);
    expect(text).toMatch(/Refunds and Withdrawal/);
  });

  it("is absent from a cart with nothing to return", () => {
    // A certificate is not sent back to anybody, and a line about return
    // postage on a cart that posts nothing is noise the buyer must disregard.
    expect(certificateOnly.join(" ")).not.toMatch(/send it back/i);
  });
});

describe("the price notice", () => {
  it("is unchanged for a cart that posts nothing", () => {
    expect(priceNotice(false)).toBe(PRICE_NOTICE);
  });

  it("stops promising the shown amount is all anyone will charge", () => {
    // **"The amount charged" becomes "the amount we charge".** A customs
    // authority may levy import duty before releasing a parcel, and the
    // original sentence reads as a promise that nothing further can be asked
    // -- which is not ours to make.
    expect(priceNotice(true)).toBe(POSTED_PRICE_NOTICE);
    expect(POSTED_PRICE_NOTICE).toMatch(/the amount we charge/i);
    expect(POSTED_PRICE_NOTICE).not.toMatch(/the amount shown is the amount charged/i);
  });

  it("flags the import charge with no figure, because none is knowable", () => {
    // § 54(1) p 6's fallback limb: where an additional cost cannot reasonably
    // be calculated in advance, say that it may be payable. §11 forbids naming
    // an amount nobody computed, and this one turns on a tariff, a destination
    // and a valuation this shop never sees.
    expect(POSTED_PRICE_NOTICE).toMatch(/import duty or local tax/i);
    expect(POSTED_PRICE_NOTICE).toMatch(/cannot tell you that amount in advance/i);
    expect(POSTED_PRICE_NOTICE).not.toMatch(/[$€£]\s?\d/);
    expect(POSTED_PRICE_NOTICE).not.toMatch(/\b\d+(?:\.\d+)?\s?(?:per cent|%)/i);
  });

  it("says the charge is not ours, since a buyer will think it is", () => {
    expect(POSTED_PRICE_NOTICE).toMatch(/rather than by us/i);
  });

  it("still says postage is shown before payment, which is the p 6 half we can compute", () => {
    expect(POSTED_PRICE_NOTICE).toMatch(/shown as its own line before you pay/i);
  });
});
