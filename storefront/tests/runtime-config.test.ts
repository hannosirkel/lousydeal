import { describe, expect, it } from "vitest";

import {
  CLIENT_RUNTIME_CONFIG_KEYS,
  getRuntimeConfig,
  serializeRuntimeConfig,
  toClientRuntimeConfig,
  type RuntimeConfig,
} from "../src/config/runtime-config";

/** Used where the trader identity is not what the assertion is about. */
const NO_MERCHANT: RuntimeConfig["merchant"] = {
  legalName: null,
  address: null,
  email: null,
  registryCode: null,
  vatNumber: null,
};

describe("getRuntimeConfig", () => {
  it("is built from the record it is given, not from process.env", () => {
    // Nothing in this test ever assigns to process.env. If getRuntimeConfig
    // read process.env instead of its argument, every field below would come
    // back null regardless of what is passed here.
    const config = getRuntimeConfig({
      MEDUSA_BACKEND_URL: "http://backend.example:9000",
      MEDUSA_PUBLISHABLE_API_KEY: "pk_medusa_example",
      STRIPE_PUBLISHABLE_KEY: "pk_test_example",
      MERCHANT_LEGAL_NAME: "Example Trader OÜ",
      MERCHANT_ADDRESS: "Example tn 1, 10000 Tallinn, Estonia",
      MERCHANT_EMAIL: "trader@example.test",
      MERCHANT_REGISTRY_CODE: "10000000",
      MERCHANT_VAT_NUMBER: "EE100000000",
    });

    expect(config).toEqual({
      medusa: { backendUrl: "http://backend.example:9000", publishableKey: "pk_medusa_example" },
      stripe: { publishableKey: "pk_test_example" },
      merchant: {
        legalName: "Example Trader OÜ",
        address: "Example tn 1, 10000 Tallinn, Estonia",
        email: "trader@example.test",
        registryCode: "10000000",
        vatNumber: "EE100000000",
      },
    });
    expect(process.env.MEDUSA_BACKEND_URL).toBeUndefined();
  });

  it("has null values, never a fabricated default, when the record is empty", () => {
    expect(getRuntimeConfig({})).toEqual({
      medusa: { backendUrl: null, publishableKey: null },
      stripe: { publishableKey: null },
      merchant: { legalName: null, address: null, email: null, registryCode: null, vatNumber: null },
    });
  });

  it("two calls with different records never share a value — nothing is memoised at module scope", () => {
    const first = getRuntimeConfig({ STRIPE_PUBLISHABLE_KEY: "pk_test_first" });
    const second = getRuntimeConfig({ STRIPE_PUBLISHABLE_KEY: "pk_test_second" });
    expect(first.stripe.publishableKey).toBe("pk_test_first");
    expect(second.stripe.publishableKey).toBe("pk_test_second");
  });
});

/**
 * `src/app/layout.tsx` serializes `toClientRuntimeConfig`'s return value into
 * the HTML of every route. The assertion here is the key set, not one
 * field: a field added to `RuntimeConfig` must reach the browser only when
 * someone names it in both `ClientRuntimeConfig` and
 * `CLIENT_RUNTIME_CONFIG_KEYS` — see the module comment in
 * `src/config/runtime-config.ts` for the wholesale-spread defect this
 * guards against.
 */
describe("only a named, pinned subset of the runtime config is published to the browser", () => {
  const config: RuntimeConfig = {
    medusa: { backendUrl: "http://backend.example:9000", publishableKey: "pk_medusa_example" },
    stripe: { publishableKey: "pk_test_example" },
    merchant: {
      legalName: "Example Trader OÜ",
      address: "Example tn 1, 10000 Tallinn, Estonia",
      email: "trader@example.test",
      registryCode: "10000000",
      vatNumber: "EE100000000",
    },
  };

  it("publishes exactly the declared key set", () => {
    expect(Object.keys(toClientRuntimeConfig(config)).sort()).toEqual([...CLIENT_RUNTIME_CONFIG_KEYS].sort());
  });

  it("is a projection, not a spread — a field the server config gains is not published until named here", () => {
    const widened = { ...config, futureField: "must-not-be-published" } as unknown as RuntimeConfig;
    expect(JSON.stringify(toClientRuntimeConfig(widened))).not.toContain("must-not-be-published");
  });

  // T9 answered the question `runtime-config.ts` used to leave open for T9/T10:
  // the backend origin is server-side only. Asserted on the serialized output,
  // not just the key list, so a future field named `medusaUrl` or nested one
  // level differently would still be caught by string content, not only by key
  // name.
  it("does not publish the Medusa backend origin or publishable key", () => {
    const serialized = JSON.stringify(toClientRuntimeConfig(config));
    expect(serialized).not.toContain("backend.example");
    expect(serialized).not.toContain("pk_medusa_example");
    expect("medusa" in toClientRuntimeConfig(config)).toBe(false);
  });

  // The trader identity is public information and is still server-side only:
  // no page reads it in the browser, and what the browser is handed is a
  // decision each field earns rather than one it inherits. Asserted on the
  // serialized string as well as the key, for the same reason as above.
  it("does not publish the trader identity", () => {
    const serialized = JSON.stringify(toClientRuntimeConfig(config));
    for (const value of Object.values(config.merchant)) {
      expect(serialized).not.toContain(value);
    }
    expect("merchant" in toClientRuntimeConfig(config)).toBe(false);
  });
});

/**
 * `src/app/layout.tsx` serializes `toClientRuntimeConfig`'s return value
 * through `serializeRuntimeConfig` into the HTML of every route. Deleting the
 * `.replace(...)` inside it leaves vitest, eslint and both typechecks green
 * everywhere else, so the escaping is asserted here directly.
 */
describe("serializeRuntimeConfig", () => {
  it("escapes '<' so the payload cannot close its enclosing script tag", () => {
    // Planted in `stripe.publishableKey`, not `medusa`: `medusa` is dropped by
    // `toClientRuntimeConfig` before this function ever sees it, so a payload
    // placed there would pass this assertion for the wrong reason -- absence,
    // not escaping. `stripe.publishableKey` is the field this projection
    // actually publishes.
    const closingTag = `</${"script"}>`;
    const withClosingTag: RuntimeConfig = {
      medusa: { backendUrl: null, publishableKey: null },
      stripe: { publishableKey: `${closingTag}<script>alert(1)</script>` },
      merchant: NO_MERCHANT,
    };
    const serialized = serializeRuntimeConfig(toClientRuntimeConfig(withClosingTag));
    expect(serialized).not.toContain(closingTag);
    expect(serialized).toContain("\\u003c");
  });

  it("round-trips through JSON.parse unchanged", () => {
    const value: RuntimeConfig = {
      medusa: { backendUrl: "http://backend.example:9000", publishableKey: "pk_medusa_example" },
      stripe: { publishableKey: "pk_test_example" },
      merchant: NO_MERCHANT,
    };
    const projected = toClientRuntimeConfig(value);
    expect(JSON.parse(serializeRuntimeConfig(projected))).toEqual(projected);
  });
});
