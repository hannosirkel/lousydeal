import { describe, expect, it } from "vitest";

import { ConfigError, optionalEnv, requireEnv } from "../src/config/env";
import { type BackendRuntimeConfig, readBackendRuntimeConfig } from "../src/config/runtime";

// A plain object stands in for an environment on purpose. `env.ts` holds the
// rule for reading one, not a reference to any particular one -- its readers
// take the environment as an argument, and this suite is what proves that.

describe("requireEnv", () => {
  it("returns the value trimmed", () => {
    expect(requireEnv({ FOO: "  bar\n" }, "FOO")).toBe("bar");
  });

  it("refuses an absent variable with a ConfigError", () => {
    expect(() => requireEnv({}, "FOO")).toThrow(ConfigError);
  });

  // Two names, not one: an assertion against a single name passes just as well
  // when the message hardcodes it, which would lose the only thing the refusal
  // is operationally for -- telling someone which variable is missing.
  it("names the missing variable in the refusal message", () => {
    expect(() => requireEnv({}, "STRIPE_SECRET_KEY")).toThrow(
      /STRIPE_SECRET_KEY/,
    );
    expect(() => requireEnv({}, "REDIS_URL")).toThrow(/REDIS_URL/);
  });

  it("gives the thrown error a distinguishable name", () => {
    expect.assertions(1);
    try {
      requireEnv({}, "FOO");
    } catch (error) {
      expect((error as Error).name).toBe("ConfigError");
    }
  });

  it("refuses a whitespace-only variable", () => {
    expect(() => requireEnv({ FOO: "   " }, "FOO")).toThrow(ConfigError);
  });

  it("refuses an empty variable", () => {
    expect(() => requireEnv({ FOO: "" }, "FOO")).toThrow(ConfigError);
  });
});

describe("optionalEnv", () => {
  it("returns the value trimmed", () => {
    expect(optionalEnv({ FOO: "  bar\n" }, "FOO")).toBe("bar");
  });

  it("returns undefined, not an empty string, when absent", () => {
    expect(optionalEnv({}, "FOO")).toBeUndefined();
  });

  it("returns undefined for a whitespace-only variable", () => {
    expect(optionalEnv({ FOO: "   " }, "FOO")).toBeUndefined();
  });
});

describe("readBackendRuntimeConfig", () => {
  // T4 makes the database URL required alongside the two http secrets; see
  // backend/tests/database-ssl.test.ts for the database-specific behaviour
  // (SSL mode resolution, the DATABASE_URL/five-part precedence). This
  // fixture only needs to be complete enough that assembly succeeds.
  const validEnvironment = {
    JWT_SECRET: "jwt-secret-value",
    COOKIE_SECRET: "cookie-secret-value",
    DATABASE_HOST: "db.internal",
    DATABASE_PORT: "5432",
    DATABASE_NAME: "lousydeal",
    DATABASE_USER: "medusa",
    DATABASE_PASSWORD: "db-secret-value",
  };

  it("assembles the http secrets and the database connection from the environment", () => {
    const config: BackendRuntimeConfig = readBackendRuntimeConfig(validEnvironment);
    expect(config).toEqual({
      http: { jwtSecret: "jwt-secret-value", cookieSecret: "cookie-secret-value" },
      database: {
        url: "postgres://medusa:db-secret-value@db.internal:5432/lousydeal",
        driverOptions: { connection: { ssl: false } },
      },
    });
  });

  // Fails closed *at load*: the call itself throws, with the returned value
  // never touched. A lazily-validating assembler (a Proxy, or getters that
  // check on read) would let this exact call return normally and only fail
  // once some later caller happened to read the missing field -- the weaker
  // behaviour the checkbox rules out ("throws at load rather than
  // defaulting"). Wrapping only the call, with no property access on its
  // result, is what a lazy implementation could not pass.
  it("refuses at the call itself, not when a field is later read", () => {
    expect(() =>
      readBackendRuntimeConfig({ COOKIE_SECRET: "cookie-secret-value" }),
    ).toThrow(ConfigError);
  });

  // Two names, not one: an assertion against a single name passes just as
  // well when the message hardcodes it -- see the equivalent comment on
  // requireEnv above, which is exactly the mistake this checks for here.
  it("names the missing variable in the refusal", () => {
    expect(() => readBackendRuntimeConfig({ COOKIE_SECRET: "x" })).toThrow(/JWT_SECRET/);
    expect(() => readBackendRuntimeConfig({ JWT_SECRET: "x" })).toThrow(/COOKIE_SECRET/);
  });
});
