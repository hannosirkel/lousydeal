import { createRequire } from "node:module";
import net, { type AddressInfo } from "node:net";

import { createContainer } from "@medusajs/framework/awilix";
import { Modules, REVERSED_MODULE_PACKAGE_NAMES } from "@medusajs/framework/utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  redisEventBusModule,
  redisLockingModule,
  redisWorkflowEngineModule,
} from "../src/config/redis";
import type { RedisRuntimeConfig } from "../src/config/runtime";

/*
 * `__filename` rather than `import.meta.url`: this workspace types as
 * CommonJS (`module: Node16` over a package with no `"type": "module"`),
 * the same reason `tests/database-ssl.test.ts` uses it.
 */
const require_ = createRequire(__filename);

/**
 * `@medusajs/utils`'s own `.d.ts` types this table as `{}` -- no index
 * signature -- because its keys are only known at runtime, built from
 * `MODULE_PACKAGE_NAMES`. This cast reflects that runtime shape for the
 * three lookups below; it does not change what is looked up.
 */
const reversedModulePackageNames = REVERSED_MODULE_PACKAGE_NAMES as Record<string, string>;

/** What each loader is handed: a container and a null logger. */
interface LoaderContainer {
  resolve<T>(name: string): T;
}

interface LoaderLogger {
  info: (message: string) => void;
  error: (message: string) => void;
  warn?: (message: string) => void;
}

type RedisModuleLoader = (
  args: { container: LoaderContainer; logger: LoaderLogger; options: unknown },
  moduleDeclaration?: { worker_mode: string },
) => Promise<void>;

/** The one property every one of the three loaders' built connections is read for. */
interface BuiltRedisConnection {
  readonly options: {
    readonly host?: string;
    readonly port?: number;
    readonly password?: string;
  };
  disconnect(): void;
}

const noopLogger: LoaderLogger = { info: () => undefined, error: () => undefined, warn: () => undefined };

const FIXTURE_PASSWORD = "redis-modules-fixture-password-not-a-credential";

/**
 * A Redis-shaped enough TCP server for ioredis's own connection handshake to
 * complete, so each loader's connection reaches the state (`ready`) it reads
 * `.options` off of, without a real Redis anywhere in this suite.
 *
 * Replies `+OK` to every pipelined command, including `INFO`. Only
 * `event-bus-redis` sets `enableReadyCheck: false` (`grep -rn enableReadyCheck`
 * across the three packages' `dist` returns exactly that one hit); the other
 * two run ioredis 5.11.1's default ready check, which sends `INFO` and reads
 * the reply -- `Redis.js`'s own `_readyCheck` (`node_modules/ioredis/built/Redis.js`)
 * parses any string reply for a `loading:` field and treats no field as ready,
 * so a `+OK` reply to `INFO` already satisfies it; no `INFO`-specific reply is
 * needed.
 */
function startOkStubServer(): Promise<{ port: number; close: () => Promise<void> }> {
  return new Promise((resolve, reject) => {
    const server = net.createServer((socket) => {
      socket.on("data", (chunk: Buffer) => {
        const commands = chunk.toString("utf8").split(/(?=\*\d+\r\n)/).filter(Boolean);
        const reply = "+OK\r\n".repeat(commands.length);
        socket.write(reply);
      });
      socket.on("error", () => undefined);
    });

    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address() as AddressInfo | null;
      if (address === null) {
        reject(new Error("stub Redis server has no address"));
        return;
      }
      resolve({
        port: address.port,
        close: () => new Promise<void>((res) => server.close(() => res())),
      });
    });
  });
}

describe("the three Redis module wirings, run the way Medusa loads them", () => {
  let stub: { port: number; close: () => Promise<void> };
  let fixture: RedisRuntimeConfig;
  const builtConnections: BuiltRedisConnection[] = [];

  beforeEach(async () => {
    stub = await startOkStubServer();
    fixture = { host: "127.0.0.1", port: stub.port, password: FIXTURE_PASSWORD };
  });

  afterEach(async () => {
    for (const connection of builtConnections.splice(0)) {
      connection.disconnect();
    }
    await stub.close();
  });

  // Each of the three tests below loads the *real* package the wiring's own
  // `resolve` string names -- `wiring.resolve` for the first two, and, since
  // `locking-redis` is a provider nested under `locking`, `provider.resolve`
  // for the third -- through `require_(require_.resolve(...))`, not a
  // hardcoded package name -- and runs the one loader function in it
  // that builds a Redis connection from `options`. Reading `connection.options`
  // back is reading ioredis's own parsed connection config, not a
  // re-assertion of what this suite handed in.
  //
  // `REVERSED_MODULE_PACKAGE_NAMES[wiring.resolve]` is the same lookup
  // Medusa's own `getKnownModuleName` runs to decide which `Modules.*` key a
  // declaration lands on (see redis.ts's header).

  it("event-bus-redis: the flat { redisUrl, redisOptions } shape reaches the built connection", async () => {
    const wiring = redisEventBusModule(fixture);
    expect(reversedModulePackageNames[wiring.resolve]).toBe(Modules.EVENT_BUS);
    const eventBusPackage = require_(require_.resolve(wiring.resolve)) as {
      default: { loaders: RedisModuleLoader[] };
    };
    const eventBusModule = eventBusPackage.default;
    const container = createContainer() as unknown as LoaderContainer & {
      register: (...args: unknown[]) => void;
    };
    const loader = eventBusModule.loaders[0];
    expect(loader).toBeDefined();

    await loader?.({
      container,
      logger: noopLogger,
      options: wiring.options,
    });

    const connection = container.resolve<BuiltRedisConnection>("eventBusRedisConnection");
    builtConnections.push(connection);

    expect(connection.options.host).toBe(fixture.host);
    expect(connection.options.port).toBe(fixture.port);
    expect(connection.options.password).toBe(fixture.password);
    expect(wiring.options.redisUrl).not.toContain(fixture.password);
  });

  it("workflow-engine-redis: the nested { redis: { redisUrl, redisOptions } } shape reaches the built connection", async () => {
    const wiring = redisWorkflowEngineModule(fixture);
    expect(reversedModulePackageNames[wiring.resolve]).toBe(Modules.WORKFLOW_ENGINE);
    const workflowEngineRedisPackage = require_(require_.resolve(wiring.resolve)) as {
      default: { loaders: RedisModuleLoader[] };
    };
    const workflowModule = workflowEngineRedisPackage.default;
    const container = createContainer() as unknown as LoaderContainer & {
      register: (...args: unknown[]) => void;
    };

    // loaders[1] is `redisConnection`, the loader that builds the Redis
    // connection; loaders[0] (`loadUtils`) does not touch Redis at all --
    // see node_modules/@medusajs/workflow-engine-redis/dist/index.js.
    const loader = workflowModule.loaders[1];
    expect(loader).toBeDefined();

    await loader?.(
      { container, logger: noopLogger, options: wiring.options },
      { worker_mode: "server" },
    );

    const connection = container.resolve<BuiltRedisConnection>("redisConnection");
    builtConnections.push(connection);
    // The loader opens three more connections (worker, pub, sub) from the
    // same options; disconnecting them through Medusa's own handler is what
    // keeps this test from leaving retry timers running after it finishes.
    const disconnectAll = container.resolve<() => Promise<void>>("redisDisconnectHandler");
    await disconnectAll();

    expect(connection.options.host).toBe(fixture.host);
    expect(connection.options.port).toBe(fixture.port);
    expect(connection.options.password).toBe(fixture.password);
    expect(wiring.options.redis.redisUrl).not.toContain(fixture.password);
  });

  it("locking-redis: the provider's own { redisUrl, redisOptions } options -- nested under locking's providers array -- reach the built connection", async () => {
    const wiring = redisLockingModule(fixture);
    const provider = wiring.options.providers[0];
    expect(provider).toBeDefined();
    if (provider === undefined) return;
    expect(reversedModulePackageNames[provider.resolve]).toBe(Modules.LOCKING);
    const lockingRedisPackage = require_(require_.resolve(provider.resolve)) as {
      default: { loaders: RedisModuleLoader[] };
    };
    const lockingRedisModule = lockingRedisPackage.default;
    const container = createContainer() as unknown as LoaderContainer & {
      register: (...args: unknown[]) => void;
    };

    // The provider's loader, not the outer `locking` module's -- `locking`'s
    // own loader (node_modules/@medusajs/locking/dist/loaders/providers.js)
    // only registers services and decides the default provider; it is
    // `@medusajs/locking-redis`'s loader that dials Redis.
    const loader = lockingRedisModule.loaders[0];
    expect(loader).toBeDefined();

    await loader?.({
      container,
      logger: noopLogger,
      options: provider.options,
    });

    const connection = container.resolve<BuiltRedisConnection>("redisClient");
    builtConnections.push(connection);

    expect(connection.options.host).toBe(fixture.host);
    expect(connection.options.port).toBe(fixture.port);
    expect(connection.options.password).toBe(fixture.password);
    expect(provider.options.redisUrl).not.toContain(fixture.password);
    expect(provider.resolve).toBe("@medusajs/medusa/locking-redis");
    expect(provider.is_default).toBe(true);
  });

  it("declares locking-redis as a provider inside the locking module, not as a module resolve of its own", () => {
    const wiring = redisLockingModule(fixture);

    expect(wiring.resolve).toBe("@medusajs/medusa/locking");
    expect(wiring.options.providers).toHaveLength(1);
    // The locking module's own `resolve` is never passed to `require.resolve`
    // or looked up in the table by the three tests above -- they only reach
    // into `wiring.options.providers[0].resolve`.
    expect(reversedModulePackageNames[wiring.resolve]).toBe(Modules.LOCKING);
    expect(() => require_.resolve(wiring.resolve)).not.toThrow();
  });
});
