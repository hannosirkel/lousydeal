/**
 * Holds the Privacy Policy to what the code actually does.
 *
 * The structural guarantees are `no-unresolved-placeholder.test.ts`'s. The
 * claims about third parties are `third-party-disclosure.test.ts`'s, and the
 * cookie is `browser-storage-disclosure.test.ts`'s — both check the document
 * against the source rather than against itself, which is the only kind of
 * assertion worth making about a privacy notice.
 *
 * What is left here is the substance a scan cannot reach: the lawful bases, the
 * retention periods, the transfers, and the three disclosures a template would
 * have omitted.
 *
 * **Every fact in this document was measured at `5d13aa4`.** The first survey
 * of the data flows ran against a checkout ten commits behind `main` and
 * reported that the certificate, the inscription filter and five routes did not
 * exist. Nothing here rests on it.
 */

import { describe, expect, it } from "vitest";

import { PRIVACY } from "../src/content/legal/privacy";

const prose = PRIVACY.sections.flatMap((s) => s.body).join("\n");

const section = (number: string) => {
  const found = PRIVACY.sections.find((candidate) => candidate.number === number);
  if (found === undefined) throw new Error(`Privacy has no §${number}`);
  return found.body.join("\n");
};

describe("the controller", () => {
  it("is named through decision 004's resolver, not written in", () => {
    expect(section("1")).toContain("{merchantLegalName}");
    expect(section("1")).toContain("{merchantAddress}");
    expect(section("1")).toContain("{merchantRegistryCode}");
  });
});

describe("the three disclosures a template would have missed", () => {
  it("discloses Stripe's fraud signals, which are on by default", () => {
    // `loadStripe` is called without `setLoadParameters`, so
    // `advancedFraudSignals` defaults to active. It is the closest thing to
    // tracking on this site and the only device-level processing there is.
    expect(section("3")).toMatch(/signals about the device and browser/i);
    expect(section("3")).toMatch(/detect fraud/i);
  });

  it("discloses that the request log holds an IP address", () => {
    // Medusa installs morgan; `LOG_LEVEL` is set nowhere so it defaults to
    // `http`; `trust proxy` is on, so the address logged is the visitor's own.
    // Real processing, and invisible unless someone reads the installed code.
    expect(section("2")).toMatch(/your IP address/i);
    expect(section("2")).toMatch(/the page you came from/i);
    expect(section("2")).toMatch(/not sent to anyone/i);
  });

  it("discloses that Stripe's own billing details reach our database", () => {
    // Medusa retrieves the PaymentIntent with `expand: ["payment_method"]` and
    // writes the result into `payment.data`. So details typed into Stripe's
    // frame land here, having never passed through this site's code -- the one
    // thing in the whole system a buyer could not possibly predict.
    expect(section("4")).toMatch(/last four digits/i);
    expect(section("4")).toMatch(/without ever passing through this site's code/i);
  });
});

describe("what is not collected", () => {
  it("says so, because it is the unusual fact about this shop", () => {
    // Two fields: a country select and the consent checkbox. Measured.
    expect(section("3")).toMatch(/two things/i);
    expect(section("3")).toMatch(/We do not ask for your name, your address, your telephone number or your email address/i);
    expect(section("3")).toMatch(/nowhere on this site to type them/i);
  });

  it("says an order carries no name and no email", () => {
    expect(section("4")).toMatch(/no name and no email address on it/i);
  });

  it("explains what that costs a data subject exercising a right", () => {
    // Holding nothing identifying is good for privacy and awkward for access
    // requests. A notice that gives rights without saying how to be found is
    // giving less than it appears to.
    expect(section("8")).toMatch(/identified by its number/i);
  });
});

describe("consent, and why there is none to give", () => {
  it("says nothing here runs on consent, and asks for none", () => {
    // One strictly necessary cookie and no measurement of any kind. A banner
    // would be theatre, and a notice describing one would be false.
    expect(section("2")).toMatch(/nothing to consent to and so you are not asked/i);
    expect(section("7")).toMatch(/Nothing on this site runs on consent/i);
    expect(prose).not.toMatch(/cookie banner|consent (?:banner|manager)|manage (?:your )?preferences/i);
  });

  it("gives a lawful basis for each thing that happens", () => {
    const bases = section("7");
    expect(bases).toMatch(/performance of a contract/i);
    expect(bases).toMatch(/legal obligation/i);
    expect(bases).toMatch(/legitimate interests?/i);
  });
});

describe("retention", () => {
  it("runs the accounting period from the end of the financial year", () => {
    // Not from the order. The sibling project's wording, which is the Estonian
    // rule; an earlier draft of this row had it running from the order date.
    expect(section("7")).toMatch(/seven years from the end of the financial year/i);
  });

  it("gives a period or a criterion for every category it describes", () => {
    const retention = section("7");
    expect(retention).toMatch(/cart cookie ends with your browser session/i);
    expect(retention).toMatch(/two years after the last message/i);
    // Article 13(2)(a) permits a criterion where a period cannot honestly be
    // given. Nothing in either repository ships or archives the request log,
    // but the platform it runs on is a third repository outside this work, so
    // naming a number would assert something not established.
    expect(retention).toMatch(/as long as it is useful for operating and defending the site/i);
  });

  it("promises no deletion mechanism that does not exist", () => {
    // Nothing in either repository deletes or ages out anything; the only
    // expiry that runs is the cookie. The seven-year obligation is real and
    // nothing has reached it, so stating it is not a false claim -- but
    // "we delete it after that" would be a promise about a job nobody wrote.
    // The gap is a build item in the plan, not a sentence here.
    expect(prose).not.toMatch(/\bwe (?:then )?delete (?:it|them|the record)\b/i);
    expect(prose).not.toMatch(/automatically (?:deleted|erased|purged)/i);
  });
});

describe("where it goes", () => {
  it("states EEA processing and the transfers out of it", () => {
    expect(section("6")).toMatch(/processed in the European Economic Area/i);
    expect(section("6")).toContain("EU–US Data Privacy Framework");
    expect(section("6")).toMatch(/standard contractual clauses/i);
  });

  it("names no hosting provider", () => {
    // The operator's answer, and the sibling project's practice: roles, not
    // vendors, for the origin. A provider named in a public repository is a
    // permanent disclosure about infrastructure that AGENTS.md keeps out.
    for (const vendor of ["Hetzner", "AWS", "Amazon", "Vercel", "DigitalOcean", "Azure"]) {
      expect(`${vendor}: ${String(prose.includes(vendor))}`).toBe(`${vendor}: false`);
    }
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
  it("carries no exclamation mark and no flourish where it decides anything", () => {
    expect(prose).not.toContain("!");
    for (const number of ["6", "7", "8"]) {
      expect(section(number)).not.toMatch(/lousy|poor judgment|regrettab/i);
    }
  });

  it("describes no feature belonging to a slice that has not started", () => {
    // Gifting is LD-03, merch is LD-04, and the order email is LD-02. A
    // processor listed for a flow nobody can reach describes processing that
    // does not happen.
    for (const absent of ["gift", "t-shirt", "newsletter", "subscription", "Printful"]) {
      expect(`${absent}: ${String(prose.toLowerCase().includes(absent.toLowerCase()))}`).toBe(`${absent}: false`);
    }
  });
});
