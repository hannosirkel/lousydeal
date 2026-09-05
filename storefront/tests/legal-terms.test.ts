/**
 * Holds the Terms to the clauses V9's checkbox names, and to the register
 * `docs/current/brand.md` §5 sets for a legal document.
 *
 * The structural guarantees — no surviving placeholder, the closing line, the
 * date, the section numbering — are `no-unresolved-placeholder.test.ts`'s and
 * are not repeated. What is here is substance: the things this document must
 * say, and the things it must not.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { REFUNDS } from "../src/content/legal/refunds";
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

  it("says paying more gets you no more, without claiming where else it is said", () => {
    expect(section("2")).toMatch(/paying more does not get you more/i);
    // The first draft added "this is stated on every page that offers the
    // product". Measured, it is absent from the home page, the cart, the
    // checkout and the Pro tier page -- a false statement about the site,
    // inside the document §23 says must never mislead.
    expect(prose).not.toMatch(/stated on every page/i);
  });

  it("does not deem the buyer to have declared anything by acting", () => {
    // VÕS § 42(3) p 37 presumes unreasonably harmful a consumer term deeming a
    // declaration of intent made by an act. The checkout collects a real,
    // unticked consent instead.
    expect(prose).not.toMatch(/by ordering you (?:confirm|agree|accept)/i);
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

  it("states the condition the Estonian rate depends on", () => {
    // `backend/src/commerce/tax-model.ts` records that one rate applies only
    // under the Article 59c threshold. A clause that drops the condition
    // becomes false the day it is crossed, with nothing linking it back.
    expect(section("3")).toContain("Article 59c");
    expect(section("3")).toMatch(/below the threshold/i);
  });

  it("names no amount", () => {
    // Two reasons: a price written twice drifts, and the offer page's figures
    // come from the Store API. `tests/store-cart.test.ts` enforces the second
    // half of that across `storefront/src`; this asserts the intent here.
    expect(prose).not.toMatch(/[$€£]\s?\d/);
    // No amount of anything sold here. The one figure the document carries is
    // the Committee's own threshold, which is a fact about a forum rather than
    // a price -- and the point of stating it is that no price reaches it.
    const withoutTheThreshold = prose.replace("at least 30 euros", "");
    expect(withoutTheThreshold).not.toMatch(/\b\d+(?:\.\d{2})?\s?(?:dollars|euros)\b/i);
  });
});

describe("delivery and withdrawal", () => {
  it("says the certificate is supplied immediately", () => {
    expect(section("5")).toContain("supplied immediately");
  });

  it("cites the right of withdrawal to the section that grants it", () => {
    // VÕS §56(1), read from Riigi Teataja's public API, not from memory.
    expect(section("6")).toContain("§ 56(1)");
    expect(section("6")).toContain("14 days");
    expect(section("6")).toContain("võlaõigusseadus");
  });

  it("states all three conditions the exception requires, not just the consent", () => {
    // §53(4) p 7-1 needs supply begun, express consent with an
    // acknowledgement, AND the trader's §55(1)-(2) confirmation. The checkout
    // collects the middle one; LD-02's email is the third.
    const withdrawal = section("6");
    expect(withdrawal).toContain("§ 53(4) p 7¹");
    expect(withdrawal).toContain("express prior consent");
    expect(withdrawal).toContain("acknowledged");
    expect(withdrawal).toContain("§ 55(1)");
    expect(withdrawal).toContain("the third condition is not met for any order placed here and your 14-day right stands");
  });

  it("does not tell a buyer the right is already gone", () => {
    // Stated as: no sentence may put the loss in the past or the present. The
    // earlier version matched one exact phrasing, so "You lose your right of
    // withdrawal once you tick the box" would have passed a test named for
    // this guarantee.
    expect(prose).not.toMatch(/\bwaive[ds]?\b/i);
    expect(prose).not.toMatch(/\b(?:you )?(?:have|has) (?:no|lost|forfeited)\b[^.]*right of withdrawal/i);
    expect(prose).not.toMatch(/\byou (?:lose|forfeit|give up)\b[^.]*right of withdrawal/i);
    expect(prose).not.toMatch(/\bno longer\b[^.]*right of withdrawal/i);
    // The one permitted form is the conditional the statute actually creates.
    expect(section("6")).toContain("would thereby lose the right");
  });
});

describe("agreement with Refunds and Withdrawal", () => {
  it("puts the confirmation no later than the start of supply, as § 55(1) does", () => {
    // The first draft read "it is shown to you, and a confirmation is sent",
    // which puts the confirmation after supply began. A late confirmation does
    // not satisfy the third condition of § 53(4) p 7¹, so the ordering decides
    // whether the exception applies at all.
    expect(section("5")).toContain("no later than the moment supply begins");
    expect(REFUNDS.sections.flatMap((s) => s.body).join("\n")).toContain("no later than the moment supply begins");
  });

  it("discloses that the consent is a condition of ordering, not merely shown", () => {
    // Refunds §4 said the order does not proceed without it. Stating a harsher
    // term only in the document a buyer is less likely to read is the defect,
    // not the term.
    expect(section("4")).toMatch(/condition of ordering/i);
    expect(section("4")).toMatch(/does not proceed/i);
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

  it("caps contractual liability only, and says what the cap does not reach", () => {
    expect(section("9")).toContain("liability for a breach of these terms is limited to the amount you paid");
    // A contract cannot cap Article 82 damages, and this site publishes a
    // buyer-supplied inscription on a public page.
    expect(section("9")).toContain("Article 82");
  });

  it("chooses Estonian law without displacing a consumer's home protections", () => {
    expect(section("10")).toContain("Estonian law governs");
    expect(section("10")).toMatch(/mandatory rules of the country where you live/i);
  });
});

describe("disputes", () => {
  it("names the Estonian authority and its committee", () => {
    expect(section("11")).toContain("Consumer Disputes Committee");
    expect(section("11")).toContain("tarbijavaidluste komisjon");
    expect(section("11")).toContain("Endla 10A, 10122 Tallinn");
  });

  it("warns that the committee's threshold is above every price here", () => {
    // The Committee ordinarily takes disputes worth at least 30 euros, and the
    // dearest tier is below that. Offering a route that will not carry the
    // claim, without saying so, is the kind of unhelpful helpfulness §23 is
    // about.
    expect(section("11")).toContain("at least 30 euros");
    expect(section("11")).toMatch(/every item sold here costs less/i);
  });

  it("does not tell an EU consumer a forum is closed to them", () => {
    // Sources conflict on whether the Committee takes cross-border disputes.
    // Asserting the narrow reading would deny a right that may exist.
    expect(section("11")).not.toMatch(/only.*resident in Estonia/i);
    expect(section("11")).toContain("European Consumer Centre");
    expect(section("11")).toMatch(/courts remain open/i);
  });

  it("gives the committee's own contact, not the authority's switchboard", () => {
    expect(section("11")).toContain("avaldus@komisjon.ee");
    expect(section("11")).not.toContain("info@ttja.ee");
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

  it("describes no feature belonging to a slice that has not started", () => {
    // Gifting is LD-03 and merch is LD-04. A term about a feature nobody can
    // use is noise a lawyer has to read and a buyer has to disregard.
    expect(prose.toLowerCase()).not.toContain("gift");
    expect(prose.toLowerCase()).not.toContain("t-shirt");
    expect(prose.toLowerCase()).not.toContain("subscription");
  });

  it("makes exactly the forward-looking claims its header enumerates", () => {
    // The header lists four mechanisms that do not exist yet. Gate D found two
    // of them missing from a list of two, so the list is now checkable: each
    // phrase below is one of them, and a fifth would need adding to both.
    const forward = [
      "We owe you a confirmation on a durable medium",
      "we gave you the confirmation required by",
      "We do not yet send that confirmation",
      "both when you submit them",
      "Refunds and Withdrawal",
    ];
    for (const phrase of forward) expect(prose).toContain(phrase);

    const header = readFileSync(new URL("../src/content/legal/terms.ts", import.meta.url), "utf8").slice(0, 2000);
    expect(header).toContain("Four clauses describe mechanisms that do not exist yet");
    for (const owner of ["LD-02", "V10"]) expect(header).toContain(owner);
  });

  it("keeps the joke out of the clauses that decide anything", () => {
    for (const number of ["6", "9", "10"]) {
      expect(section(number)).not.toMatch(/lousy|regrettab|poor judgment/i);
    }
  });
});
