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

  it("says what the email address is for, and does not claim the confirmation is sent", () => {
    // C3b collects the address; C9 sends the confirmation. Between the two, a
    // notice implying otherwise would be the first surface on this site to
    // say the s 55 duty is discharged -- `legal-consistency.test.ts` holds
    // the other six to the same line.
    const purpose = claim(section("3"), /order confirmation we owe you/);
    expect(purpose).toMatch(/do not yet send/i);
    expect(purpose).not.toMatch(/\bwe send you\b/i);
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

describe("the payment record", () => {
  it("says Stripe's own billing details reach our database", () => {
    const record = claim(section("4"), /last four digits/);
    expect(record).not.toMatch(/\bnever\b/i);
    expect(section("4")).toMatch(/without ever passing through this site's code/i);
  });

  it("lists the email address among what an order holds, and still no name", () => {
    // Until C3b this said "There is no name and no email address on it". The
    // email half stopped being true the moment the checkout asked for one;
    // the name half did not, and is asserted here rather than quietly dropped
    // with it.
    const held = claim(section("4"), /An order record holds/);
    expect(held).toMatch(/the email address you gave/i);
    expect(held).toMatch(/no name on it/i);
    expect(section("4")).not.toMatch(/no name and no email address/i);
  });

  it("keeps the email address for as long as the order record, not silently longer", () => {
    expect(claim(section("7"), /so is your email address/i)).toMatch(/kept with it and for as long/i);
  });

  it("gives the payment details a retention period, not silence", () => {
    expect(claim(section("7"), /payment details/)).toMatch(/kept with it/i);
  });
});

describe("who else handles it", () => {
  it("names two processors and no more", () => {
    const opener = claim(section("5"), /Two companies handle data/);
    expect(opener).toMatch(/these are both of them/i);
    // Backblaze was named while holding nothing: the platform's backup jobs are
    // nine and none is this shop. Naming it was the Printful defect applied
    // inconsistently.
    expect(prose).not.toContain("Backblaze");
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
    const where = claim(section("6"), /European Economic Area/);
    expect(where).toMatch(/processed in the European Economic Area/i);
    expect(where).not.toMatch(NEGATED);
  });

  it("names the safeguards and how to get a copy, per Article 13(1)(f)", () => {
    expect(section("6")).toContain("EU–US Data Privacy Framework");
    expect(section("6")).toMatch(/standard contractual clauses/i);
    expect(claim(section("6"), /send you a copy/)).toContain("{merchantEmail}");
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
    const bases = claim(section("7"), /performance of a contract/);
    expect(bases).toContain("giving you what you paid for is performance of a contract");
    expect(bases).toContain("Keeping the accounting record, and confirming your order to you on a durable medium, are legal obligations");
    expect(bases).toMatch(/defending the site, and checking that a payment is not fraudulent, are our legitimate interests/);
  });

  it("runs the accounting period from the end of the financial year", () => {
    expect(claim(section("7"), /seven years/)).toMatch(/from the end of the financial year/i);
  });

  it("gives a period for every category, the log one now being measurable", () => {
    // Gate D established the number this row's predecessor said was unknowable:
    // the platform's Loki keeps 30 days, and its redaction stage drops secrets
    // rather than addresses. A criterion is no longer the honest answer.
    expect(claim(section("7"), /request lines/)).toMatch(/30 days/);
    expect(claim(section("7"), /cart cookie/)).toMatch(/ends with your browser session/i);
    expect(claim(section("7"), /if you write to us/i)).toMatch(/two years after the last message/i);
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
    const rights = section("8");
    for (const right of ["corrected", "deleted", "portable", "object"]) {
      expect(rights).toMatch(new RegExp(right, "i"));
    }
    expect(rights).toContain("Andmekaitse Inspektsioon");
    expect(rights).toContain("Tatari 39, 10134 Tallinn");
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
    for (const absent of ["gift", "t-shirt", "newsletter", "subscription", "Printful"]) {
      expect(`${absent}: ${String(prose.toLowerCase().includes(absent.toLowerCase()))}`).toBe(`${absent}: false`);
    }
  });
});
