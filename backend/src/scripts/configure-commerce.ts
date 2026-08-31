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
 * stops at the first refusal. {@link MedusaCommerceConfigurationTarget}'s
 * `store-currency` branch is exercised by that file's "MedusaCommerceConfigurationTarget
 * applyStoreCurrency" suite, which constructs it directly against a fake
 * container: a stub `query.graph` answering only the `store` and
 * `price_preference` entities `applyStoreCurrency` reads, and
 * `@medusajs/medusa/core-flows`'s `updateStoresWorkflow` replaced by
 * `vi.mock`. Its `region` and `tax-region` branches (`applyRegion`,
 * `applyTaxRegion`) remain unexercised by any test in this repository.
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
 * The region's `payment_providers` is `STRIPE_PAYMENT_PROVIDER_ID`
 * (`../config/payment.ts`), T7c's checkbox: `setRegionsPaymentProvidersStep`
 * requires the id to already resolve to an enabled provider --
 * `validatePaymentProvidersExists` throws `MedusaError.Types.NOT_FOUND`
 * otherwise
 * (`@medusajs/core-flows/dist/region/steps/set-regions-payment-providers.js:6-16`).
 * That is a database row and not a container registration, so what satisfies
 * it is `registerProvidersInDb`, which upserts every registered provider
 * `is_enabled: true` (`@medusajs/payment/dist/loaders/providers.js:81-95`),
 * reached through the module loaders at
 * `@medusajs/medusa/dist/loaders/index.js:121`. `medusa exec` runs those
 * loaders (`@medusajs/medusa/dist/commands/exec.js:67`) before it invokes this
 * file's `default export` (`:76`).
 *
 * Sending the key on every run is what makes the binding exact: the same step
 * dismisses any other provider linked to this region
 * (`set-regions-payment-providers.js:69-83`) and skips links that already
 * exist (`:87-93`). So a provider added to this region in the Admin does not
 * survive the next `predeploy`.
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
import { STRIPE_PAYMENT_PROVIDER_ID } from "../config/payment";

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
       * `true`: the advertised price is what the customer pays and Estonia's
       * VAT, where it applies, comes out of it -- decision 009, which
       * supersedes 008's net-price ruling. Moves only together with the
       * region record's own flag below; a price with no matching preference
       * is read as tax-exclusive regardless of either one
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
      /**
       * The provider ids this region offers at checkout, bound here rather
       * than as a separate apply -- `setRegionsPaymentProvidersStep` filters
       * its input with `isDefined(payment_providers)`
       * (`@medusajs/core-flows/dist/region/steps/set-regions-payment-providers.js:51-53`),
       * so a step input carrying no such key is skipped rather than cleared.
       * This field is required, so no `CommerceRecord` can reach that branch.
       */
      readonly paymentProviderIds: readonly string[];
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
      taxInclusivePrices: true,
    },
    {
      kind: "region",
      key: REGION_NAME,
      name: REGION_NAME,
      currencyCode: STORE_CURRENCY,
      countryCodes: WORLDWIDE_COUNTRY_CODES,
      taxInclusivePrices: true,
      automaticTaxes: true,
      paymentProviderIds: [STRIPE_PAYMENT_PROVIDER_ID],
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
   * Converges the store on supporting the currency, rather than refusing
   * when it does not: Medusa's own `createDefaultStoreStep` hardcodes a
   * EUR-only `supported_currencies` on the store it creates
   * (`@medusajs/core-flows/dist/defaults/steps/create-default-store.js:41-47`,
   * carrying Medusa's own `// TODO: Revisit for a more sophisticated
   * approach`), so a clean database never already supports this
   * deployment's currency and refusing here would make `predeploy`
   * permanently unable to reach a paid-order-ready state.
   *
   * Structural convergence (is the currency supported, is it the one
   * `is_default`, and is it the only one) is checked directly against
   * `store`, not inferred from `price_preference` alone -- a database where
   * the tax-inclusivity preference row exists but the store itself was never
   * updated (a hand-edited row; `update-stores.js` runs before
   * `update-price-preferences-as-array.js`, so a crash between the two
   * leaves the opposite asymmetry -- store updated, preference missing) must
   * not read as "done" and skip the currency fix. Both must independently
   * agree before this method writes nothing.
   *
   * Every other currency the store already supports (Medusa's `eur`, on a
   * clean database) is kept rather than dropped -- `updateStoresWorkflow`
   * replaces the whole list, so keeping it means restating it -- but
   * demoted off `is_default`: exactly one currency carries it, and this
   * deployment prices only in {@link STORE_CURRENCY}. A store that also
   * supports a currency nothing here prices in is not a defect this row
   * needs to correct.
   */
  private async applyStoreCurrency(record: Extract<CommerceRecord, { kind: "store-currency" }>): Promise<void> {
    const currency = record.currencyCode.toLowerCase();

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
    const structurallyConverged = MedusaCommerceConfigurationTarget.isSoleDefault(supported, currency);

    const preference = await this.one<{ is_tax_inclusive?: boolean }>(
      "price_preference",
      ["id", "attribute", "value", "is_tax_inclusive"],
      { attribute: "currency_code", value: currency },
    );
    if (structurallyConverged && preference?.is_tax_inclusive === record.taxInclusivePrices) return;

    const others = supported.filter((entry) => entry.currency_code.toLowerCase() !== currency);
    await updateStoresWorkflow(this.container).run({
      input: {
        selector: { id: store.id },
        update: {
          supported_currencies: [
            ...others.map((entry) => ({ currency_code: entry.currency_code.toLowerCase(), is_default: false })),
            { currency_code: currency, is_default: true, is_tax_inclusive: record.taxInclusivePrices },
          ],
        },
      },
    });

    // The refusal survives as a post-condition rather than a pre-emptive
    // block: `updateStoresWorkflow` is expected to converge the store above,
    // and this only fires if it silently did not -- a real failure this
    // deployment still cannot price against, not a state a clean or
    // already-converged database ever reaches. Re-asserts the same
    // `isSoleDefault` predicate the early return above checks, not presence
    // alone: Medusa persisting `currency` while silently dropping
    // `is_default` -- the half-failure this guard exists for -- must not
    // pass it. It does not re-check `price_preference`; a wrong
    // tax-inclusivity flag on an otherwise-successful write is not this
    // guard's concern, only whether the store itself now agrees with what
    // was sent.
    const after = await this.one<{ supported_currencies?: { currency_code?: string; is_default?: boolean }[] }>(
      "store",
      ["supported_currencies.currency_code", "supported_currencies.is_default"],
      { id: store.id },
    );
    const afterSupported = (after?.supported_currencies ?? []).filter(
      (entry): entry is { currency_code: string; is_default?: boolean } => typeof entry.currency_code === "string",
    );
    if (!MedusaCommerceConfigurationTarget.isSoleDefault(afterSupported, currency)) {
      throw new Error(
        `The store does not have ${record.currencyCode} as its sole default currency; it cannot price anything this deployment sells`,
      );
    }
  }

  /**
   * Whether `currency` is present in `supported`, carries `is_default`, and
   * is the only entry that does -- the structural half of convergence
   * {@link applyStoreCurrency} checks both before writing, to decide whether
   * writing is needed at all, and after, to confirm the write landed. A
   * second `is_default` entry (unreachable through this class, since every
   * write it issues demotes every other entry, but reachable by a
   * hand-edited row) fails this the same way absence does.
   */
  private static isSoleDefault(
    supported: readonly { currency_code: string; is_default?: boolean }[],
    currency: string,
  ): boolean {
    const target = supported.find((entry) => entry.currency_code.toLowerCase() === currency);
    const defaultCount = supported.filter((entry) => entry.is_default === true).length;
    return target !== undefined && target.is_default === true && defaultCount === 1;
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
              payment_providers: [...record.paymentProviderIds],
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
          payment_providers: [...record.paymentProviderIds],
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
