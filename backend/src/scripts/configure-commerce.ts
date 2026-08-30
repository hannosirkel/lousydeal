/**
 * Configures the store's currency, the one region and its tax regions,
 * idempotently -- the second checkbox of T7, and the `medusa exec` entry
 * point `npm run configure:commerce` invokes. Runs before `seed:product`,
 * which links each product to the store's default sales channel.
 *
 * `predeploy` runs `medusa db:migrate --execute-safe-links` first; the flag
 * is carried because the predeploy Job supplies no stdin and cannot answer
 * the interactive prompt an unsafe schema link would otherwise raise.
 *
 * {@link commerceRecords} is a pure function of `tax-model.ts` and
 * `product-model.ts`. {@link CommerceConfigurationTarget} is the one-method
 * seam `tests/commerce-configuration.test.ts` stubs, without mocking a
 * Medusa container. {@link configureCommerce} applies every record once and
 * stops at the first refusal. {@link MedusaCommerceConfigurationTarget} is
 * the only piece that talks to a running Medusa application, and no test
 * exercises it.
 *
 * **What this row deliberately does not build:** no stock location, no
 * fulfillment set, and no shipping profile or option -- this shop has no
 * physical delivery yet.
 *
 * **It configures no sales channel either**, which narrows T7's second
 * checkbox ("configure the region, sales channel and currency") to the region
 * and the currency, because Medusa's own default channel is used and
 * `seed:product` links every tier to it. That default is created by
 * `createDefaultsWorkflow` on every application boot
 * (`node_modules/@medusajs/medusa/dist/loaders/index.js:134-135`), and
 * `medusa exec` runs the same loaders
 * (`node_modules/@medusajs/medusa/dist/commands/exec.js:67`) -- so this
 * script's own boot is what creates it. `medusa db:migrate` does not: it
 * calls `initializeContainer` and nothing else
 * (`node_modules/@medusajs/medusa/dist/commands/db/migrate.js:119`), and that
 * function does not run the workflow. This is the only place that says so;
 * `seed-product.ts` names the channel without claiming who made it.
 *
 * The region carries no `payment_providers`: binding Stripe is T7c's
 * checkbox, and omitting the key rather than writing `[]` is what keeps this
 * row off it -- `setRegionsPaymentProvidersStep` skips any region whose input
 * carries no such key at all
 * (`@medusajs/core-flows/dist/region/steps/set-regions-payment-providers.js`).
 */

import type { ExecArgs, MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, defaultCountries } from "@medusajs/framework/utils";
import {
  createRegionsWorkflow,
  createTaxRatesWorkflow,
  createTaxRegionsWorkflow,
  updateRegionsWorkflow,
  updateStoresWorkflow,
  updateTaxRatesWorkflow,
  updateTaxRegionsWorkflow,
} from "@medusajs/medusa/core-flows";

import { PRODUCT_TIERS } from "../commerce/product-model";
import { ESTONIAN_STANDARD_VAT_PERCENT, EU_MEMBER_STATE_CODES, TAX_PROVIDER_ID, VAT_RATE_CODE, VAT_RATE_NAME } from "../commerce/tax-model";

/**
 * The one region every tier prices into, and the natural key `applyRegion`
 * looks it up by.
 *
 * Unlike a product handle, this key is what the Admin shows and lets an
 * operator edit: renaming the region there makes the next `predeploy` find no
 * match and create a second one beside it.
 */
export const REGION_NAME = "Worldwide";

/**
 * Every country Medusa knows, ISO 3166-1 alpha-2, sorted -- not a subset
 * somebody chose. `defaultCountries.length` is 250 in this checkout
 * (verified: `node -e "console.log(require('@medusajs/utils').defaultCountries.length)"`),
 * a superset of the 27 EU states {@link EU_MEMBER_STATE_CODES} taxes.
 */
const WORLDWIDE_COUNTRY_CODES: readonly string[] = defaultCountries
  .map((country) => country.alpha2)
  .sort((left, right) => left.localeCompare(right));

/** All three tiers share one currency (decision 007); read it rather than restate it. */
const STORE_CURRENCY = PRODUCT_TIERS[0]!.currency;

export type CommerceRecord =
  | {
      /**
       * Whether a price denominated in this currency contains its tax.
       * `false`: net prices, VAT added -- decision 008. Moves only together
       * with the region record's own flag below; a price with no matching
       * preference is read as tax-exclusive regardless of either one
       * (`node_modules/@medusajs/pricing/dist/services/pricing-module.js:237`).
       */
      readonly kind: "store-currency";
      readonly key: string;
      readonly currencyCode: string;
      readonly taxInclusivePrices: boolean;
    }
  | {
      readonly kind: "region";
      readonly key: string;
      readonly name: string;
      readonly currencyCode: string;
      readonly countryCodes: readonly string[];
      readonly taxInclusivePrices: boolean;
      /** `true` -- explicit, not `@medusajs/region/dist/models/region.js:12`'s default, so this record still says so once that default changes. */
      readonly automaticTaxes: boolean;
    }
  | {
      /** One EU member state's tax region and its single, default rate. */
      readonly kind: "tax-region";
      readonly key: string;
      readonly countryCode: string;
      readonly name: string;
      readonly ratePercent: number;
      readonly code: string;
      readonly providerId: string;
    };

/** Applies one record by its natural key. Applying it twice is applying it once. */
export interface CommerceConfigurationTarget {
  apply(record: CommerceRecord): Promise<void>;
}

/**
 * The configuration as records, in dependency order: the currency's tax
 * treatment first, because it governs how every price this deployment holds
 * is read, including the product price `seed:product` writes; the region
 * second; the tax regions last, one per {@link EU_MEMBER_STATE_CODES} entry
 * and none wider -- `commerce/tax-model.ts` is why there is no rest-of-world
 * region.
 */
export function commerceRecords(): readonly CommerceRecord[] {
  return [
    {
      kind: "store-currency",
      key: STORE_CURRENCY,
      currencyCode: STORE_CURRENCY,
      taxInclusivePrices: false,
    },
    {
      kind: "region",
      key: REGION_NAME,
      name: REGION_NAME,
      currencyCode: STORE_CURRENCY,
      countryCodes: WORLDWIDE_COUNTRY_CODES,
      taxInclusivePrices: false,
      automaticTaxes: true,
    },
    ...EU_MEMBER_STATE_CODES.map<CommerceRecord>((countryCode) => ({
      kind: "tax-region",
      key: countryCode,
      countryCode,
      name: VAT_RATE_NAME,
      ratePercent: ESTONIAN_STANDARD_VAT_PERCENT,
      code: VAT_RATE_CODE,
      providerId: TAX_PROVIDER_ID,
    })),
  ];
}

export interface CommerceConfigurationSummary {
  readonly records: number;
}

export async function configureCommerce(target: CommerceConfigurationTarget): Promise<CommerceConfigurationSummary> {
  const records = commerceRecords();
  for (const record of records) {
    await target.apply(record);
  }
  return { records: records.length };
}

/**
 * Applies the declared configuration to a running Medusa application.
 *
 * Every method is a lookup by natural key followed by a create **or** an
 * update, never a bare create.
 */
export class MedusaCommerceConfigurationTarget implements CommerceConfigurationTarget {
  constructor(private readonly container: MedusaContainer) {}

  private get query() {
    return this.container.resolve(ContainerRegistrationKeys.QUERY);
  }

  private async one<T>(entity: string, fields: string[], filters: Record<string, unknown>): Promise<T | undefined> {
    const { data } = await this.query.graph({ entity, fields, filters });
    return data[0] as T | undefined;
  }

  async apply(record: CommerceRecord): Promise<void> {
    switch (record.kind) {
      case "store-currency":
        return this.applyStoreCurrency(record);
      case "region":
        return this.applyRegion(record);
      case "tax-region":
        return this.applyTaxRegion(record);
    }
  }

  /**
   * Writes the currency's tax-inclusivity preference, comparing before it
   * writes so an unchanged run touches nothing. The flag lives in the
   * pricing module's `price_preference`, not on `store` -- decision `007`'s
   * "What tax-inclusive costs" section has the trace. Other supported
   * currencies, if any, are handed back unchanged: `updateStoresWorkflow`
   * replaces the whole list.
   */
  private async applyStoreCurrency(record: Extract<CommerceRecord, { kind: "store-currency" }>): Promise<void> {
    const currency = record.currencyCode.toLowerCase();
    const preference = await this.one<{ is_tax_inclusive?: boolean }>(
      "price_preference",
      ["id", "attribute", "value", "is_tax_inclusive"],
      { attribute: "currency_code", value: currency },
    );
    if (preference?.is_tax_inclusive === record.taxInclusivePrices) return;

    const store = await this.one<{
      id: string;
      supported_currencies?: { currency_code?: string; is_default?: boolean }[];
    }>("store", ["id", "supported_currencies.currency_code", "supported_currencies.is_default"], {});
    if (store === undefined) {
      throw new Error("No store exists; run Medusa's defaults first");
    }

    const supported = (store.supported_currencies ?? []).filter(
      (entry): entry is { currency_code: string; is_default?: boolean } => typeof entry.currency_code === "string",
    );
    if (!supported.some((entry) => entry.currency_code.toLowerCase() === currency)) {
      throw new Error(`The store does not support ${record.currencyCode}; it cannot price anything this deployment sells`);
    }

    await updateStoresWorkflow(this.container).run({
      input: {
        selector: { id: store.id },
        update: {
          supported_currencies: supported.map((entry) => {
            const code = entry.currency_code.toLowerCase();
            const carried = { currency_code: code, is_default: entry.is_default === true };
            return code === currency ? { ...carried, is_tax_inclusive: record.taxInclusivePrices } : carried;
          }),
        },
      },
    });
  }

  /**
   * Converges the one region on its declared name, currency, country list
   * and tax flags, lowercasing country codes at this boundary --
   * `RegionModuleService.normalizeInput` lowercases whatever `countries` it
   * is given regardless
   * (`node_modules/@medusajs/region/dist/services/region-module.js:129`), so
   * `iso_2` rows are always stored lowercase and this file matches that
   * rather than fighting it on every later read. Re-issues its update
   * whenever the region exists rather than comparing first; the end state is
   * identical either way.
   */
  private async applyRegion(record: Extract<CommerceRecord, { kind: "region" }>): Promise<void> {
    const countries = record.countryCodes.map((code) => code.toLowerCase());
    const currencyCode = record.currencyCode.toLowerCase();
    const existing = await this.one<{ id: string }>("region", ["id"], { name: record.name });

    if (existing === undefined) {
      await createRegionsWorkflow(this.container).run({
        input: {
          regions: [
            {
              name: record.name,
              currency_code: currencyCode,
              countries,
              automatic_taxes: record.automaticTaxes,
              is_tax_inclusive: record.taxInclusivePrices,
            },
          ],
        },
      });
      return;
    }

    await updateRegionsWorkflow(this.container).run({
      input: {
        selector: { id: existing.id },
        update: {
          name: record.name,
          currency_code: currencyCode,
          countries,
          automatic_taxes: record.automaticTaxes,
          is_tax_inclusive: record.taxInclusivePrices,
        },
      },
    });
  }

  /**
   * Converges one EU member state's tax region and its single default rate.
   * Lowercased at this boundary for the same reason as {@link applyRegion}:
   * `TaxModuleService.prepareTaxRegionInputForCreate` normalizes
   * `country_code` to lowercase regardless
   * (`node_modules/@medusajs/tax/dist/services/tax-module-service.js:290-291`,
   * `normalizeRegionCodes` at `:448-450`). The provider is converged, not
   * merely set on create, because nothing defaults it -- see
   * `tax-model.ts`'s `TAX_PROVIDER_ID` for why an unset one is an HTTP
   * Internal Server Error rather than an untaxed price. The rate is
   * re-issued whenever it exists, for the same reason `applyRegion` does.
   */
  private async applyTaxRegion(record: Extract<CommerceRecord, { kind: "tax-region" }>): Promise<void> {
    const countryCode = record.countryCode.toLowerCase();
    let region = await this.one<{ id: string; provider_id: string | null }>("tax_region", ["id", "provider_id"], {
      country_code: countryCode,
    });

    if (region === undefined) {
      const { result } = await createTaxRegionsWorkflow(this.container).run({
        input: [{ country_code: countryCode, provider_id: record.providerId }],
      });
      region = { id: result[0]!.id, provider_id: record.providerId };
    } else if (region.provider_id !== record.providerId) {
      await updateTaxRegionsWorkflow(this.container).run({ input: [{ id: region.id, provider_id: record.providerId }] });
    }

    const rate = await this.one<{ id: string }>("tax_rate", ["id"], { tax_region_id: region.id, code: record.code });

    if (rate === undefined) {
      await createTaxRatesWorkflow(this.container).run({
        input: [{ tax_region_id: region.id, name: record.name, code: record.code, rate: record.ratePercent, is_default: true }],
      });
      return;
    }

    await updateTaxRatesWorkflow(this.container).run({
      input: { selector: { id: rate.id }, update: { name: record.name, rate: record.ratePercent } },
    });
  }
}

/**
 * The third step of `npm run predeploy` -- after `medusa db:migrate`, before
 * `seed:product`. Reads no environment variable: everything applied here is
 * frozen in `tax-model.ts` and `product-model.ts` and identical in every
 * environment.
 */
export default async function configureCommerceCommand({ container }: ExecArgs): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const summary = await configureCommerce(new MedusaCommerceConfigurationTarget(container));
  logger.info(`commerce configuration applied: records=${String(summary.records)}`);
}
