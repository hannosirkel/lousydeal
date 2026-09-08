/**
 * The four printed things, as Medusa products.
 *
 * §7 asks for "the proper Medusa product/order/fulfillment model" rather than
 * webhook hacks, and this is the product half of that. It follows
 * `seed-product.ts` deliberately — a pure record function, a one-method seam,
 * and a Medusa target that is the only piece talking to a container — because
 * the two seeds are the same kind of thing and a reader who has understood one
 * should not have to learn a second shape.
 *
 * **The certificate is not touched.** `seed-product.ts` still applies exactly
 * the three tiers it always did, single-variant and with no shipping profile.
 * `tests/merch-seed.test.ts` asserts that, because constraint 4's test is not
 * "merch works" but "the certificate did not change".
 *
 * **What makes these physical is a shipping profile**, and that is the whole
 * of the difference here. `shipping_profile_id` is optional on
 * `createProductsWorkflow`, which only links it when present
 * (`core-flows/dist/product/workflows/create-products.js:154`), so the
 * certificate stays exactly as unshippable as it was. The profile says *these
 * are things that travel*; P7a's shipping options say how and for how much.
 *
 * **Inventory is not managed**, for the same reason the certificate's is not:
 * Printful prints on demand, there is nothing to decrement, and a count
 * nobody maintains is a false promise the first time it drifts.
 */

import { MERCH_CATALOGUE } from "../modules/printful/catalogue";

/**
 * The shipping profile every merch product belongs to.
 *
 * One profile for all four: they are posted by the same fulfiller from the
 * same facilities, and a second profile would only be justified by a second
 * way of delivering.
 */
export const MERCH_SHIPPING_PROFILE = "merch";

/** One variant of one merch product, as Medusa needs it. */
export interface MerchSeedVariant {
  readonly sku: string;
  /** Medusa's option value; `One size` where the product has no sizes. */
  readonly size: string;
  readonly amountMinor: number;
  /**
   * The Printful mapping, carried on the variant so P8 can read it off an
   * order line without a second lookup keyed on something a buyer could
   * change.
   */
  readonly metadata: {
    readonly printful_variant_id: string;
    readonly printful_placement: string;
    readonly printful_technique: string;
    readonly printful_print_file: string;
  };
}

/** One merch product, addressed by the natural key `apply` looks it up by. */
export interface MerchSeedRecord {
  readonly handle: string;
  readonly title: string;
  readonly currency: string;
  readonly shippingProfile: string;
  /** Always `false`; see this file's header. */
  readonly manageInventory: false;
  /** Medusa's product option; `Size` even where there is one. */
  readonly optionTitle: string;
  readonly variants: readonly MerchSeedVariant[];
}

export interface MerchSeedTarget {
  apply(record: MerchSeedRecord): Promise<void>;
}

/**
 * The four products as records, in catalogue order.
 *
 * A pure function of `catalogue.ts`, the way `productSeedRecords` is a pure
 * function of `PRODUCT_TIERS`: the same source produces the same records in
 * the same order on every run, which is what makes two runs comparable.
 */
export function merchSeedRecords(): readonly MerchSeedRecord[] {
  return MERCH_CATALOGUE.map((product) => ({
    handle: product.handle,
    title: product.title,
    currency: "usd",
    shippingProfile: MERCH_SHIPPING_PROFILE,
    manageInventory: false as const,
    optionTitle: "Size",
    variants: product.variants.map((variant) => ({
      sku: variant.sku,
      size: variant.size ?? "One size",
      amountMinor: product.retailPrice,
      metadata: {
        // Strings, because Medusa stores metadata as JSON and a number that
        // survives a round trip as a string is a bug waiting at the far end.
        printful_variant_id: String(variant.printfulVariantId),
        printful_placement: product.placement,
        printful_technique: product.technique,
        printful_print_file: product.printFile.file,
      },
    })),
  }));
}

export interface MerchSeedSummary {
  readonly records: number;
  readonly variants: number;
}

export async function seedMerch(target: MerchSeedTarget): Promise<MerchSeedSummary> {
  const records = merchSeedRecords();
  for (const record of records) {
    await target.apply(record);
  }
  return {
    records: records.length,
    variants: records.reduce((total, record) => total + record.variants.length, 0),
  };
}
