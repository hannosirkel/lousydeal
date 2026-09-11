/**
 * The gift message, and the one line the buyer's confirmation gains.
 *
 * **Most of this file is about what the gift message must not contain.** The
 * recipient did not buy anything, and LD-03's constraint 5 is that they get a
 * certificate and not a contract. The failure mode is not a missing sentence —
 * it is a later edit "improving" this message by copying a section across from
 * the confirmation, at which point a stranger is told about a right they do not
 * hold and invited to try to exercise it.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { MerchantIdentity } from "../src/config/merchant";
import { CONFIRMATION_CONSENT, CONFIRMATION_FORM_INTRO, CONFIRMATION_WITHDRAWAL } from "../src/content/confirmation";
import { GIFT_OPENING, GIFT_SUBJECT } from "../src/content/gift";
import { buildGiftMessage, type GiftMessageInput } from "../src/notifications/gift-message";
import { buildOrderConfirmation } from "../src/notifications/order-confirmation";

const MERCHANT: MerchantIdentity = {
  legalName: "Example Trader OÜ",
  address: "Example Street 1, Tallinn",
  email: "legal@example.test",
  phoneNumber: "+372 5555 0100",
  registryCode: "12345678",
  vatNumber: "EE123456789",
};

const GIFT: GiftMessageInput = {
  serial: 4102,
  total: "$25.00",
  issuedOn: "2026-09-07",
  certificateUrl: "https://lousydeal.example/done-deals/xbts2k3mmv3trv3n",
  recipientName: "A. Recipient",
  senderName: "A. Buyer",
  message: "Happy birthday",
};

const SITE = "https://lousydeal.example";

const build = (overrides: Partial<GiftMessageInput> = {}) =>
  buildGiftMessage({ ...GIFT, ...overrides }, MERCHANT, SITE);

describe("what the recipient reads", () => {
  it("opens with the premise, and states the amount", () => {
    // Settled by the operator on 2026-09-07 against §6's own suggestion. It is
    // the product's whole joke and the recipient is the person it is on; a
    // gift message that hid the price would be protecting the buyer from a
    // punchline they paid for.
    // Against the unpersonalised build: with a recipient name the sentence is
    // joined to the greeting and its first letter lower-cased, which the test
    // below covers.
    expect(build({ recipientName: null })?.text).toContain("Someone spent $25.00 on absolutely nothing for you.");
    expect(build()?.text).toContain("A. Recipient — someone spent $25.00 on absolutely nothing for you.");
    expect(GIFT_OPENING).toContain("{amount}");
  });

  it("carries the certificate, its number and its date", () => {
    const text = build()?.text ?? "";
    expect(text).toContain("https://lousydeal.example/done-deals/xbts2k3mmv3trv3n");
    expect(text).toContain("#4,102");
    expect(text).toContain("2026-09-07");
  });

  it("quotes the buyer's message and attributes it when there is a name", () => {
    expect(build()?.text).toContain("“Happy birthday” — A. Buyer");
  });

  it("quotes it unattributed when the buyer gave no name", () => {
    // Scoped to the quoted section: the greeting line carries its own dash
    // when the recipient is named, so asserting the whole message has none
    // would be asserting something else.
    const text = build({ senderName: null })?.text ?? "";
    const said = text.slice(text.indexOf("THEY SAID"), text.indexOf("WHAT IT IS"));
    expect(said).toContain("“Happy birthday”");
    expect(said).not.toContain("—");
  });

  it("omits the section entirely when there is no message", () => {
    // An empty "They said" heading over nothing would tell the recipient a
    // message existed and was lost.
    const text = build({ message: null })?.text ?? "";
    expect(text).not.toContain("THEY SAID");
    expect(text).not.toContain("“”");
  });

  it("greets the recipient by name without shouting it", () => {
    // Headings are upper-cased in the text part. Putting a name there would
    // print `MCDONALD`, so the name is in the first body line instead and the
    // heading stays impersonal.
    const text = build()?.text ?? "";
    expect(text).toContain("A. Recipient — someone spent $25.00");
    expect(text).not.toContain("A. RECIPIENT");
    expect(build({ recipientName: null })?.text).toContain("Someone spent $25.00");
  });

  it("names the sender in the subject, because an unattributed message gets deleted", () => {
    expect(GIFT_SUBJECT("A. Buyer")).toBe("A. Buyer bought you a lousy deal");
    expect(GIFT_SUBJECT(null)).toBe("Somebody bought you a lousy deal");
  });

  it("says why we have their address, and that we will not write again", () => {
    // The one piece of personal data in this slice that its subject never gave
    // us. G7 states the Article 14 position; this is the sentence a recipient
    // actually reads.
    const text = build()?.text ?? "";
    expect(text).toMatch(/we have your address because the person who bought this typed it in/i);
    expect(text).toMatch(/not going to write to you again/i);
  });
});

describe("the Article 14 notice G7 added", () => {
  it("names the controller, which G4 shipped without", () => {
    // `buildGiftMessage` took the trader identity and used it only as a
    // null-guard, so the message went out unsigned. Article 14(1)(a) wants the
    // controller's identity, and an unsigned message also simply reads like
    // spam.
    const text = build()?.text ?? "";
    for (const value of [MERCHANT.legalName, MERCHANT.address, MERCHANT.email, MERCHANT.registryCode]) {
      expect(text, value).toContain(value);
    }
  });

  it("does not claim to hold a name the buyer never gave", () => {
    // §6 makes the recipient's name optional, so the notice cannot say "we
    // have your name and address" flatly -- when the buyer left it blank the
    // message asserts holding data we do not hold, which is Article 14(1)(d)
    // wrong in the trader's own document. Found by a fable review.
    const text = build({ recipientName: null })?.text ?? "";
    expect(text).toMatch(/we have your address, and your name if they gave one/i);
    expect(text).not.toMatch(/we have your name and address/i);
  });

  it("says where the address came from and that it is used once", () => {
    const text = build()?.text ?? "";
    expect(text).toMatch(/the person who bought this typed them in/i);
    expect(text).toMatch(/not going to write to you again/i);
  });

  it("points at the policy for the rest, which Article 12(1) permits", () => {
    // The full Article 14(1)-(2) list is longer than this message should be.
    // Whether a link discharges it is §23's question; the position is stated
    // rather than assumed.
    expect(build()?.text).toContain(`${SITE}/legal/privacy`);
  });

  it("tells the recipient how to object, in the message itself", () => {
    expect(build()?.text).toMatch(/ask what we hold|corrected or deleted|object/i);
    expect(build()?.text).toContain(MERCHANT.email);
  });
});

describe("what the recipient must not read", () => {
  it("recites no right of withdrawal, because they hold none", () => {
    // LD-03's constraint 5. Telling a stranger about a right they do not have
    // is worse than saying nothing: it invites them to try to exercise it.
    const text = build()?.text ?? "";
    for (const line of CONFIRMATION_WITHDRAWAL(false)) {
      expect(text).not.toContain(line);
    }
    expect(text).not.toMatch(/14[- ]day|§ 56|§ 53\(4\)|withdraw/i);
  });

  it("carries no model withdrawal form", () => {
    expect(build()?.text).not.toContain(CONFIRMATION_FORM_INTRO);
  });

  it("carries no consent recital, because the recipient consented to nothing", () => {
    for (const line of CONFIRMATION_CONSENT(false)) {
      expect(build()?.text).not.toContain(line);
    }
  });

  it("does not claim to be the § 55 confirmation", () => {
    // That document is the buyer's and says so in its own opening. Two
    // messages both claiming to be it would make the real one harder to
    // identify, which is the opposite of what § 55 is for.
    expect(build()?.text).not.toMatch(/§ 55|durable medium|Law of Obligations/i);
  });

  it("offers nothing to buy, because §6 asks for a gift flow and not a growth loop", () => {
    const text = build()?.text ?? "";
    expect(text).not.toMatch(/discount|refer|invite|coupon|buy (?:one|your own)|shop now/i);
  });
});

describe("what counts as a gift at send time", () => {
  it("treats a missing recipient the same as an absent one", () => {
    // The subscriber reads `deal.gift_recipient_email` off the row. The column
    // is nullable, so `null` is the ordinary no-gift value -- but a store that
    // projects a narrower row hands back `undefined`, and a `=== null` check
    // would send a gift message for an order that was not one. The subscriber
    // narrows on `typeof`; this records why.
    const source = readFileSync(
      join(__dirname, "..", "src", "subscribers", "order-placed.ts"),
      "utf8",
    );
    expect(source).toContain('typeof recipient !== "string"');
    expect(source).not.toMatch(/const recipient = deal\.gift_recipient_email;\s*\n\s*if \(recipient === null\)/);
  });
});

describe("the trader identity", () => {
  it("returns null rather than a message from nobody", () => {
    // One step past `buildOrderConfirmation`'s reason: a message from nobody,
    // to somebody who did not ask for it, naming no trader, is what a spam
    // filter is for.
    expect(buildGiftMessage(GIFT, null, SITE)).toBeNull();
  });
});

describe("the HTML half", () => {
  it("says what the text says", () => {
    expect(build({ recipientName: null })?.html).toContain("Someone spent $25.00 on absolutely nothing for you.");
    expect(build()?.html).toContain("A. Recipient — someone spent $25.00");
    expect(build()?.html).toContain("https://lousydeal.example/done-deals/xbts2k3mmv3trv3n");
  });

  it("escapes what the buyer typed", () => {
    // Two free-text fields from one stranger, landing in an HTML body sent to
    // another. `readGift` already removed markup; this is the second pass, and
    // the one that would matter if the first were ever loosened.
    const message = build({ message: '<script>alert("x")</script>', senderName: "<b>A</b>" });
    expect(message?.html).not.toContain("<script>");
    expect(message?.html).toContain("&lt;script&gt;");
    expect(message?.html).not.toContain("<b>A</b>");
  });
});

describe("the buyer's confirmation", () => {
  const confirmationFor = (giftRecipientAddress: string | null) =>
    buildOrderConfirmation(
      {
        serial: 4102,
        merchandise: [],
        tier: "Lousy Deal Pro",
        total: "$25.00",
        issuedOn: "2026-09-07",
        certificateUrl: "https://lousydeal.example/done-deals/xbts2k3mmv3trv3n",
        giftRecipientAddress,
      },
      MERCHANT,
      "https://lousydeal.example",
    );

  it("gains a line naming where the certificate went", () => {
    // The buyer's own input read back to them, so a mistyped address is
    // catchable while it still matters.
    const text = confirmationFor("recipient@example.test")?.text ?? "";
    expect(text).toContain("recipient@example.test");
    expect(text).toMatch(/you bought this as a gift/i);
  });

  it("loses nothing, because § 55(2) does not care that the order was a gift", () => {
    // A confirmation that became a gift message because the buyer ticked a box
    // would breach § 55(2). The gift line is additive and this proves it: every
    // section present without a gift is present with one.
    const plain = confirmationFor(null)?.text ?? "";
    const gifted = confirmationFor("recipient@example.test")?.text ?? "";

    // Compared against the *rendered* confirmation rather than the raw
    // constants: `CONFIRMATION_WITHDRAWAL` carries `{siteBaseUrl}` tokens that
    // the builder resolves, so a raw comparison would fail on the placeholder
    // rather than on a missing section.
    for (const heading of ["YOUR RIGHT OF WITHDRAWAL", "WHAT YOU AGREED TO AT CHECKOUT", "THE MODEL WITHDRAWAL FORM"]) {
      expect(plain, heading).toContain(heading);
      expect(gifted, heading).toContain(heading);
    }
    for (const line of CONFIRMATION_CONSENT(false)) {
      expect(plain).toContain(line);
      expect(gifted).toContain(line);
    }
    expect(gifted).toContain(CONFIRMATION_FORM_INTRO);
    expect(gifted.length).toBeGreaterThan(plain.length);
  });

  it("says nothing about a gift when there was not one", () => {
    const text = confirmationFor(null)?.text ?? "";
    expect(text).not.toMatch(/gift/i);
  });

  it("tells the buyer their own right is unaffected", () => {
    // The recipient has the certificate; the buyer has the contract. A buyer
    // who thought gifting spent their withdrawal right would be wrong, and
    // this is where they read otherwise.
    expect(confirmationFor("recipient@example.test")?.text).toMatch(/your own right of withdrawal is unaffected/i);
  });
});
