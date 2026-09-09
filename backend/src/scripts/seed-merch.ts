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

import type { ExecArgs, MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  createProductsWorkflow,
  updateProductsWorkflow,
  updateProductVariantsWorkflow,
} from "@medusajs/medusa/core-flows";

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

/**
 * Applies the four printed things to a running Medusa application.
 *
 * **This is what P6 left as a seam and ticked anyway.** `MerchSeedTarget` had
 * no implementation for three rows, so the products could not be created and
 * P9a's catalogue defect stayed latent for want of anything to trip it.
 *
 * It mirrors `MedusaProductSeedTarget` — look up by handle, then create or
 * update, never a bare create — and differs in exactly three ways, each of
 * which is why it is not a copy:
 *
 *  - **several variants per product**, matched by SKU rather than by position.
 *    A record whose sizes are reordered must update the same rows, and the
 *    position of `M` in a list is not an identity;
 *  - **a shipping profile**, resolved by the name `configure-commerce.ts`
 *    creates it under. Without it a merch product is as unshippable as a
 *    certificate and the cart offers no postage;
 *  - **variant metadata**, carrying the Printful mapping `medusa-client.ts`
 *    now uses to tell the two catalogues apart. A product seeded without it
 *    would be sold on the home page as a certificate.
 *
 * **The price is `amountMinor / 100`, exactly as `seed-product.ts` writes
 * it.** `money.ts` records the research and P7c records what happens when a
 * path on this scale is fed minor units: a $5.22 rate charged as $663.00. The
 * conversion is here rather than in `merchSeedRecords` so that the records
 * stay a pure statement of the catalogue and one file owns the scale.
 */
export class MedusaMerchSeedTarget implements MerchSeedTarget {
  constructor(private readonly container: MedusaContainer) {}

  private get query() {
    return this.container.resolve(ContainerRegistrationKeys.QUERY);
  }

  private async one<T>(entity: string, fields: string[], filters: Record<string, unknown>): Promise<T | undefined> {
    const { data } = await this.query.graph({ entity, fields, filters });
    return data[0] as T | undefined;
  }

  async apply(record: MerchSeedRecord): Promise<void> {
    const profile = await this.one<{ id: string }>("shipping_profile", ["id"], { name: record.shippingProfile });
    if (profile === undefined) {
      // Refusing beats seeding an unshippable product: it would be orderable,
      // quoted no postage, and posted to nobody.
      throw new Error(
        `No shipping profile named ${record.shippingProfile}; run configure:commerce before seed:merch`,
      );
    }

    const store = await this.one<{ default_sales_channel_id?: string | null }>(
      "store",
      ["id", "default_sales_channel_id"],
      {},
    );
    const salesChannelId = store?.default_sales_channel_id;
    if (typeof salesChannelId !== "string") {
      throw new Error("The store has no default sales channel; run Medusa's defaults first");
    }

    const existing = await this.one<{
      id: string;
      sales_channels?: { id?: string }[];
      variants?: { id?: string; sku?: string | null }[];
    }>("product", ["id", "sales_channels.id", "variants.id", "variants.sku"], { handle: record.handle });

    if (existing === undefined) {
      await createProductsWorkflow(this.container).run({
        input: {
          products: [
            {
              handle: record.handle,
              title: record.title,
              status: "published",
              shipping_profile_id: profile.id,
              sales_channels: [{ id: salesChannelId }],
              options: [{ title: record.optionTitle, values: record.variants.map((variant) => variant.size) }],
              variants: record.variants.map((variant) => ({
                title: variant.size,
                sku: variant.sku,
                manage_inventory: record.manageInventory,
                options: { [record.optionTitle]: variant.size },
                prices: [priceOf(variant, record)],
                metadata: { ...variant.metadata },
              })),
            },
          ],
        },
      });
      return;
    }

    // Unioned rather than replaced, for the reason `seed-product.ts` records:
    // `updateProductsWorkflow` treats `sales_channels` as a replacement, and
    // restoring a dropped link must not cost an operator a channel they added.
    const present = (existing.sales_channels ?? [])
      .map((channel) => channel.id)
      .filter((id): id is string => typeof id === "string");
    const salesChannels = present.includes(salesChannelId) ? present : [...present, salesChannelId];

    await updateProductsWorkflow(this.container).run({
      input: {
        products: [
          {
            id: existing.id,
            handle: record.handle,
            title: record.title,
            status: "published",
            shipping_profile_id: profile.id,
            sales_channels: salesChannels.map((id) => ({ id })),
          },
        ],
      },
    });

    // **Matched by SKU.** The SKU is what `orders.ts` resolves against
    // Printful and what `sync.ts` sets as the variant's `external_id` there,
    // so it is the one identifier shared by both systems. Matching by position
    // would rewrite the wrong row the first time a size is inserted.
    const held = new Map(
      (existing.variants ?? [])
        .filter((variant): variant is { id: string; sku: string } =>
          typeof variant.id === "string" && typeof variant.sku === "string",
        )
        .map((variant) => [variant.sku, variant.id]),
    );

    const updates = record.variants.flatMap((variant) => {
      const id = held.get(variant.sku);
      // A variant the product does not have is not created here. Adding one
      // needs the option value too, and a half-added size is worse than a
      // named refusal -- `seed-merch` is not the row that changes a catalogue.
      if (id === undefined) return [];
      return [
        {
          id,
          manage_inventory: record.manageInventory,
          prices: [priceOf(variant, record)],
          metadata: { ...variant.metadata },
        },
      ];
    });

    if (updates.length !== record.variants.length) {
      throw new Error(
        `Product ${record.handle} is missing ${String(record.variants.length - updates.length)} declared variant(s); ` +
          `add them in the Admin or delete the product and re-run`,
      );
    }

    await updateProductVariantsWorkflow(this.container).run({ input: { product_variants: updates } });
  }
}

/** One price, on the scale Medusa reads. See the note on {@link MedusaMerchSeedTarget}. */
function priceOf(variant: MerchSeedVariant, record: MerchSeedRecord): { amount: number; currency_code: string } {
  return { amount: variant.amountMinor / 100, currency_code: record.currency.toLowerCase() };
}

/**
 * The fifth step of `npm run predeploy`, after `seed:product`.
 *
 * **After `configure:commerce` and not before**: the shipping profile has to
 * exist, and `apply` refuses by name rather than seeding a product nothing can
 * post.
 */
export default async function seedMerchCommand({ container }: ExecArgs): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const summary = await seedMerch(new MedusaMerchSeedTarget(container));
  logger.info(`merch seed applied: records=${String(summary.records)} variants=${String(summary.variants)}`);
}
