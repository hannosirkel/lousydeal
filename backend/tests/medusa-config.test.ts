import { isDeepStrictEqual } from "node:util";

import type { ConfigModule } from "@medusajs/framework/types";
import { Modules, defineConfig } from "@medusajs/framework/utils";
import { afterEach, describe, expect, it, vi } from "vitest";

import { redisEventBusModule, redisLockingModule, redisWorkflowEngineModule } from "../src/config/redis";

/**
 * `medusa-config.ts` reads `process.env` once, at import time. Each test
 * below repoints `process.env` to its own synthetic environment and calls
 * `vi.resetModules()` first, forcing a fresh import that assembles the
 * config from the environment this test set, not whatever an earlier test
 * (or the process) left behind.
 *
 * None of the values below is a credential: they guard no Stripe account and
 * no Redis anywhere.
 */
const VALID_ENVIRONMENT: Record<string, string> = {
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
  STRIPE_PAYMENT_METHOD_CONFIGURATION_ID: "pmc_valid_environment_value",
};

/**
 * A second environment that shares no value with the one above, and adds
 * `DATABASE_SSL_MODE` so the driver options differ too. Loading under both is
 * what separates "this value was read from the environment" from "this value
 * is a literal in `medusa-config.ts`": a literal cannot equal both.
 */
const OTHER_ENVIRONMENT: Record<string, string> = {
  JWT_SECRET: "other-jwt-secret",
  COOKIE_SECRET: "other-cookie-secret",
  DATABASE_HOST: "db.elsewhere",
  DATABASE_PORT: "5433",
  DATABASE_NAME: "otherdeal",
  DATABASE_USER: "other-user",
  DATABASE_PASSWORD: "other-db-secret",
  DATABASE_SSL_MODE: "require",
  REDIS_HOST: "redis.elsewhere",
  REDIS_PORT: "6380",
  REDIS_PASSWORD: "other-redis-secret",
  STRIPE_SECRET_KEY: "other-stripe-secret-key",
  STRIPE_WEBHOOK_SECRET: "other-stripe-webhook-secret",
  STRIPE_PAYMENT_METHOD_CONFIGURATION_ID: "pmc_other_environment_value",
};

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  for (const name of Object.keys(process.env)) {
    if (!(name in ORIGINAL_ENV)) delete process.env[name];
  }
  Object.assign(process.env, ORIGINAL_ENV);
});

/** Repoint `process.env` to `environment` and import a fresh `medusa-config`. */
async function loadConfig(
  environment: Record<string, string | undefined>,
): Promise<ConfigModule> {
  for (const name of Object.keys(process.env)) {
    if (!(name in ORIGINAL_ENV)) delete process.env[name];
  }
  Object.assign(process.env, ORIGINAL_ENV);

  for (const [name, value] of Object.entries(environment)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }

  vi.resetModules();

  // Asserted, not inferred. `medusa-config.ts` is outside
  // tsconfig.test.json's `include` (T3a) and the backend emits CommonJS, so
  // under `moduleResolution: Node16` tsc models this dynamic import the way
  // Node models a `require`-able module -- giving `.default` the module
  // namespace rather than the value `export default defineConfig(...)`
  // produced. Vitest transforms the file to ESM instead, where `.default` is
  // that value; the assertions below are what hold this cast to it.
  const imported = (await import("../medusa-config.js")) as unknown as {
    default: ConfigModule;
  };
  return imported.default;
}

/**
 * The modules `medusa-config.ts` customises, as the set of keys where it
 * differs from what `defineConfig` produces from the same `projectConfig`
 * alone.
 *
 * A diff, not a list of expected key names, because `defineConfig` merges
 * Medusa's defaults: `Object.keys(defineConfig({ projectConfig }).modules)` is
 * 27 entries on the installed Medusa, and `cache` is already one of them with
 * the value `{"resolve":"@medusajs/medusa/cache-inmemory"}`. Comparing key
 * names against a written-down list therefore cannot notice a module being
 * added, because the name is usually already there. The baseline comes from
 * Medusa rather than from a list maintained here, so it does not go stale when
 * Medusa's defaults change.
 */
function customisedModuleKeys(config: ConfigModule, projectConfig: ConfigModule["projectConfig"]): string[] {
  const baseline = defineConfig({ projectConfig }).modules ?? {};
  const modules = config.modules ?? {};

  return Object.keys(modules)
    .filter((key) => !isDeepStrictEqual(modules[key], baseline[key]))
    .sort();
}

describe("medusa-config", () => {
  it("customises exactly four modules over Medusa's defaults: the three Redis wirings from redis.ts, and Stripe as a provider of the payment module", async () => {
    const config = await loadConfig(VALID_ENVIRONMENT);
    const redis = { host: "redis.internal", port: 6379, password: "redis-secret-value" };

    expect(customisedModuleKeys(config, config.projectConfig)).toEqual(
      [Modules.EVENT_BUS, Modules.LOCKING, Modules.PAYMENT, Modules.WORKFLOW_ENGINE].sort(),
    );

    // Equality against redis.ts's own wiring functions, not a hand-copied
    // shape.
    expect(config.modules?.[Modules.EVENT_BUS]).toEqual(redisEventBusModule(redis));
    expect(config.modules?.[Modules.WORKFLOW_ENGINE]).toEqual(redisWorkflowEngineModule(redis));
    expect(config.modules?.[Modules.LOCKING]).toEqual(redisLockingModule(redis));

    expect(config.modules?.[Modules.PAYMENT]).toEqual({
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/payment-stripe",
            id: "stripe",
            options: {
              apiKey: "stripe-secret-key-value",
              webhookSecret: "stripe-webhook-secret-value",
              capture: true,
              automaticPaymentMethods: true,
              paymentMethodConfiguration: "pmc_valid_environment_value",
            },
          },
        ],
      },
    });

    expect(config.projectConfig.databaseUrl).toBe(
      "postgres://medusa:db-secret-value@db.internal:5432/lousydeal",
    );
    expect(config.projectConfig.databaseDriverOptions).toEqual({ connection: { ssl: false } });
  });

  // The refusal tests below prove these variables are *required*. They do not
  // prove any of them is *used*: a literal written into medusa-config.ts in
  // place of a runtime read passes every one of them. Loading a second time,
  // under an environment sharing no value with the first, is what proves the
  // read -- each assertion here contradicts the value the test above asserts.
  it("takes the Stripe values, the Redis parts and the database connection from the environment on each load, not from literals", async () => {
    const config = await loadConfig(OTHER_ENVIRONMENT);
    const redis = { host: "redis.elsewhere", port: 6380, password: "other-redis-secret" };

    expect(config.modules?.[Modules.EVENT_BUS]).toEqual(redisEventBusModule(redis));
    expect(config.modules?.[Modules.WORKFLOW_ENGINE]).toEqual(redisWorkflowEngineModule(redis));
    expect(config.modules?.[Modules.LOCKING]).toEqual(redisLockingModule(redis));

    expect(config.modules?.[Modules.PAYMENT]).toEqual({
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/payment-stripe",
            id: "stripe",
            options: {
              apiKey: "other-stripe-secret-key",
              webhookSecret: "other-stripe-webhook-secret",
              capture: true,
              automaticPaymentMethods: true,
              paymentMethodConfiguration: "pmc_other_environment_value",
            },
          },
        ],
      },
    });

    // projectConfig too. `databaseDriverOptions` dropped from the config
    // entirely would remove SSL and leave Medusa's two connection paths free
    // to resolve it differently -- the failure src/config/database-url.ts
    // exists to prevent. Nothing else asserts it reaches Medusa.
    expect(config.projectConfig.databaseUrl).toBe(
      "postgres://other-user:other-db-secret@db.elsewhere:5433/otherdeal",
    );
    expect(config.projectConfig.databaseDriverOptions).toEqual({
      connection: { ssl: { rejectUnauthorized: false } },
    });
  });

  // `= undefined` rather than `delete`: loadConfig removes a name from
  // process.env for an entry present with an undefined value, and `delete`
  // here would drop the key from this object instead, so Object.entries would
  // never yield it and an ambient STRIPE_SECRET_KEY exported in the shell
  // would survive into the load. Checked with
  // `STRIPE_SECRET_KEY=x npx vitest run --project backend tests/medusa-config.test.ts`.
  it("refuses at load when the Stripe API key is absent", async () => {
    const withoutApiKey: Record<string, string | undefined> = { ...VALID_ENVIRONMENT };
    withoutApiKey.STRIPE_SECRET_KEY = undefined;
    await expect(loadConfig(withoutApiKey)).rejects.toThrow(/STRIPE_SECRET_KEY/);
  });

  it("refuses at load when the Stripe webhook secret is absent", async () => {
    const withoutWebhookSecret: Record<string, string | undefined> = { ...VALID_ENVIRONMENT };
    withoutWebhookSecret.STRIPE_WEBHOOK_SECRET = undefined;
    await expect(loadConfig(withoutWebhookSecret)).rejects.toThrow(/STRIPE_WEBHOOK_SECRET/);
  });
});
