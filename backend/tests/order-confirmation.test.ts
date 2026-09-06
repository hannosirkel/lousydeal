/**
 * The § 55 confirmation: what it must contain, and what it must refuse.
 *
 * **This is the document the publication gate has been waiting on.** VÕS
 * § 53(4) p 7¹ removes the right of withdrawal for digital content only where
 * three conditions are met, and the third is the trader's § 55(1)–(2)
 * confirmation on a durable medium. Four documents on the site currently say,
 * truthfully, that we do not send one.
 *
 * So these assertions are not about formatting. Each names a numbered duty and
 * fails if the confirmation stops discharging it — which is the only way a
 * later edit that shortens the email gets noticed before a buyer's rights do.
 *
 * **This file is the document; `order-placed-confirmation.test.ts` is the
 * sending.** Everything here drives `buildOrderConfirmation` directly, so a
 * subscriber that built the message and dropped it would pass all of it. That
 * is the other file's assertion to make, and it makes it by driving the
 * subscriber with a fake container.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { MerchantIdentity } from "../src/config/merchant";
import { MERCHANT_ENVIRONMENT_VARIABLES, readMerchantIdentity } from "../src/config/merchant";
import { CONFIRMATION_FORM_INTRO, CONFIRMATION_FORM_LINES } from "../src/content/confirmation";
import { buildOrderConfirmation, type ConfirmationDeal } from "../src/notifications/order-confirmation";

const MERCHANT: MerchantIdentity = {
  legalName: "Example Trader OÜ",
  address: "Example tn 1, 10000 Tallinn, Estonia",
  email: "trader@example.test",
  registryCode: "10000000",
  vatNumber: "EE100000000",
  phoneNumber: "+372 00 00000",
};

const DEAL: ConfirmationDeal = {
  serial: 4102,
  tier: "Lousy Deal Pro",
  total: "$25.00",
  issuedOn: "2026-09-06",
  certificateUrl: "https://lousydeal.example/done-deals/xbts2k3mmv3trv3n",
};

const SITE = "https://lousydeal.example";

const message = buildOrderConfirmation(DEAL, MERCHANT, SITE);
const text = message?.text ?? "";

describe("what § 55(2) requires it to carry", () => {
  it("says what this document is, in the terms the law uses", () => {
    // A buyer who later wants to exercise a right has to recognise the
    // document that carries it.
    expect(text).toMatch(/confirmation of your order, on a durable medium/i);
    expect(text).toMatch(/§ 55 of the Estonian Law of Obligations Act/);
  });

  it("gives § 54(1) p 4's main characteristics rather than linking to them", () => {
    // A web page is not a durable medium -- that is the whole reason this
    // email exists -- so the information is reproduced, not referenced.
    expect(text).toMatch(/numbered digital certificate/i);
    expect(text).toMatch(/confers no rights/i);
    expect(text).toMatch(/no account.*no software to install/i);
  });

  it("gives § 54(1) p 6's total, including that nothing was added", () => {
    expect(text).toContain("$25.00");
    expect(text).toMatch(/includes value added tax where value added tax applies/i);
    expect(text).toMatch(/nothing was added at checkout/i);
  });

  it("identifies the trader completely, which is § 54(1) pp 2-3 and Directive 2000/31/EC Art 5", () => {
    for (const value of Object.values(MERCHANT)) expect(text, value).toContain(value);
    expect(text).toMatch(/commercial register/i);
  });

  it("gives § 54(1) pp 12 and 13: the conditions, the period, and how to use it", () => {
    expect(text).toMatch(/within 14 days, without giving a reason/i);
    expect(text).toMatch(/§ 53\(4\) p 7¹/);
    expect(text).toMatch(/all three of these are true/i);
    // § 54(1) p 13¹ and § 56⁴: the button, at an address the reader can use.
    expect(text).toContain(`${SITE}/legal/withdraw`);
    // Not obliged to use the form -- § 56(2¹).
    expect(text).toMatch(/you are not obliged to use it/i);
  });

  it("records the consent as it was given, rather than asserting the buyer gave one", () => {
    // A confirmation that said "you consented" without saying to what would be
    // the trader's account of the buyer's state of mind.
    expect(text).toMatch(/a box that was not ticked for you/i);
    expect(text).toContain(
      "I request that supply of the digital certificate begin immediately, and I acknowledge that I will lose my right of withdrawal once supply has begun.",
    );
  });

  it("gives § 54(1) p 18's complaints route, with the limit the buyer should know first", () => {
    expect(text).toMatch(/Consumer Disputes Committee/);
    expect(text).toMatch(/at least 30 euros/);
    expect(text).toMatch(/European Consumer Centre/);
  });

  it("names the certificate it confirms, by serial and by address", () => {
    expect(message?.subject).toContain("#4,102");
    expect(text).toContain("#4,102");
    expect(text).toContain(DEAL.certificateUrl);
    expect(text).toContain("Lousy Deal Pro");
  });
});

describe("what it does not claim", () => {
  it("does not tell the buyer their right of withdrawal is gone", () => {
    // Sending this is what makes the third condition capable of being met.
    // Whether it *was* met for a given order depends on facts this email
    // cannot settle, and a sentence asserting the right had lapsed would be
    // the trader deciding a question in its own favour.
    expect(text).not.toMatch(/you have lost|no longer have|your right has (?:now )?ended|you waived/i);
    expect(text).not.toMatch(/cannot withdraw/i);
  });

  it("leaves no unresolved placeholder anywhere", () => {
    // A token that reaches a reader is a defect that looks like a joke, and on
    // a legal document it is neither.
    expect(text).not.toMatch(/\{[a-zA-Z]+\}/);
    expect(message?.html).not.toMatch(/\{[a-zA-Z]+\}/);
    expect(message?.subject).not.toMatch(/\{[a-zA-Z]+\}/);
  });
});

describe("the model withdrawal form", () => {
  it("is reproduced, not mentioned", () => {
    // § 54(1) p 13 requires the trader to *give* the form.
    expect(text).toContain(CONFIRMATION_FORM_INTRO);
    expect(text).toMatch(/I\/We \(\*\) hereby give notice/);
    expect(text).toMatch(/\(\*\) Delete as appropriate\./);
  });

  it("is word for word the form the site's Refunds document carries", () => {
    // Directive 2011/83/EU Annex I(B) fixes the wording, and there is no
    // package shared between the two workspaces -- so the two copies are
    // compared here. Two copies of a statutory text that disagree is worse
    // than either.
    const refunds = readFileSync(
      join(__dirname, "..", "..", "storefront", "src", "content", "legal", "refunds.ts"),
      "utf8",
    );

    expect(refunds).toContain(CONFIRMATION_FORM_INTRO);
    for (const line of CONFIRMATION_FORM_LINES) {
      // The storefront's file writes typographic quotes in prose but the form
      // lines carry none; compared verbatim.
      expect(refunds, line).toContain(line);
    }
  });
});

describe("an incomplete trader identity", () => {
  it("yields no message at all rather than one with a gap in it", () => {
    // The storefront renders `[LEGAL NAME NOT CONFIGURED]` on a page, which is
    // right there: saying "this is missing" beats a blank and the reader can
    // come back. An email cannot be corrected once sent, and § 55(2) is not
    // satisfied by a confirmation that names no trader.
    expect(buildOrderConfirmation(DEAL, null, SITE)).toBeNull();
  });

  it("is what a partially configured environment produces", () => {
    // The reader answers `null` for *any* missing field, not only for an empty
    // environment -- so a deployment Orange patched with five of six values
    // sends nothing rather than something deficient.
    const complete = Object.fromEntries(
      Object.entries(MERCHANT_ENVIRONMENT_VARIABLES).map(([field, name]) => [
        name,
        MERCHANT[field as keyof MerchantIdentity],
      ]),
    );

    expect(readMerchantIdentity(complete)).toEqual(MERCHANT);
    for (const name of Object.values(MERCHANT_ENVIRONMENT_VARIABLES)) {
      const partial = { ...complete };
      delete partial[name];
      expect(readMerchantIdentity(partial), name).toBeNull();
    }
    expect(readMerchantIdentity({})).toBeNull();
  });
});

describe("both bodies", () => {
  it("carries a text body and an HTML one, because a medium the reader cannot read is not durable", () => {
    expect(text.length).toBeGreaterThan(1000);
    expect(message?.html).toMatch(/^<!doctype html>/);
    expect(message?.html).toContain("</html>");
  });

  it("escapes what it puts in the HTML body", () => {
    // The trader identity is configuration rather than buyer text, so this is
    // not the injection boundary the inscription is -- but an ampersand in a
    // company name would break the markup, and a company name with an
    // ampersand is ordinary.
    const awkward = buildOrderConfirmation(DEAL, { ...MERCHANT, legalName: 'Smith & Sons <"OÜ">' }, SITE);

    expect(awkward?.html).toContain("Smith &amp; Sons &lt;&quot;OÜ&quot;&gt;");
    expect(awkward?.html).not.toContain('<"OÜ">');
    // The text body is the authoritative one and carries it unescaped.
    expect(awkward?.text).toContain('Smith & Sons <"OÜ">');
  });

  it("says the same things in both", () => {
    // An HTML body that quietly dropped a section would be the version most
    // readers see, and the text body would still pass every assertion above.
    for (const fragment of ["§ 55", "14 days", "Consumer Disputes Committee", "#4,102", "$25.00"]) {
      expect(message?.html, fragment).toContain(fragment);
    }
  });
});
