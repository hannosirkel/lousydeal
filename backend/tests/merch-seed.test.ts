/**
 * The merch products, and — the point of this file — the certificate's.
 *
 * **Constraint 4's test is not "merch works" but "the certificate did not
 * change".** The slice adds four physical products to a shop that has sold one
 * digital thing since LD-01, and every one of the failures worth fearing here
 * is a regression rather than a missing feature: a certificate that acquires a
 * shipping step, a tier that gains a variant, a price that moves because a
 * shared record shape grew a field.
 *
 * So half of this file asserts that `seed-product.ts` still does exactly what
 * it did.
 */

import { describe, expect, it } from "vitest";

import { MERCH_CATALOGUE } from "../src/modules/printful/catalogue";
import { PRODUCT_TIERS } from "../src/commerce/product-model";
import { productSeedRecords } from "../src/scripts/seed-product";
import {
  MERCH_SHIPPING_PROFILE,
  merchSeedRecords,
  seedMerch,
  type MerchSeedRecord,
} from "../src/scripts/seed-merch";

describe("the certificate, which this slice must not touch", () => {
  it("still seeds exactly the three tiers, in order", () => {
    expect(productSeedRecords().map((record) => record.handle)).toEqual([
      "lousy-deal",
      "lousy-deal-plus",
      "lousy-deal-pro",
    ]);
    expect(PRODUCT_TIERS).toHaveLength(3);
  });

  it("still seeds them with no shipping profile of any kind", () => {
    // The property that keeps a certificate order from acquiring a shipping
    // step. `shipping_profile_id` is optional on `createProductsWorkflow` and
    // only linked when present, so the absence of the key here is the whole
    // mechanism.
    for (const record of productSeedRecords()) {
      expect(Object.keys(record)).not.toContain("shippingProfile");
      expect(record).not.toHaveProperty("variants");
    }
  });

  it("shares no record shape with merch, so neither can grow a field into the other", () => {
    // The regression this forbids is subtle: one `SeedRecord` type serving
    // both, and a field added for a mug arriving on a certificate. They are
    // separate types on purpose, and this asserts the separation rather than
    // trusting it.
    const tier = productSeedRecords()[0]!;
    const merch = merchSeedRecords()[0]!;
    expect(Object.keys(tier).sort()).toEqual(["amountMinor", "currency", "handle", "manageInventory", "title"]);
    expect(Object.keys(merch).sort()).toEqual([
      "currency",
      "handle",
      "manageInventory",
      "optionTitle",
      "shippingProfile",
      "title",
      "variants",
    ]);
  });

  it("keeps the three tier prices exactly where they were", () => {
    expect(productSeedRecords().map((record) => record.amountMinor)).toEqual([500, 1000, 2500]);
  });
});

describe("the merch records", () => {
  it("derives the four products from the catalogue, in its order", () => {
    expect(merchSeedRecords().map((record) => record.handle)).toEqual(
      MERCH_CATALOGUE.map((product) => product.handle),
    );
  });

  it("is a pure function: two calls agree", () => {
    expect(merchSeedRecords()).toEqual(merchSeedRecords());
  });

  it("puts every product on the one shipping profile, which is what makes it physical", () => {
    for (const record of merchSeedRecords()) {
      expect(`${record.handle}: ${record.shippingProfile}`).toBe(`${record.handle}: ${MERCH_SHIPPING_PROFILE}`);
    }
  });

  it("manages inventory on nothing, because Printful prints on demand", () => {
    for (const record of merchSeedRecords()) {
      expect(`${record.handle}: ${String(record.manageInventory)}`).toBe(`${record.handle}: false`);
    }
  });

  it("gives the shirt six sizes and everything else one", () => {
    const sizes = Object.fromEntries(
      merchSeedRecords().map((record) => [record.handle, record.variants.map((variant) => variant.size)]),
    );
    expect(sizes["original-purchase-receipt"]).toEqual(["S", "M", "L", "XL", "2XL", "3XL"]);
    expect(sizes["this-mug-cost-extra"]).toEqual(["11 oz"]);
    expect(sizes["lousy-deals-trucker-cap"]).toEqual(["One size"]);
    expect(sizes["certified-worthless"]).toEqual(['4″×4″']);
  });

  it("prices every size of a product the same, which is the operator's decision", () => {
    // One price across sizes was settled on the ground that no customer is
    // charged more for being larger. A per-size price arriving here would be
    // that decision reversed by accident.
    for (const record of merchSeedRecords()) {
      const prices = [...new Set(record.variants.map((variant) => variant.amountMinor))];
      expect(`${record.handle}: ${prices.join(",")}`).toBe(`${record.handle}: ${prices[0]?.toString() ?? ""}`);
    }
    expect(merchSeedRecords().map((record) => record.variants[0]?.amountMinor)).toEqual([3200, 1500, 2900, 600]);
  });

  it("gives every variant a distinct SKU across the whole catalogue", () => {
    const skus = merchSeedRecords().flatMap((record) => record.variants.map((variant) => variant.sku));
    expect(skus).toEqual([...new Set(skus)]);
    expect(skus).toHaveLength(9);
  });
});

describe("the Printful mapping on the variant", () => {
  it("carries the four things P8 needs to place a line", () => {
    const cap = merchSeedRecords().find((record) => record.handle === "lousy-deals-trucker-cap")!;
    expect(cap.variants[0]?.metadata).toEqual({
      printful_variant_id: "4811",
      printful_placement: "front_dtf_hat",
      printful_technique: "dtfilm",
      printful_print_file: "cap-front.png",
    });
  });

  it("stores the variant id as a string, because metadata is JSON", () => {
    // A number that survives a round trip as a string is a bug waiting at the
    // far end, where something compares it to a number and finds no match.
    for (const record of merchSeedRecords()) {
      for (const variant of record.variants) {
        expect(typeof variant.metadata.printful_variant_id).toBe("string");
        expect(variant.metadata.printful_variant_id).toMatch(/^[0-9]+$/);
      }
    }
  });

  it("agrees with the catalogue on every variant, so the two cannot drift", () => {
    const declared = MERCH_CATALOGUE.flatMap((product) =>
      product.variants.map((variant) => `${variant.sku}:${String(variant.printfulVariantId)}:${product.placement}`),
    );
    const seeded = merchSeedRecords().flatMap((record) =>
      record.variants.map(
        (variant) => `${variant.sku}:${variant.metadata.printful_variant_id}:${variant.metadata.printful_placement}`,
      ),
    );
    expect(seeded).toEqual(declared);
  });
});

describe("applying them", () => {
  it("applies every record once and counts what it did", async () => {
    const applied: MerchSeedRecord[] = [];
    const summary = await seedMerch({
      apply: (record) => {
        applied.push(record);
        return Promise.resolve();
      },
    });
    expect(applied.map((record) => record.handle)).toEqual(merchSeedRecords().map((record) => record.handle));
    expect(summary).toEqual({ records: 4, variants: 9 });
  });

  it("stops at the first refusal rather than half-seeding a catalogue", async () => {
    // The same first-refusal behaviour `seed-product.ts` has. A run that
    // continued past a failure would leave a shop where some products are
    // priced and some are not, and report success.
    const applied: string[] = [];
    await expect(
      seedMerch({
        apply: (record) => {
          applied.push(record.handle);
          return record.handle === "this-mug-cost-extra"
            ? Promise.reject(new Error("no"))
            : Promise.resolve();
        },
      }),
    ).rejects.toThrow("no");
    expect(applied).toEqual(["original-purchase-receipt", "this-mug-cost-extra"]);
  });
});
