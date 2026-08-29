import { describe, expect, it } from "vitest";

import { ConfigError, optionalEnv, requireEnv } from "../src/config/env";

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
