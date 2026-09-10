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
 * ## Twenty-seven rates, not one — and decision `013` is why
 *
 * This said "One rate, not twenty-seven": every EU destination charged
 * Estonia's domestic rate, on the operator's reading of Article 59c that its
 * cross-border supplies were below the threshold requiring each destination's
 * own. `008` has that chain and says what reopens the question.
 *
 * **The operator registered for the Union One Stop Shop on 2026-09-09**, which
 * is what reopened it. OSS *is* destination-rate taxation: registering is the
 * opt-in, and the threshold simplification goes with it.
 *
 * **The rates take effect on 1 October 2026, not today.** Article 57d of
 * Implementing Regulation (EU) No 282/2011 starts the Union scheme on the
 * first day of the quarter after the application, and EMTA's own page carries
 * the same rule with an on-point example. Applying them to a supply made in
 * September would misreport that quarter — and cannot happen here, because §23
 * keeps live payment keys out until the publication gate, so this deployment
 * can make no supply at all before then.
 *
 * **One thing the operator should check against the ledger rather than take
 * from this file.** Destination liability and OSS registration are different
 * questions: if cross-border B2C supplies had already crossed the €10,000
 * Article 59c threshold earlier in 2026, destination VAT was due from the
 * supply that crossed it, registration or no registration. Nothing sold here
 * has crossed anything — the shop has never taken a live payment — but the
 * rule is written down because it is the trap, not the registration date.
 *
 * ## Verified against TEDB on 2026-09-10, and how
 *
 * All 27 agree; nothing was changed. The pass was made through the
 * Commission's **VAT Retrieval Service**
 * (`https://ec.europa.eu/taxation_customs/tedb/ws/VatRetrievalService`), which
 * is the SOAP interface TEDB provides for exactly this use — the header below
 * records that the rates PDF was discontinued and the portal became an
 * interactive application, and this is the machine-readable door into that
 * application rather than a substitute for it. Queried twice: at
 * `situationOn = 2026-10-01`, the date these take effect, and across
 * `2026-09-10 → 2026-12-31`, which would have surfaced a scheduled change.
 * There is none.
 *
 * The four rates that moved since 2024 were each confirmed against the member
 * state's own authority as well: Finančná správa for SK 23%, EMTA for EE 24%,
 * ANAF for RO 21% (Legea nr. 141/2025, Monitorul Oficial nr. 699/25.07.2025),
 * and vero.fi for FI 25.5%. A rate that moved once is the one most likely to
 * be wrong in a compilation.
 *
 * **A pass is dated, not permanent.** TEDB content is member-state
 * self-reported, and this holds unless one legislates after 2026-09-10.
 *
 * ## The standard rate is the right rate here, and one thing would change that
 *
 * Checked against TEDB's reduced-rate categories with their CN/CPA code lists:
 * no member state reduces electronically supplied services other than
 * e-publications and broadcasting, so the certificate is standard-rated
 * everywhere; ceramic mugs have no reduced hit anywhere; stickers appear in
 * reduced lists only under books, periodicals and artists' photographs, which
 * a decorative vinyl sticker is not; and every apparel or headgear hit sits
 * inside a *medical aids* or *children's* category.
 *
 * **The live conditional is child sizes.** Luxembourg applies 3% to clothing
 * and headgear for children under 14, and Ireland zero-rates children's
 * clothing. The catalogue is adult-only, so this is inert — but adding a child
 * size would make this table over-collect in LU and IE, and since the trader
 * absorbs the VAT, over-collection costs the trader and still misstates the
 * OSS return.
 *
 * ## Where these numbers come from
 *
 * The European Commission's periodic "VAT rates applied in the Member States"
 * PDF was **discontinued after January 2021**, and its OSS portal now points
 * at the Taxes in Europe Database instead. TEDB is the designated source and
 * is an interactive application; this table was not read out of it.
 *
 * What it rests on is two independent full-27 compilations that agree on every
 * rate — Tax Foundation, January 2026, and ASD Group, June 2026 — with every
 * rate that moved since 2024 corroborated separately against the change that
 * moved it:
 *
 *   SK  20% → 23%    1 January 2025   (VAT Act amendment, signed 18.10.2024)
 *   EE  22% → 24%    1 July 2025      (EMTA, and this file's own header)
 *   RO  19% → 21%    1 August 2025    (Law No. 141/2025, promulgated 25.07)
 *   FI  24% → 25.5%  1 September 2024 (outside the window, and the one a
 *                                      stale source is most likely to miss)
 *
 * No member state has a standard-rate change effective during 2026. Lithuania
 * debated 22% in 2025 and did not adopt it; Romania also merged its reduced
 * rates, which is irrelevant here but marks any Romanian source predating
 * August 2025 as stale throughout.
 *
 * **A manual pass against TEDB before the publication gate is a gate item**,
 * not something this file claims to have done.
 *
 * ## What this table does not answer
 *
 * **Special territories, and they are wrong today in both directions.** Medusa
 * routes tax on `country_code`, so a delivery to the Canary Islands resolves as
 * Spain, to Åland as Finland, to Heligoland as Germany — and each of those is
 * **outside the EU VAT area entirely** under Article 6 of the Directive, so the
 * correct answer is no EU VAT at all. Portugal is worse than a boolean: the
 * Azores are 16% and Madeira 22% against a mainland 23%, routed by island.
 * Greece reduces to 17% on some Aegean islands, expanded on 1 January 2026, and
 * whether a foreign distance seller may apply it is **unresolved** — 24% is the
 * conservative answer and over-remits rather than under-remits.
 *
 * Northern Ireland is the other half: **goods** delivered there are inside the
 * EU VAT area under the Windsor Framework and go through Union OSS at the UK's
 * 20%, while **digital services to NI are out of scope entirely**. So the one
 * shop needs two different answers for the same postcode depending on which of
 * its two products is in the parcel.
 *
 * None of that is built here. It is a row of its own, and it is recorded in
 * `status.md` rather than left for somebody to discover from a tax bill.
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
 * Each member state's standard rate, as a percentage.
 *
 * Sorted by code, and the same 27 {@link EU_MEMBER_STATE_CODES} names — the
 * list below is what that constant is now derived from, so the two cannot
 * disagree about which countries exist.
 *
 * Percentages and not fractions, because that is what Medusa's `tax_rate.rate`
 * takes and converting in two places is how a rate ends up a hundredth of
 * itself. Finland is `25.5` and is the reason this is not an integer.
 */
export const EU_STANDARD_VAT_PERCENTS: Readonly<Record<string, number>> = {
  AT: 20,
  BE: 21,
  BG: 20,
  CY: 19,
  CZ: 21,
  DE: 19,
  DK: 25,
  EE: 24,
  ES: 21,
  FI: 25.5,
  FR: 20,
  // **TEDB codes Greece `EL`, not `GR`.** Medusa routes on ISO 3166-1, which
  // is `GR`, so this key is right and the next person to check these against
  // the Commission's database should expect the mismatch rather than read it
  // as a missing country.
  GR: 24,
  HR: 25,
  HU: 27,
  IE: 23,
  IT: 22,
  LT: 21,
  LU: 17,
  LV: 21,
  MT: 18,
  NL: 21,
  PL: 23,
  PT: 23,
  RO: 21,
  SE: 25,
  SI: 22,
  SK: 23,
};

/**
 * Estonia's own rate, still named because two other things read it: the
 * merchant's own accounting, and anything asking what this company charges at
 * home rather than what a buyer's country charges.
 */
export const ESTONIAN_STANDARD_VAT_PERCENT = EU_STANDARD_VAT_PERCENTS.EE!;

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
export const EU_MEMBER_STATE_CODES: readonly string[] = Object.keys(EU_STANDARD_VAT_PERCENTS).sort();

/**
 * What the Admin shows against a rate, per country.
 *
 * Per country because twenty-seven rates all called "Estonian VAT" is a
 * screen an operator cannot read, and because the name is the only place the
 * destination appears — the code below is deliberately not per-country.
 */
export function vatRateName(countryCode: string): string {
  return `${countryCode.toUpperCase()} VAT`;
}

/**
 * The rate's code, and the natural key its upsert addresses within a tax
 * region. Changing this string does not rename a rate -- it creates a second
 * one beside the first.
 *
 * **So it keeps the value it has always had, and the value is now a
 * misnomer.** `EE-VAT` was the code when every region carried Estonia's rate;
 * a German region's rate is keyed `EE-VAT` too. Making it `${country}-VAT`
 * would read better and would leave the old rate behind in every region that
 * already has one — two rates in one region, both `is_default`, on a database
 * nobody was watching. The key is a key. {@link vatRateName} is what a person
 * reads.
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
