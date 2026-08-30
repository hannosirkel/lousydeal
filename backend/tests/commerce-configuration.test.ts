import { describe, expect, it } from "vitest";

import { STRIPE_PAYMENT_PROVIDER_ID } from "../src/config/payment";
import { EU_MEMBER_STATE_CODES } from "../src/commerce/tax-model";
import {
  type CommerceRecord,
  type CommerceConfigurationTarget,
  commerceRecords,
  configureCommerce,
} from "../src/scripts/configure-commerce";

/**
 * The 27 EU member states, written out here rather than read from
 * `tax-model.ts`, so that the assertions below compare that list to something
 * that does not move with it. Asserting `EU_MEMBER_STATE_CODES.length` against
 * `EU_MEMBER_STATE_CODES` would let a member state be deleted with the suite
 * still green, and ship a deployment charging that country's buyers no VAT.
 *
 * The truth-maker is accession, not this file: the list changes when a state
 * joins or withdraws, and both sides are then edited together on purpose.
 */
const EU_MEMBER_STATES: readonly string[] = [
  "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GR", "HR",
  "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI",
  "SK",
];

describe("commerceRecords", () => {
  const records = commerceRecords();
  const taxRegions = records.filter((record) => record.kind === "tax-region");

  it("holds tax-model.ts's member-state list to these 27 literal codes", () => {
    expect([...EU_MEMBER_STATE_CODES]).toEqual([...EU_MEMBER_STATES]);
  });

  // The record order is the reason for the record layout, not an accident of
  // it: `commerceRecords`'s own doc gives the currency's tax treatment first
  // because it governs how every price is read, then the region, then the tax
  // regions. Reversing the array has to go red.
  it("declares its records in dependency order: the currency, then the region, then one tax region per member state", () => {
    expect(records.map((record) => record.kind)).toEqual([
      "store-currency",
      "region",
      ...EU_MEMBER_STATES.map(() => "tax-region"),
    ]);
  });

  it("declares exactly one store-currency record, net of tax", () => {
    const currencyRecords = records.filter((record) => record.kind === "store-currency");
    expect(currencyRecords).toHaveLength(1);
    expect(currencyRecords[0]).toMatchObject({ currencyCode: "usd", taxInclusivePrices: false });
  });

  it("declares exactly one region, worldwide, net of tax, with automatic tax calculation on", () => {
    const regionRecords = records.filter((record) => record.kind === "region");
    expect(regionRecords).toHaveLength(1);
    const region = regionRecords[0]!;
    expect(region).toMatchObject({ name: "Worldwide", currencyCode: "usd", taxInclusivePrices: false, automaticTaxes: true });
    // Every country Medusa knows, not a hand-picked subset. This assertion is
    // a floor, deliberately, not the count: `defaultCountries.length` is 250
    // at `@medusajs/utils` 2.18.0, measured in this checkout by
    // `node -e "console.log(require('@medusajs/utils').defaultCountries.length)"`.
    // A version bump that adds or drops a country is not a regression in this
    // row, so the assertion does not pin the number the comment reports.
    expect(region.countryCodes.length).toBeGreaterThan(200);
  });

  // T7c's checkbox: the region carries exactly the one provider id
  // `payment.ts` derives -- not a literal, so a change to either half of
  // `STRIPE_PAYMENT_PROVIDER_ID` cannot drift unnoticed from what the region
  // is bound to, and not merely "contains it", so a second id added beside it
  // or the field dropped both go red.
  it("binds the region to exactly the one provider id payment.ts derives, and no other", () => {
    const regionRecords = records.filter((record) => record.kind === "region");
    const region = regionRecords[0]!;
    expect(region.paymentProviderIds).toEqual([STRIPE_PAYMENT_PROVIDER_ID]);
  });

  // The row's whole tax claim: a tax region for each EU member state, all
  // at Estonia's rate, and none for anywhere else -- no rest-of-world
  // region exists to bring VAT to a destination outside the Union.
  it("declares exactly one tax region per EU member state, at Estonia's rate, and none wider", () => {
    expect(taxRegions.map((record) => record.countryCode)).toEqual([...EU_MEMBER_STATES]);
    for (const record of taxRegions) {
      expect(record).toMatchObject({ ratePercent: 24, providerId: "tp_system" });
    }
  });

  it("declares no tax region for a country outside the EU member-state list", () => {
    const nonMemberSample = ["US", "GB", "CH", "JP", "AU"];
    for (const code of nonMemberSample) {
      expect(EU_MEMBER_STATE_CODES).not.toContain(code);
      expect(taxRegions.some((record) => record.countryCode === code)).toBe(false);
    }
  });

  it("is a pure function: two calls return equal records", () => {
    expect(commerceRecords()).toEqual(commerceRecords());
  });
});

/**
 * A `CommerceConfigurationTarget` that behaves the way a real backend must:
 * `apply` is a lookup by natural key (`kind`/`key`) followed by a create *or*
 * an update, modelled here as a `Map.set`. `calls` records every invocation,
 * so an assertion about the second run's behaviour does not have to trust a
 * mock's call count.
 */
class RecordingCommerceConfigurationTarget implements CommerceConfigurationTarget {
  readonly calls: CommerceRecord[] = [];
  private readonly applied = new Map<string, CommerceRecord>();

  async apply(record: CommerceRecord): Promise<void> {
    this.calls.push(record);
    this.applied.set(`${record.kind}/${record.key}`, record);
  }

  get appliedKeys(): readonly string[] {
    return [...this.applied.keys()].sort();
  }
}

describe("configureCommerce run twice", () => {
  it("is called once per record on each run, and converges on one row per natural key", async () => {
    const target = new RecordingCommerceConfigurationTarget();

    await configureCommerce(target);
    await configureCommerce(target);

    expect(target.calls).toHaveLength(commerceRecords().length * 2);

    const expectedKeys = commerceRecords()
      .map((record) => `${record.kind}/${record.key}`)
      .sort();
    expect(target.appliedKeys).toEqual(expectedKeys);
  });
});
