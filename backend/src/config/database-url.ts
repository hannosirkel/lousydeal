/**
 * The connection string and the driver options Medusa needs for PostgreSQL —
 * kept in one module because they answer one question in two halves. The URL
 * says *where* the database is; the driver options say *how* to open it. Split
 * across two independently-read environment variables, they can disagree; kept
 * here and read once, they cannot.
 *
 * ## Why this is a real failure, not a theoretical one
 *
 * Medusa resolves PostgreSQL `ssl` by two different routes depending on which
 * entry point is running:
 *
 * | path | how `ssl` is chosen when `databaseDriverOptions` is absent |
 * | --- | --- |
 * | runtime (`medusa start`) | `pgConnectionLoader` spreads `undefined`; `createPgConnection` falls through `?? false` -> `ssl: false` |
 * | migration (`medusa db:migrate`) | `medusaAppLoader` forwards `driverOptions: undefined`, so `loadDatabaseConfig` substitutes `getDefaultDriverOptions(clientUrl)`, which treats anything that is not `localhost`/`127.0.0.1` as remote -> `ssl: { rejectUnauthorized: false }` |
 *
 * A cluster hostname matches neither of `getDefaultDriverOptions`'s local
 * patterns, so the migrator opens with an SSLRequest against a server that may
 * have TLS off entirely. The reference implementation (`plepic`) lost a day to
 * exactly that: the server answered `'N'`, `pg` closed the socket without a
 * startup packet, and the visible symptom was a ten-second migration timeout
 * whose own message named two candidate causes ("an incorrect database URL or
 * an SSL configuration issue") without saying which.
 *
 * Stating `databaseDriverOptions` explicitly is what removes the disagreement:
 * both paths honour it, and neither falls back to a heuristic once it is
 * present.
 *
 * ## Why not fold the mode into `DATABASE_URL` as a query parameter
 *
 * One spelling of that survives to the migration path — `?sslmode=disable`,
 * unhyphenated. `getDefaultDriverOptions` reads that one; `?sslmode=require`
 * matches nothing in it and lands on the same remote default as any other
 * non-local URL — which is the outage this file exists to prevent. Neither is
 * used here, for three reasons `backend/tests/database-ssl.test.ts`
 * establishes against the installed Medusa rather than assumes:
 *
 * 1. **It cannot express `verify-full`.** `getDefaultDriverOptions` returns one
 *    of exactly three objects — `ssl: false`, `ssl: { rejectUnauthorized: false }`,
 *    or a bare `{}` reachable only when it is handed no URL at all; the
 *    migration path always hands it one, so a URL can land on the first two
 *    but never on `ssl: true`. Verification is reachable only through driver
 *    options.
 * 2. **A stated option is what both paths read.** The heuristic is a *default*
 *    consulted only when driver options are absent — which is precisely the
 *    condition that let the two paths disagree in the first place.
 * 3. **It is a regex over the whole connection string, not a read.** The
 *    *underscored* spelling, `ssl_mode=`, is stripped from the URL before
 *    either path sees it **in the real flow**, because the migration path
 *    reads the URL `pgConnectionLoader` already stripped
 *    (`/(\?|&)ssl_mode=[^&]*(&|$)/gi`) rather than the raw one.
 *    `loadDatabaseConfig` is not on its own enough to make that true: handed
 *    the raw URL directly, it consults `getDefaultDriverOptions` — which does
 *    read `ssl_mode=disable` — *before* applying its own copy of the same
 *    strip. A mode that survives in this module but is silently deleted in
 *    transit is the exact disagreement this file exists to prevent.
 *
 * ## Why `DATABASE_URL` may carry no query component at all
 *
 * The paragraph above is Medusa's heuristic; `pg` itself is a second,
 * independent route to the same disagreement, and it does not go through
 * `getDefaultDriverOptions` at all. `pg-connection-string` builds its config
 * from `new URL(str).searchParams.entries()` — **percent-decoded** keys, so
 * `?ssl%6Dode=disable` decodes to the key `sslmode` before anything compares
 * it to a name — and acts on seven of them, read case-sensitively in exactly
 * these lowercase spellings:
 * `ssl`, `sslmode`, `sslcert`, `sslkey`, `sslrootcert`, `sslnegotiation`,
 * `uselibpqcompat`. `pg`'s `ConnectionParameters` constructor then
 * `Object.assign`s that parsed result *over* whatever explicit `ssl`
 * {@link resolveDatabaseDriverOptions} resolved
 * (`connection-parameters.js`: `Object.assign({}, config,
 * parse(config.connectionString))`). Measured against the installed
 * `pg@8.23.0` with `verify-full` already resolved to `ssl: true`:
 * `?ssl%6Dode=disable` and `?ssl=0` both flip it to `false`;
 * `?sslnegotiation=direct` leaves it `true` only by coincidence of pg's own
 * default; `?sslrootcert=<path>` turns it into an `fs.readFileSync` of an
 * operator-supplied path at connect time. None of those is spelled
 * `sslmode`, so a denylist keyed on that one name cannot deliver this file's
 * guarantee, and enumerating the other six would still need to track
 * whichever key `pg` decides to add next, plus `pg`'s own `encodeURI`
 * pre-pass (triggered by a space or a malformed `%` anywhere in the string)
 * to match its normalisation exactly.
 *
 * Nothing this backend runs needs a `DATABASE_URL` with a query component.
 * `compose.yaml` (T17) configures no backend service and so sets no
 * `DATABASE_URL` at all -- `scripts/store-smoke` exports a plain one, with
 * no `?`, to the process it starts directly. No CI job and no deployment
 * manifest sets one either. So {@link resolveDatabaseUrl} refuses any
 * `DATABASE_URL` containing a `?` at all, outright, rather than leaving any
 * part of this class reachable behind an operator instruction not to
 * trigger it or behind a list of key names this file has to keep current
 * with `pg`'s.
 *
 * ## The environment contract
 *
 * `DATABASE_URL`, if supplied, wins outright, **provided it carries no query
 * component** (see above) — a supplied URL with a `?` in it is refused before
 * anything downstream reads it. Otherwise all five of `DATABASE_HOST`,
 * `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER` and `DATABASE_PASSWORD`
 * are required and assembled into one. Five parts rather than a URL is
 * deliberate for the deployment this feeds (T13, in `deploys`, not reachable
 * from here): a full URL embeds the password, so projecting one would turn
 * four non-secret values into a secret needing its own projection and would
 * put the password in a second place it could leak from. The five-part form
 * keeps the password in one Secret key.
 *
 * `DATABASE_SSL_MODE` is optional and separate from both forms. Unset means
 * `disable`. Set to `verify-full` against a private CA, the deployment must
 * also project `NODE_EXTRA_CA_CERTS` pointing at that CA's certificate — the
 * variable is sufficient by itself, no `--use-system-ca` flag is needed (see
 * {@link DatabaseSslSetting} for the measurement). `env.ts`'s empty-is-absent
 * rule applies to every one of these: an ESO-projected key whose source field
 * is absent arrives as `""`, and none of the six are allowed to read that as
 * a value.
 */

import { type Environment, ConfigError, optionalEnv } from "./env";

const partNames = [
  "DATABASE_HOST",
  "DATABASE_PORT",
  "DATABASE_NAME",
  "DATABASE_USER",
  "DATABASE_PASSWORD",
] as const;

/**
 * Read one of the five parts through `optionalEnv`, so absence, emptiness and
 * whitespace-only are all refused exactly as `env.ts` already defines "absent"
 * everywhere else in this backend.
 *
 * The refusal never names anything but the variable: one of the five is
 * `DATABASE_PASSWORD`, and this message reaches an operator through a log
 * pipeline with weeks of retention.
 */
function requirePart(environment: Environment, name: string): string {
  const value = optionalEnv(environment, name);

  if (value === undefined) {
    throw new ConfigError(
      `Missing required environment variable: ${name}. Supply DATABASE_URL, ` +
        `or all of ${partNames.join(", ")}.`,
    );
  }

  return value;
}

/**
 * A host is an authority component, so it is validated rather than encoded:
 * percent-encoding a hostname produces something no resolver accepts, while
 * leaving `:`, `@` or `/` in it silently re-cuts the authority and sends the
 * connection somewhere else.
 */
function requireHost(environment: Environment): string {
  const host = requirePart(environment, "DATABASE_HOST");

  if (/[\s/?#@[\]:\\]/.test(host)) {
    throw new ConfigError("DATABASE_HOST must be a bare hostname or address.");
  }

  return host;
}

function requirePort(environment: Environment): string {
  const port = requirePart(environment, "DATABASE_PORT");

  if (!/^[1-9][0-9]*$/.test(port) || Number(port) > 65535) {
    throw new ConfigError("DATABASE_PORT must be a TCP port between 1 and 65535.");
  }

  return port;
}

/**
 * Resolve the PostgreSQL connection string: an explicit `DATABASE_URL` if
 * supplied, otherwise the five parts assembled into one.
 *
 * An **empty** `DATABASE_URL` does not win — that is what an ESO-projected key
 * with no source field looks like, and treating it as a choice would hand
 * `postgres://` with no host to the driver.
 *
 * @throws {ConfigError} if neither form is completely supplied, or if a
 * supplied `DATABASE_URL` carries a query component (a `?`) — see the module
 * comment for why the whole component is refused rather than a list of
 * SSL-related key names. Never interpolates a received value: the refusal
 * names only the variable, never the URL, which embeds the password.
 */
export function resolveDatabaseUrl(environment: Environment): string {
  const explicit = optionalEnv(environment, "DATABASE_URL");

  if (explicit !== undefined) {
    if (explicit.includes("?")) {
      throw new ConfigError(
        "DATABASE_URL must not carry a query component: pg-connection-string " +
          "builds its config from the query's percent-decoded keys and acts on " +
          "seven of them (ssl, sslmode, sslcert, sslkey, sslrootcert, " +
          "sslnegotiation, uselibpqcompat), then pg " +
          "applies the result over the ssl option DATABASE_SSL_MODE resolves -- " +
          "silently overriding it. Configure TLS with DATABASE_SSL_MODE instead.",
      );
    }

    return explicit;
  }

  const host = requireHost(environment);
  const port = requirePort(environment);
  const name = requirePart(environment, "DATABASE_NAME");
  const user = requirePart(environment, "DATABASE_USER");
  const password = requirePart(environment, "DATABASE_PASSWORD");

  // The user, password and name are percent-encoded. The host is validated
  // rather than encoded (see requireHost) and the port is digits only. The
  // password is
  // generated rather than chosen, so `@`, `/`, `:` and `#` are all live
  // possibilities, and an unencoded `@` in it would move the host.
  const userinfo = `${encodeURIComponent(user)}:${encodeURIComponent(password)}`;

  return `postgres://${userinfo}@${host}:${port}/${encodeURIComponent(name)}`;
}

/**
 * What node-postgres is handed as its `ssl` option, in the shape Medusa nests
 * it in under `databaseDriverOptions.connection`.
 *
 * `false` is no TLS. `{ rejectUnauthorized: false }` is TLS with no
 * verification. `true` is TLS verified against **Node's default trust store**
 * — a certificate from a private or cluster-internal CA fails that unless the
 * process is also given `NODE_EXTRA_CA_CERTS`, which is sufficient by itself
 * (measured on this repository's Node v24.18.1 against a self-signed CA:
 * without the variable, `DEPTH_ZERO_SELF_SIGNED_CERT`; with it alone,
 * `authorized=true`). Putting the CA in the image's own system trust store
 * instead is a *different* mechanism and is not sufficient on its own — Node's
 * default `--use-bundled-ca` ignores an added system trust store unless the
 * process is also started with `--use-system-ca`. `verify-full` is therefore
 * not a manifest-only change, even though it is expressible from this module
 * alone.
 */
export type DatabaseSslSetting = false | true | { readonly rejectUnauthorized: false };

export interface DatabaseDriverOptions {
  readonly connection: { readonly ssl: DatabaseSslSetting };
}

/** libpq's vocabulary, restricted to the three modes this backend can mean. */
const sslModes = ["disable", "require", "verify-full"] as const;

type DatabaseSslMode = (typeof sslModes)[number];

function isSslMode(value: string): value is DatabaseSslMode {
  return (sslModes as readonly string[]).includes(value);
}

/**
 * The PostgreSQL driver options both of Medusa's connection paths honour
 * identically. See the module comment for why this is a variable rather than
 * a URL parameter or a hardcoded `false`.
 *
 * `DATABASE_SSL_MODE` is optional; unset means `disable`, matching every
 * environment this backend runs in today. An empty value is treated the same
 * as absent, for the same ESO reason as the five database parts.
 *
 * @throws {ConfigError} if the mode is neither empty nor one of `disable`,
 * `require`, `verify-full`. Refusing rather than defaulting is the point: a
 * silently-downgraded unrecognised value would defeat the one setting whose
 * entire job is to say how much verification is wanted.
 */
export function resolveDatabaseDriverOptions(environment: Environment): DatabaseDriverOptions {
  const configured = optionalEnv(environment, "DATABASE_SSL_MODE");
  const mode = configured ?? "disable";

  if (!isSslMode(mode)) {
    throw new ConfigError(
      `DATABASE_SSL_MODE must be one of ${sslModes.join(", ")}, or unset for ${sslModes[0]}.`,
    );
  }

  // Rebuilt per call rather than shared from a lookup table: these objects are
  // handed straight to Medusa and on to node-postgres, and a shared one is a
  // single mutation away from changing what every other consumer connects
  // with.
  switch (mode) {
    case "require":
      return { connection: { ssl: { rejectUnauthorized: false } } };
    case "verify-full":
      return { connection: { ssl: true } };
    default:
      return { connection: { ssl: false } };
  }
}
