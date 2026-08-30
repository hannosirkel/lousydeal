import { createRequire } from "node:module";

import { ModulesSdkUtils } from "@medusajs/framework/utils";
import { describe, expect, it } from "vitest";

import {
  type DatabaseDriverOptions,
  resolveDatabaseDriverOptions,
  resolveDatabaseUrl,
} from "../src/config/database-url";
import { ConfigError } from "../src/config/env";

/**
 * **The migrator and the running backend must open the same connection.**
 *
 * Medusa resolves PostgreSQL `ssl` by two different routes when
 * `databaseDriverOptions` is absent:
 *
 * | path | how `ssl` is chosen | result |
 * | --- | --- | --- |
 * | runtime (`pgConnectionLoader` -> `createPgConnection`) | spreads `undefined`, falls through `?? false` | `ssl: false` |
 * | migration (`medusaAppLoader` -> `loadDatabaseConfig`) | substitutes `getDefaultDriverOptions(clientUrl)` | `ssl: { rejectUnauthorized: false }` |
 *
 * `getDefaultDriverOptions` treats a URL as remote unless it matches
 * `/localhost|127\.0\.0\.1|ssl_mode=(disable|false)|sslmode=(disable)/i` — a
 * cluster hostname matches none of those, so an unwired deployment sends an
 * SSLRequest from the migrator to a server that may not speak TLS at all.
 * This suite runs Medusa's own resolvers (not a model of them) against the
 * URL and driver options this module produces, so a Medusa upgrade that
 * changes that precedence turns this red rather than silently reintroducing
 * the disagreement.
 */

/** What a `deploys/lousydeal` workload is expected to project: the five parts, no `DATABASE_URL`. */
const clusterEnvironment: Record<string, string> = {
  DATABASE_HOST: "lousydeal-postgresql",
  DATABASE_PORT: "5432",
  DATABASE_NAME: "lousydeal",
  DATABASE_USER: "medusa",
  DATABASE_PASSWORD: "projected-from-the-secret",
};

const SSL_DISABLED: DatabaseDriverOptions = { connection: { ssl: false } };

describe("resolveDatabaseUrl", () => {
  it("prefers an explicit DATABASE_URL over the five parts", () => {
    expect(
      resolveDatabaseUrl({ ...clusterEnvironment, DATABASE_URL: "postgres://explicit/db" }),
    ).toBe("postgres://explicit/db");
  });

  // An ESO-projected key whose OpenBao field is absent arrives as "", not as
  // undefined. Treating that as a chosen DATABASE_URL would hand the driver
  // "postgres://" with no host.
  it("does not let an empty DATABASE_URL win over the five parts", () => {
    expect(resolveDatabaseUrl({ ...clusterEnvironment, DATABASE_URL: "" })).toBe(
      "postgres://medusa:projected-from-the-secret@lousydeal-postgresql:5432/lousydeal",
    );
  });

  it("assembles the five parts, percent-encoding user and password", () => {
    expect(
      resolveDatabaseUrl({
        ...clusterEnvironment,
        DATABASE_USER: "user@special",
        DATABASE_PASSWORD: "p@ss:word/1",
      }),
    ).toBe(
      "postgres://user%40special:p%40ss%3Aword%2F1@lousydeal-postgresql:5432/lousydeal",
    );
  });

  it("refuses when a part is missing, naming the variable and not the value", () => {
    const withoutPassword: Record<string, string> = { ...clusterEnvironment };
    delete withoutPassword.DATABASE_PASSWORD;

    let caught: unknown;
    try {
      resolveDatabaseUrl(withoutPassword);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ConfigError);
    expect((caught as Error).message).toMatch(/DATABASE_PASSWORD/);
    expect((caught as Error).message).not.toMatch("projected-from-the-secret");
  });

  it("refuses an empty part the same way as an absent one", () => {
    expect(() =>
      resolveDatabaseUrl({ ...clusterEnvironment, DATABASE_HOST: "" }),
    ).toThrow(/DATABASE_HOST/);
  });

  it("refuses a host that is not a bare hostname or address", () => {
    expect(() =>
      resolveDatabaseUrl({ ...clusterEnvironment, DATABASE_HOST: "evil.example/../x" }),
    ).toThrow(ConfigError);
  });

  it("refuses a port outside the valid TCP range", () => {
    expect(() => resolveDatabaseUrl({ ...clusterEnvironment, DATABASE_PORT: "70000" })).toThrow(
      ConfigError,
    );
  });

  /**
   * **The circumvention table, driven the way `pg` drives it.**
   *
   * `pg-connection-string` builds its config from `new URL(str)`'s
   * percent-decoded search-param keys and acts on seven of them
   * (`ssl`, `sslmode`, `sslcert`, `sslkey`, `sslrootcert`, `sslnegotiation`,
   * `uselibpqcompat`), then `pg`'s `ConnectionParameters` applies the parsed
   * result *over* the explicit `ssl` option this module resolved. A denylist
   * keyed on the string `sslmode` cannot catch `?ssl%6Dode=disable` (decodes
   * to the key `sslmode`) or `?ssl=0` (a different key entirely) -- both are
   * measured below, alongside the rest of the table this module's report
   * establishes against the installed `pg@8.23.0`. `resolveDatabaseUrl`
   * refuses every row by refusing the query component outright, not by
   * recognising any of these spellings.
   *
   * `?SSLMODE=disable` (uppercase) is included even though `pg` itself
   * ignores it -- `URLSearchParams` keys are case-sensitive, and `pg` only
   * ever reads the lowercase `sslmode` -- because this module refuses on the
   * presence of `?`, not on what follows it, so it is refused too. That is a
   * deliberate over-refusal, not a gap: nothing this backend runs needs a
   * `DATABASE_URL` with a query component at all.
   */
  it.each([
    "?ssl%6Dode=disable",
    "?ssl=0",
    "?ssl=false",
    "?sslnegotiation=direct",
    "?sslrootcert=/etc/hosts",
    "?sslmode=disable",
    "?SSLMODE=disable",
    "?foo=1", // not an SSL-named key at all -- proves the refusal is whole-query, not an SSL denylist
  ])("refuses a DATABASE_URL carrying %s, naming the variable and not the value", (suffix) => {
    const withQuery = `postgres://medusa:s3cr3t@lousydeal-postgresql:5432/lousydeal${suffix}`;

    let caught: unknown;
    try {
      resolveDatabaseUrl({ ...clusterEnvironment, DATABASE_URL: withQuery });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ConfigError);
    expect((caught as Error).message).toMatch(/DATABASE_URL/);
    expect((caught as Error).message).not.toMatch("s3cr3t");
    expect((caught as Error).message).not.toMatch("lousydeal-postgresql");
    expect((caught as Error).message).not.toMatch("projected-from-the-secret");
    expect((caught as Error).message).not.toMatch(withQuery);
    expect((caught as Error).message).not.toContain("?");
  });

  it("does not refuse a DATABASE_URL with no query component", () => {
    expect(
      resolveDatabaseUrl({
        ...clusterEnvironment,
        DATABASE_URL: "postgres://medusa:s3cr3t@lousydeal-postgresql:5432/lousydeal",
      }),
    ).toBe("postgres://medusa:s3cr3t@lousydeal-postgresql:5432/lousydeal");
  });
});

describe("resolveDatabaseDriverOptions", () => {
  it("defaults to disabled TLS, unset", () => {
    expect(resolveDatabaseDriverOptions({})).toEqual(SSL_DISABLED);
  });

  it("treats an empty DATABASE_SSL_MODE the same as unset", () => {
    expect(resolveDatabaseDriverOptions({ DATABASE_SSL_MODE: "" })).toEqual(SSL_DISABLED);
  });

  it("expresses require as TLS without verification", () => {
    expect(resolveDatabaseDriverOptions({ DATABASE_SSL_MODE: "require" })).toEqual({
      connection: { ssl: { rejectUnauthorized: false } },
    });
  });

  // The strictest mode has to be reachable through this module, and no URL
  // spelling can produce it -- see the suite below.
  it("expresses verify-full as verified TLS", () => {
    expect(resolveDatabaseDriverOptions({ DATABASE_SSL_MODE: "verify-full" })).toEqual({
      connection: { ssl: true },
    });
  });

  it("refuses an unrecognised mode without echoing it", () => {
    expect(() => resolveDatabaseDriverOptions({ DATABASE_SSL_MODE: "trust-me" })).toThrow(
      ConfigError,
    );
    try {
      resolveDatabaseDriverOptions({ DATABASE_SSL_MODE: "trust-me" });
    } catch (error) {
      expect((error as Error).message).not.toMatch("trust-me");
    }
  });
});

describe("the migration path and the runtime path agree on TLS", () => {
  /**
   * **The row's actual purpose, verified against Medusa itself.**
   *
   * `driverOptions` comes from this module exactly once and is handed to both
   * of Medusa's own connection builders the way `pgConnectionLoader` and
   * `medusaAppLoader` each build their argument -- not compared against a
   * hand-written expectation of what they *should* do.
   *
   * This is also the test that catches the disagreement 11.1 asks for: change
   * either call below to pass a *different* `driverOptions` value to one path
   * than the other -- reproducing the historical bug, where the migration
   * path saw no stated options at all and fell back to its own remote
   * heuristic -- and this test fails. See the row's report for that
   * demonstration; it is not left in the suite because a test that only
   * passes when deliberately broken is not a regression guard.
   *
   * Run over all three modes, not just the default `disable`: `require` and
   * `verify-full` are otherwise only ever asserted against this module's own
   * expectations, never through Medusa's resolvers, which is the row's actual
   * verification requirement -- that `verify-full` is expressible end to end,
   * not just constructible.
   */
  it.each([
    ["disable", false],
    ["require", { rejectUnauthorized: false }],
    ["verify-full", true],
  ] as const)(
    "resolves the same ssl value for DATABASE_SSL_MODE=%s on Medusa's migration and runtime connection builders",
    async (mode, expectedSsl) => {
      const environment = { ...clusterEnvironment, DATABASE_SSL_MODE: mode };
      const clientUrl = resolveDatabaseUrl(environment);
      const driverOptions = resolveDatabaseDriverOptions(environment);

      const migrationConfig = ModulesSdkUtils.loadDatabaseConfig(
        "medusa",
        { database: { clientUrl, driverOptions } },
        true,
      );

      const runtimeConnection = ModulesSdkUtils.createPgConnection({
        clientUrl,
        schema: "public",
        driverOptions: { ...driverOptions },
        pool: { min: 2 },
      }) as unknown as {
        client: { config: { connection: { ssl: unknown } } };
        destroy: () => Promise<void>;
      };

      try {
        expect(migrationConfig.driverOptions).toEqual({ connection: { ssl: expectedSsl } });
        expect(runtimeConnection.client.config.connection.ssl).toEqual(expectedSsl);
        expect(migrationConfig.driverOptions).toEqual({
          connection: { ssl: runtimeConnection.client.config.connection.ssl },
        });
      } finally {
        await runtimeConnection.destroy();
      }
    },
  );

  /**
   * The premise, held so the test above cannot quietly stop testing anything.
   * A cluster Service name has to be one `getDefaultDriverOptions` would call
   * remote -- otherwise both paths would agree by accident, for a reason
   * unrelated to `databaseDriverOptions` being stated.
   */
  it("is exercising a URL Medusa would otherwise have called remote", () => {
    const clientUrl = resolveDatabaseUrl(clusterEnvironment);

    const withoutDriverOptions = ModulesSdkUtils.loadDatabaseConfig(
      "medusa",
      { database: { clientUrl } },
      true,
    );

    expect(withoutDriverOptions.driverOptions).toEqual({
      connection: { ssl: { rejectUnauthorized: false } },
    });
  });
});

/*
 * `__filename` rather than `import.meta.url`: `tsconfig.test.json` types this
 * workspace as CommonJS (`module: Node16` over a package with no `"type":
 * "module"`).
 */
const require_ = createRequire(__filename);

/**
 * **Which URL spellings are stripped before either path reads them -- the
 * second half of this row's verification, established empirically rather
 * than assumed.**
 *
 * Confirmed directly against the copies of these functions installed under
 * `node_modules/@medusajs` at 2.18.0 (not against documentation, and not
 * against a description of them):
 *
 * - `pgConnectionLoader` (`@medusajs/framework/dist/database/pg-connection-loader.js`)
 *   strips the *underscored* `ssl_mode` from `projectConfig.databaseUrl`
 *   before ever calling `createPgConnection` -- `/(\?|&)ssl_mode=[^&]*(&|$)/gi`.
 *   Not imported or re-implemented below: `loadDatabaseConfig` applies the
 *   identical pattern to its own input, so its returned `clientUrl` is
 *   Medusa's own strip result, observed rather than modelled.
 * - `medusaAppLoader.prepareSharedResourcesAndDeps` takes the migration
 *   `clientUrl` from the connection `pgConnectionLoader` already built in
 *   preference to the raw `projectConfig.databaseUrl`, so the migration path
 *   reads the *already-stripped* string in the real flow this suite models.
 * - `loadDatabaseConfig` (`@medusajs/utils/dist/modules-sdk/load-module-database-config.js`)
 *   strips that same underscored spelling *again*, but only after already
 *   having consulted `getDefaultDriverOptions` on whatever string it was
 *   given -- irrelevant here because what it is given has already had it
 *   removed.
 * - `getDefaultDriverOptions`'s own remote/local test,
 *   `/localhost|127\.0\.0\.1|ssl_mode=(disable|false)|sslmode=(disable)/i`,
 *   matches the *unhyphenated* `sslmode=disable` too -- and nothing strips
 *   that spelling anywhere in the chain.
 *
 * The consequence, measured below rather than stated: `?ssl_mode=disable` is
 * deleted before either path's decision is made and changes nothing;
 * `?sslmode=disable` survives and does flip the migration path's default to
 * `ssl: false`. That is precisely why `resolveDatabaseDriverOptions` exists
 * as a separate, explicitly-read value rather than something folded into
 * `DATABASE_URL` -- a mode that lived only in the URL would depend on which
 * of these two spellings, and which loader, an operator happened to hit.
 */
describe("the URL spellings that are stripped before either path reads them", () => {
  it.each([
    ["?ssl_mode=disable", false, { connection: { ssl: { rejectUnauthorized: false } } }],
    ["?ssl_mode=false", false, { connection: { ssl: { rejectUnauthorized: false } } }],
    ["?sslmode=disable", true, { connection: { ssl: false } }],
    ["?sslmode=require", true, { connection: { ssl: { rejectUnauthorized: false } } }],
  ])(
    "a URL carrying %s survives-strip=%s and resolves to %j on the migration path",
    (suffix, survivesStrip, expectedDriverOptions) => {
      const raw = `postgres://medusa:pw@lousydeal-postgresql:5432/lousydeal${suffix}`;

      // Medusa's own strip, read off its returned `clientUrl` -- not a local
      // copy of its regex. In the real flow, `medusaAppLoader` hands the
      // migration path the `clientUrl` `pgConnectionLoader` already stripped
      // this same way, so a second `loadDatabaseConfig` call against that
      // stripped URL is what reproduces the migration path's actual decision.
      const { clientUrl: stripped } = ModulesSdkUtils.loadDatabaseConfig(
        "medusa",
        { database: { clientUrl: raw } },
        true,
      );

      expect(stripped === raw).toBe(survivesStrip);

      const resolved = ModulesSdkUtils.loadDatabaseConfig(
        "medusa",
        { database: { clientUrl: stripped } },
        true,
      );

      expect(resolved.driverOptions).toEqual(expectedDriverOptions);
    },
  );

  /**
   * **A `DATABASE_URL` carrying a query component overrides
   * `resolveDatabaseDriverOptions` at the `pg` layer, for seven different key
   * names and in both directions.** `pg-connection-string` parses the
   * connection string from `new URL(str)`'s percent-decoded search-param
   * keys, and `pg`'s `ConnectionParameters` applies the result *over* the
   * explicit `ssl` option it was constructed with
   * (`Object.assign({}, config, parse(config.connectionString))`), so a URL's
   * own query wins regardless of what this module resolved. Verified against
   * the installed `pg`, not assumed: this is *why* {@link resolveDatabaseUrl}
   * refuses any `DATABASE_URL` carrying a query component outright (see the
   * `resolveDatabaseUrl` suite above), rather than leaving this override
   * reachable behind an operator instruction not to trigger it, or behind a
   * denylist of the specific key names below.
   *
   * `pg`'s own deprecation warning for `sslmode=require` (it currently maps
   * that to `verify-full`, and says a future major version will not) is
   * genuine but fires on every process, so it is muted for exactly the
   * duration of the constructor call that provokes it and restored in
   * `finally` -- nothing here reads the warning's text, so a reworded one
   * changes nothing here.
   */
  describe("what a URL's own query component does at the pg layer -- the circumvention table", () => {
    // `pg` is declared in `backend/package.json` at the same range
    // `@medusajs/deps` already resolves (`^8.16.3` -> 8.23.0 today), so this
    // deep-requires the copy Medusa itself uses rather than an undeclared,
    // dedupe-fragile transitive that only worked because pg's `exports` map
    // happens to expose `./lib/*.js`.
    const ConnectionParameters = require_(
      "pg/lib/connection-parameters.js",
    ) as new (config: Record<string, unknown>) => { ssl: unknown };

    const resolvedSsl = (suffix: string, ssl: unknown): unknown => {
      const emitWarning = process.emitWarning;
      process.emitWarning = (() => undefined) as typeof process.emitWarning;
      try {
        return new ConnectionParameters({
          connectionString: `postgres://medusa:pw@lousydeal-postgresql:5432/lousydeal${suffix}`,
          ssl,
        }).ssl;
      } finally {
        process.emitWarning = emitWarning;
      }
    };

    /**
     * Every row of the module's report table, driven the way `pg` drives it
     * (`ConnectionParameters`, constructed with the exact `ssl: true` shape
     * `resolveDatabaseDriverOptions({ DATABASE_SSL_MODE: "verify-full" })`
     * produces) rather than the way this module decides refusal. This is the
     * proof that closing the class was necessary: every row below still
     * *would* change or read something at the `pg` layer if it ever reached
     * `pg` -- which, per the suite above, none of them now can.
     */
    it.each([
      ["?ssl%6Dode=disable", false],
      ["?ssl=0", false],
      ["?ssl=false", "false"],
      ["?sslnegotiation=direct", true],
      ["?sslmode=disable", false],
      ["?SSLMODE=disable", true], // pg ignores the uppercase key -- unchanged from the verify-full baseline
    ] as const)("a URL carrying %s makes pg resolve ssl:true -> %j", (suffix, expected) => {
      expect(resolvedSsl(suffix, true)).toEqual(expected);
    });

    it("?sslrootcert=<path> turns an operator-supplied path into a fs.readFileSync at connect time", () => {
      const result = resolvedSsl("?sslrootcert=/etc/hosts", true) as { ca: unknown };
      expect(typeof result).toBe("object");
      expect(typeof result.ca).toBe("string");
      expect((result.ca as string).length).toBeGreaterThan(0);
    });

    // Reconciled per Minor 1: this used to assert that pg's downgrade
    // succeeded. It no longer can as a reachable outcome of this module --
    // resolveDatabaseUrl refuses the URL before pg ever sees it, for any of
    // the rows above, not only `sslmode=disable` -- so this now asserts the
    // refusal instead, over the whole table.
    it.each([
      "?ssl%6Dode=disable",
      "?ssl=0",
      "?ssl=false",
      "?sslnegotiation=direct",
      "?sslrootcert=/etc/hosts",
      "?sslmode=disable",
      "?SSLMODE=disable",
    ])(
      "refuses a DATABASE_URL carrying %s, so it can never reach pg to silently change a configured verify-full",
      (suffix) => {
        expect(() =>
          resolveDatabaseUrl({
            ...clusterEnvironment,
            DATABASE_URL: `postgres://medusa:pw@lousydeal-postgresql:5432/lousydeal${suffix}`,
          }),
        ).toThrow(ConfigError);
      },
    );

    it("lets a URL's sslmode=require override a configured disable -- pg's override cuts both ways, which is why the refusal above is unconditional", () => {
      expect(resolvedSsl("?sslmode=require", false)).toEqual({});
    });
  });
});

/**
 * **Minor 3 -- the strip this module's comment credits to `loadDatabaseConfig`
 * and to `pgConnectionLoader` is asserted to be the same strip, not assumed.**
 *
 * The suite above drives `loadDatabaseConfig`'s strip live and never
 * hand-copies it. `pgConnectionLoader` cannot be driven the same way in a
 * unit test -- it resolves `configManager.config` from a running Medusa
 * container and opens a real pool -- so this instead extracts the exact
 * source text of both strips from the installed package files and compares
 * them byte-for-byte, then evaluates the extracted text (not a hand-typed
 * model of it) against sample input and cross-checks the result against
 * `loadDatabaseConfig`'s own live strip. What this guards is narrower than it
 * may look: the shared regex-and-replacer expression being byte-identical in
 * both files. A package adding a *separate* further transformation alongside
 * it would not be caught. That is bounded -- the query component is refused
 * outright, so no URL this module emits can carry `ssl_mode=` behind a `?` at
 * all, and the strip is no longer load-bearing for anything we produce. The
 * extraction itself throws, rather than silently comparing nothing, if
 * either file no longer contains a recognisable `.replace(/.../gi, ...)`
 * call at the marker searched for.
 */
describe("pgConnectionLoader's clientUrl strip agrees with loadDatabaseConfig's", () => {
  const { readFileSync } = require_("node:fs") as typeof import("node:fs");
  const { dirname, join } = require_("node:path") as typeof import("node:path");

  /**
   * Locate the `<regex>, (match, prefix, suffix) => { ... });` block in an
   * installed Medusa source file by the `[^&]` fragment unique to the strip
   * regex (as opposed to `getDefaultDriverOptions`'s unrelated `ssl_mode`
   * match earlier in the same file), and return its exact text.
   */
  function extractStripExpression(sourcePath: string): string {
    const source = readFileSync(sourcePath, "utf8");
    const markerIndex = source.indexOf("[^&]");
    const start = markerIndex === -1 ? -1 : source.lastIndexOf("/(", markerIndex);
    const end = markerIndex === -1 ? -1 : source.indexOf("});", markerIndex);

    if (start === -1 || end === -1) {
      throw new Error(
        `could not locate the ssl_mode strip expression in ${sourcePath} -- ` +
          "Medusa changed its shape; this extraction needs updating, not the module.",
      );
    }

    return source.slice(start, end + 3);
  }

  // Neither concrete `dist/` file is a public subpath, so deep-`require`-ing
  // either one the way the suite above deep-requires
  // `pg/lib/connection-parameters.js` fails with `ERR_PACKAGE_PATH_NOT_EXPORTED`.
  // Resolved through a subpath each package does export, then read from disk --
  // `readFileSync` is not subject to `exports` enforcement.
  // `readFileSync` is not subject to `exports` enforcement, so this resolves
  // each file's directory through a path `exports` *does* expose, then joins
  // the on-disk filename -- still the installed copy, not a hand-picked path.
  const loaderPath = join(
    dirname(require_.resolve("@medusajs/framework/database")),
    "pg-connection-loader.js",
  );
  const configPath = join(
    dirname(require_.resolve("@medusajs/utils")),
    "modules-sdk",
    "load-module-database-config.js",
  );

  it("is textually the same regex-and-replacer in both installed files, not two copies that happen to agree today", () => {
    expect(extractStripExpression(loaderPath)).toBe(extractStripExpression(configPath));
  });

  it("behaves the same as loadDatabaseConfig's live strip when actually run, not just textually identical", () => {
    const strip = new Function(
      "connectionString",
      `return connectionString?.replace(${extractStripExpression(loaderPath)}`,
    ) as (connectionString: string) => string | undefined;

    for (const raw of [
      "postgres://medusa:pw@lousydeal-postgresql:5432/lousydeal?ssl_mode=disable",
      "postgres://medusa:pw@lousydeal-postgresql:5432/lousydeal?foo=1&ssl_mode=disable",
      "postgres://medusa:pw@lousydeal-postgresql:5432/lousydeal",
    ]) {
      const { clientUrl: liveStripped } = ModulesSdkUtils.loadDatabaseConfig(
        "medusa",
        { database: { clientUrl: raw } },
        true,
      );

      expect(strip(raw)).toBe(liveStripped);
    }
  });
});
