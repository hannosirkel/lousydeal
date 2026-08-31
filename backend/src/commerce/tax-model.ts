/**
 * The tax treatment this deployment charges.
 *
 * **Every tier's price is what the customer pays. Estonia's VAT, where it
 * applies, is absorbed by the merchant rather than added on top.**
 * `docs/decisions/009-merchant-absorbs-the-vat.md` is the operator's ruling,
 * made 2026-08-31, and it supersedes the tax half of `008` (net prices, VAT
 * added for an EU buyer) -- itself a supersession of `007`'s tax half
 * (tax-inclusive, no tax configured at all). `009` is not a reversion to
 * `007`: `007` configured no tax region and no tax rate; this file still
 * declares both, for the same 27 EU member states at the same rate. What
 * changed across all three rulings is only who pays the VAT `008` and `009`
 * both compute -- nobody under `007`, the buyer under `008`, the merchant
 * under `009`. `is_tax_inclusive` is `true` on both the store currency and
 * the region -- `backend/src/scripts/configure-commerce.ts` moves the two
 * together, because a price with no matching preference is read as
 * tax-exclusive regardless of what either flag says elsewhere
 * (`node_modules/@medusajs/pricing/dist/services/pricing-module.js:237`).
 *
 * ## The rate is 24%, and it has been since 1 July 2025
 *
 * Carried from `/home/hanno/app/plepic/backend/src/commerce/tax-model.ts`
 * rather than restated from memory, per the operator's ruling that Lousy Deal
 * takes Plepic's tax treatment. The Estonian Tax and Customs Board (Maksu- ja
 * Tolliamet), *VAT rates and supply exempt from tax -- standard VAT rate*:
 * *"From 1 July 2025, the standard rate of VAT in Estonia is 24% instead of
 * 22%."*
 * <https://www.emta.ee/en/business-client/taxes-and-payment/value-added-tax/vat-rates-and-supply-exempt-tax/standard-vat-rate>
 *
 * ## One rate, not twenty-seven
 *
 * Every EU destination is charged **Estonia's domestic rate**. The supplier
 * -- Aislopica OÜ -- is established in Estonia and VAT registered there, and
 * on the operator's reading of Article 59c its supplies are below the
 * threshold that would otherwise require each destination's own rate.
 * `docs/decisions/008-plepic-tax-treatment.md` has the full chain, the
 * citations, and what reopens this file when the threshold is crossed; it is
 * not restated here.
 *
 * ## No VAT outside the EU
 *
 * There is deliberately no rest-of-world tax region. An export carries no EU
 * VAT at all, and a destination with no tax region resolves, through
 * Medusa's `automatic_taxes`, to a cart with no tax line -- the correct
 * answer, not an omission. That resolution is
 * `TaxModuleService.getTaxLines`, which returns `[]` as soon as the address
 * matches no parent tax region
 * (`node_modules/@medusajs/tax/dist/services/tax-module-service.js:175-178`).
 * `configure-commerce.ts` writes a tax region for exactly
 * {@link EU_MEMBER_STATE_CODES} and nothing wider.
 *
 * ## One definition of "the EU"
 *
 * Plepic keeps {@link EU_MEMBER_STATE_CODES} in its shipping model and
 * re-exports it into tax, because a shipping zone and a VAT territory are two
 * different questions asked of the same countries. This repository has no
 * shipping model, so the list lives here, where the one question that is
 * asked of it is asked.
 */

/**
 * The 27 EU member states, ISO 3166-1 alpha-2, sorted.
 *
 * Membership and nothing wider -- not a customs or VAT territory beyond it.
 * Copied from Plepic's own `EU_MEMBER_STATE_CODES`. Do not add a 28th without
 * an accession, and do not remove one without a withdrawal:
 * `tests/commerce-configuration.test.ts` holds this list against the 27 codes
 * written out literally there, so either edit goes red until that list is
 * changed too.
 */
export const EU_MEMBER_STATE_CODES: readonly string[] = [
  "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GR", "HR",
  "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI",
  "SK",
];

/**
 * Estonia's standard VAT rate, as a percentage.
 *
 * 24% since 1 July 2025, up from 22%. See this file's header for the
 * Estonian Tax and Customs Board citation -- change both together, because
 * the header is the only thing that says which rate a reader is looking at.
 */
export const ESTONIAN_STANDARD_VAT_PERCENT = 24;

/** What the Admin shows an operator against this rate. */
export const VAT_RATE_NAME = "Estonian VAT";

/**
 * The rate's code, and the natural key its upsert addresses within a tax
 * region. Changing this string does not rename a rate -- it creates a second
 * one beside the first.
 */
export const VAT_RATE_CODE = "EE-VAT";

/**
 * The tax provider every tax region this deployment writes is served by.
 *
 * `defineConfig` installs `Modules.TAX` among its own shared modules
 * (`@medusajs/utils/dist/common/define-config.js`), and `@medusajs/tax`'s
 * provider loader registers everything in `dist/providers` under the key
 * `tp_${identifier}`. The only local provider, `SystemTaxService`
 * (`node_modules/@medusajs/tax/dist/providers/system.js`), has `identifier`
 * `"system"`, so the key is `tp_system` -- installed automatically, naming
 * no entry in `medusa-config.ts`.
 *
 * A tax region has to name it explicitly. `TaxRegion.provider` is
 * `.nullable()` with no default
 * (`node_modules/@medusajs/tax/dist/models/tax-region.js`), and
 * `TaxModuleService.getTaxLines` resolves `parentRegion.provider_id` straight
 * out of the container -- a `null` there is `AwilixResolutionError: Could not
 * resolve 'null'`, an HTTP Internal Server Error rather than an untaxed
 * price. Nothing in
 * `createTaxRegionsWorkflow` defaults it.
 */
export const TAX_PROVIDER_ID = "tp_system";
