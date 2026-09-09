/**
 * The message telling a buyer their parcel is on its way.
 *
 * A shipping email is the one a buyer opens looking for a date, and the one
 * thing this shop cannot honestly give them. So most of these tests are about
 * what it refuses to say.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { buildParcelShipped } from "../src/notifications/parcel-shipped";

const MERCHANT = {
  legalName: "Aislopica OÜ",
  address: "Some Street 1, Tallinn",
  email: "hello@example.invalid",
  registryCode: "12345678",
  vatNumber: "EE123456789",
  phoneNumber: "+372 1234567",
};

const parcel = (over: Partial<Parameters<typeof buildParcelShipped>[0]> = {}) => ({
  orderDisplayId: "#41",
  trackingNumber: "TRK1",
  trackingUrl: "https://track.example.invalid/TRK1",
  carrier: "DPD",
  ...over,
});

const built = (over = {}) => buildParcelShipped(parcel(over), MERCHANT);

describe("what it tells them", () => {
  it("says the order was sent, and names it as they know it", () => {
    // Their own order number, not Printful's: the buyer has never seen
    // Printful's and could not match it to anything.
    const message = built();
    expect(message?.subject).toContain("#41");
    expect(message?.text).toMatch(/has been sent/);
  });

  it("gives the tracking number, the carrier and the link", () => {
    const text = built()?.text ?? "";
    expect(text).toContain("TRK1");
    expect(text).toContain("DPD");
    expect(text).toContain("https://track.example.invalid/TRK1");
  });

  it("says who to write to, and that the parcel is ours until it arrives", () => {
    // P7d settled the liability against Medusa's own model: § 209(4) and
    // § 214(2) leave risk with the trader until the buyer has it. A shipping
    // email is where that is worth a sentence.
    const text = built()?.text ?? "";
    expect(text).toContain("hello@example.invalid");
    expect(text).toMatch(/Until it reaches you it is ours, not yours/);
  });

  it("names the trader, because a message from nobody is a message from nobody", () => {
    expect(built()?.text).toContain("Aislopica OÜ");
  });
});

describe("what it refuses to say", () => {
  it("promises no arrival date", () => {
    // Constraint 7, and the same rule P9c applies to the shelf: nobody knows.
    const text = built()?.text ?? "";
    expect(text).not.toMatch(/\b(?:\d+\s*(?:-|–|to)\s*\d+\s*(?:business |working )?days?|arrives?\s+(?:on|by)|delivery by|expect(?:ed)? (?:on|by))\b/i);
  });

  it("says why there is no date, rather than leaving an absence", () => {
    // A buyer opening a shipping email is looking for exactly the thing this
    // cannot say. Silence reads as an oversight.
    expect(built()?.text).toMatch(/We cannot tell you when it will arrive/);
    expect(built()?.text).toMatch(/a date we invented would be one you remembered/);
  });

  it("repeats no delivery address", () => {
    // They typed it, they have it, and a delivery address in an email is a
    // delivery address in an inbox.
    const text = built()?.text ?? "";
    expect(text).not.toMatch(/Narva|postcode|postal code/i);
  });

  it("carries no exclamation mark, like every other surface", () => {
    expect(built()?.text).not.toContain("!");
    expect(built()?.subject).not.toContain("!");
  });

  it("names no amount", () => {
    // The order confirmation carries the money. A shipping email restating it
    // is a second figure that can disagree with the first.
    expect(built()?.text).not.toMatch(/[$€£]\s?\d/);
  });
});

describe("a shipment with no tracking number, which is ordinary", () => {
  const message = built({ trackingNumber: null, trackingUrl: null, carrier: null });

  it("still goes, because 'it has been sent' is worth saying on its own", () => {
    // Withholding it until tracking exists is a buyer wondering for a day.
    expect(message?.text).toMatch(/has been sent/);
  });

  it("says there is none yet rather than showing an empty line", () => {
    // A buyer who expects a tracking number and finds none assumes the
    // message is broken.
    expect(message?.text).toMatch(/There is no tracking number yet/);
    expect(message?.text).not.toMatch(/Tracking number:\s*$/m);
    expect(message?.text).not.toContain("null");
  });

  it("does not promise one will follow, only that it may", () => {
    // Some carriers never issue one. "It will arrive" would be a promise
    // about somebody else's system.
    expect(message?.text).toMatch(/if one arrives/i);
    expect(message?.text).not.toMatch(/you will receive a tracking number/i);
  });
});

describe("a shipment with a number but no carrier or link", () => {
  it("gives what there is and invents no parenthesis", () => {
    const text = built({ carrier: null, trackingUrl: null })?.text ?? "";
    expect(text).toContain("Tracking number: TRK1");
    expect(text).not.toContain("(null)");
    expect(text).not.toContain("()");
  });
});

describe("the shape of it", () => {
  it("returns nothing at all when the trader cannot be named", () => {
    // The disposition `buildOrderConfirmation` takes: a caller that cannot
    // name the trader must not send a message naming nobody, and the caller
    // is a route that must not throw.
    expect(buildParcelShipped(parcel(), null)).toBeNull();
  });

  it("leaves no placeholder in the text a reader sees", () => {
    // The resolver throws on an unknown token rather than letting one
    // through: a `{merchantEmail}` in an inbox is a defect that looks like a
    // joke.
    expect(built()?.text).not.toMatch(/\{[a-zA-Z]+\}/);
    expect(built()?.subject).not.toMatch(/\{[a-zA-Z]+\}/);
  });

  it("escapes the html, since a tracking number is somebody else's string", () => {
    const message = built({ trackingNumber: '<script>alert("x")</script>', trackingUrl: null, carrier: null });
    expect(message?.html).not.toContain("<script>");
    expect(message?.html).toContain("&lt;script&gt;");
  });

  it("carries the same words in both parts", () => {
    // Two bodies that can disagree is one that will.
    const message = built();
    expect(message?.html).toContain("TRK1");
    expect(message?.text).toContain("TRK1");
  });
});

describe("sending it once", () => {
  /**
   * **Two guards, and neither is a reason to skip the other.** The row is read
   * before it is written, so a redelivery against a submission already marked
   * `shipment_sent` records and says nothing — cheap, and it covers the
   * ordinary retry. The idempotency key covers two deliveries arriving
   * together, which the read cannot: Medusa's notification module enforces it
   * inside a transaction.
   */
  const source = readFileSync(join(__dirname, "../src/api/webhooks/printful/route.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

  it("reads the row's prior state before overwriting it", () => {
    expect(source).toMatch(/alreadyShipped = row\.printful_status === "shipment_sent"/);
    // Read before the update, or it always reads back what was just written.
    // **Compared against the call and not the identifier**: the first
    // `updatePrintfulSubmissions` in the file is the interface declaration,
    // which sits above everything and made this pass for the wrong reason.
    expect(source.indexOf("const alreadyShipped =")).toBeLessThan(
      source.indexOf("await submissions.updatePrintfulSubmissions("),
    );
  });

  it("sends only on a first shipment_sent", () => {
    expect(source).toMatch(/event\.type === "shipment_sent" && !alreadyShipped/);
  });

  it("carries an idempotency key derived from the order", () => {
    expect(source).toMatch(/idempotency_key: `lousydeal:parcel-shipped:\$\{orderId\}`/);
  });

  it("does not fail the webhook when the mail fails", () => {
    // A parcel that shipped has shipped whatever the mail server did, and a
    // non-2xx earns six redeliveries of an event already recorded -- which
    // would find the row saying shipped and send nothing anyway.
    const helper = source.slice(source.indexOf("async function tellTheBuyer"));
    expect(helper).toMatch(/catch\s*\(/);
    expect(helper).not.toMatch(/res\.status\(5/);
  });

  it("does not log the address itself", () => {
    // The one piece of personal data here, and a log line outlives the order
    // record's own retention.
    //
    // **Written first as "no log line mentions `address`"**, which failed on a
    // message whose *words* include "the order carries no email address". What
    // matters is the value, so what is banned is interpolating it.
    const helper = source.slice(source.indexOf("async function tellTheBuyer"));
    expect(helper).not.toMatch(/logger\.[a-z]+\([^;]*\$\{address\}/);
    expect(helper).not.toMatch(/logger\.[a-z]+\([^;]*\border\.email\b/);
  });

  it("reads the stripping, so a broken regex cannot pass by emptying the file", () => {
    expect(source).toContain("export async function POST");
  });
});
