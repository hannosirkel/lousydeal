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
    // or not, and Estonia's VAT comes out of it rather than being added. That
    // promise survives P10 and is now scoped to the thing it is true of.
    expect(section("3")).toContain("price shown on the offer page is the price charged");
    expect(section("3")).toContain("includes value added tax");

    // **"nothing is added at checkout" was the third assertion here, and P10
    // had to remove it rather than satisfy it.** Postage is added at checkout,
    // so the unqualified sentence became false the moment a parcel could be in
    // the cart -- and this guard would have required the document to keep
    // saying it. What replaces it is the same promise made precisely: no tax
    // line, no fee, nothing the buyer was not shown first.
    expect(section("3")).not.toMatch(/\bnothing is added at checkout\b/i);
    expect(section("3")).toMatch(/no tax line at checkout, no fee, and no charge you were not shown/i);
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
    // C13 inverted this. It read "the third condition is not met for any order
    // placed here and your 14-day right stands", which was true only while no
    // confirmation was sent. What replaces it is not the opposite claim: the
    // clause has to say the confirmation is sent *and* decline to conclude that
    // the exception therefore bites.
    expect(withdrawal).toContain("we do send that confirmation");
    expect(withdrawal).toContain("will not refuse");
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

describe("posting a thing, which this shop had never done", () => {
  it("keeps the parcel at our risk, which is the clause a trader gets wrong", () => {
    // § 209(4) third sentence: in a consumer sale where carriage is provided,
    // the handover obligation is discharged when the item reaches the buyer's
    // possession -- not on handover to the carrier. § 214(2) passes risk at
    // that same moment.
    //
    // **The temptation is real and it comes from our own supplier.** Printful's
    // terms pass risk to *us* on delivery to the carrier, and a shop copying
    // that sentence into its consumer terms would be writing a term § 237(1)
    // voids, in the document a buyer reads after a parcel has gone missing.
    const s = section("5");
    expect(s).toContain("§ 209(4)");
    expect(s).toContain("§ 214(2)");
    expect(s).toMatch(/travels at our risk, not yours/i);
    expect(s).toMatch(/not when we hand it to a courier/i);
    // The property, not the phrasing: no sentence may put risk on the buyer at
    // dispatch, however it is worded.
    expect(s).not.toMatch(/risk[^.]*passes[^.]*(?:dispatch|courier|carrier|when we (?:post|send))/i);
  });

  it("states a delivery limit rather than a promise it has not measured", () => {
    // § 209(6): absent an agreed time, without delay and no later than 30 days
    // from conclusion. § 54(1) p 9 wants the delivery time given. A window
    // invented here would bind us to a number nobody measured, which is §11's
    // rule applied to a figure the trader acts on.
    const s = section("5");
    expect(s).toContain("§ 209(6)");
    expect(s).toMatch(/30 days/);
    expect(s).toMatch(/we do not promise a date/i);
  });

  it("says postage is added and where, since §3 opens by saying nothing is", () => {
    // The old §3 said "nothing is added at checkout". With a parcel in the
    // cart that reads as false, and the fix is not to delete the promise but
    // to name the one exception and say it is shown first.
    const s = section("3");
    expect(s).toMatch(/postage is the one thing that is added/i);
    expect(s).toMatch(/before you pay, never afterwards/i);
    expect(s).toMatch(/the certificate is not posted and carries none/i);
  });

  it("flags import charges without inventing a figure for them", () => {
    // § 54(1) p 6's fallback limb: where additional costs cannot reasonably be
    // calculated in advance, the trader says that they may be payable. A
    // customs authority's charge is exactly that, and §11 forbids naming an
    // amount nobody computed.
    const s = section("3");
    expect(s).toContain("§ 54(1) p 6");
    expect(s).toMatch(/import duty or local tax/i);
    expect(s).toMatch(/cannot tell you the amount in advance/i);
    expect(s).toMatch(/not ours to collect and not ours to keep/i);
  });

  it("does not extend the Article 59c sentence to goods, which it does not cover", () => {
    // Decision `009` is about digital supplies. Goods are decision `013`:
    // taxed where the parcel lands, accounted for in Estonia through OSS
    // rather than by registering abroad. Leaving one sentence to cover both
    // would have been the easy edit and the wrong one.
    const s = section("3");
    const article59c = s.split(/(?<=\.)\s+/).filter((sentence) => /59c/.test(sentence)).join(" ");
    expect(article59c).toMatch(/for the certificate|that supply/i);
    expect(s).toMatch(/follows where the parcel goes/i);
    expect(s).toMatch(/instead of registering in each country/i);
  });
});

describe("the withdrawal clause, once there are two clocks", () => {
  it("gives the goods clock as well as the certificate's", () => {
    // **Three mutations survived here before this block existed**, all of them
    // in §6: collapsing the two clocks into one, letting a § 53(4) exception
    // reach the goods, and dropping the split. §6 was rewritten and nothing
    // guarded the rewrite -- the tests below it all predate LD-04 and are
    // about the certificate.
    //
    // This clause is the one a buyer reads before paying, so an understated
    // period here is worse than the same error in Refunds.
    const s = section("6");
    expect(s).toContain("§ 56(1¹)");
    expect(s).toContain("§ 56(1³)");
    expect(s).toMatch(/the day it reaches you/i);
    expect(s).toMatch(/the day the last of them does/i);
    expect(s).toMatch(/run separately/i);
  });

  it("does not let any § 53(4) exception reach a printed item", () => {
    // p 2 and p 3 are the two a print-on-demand shop would reach for. Refunds
    // §3 settles it at length; this clause must not quietly disagree, and a
    // sentence claiming an exception here would remove a right the other
    // document grants.
    const s = section("6");
    expect(s).toMatch(/no exception on the § 53\(4\) list covers a printed item/i);
    expect(s).toMatch(/reaches nothing in a parcel/i);
    expect(s).toMatch(/the consent box has no effect on them/i);
    // The property: no sentence may assert an exception applies to goods.
    //
    // **Written once as a bare negative pattern, and it failed on the correct
    // text.** `/§ 53\(4\)[^.]*covers a printed item/` matches the denial —
    // "No exception on the § 53(4) list covers a printed item" — because
    // nothing between them is a full stop. A pattern that cannot tell a claim
    // from its negation is not a guard; it is a ban on the subject.
    //
    // So the unit is the sentence, and every sentence that connects the
    // exception list to a printed item has to be one that denies it.
    const claims = s
      .split(/(?<=\.)\s+/)
      .filter((sentence) => /§ 53\(4\)/.test(sentence) && /printed item/i.test(sentence))
      .filter((sentence) => !/\bno exception\b/i.test(sentence));
    expect(claims).toEqual([]);
  });

  it("does not make conclusion and supply coincide for a thing not yet made", () => {
    // §4 said the contract is concluded "which is also the moment supply
    // begins ... because there is nothing to prepare and nothing to send".
    // True of the certificate and false of a mug, and the whole of §5's
    // delivery limb depends on the distinction.
    const s = section("4");
    expect(s).toMatch(/for the certificate that is also the moment supply begins/i);
    expect(s).toMatch(/the item does not exist yet when the contract is concluded/i);
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
    expect(section("10")).toMatch(/intentional or grossly negligent/i);
    expect(section("10")).toMatch(/death or personal injury/i);
    expect(section("10")).toMatch(/cannot be limited by law/i);
  });

  it("caps contractual liability only, and says what the cap does not reach", () => {
    expect(section("10")).toContain("liability for a breach of these terms is limited to the amount you paid");
    // A contract cannot cap Article 82 damages, and this site publishes a
    // buyer-supplied inscription on a public page.
    expect(section("10")).toContain("Article 82");
  });

  it("chooses Estonian law without displacing a consumer's home protections", () => {
    expect(section("11")).toContain("Estonian law governs");
    expect(section("11")).toMatch(/mandatory rules of the country where you live/i);
  });
});

describe("disputes", () => {
  it("names the Estonian authority and its committee", () => {
    expect(section("12")).toContain("Consumer Disputes Committee");
    expect(section("12")).toContain("tarbijavaidluste komisjon");
    expect(section("12")).toContain("Endla 10A, 10122 Tallinn");
  });

  it("no longer claims the committee's threshold is above every price here", () => {
    // **Inverted, and by the same reasoning as the merch ban above.** The
    // dearest tier was below 30 euros; a shirt is not, and an order with
    // postage is further above. The old assertion required the document to
    // state something that had become false.
    //
    // What survives is the reason it was there: a route that will not carry
    // the claim is worse than no route, so the document still says which side
    // of the threshold a reader is on — without computing a conversion it
    // cannot do, since the threshold is in euro and the catalogue is not.
    expect(section("12")).toContain("at least 30 euros");
    expect(section("12")).not.toMatch(/every item sold here costs less/i);
    expect(section("12")).toMatch(/depends on what you ordered/i);
    expect(section("12")).toMatch(/worse than no route at all/i);
  });

  it("does not tell an EU consumer a forum is closed to them", () => {
    // Sources conflict on whether the Committee takes cross-border disputes.
    // Asserting the narrow reading would deny a right that may exist.
    expect(section("12")).not.toMatch(/only.*resident in Estonia/i);
    expect(section("12")).toContain("European Consumer Centre");
    expect(section("12")).toMatch(/courts remain open/i);
  });

  it("gives the committee's own contact, not the authority's switchboard", () => {
    expect(section("12")).toContain("avaldus@komisjon.ee");
    expect(section("12")).not.toContain("info@ttja.ee");
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
    // Merch is LD-04. A term about a feature nobody can use is noise a lawyer
    // has to read and a buyer has to disregard.
    //
    // **Gifting was on this list until G7**, and the header said "the row that
    // builds gifting writes its clause". LD-03 built it, so §8 is that clause
    // and the guard is inverted below rather than deleted -- the claim it made
    // is now false and a guard asserting a false thing is worse than none.
    // **Merch was on this list until LD-04 P10, and the ban is now lifted
    // rather than left to pass by accident.** The claim it protected -- that
    // this document must not mention goods -- became false when the row
    // landed, and a guard asserting a false thing is worse than none. The
    // clause that replaces it is below.
    expect(prose.toLowerCase()).not.toContain("subscription");
  });

  it("describes the goods it now sells, and does not let them inherit the joke", () => {
    // The inversion. §2's worthlessness clauses are the most valuable thing in
    // this document and the most dangerous to over-apply: a mug is worth what
    // a mug is worth, and a clause telling a buyer their shirt conferred
    // nothing would be a misdescription of a physical object rather than the
    // honest joke the certificate's clauses are.
    const s = section("2");
    expect(s).toMatch(/two kinds of thing are sold/i);
    expect(s).toMatch(/ordinary objects/i);
    expect(s).toMatch(/worth what such objects are worth/i);
    expect(s).toMatch(/nothing in the paragraphs above about worthlessness is true of a printed item/i);
    // And the reading instruction every later clause leans on.
    expect(s).toMatch(/where these terms say the certificate/i);

    // **Mutation deleted the sentence that says what the second kind *is* and
    // this passed**, because "two kinds of thing are sold" and the
    // worthlessness carve-out both survived. A document announcing two kinds
    // and naming one is worse than one that never mentioned goods. § 54(1) p 4
    // wants the main characteristics, so they are named.
    expect(s).toMatch(/the second is printed goods/i);
    for (const item of ["shirt", "mug", "cap", "sticker"]) expect(s).toContain(item);
  });

  it("keeps the certificate's own clauses intact while doing it", () => {
    // The failure mode of a rewrite like this is dilution: scoping the
    // worthlessness paragraphs to the certificate is one edit away from
    // softening them. They are the clauses §23 turns on.
    const s = section("2");
    expect(s).toContain("numbered digital certificate");
    expect(s).toMatch(/nothing else of value/i);
    expect(s).toMatch(/no rights, no ownership, no entitlement/i);
    expect(s).toMatch(/paying more does not get you more/i);
  });

  it("carries the gifting clause, and says who holds the contract", () => {
    const gifting = section("8");
    // The one thing this clause exists to make unambiguous. A reader who
    // thought gifting spent their withdrawal right would be wrong, and a
    // recipient who thought they had a contract would be wrong the other way.
    expect(gifting).toMatch(/the contract is still yours/i);
    expect(gifting).toMatch(/you are the consumer/i);
    expect(gifting).toMatch(/the recipient has a certificate; you have the contract/i);
    expect(gifting).toContain("§6");

    // And the constraint the operator settled: nothing about the recipient is
    // printed or published.
    expect(gifting).toMatch(/never printed on the certificate and are never published/i);
  });

  it("makes exactly the forward-looking claims its header enumerates", () => {
    // The header lists four mechanisms that do not exist yet. Gate D found two
    // of them missing from a list of two, so the list is now checkable: each
    // phrase below is one of them, and a fifth would need adding to both.
    const forward = [
      "We owe you a confirmation on a durable medium",
      "we gave you the confirmation required by",
      "both when you submit them",
      "Refunds and Withdrawal",
    ];
    for (const phrase of forward) expect(prose).toContain(phrase);

    // "We do not yet send that confirmation" was on this list. C13 removed it
    // from the list and from the document in the same change, because it is
    // now false: C9 built the message and C10 and C11 gave both deployments a
    // transport. The clause it belonged to states the act instead.
    expect(prose).not.toContain("We do not yet send that confirmation");

    const header = readFileSync(new URL("../src/content/legal/terms.ts", import.meta.url), "utf8").slice(0, 2400);
    expect(header).toContain("No clause here describes a mechanism that does not exist");
    for (const owner of ["LD-02", "V10"]) expect(header).toContain(owner);
  });

  it("keeps the joke out of the clauses that decide anything", () => {
    for (const number of ["6", "9", "10"]) {
      expect(section(number)).not.toMatch(/lousy|regrettab|poor judgment/i);
    }
  });
});
