/**
 * Holds the Privacy Policy to what the code actually does.
 *
 * **Every semantic claim in the first version of this file survived inversion —
 * eight out of eight.** Gate D rewrote "it is not sent to anyone" as "it is not
 * sent to anyone except our advertising partners, and it is used to build a
 * picture of you", swapped all three lawful bases, and turned "we do not sell
 * data" into "we sell data", and every test passed. Each `it()` named a
 * *meaning* and each assertion was a `toMatch` on a fragment that survives
 * negation.
 *
 * So the unit here is the claim, not the fragment. `claim()` returns the
 * paragraph a keyword appears in and throws when it is absent, so a deletion
 * and an inversion fail through the same call — and the assertions are made
 * against that paragraph rather than against the whole document, which is what
 * stops "except our advertising partners" from passing beside an untouched
 * sentence somewhere else.
 *
 * The structural guarantees are `no-unresolved-placeholder.test.ts`'s. The
 * claims about third parties are `third-party-disclosure.test.ts`'s and the
 * cookies are `browser-storage-disclosure.test.ts`'s; both check the document
 * against the source rather than against itself.
 */

import { describe, expect, it } from "vitest";

import { PRIVACY } from "../src/content/legal/privacy";

const prose = PRIVACY.sections.flatMap((s) => s.body).join("\n");

const section = (number: string) => {
  const found = PRIVACY.sections.find((candidate) => candidate.number === number);
  if (found === undefined) throw new Error(`Privacy has no §${number}`);
  return found.body.join("\n");
};

/**
 * The paragraph a phrase appears in.
 *
 * A paragraph and not a sentence: a claim in this document routinely spans two
 * — "Ours is called lousydeal_cart_id. It holds an opaque identifier… and it
 * ends when you close your browser." Splitting finer made the assertions agree
 * with punctuation rather than with meaning.
 *
 * It throws when the phrase is absent, so a deleted claim fails as loudly as an
 * inverted one. That matters: the two failure modes have to be caught by the
 * same call, or a mutation escapes through whichever is missing.
 */
const claim = (text: string, phrase: string | RegExp): string => {
  const pattern = typeof phrase === "string" ? phrase : phrase.source;
  const paragraph = text.split("\n").find((candidate) => new RegExp(pattern, "i").test(candidate));
  if (paragraph === undefined) throw new Error(`no paragraph about ${String(phrase)}`);
  return paragraph;
};

/** Words that reverse a sentence's sense, or quietly add an exception to it. */
const NEGATED = /\b(?:not|never|no|nothing|except|unless|apart from|other than|besides)\b/i;

describe("the controller", () => {
  it("is named through decision 004's resolver, not written in", () => {
    expect(section("1")).toContain("{merchantLegalName}");
    expect(section("1")).toContain("{merchantAddress}");
    expect(section("1")).toContain("{merchantRegistryCode}");
  });

  it("gives a contact address, which Article 13(1)(a) and (b) require", () => {
    // Deleting this survived the first version: `{merchantEmail}` remained in
    // §8, so the unresolved-placeholder walk stayed green while the controller
    // section lost its contact details.
    expect(claim(section("1"), "{merchantEmail}")).toMatch(/write to/i);
  });
});

describe("the cookies", () => {
  it("counts three, because Stripe sets two on this site's own domain", () => {
    // The finding that made V11a necessary. Read from js.stripe.com: the cookie
    // writer defaults `expiresIn` to 31536e6 ms, and the caller passes
    // `domain: "." + document.location.hostname`.
    const count = claim(section("2"), /cookies can be set/);
    expect(count).toMatch(/three cookies/i);
    expect(count).not.toMatch(/\bone cookie\b/i);
    expect(section("2")).toContain("__stripe_mid");
    expect(section("2")).toContain("__stripe_sid");
  });

  it("gives each one a lifetime, and does not call the year-long one a session", () => {
    expect(claim(section("2"), "lousydeal_cart_id")).toMatch(/ends when you close your browser/i);
    expect(claim(section("2"), "__stripe_mid lasts")).toMatch(/lasts a year/i);
    expect(claim(section("2"), "__stripe_sid lasts")).toMatch(/30 minutes/i);
  });

  it("says why no consent is asked for, rather than asserting there is nothing to consent to", () => {
    // The first draft concluded "there is nothing to consent to" from an
    // inventory of one. With a year-long device identifier in the inventory,
    // the reason has to be given and it has to be about Stripe's two.
    const reason = claim(section("2"), /take the view/);
    expect(reason).toMatch(/part of accepting a card payment safely/i);
    expect(section("2")).toMatch(/set only when you reach the page where a payment happens/i);
    expect(prose).not.toMatch(/nothing to consent to/i);
  });
});

describe("what is recorded when you visit", () => {
  it("says the request lines do not carry the visitor's address", () => {
    // The store API is reached only through this site's own server, whose proxy
    // forwards content-type, accept and stripe-signature. With no
    // x-forwarded-for, Medusa's `req.ip` is the storefront pod's address. The
    // first draft described a log this deployment does not produce.
    const lines = claim(section("2"), /do not carry your address/);
    expect(lines).toMatch(/do not carry your address/i);
    expect(section("2")).toMatch(/the same for everyone/i);
    expect(prose).not.toMatch(/we log your IP address|your IP address, the identifier your browser/i);
    // The sentence has to end there. Gate D appended "except our advertising
    // partners" and a paragraph-level match did not care.
    expect(lines).toMatch(/they are not sent to anyone\./);
    expect(lines).not.toMatch(/\b(?:except|apart from|other than|besides|save for)\b/i);
  });

  it("attributes the visitor's address to Cloudflare, which does see it", () => {
    expect(claim(section("2"), /your own address/i)).toMatch(/Cloudflare/);
    expect(claim(section("5"), /Cloudflare provides/)).toMatch(/sees the address each of your requests comes from/i);
  });

  it("keeps the no-analytics claim free of exceptions", () => {
    const analytics = claim(section("2"), /There is no analytics/);
    expect(analytics).toMatch(/no measurement, no advertising pixel/i);
    expect(prose).not.toMatch(/\bpicture of you\b/i);
  });
});

describe("what the checkout asks for", () => {
  it("does not claim there is nowhere on this site to type a name or an email", () => {
    // `<PaymentElement>` overrides only `wallets`, so Stripe's default
    // billing-details fields render inside an element this site mounts. The
    // first draft's §3 said the opposite and contradicted its own §4.
    expect(prose).not.toMatch(/nowhere on this site to type/i);
    const frame = claim(section("3"), /Stripe decides what that frame asks for/);
    expect(frame).not.toBe("");
    expect(section("3")).toMatch(/your name, your email address, your telephone number or a billing address/i);
    expect(section("3")).toMatch(/Apple Pay, Google Pay or Link/);
  });

  it("bounds what our own code receives, and counts it", () => {
    // The count is asserted, not just the list. C3b added a third field, and a
    // test that only looked for "the country you are in" would have passed a
    // notice still telling a reader there were two.
    const asked = claim(section("3"), /Our own code asks you for three things/);
    expect(asked).toMatch(/your email address/i);
    expect(asked).toMatch(/the country you are in/i);
    expect(asked).toMatch(/the consent described in Refunds and Withdrawal/i);
    expect(section("3")).not.toMatch(/asks you for two things/i);
  });

  it("says what the email address is for, and that the confirmation is sent", () => {
    // C3b collected the address and C9 built the confirmation; between the
    // two, this required the notice to say the duty was *not* discharged, and
    // forbade any claim that it was. C10 and C11 gave both deployments a
    // transport, so the old wording became the falsehood this guard existed to
    // prevent -- inverted here, in the change that made it false.
    //
    // The lawful basis is the half worth pinning. A statutory confirmation is
    // sent under a legal obligation, never consent, and Article 13(1)(c)
    // requires the basis to be stated rather than implied. S7 carries the
    // list; this checks S3 points at it rather than leaving a reader to guess.
    const purpose = claim(section("3"), /order confirmation we owe you/);
    expect(purpose).toMatch(/we send it/i);
    expect(purpose).not.toMatch(/do not (?:yet )?send/i);
    expect(purpose).toMatch(/legal obligation/i);
    // Not a lookahead around "consented to": the disclaimer here reads "a
    // legal obligation rather than anything you consented to", so what
    // qualifies the phrase comes *before* it and no lookahead can see that.
    // The claim worth forbidding is consent offered as the basis, so forbid
    // that directly.
    expect(purpose).not.toMatch(/\b(?:with|on the basis of|because of) your consent\b|\bbecause you consented\b/i);
    expect(section("8")).toMatch(/legal obligations/i);
  });

  it("discloses the automated decision, which Article 13(2)(f) requires", () => {
    // Stripe's fraud check can decline a payment with no person involved. The
    // first draft described the signals and not the decision.
    const decision = claim(section("3"), /made automatically/);
    expect(decision).toMatch(/declined by it without a person looking/i);
    expect(section("3")).toMatch(/a person will look/i);
  });

  it("says what follows from refusing, which Article 13(2)(e) requires", () => {
    expect(claim(section("3"), /You do not have to give any of this/)).not.toBe("");
    expect(section("3")).toMatch(/you cannot buy anything here/i);
  });
});

describe("the address, once there is something to post", () => {
  it("says the checkout asks for it, and only when there is a parcel", () => {
    // **Mutation deleted this and the paragraph after it still read
    // plausibly** -- "That fourth is a delivery name..." with nothing to refer
    // back to. Article 13 requires the categories collected, and a policy that
    // describes a field without saying it is asked for has not given them.
    const s = section("3");
    expect(s).toMatch(/it asks for a fourth: where to send it/i);
    expect(s).toMatch(/asked for only when there is a parcel/i);
    expect(s).toMatch(/a certificate is never a parcel/i);
  });

  it("lists what the field actually collects", () => {
    // Measured against `shipping-address.ts`: name, line1, city, postcode, and
    // province in the four countries `PROVINCE_REQUIRED_COUNTRIES` names.
    const s = section("3");
    for (const part of ["delivery name", "street", "town", "postcode", "state or province"]) {
      expect(`${part}: ${String(s.includes(part))}`).toBe(`${part}: true`);
    }
  });

  it("keeps the promise LD-02 and LD-03 both made about the certificate", () => {
    // A postal address is the largest thing yet that must not appear on a
    // certificate, and the same sentence has now been made three times about
    // three different fields.
    expect(section("3")).toMatch(/none of it is printed on a certificate and none of it is published/i);
  });
});

describe("the payment record", () => {
  it("says Stripe's own billing details reach our database", () => {
    const record = claim(section("4"), /last four digits/);
    expect(record).not.toMatch(/\bnever\b/i);
    expect(section("4")).toMatch(/without ever passing through this site's code/i);
  });

  it("lists the email address and now the delivery name among what an order holds", () => {
    // Until C3b this said "There is no name and no email address on it". The
    // email half stopped being true when the checkout asked for an address to
    // send confirmations to; **the name half stopped being true when LD-04 P7
    // shipped a delivery-address block**, and this guard required the document
    // to keep saying it.
    //
    // What survives is the narrower claim, which is still true and is the one
    // a reader cares about: no billing name is ever asked for.
    const held = claim(section("4"), /An order record holds/);
    expect(held).toMatch(/the email address you gave/i);
    expect(held).toMatch(/delivery name and address you typed/i);
    expect(section("4")).not.toMatch(/there is no name on it/i);
    expect(section("4")).toMatch(/we never ask for your billing name/i);
    // And the correction is stated rather than made silently, because a
    // privacy notice that quietly starts holding a name is the thing a reader
    // would most want flagged.
    expect(section("4")).toMatch(/that was true until this shop began posting things/i);
    expect(section("4")).not.toMatch(/no name and no email address/i);
  });

  it("keeps the email address for as long as the order record, not silently longer", () => {
    expect(claim(section("8"), /so is your email address/i)).toMatch(/kept with it and for as long/i);
  });

  it("gives the payment details a retention period, not silence", () => {
    expect(claim(section("8"), /payment details/)).toMatch(/kept with it/i);
  });
});

describe("who else handles it", () => {
  it("names three processors and no more, and a carrier as its own case", () => {
    // **Two until LD-04 P11.** The opener counted, so adding Printful without
    // touching it would have left the document contradicting itself in its
    // own first sentence.
    const opener = claim(section("5"), /Three companies handle data/);
    expect(opener).toMatch(/these are all of them/i);
    expect(section("5")).not.toMatch(/two companies handle data/i);
    // Backblaze was named while holding nothing: the platform's backup jobs are
    // nine and none is this shop. Naming it was the Printful defect applied
    // inconsistently.
    expect(prose).not.toContain("Backblaze");
  });

  it("says Printful is a processor, and how that agreement was actually concluded", () => {
    // Its Data Processing Terms form part of the terms of service, so
    // acceptance on sign-up concludes the Article 28 agreement and there is
    // nothing countersigned. A document implying a signed contract would be
    // describing a thing that does not exist.
    const s = section("5");
    expect(s).toContain("Printful, Inc.");
    expect(s).toMatch(/acts on our instructions/i);
    expect(s).toMatch(/without anything having been signed separately/i);
    expect(s).toMatch(/does not use it to market to you/i);
  });

  it("names the one thing Printful does for itself, as it does for Stripe", () => {
    // Sanctions screening against lists its own law obliges it to apply. The
    // document already draws exactly this distinction for Stripe's fraud
    // check, and drawing it for one processor and not the other would be the
    // inconsistency the Backblaze finding was about.
    const s = section("5");
    expect(s).toMatch(/sanctions lists/i);
    expect(s).toMatch(/its legal obligation and not our instruction/i);
  });

  it("declines to classify the carrier, because Printful's terms do not", () => {
    // **The temptation is to write "carriers are sub-processors" and move on.**
    // Printful's data processing terms are silent -- the word does not appear
    // -- so either answer would be this document asserting something no source
    // supports, in the section whose whole claim is that it names only what is
    // in the path.
    const s = section("5");
    expect(s).toMatch(/do not say whether it treats a carrier/i);
    expect(s).toMatch(/not going to state a position its own documents do not support/i);
    // And it still says what the carrier gets, which is the part a reader
    // needs. Declining to classify is not declining to disclose.
    expect(s).toMatch(/a way to reach you if there is a problem/i);
  });

  it("says Stripe acts for itself on fraud, not only on our instructions", () => {
    // The first draft said no named company may use data for its own purposes,
    // three paragraphs after calling the fraud checks "Stripe's own
    // processing". Both cannot be true.
    expect(claim(section("5"), /acts on our instructions/)).not.toBe("");
    expect(section("5")).toMatch(/it acts for itself/i);
    expect(section("5")).toMatch(/we are not the only one responsible/i);
    expect(section("5")).toContain("stripe.com/privacy");
    expect(prose).not.toMatch(/may use it for its own purposes beyond the service/i);
  });

  it("says data is not sold, in a sentence that cannot be inverted quietly", () => {
    const selling = claim(section("5"), /sell data/);
    expect(selling).toMatch(/we do not sell data/i);
    expect(selling).toMatch(/share it for nobody's advertising/i);
  });
});

describe("where it goes", () => {
  it("states EEA processing without an exception clause", () => {
    const where = claim(section("7"), /European Economic Area/);
    expect(where).toMatch(/processed in the European Economic Area/i);
    expect(where).not.toMatch(NEGATED);
  });

  it("names the safeguards and how to get a copy, per Article 13(1)(f)", () => {
    expect(section("7")).toContain("EU–US Data Privacy Framework");
    expect(section("7")).toMatch(/standard contractual clauses/i);
    expect(claim(section("7"), /send you a copy/)).toContain("{merchantEmail}");
  });

  it("names no hosting provider", () => {
    // The operator's answer, and the sibling project's practice: roles, not
    // vendors, for the origin.
    for (const vendor of ["Hetzner", "AWS", "Amazon", "Vercel", "DigitalOcean", "Azure"]) {
      expect(`${vendor}: ${String(prose.includes(vendor))}`).toBe(`${vendor}: false`);
    }
  });
});

describe("bases and retention", () => {
  it("matches each basis to the purpose it belongs to", () => {
    // All three bases live in one paragraph, so locating the paragraph proves
    // nothing -- swapping them round leaves every phrase present and the
    // paragraph unchanged. Each purpose is bound to its basis in one string.
    const bases = claim(section("8"), /performance of a contract/);
    expect(bases).toContain("giving you what you paid for is performance of a contract");
    expect(bases).toContain("Keeping the accounting record, and confirming your order to you on a durable medium, are legal obligations");
    expect(bases).toMatch(/defending the site, and checking that a payment is not fraudulent, are our legitimate interests/);
  });

  it("runs the accounting period from the end of the financial year", () => {
    expect(claim(section("8"), /seven years/)).toMatch(/from the end of the financial year/i);
  });

  it("gives a period for every category, the log one now being measurable", () => {
    // Gate D established the number this row's predecessor said was unknowable:
    // the platform's Loki keeps 30 days, and its redaction stage drops secrets
    // rather than addresses. A criterion is no longer the honest answer.
    expect(claim(section("8"), /request lines/)).toMatch(/30 days/);
    expect(claim(section("8"), /cart cookie/)).toMatch(/ends with your browser session/i);
    expect(claim(section("8"), /if you write to us/i)).toMatch(/two years after the last message/i);
    expect(prose).not.toMatch(/as long as it is useful/i);
  });

  it("promises no deletion mechanism that does not exist", () => {
    // Nothing in either repository deletes or ages out an order. "We delete it
    // after that" would be a promise about a job nobody wrote; the gap is a
    // gate item instead.
    expect(prose).not.toMatch(/automatically (?:deleted|erased|purged)/i);
    expect(prose).not.toMatch(/\bwe (?:then )?delete (?:it|them|the record)\b/i);
  });
});

describe("rights and remedy", () => {
  it("lists the rights and names the Estonian authority", () => {
    const rights = section("9");
    for (const right of ["corrected", "deleted", "portable", "object"]) {
      expect(rights).toMatch(new RegExp(right, "i"));
    }
    expect(rights).toContain("Andmekaitse Inspektsioon");
    expect(rights).toContain("Tatari 39, 10134 Tallinn");
  });
});

describe("leaving the Area", () => {
  it("does not put Printful in the Data Privacy Framework, because it is not in it", () => {
    // **The edit this row would have got wrong from memory.** Stripe and
    // Cloudflare both participate, so the natural change is to add a third
    // name to that sentence. Printful's certification was withdrawn in 2021
    // and the Framework's own list records it inactive -- checked against
    // dataprivacyframework.gov rather than against Printful's own pages,
    // which is the only version of that check worth doing.
    // **Written first as "any sentence that says *participates*", and mutation
    // walked past it by writing *participate*.** A guard keyed to one
    // inflection is a guard against one spelling.
    //
    // The property instead: the phrase "Data Privacy Framework" names the
    // scheme Stripe and Cloudflare are in, and **no sentence may put Printful
    // in the same sentence as it**. The correction below says "that Framework"
    // precisely so it does not, which makes this checkable rather than a
    // matter of how the claim happens to be worded.
    const s = section("7");
    const together = s
      .split(/(?<=\.)\s+/)
      .filter((sentence) => /Data Privacy Framework/i.test(sentence) && /Printful/.test(sentence));
    expect(together).toEqual([]);
    expect(s).toMatch(/it does not participate in that Framework/i);
    expect(s).toMatch(/certification was withdrawn/i);
    expect(s).toMatch(/standard contractual clauses alone/i);
  });

  it("names where a parcel may be printed, and admits it cannot promise the Area", () => {
    // Printful routes automatically and the merchant cannot choose. A policy
    // saying data stays in the EEA, or implying it, would be false for most
    // destinations -- only Latvia and Spain of its facilities are inside.
    const s = section("7");
    for (const country of ["Latvia", "Spain", "United Kingdom", "Mexico", "Canada", "Brazil", "Japan", "Australia"]) {
      expect(`${country}: ${String(s.includes(country))}`).toBe(`${country}: true`);
    }
    expect(s).toMatch(/only Latvia and Spain are inside the European Economic Area/i);
    expect(s).toMatch(/not a choice either of us gets to make/i);
    expect(s).toMatch(/we cannot promise you a parcel printed inside the Area/i);
  });

  it("invents no retention period for a processor that publishes none", () => {
    // Printful publishes criteria and no number. §11's rule about figures
    // applies to one a reader would rely on as much as to one on the home
    // page.
    const s = section("8");
    expect(s).toMatch(/publishes no fixed period/i);
    expect(s).toMatch(/not going to invent one on its behalf/i);
  });
});

describe("the register", () => {
  it("is titled as brand.md §5 names the document", () => {
    // §4 names the footer entry "Privacy"; §5 names the document. The link
    // label and the title are allowed to differ, and V12 keeps §4's.
    expect(PRIVACY.title.toLowerCase()).toBe("privacy policy");
  });

  it("carries no exclamation mark and no flourish where it decides anything", () => {
    expect(prose).not.toContain("!");
    for (const number of ["6", "7", "8"]) {
      expect(section(number)).not.toMatch(/lousy|poor judgment|regrettab/i);
    }
  });

  it("describes no feature belonging to a slice that has not started", () => {
    // **"gift" was on this list until G7.** LD-03 built it, so the policy has
    // to describe it -- a privacy notice silent about a third party's address
    // it holds is the failure this guard was aimed at, pointing the other way.
    // Inverted below rather than deleted.
    // **Printful was on this list until LD-04 P11**, exactly as "gift" was
    // until G7, and it comes off for the same reason: the slice started, the
    // company is in the path, and a privacy notice silent about a processor
    // holding a buyer's address is the failure this guard was aimed at,
    // pointing the other way.
    for (const absent of ["t-shirt", "newsletter", "subscription"]) {
      expect(`${absent}: ${String(prose.toLowerCase().includes(absent.toLowerCase()))}`).toBe(`${absent}: false`);
    }
  });

  it("describes the recipient's data, because we hold it and they never gave it", () => {
    const gifts = section("6");

    // Article 14 applies precisely because the data did not come from the
    // person it is about, and the policy has to say so in those terms.
    expect(gifts).toContain("Article 14");
    expect(gifts).toMatch(/you did not give us your address/i);
    expect(gifts).toMatch(/the buyer typed it in/i);

    // Basis, retention and rights: the three a reader needs and the three a
    // notice most often omits.
    // **The basis, named.** A fable review found that simplifying this section
    // dropped "legitimate interest" from it, which broke two things at once:
    // Article 14(1)(c) wants the basis stated, and §8 says "§6 says so to them
    // directly" -- a claim about this document's own contents that had become
    // false. Naming it is also what tells the recipient Article 21 objection
    // is theirs.
    expect(gifts).toMatch(/because the buyer paid for you to have it/i);
    expect(gifts).toMatch(/legitimate interest/i);
    expect(gifts).toMatch(/you can object to/i);
    expect(gifts).toMatch(/seven years/i);
    expect(gifts).toMatch(/ask what we hold/i);

    // And the promise that makes the rest bearable.
    expect(gifts).toMatch(/will not write to you again/i);
  });

  it("gives the gift its basis in §8, beside the others", () => {
    // A basis stated only in the section addressed to the recipient would be
    // missing from the list a supervisory authority reads first.
    expect(section("8")).toMatch(/sending a gift certificate/i);
    expect(section("8")).toMatch(/not consent either/i);
  });

  it("keeps §8's claim about §6 true, since §8 makes one", () => {
    // §8 says "§6 says so to them directly". That is a statement about this
    // document's own contents, and it went false when §6 was simplified. A
    // cross-reference nothing checks is a cross-reference that rots.
    expect(section("8")).toContain("§6 says so to them directly");
    expect(section("6")).toMatch(/legitimate interest/i);
  });

  it("does not attribute the recipient's retention to the accounting law", () => {
    // **The correction a fable review forced.** Raamatupidamise seadus § 12
    // requires the source document; § 7 makes that the economic content --
    // parties, date, amounts. A recipient's address establishes none of it, so
    // no accounting obligation attaches to it. Claiming one would put the
    // processing on Article 6(1)(c), which defeats erasure under 17(3)(b) and
    // defeats objection -- overstating our own position against the person
    // with the least standing to argue.
    for (const number of ["6", "8"]) {
      const text = section(number);
      expect(text, number).not.toMatch(/accounting law (?:makes|requires) us to keep (?:your|their|a recipient)/i);
    }
    expect(section("6")).toMatch(/it cares about the money, not about you/i);
    expect(section("6")).toMatch(/if you ask us to remove your address/i);
    expect(section("8")).toMatch(/does not require knowing who the certificate went to/i);
  });
});
