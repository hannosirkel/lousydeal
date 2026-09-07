import { describe, expect, it } from "vitest";

import { ConfigError, optionalEnv, requireEnv } from "../src/config/env";
import {
  type BackendRuntimeConfig,
  readBackendRuntimeConfig,
  readRedisRuntimeConfig,
  redisConnectionOptions,
  redisConnectionUrl,
} from "../src/config/runtime";

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
  // T4 makes the database URL required alongside the two http secrets, and
  // T5a adds the three Redis parts alongside both; see
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
    REDIS_HOST: "redis.internal",
    REDIS_PORT: "6379",
    REDIS_PASSWORD: "redis-secret-value",
    STRIPE_SECRET_KEY: "stripe-secret-key-value",
    STRIPE_WEBHOOK_SECRET: "stripe-webhook-secret-value",
  };

  it("lets the environment override each CORS setting, and does not cross them", () => {
    // **The fallbacks above are only half the path.** Asserting them alone
    // survives two mutations: dropping the env read entirely
    // (`storeCors: DEFAULT_STORE_CORS`), and crossing the three variable names
    // over the three fields. Both leave every other test green, because no
    // other environment in this file sets any of them.
    //
    // Three distinct values, so a crossed pair cannot pass by coincidence.
    const config = readBackendRuntimeConfig({
      ...validEnvironment,
      STORE_CORS: "https://store.example.test",
      ADMIN_CORS: "https://admin.example.test",
      AUTH_CORS: "https://auth.example.test",
    });

    expect(config.http.storeCors).toBe("https://store.example.test");
    expect(config.http.adminCors).toBe("https://admin.example.test");
    expect(config.http.authCors).toBe("https://auth.example.test");
  });

  it("treats an empty CORS value as unset, the way a projected Secret arrives", () => {
    // `optionalEnv` maps empty and whitespace-only to absent, and Medusa's own
    // `||` does the same for empty -- so this matches rather than diverges.
    const config = readBackendRuntimeConfig({ ...validEnvironment, STORE_CORS: "  " });
    expect(config.http.storeCors).toBe("http://localhost:8000");
  });

  it("assembles the http secrets, the database connection, the Redis parts, the Stripe values and the mail configuration from the environment", () => {
    const config: BackendRuntimeConfig = readBackendRuntimeConfig(validEnvironment);
    expect(config).toEqual({
      http: {
        jwtSecret: "jwt-secret-value",
        cookieSecret: "cookie-secret-value",
        // `defineConfig`'s type requires these three and Medusa defaults them
        // itself; `src/config/runtime.ts` records why the compiler only began
        // saying so at 2.20.1, the requirement being older than that. The
        // values here are Medusa's own (`define-config.js:34,36`), so an unset
        // environment produces exactly what it produced before -- which is the
        // whole claim, and is why they are asserted rather than left to a
        // `toMatchObject`.
        storeCors: "http://localhost:8000",
        adminCors: "http://localhost:7000,http://localhost:7001,http://localhost:5173",
        // Medusa falls `authCors` back to the *admin* default, not an auth one
        // (`define-config.js:434-435`). Asserted because it looks like a
        // mistake and is not ours.
        authCors: "http://localhost:7000,http://localhost:7001,http://localhost:5173",
      },
      database: {
        url: "postgres://medusa:db-secret-value@db.internal:5432/lousydeal",
        driverOptions: { connection: { ssl: false } },
      },
      redis: { host: "redis.internal", port: 6379, password: "redis-secret-value" },
      // C8. `null` and not absent: a deployment with no mail configured boots,
      // because C10 and C11 are the rows that give both environments something
      // to send through. `readSmtpRuntimeConfig` is what makes that safe --
      // see its own tests below for the partial-configuration refusal.
      smtp: null,
      // C9. `null` for the same shape of reason and a different cause: mail is
      // absent until C10/C11, the identity is absent in any deployment Orange
      // has not patched.
      merchant: null,
      siteBaseUrl: null,
      stripe: {
        apiKey: "stripe-secret-key-value",
        webhookSecret: "stripe-webhook-secret-value",
        paymentMethodConfiguration: undefined,
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

  // The Redis parts are required too, and refused by the same name-only rule
  // -- this is what keeps C2 ("refuses to start on ... absent required
  // configuration") true for Redis and not only for the database.
  it("names the missing Redis variable in the refusal", () => {
    const withoutHost: Record<string, string> = { ...validEnvironment };
    delete withoutHost.REDIS_HOST;
    expect(() => readBackendRuntimeConfig(withoutHost)).toThrow(/REDIS_HOST/);

    const withoutPort: Record<string, string> = { ...validEnvironment };
    delete withoutPort.REDIS_PORT;
    expect(() => readBackendRuntimeConfig(withoutPort)).toThrow(/REDIS_PORT/);

    const withoutPassword: Record<string, string> = { ...validEnvironment };
    delete withoutPassword.REDIS_PASSWORD;
    expect(() => readBackendRuntimeConfig(withoutPassword)).toThrow(/REDIS_PASSWORD/);
  });

  it("names the missing Stripe variable in the refusal", () => {
    const withoutApiKey: Record<string, string> = { ...validEnvironment };
    delete withoutApiKey.STRIPE_SECRET_KEY;
    expect(() => readBackendRuntimeConfig(withoutApiKey)).toThrow(/STRIPE_SECRET_KEY/);

    const withoutWebhookSecret: Record<string, string> = { ...validEnvironment };
    delete withoutWebhookSecret.STRIPE_WEBHOOK_SECRET;
    expect(() => readBackendRuntimeConfig(withoutWebhookSecret)).toThrow(/STRIPE_WEBHOOK_SECRET/);
  });

  // Unlike the two assertions above, this one must NOT throw: unlike the two
  // Stripe secrets, STRIPE_PAYMENT_METHOD_CONFIGURATION_ID is not in the
  // requireEnv set (see src/config/payment.ts for why), and `validEnvironment`
  // never sets it.
  it("assembles with no Stripe payment method configuration set, leaving it undefined", () => {
    const config = readBackendRuntimeConfig(validEnvironment);
    expect(config.stripe.paymentMethodConfiguration).toBeUndefined();
  });

  it("reads the Stripe payment method configuration when set, trimmed", () => {
    const config = readBackendRuntimeConfig({
      ...validEnvironment,
      STRIPE_PAYMENT_METHOD_CONFIGURATION_ID: "  pmc_test_value\n",
    });
    expect(config.stripe.paymentMethodConfiguration).toBe("pmc_test_value");
  });
});

describe("readRedisRuntimeConfig", () => {
  const validEnvironment = {
    REDIS_HOST: "redis.internal",
    REDIS_PORT: "6379",
    REDIS_PASSWORD: "redis-secret-value",
  };

  it("returns the three parts, with the port as a number", () => {
    expect(readRedisRuntimeConfig(validEnvironment)).toEqual({
      host: "redis.internal",
      port: 6379,
      password: "redis-secret-value",
    });
  });

  // REDIS_HOST is validated, not encoded, for the same reason DATABASE_HOST
  // is in database-url.ts: a scheme, port or credential folded into the host
  // would silently re-cut where the client actually connects.
  it("refuses a REDIS_HOST carrying a scheme, port or credential", () => {
    expect(() => readRedisRuntimeConfig({ ...validEnvironment, REDIS_HOST: "redis://x" })).toThrow(
      ConfigError,
    );
    expect(() =>
      readRedisRuntimeConfig({ ...validEnvironment, REDIS_HOST: "user:pass@redis" }),
    ).toThrow(ConfigError);
  });

  it("refuses a REDIS_PORT that is not a bare positive integer", () => {
    expect(() => readRedisRuntimeConfig({ ...validEnvironment, REDIS_PORT: "6379zzz" })).toThrow(
      /REDIS_PORT/,
    );
    expect(() => readRedisRuntimeConfig({ ...validEnvironment, REDIS_PORT: "0" })).toThrow(
      /REDIS_PORT/,
    );
    expect(() => readRedisRuntimeConfig({ ...validEnvironment, REDIS_PORT: "70000" })).toThrow(
      /REDIS_PORT/,
    );
  });

  // Never in the message: a refusal names only the variable, exactly as
  // requireEnv already does -- this is the property redis-preflight.ts's own
  // refusal path relies on to quote the message safely. Asserted positively
  // as well as negatively, because `.not.toThrow(/x/)` also passes when
  // nothing throws at all, which would hide the refusal disappearing.
  it.each([
    ["a malformed port", { REDIS_PORT: "6379zzz-not-a-port" }, "6379zzz-not-a-port"],
    ["a rejected host", { REDIS_HOST: "bad host:with@delimiters" }, "bad host:with@delimiters"],
  ])("never quotes the rejected value when refusing %s", (_case, override, rejected) => {
    const read = () => readRedisRuntimeConfig({ ...validEnvironment, ...override });

    expect(read).toThrow(ConfigError);
    expect(read).not.toThrow(new RegExp(rejected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  });
});

describe("redisConnectionUrl and redisConnectionOptions", () => {
  const redis = { host: "redis.internal", port: 6379, password: "redis-secret-value" };

  it("builds a redis:// URL from the host and port, and never from the password", () => {
    expect(redisConnectionUrl(redis)).toBe("redis://redis.internal:6379");
    expect(redisConnectionUrl(redis)).not.toContain(redis.password);
  });

  it("carries the password in the options object, not the URL", () => {
    expect(redisConnectionOptions(redis)).toEqual({ password: "redis-secret-value" });
  });
});
