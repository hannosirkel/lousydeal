/**
 * The § 56⁴(4) receipt: what it must say, and what it must not.
 *
 * The duty is to acknowledge receipt without delay on a durable medium. It is
 * not an occasion to assess the withdrawal, and the two things this file spends
 * most of its assertions on are the ones where a trader would be tempted to:
 * qualifying the refund, and deciding whether the right applied.
 */

import { describe, expect, it } from "vitest";

import type { MerchantIdentity } from "../src/config/merchant";
import {
  buildWithdrawalReceipt,
  receivedOn,
  WITHDRAWAL_RECEIPT_NEXT,
  WITHDRAWAL_RECEIPT_SUBJECT,
  type WithdrawalRecord,
} from "../src/notifications/withdrawal-receipt";

const MERCHANT: MerchantIdentity = {
  legalName: "Example Trader OÜ",
  address: "Example Street 1, Tallinn",
  email: "legal@example.test",
  phoneNumber: "+372 5555 0100",
  registryCode: "12345678",
  vatNumber: "EE123456789",
};

const RECORD: WithdrawalRecord = {
  consumerName: "A. Consumer",
  contractDetails: "Order 4102, bought on Tuesday",
  contactAddress: "buyer@example.test",
  receivedAt: "2026-09-07T11:42:07Z",
};

const SITE = "https://example.test";
const build = (audience: "consumer" | "trader" = "consumer") =>
  buildWithdrawalReceipt(RECORD, MERCHANT, SITE, audience);

describe("what the receipt confirms", () => {
  it("acknowledges receipt and cites the provision that requires it", () => {
    const message = build();
    expect(message?.subject).toBe(WITHDRAWAL_RECEIPT_SUBJECT);
    expect(message?.text).toContain("§ 56⁴(4)");
    expect(message?.text).toMatch(/we received your withdrawal/i);
  });

  it("quotes back all three § 56⁴(2) fields and the time it arrived", () => {
    // The consumer has to be able to check that what we hold is what they
    // sent, and § 56(2⁵) makes this their evidence.
    const text = build()?.text ?? "";
    expect(text).toContain(RECORD.consumerName);
    expect(text).toContain(RECORD.contractDetails);
    expect(text).toContain(RECORD.contactAddress);
    expect(text).toContain("2026-09-07 11:42 UTC");
  });

  it("names the zone rather than leaving an offset to work out", () => {
    // An offset the consumer has to compute is one they can get wrong in the
    // trader's favour, against their own 14 days.
    expect(receivedOn("2026-09-07T11:42:07Z")).toBe("2026-09-07 11:42 UTC");
    expect(receivedOn("2026-01-01T00:00:00Z")).toBe("2026-01-01 00:00 UTC");
  });

  it("states § 56(2¹), so the buyer knows the date that counts is theirs", () => {
    expect(build()?.text).toContain("§ 56(2¹)");
    expect(build()?.text).toMatch(/took effect when you sent it/i);
  });
});

describe("what it must not do", () => {
  it("carries no condition on the refund", () => {
    // The same rule `storefront/tests/legal-consistency.test.ts` holds the
    // Refunds document to: § 56¹(1) admits no qualifier, and § 62 voids any
    // agreement departing from these provisions to the consumer's detriment.
    // A message repeating the promise may not add one either.
    const promise = WITHDRAWAL_RECEIPT_NEXT.join(" ");
    expect(promise).toContain("§ 56¹(1)");
    expect(promise).toContain("§ 56¹(4)");
    expect(promise).not.toMatch(/\b(?:provided|only if|so long as|as long as|except where|on condition)\b/i);
    // "unless" has one legitimate use here, the § 56¹(4) choice of means.
    for (const match of promise.matchAll(/\bunless\b(.{0,40})/gi)) {
      expect(match[1]).toMatch(/expressly ask/i);
    }
  });

  it("does not decide whether the right applied", () => {
    // § 56⁴(4) is a duty to acknowledge. A receipt that argued about the 14
    // days, or about § 53(4) p 7¹, would be the trader answering in its own
    // favour the question two legal documents decline to answer.
    for (const audience of ["consumer", "trader"] as const) {
      const text = build(audience)?.text ?? "";
      expect(text).not.toMatch(/§ 53\(4\) p 7¹/);
      expect(text).not.toMatch(/\b(?:not entitled|no longer entitled|too late|out of time|does not apply to you)\b/i);
    }
  });

  it("does not ask why", () => {
    const text = build()?.text ?? "";
    expect(text).toMatch(/do not have to give a reason/i);
    expect(text).not.toMatch(/\bwhy did you\b|\breason for\b/i);
  });
});

describe("the two copies", () => {
  it("says the same things to both, so nobody works from a different account", () => {
    const consumer = build("consumer")?.text ?? "";
    const trader = build("trader")?.text ?? "";
    for (const fact of [RECORD.consumerName, RECORD.contractDetails, "2026-09-07 11:42 UTC", "§ 56¹(1)"]) {
      expect(consumer).toContain(fact);
      expect(trader).toContain(fact);
    }
  });

  it("tells the trader's copy that it is the record", () => {
    // LD-02 adds no withdrawal table. If this copy is not sent, nothing that
    // can act on the withdrawal holds it.
    const trader = build("trader")?.text ?? "";
    expect(trader).toMatch(/this copy is the record/i);
    expect(trader).toContain(SITE);
    expect(build("consumer")?.text).not.toMatch(/this copy is the record/i);
  });
});

describe("the trader identity", () => {
  it("reproduces it, because a receipt from nobody confirms nothing", () => {
    const text = build()?.text ?? "";
    for (const value of Object.values(MERCHANT)) expect(text).toContain(value);
  });

  it("returns null rather than a receipt naming no trader", () => {
    // The same choice `buildOrderConfirmation` makes: one visibly not sent is
    // recoverable, one sent badly is not. The route still tells the consumer
    // their withdrawal was received -- § 56(2¹) settles that independently.
    expect(buildWithdrawalReceipt(RECORD, null, SITE)).toBeNull();
  });

  it("does not treat what the consumer typed as a placeholder", () => {
    // The resolver runs over this file's own template lines, never over the
    // three free-text fields. A name containing `{merchantEmail}` must arrive
    // as those characters -- resolving it would let a stranger's input reach
    // into the trader identity, and throwing on it would mean a receipt the
    // statute requires never went because somebody typed a brace.
    const message = buildWithdrawalReceipt({ ...RECORD, consumerName: "{merchantEmail}" }, MERCHANT, SITE);
    expect(message?.text).toContain("Name: {merchantEmail}");
    expect(message?.text).not.toContain("Name: legal@example.test");
  });

});

describe("the HTML half", () => {
  it("says what the text says, since most readers see only one of them", () => {
    const message = build();
    expect(message?.html).toContain("§ 56⁴(4)");
    expect(message?.html).toContain("§ 56¹(1)");
    expect(message?.html).toContain("2026-09-07 11:42 UTC");
  });

  it("escapes what the consumer typed", () => {
    // These three fields are free text from a stranger and land in an HTML
    // body. `<` is the one that matters.
    const message = buildWithdrawalReceipt(
      { ...RECORD, consumerName: '<script>alert("x")</script>' },
      MERCHANT,
      SITE,
    );
    expect(message?.html).not.toContain("<script>");
    expect(message?.html).toContain("&lt;script&gt;");
  });
});
