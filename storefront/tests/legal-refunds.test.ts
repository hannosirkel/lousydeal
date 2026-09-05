/**
 * Holds Refunds and Withdrawal to the statute it cites and to the register
 * `docs/current/brand.md` §5 sets.
 *
 * The structural guarantees are `no-unresolved-placeholder.test.ts`'s, which
 * picked this document up without being edited. What is here is substance.
 *
 * **The consent test was rewritten because Gate D broke it.** Its first version
 * asserted that `CONSENT_LABEL` matched `/begin immediately/i` and that §4
 * matched `/begin immediately/i` — two independent claims, never compared. The
 * reviewer replaced the checkout label with "begin immediately on the
 * fourteenth day, and I acknowledge nothing whatever" and all thirteen tests
 * passed. It derives the comparison from the label now, so a change to either
 * side that the other does not follow fails.
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
  it("is cited to the provision that grants it, and stated as a consumer's", () => {
    // § 56(1) and § 62 protect a `tarbija`. Addressing the right to whoever is
    // reading overstates who has it.
    expect(section("2")).toContain("§ 56(1)");
    expect(section("2")).toContain("14 days");
    expect(section("2")).toMatch(/a consumer may withdraw/i);
    expect(section("2")).toMatch(/without giving any reason/i);
  });

  it("says when the 14 days start, which is the one number a buyer must compute", () => {
    // § 56(1³): for digital content off a physical medium the period runs from
    // the day the contract is concluded, not from delivery or from reading
    // this. A withdrawal policy that omits it cannot be acted on.
    expect(section("2")).toContain("§ 56(1³)");
    expect(section("2")).toMatch(/day the contract is concluded/i);
  });

  it("says the seller cannot contract out of it", () => {
    // § 62 voids a departure to the consumer's detriment; § 56²(9) voids a term
    // that hinders the exercise of the right. Both belong on a page a buyer
    // reads when they are already suspicious.
    expect(section("2")).toContain("§ 62");
    expect(section("2")).toContain("§ 56²(9)");
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

  it("says in the present tense that the third condition is not met", () => {
    // This is the finding the row exists to answer. The first draft wrote "We
    // send it by email" in §4, unqualified, and left §3 conditional -- so a
    // reader taking the two together concluded the right was gone. The
    // confirmation is LD-02's and does not exist.
    expect(section("3")).toContain("your 14-day right stands");
    expect(section("3")).toMatch(/today the third is missing for every order/i);
    expect(section("4")).toMatch(/We do not send that confirmation yet/);
    // And no sentence anywhere may assert the confirmation as a present fact.
    expect(prose).not.toMatch(/\bwe send (?:it|you|the confirmation) by email\b/i);
  });

  it("cites the European provision as well as the Estonian one", () => {
    expect(section("3")).toContain("Article 16(m)");
  });
});

describe("what the confirmation must be", () => {
  it("gives § 55(1)'s timing, which decides whether the exception applies at all", () => {
    expect(section("4")).toContain("no later than the moment supply begins");
    expect(section("4")).toContain("§ 55(1)");
  });

  it("gives § 55(2)'s contents in full, not just the consent half", () => {
    // § 55(2) requires the § 54(1) information as well, unless already given on
    // a durable medium before conclusion. Naming only the consent makes the
    // exclusion of the right look easier to reach than it is.
    expect(section("4")).toContain("§ 55(2)");
    expect(section("4")).toContain("§ 54(1)");
    expect(section("4")).toMatch(/unless we already gave it to you on a durable medium/i);
  });
});

describe("how to withdraw", () => {
  it("offers the model form and any other unequivocal statement, as § 56(2²) does", () => {
    expect(section("5")).toContain("§ 56(2²)");
    expect(section("5")).toMatch(/prefers neither/i);
    expect(section("5")).toMatch(/unequivocal/i);
  });

  it("reproduces the form instead of saying a regulation contains one", () => {
    // § 54(1) p 13 makes the form itself pre-contractual information. Telling a
    // buyer it exists somewhere in a ministerial regulation has not given it to
    // them. Annex I(B) of Directive 2011/83/EU, read from EUR-Lex.
    const form = section("5.1");
    expect(form).toContain("§ 56(2³)");
    expect(form).toContain("§ 54(1) p 13");
    expect(form).toContain("Annex I(B)");
    for (const line of [
      "hereby give notice",
      "withdraw from my/our",
      "Ordered on",
      "Name of consumer(s)",
      "Address of consumer(s)",
      "Signature of consumer(s)",
      "Delete as appropriate",
    ]) {
      expect(form).toContain(line);
    }
    // Addressed to the trader, through decision `004`'s resolver rather than a
    // name written into the form.
    expect(form).toContain("{merchantLegalName}");
    expect(form).toContain("{merchantEmail}");
  });

  it("says sending in time is enough, and who has to prove it", () => {
    expect(section("5")).toContain("§ 56(2¹)");
    expect(section("5")).toContain("§ 56(2⁵)");
    expect(section("5")).toContain("§ 56(2⁴)");
    expect(section("5")).toMatch(/even if it reaches us afterwards/i);
  });

  it("declares the missing § 56⁴ button as our failure, not as the reader's limit", () => {
    // In force 01.09.2026, four days before this row, and absent from the
    // redaction the first draft read. There is no button; saying nothing would
    // leave §5 reading as a complete account of the routes available.
    const s = section("5");
    expect(s).toContain("§ 56⁴");
    expect(s).toContain("Taganen lepingust");
    expect(s).toMatch(/This site does not have one/);
    expect(s).toMatch(/our non-compliance and not a restriction on you/i);
  });
});

describe("the refund", () => {
  it("cites the rule it states, as the rest of the document does", () => {
    // § 56¹(1) is the period and its trigger, § 56¹(4) the means. The first
    // draft stated both correctly and cited neither, in a document whose whole
    // method is citation.
    expect(section("6")).toContain("§ 56¹(1)");
    expect(section("6")).toContain("§ 56¹(4)");
    expect(section("6")).toMatch(/no later than 14 days after we receive/i);
    expect(section("6")).toMatch(/same means of payment/i);
    expect(section("6")).toMatch(/no fee for withdrawing/i);
  });

  it("does not promise to refuse in one case only", () => {
    // "the only circumstance in which we will say no" is wider than intended --
    // an expired period is another, and §7 refuses for worthlessness -- and
    // § 54(11) makes pre-contractual information part of the contract.
    expect(prose).not.toMatch(/only circumstance/i);
  });
});

describe("non-conformity, which is not withdrawal", () => {
  it("gives the § 54(1) p 18 reminder that statutory remedies exist", () => {
    expect(section("7")).toContain("§ 54(1) p 18");
    expect(section("7")).toContain("§ 62²²(1)");
  });

  it("names the remedies and says whose choice they are", () => {
    // § 62¹⁴(3): price reduction or termination is the consumer's election on
    // any of five conditions. "We will put it right or refund you" describes a
    // trader's discretion instead, which is not the law.
    expect(section("7")).toContain("§ 62¹⁴(1)");
    expect(section("7")).toContain("§ 62¹⁴(3)");
    expect(section("7")).toMatch(/reduce the price or terminate the contract/i);
    expect(section("7")).toMatch(/your choice, not ours/i);
  });

  it("gives the periods and the burden of proof", () => {
    expect(section("7")).toContain("§ 62¹¹(1)");
    expect(section("7")).toContain("§ 62¹²(2)");
    expect(section("7")).toContain("§ 62¹²(1)");
    expect(section("7")).toMatch(/two years/i);
    expect(section("7")).toMatch(/one year/i);
  });

  it("does not assert that worthlessness excludes those remedies", () => {
    // § 62¹⁰ excuses a departure from § 62⁷(3) only where the consumer was
    // specifically informed AND expressly and separately agreed at conclusion.
    // The checkout collects one box, the §4 consent. So the flat "worth nothing
    // is not a defect" of the first draft claims a consent nobody gave.
    const s = section("7");
    expect(s).toContain("§ 62¹⁰");
    expect(s).toContain("§ 62⁷(3) p 2");
    expect(s).toMatch(/expressly and separately/i);
    expect(s).toMatch(/we do not treat worthlessness as removing anything/i);
    expect(prose).not.toMatch(/is not a defect/i);
  });
});

describe("what this document does not do", () => {
  it("never tells a reader the right is already gone", () => {
    // Property, not phrasing: no sentence may put the loss in the past or the
    // present. Only the statute's own conditional is allowed.
    expect(prose).not.toMatch(/\bwaive[ds]?\b/i);
    expect(prose).not.toMatch(/\byou (?:lose|forfeit|give up)\b[^.]*right of withdrawal/i);
    expect(prose).not.toMatch(/\b(?:have|has|had) (?:no|lost|forfeited)\b[^.]*right of withdrawal/i);
    expect(prose).not.toMatch(/\bno longer\b[^.]*right of withdrawal/i);
    expect(prose).not.toMatch(/\bright of withdrawal (?:is|was) (?:gone|excluded|extinguished)\b/i);
  });

  it("carries no NO REFUNDS stamp, because the page cannot know if it is true", () => {
    // The plan permits one below the consent explanation. Whether it is true
    // depends on conditions a static page cannot evaluate for a given reader,
    // and a claim that only usually holds is the misleading §23 forbids.
    expect(prose.toUpperCase()).not.toContain("NO REFUNDS");
  });

  it("keeps the joke out of the statutory paragraphs", () => {
    for (const number of ["2", "3", "5", "5.1", "6", "7"]) {
      expect(section(number)).not.toMatch(/lousy|poor judgment|regrettab/i);
    }
    expect(prose).not.toContain("!");
  });

  it("names no amount of its own", () => {
    // Global, not first-occurrence: the earlier `String.replace` with a string
    // needle stripped one match and would have let a second through.
    const withoutTheThreshold = prose.replace(/at least 30 euros/g, "");
    expect(withoutTheThreshold).not.toMatch(/[$€£]\s?\d/);
    expect(withoutTheThreshold).not.toMatch(/\b\d+(?:\.\d{2})?\s?(?:dollars|euros)\b/i);
  });
});

describe("agreement with the checkout", () => {
  /** Words that carry meaning, so a comparison survives grammatical rewording. */
  const STOPWORDS = new Set([
    "a", "and", "as", "at", "be", "by", "for", "from", "has", "have", "i", "in", "is", "it", "my",
    "of", "on", "once", "or", "that", "the", "to", "will", "you", "your",
  ]);

  const contentWords = (text: string): string[] => [
    ...new Set(
      text
        .toLowerCase()
        .replace(/[^a-z\s]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 1 && !STOPWORDS.has(word)),
    ),
  ];

  it("paraphrases the box the checkout actually renders, word for word", () => {
    // Derived from the label rather than restated beside it. Gate D's mutation
    // -- "begin immediately on the fourteenth day, and I acknowledge nothing
    // whatever" -- introduces `fourteenth`, `nothing` and `whatever`, none of
    // which §4 contains, so this now fails where the old version passed.
    const described = section("4").toLowerCase();
    const missing = contentWords(CONSENT_LABEL).filter((word) => !described.includes(word));
    expect(missing).toEqual([]);
  });

  it("compares against a label that still says the two things it must", () => {
    // The derivation above is only as good as its subject: an emptied label has
    // no content words and would vacuously agree with anything.
    expect(contentWords(CONSENT_LABEL).length).toBeGreaterThan(6);
    expect(CONSENT_LABEL).toMatch(/begin immediately/i);
    expect(CONSENT_LABEL).toMatch(/right of withdrawal/i);
  });

  it("says the box is unticked and that ticking it is a condition of ordering", () => {
    expect(section("4")).toMatch(/not ticked for you/i);
    expect(section("4")).toMatch(/condition of ordering/i);
    expect(section("4")).toMatch(/the order does not proceed/i);
  });
});
