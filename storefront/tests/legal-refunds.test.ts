/**
 * Holds Refunds and Withdrawal to the statute it cites and to the register
 * `docs/current/brand.md` §5 sets.
 *
 * The structural guarantees are `no-unresolved-placeholder.test.ts`'s, which
 * picked this document up without being edited. What is here is substance.
 */

import { describe, expect, it } from "vitest";

import { CONSENT_LABEL } from "../src/content/checkout";
import { REFUNDS } from "../src/content/legal/refunds";

const prose = REFUNDS.sections.flatMap((s) => s.body).join("\n");

const section = (number: string) => {
  const found = REFUNDS.sections.find((candidate) => candidate.number === number);
  if (found === undefined) throw new Error(`Refunds has no §${number}`);
  return found.body.join("\n");
};

describe("the right itself", () => {
  it("is cited to the provision that grants it, and stated as the reader's", () => {
    expect(section("2")).toContain("§ 56(1)");
    expect(section("2")).toContain("14 days");
    expect(section("2")).toMatch(/without giving any reason/i);
  });

  it("says the seller cannot contract out of it", () => {
    // § 62: an agreement departing from this division to the consumer's
    // detriment is void. Worth saying on a page a buyer reads when they are
    // already suspicious.
    expect(section("2")).toContain("§ 62");
    expect(section("2")).toMatch(/void/i);
  });
});

describe("the exception", () => {
  it("states all three conditions, each identifiable", () => {
    const s = section("3");
    expect(s).toContain("§ 53(4) p 7¹");
    expect(s).toMatch(/First, supply began/);
    expect(s).toMatch(/Second, you gave express prior consent/);
    expect(s).toMatch(/Third, we gave you the confirmation/);
    expect(s).toContain("§ 55(1)");
  });

  it("says what happens when one is missing, and names the likely one", () => {
    expect(section("3")).toContain("your 14-day right stands");
    expect(section("3")).toMatch(/if we did not send you the confirmation/i);
  });

  it("cites the European provision as well as the Estonian one", () => {
    expect(section("3")).toContain("Article 16(m)");
  });
});

describe("how to withdraw", () => {
  it("offers the model form and any other unequivocal statement, as § 56(2²) does", () => {
    // The model form is required information under § 54(1) p 13, and a
    // document that mentions only an email address hides half of § 56(2²).
    expect(section("5")).toMatch(/model withdrawal form/i);
    expect(section("5")).toContain("§ 56(2³)");
    expect(section("5")).toContain("§ 56(2²)");
    expect(section("5")).toMatch(/unequivocal/i);
  });

  it("says sending in time is enough, and who has to prove it", () => {
    expect(section("5")).toContain("§ 56(2¹)");
    expect(section("5")).toContain("§ 56(2⁵)");
    expect(section("5")).toMatch(/even if it reaches us afterwards/i);
  });
});

describe("the refund", () => {
  it("states the period, the means and the cost", () => {
    expect(section("6")).toMatch(/no later than 14 days/i);
    expect(section("6")).toMatch(/same means of payment/i);
    expect(section("6")).toMatch(/at no cost to you/i);
  });
});

describe("what this document does not do", () => {
  it("never tells a reader the right is already gone", () => {
    expect(prose).not.toMatch(/\bwaive[ds]?\b/i);
    expect(prose).not.toMatch(/\byou (?:lose|forfeit|give up)\b[^.]*right of withdrawal/i);
    expect(prose).not.toMatch(/\bno longer\b[^.]*right of withdrawal/i);
  });

  it("carries no NO REFUNDS stamp, because the page cannot know if it is true", () => {
    // The plan permits one below the consent explanation. Whether it is true
    // depends on conditions a static page cannot evaluate for a given reader,
    // and a claim that only usually holds is the misleading §23 forbids.
    expect(prose.toUpperCase()).not.toContain("NO REFUNDS");
  });

  it("keeps the joke out of the statutory paragraphs", () => {
    for (const number of ["2", "3", "5", "6"]) {
      expect(section(number)).not.toMatch(/lousy|poor judgment|regrettab/i);
    }
    expect(prose).not.toContain("!");
  });

  it("names no amount of its own", () => {
    const withoutTheThreshold = prose.replace("at least 30 euros", "");
    expect(withoutTheThreshold).not.toMatch(/[$€£]\s?\d/);
    expect(withoutTheThreshold).not.toMatch(/\b\d+(?:\.\d{2})?\s?(?:dollars|euros)\b/i);
  });
});

describe("agreement with the checkout", () => {
  it("describes the box the checkout actually renders", () => {
    // The page and the document must not drift: §4 paraphrases the control,
    // so the two halves of the same consent are asserted against each other.
    expect(CONSENT_LABEL).toMatch(/begin immediately/i);
    expect(section("4")).toMatch(/begin immediately/i);
    expect(CONSENT_LABEL).toMatch(/acknowledge/i);
    expect(section("4")).toMatch(/acknowledge/i);
    expect(section("4")).toMatch(/not ticked for you/i);
  });
});
