import { describe, expect, it } from "vitest";

import {
  CLIENT_RUNTIME_CONFIG_KEYS,
  getRuntimeConfig,
  serializeRuntimeConfig,
  toClientRuntimeConfig,
  type RuntimeConfig,
} from "../src/config/runtime-config";

describe("getRuntimeConfig", () => {
  it("is built from the record it is given, not from process.env", () => {
    // Nothing in this test ever assigns to process.env. If getRuntimeConfig
    // read process.env instead of its argument, every field below would come
    // back null regardless of what is passed here.
    const config = getRuntimeConfig({
      MEDUSA_BACKEND_URL: "http://backend.example:9000",
      MEDUSA_PUBLISHABLE_API_KEY: "pk_medusa_example",
      STRIPE_PUBLISHABLE_KEY: "pk_test_example",
    });

    expect(config).toEqual({
      medusa: { backendUrl: "http://backend.example:9000", publishableKey: "pk_medusa_example" },
      stripe: { publishableKey: "pk_test_example" },
    });
    expect(process.env.MEDUSA_BACKEND_URL).toBeUndefined();
  });

  it("has null values, never a fabricated default, when the record is empty", () => {
    expect(getRuntimeConfig({})).toEqual({
      medusa: { backendUrl: null, publishableKey: null },
      stripe: { publishableKey: null },
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
  };

  it("publishes exactly the declared key set", () => {
    expect(Object.keys(toClientRuntimeConfig(config)).sort()).toEqual([...CLIENT_RUNTIME_CONFIG_KEYS].sort());
  });

  it("is a projection, not a spread — a field the server config gains is not published until named here", () => {
    const widened = { ...config, futureField: "must-not-be-published" } as unknown as RuntimeConfig;
    expect(JSON.stringify(toClientRuntimeConfig(widened))).not.toContain("must-not-be-published");
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
    const closingTag = `</${"script"}>`;
    const withClosingTag: RuntimeConfig = {
      medusa: { backendUrl: `${closingTag}<script>alert(1)</script>`, publishableKey: null },
      stripe: { publishableKey: null },
    };
    const serialized = serializeRuntimeConfig(toClientRuntimeConfig(withClosingTag));
    expect(serialized).not.toContain(closingTag);
    expect(serialized).toContain("\\u003c");
  });

  it("round-trips through JSON.parse unchanged", () => {
    const value: RuntimeConfig = {
      medusa: { backendUrl: "http://backend.example:9000", publishableKey: "pk_medusa_example" },
      stripe: { publishableKey: "pk_test_example" },
    };
    const projected = toClientRuntimeConfig(value);
    expect(JSON.parse(serializeRuntimeConfig(projected))).toEqual(projected);
  });
});
