/**
 * Holds the Terms to the clauses V9's checkbox names, and to the register
 * `docs/current/brand.md` §5 sets for a legal document.
 *
 * The structural guarantees — no surviving placeholder, the closing line, the
 * date, the section numbering — are `no-unresolved-placeholder.test.ts`'s and
 * are not repeated. What is here is substance: the things this document must
 * say, and the things it must not.
 */

import { describe, expect, it } from "vitest";

import { TERMS } from "../src/content/legal/terms";

/** Every paragraph, flattened, for assertions about the document as a whole. */
const prose = TERMS.sections.flatMap((section) => section.body).join("\n");

const section = (number: string) => {
  const found = TERMS.sections.find((candidate) => candidate.number === number);
  if (found === undefined) throw new Error(`the Terms have no §${number}`);
  return found.body.join("\n");
};

describe("what is sold", () => {
  it("says plainly that a buyer receives a certificate and nothing else of value", () => {
    // The one clause the whole shop turns on. §23: the customer sees exactly
    // what they are buying, and the joke never depends on misleading them.
    expect(section("2")).toContain("numbered digital certificate");
    expect(section("2")).toContain("nothing else of value");
  });

  it("frames that as the description of the product, not a limitation on it", () => {
    expect(section("2")).toContain("description of the product");
  });

  it("says paying more gets you no more", () => {
    expect(section("2")).toMatch(/paying more does not get you more/i);
  });
});

describe("price and tax", () => {
  it("says the displayed price is the price charged and includes VAT", () => {
    // Decision `009`: the advertised price is what every buyer is charged, EU
    // or not, and Estonia's VAT comes out of it rather than being added.
    expect(section("3")).toContain("price shown on the offer page is the price charged");
    expect(section("3")).toContain("includes value added tax");
    expect(section("3")).toMatch(/nothing is added at checkout/i);
  });

  it("says who bears the VAT, since it is not the buyer", () => {
    expect(section("3")).toContain("{merchantLegalName} bears it");
  });

  it("names no amount", () => {
    // Two reasons: a price written twice drifts, and the offer page's figures
    // come from the Store API. `tests/store-cart.test.ts` enforces the second
    // half of that across `storefront/src`; this asserts the intent here.
    expect(prose).not.toMatch(/[$€£]\s?\d/);
    expect(prose).not.toMatch(/\b\d+(?:\.\d{2})?\s?(?:dollars|euros)\b/i);
  });
});

describe("delivery and withdrawal", () => {
  it("says the certificate is supplied immediately", () => {
    expect(section("5")).toContain("supplied immediately");
  });

  it("cites the right of withdrawal to the section that grants it", () => {
    // VÕS §56(1), read from Riigi Teataja's public API, not from memory.
    expect(section("6")).toContain("§56(1)");
    expect(section("6")).toContain("14 days");
    expect(section("6")).toContain("võlaõigusseadus");
  });

  it("states all three conditions the exception requires, not just the consent", () => {
    // §53(4) p 7-1 needs supply begun, express consent with an
    // acknowledgement, AND the trader's §55(1)-(2) confirmation. The checkout
    // collects the middle one; LD-02's email is the third.
    const withdrawal = section("6");
    expect(withdrawal).toContain("§53(4) clause 7¹");
    expect(withdrawal).toContain("express prior consent");
    expect(withdrawal).toContain("acknowledged");
    expect(withdrawal).toContain("§55(1)");
    expect(withdrawal).toContain("If any of those conditions is not met, your 14-day right stands");
  });

  it("does not tell a buyer the right is already gone", () => {
    expect(prose).not.toMatch(/you have (?:no|lost)\b[^.]*right of withdrawal/i);
    expect(prose).not.toMatch(/\bwaive[ds]?\b/i);
  });
});

describe("inscriptions", () => {
  it("keeps the billing name off the certificate, as contract §5 requires", () => {
    expect(section("7")).toContain("never carries your billing name");
  });

  it("describes the filter as mechanical and not as a judgement", () => {
    expect(section("7")).toMatch(/mechanical filter/i);
    expect(section("7")).toMatch(/not a judgement/i);
  });

  it("reserves removal without pretending removal is a refund", () => {
    expect(section("7")).toMatch(/remove, blank or further reduce/i);
    expect(section("7")).toMatch(/does not entitle you to a refund/i);
    expect(section("7")).toMatch(/does not change its number/i);
  });
});

describe("liability and law", () => {
  it("limits liability without limiting what law forbids limiting", () => {
    expect(section("9")).toMatch(/intentional or grossly negligent/i);
    expect(section("9")).toMatch(/death or personal injury/i);
    expect(section("9")).toMatch(/cannot be limited by law/i);
  });

  it("caps the rest at what was actually paid", () => {
    expect(section("9")).toContain("limited to the amount you paid");
  });

  it("chooses Estonian law without displacing a consumer's home protections", () => {
    expect(section("10")).toContain("Estonian law governs");
    expect(section("10")).toMatch(/mandatory rules of the country where you live/i);
  });
});

describe("disputes", () => {
  it("names the Estonian authority and its committee", () => {
    expect(section("11")).toContain("Consumer Disputes Committee");
    expect(section("11")).toContain("Tarbijakaitse ja Tehnilise Järelevalve Amet");
    expect(section("11")).toContain("Endla 10a, 10122 Tallinn");
  });

  it("scopes the committee to consumers it is open to", () => {
    expect(section("11")).toContain("resident in Estonia");
    expect(section("11")).toContain("European Consumer Centre");
  });

  it("links no dispute platform that no longer exists", () => {
    // Closed 20 July 2025 by Regulation (EU) 2024/3228, with traders obliged
    // to remove the link. `no-unresolved-placeholder.test.ts` applies this to
    // every document; it is repeated here because this is the document the
    // requirement was written about.
    expect(prose.toLowerCase()).not.toContain("odr");
    expect(prose.toLowerCase()).not.toContain("online dispute resolution");
  });
});

describe("the register", () => {
  it("carries no exclamation mark", () => {
    // brand.md §2: none, in any surface, ever. A legal document least of all.
    expect(prose).not.toContain("!");
  });

  it("makes no claim about a feature that does not exist", () => {
    // Gifting is LD-03 and has no backend. A term about a feature nobody can
    // use is noise a lawyer has to read and a buyer has to disregard.
    expect(prose.toLowerCase()).not.toContain("gift");
    // Merch is LD-04.
    expect(prose.toLowerCase()).not.toContain("t-shirt");
  });

  it("keeps the joke out of the clauses that decide anything", () => {
    for (const number of ["6", "9", "10"]) {
      expect(section(number)).not.toMatch(/lousy|regrettab|poor judgment/i);
    }
  });
});
