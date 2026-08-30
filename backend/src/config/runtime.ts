/**
 * The one module that assembles the backend's configuration. Every later row
 * that produces a configuration value (the three Redis wirings, the Stripe
 * module) extends {@link BackendRuntimeConfig} and folds its reading into
 * {@link readBackendRuntimeConfig} rather than reading `process.env` on its
 * own -- `env.ts` stays the only module that touches an environment directly.
 *
 * This row adds the database URL and SSL resolution; Redis and Stripe are
 * still absent. It also covers the two values Medusa itself already needs
 * and, absent an explicit setting, silently defaults rather than refuses --
 * `@medusajs/utils`' `defineConfig` resolves an unset
 * `JWT_SECRET`/`COOKIE_SECRET` to a shared placeholder string outside
 * production and to `undefined` inside it. Medusa also silently defaults
 * `STORE_CORS`/`ADMIN_CORS`/`AUTH_CORS`, but unconditionally and including in
 * production, so a later row may want them required too.
 */

import { type Environment, requireEnv } from "./env";
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
  };
}
