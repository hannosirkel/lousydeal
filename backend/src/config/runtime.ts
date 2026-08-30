/**
 * The one module that assembles the backend's configuration. Every later row
 * that produces a configuration value (the three Redis wirings, the Stripe
 * module) extends {@link BackendRuntimeConfig} and folds its reading into
 * {@link readBackendRuntimeConfig} rather than reading `process.env` on its
 * own. `redis-preflight.ts` is the one exception: it runs as a standalone
 * script before Medusa loads, so it has no assembler to be handed values by
 * and passes `process.env` to `readRedisRuntimeConfig` itself.
 *
 * {@link readBackendRuntimeConfig} also covers the two values Medusa itself
 * already needs and, absent an explicit setting, silently defaults rather than
 * refuses -- `@medusajs/utils`' `defineConfig` resolves an unset
 * `JWT_SECRET`/`COOKIE_SECRET` to a shared placeholder string outside
 * production and to `undefined` inside it. Medusa also silently defaults
 * `STORE_CORS`/`ADMIN_CORS`/`AUTH_CORS`, but unconditionally and including in
 * production, so a later row may want them required too.
 */

import { type Environment, ConfigError, requireEnv } from "./env";
import {
  type DatabaseDriverOptions,
  resolveDatabaseDriverOptions,
  resolveDatabaseUrl,
} from "./database-url";

export interface BackendRuntimeConfig {
  readonly http: {
    readonly jwtSecret: string;
    readonly cookieSecret: string;
  };
  readonly database: {
    readonly url: string;
    readonly driverOptions: DatabaseDriverOptions;
  };
  readonly redis: RedisRuntimeConfig;
  readonly stripe: StripeRuntimeConfig;
}

/**
 * Every required value is read before this returns, so an absent one throws
 * here rather than from the field a caller later reads.
 */
export function readBackendRuntimeConfig(environment: Environment): BackendRuntimeConfig {
  return {
    http: {
      jwtSecret: requireEnv(environment, "JWT_SECRET"),
      cookieSecret: requireEnv(environment, "COOKIE_SECRET"),
    },
    database: {
      url: resolveDatabaseUrl(environment),
      driverOptions: resolveDatabaseDriverOptions(environment),
    },
    redis: readRedisRuntimeConfig(environment),
    stripe: {
      apiKey: requireEnv(environment, "STRIPE_SECRET_KEY"),
      webhookSecret: requireEnv(environment, "STRIPE_WEBHOOK_SECRET"),
    },
  };
}

/**
 * The one Redis this deployment has, as three parts rather than a URL.
 *
 * Kept as parts, not assembled into a connection string, because the checkbox
 * this type feeds names the failure mode directly: a password folded into a
 * `redis://user:password@host:port` string is a password in every log line
 * that echoes the string, every error that quotes it, and `ps`. The client
 * options object a Redis client is handed can carry the password instead --
 * see `redis-preflight.ts`, the first consumer. T5b's module wirings and any
 * connection-string helper they need are theirs to add; this row adds only
 * the parts and the reader.
 */
export interface RedisRuntimeConfig {
  readonly host: string;
  readonly port: number;
  readonly password: string;
}

/**
 * A bare hostname or IPv4 address -- no scheme, no port, no userinfo. Redis is
 * reached in this deployment by Service name or by `127.0.0.1` in a compose
 * checkout; nothing here needs bracket notation, so IPv6 literals are refused
 * with everything else that is not a plain label.
 */
const REDIS_HOST_PATTERN = /^[A-Za-z0-9][A-Za-z0-9.-]*$/;

/**
 * Read and validate `REDIS_HOST`, `REDIS_PORT` and `REDIS_PASSWORD`.
 *
 * Read on its own, not only through {@link readBackendRuntimeConfig}: the
 * Redis preflight in `redis-preflight.ts` runs as a standalone script before
 * Medusa loads, and needs only these three variables -- requiring the http
 * secrets and the database connection there as well would make the preflight
 * refuse on a missing `JWT_SECRET`, which is not what it exists to catch.
 *
 * @throws {ConfigError} naming the offending variable, and never its value.
 */
export function readRedisRuntimeConfig(environment: Environment): RedisRuntimeConfig {
  const host = requireEnv(environment, "REDIS_HOST");

  if (!REDIS_HOST_PATTERN.test(host)) {
    throw new ConfigError(
      "REDIS_HOST must be a hostname or IPv4 address, with no scheme, port or credentials.",
    );
  }

  const rawPort = requireEnv(environment, "REDIS_PORT");

  if (!/^[1-9][0-9]*$/.test(rawPort) || Number(rawPort) > 65535) {
    throw new ConfigError("REDIS_PORT must be a TCP port between 1 and 65535.");
  }

  return {
    host,
    port: Number(rawPort),
    password: requireEnv(environment, "REDIS_PASSWORD"),
  };
}

/**
 * `redis://host:port`, and deliberately **no credentials in it**.
 *
 * Every consumer T5b declares -- the event bus, the workflow engine and the
 * locking provider -- is handed this URL alongside {@link redisConnectionOptions}
 * and authenticates from the options object instead. A password folded into
 * the userinfo (`redis://:password@host:port`) is a password in every log
 * line, error message and connection-string dump that echoes the URL; one
 * that was never in the URL cannot leak out of it.
 */
export function redisConnectionUrl(redis: RedisRuntimeConfig): string {
  return `redis://${redis.host}:${String(redis.port)}`;
}

/** The ioredis options every one of T5b's three Redis wirings is given. */
export function redisConnectionOptions(redis: RedisRuntimeConfig): { readonly password: string } {
  return { password: redis.password };
}

/**
 * The two values `@medusajs/payment-stripe` reads: see
 * `node_modules/@medusajs/payment-stripe/dist/core/stripe-base.js:13-19`, which
 * throws when `apiKey` is missing and warns when `webhookSecret` is. Read
 * through {@link requireEnv} so both fail the same way as everything else in
 * this file: at load, naming the variable.
 *
 * Which key reaches this reader -- a Stripe test key or a live one -- is a
 * per-environment secret delivered at runtime, not a choice this repository
 * makes; see the "Target exposure" table in `docs/working/ld-01-foundation.md`
 * ("a live key never reaches test").
 */
export interface StripeRuntimeConfig {
  readonly apiKey: string;
  readonly webhookSecret: string;
}
