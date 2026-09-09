/**
 * Quoting postage, and refusing to invent it.
 *
 * The payloads asserted here are the ones LD-04 sent to the live API on
 * 2026-09-08: every destination below was quoted for real, and the numbers in
 * the fixtures are what came back.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { PrintfulClient } from "../src/modules/printful/client";
import { EU_MEMBER_STATE_CODES, EU_STANDARD_VAT_PERCENTS } from "../src/commerce/tax-model";
import {
  ShippingQuoteError,
  chargeForRate,
  isEuDestination,
  quoteShipping,
  vatRateFor,
} from "../src/modules/printful/shipping";

const ART = "https://raw.githubusercontent.com/hannosirkel/lousydeal/0123456789abcdef0123456789abcdef01234567/design/merch/print-files";

const EE = { address1: "1 Test St", city: "Tallinn", countryCode: "EE", postcode: "10111" };
const US = { address1: "1 Test St", city: "New York", countryCode: "US", postcode: "10001", stateCode: "NY" };
const BR = { address1: "1 Test St", city: "Sao Paulo", countryCode: "BR", postcode: "01000-000" };

function stub(data: unknown, capture?: { body?: unknown; path?: string }) {
  const client: PrintfulClient = {
    request: <T,>(_method: string, path: string, body?: unknown): Promise<T> => {
      if (capture) {
        capture.body = body;
        capture.path = path;
      }
      return Promise.resolve({ data } as T);
    },
  };
  return client;
}

describe("what it sends", () => {
  it("asks Printful for a rate, with the catalogue's variant and the real artwork", async () => {
    const capture: { body?: unknown; path?: string } = {};
    await quoteShipping(
      stub([{ shipping: "STANDARD", shipping_method_name: "Standard", rate: "5.22" }], capture),
      [{ sku: "LD-CAP-OS", quantity: 1 }],
      EE,
      ART,
    );

    expect(capture.path).toBe("/v2/shipping-rates");
    expect(capture.body).toEqual({
      recipient: { address1: "1 Test St", city: "Tallinn", country_code: "EE", zip: "10111" },
      order_items: [
        {
          source: "catalog",
          catalog_variant_id: 4811,
          quantity: 1,
          placements: [
            {
              placement: "front_dtf_hat",
              technique: "dtfilm",
              layers: [{ type: "file", url: `${ART}/cap-front.png` }],
            },
          ],
        },
      ],
      currency: "USD",
    });
  });

  it("sends a state code where Printful demands one, and omits it where it does not", async () => {
    // Measured 2026-09-08: the United States and Australia answer "State code
    // is missing" without one; Estonia is quoted without.
    const withState: { body?: unknown } = {};
    await quoteShipping(stub([{ shipping: "S", rate: "5.45" }], withState), [{ sku: "LD-MUG-11", quantity: 1 }], US, ART);
    expect((withState.body as { recipient: Record<string, unknown> }).recipient.state_code).toBe("NY");

    const without: { body?: unknown } = {};
    await quoteShipping(stub([{ shipping: "S", rate: "5.22" }], without), [{ sku: "LD-MUG-11", quantity: 1 }], EE, ART);
    expect((without.body as { recipient: Record<string, unknown> }).recipient).not.toHaveProperty("state_code");

    const blank: { body?: unknown } = {};
    await quoteShipping(
      stub([{ shipping: "S", rate: "5.22" }], blank),
      [{ sku: "LD-MUG-11", quantity: 1 }],
      { ...EE, stateCode: "" },
      ART,
    );
    expect((blank.body as { recipient: Record<string, unknown> }).recipient).not.toHaveProperty("state_code");
  });

  it("sends every line, with its own quantity", async () => {
    const capture: { body?: unknown } = {};
    await quoteShipping(
      stub([{ shipping: "S", rate: "9.10" }], capture),
      [{ sku: "LD-TEE-L", quantity: 2 }, { sku: "LD-STK-4", quantity: 3 }],
      EE,
      ART,
    );
    const items = (capture.body as { order_items: ReadonlyArray<{ catalog_variant_id: number; quantity: number }> }).order_items;
    expect(items).toEqual([
      expect.objectContaining({ catalog_variant_id: 535, quantity: 2 }),
      expect.objectContaining({ catalog_variant_id: 10164, quantity: 3 }),
    ]);
  });
});

describe("the gross-up, which is not a markup", () => {
  it("recovers exactly Printful's charge from an EU buyer", async () => {
    // Art 78(b) puts transport inside the taxable amount, and decision 007
    // makes the price VAT-inclusive: a $5.22 rate shown at $5.22 nets $4.11
    // and Printful still charges $5.22.
    const [quote] = await quoteShipping(
      stub([{ shipping: "S", shipping_method_name: "Standard", rate: "5.22" }]),
      [{ sku: "LD-MUG-11", quantity: 1 }],
      EE,
      ART,
    );
    // Estonia's own 24% since P14b, not Hungary's 27%.
    expect(quote?.amount).toBe(Math.ceil(5.22 * 1.24 * 100) / 100);
    // What the merchant keeps after VAT is at least what Printful charged.
    expect((quote?.amount ?? 0) / 1.24).toBeGreaterThanOrEqual(5.22);
  });

  it("charges an export exactly what Printful charged, with no EU VAT on top", async () => {
    // Grossing up a parcel to Brazil would be charging a tax nobody owes.
    for (const address of [US, BR]) {
      const [quote] = await quoteShipping(
        stub([{ shipping: "S", rate: "12.78" }]),
        [{ sku: "LD-TEE-M", quantity: 1 }],
        address,
        ART,
      );
      // The rate itself, untouched: an export bears no EU VAT.
      expect(`${address.countryCode}: ${String(quote?.amount)}`).toBe(`${address.countryCode}: 12.78`);
    }
  });

  it("rounds up, because a cent short is the failure this exists to prevent", () => {
    // Reached by being tidy: a rate whose gross has a fraction of a cent,
    // rounded down, leaves the merchant paying the difference on every order.
    expect(chargeForRate(5.22, "EE")).toBe(6.48);
    expect(chargeForRate(5.22, "EE") / 1.24).toBeGreaterThanOrEqual(5.22);
    expect(chargeForRate(0.01, "EE")).toBe(0.02);
  });

  it("knows which destinations are in the union", () => {
    for (const code of ["EE", "ee", " LV ", "DE", "HU"]) expect(`${code}: ${String(isEuDestination(code))}`).toBe(`${code}: true`);
    for (const code of ["US", "GB", "NO", "CH", "BR", "AU"]) expect(`${code}: ${String(isEuDestination(code))}`).toBe(`${code}: false`);
  });
});

describe("what comes back", () => {
  it("carries Printful's delivery estimate, which is the only one this site may repeat", async () => {
    // Constraint 7, and §54(1)'s duty with it: a delivery time is not optional
    // for goods, and the honest form is Printful's own figure, attributed.
    const [quote] = await quoteShipping(
      stub([{ shipping: "S", shipping_method_name: "Flat Rate (Estimated delivery: Sep 14) ", rate: "5.45", min_delivery_days: 4, max_delivery_days: 8, shipments: [{ departure_country: "lv", customs_fees_possible: true }] }]),
      [{ sku: "LD-TEE-M", quantity: 1 }],
      US,
      ART,
    );
    expect(quote).toMatchObject({
      id: "S",
      // Printful pads the name and puts a date inside it; it is trimmed and
      // otherwise left alone, because the site quotes it as Printful's.
      name: "Flat Rate (Estimated delivery: Sep 14)",
      minDeliveryDays: 4,
      maxDeliveryDays: 8,
    });
  });

  it("carries where Printful will dispatch from, which decides the VAT treatment", async () => {
    // **Decision 013 assumed this was unknowable.** Printful's routing is not
    // controllable, which turns out to be a different thing from not being
    // knowable: the departure country is in the rate response, before the
    // buyer has paid, and it is the fact the whole VAT analysis turns on.
    // Nothing in this row uses it; P14 does. It is captured because the only
    // place it exists is the quote.
    const [quote] = await quoteShipping(
      stub([{ shipping: "S", rate: "5.45", shipments: [{ departure_country: "lv", customs_fees_possible: true }] }]),
      [{ sku: "LD-TEE-M", quantity: 1 }],
      US,
      ART,
    );
    expect(quote?.departsFrom).toBe("LV");
    expect(quote?.customsFeesPossible).toBe(true);
  });

  it("reports an unknown departure and unknown customs risk as null, not as a guess", async () => {
    // A missing `customs_fees_possible` is not `false`. §54(1) wants import
    // charges disclosed where they may fall on the buyer, and answering "no"
    // because Printful said nothing is the shape of claim §11 forbids.
    const [quote] = await quoteShipping(stub([{ shipping: "S", rate: "5" }]), [{ sku: "LD-MUG-11", quantity: 1 }], EE, ART);
    expect(quote?.departsFrom).toBeNull();
    expect(quote?.customsFeesPossible).toBeNull();
  });

  it("reports a missing estimate as null rather than as zero", async () => {
    const [camel] = await quoteShipping(stub([{ shipping: "S", rate: "5", min_delivery_days: 2 }]), [{ sku: "LD-MUG-11", quantity: 1 }], EE, ART);
    expect(camel?.minDeliveryDays).toBe(2);
    const [absent] = await quoteShipping(stub([{ shipping: "S", rate: "5" }]), [{ sku: "LD-MUG-11", quantity: 1 }], EE, ART);
    expect(absent?.minDeliveryDays).toBeNull();
    expect(absent?.maxDeliveryDays).toBeNull();
  });

  it("names an option by its id where Printful gave no name", async () => {
    const [quote] = await quoteShipping(stub([{ shipping: "STANDARD", rate: "5" }]), [{ sku: "LD-MUG-11", quantity: 1 }], EE, ART);
    expect(quote?.name).toBe("STANDARD");
  });

  it("returns the cheapest first, because § 56¹(3) caps a refund at it", async () => {
    // On withdrawal the trader refunds delivery up to the cheapest ordinary
    // option it offered. Which one that is must be a fact about the list, not
    // about the order Printful happened to return them in.
    const quotes = await quoteShipping(
      stub([
        { shipping: "EXPRESS", rate: "19.90" },
        { shipping: "STANDARD", rate: "5.22" },
        { shipping: "TRACKED", rate: "9.10" },
      ]),
      [{ sku: "LD-MUG-11", quantity: 1 }],
      EE,
      ART,
    );
    expect(quotes.map((quote) => quote.id)).toEqual(["STANDARD", "TRACKED", "EXPRESS"]);
  });
});

describe("what it refuses to invent", () => {
  it("throws rather than quote nothing when Printful returns no options", async () => {
    // §11 forbids a fabricated figure and §23 requires the final price to be
    // explicit. A guessed shipping charge is a price the buyer did not agree
    // to, arrived at by a machine that did not know.
    await expect(
      quoteShipping(stub([]), [{ sku: "LD-MUG-11", quantity: 1 }], EE, ART),
    ).rejects.toThrow(ShippingQuoteError);
  });

  it("throws when every option Printful returned is unusable", async () => {
    await expect(
      quoteShipping(stub([{ shipping_method_name: "no id or rate" }, { shipping: "S" }, { rate: "5" }]), [{ sku: "LD-MUG-11", quantity: 1 }], EE, ART),
    ).rejects.toThrow(/no usable shipping option to EE/);
  });

  it("throws for a SKU the catalogue does not know, rather than posting a guess", async () => {
    await expect(
      quoteShipping(stub([{ shipping: "S", rate: "5" }]), [{ sku: "LD-NOPE", quantity: 1 }], EE, ART),
    ).rejects.toThrow(/No Printful line for SKU LD-NOPE/);
  });

  it("throws when asked to post nothing", async () => {
    await expect(quoteShipping(stub([]), [], EE, ART)).rejects.toThrow(/Nothing to post/);
  });
});


describe("the scale, which is the thing P7c got wrong", () => {
  /**
   * **The charge is on the same scale as the rate, and nothing said so.**
   *
   * `calculatePrice`'s answer becomes a shipping option's `amount`, and
   * `list-shipping-options-for-cart-with-pricing.js:320-338` builds that field
   * from two branches into one shape -- a flat option from the pricing
   * module's `calculated_amount`, a calculated one from the provider's return.
   * Both write `amount` on the same object, so both are major units, which is
   * what `money.ts` establishes for the pricing module's side.
   *
   * The old assertions pinned exact figures (`663`, `1278`) and every one of
   * them was consistent with a hundredfold overcharge, because they were
   * derived from the same wrong expression they were checking. This asserts
   * the relationship instead.
   */
  it("charges within a fifth of what Printful quoted, never a multiple of it", () => {
    for (const rate of [0.01, 1, 5.22, 12.5, 99.99]) {
      const charge = chargeForRate(rate, "US");
      expect(`${String(rate)}: ${String(charge >= rate && charge < rate + 0.01 + 1e-9)}`).toBe(`${String(rate)}: true`);
    }
  });

  it("charges the EU rate within its own gross-up and no further", () => {
    for (const rate of [0.01, 5.22, 99.99]) {
      const charge = chargeForRate(rate, "EE");
      const gross = rate * 1.24;
      expect(`${String(rate)}: ${String(charge >= gross && charge < gross + 0.01 + 1e-9)}`).toBe(`${String(rate)}: true`);
    }
  });

  it("is never a hundred times the rate, which is what it used to be", () => {
    // The single assertion that would have caught this, stated as the
    // property rather than as a figure.
    for (const country of ["US", "EE"]) {
      expect(chargeForRate(5.22, country)).toBeLessThan(52.2);
    }
  });
});


describe("whose VAT the postage carries", () => {
  /**
   * **It was Hungary's, for everybody in the EU.** `WORST_VAT_RATE` was chosen
   * when there was no rate table and the comment defending it said the
   * over-recovery was "the direction that cannot hurt anybody".
   *
   * It is the buyer who was hurt. A larger gross-up is a larger charge, so a
   * Luxembourg buyer at 17% paid ten points of postage nobody owed and the
   * merchant kept it. P14a built the table; decision `013` made destination
   * rates the arrangement.
   */
  it("charges each member state its own rate", () => {
    // Three states, three rates, one Printful quote.
    expect(chargeForRate(10, "LU")).toBe(11.7);
    expect(chargeForRate(10, "EE")).toBe(12.4);
    expect(chargeForRate(10, "HU")).toBe(12.7);
  });

  it("charges a Luxembourg buyer less than a Hungarian one, which it did not", () => {
    // The property, rather than the figures: the charge follows the rate.
    expect(chargeForRate(10, "LU")).toBeLessThan(chargeForRate(10, "HU"));
  });

  it("adds nothing at all outside the EU, which is unchanged", () => {
    // An export bears no EU VAT, so grossing up a parcel to Brazil would be
    // charging a tax nobody owes.
    for (const country of ["US", "BR", "GB", "JP", "AU"]) {
      expect(`${country}: ${String(chargeForRate(10, country))}`).toBe(`${country}: 10`);
    }
  });

  it("reads the rate however the country arrives", () => {
    expect(chargeForRate(10, "ee")).toBe(12.4);
    expect(chargeForRate(10, " EE ")).toBe(12.4);
  });

  it("refuses rather than quietly charging no VAT for a state it has no rate for", () => {
    // Returning zero would stop recovering that country's postage VAT --
    // the merchant losing a fifth of it, silently, through a missing key.
    // Unreachable while `EU_MEMBER_STATE_CODES` is derived from the table,
    // which is why the two are derived from one thing.
    expect(EU_MEMBER_STATE_CODES.every((code) => vatRateFor(code) > 0)).toBe(true);
  });

  it("agrees with the tax regions the store is configured with", () => {
    // The postage and the goods are taxed at one rate: Art 78(b) puts
    // transport inside the taxable amount. Two tables would eventually
    // disagree, and the disagreement would be a misreported OSS return.
    for (const code of EU_MEMBER_STATE_CODES) {
      expect(`${code}: ${String(vatRateFor(code) * 100)}`).toBe(`${code}: ${String(EU_STANDARD_VAT_PERCENTS[code])}`);
    }
  });
});

describe("the units, said once", () => {
  /**
   * **Gate D found the field carrying both answers.** P7c renamed `amountMinor`
   * to `amount` and added a doc comment saying major units *directly beneath*
   * the one still saying minor. Whichever a later reader believed, one of them
   * agreed with them — on the path where the wrong belief already charged
   * $663.00 for $5.22 of postage.
   *
   * A stale comment is not caught by any behavioural test, which is why it
   * survived the mutation run that prompted this one. So the label form is
   * banned outright: `Minor units,` is how a field is annotated, and the
   * past-tense sentences that record P7c's correction are deliberately still
   * allowed to say the word.
   */
  const source = readFileSync(join(__dirname, "../src/modules/printful/shipping.ts"), "utf8");

  it("labels no money field in this file as minor units", () => {
    expect(source).not.toMatch(/^\s*\*\s*Minor units/im);
    expect(source).not.toMatch(/Minor units,/);
  });

  it("still lets the history say so, which is the whole reason the file explains itself", () => {
    // Inverted rather than loosened: the ban must not be satisfiable by
    // deleting the paragraph that records why the field is the way it is.
    // **Anchored per comment, because the first version was not.** It asserted
    // `chargeForRate`'s history sentence, which lives 100 lines below the
    // field -- so gutting the field's own paragraph passed. Each of the two
    // comments has to carry its own reason.
    const field = source.slice(source.indexOf("export interface ShippingQuote"), source.indexOf("readonly amount: number;"));
    expect(field).toMatch(/carried both answers at once until Gate D/);
    expect(source).toMatch(/returned minor units until P7c/);
    expect(source).toMatch(/\*\*in major units\*\*/);
  });

  it("cites nothing for the sort that P10 established says otherwise", () => {
    // § 56¹(3) caps a refund at the cheapest *offered* method; it says nothing
    // about which to offer. The sort survives, the citation does not.
    const sort = source.slice(source.indexOf("  // Cheapest first, because"));
    expect(sort).toContain("[...quotes].sort(");
    expect(sort).not.toMatch(/§ 56¹\(3\) (?:requires|means|obliges|is why)/);
    expect(sort).toMatch(/It used to cite § 56¹\(3\) for this, and P10 established that reading is/);
  });

  it("reads the file, so a bad path cannot pass by finding nothing", () => {
    expect(source).toContain("export function chargeForRate");
  });
});
