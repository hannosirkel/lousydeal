/**
 * The shipping option, and the price it refuses to invent.
 *
 * Driven with a stub Printful client, so the provider's whole behaviour is
 * exercised without a network and without a token.
 */

import { describe, expect, it } from "vitest";

import type { PrintfulClient } from "../src/modules/printful/client";
import {
  PRINTFUL_FULFILMENT_OPTION,
  PrintfulFulfilmentProviderService,
  readShippingContext,
} from "../src/modules/printful/fulfilment-provider";
import { ShippingQuoteError } from "../src/modules/printful/shipping";

const ART = "https://raw.githubusercontent.com/hannosirkel/lousydeal/0123456789abcdef0123456789abcdef01234567/design/merch/print-files";

const ADDRESS = { address_1: "1 Test St", city: "Tallinn", country_code: "ee", postal_code: "10111" };

const provider = (data: unknown, calls?: unknown[]) => {
  const client: PrintfulClient = {
    request: <T,>(_method: string, _path: string, body?: unknown): Promise<T> => {
      calls?.push(body);
      return Promise.resolve({ data } as T);
    },
  };
  return new PrintfulFulfilmentProviderService(null, { apiToken: "unused", artworkBaseUrl: ART }, client);
};

const RATE = [{ shipping: "STANDARD", shipping_method_name: "Flat Rate", rate: "5.22" }];

describe("reading the cart out of Medusa's context", () => {
  it("takes the address and the merch lines", () => {
    expect(
      readShippingContext({
        shipping_address: ADDRESS,
        items: [{ variant_sku: "LD-MUG-11", quantity: 2 }],
      }),
    ).toEqual({
      address: { address1: "1 Test St", city: "Tallinn", countryCode: "EE", postcode: "10111" },
      lines: [{ sku: "LD-MUG-11", quantity: 2 }],
    });
  });

  it("reads a SKU from either place Medusa puts it", () => {
    const nested = readShippingContext({
      shipping_address: ADDRESS,
      items: [{ variant: { sku: "LD-CAP-OS" }, quantity: 1 }],
    });
    expect(nested?.lines).toEqual([{ sku: "LD-CAP-OS", quantity: 1 }]);
  });

  it("leaves the certificate out of the quote, because it is not posted", () => {
    // A line with no SKU is the certificate. Skipping it here is the mechanism
    // that keeps it out of a shipping quote -- not a filter somewhere else
    // that has to know what a certificate is.
    const context = readShippingContext({
      shipping_address: ADDRESS,
      items: [{ quantity: 1 }, { variant_sku: "LD-TEE-L", quantity: 1 }],
    });
    expect(context?.lines).toEqual([{ sku: "LD-TEE-L", quantity: 1 }]);
  });

  it("reports no context for a cart with nothing to post", () => {
    // A certificate-only cart. Nothing to quote, and asking Printful for a
    // rate on an empty parcel would be asking a question with no answer.
    expect(readShippingContext({ shipping_address: ADDRESS, items: [{ quantity: 1 }] })).toBeNull();
    expect(readShippingContext({ shipping_address: ADDRESS, items: [] })).toBeNull();
  });

  it("reports no context for a half-typed address, rather than quoting on part of one", () => {
    // Printful requires all four. A partial address is not a cheaper quote, it
    // is a rejected request, and "no price yet" is both true and what the
    // checkout needs while somebody is still typing.
    for (const missing of ["address_1", "city", "country_code", "postal_code"]) {
      const address: Record<string, unknown> = { ...ADDRESS };
      delete address[missing];
      expect(
        `${missing}: ${String(readShippingContext({ shipping_address: address, items: [{ variant_sku: "LD-MUG-11", quantity: 1 }] }))}`,
      ).toBe(`${missing}: null`);
    }
    for (const blank of ["", "   "]) {
      expect(
        readShippingContext({ shipping_address: { ...ADDRESS, city: blank }, items: [{ variant_sku: "LD-MUG-11", quantity: 1 }] }),
      ).toBeNull();
    }
  });

  it("survives a context that is nothing like a cart", () => {
    for (const context of [null, undefined, {}, "cart", 7, []]) {
      expect(readShippingContext(context)).toBeNull();
    }
  });

  it("drops a line whose quantity is not a usable number", () => {
    const context = readShippingContext({
      shipping_address: ADDRESS,
      items: [
        { variant_sku: "LD-MUG-11", quantity: 0 },
        { variant_sku: "LD-TEE-L", quantity: "x" },
        { variant_sku: "LD-CAP-OS", quantity: 1 },
      ],
    });
    expect(context?.lines).toEqual([{ sku: "LD-CAP-OS", quantity: 1 }]);
  });
});

describe("pricing", () => {
  it("charges the cheapest quote, as a tax-inclusive amount", async () => {
    const price = await provider([
      { shipping: "EXPRESS", rate: "19.90" },
      { shipping: "STANDARD", rate: "5.22" },
    ]).calculatePrice({}, {}, { shipping_address: ADDRESS, items: [{ variant_sku: "LD-MUG-11", quantity: 1 }] });

    // 5.22 grossed up at the worst EU rate, rounded up: decision `007` makes
    // every price on this site VAT-inclusive, and `shipping.ts` makes the net
    // recover Printful's charge exactly.
    expect(price).toEqual({ calculated_amount: 663, is_calculated_price_tax_inclusive: true });
  });

  it("asks Printful with the catalogue's variant, not with the cart's words", async () => {
    const calls: unknown[] = [];
    await provider(RATE, calls).calculatePrice({}, {}, {
      shipping_address: ADDRESS,
      items: [{ variant_sku: "LD-CAP-OS", quantity: 1 }],
    });
    expect(calls[0]).toMatchObject({
      order_items: [expect.objectContaining({ catalog_variant_id: 4811 })],
    });
  });

  it("can calculate, which is what makes the option calculated rather than flat", async () => {
    // Printful quotes per address and per parcel -- $13.56 to Estonia, $25.56
    // to Brazil, measured -- so a flat rate would be wrong everywhere except
    // one place.
    expect(await provider(RATE).canCalculate()).toBe(true);
  });

  it("offers exactly one option, and validates only that one", async () => {
    const service = provider(RATE);
    expect(await service.getFulfillmentOptions()).toEqual([{ id: PRINTFUL_FULFILMENT_OPTION }]);
    expect(await service.validateOption({ id: PRINTFUL_FULFILMENT_OPTION })).toBe(true);
    expect(await service.validateOption({ id: "something-else" })).toBe(false);
  });
});

describe("what it refuses, against Medusa's own advice", () => {
  /**
   * Medusa's docstring for `calculatePrice` says: "ensure to handle errors
   * gracefully, such as by falling back to a default price, if you don't want
   * a failure in the third-party service to block checkout."
   *
   * **This shop declines that.** A default price is a number nobody quoted,
   * charged to a buyer who agreed to it — §11 forbids a fabricated figure and
   * §23 requires the final price to be explicit. A buyer who cannot pay is
   * annoyed; a buyer charged a made-up postage is misled.
   */
  it("throws rather than pricing a cart with no address", async () => {
    await expect(
      provider(RATE).calculatePrice({}, {}, { items: [{ variant_sku: "LD-MUG-11", quantity: 1 }] }),
    ).rejects.toThrow(ShippingQuoteError);
  });

  it("throws rather than pricing a cart with nothing to post", async () => {
    await expect(
      provider(RATE).calculatePrice({}, {}, { shipping_address: ADDRESS, items: [{ quantity: 1 }] }),
    ).rejects.toThrow(ShippingQuoteError);
  });

  it("throws when Printful quotes nothing, rather than substituting a number", async () => {
    await expect(
      provider([]).calculatePrice({}, {}, { shipping_address: ADDRESS, items: [{ variant_sku: "LD-MUG-11", quantity: 1 }] }),
    ).rejects.toThrow(ShippingQuoteError);
  });

  it("returns no price at all on failure, rather than a zero", async () => {
    // A zero would be worse than a throw: Medusa treats a returned amount as a
    // price, so free postage would be charged and the merchant would pay it.
    const failed = await provider([])
      .calculatePrice({}, {}, { shipping_address: ADDRESS, items: [{ variant_sku: "LD-MUG-11", quantity: 1 }] })
      .catch(() => "threw");
    expect(failed).toBe("threw");
  });
});

describe("what it does not do", () => {
  it("fulfils nothing, because spending money in a retryable method is P8's argument to avoid", async () => {
    const calls: unknown[] = [];
    const result = await provider(RATE, calls).createFulfillment();
    expect(result).toEqual({ data: {}, labels: [] });
    // Nothing was asked of Printful.
    expect(calls).toEqual([]);
  });
});
