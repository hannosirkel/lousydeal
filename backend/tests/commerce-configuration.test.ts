import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it, vi, beforeEach } from "vitest";

import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { STRIPE_PAYMENT_PROVIDER_ID } from "../src/config/payment";
import { PRINTFUL_FULFILMENT_PROVIDER_ID } from "../src/modules/printful/fulfilment-provider";
import { MERCH_SHIPPING_PROFILE } from "../src/scripts/seed-merch";
import { EU_MEMBER_STATE_CODES } from "../src/commerce/tax-model";
import {
  type CommerceRecord,
  type CommerceConfigurationTarget,
  commerceRecords,
  configureCommerce,
  MedusaCommerceConfigurationTarget,
} from "../src/scripts/configure-commerce";

/**
 * `applyStoreCurrency` calls `updateStoresWorkflow(container).run(...)`
 * directly rather than through the container, so it is this module import --
 * not the fake container below -- that has to be replaced. Every other
 * export is passed through real: only `MedusaCommerceConfigurationTarget`'s
 * `store-currency` branch is exercised here, and no other branch calls a
 * workflow.
 */
const updateStoresRun = vi.fn();

/**
 * LD-04 P7b's four applies each call a workflow directly too, and **three
 * mutations survived because nothing drove them**: a flat price with a figure
 * nobody quoted, the wrong provider id, and a missing sales-channel link. The
 * records tell you what was declared; only these tell you what was sent.
 */
const createStockLocationsRun = vi.fn((_input: unknown) => ({ result: [{ id: "sloc_1" }] }));
const batchLinksRun = vi.fn((_input: unknown) => undefined);
const linkSalesChannelsRun = vi.fn((_input: unknown) => undefined);
const createLocationFulfillmentSetRun = vi.fn((_input: unknown) => ({ result: { id: "fuset_1" } }));
const createServiceZonesRun = vi.fn((_input: unknown) => ({ result: [{ id: "serzo_1" }] }));
const createShippingProfilesRun = vi.fn((_input: unknown) => ({ result: [{ id: "sp_1" }] }));
const createShippingOptionsRun = vi.fn((_input: unknown) => ({ result: [{ id: "so_1" }] }));

vi.mock("@medusajs/medusa/core-flows", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@medusajs/medusa/core-flows")>();
  return {
    ...actual,
    updateStoresWorkflow: () => ({ run: updateStoresRun }),
    createStockLocationsWorkflow: () => ({ run: createStockLocationsRun }),
    linkSalesChannelsToStockLocationWorkflow: () => ({ run: linkSalesChannelsRun }),
    batchLinksWorkflow: () => ({ run: batchLinksRun }),
    createLocationFulfillmentSetWorkflow: () => ({ run: createLocationFulfillmentSetRun }),
    createServiceZonesWorkflow: () => ({ run: createServiceZonesRun }),
    createShippingProfilesWorkflow: () => ({ run: createShippingProfilesRun }),
    createShippingOptionsWorkflow: () => ({ run: createShippingOptionsRun }),
  };
});

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
  it("declares its records in dependency order, delivery included", () => {
    // The currency governs how every price is read, so it is first. The
    // region is next. **LD-04 P7b inserts four**, and their order is not
    // cosmetic: the set hangs off the location, the option needs both the
    // zone and the profile to exist, and each apply throws by name rather
    // than creating a second of something it could not find.
    expect(records.map((record) => record.kind)).toEqual([
      "store-currency",
      "region",
      "stock-location",
      "fulfillment-set",
      "shipping-profile",
      "shipping-option",
      ...EU_MEMBER_STATES.map(() => "tax-region"),
    ]);
  });

  describe("the delivery configuration P7a assumed and nothing built", () => {
    it("puts the stock location in the sales channel's reach, which is the whole join", () => {
      // `list-shipping-options-for-cart.js:135-152` walks from the cart's
      // sales channel to its stock locations to their fulfillment sets. A
      // location outside that walk offers a cart nothing, and P7's checkout
      // would show the unavailable notice for every parcel.
      const location = records.find((record) => record.kind === "stock-location");
      expect(location).toMatchObject({ name: "Dispatch", countryCode: "ee" });
    });

    it("covers the same countries the region sells to", () => {
      // A zone narrower than the region sells to a country it then refuses to
      // post to. The operator ruled that out in as many words: "one extra
      // return is ok but closing regions/countries is not".
      const zone = records.find((record) => record.kind === "fulfillment-set");
      const region = records.find((record) => record.kind === "region");
      expect(zone).toBeDefined();
      expect(region).toBeDefined();
      if (zone?.kind !== "fulfillment-set" || region?.kind !== "region") throw new Error("unreachable");
      expect(zone.countryCodes).toEqual(region.countryCodes);
      expect(zone.countryCodes.length).toBeGreaterThanOrEqual(200);
    });

    it("names the profile `seed-merch.ts` already puts its products in", () => {
      // Two names for one profile is two profiles, and an option in the wrong
      // one is offered for nothing.
      const profile = records.find((record) => record.kind === "shipping-profile");
      expect(profile).toMatchObject({ name: MERCH_SHIPPING_PROFILE });
    });

    it("binds the option to the Printful provider, calculated and with no price", () => {
      // **Calculated, not flat.** Printful quotes per address and per parcel
      // -- $13.56 to Estonia against $25.56 to Brazil, measured -- so a flat
      // rate would be wrong everywhere but one destination. And a `prices`
      // entry would be a figure nobody quoted, charged to a buyer.
      const option = records.find((record) => record.kind === "shipping-option");
      expect(option).toMatchObject({
        providerId: PRINTFUL_FULFILMENT_PROVIDER_ID,
        profileName: MERCH_SHIPPING_PROFILE,
        serviceZoneName: "Worldwide",
      });
      expect(option).not.toHaveProperty("prices");
      expect(option).not.toHaveProperty("amount");
    });

    it("gives the certificate no profile, which is constraint 4", () => {
      // `seed-product.ts` sends no `shipping_profile_id` and
      // `create-products.js:154` links one only when present. Verified against
      // a real database: `product_shipping_profile` holds the four merch
      // handles and none of the three tiers.
      //
      // **What this does not do is keep postage off a certificate cart**, and
      // the first version of this comment said it did.
      // `list-shipping-options-for-cart.js:203-208` filters on the fulfillment
      // set and the address only -- the profile is not a filter -- so a
      // certificate-only cart with an address *is* offered the option.
      // Measured. What refuses is `calculatePrice`, and what never asks is the
      // storefront.
      const seed = readFileSync(join(__dirname, "../src/scripts/seed-product.ts"), "utf8");
      expect(seed).not.toContain("shipping_profile_id");
      expect(seed).not.toContain(MERCH_SHIPPING_PROFILE);
    });
  });

  it("declares exactly one store-currency record, tax-inclusive", () => {
    const currencyRecords = records.filter((record) => record.kind === "store-currency");
    expect(currencyRecords).toHaveLength(1);
    expect(currencyRecords[0]).toMatchObject({ currencyCode: "usd", taxInclusivePrices: true });
  });

  it("declares exactly one region, worldwide, tax-inclusive, with automatic tax calculation on", () => {
    const regionRecords = records.filter((record) => record.kind === "region");
    expect(regionRecords).toHaveLength(1);
    const region = regionRecords[0]!;
    expect(region).toMatchObject({ name: "Worldwide", currencyCode: "usd", taxInclusivePrices: true, automaticTaxes: true });
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

/**
 * A currency entry as `store.supported_currencies` holds it -- no
 * `is_tax_inclusive` field; that preference lives on `price_preference`,
 * fetched separately below, matching `currency.js`'s `StoreCurrency` model.
 */
type FakeStoreCurrency = { currency_code: string; is_default: boolean };

/**
 * The two rows `applyStoreCurrency` reads and writes, held in one object so
 * the `query.graph` stub and the `updateStoresWorkflow` stub below observe
 * and mutate the same state -- otherwise a write through one and a read
 * through the other would silently diverge, and the test would not be
 * modelling the single database `configure-commerce.ts` assumes.
 */
type FakeWorld = {
  store: { id: string; supported_currencies: FakeStoreCurrency[] };
  pricePreferences: Map<string, boolean>;
};

/**
 * Models Medusa's own default store as `create-default-store.js:41-47`
 * leaves it: EUR, `is_default: true`. `pricePreferences` is empty here, but
 * not because a clean database's is: `createStoresWorkflow` also upserts a
 * `currency_code`/`eur` price-preference row of its own
 * (`create-stores.js:50-63`), timestamped before the `store_currency` rows,
 * so a real clean run does carry one. It is omitted here because nothing in
 * this suite ever queries `eur`'s preference -- `applyStoreCurrency` only
 * reads the row for the currency being applied (`usd`) -- so the omission
 * changes no assertion below.
 */
function eurOnlyWorld(): FakeWorld {
  return {
    store: { id: "store_1", supported_currencies: [{ currency_code: "eur", is_default: true }] },
    pricePreferences: new Map(),
  };
}

/** A `query.graph` that answers only the two entities `applyStoreCurrency` reads. */
function fakeQuery(world: FakeWorld) {
  return {
    graph: vi.fn(async ({ entity, filters }: { entity: string; filters: Record<string, unknown> }) => {
      if (entity === "store") return { data: [{ ...world.store }] };
      if (entity === "price_preference") {
        const isTaxInclusive = world.pricePreferences.get(filters.value as string);
        return { data: isTaxInclusive === undefined ? [] : [{ is_tax_inclusive: isTaxInclusive }] };
      }
      throw new Error(`commerce-configuration.test.ts does not model entity ${entity}`);
    }),
  };
}

function fakeContainer(world: FakeWorld): MedusaContainer {
  const query = fakeQuery(world);
  return {
    resolve: (key: string) => {
      if (key === ContainerRegistrationKeys.QUERY) return query;
      throw new Error(`commerce-configuration.test.ts does not model container key ${String(key)}`);
    },
  } as unknown as MedusaContainer;
}

const usdRecord: Extract<CommerceRecord, { kind: "store-currency" }> = {
  kind: "store-currency",
  key: "usd",
  currencyCode: "usd",
  taxInclusivePrices: true,
};

describe("MedusaCommerceConfigurationTarget applyStoreCurrency", () => {
  // `updateStoresRun`'s mock below needs the world keyed by store id, since
  // `applyStoreCurrency` only threads the id through `selector`, not the
  // world object itself.
  const worlds = new Map<string, FakeWorld>();

  beforeEach(() => {
    worlds.clear();
    updateStoresRun.mockReset();
    // The store keeps `currency_code` and `is_default` only, matching
    // `update-stores.js`. Price preferences diverge from it, not mirror it:
    // real Medusa's `updatePricePreferencesAsArrayStep` upserts a row for
    // every currency named in the update regardless of whether
    // `is_tax_inclusive` is given, landing at the schema default `false`
    // (`?? prevEntry?.is_tax_inclusive`, `update-price-preferences-as-array.js:39`)
    // when none is given and no prior row exists -- measured live on `chf`.
    // This stub instead skips the write entirely when `is_tax_inclusive` is
    // omitted, which only coincides with real behaviour when a prior
    // preference row already held the value it would otherwise default to.
    // No assertion in this suite reads a preference reached through that
    // omitted-write path, so the divergence changes nothing this file
    // checks.
    updateStoresRun.mockImplementation(
      async ({
        input,
      }: {
        input: { selector: { id: string }; update: { supported_currencies: (FakeStoreCurrency & { is_tax_inclusive?: boolean })[] } };
      }) => {
        const world = worlds.get(input.selector.id)!;
        world.store.supported_currencies = input.update.supported_currencies.map((entry) => ({
          currency_code: entry.currency_code,
          is_default: entry.is_default,
        }));
        for (const entry of input.update.supported_currencies) {
          if (entry.is_tax_inclusive !== undefined) world.pricePreferences.set(entry.currency_code, entry.is_tax_inclusive);
        }
        return { result: [] };
      },
    );
  });

  function register(world: FakeWorld): FakeWorld {
    worlds.set(world.store.id, world);
    return world;
  }

  // The discriminating case: this is what the brief calls a stub that never
  // modelled the store Medusa actually creates. Before this row's fix,
  // `applyStoreCurrency` reads a EUR-only store, finds no `usd` entry, and
  // throws -- this test is red against that code. After the fix, it
  // converges instead.
  it("adds the deployment's currency to a store Medusa created EUR-only, rather than refusing", async () => {
    const world = register(eurOnlyWorld());
    const target = new MedusaCommerceConfigurationTarget(fakeContainer(world));

    await expect(target.apply(usdRecord)).resolves.toBeUndefined();

    expect(world.store.supported_currencies).toContainEqual({ currency_code: "usd", is_default: true });
  });

  // `applyStoreCurrency`'s own doc comment (`configure-commerce.ts`'s
  // "structural convergence" paragraph)'s `is_default` decision: EUR is kept
  // (nothing here drops a currency the store already supports) but demoted,
  // because exactly one currency may carry `is_default` and this deployment
  // prices only in USD.
  it("keeps the store's existing EUR entry but demotes it off is_default", async () => {
    const world = register(eurOnlyWorld());
    const target = new MedusaCommerceConfigurationTarget(fakeContainer(world));

    await target.apply(usdRecord);

    expect(world.store.supported_currencies).toContainEqual({ currency_code: "eur", is_default: false });
  });

  // Idempotency: once the store already supports usd as its default currency
  // and the tax-inclusivity preference already matches, a second `apply`
  // must write nothing -- the second `predeploy` run this row is verified by.
  it("writes nothing on a second apply once the currency and its tax preference already converge", async () => {
    const world = register({
      store: { id: "store_2", supported_currencies: [{ currency_code: "usd", is_default: true }] },
      pricePreferences: new Map([["usd", true]]),
    });
    const target = new MedusaCommerceConfigurationTarget(fakeContainer(world));

    await target.apply(usdRecord);

    expect(updateStoresRun).not.toHaveBeenCalled();
  });

  // `applyStoreCurrency`'s early-return check (its "structural convergence"
  // doc comment in `configure-commerce.ts`): a database can have the
  // tax-inclusivity preference row already right while the store itself was
  // never updated (a hand-edited row; `update-stores.js` runs
  // `updateStoresStep` before `updatePricePreferencesAsArrayStep`, so a
  // crash between the two leaves the opposite asymmetry). The old code's
  // early return read `price_preference` alone and would skip the currency
  // fix here; this must still converge the store.
  it("still adds the currency when its tax preference already matches but the store itself does not yet support it", async () => {
    const world = register({
      store: { id: "store_3", supported_currencies: [{ currency_code: "eur", is_default: true }] },
      pricePreferences: new Map([["usd", true]]),
    });
    const target = new MedusaCommerceConfigurationTarget(fakeContainer(world));

    await target.apply(usdRecord);

    expect(world.store.supported_currencies).toContainEqual({ currency_code: "usd", is_default: true });
  });

  // The post-condition's discriminating case: `updateStoresWorkflow`
  // persists `currency` but silently drops `is_default` -- the exact
  // half-failure `isSoleDefault` exists to catch. A post-condition that
  // asserted presence alone would return successfully here and let every
  // later `predeploy` rewrite the store forever without complaining; this
  // one throws instead.
  it("throws when the store persists the currency but not as its default", async () => {
    const world = register(eurOnlyWorld());
    updateStoresRun.mockImplementationOnce(async () => {
      world.store.supported_currencies = [
        { currency_code: "eur", is_default: false },
        { currency_code: "usd", is_default: false },
      ];
      return { result: [] };
    });
    const target = new MedusaCommerceConfigurationTarget(fakeContainer(world));

    await expect(target.apply(usdRecord)).rejects.toThrow(
      "The store does not have usd as its sole default currency",
    );
  });

  // The adversarial state a hand-edited row (no unique index enforces this)
  // can reach: two entries both carry `is_default`. `isSoleDefault` fails
  // this the same way absence does, so the early return does not
  // short-circuit and the write proceeds to demote every entry but `usd`.
  it("does not short-circuit when a second currency also carries is_default, and demotes it", async () => {
    const world = register({
      store: {
        id: "store_4",
        supported_currencies: [
          { currency_code: "usd", is_default: true },
          { currency_code: "gbp", is_default: true },
        ],
      },
      pricePreferences: new Map([["usd", true]]),
    });
    const target = new MedusaCommerceConfigurationTarget(fakeContainer(world));

    await target.apply(usdRecord);

    expect(updateStoresRun).toHaveBeenCalledTimes(1);
    expect(world.store.supported_currencies).toContainEqual({ currency_code: "usd", is_default: true });
    expect(world.store.supported_currencies).toContainEqual({ currency_code: "gbp", is_default: false });
  });
});


describe("applying the delivery configuration", () => {
  /**
   * A container whose `query.graph` answers from a table of entities, so each
   * apply can be run against "nothing exists yet" and against "it already
   * does" without a database.
   */
  function containerFor(entities: Record<string, unknown[]>): MedusaContainer {
    return {
      resolve: (key: string) => {
        if (key === ContainerRegistrationKeys.QUERY) {
          return {
            graph: ({ entity }: { entity: string }) => Promise.resolve({ data: entities[entity] ?? [] }),
          };
        }
        throw new Error(`unexpected resolve(${key})`);
      },
    } as unknown as MedusaContainer;
  }

  const STORE = [{ id: "store_1", default_sales_channel_id: "sc_1" }];

  beforeEach(() => {
    for (const spy of [
      createStockLocationsRun,
      linkSalesChannelsRun,
      batchLinksRun,
      createLocationFulfillmentSetRun,
      createServiceZonesRun,
      createShippingProfilesRun,
      createShippingOptionsRun,
    ]) {
      spy.mockClear();
    }
  });

  const record = <K extends CommerceRecord["kind"]>(kind: K) =>
    commerceRecords().find((candidate) => candidate.kind === kind)!;

  describe("the stock location", () => {
    it("links it to the sales channel, which is the whole reason it exists", async () => {
      // **The mutation that survived.** `list-shipping-options-for-cart.js`
      // reaches fulfillment sets only through `sales_channels.stock_locations`,
      // so an unlinked location offers every cart nothing -- and creating the
      // location without linking it looks like success.
      const target = new MedusaCommerceConfigurationTarget(containerFor({ store: STORE }));
      await target.apply(record("stock-location"));

      expect(createStockLocationsRun).toHaveBeenCalledTimes(1);
      expect(linkSalesChannelsRun).toHaveBeenCalledWith({ input: { id: "sloc_1", add: ["sc_1"] } });

      // **And the fulfilment provider, which is a second link.** Without it
      // `validate-fulfillment-providers.js` refuses to create the option at
      // all: "Providers (printful_printful) are not enabled for the service
      // location". Measured -- `configure:commerce` failed on it.
      expect(batchLinksRun).toHaveBeenCalledTimes(1);
      const link = batchLinksRun.mock.calls[0]?.[0] as unknown as {
        input: { create: Record<string, Record<string, string>>[] };
      };
      expect(link.input.create[0]?.stock_location?.stock_location_id).toBe("sloc_1");
      expect(link.input.create[0]?.fulfillment?.fulfillment_provider_id).toBe(PRINTFUL_FULFILMENT_PROVIDER_ID);
    });

    it("relinks an existing location rather than skipping it", async () => {
      // The link is the kind of thing an operator removes in the Admin without
      // meaning to. Restoring it costs one idempotent call.
      const target = new MedusaCommerceConfigurationTarget(
        containerFor({
          store: STORE,
          stock_location: [{ id: "sloc_existing", fulfillment_providers: [{ id: PRINTFUL_FULFILMENT_PROVIDER_ID }] }],
        }),
      );
      await target.apply(record("stock-location"));

      expect(createStockLocationsRun).not.toHaveBeenCalled();
      expect(linkSalesChannelsRun).toHaveBeenCalledWith({ input: { id: "sloc_existing", add: ["sc_1"] } });
      // The provider link is already there and is not created twice.
      expect(batchLinksRun).not.toHaveBeenCalled();
    });
  });

  describe("the shipping option", () => {
    const ready = {
      store: STORE,
      service_zone: [{ id: "serzo_1" }],
      shipping_profile: [{ id: "sp_1" }],
    };

    it("is calculated, and carries no price at all", async () => {
      // **Two mutations survived here**: a `price_type: "flat"` with a figure
      // beside it, and a different provider. A flat rate would be wrong
      // everywhere but one destination, and a price here is a figure nobody
      // quoted charged to a buyer -- §11 and §23 both.
      const target = new MedusaCommerceConfigurationTarget(containerFor(ready));
      await target.apply(record("shipping-option"));

      const input = createShippingOptionsRun.mock.calls[0]?.[0] as unknown as { input: Record<string, unknown>[] };
      expect(input.input[0]).toMatchObject({
        price_type: "calculated",
        provider_id: PRINTFUL_FULFILMENT_PROVIDER_ID,
        service_zone_id: "serzo_1",
        shipping_profile_id: "sp_1",
      });
      expect(input.input[0]).not.toHaveProperty("prices");
      expect(input.input[0]).not.toHaveProperty("amount");
    });

    it("refuses rather than creating one against a zone or profile it cannot find", async () => {
      // Creating it anyway would bind the option to nothing and read as done.
      const partials: Record<string, unknown[]>[] = [
        { store: STORE, service_zone: [{ id: "serzo_1" }] },
        { store: STORE, shipping_profile: [{ id: "sp_1" }] },
      ];
      for (const partial of partials) {
        const target = new MedusaCommerceConfigurationTarget(containerFor(partial));
        await expect(target.apply(record("shipping-option"))).rejects.toThrow(/must apply first/);
      }
      expect(createShippingOptionsRun).not.toHaveBeenCalled();
    });

    it("creates nothing when the option is already there", async () => {
      const target = new MedusaCommerceConfigurationTarget(
        containerFor({ ...ready, shipping_option: [{ id: "so_existing" }] }),
      );
      await target.apply(record("shipping-option"));
      expect(createShippingOptionsRun).not.toHaveBeenCalled();
    });
  });

  describe("the fulfillment set and its zone", () => {
    it("hangs the set on the location and the zone on the set", async () => {
      const target = new MedusaCommerceConfigurationTarget(
        containerFor({ store: STORE, stock_location: [{ id: "sloc_1", fulfillment_sets: [] }] }),
      );
      await target.apply(record("fulfillment-set"));

      expect(createLocationFulfillmentSetRun).toHaveBeenCalledWith({
        input: { location_id: "sloc_1", fulfillment_set_data: { name: "Shipping", type: "shipping" } },
      });
      const zone = createServiceZonesRun.mock.calls[0]?.[0] as unknown as {
        input: { data: { fulfillment_set_id: string; geo_zones: { country_code: string }[] }[] };
      };
      expect(zone.input.data[0]?.fulfillment_set_id).toBe("fuset_1");
      expect(zone.input.data[0]?.geo_zones.length).toBeGreaterThanOrEqual(200);
      // Lower-cased, which is how Medusa stores a country code and how the
      // cart's own `shipping_address.country_code` arrives.
      expect(zone.input.data[0]?.geo_zones.every((geo) => geo.country_code === geo.country_code.toLowerCase())).toBe(true);
    });

    it("does not rewrite a zone that is already there", async () => {
      // 250 rows deleted and recreated on every predeploy for no change --
      // and a coverage an operator narrowed deliberately is not this row's to
      // widen back.
      const target = new MedusaCommerceConfigurationTarget(
        containerFor({
          store: STORE,
          stock_location: [{ id: "sloc_1", fulfillment_sets: [{ id: "fuset_1", name: "Shipping" }] }],
          service_zone: [{ id: "serzo_1" }],
        }),
      );
      await target.apply(record("fulfillment-set"));

      expect(createLocationFulfillmentSetRun).not.toHaveBeenCalled();
      expect(createServiceZonesRun).not.toHaveBeenCalled();
    });

    it("refuses when the location it needs is absent", async () => {
      const target = new MedusaCommerceConfigurationTarget(containerFor({ store: STORE }));
      await expect(target.apply(record("fulfillment-set"))).rejects.toThrow(/must apply first/);
    });
  });

  describe("the shipping profile", () => {
    it("creates it under the name seed-merch.ts uses", async () => {
      const target = new MedusaCommerceConfigurationTarget(containerFor({ store: STORE }));
      await target.apply(record("shipping-profile"));

      expect(createShippingProfilesRun).toHaveBeenCalledWith({
        input: { data: [{ name: MERCH_SHIPPING_PROFILE, type: MERCH_SHIPPING_PROFILE }] },
      });
    });

    it("creates nothing when it exists", async () => {
      const target = new MedusaCommerceConfigurationTarget(
        containerFor({ store: STORE, shipping_profile: [{ id: "sp_1" }] }),
      );
      await target.apply(record("shipping-profile"));
      expect(createShippingProfilesRun).not.toHaveBeenCalled();
    });
  });
});
