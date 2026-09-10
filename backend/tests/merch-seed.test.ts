import { readFileSync } from "node:fs";
import { join } from "node:path";
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

import { describe, expect, it, vi, beforeEach } from "vitest";

import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { MERCH_CATALOGUE } from "../src/modules/printful/catalogue";
import { PRODUCT_TIERS } from "../src/commerce/product-model";
import { productSeedRecords } from "../src/scripts/seed-product";
import {
  MERCH_SHIPPING_PROFILE,
  MedusaMerchSeedTarget,
  merchSeedRecords,
  seedMerch,
  type MerchSeedRecord,
} from "../src/scripts/seed-merch";

/**
 * The three workflows `apply` calls directly, replaced at the module import
 * for the reason `commerce-configuration.test.ts` records: **the records tell
 * you what was declared, only the applies tell you what was sent.** P7b lost
 * three mutations to exactly that gap.
 */
const createProductsRun = vi.fn((_input: unknown) => ({ result: [{ id: "prod_1" }] }));
const updateProductsRun = vi.fn((_input: unknown) => ({ result: [{ id: "prod_1" }] }));
const updateProductVariantsRun = vi.fn((_input: unknown) => ({ result: [] }));

vi.mock("@medusajs/medusa/core-flows", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@medusajs/medusa/core-flows")>();
  return {
    ...actual,
    createProductsWorkflow: () => ({ run: createProductsRun }),
    updateProductsWorkflow: () => ({ run: updateProductsRun }),
    updateProductVariantsWorkflow: () => ({ run: updateProductVariantsRun }),
  };
});

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
      // What the object is, in plain words, for a title that is a joke. On
      // merch and **not** on the tiers, which is the separation this test is
      // about: "Lousy Deal Pro" describes itself and a subtitle under it would
      // be a line with nothing to say.
      "subtitle",
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


describe("applying merch to a running Medusa", () => {
  function containerFor(entities: Record<string, unknown[]>): MedusaContainer {
    return {
      resolve: (key: string) => {
        if (key === ContainerRegistrationKeys.QUERY) {
          return { graph: ({ entity }: { entity: string }) => Promise.resolve({ data: entities[entity] ?? [] }) };
        }
        throw new Error(`unexpected resolve(${key})`);
      },
    } as unknown as MedusaContainer;
  }

  const READY = {
    store: [{ id: "store_1", default_sales_channel_id: "sc_1" }],
    shipping_profile: [{ id: "sp_merch" }],
  };

  const mug = () => merchSeedRecords().find((record) => record.handle === "this-mug-cost-extra")!;
  const tee = () => merchSeedRecords().find((record) => record.handle === "original-purchase-receipt")!;

  beforeEach(() => {
    createProductsRun.mockClear();
    updateProductsRun.mockClear();
    updateProductVariantsRun.mockClear();
  });

  const createdInput = () =>
    createProductsRun.mock.calls[0]?.[0] as unknown as {
      input: { products: Record<string, unknown>[] };
    };

  it("puts the product in the shipping profile, which is what makes it postable", async () => {
    // Without it a merch product is as unshippable as a certificate: the cart
    // offers no postage and P7's checkout shows the unavailable notice.
    await new MedusaMerchSeedTarget(containerFor(READY)).apply(mug());
    expect(createdInput().input.products[0]).toMatchObject({ shipping_profile_id: "sp_merch" });
  });

  it("refuses when the profile is absent rather than seeding an unpostable product", async () => {
    // It would be orderable, quoted no postage, and posted to nobody.
    const target = new MedusaMerchSeedTarget(containerFor({ store: READY.store }));
    await expect(target.apply(mug())).rejects.toThrow(/run configure:commerce before seed:merch/);
    expect(createProductsRun).not.toHaveBeenCalled();
  });

  it("prices in major units, the scale P7c was fixed onto", async () => {
    // `seed-product.ts` writes `amountMinor / 100` and `money.ts` records why.
    // The mug is 1500 minor in the catalogue.
    await new MedusaMerchSeedTarget(containerFor(READY)).apply(mug());
    const variants = createdInput().input.products[0]?.variants as { prices: { amount: number }[] }[];
    expect(variants[0]?.prices[0]?.amount).toBe(15);
  });

  it("carries the Printful mapping onto every variant", async () => {
    // **`medusa-client.ts` tells the two catalogues apart by this field.** A
    // product seeded without it is sold on the home page as a certificate,
    // with VALUE zero and no address asked for -- P9a's defect, arriving
    // through the seed instead.
    await new MedusaMerchSeedTarget(containerFor(READY)).apply(tee());
    const variants = createdInput().input.products[0]?.variants as { metadata: Record<string, string> }[];
    expect(variants.length).toBeGreaterThan(1);
    for (const variant of variants) {
      expect(typeof variant.metadata.printful_variant_id).toBe("string");
    }
  });

  it("declares one option carrying every size", async () => {
    await new MedusaMerchSeedTarget(containerFor(READY)).apply(tee());
    const product = createdInput().input.products[0] as {
      options: { title: string; values: string[] }[];
      variants: { title: string; sku: string }[];
    };
    expect(product.options[0]?.title).toBe("Size");
    expect(product.options[0]?.values).toEqual(product.variants.map((variant) => variant.title));
    expect(new Set(product.variants.map((variant) => variant.sku)).size).toBe(product.variants.length);
  });

  it("manages no inventory, because Printful prints on demand", async () => {
    await new MedusaMerchSeedTarget(containerFor(READY)).apply(mug());
    const variants = createdInput().input.products[0]?.variants as { manage_inventory: boolean }[];
    expect(variants.every((variant) => variant.manage_inventory === false)).toBe(true);
  });

  describe("a product that is already there", () => {
    const held = (record: MerchSeedRecord) => ({
      ...READY,
      product: [
        {
          id: "prod_1",
          sales_channels: [{ id: "sc_other" }],
          variants: record.variants.map((variant, index) => ({ id: `var_${String(index)}`, sku: variant.sku })),
        },
      ],
    });

    it("updates rather than creating a second", async () => {
      await new MedusaMerchSeedTarget(containerFor(held(mug()))).apply(mug());
      expect(createProductsRun).not.toHaveBeenCalled();
      expect(updateProductsRun).toHaveBeenCalledTimes(1);
    });

    it("keeps a sales channel an operator added, rather than replacing the list", async () => {
      await new MedusaMerchSeedTarget(containerFor(held(mug()))).apply(mug());
      const input = updateProductsRun.mock.calls[0]?.[0] as unknown as {
        input: { products: { sales_channels: { id: string }[] }[] };
      };
      expect(input.input.products[0]?.sales_channels.map((channel) => channel.id).sort()).toEqual(["sc_1", "sc_other"]);
    });

    it("matches variants by SKU, not by position", async () => {
      // The SKU is what `orders.ts` resolves against Printful and what
      // `sync.ts` sets as the variant's `external_id` there -- the one
      // identifier both systems share. Matching by position rewrites the wrong
      // row the first time a size is inserted.
      const record = tee();
      const shuffled = {
        ...READY,
        product: [
          {
            id: "prod_1",
            sales_channels: [],
            variants: [...record.variants].reverse().map((variant, index) => ({ id: `var_${String(index)}`, sku: variant.sku })),
          },
        ],
      };
      await new MedusaMerchSeedTarget(containerFor(shuffled)).apply(record);

      const input = updateProductVariantsRun.mock.calls[0]?.[0] as unknown as {
        input: { product_variants: { id: string; prices: { amount: number }[] }[] };
      };
      // The first declared variant is the last held one, so it must carry the
      // last held id.
      expect(input.input.product_variants[0]?.id).toBe(`var_${String(record.variants.length - 1)}`);
    });

    it("refuses when a declared variant is missing rather than half-updating", async () => {
      const record = tee();
      const short = {
        ...READY,
        product: [{ id: "prod_1", sales_channels: [], variants: [{ id: "var_0", sku: record.variants[0]!.sku }] }],
      };
      const target = new MedusaMerchSeedTarget(containerFor(short));
      await expect(target.apply(record)).rejects.toThrow(/missing \d+ declared variant/);
      expect(updateProductVariantsRun).not.toHaveBeenCalled();
    });
  });
});

describe("what the object is, carried from the catalogue to the store", () => {
  /**
   * **The operator reported the add-ons as "not descriptive".** Every title is
   * a joke and a buyer cannot shop from a joke, so `catalogue.ts` carries the
   * plain noun and the seed writes it to Medusa's own `subtitle`.
   *
   * Asserted at both ends because a mutation run found the middle unguarded:
   * deleting the field from the catalogue, or dropping it from the create or
   * the update, left every test green.
   */
  it("gives every product a plain name for the object", () => {
    for (const product of MERCH_CATALOGUE) {
      expect(`${product.key}: ${product.kind}`).toBe(`${product.key}: ${product.kind}`);
      expect(product.kind.length).toBeGreaterThan(0);
    }
    expect(MERCH_CATALOGUE.map((product) => product.kind)).toEqual(["T-Shirt", "Mug", "Trucker Cap", "Sticker"]);
  });

  it("is not the title, which is the joke", () => {
    // If these ever coincide the line under the name says nothing.
    for (const product of MERCH_CATALOGUE) {
      expect(`${product.key}: ${String(product.kind === product.title)}`).toBe(`${product.key}: false`);
    }
  });

  it("reaches the seed record", () => {
    expect(merchSeedRecords().map((record) => record.subtitle)).toEqual(["T-Shirt", "Mug", "Trucker Cap", "Sticker"]);
  });

  it("is written on the create and on the update, not just one", () => {
    // **A store seeded before this existed keeps four products with no
    // subtitle if only the create carries it**, and the fix then reaches a
    // fresh database and nothing else. Read off the source because the
    // workflows are Medusa's.
    const source = readFileSync(join(__dirname, "../src/scripts/seed-merch.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(source.match(/subtitle: record\.subtitle,/g)).toHaveLength(2);
    // **Anchored on the calls, not the identifiers.** The first
    // `createProductsWorkflow` in the file is the import, which sits above
    // everything — the same mistake `parcel-shipped.test.ts` records making
    // about `updatePrintfulSubmissions`.
    const create = source.indexOf("createProductsWorkflow(this.container).run(");
    const update = source.indexOf("updateProductsWorkflow(this.container).run(");
    expect(create).toBeGreaterThan(-1);
    expect(update).toBeGreaterThan(create);
    expect(source.slice(create, update)).toContain("subtitle: record.subtitle,");
    expect(source.slice(update)).toContain("subtitle: record.subtitle,");
  });
});
