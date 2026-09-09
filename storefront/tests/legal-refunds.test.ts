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

  it("starts the clock for goods where § 56(1¹) starts it, not where the certificate's starts", () => {
    // § 56(1¹): physical possession by the consumer, or by a third party they
    // named who is *not* the carrier. The whole substance of P10 is that this
    // is a different day from § 56(1³)'s, and a document carrying only the
    // digital rule understates a merch buyer's period by however long the post
    // took.
    //
    // **Asserted on the paragraph that does the work, not on the section.**
    // Mutation swapped § 56(1¹) for § 56(1³) in the operative sentence and the
    // section-wide `toContain` passed, because the split-order paragraph below
    // cites § 56(1¹) too. Each rule is now tied to the clause that states it,
    // and each is checked against the other's provision as well -- a citation
    // present somewhere is not a citation in the right place.
    const paragraphs = REFUNDS.sections.find((candidate) => candidate.number === "2")?.body ?? [];

    const goods = paragraphs.filter((paragraph) => /physical possession/i.test(paragraph)).join(" ");
    expect(goods).toContain("§ 56(1¹)");
    expect(goods).not.toContain("§ 56(1³)");
    expect(goods).toMatch(/not the courier/i);

    const certificate = paragraphs.filter((paragraph) => /day the contract is concluded/i.test(paragraph)).join(" ");
    expect(certificate).toContain("§ 56(1³)");
    expect(certificate).not.toContain("§ 56(1¹)");
  });

  it("runs a split order from the last parcel, which is the rule Printful makes real", () => {
    // § 56(1¹) p 1 for several things delivered separately, p 2 for one thing
    // handed over in parts. Not hypothetical: the catalogue is fulfilled from
    // different facilities, so a two-item order arrives as two parcels on two
    // days and the later one is the one that counts.
    const s = section("2");
    expect(s).toContain("§ 56(1¹) p 1");
    expect(s).toMatch(/the last of them/i);
    expect(s).toMatch(/\bp 2\b/);
    expect(s).toMatch(/last part/i);
  });

  it("keeps the two clocks apart in a mixed order", () => {
    // Nothing in the Act makes the certificate's supply date touch the goods
    // period or the reverse. A buyer who took one date for the whole order
    // would have the wrong answer for half of it.
    expect(section("2")).toMatch(/run separately/i);
    expect(section("2")).toMatch(/neither moves the other/i);
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

  it("says the confirmation is sent without concluding the right is gone", () => {
    // **This is the inverse of the guard it replaces, and the inversion is the
    // point of C13.** The old one required §3 to say "today the third is
    // missing for every order" and §4 "We do not send that confirmation yet".
    // Both were true until C9 built the message and C10 and C11 gave the
    // deployments a transport; leaving them would have made this suite enforce
    // a falsehood in a legal document.
    //
    // The original finding it guarded against still stands, though, and is
    // why this is not simply the opposite assertion. The first draft wrote "We
    // send it by email" in §4, unqualified, and left §3 conditional -- so a
    // reader taking the two together concluded the right was gone. §4 must
    // therefore say both things: that the confirmation is sent, and that
    // whether it satisfies § 55(1) is not a question answered in our favour.
    expect(section("3")).toContain("your 14-day right stands");
    expect(section("3")).toMatch(/we send the confirmation the third requires/i);
    expect(section("4")).toMatch(/We send that confirmation/);
    expect(section("4")).toMatch(/not a question we will answer in our own favour/i);
    expect(section("4")).toMatch(/we will not refuse/i);
  });

  it("cites the European provision as well as the Estonian one", () => {
    expect(section("3")).toContain("Article 16(m)");
  });

  it("scopes § 53(4) p 7¹ to the certificate, since it reaches nothing in a parcel", () => {
    // By its own words the point is about digital content *not supplied on a
    // physical medium*. Left unscoped in a shop that posts things, the section
    // reads as a general position about "your order" -- which is the reading
    // that would cost a buyer a right they still have.
    expect(section("3")).toMatch(/reaches nothing that arrives in a parcel/i);
  });

  it("says no exception reaches a printed item, and names the two that come closest", () => {
    // § 53(4) p 2 (made for the consumer's personal needs) and p 3 (made to
    // conditions they supplied) are the two a print-on-demand shop would be
    // tempted by. Neither fits a fixed design picked from a list, and the
    // Commission reads Article 16(c) the same way at 2021/C 525/01.
    //
    // The temptation is real and worth naming: a shop that made this claim
    // would never have to take a shirt back.
    const s = section("3");
    expect(s).toMatch(/no exception on the § 53\(4\) list reaches a printed item/i);
    expect(s).toMatch(/\bp 2\b/);
    expect(s).toMatch(/\bp 3\b/);
    expect(s).toContain("2021/C 525/01");
    expect(s).toMatch(/not personalisation/i);
  });

  it("does not claim an Estonian authority it could not find", () => {
    // Constraint 10: a claim is bounded, cited or executed. No Estonian court
    // or committee decision on print-on-demand was located, so the document
    // says the reading is the Commission's and says which way it resolved the
    // gap. Asserting a domestic authority here would be the fabrication §11
    // forbids, in the document least able to afford it.
    expect(section("3")).toMatch(/found no Estonian decision either way/i);
    expect(section("3")).toMatch(/leaves you with the right/i);
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

  it("says the § 56⁴ button exists, where it is, and what it cannot yet do", () => {
    // In force 01.09.2026 and absent from the redaction the first draft read.
    // It was gate item 7 -- a build task, not a copy one -- and V17 built it.
    // § 54(1) p 13¹ makes its existence and location pre-contractual
    // information, so saying where it is *is* the compliance.
    const s = section("5");
    expect(s).toContain("§ 56⁴");
    expect(s).toContain("Taganen lepingust");
    expect(s).toContain("/legal/withdraw");
    expect(s).toContain("§ 54(1) p 13¹");
    // And the honest half: no email exists, so no § 56⁴(4) receipt does.
    // **This required the falsehood, which is the Backblaze shape the privacy
    // suite warns about: removing the false sentence failed the build.** The
    // document said "we send no email at all" -- untrue since LD-02, and
    // untrue twice over since C14, whose `POST /store/withdrawals` sends both
    // the trader copy and the consumer's § 56⁴(4) receipt. Gate D found it.
    expect(s).toMatch(/we send you the receipt § 56⁴\(4\) requires/i);
    expect(s).not.toMatch(/we send no email at all/i);
    // That sentence went with the falsehood it excused. What survives is the
    // half that is about the buyer rather than about us.
    expect(s).toMatch(/dates your withdrawal from when you sent it/i);
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

describe("sending a printed item back", () => {
  it("gives the consumer's own deadline, and says dispatch is enough", () => {
    // § 56²(1): 14 days from *making the declaration*, not from our receiving
    // it, and the obligation is met by sending within them.
    const s = section("6.1");
    expect(s).toContain("§ 56²(1)");
    expect(s).toMatch(/14 days after you told us/i);
    expect(s).toMatch(/even if it reaches us later/i);
  });

  it("says where it goes, through the resolver rather than a hard-coded address", () => {
    // Decision `004`. A return address written into prose is one that stops
    // being true silently.
    const s = section("6.1");
    expect(s).toContain("{merchantAddress}");
    expect(s).toContain("{merchantLegalName}");
  });

  it("puts the return cost on the buyer only by doing the thing that permits it", () => {
    // § 56²(3) shifts the direct cost to the consumer *only where the trader
    // told them beforehand*, and § 54(1) p 14 is that duty. The paragraph has
    // to be the disclosure, not a report that one was made elsewhere -- and
    // § 54(8) is the sanction, which the document states against itself.
    const s = section("6.1");
    expect(s).toContain("§ 56²(3)");
    expect(s).toContain("§ 54(1) p 14");
    expect(s).toContain("§ 54(8)");
    expect(s).toMatch(/you pay the direct cost/i);
    expect(s).toMatch(/this paragraph is us doing that/i);
  });

  it("states the diminished-value rule with the half that cuts against us", () => {
    // § 56²(4): liability only for use beyond ascertaining nature, properties
    // and functioning -- the shop test -- and *none at all* where the trader
    // failed the § 54(1) p 12 and p 13 duties. A document giving only the
    // first half would overstate what a buyer owes.
    const s = section("6.1");
    expect(s).toContain("§ 56²(4)");
    expect(s).toContain("§ 54(1) p 12");
    expect(s).toMatch(/as you could handle it in a shop/i);
    expect(s).toMatch(/no loss in value at all/i);
  });

  it("says the returned item is not resold, which is a fact about us and not a condition on them", () => {
    // The uncomfortable one. Print-on-demand means a withdrawal is a total
    // loss for the shop, and the temptation is to let a buyer infer they
    // should not exercise the right. The paragraph says the opposite in as
    // many words.
    expect(section("6.1")).toMatch(/our problem and not a reason for you to keep something/i);
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

  it("cites the goods division for goods, which is the plan's own mistake corrected", () => {
    // **`ld-04-merch.md` said "§ 62¹¹'s two years applies to goods too". It
    // does not.** § 62¹¹ is headed *digitaalse sisu või digitaalse teenuse*
    // and sits in the division § 62⁵ confines to digital content and digital
    // services. For a thing in a parcel the provision is § 218(2), with
    // § 218(2²)'s one-year presumption.
    //
    // The failure this guards is not a missing citation but a plausible wrong
    // one: two years is the right number under both, so a document citing
    // § 62¹¹ for a mug would state the correct period under the wrong law and
    // read perfectly.
    const s = section("7");
    expect(s).toContain("§ 218(2)");
    expect(s).toContain("§ 218(2²)");
    expect(s).toContain("§ 237(1)");
    expect(s).toMatch(/two years of the item being handed over/i);
    // And the § 62 division must still be there for the certificate, so this
    // is not satisfied by deleting the digital limb.
    expect(s).toContain("§ 62¹¹(1)");
    expect(s).toContain("§ 62²²(1)");
  });

  it("names the goods remedies from the sales chapter, not the digital one", () => {
    // § 222(1) repair or replacement, § 222(2¹) our narrow right to decline,
    // § 223(1)'s five grounds for termination. Structurally parallel to
    // § 62¹⁴ and a different provision.
    const s = section("7");
    expect(s).toContain("§ 222(1)");
    expect(s).toContain("§ 223(1)");
    expect(s).toMatch(/five grounds/i);
    expect(s).toMatch(/your choice again, not ours/i);
  });

  it("states the two-month notice duty, which runs against the buyer", () => {
    // § 220(1) second sentence: a consumer must notify within two months of
    // learning of the fault. It is the one rule in this section that costs the
    // reader something, which is exactly why omitting it would be the kind of
    // selective accuracy this document exists to avoid.
    const s = section("7");
    expect(s).toContain("§ 220(1)");
    expect(s).toMatch(/within two months of learning of it/i);
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
    for (const number of ["2", "3", "5", "5.1", "6", "6.1", "7"]) {
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

describe("the two kinds of thing, kept apart", () => {
  it("tells the reader which word means which, before relying on the distinction", () => {
    // Every date in the document now depends on it. A reader who did not know
    // that "a printed item" was a defined term would take the certificate's
    // answers for the whole order.
    const s = section("1");
    expect(s).toMatch(/where a paragraph says the certificate/i);
    expect(s).toMatch(/a printed item/i);
    expect(s).toMatch(/where it says neither/i);
  });

  it("says the consent box has no effect on anything posted", () => {
    // The trap this row exists to close. One box on one checkout, and a cart
    // that can hold a mug -- a buyer could reasonably read the acknowledgement
    // as covering the order. It does not, and no box could: § 53(4) p 7¹ is
    // limited to digital content off a physical medium and § 55(2)'s
    // confirmation limb applies only where the object is digital content.
    const s = section("4");
    expect(s).toMatch(/about the certificate and nothing else/i);
    expect(s).toMatch(/no effect at all on a shirt/i);
    // The strong form, and the honest one: not "we choose not to rely on it"
    // but "the law provides no such box for goods".
    expect(s).toMatch(/the law provides none for goods/i);
    // And the box's own words, which P10c scoped. The derivation below checks
    // §4 covers the label's vocabulary; this checks the scoping specifically,
    // since "certificate" was already in both and the word that changed is
    // one the coverage test treats as a stopword.
    expect(s).toMatch(/right of withdrawal for that certificate/i);
  });

  it("gives the § 55(1) deadline that applies to goods, which is a different one", () => {
    // § 55(1): the confirmation is due no later than the item is delivered,
    // where for the certificate it is due no later than supply begins. The
    // second is the hard one and the first is comfortable, and saying which is
    // which is what stops §4 reading as though one deadline governed both.
    expect(section("4")).toMatch(/no later than the item is delivered/i);
  });

  it("says the withdrawal button covers goods, since § 56⁴ turns on how not what", () => {
    expect(section("5")).toMatch(/how a contract was concluded and not on what was sold/i);
  });
});

describe("the disputes threshold, which the merch inverted", () => {
  it("no longer claims every price is below it", () => {
    // §8 said the €30 threshold was "more than anything sold here costs". The
    // catalogue now holds a shirt at more than that and a cart can hold two,
    // so the sentence became false the moment merch was orderable -- the same
    // shape as the confirmation guards C13 had to invert, found by asking what
    // this row made untrue rather than by a test failing.
    expect(prose).not.toMatch(/more than anything sold here costs/i);
    expect(prose).not.toMatch(/every item sold here costs less/i);
  });

  it("says which side of it a reader is on, without computing a conversion", () => {
    // The threshold is in euro and the catalogue prices in another currency,
    // so no honest sentence can tell a given reader the answer. It says what
    // decides it instead. A figure here would also breach the ban below on
    // this document naming an amount of its own.
    const s = section("8");
    expect(s).toContain("at least 30 euros");
    expect(s).toMatch(/depends on what you ordered/i);
    expect(s).toMatch(/would rather say that than tell you the route is closed/i);
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

  /** The sentence in §4 that describes the box, isolated so it can be judged. */
  const boxSentence = section("4")
    .split(/(?<=\.)\s+/)
    .filter((sentence) => /\btick/i.test(sentence))
    .join(" ");

  it("paraphrases the box the checkout actually renders, word for word", () => {
    // Derived from the label rather than restated beside it, and matched on
    // word boundaries: `includes` let "acknowledge" be satisfied by
    // "acknowledges" in an unrelated clause.
    const described = boxSentence.toLowerCase();
    const missing = contentWords(CONSENT_LABEL).filter(
      (word) => !new RegExp(`\\b${word}\\b`).test(described),
    );
    expect(missing).toEqual([]);
  });

  it("does not negate what the box says while quoting its vocabulary", () => {
    // Gate D rewrote §4 to "You do not acknowledge anything by ticking it, and
    // you will not lose your right of withdrawal once supply has begun" -- a
    // superset of the label's words, saying the opposite -- and every test
    // passed. Word coverage alone cannot see a negation, so it is checked for
    // separately, on the one sentence that describes the control.
    expect(boxSentence).not.toBe("");
    // "not ticked for you" is a negation the clause must keep, and it sits in
    // the same sentence as the acknowledgement, so it is removed before the
    // rest is judged. Its presence is asserted separately below.
    expect(boxSentence).toMatch(/is not ticked for you/i);
    const claims = boxSentence.replace(/is not ticked for you/gi, "");
    // What may not be negated is the acknowledgement or the loss -- the two
    // things the box actually says.
    expect(claims).not.toMatch(/\bnot\b[^.]*\backnowledg/i);
    expect(claims).not.toMatch(/\backnowledg[^.]*\bnothing\b/i);
    expect(claims).not.toMatch(/\b(?:will not|do(?:es)? not|never)\s+lose\b/i);
  });

  it("keeps the checkout label free of a negation too", () => {
    // The mirror. Inverting CONSENT_LABEL with "not" leaves its content words
    // intact, so the derivation above would still agree with §4.
    expect(CONSENT_LABEL).not.toMatch(/\b(?:not|never|nothing)\b/i);
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
