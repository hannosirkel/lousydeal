/**
 * Seeds the three product tiers, idempotently -- the second checkbox of T7,
 * and the `medusa exec` entry point `npm run seed:product` invokes.
 *
 * {@link productSeedRecords} is a pure function of `PRODUCT_TIERS`.
 * {@link ProductSeedTarget} is the one-method seam
 * `tests/commerce-product-seed.test.ts` stubs, without mocking a Medusa
 * container. {@link seedProduct} applies every record once and stops at the
 * first refusal. {@link MedusaProductSeedTarget} is the only piece that talks
 * to a running Medusa application, and no test exercises it.
 *
 * **Idempotency is the row's subject.** `apply` is a lookup by the natural
 * key -- `record.handle` -- followed by a create **or** an update, never a
 * bare create: a promoted digest runs this script again on top of a database
 * the last one already seeded.
 *
 * **No SKU.** Each tier is its own product with one variant, so `handle` is
 * both the catalogue key and the seed's natural key. Plepic addresses a price
 * and a stock level by SKU; three independent tiers do not need one.
 *
 * **`manageInventory` is always `false` here** -- `PRODUCT_TIERS` declares no
 * other value -- so this file writes the flag and creates no inventory level.
 */

import type { ExecArgs, MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { createProductsWorkflow, updateProductsWorkflow, updateProductVariantsWorkflow } from "@medusajs/medusa/core-flows";

import { PRODUCT_TIERS } from "../commerce/product-model";

/** One tier, addressed by the natural key `apply` looks it up by: `handle`. */
export interface ProductSeedRecord {
  readonly handle: string;
  readonly title: string;
  /** Lowercase ISO 4217; see `commerce/product-model.ts`. */
  readonly currency: string;
  /** Minor units, what the customer pays -- see `commerce/tax-model.ts`. */
  readonly amountMinor: number;
  readonly manageInventory: boolean;
}

/** Applies one record by its natural key. Applying it twice is applying it once. */
export interface ProductSeedTarget {
  apply(record: ProductSeedRecord): Promise<void>;
}

/**
 * The three tiers as records, in declaration order.
 *
 * A pure function of the frozen model: the same source produces the same
 * records, in the same order, on every run, which is what
 * `tests/commerce-product-seed.test.ts` compares across two runs.
 */
export function productSeedRecords(): readonly ProductSeedRecord[] {
  return PRODUCT_TIERS.map((tier) => ({
    handle: tier.handle,
    title: tier.title,
    currency: tier.currency,
    amountMinor: tier.amountMinor,
    manageInventory: tier.manageInventory,
  }));
}

export interface ProductSeedSummary {
  readonly records: number;
}

export async function seedProduct(target: ProductSeedTarget): Promise<ProductSeedSummary> {
  const records = productSeedRecords();
  for (const record of records) {
    await target.apply(record);
  }
  return { records: records.length };
}

/**
 * Applies the declared tiers to a running Medusa application.
 *
 * Every apply is a lookup by `handle` followed by a create **or** an update,
 * never a bare create.
 */
export class MedusaProductSeedTarget implements ProductSeedTarget {
  constructor(private readonly container: MedusaContainer) {}

  private get query() {
    return this.container.resolve(ContainerRegistrationKeys.QUERY);
  }

  private async one<T>(entity: string, fields: string[], filters: Record<string, unknown>): Promise<T | undefined> {
    const { data } = await this.query.graph({ entity, fields, filters });
    return data[0] as T | undefined;
  }

  private async defaultSalesChannelId(): Promise<string> {
    const store = await this.one<{ default_sales_channel_id?: string | null }>(
      "store",
      ["id", "default_sales_channel_id"],
      {},
    );
    const id = store?.default_sales_channel_id;
    if (!id) {
      throw new Error("The store has no default sales channel; run Medusa's defaults first");
    }
    return id;
  }

  /**
   * Converges the product, its one variant, its price and its sales-channel
   * link.
   *
   * **Neither `images` nor `thumbnail` is sent, on either branch.**
   * `@medusajs/product/dist/repositories/product.js:71-80` only reassigns
   * `images` when the input carries the key, and both keys are optional in
   * `@medusajs/medusa/dist/api/admin/products/validators.js:172-173` -- so
   * omitting them, rather than sending `images: []`, leaves whatever an
   * operator uploaded in the Admin alone. `[]` is truthy in JavaScript and
   * would be read as "this product has no images", wiping that media on
   * every promoted digest.
   */
  async apply(record: ProductSeedRecord): Promise<void> {
    const salesChannelId = await this.defaultSalesChannelId();
    const price = { amount: record.amountMinor / 100, currency_code: record.currency.toLowerCase() };

    const existing = await this.one<{
      id: string;
      sales_channels?: { id?: string }[];
      variants?: { id?: string }[];
    }>("product", ["id", "sales_channels.id", "variants.id"], { handle: record.handle });

    if (existing === undefined) {
      await createProductsWorkflow(this.container).run({
        input: {
          products: [
            {
              handle: record.handle,
              title: record.title,
              status: "published",
              sales_channels: [{ id: salesChannelId }],
              options: [{ title: "Tier", values: ["Standard"] }],
              variants: [
                {
                  title: "Standard",
                  manage_inventory: record.manageInventory,
                  options: { Tier: "Standard" },
                  prices: [price],
                },
              ],
            },
          ],
        },
      });
      return;
    }

    /*
     * `updateProductsWorkflow` treats `sales_channels` as a replacement, not
     * an addition (`@medusajs/core-flows/dist/product/workflows/update-products.js`),
     * so the declared channel is unioned with whatever is already linked
     * rather than sent alone -- restoring a dropped link must not cost an
     * operator a channel they added deliberately.
     */
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
            sales_channels: salesChannels.map((id) => ({ id })),
          },
        ],
      },
    });

    const variantId = existing.variants?.[0]?.id;
    if (variantId === undefined) {
      throw new Error(`Product ${record.handle} has no variant to price`);
    }
    await updateProductVariantsWorkflow(this.container).run({
      input: {
        product_variants: [{ id: variantId, manage_inventory: record.manageInventory, prices: [price] }],
      },
    });
  }
}

/**
 * The fourth step of `npm run predeploy` -- after `configure:commerce`. It
 * reads no environment variable: everything it applies is frozen in
 * `commerce/product-model.ts` and identical in every environment.
 */
export default async function seedProductCommand({ container }: ExecArgs): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const summary = await seedProduct(new MedusaProductSeedTarget(container));
  logger.info(`product seed applied: records=${String(summary.records)}`);
}
