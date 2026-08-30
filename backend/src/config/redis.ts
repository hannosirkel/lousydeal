/**
 * The three Redis module wirings: event bus, workflow engine and locking.
 *
 * Each is a separate Medusa module (or, for locking, a provider inside one),
 * and each takes the connection parts in a different shape. A shape wrong
 * enough to hide `redisUrl` from the loader that reads it *is* caught, by the
 * loader itself: `@medusajs/event-bus-redis/dist/loaders/index.js`,
 * `@medusajs/workflow-engine-redis/dist/loaders/redis.js` and
 * `@medusajs/locking-redis/dist/loaders/index.js` each throw when the `redisUrl`
 * they destructure is absent or falsy, and each wraps only the `connect()`
 * call itself in `try`/`catch` -- all three, not `locking-redis` alone, log
 * and swallow a failure there.
 *
 * The shape mistake that *is* silent is a narrower one: a wiring that keeps
 * `redisUrl` where the loader looks but loses `redisOptions` (where the
 * password lives). The loader sees a present `redisUrl`, does not throw, and
 * builds a connection with no credentials. This file exists so the
 * three shapes are declared once, next to each other, rather than re-derived
 * at each call site.
 *
 * `medusa-config.ts` (T6) is the only intended caller: it reads
 * `runtime.redis` from {@link readBackendRuntimeConfig} and passes it to each
 * function below to build one entry of its `modules` array.
 *
 * Resolved as subpaths of `@medusajs/medusa` (`@medusajs/medusa/event-bus-redis`
 * and so on), not as separate package dependencies -- confirmed by resolving
 * each path against the installed tree:
 * `require.resolve("@medusajs/medusa/event-bus-redis")` and the same for
 * `workflow-engine-redis`, `locking` and `locking-redis` all resolve, and
 * `backend/package.json` declares no dependency on any of the four. Each
 * subpath is a thin re-export (see `node_modules/@medusajs/medusa/dist/modules/*.js`)
 * of a real separate npm package (`@medusajs/event-bus-redis` and so on) that
 * arrives transitively as a dependency of `@medusajs/medusa`.
 *
 * The keys these declarations land on -- `Modules.EVENT_BUS`,
 * `Modules.WORKFLOW_ENGINE`, `Modules.LOCKING` -- come from `resolve`, not
 * from the package: `getKnownModuleName` in
 * `node_modules/@medusajs/utils/dist/common/define-config.js:98-108` looks up
 * `REVERSED_MODULE_PACKAGE_NAMES[moduleConfig.resolve]`, keyed on the exact
 * `resolve` string, and only falls back to the joiner config's `serviceName`
 * (throwing if that is also absent) when the lookup misses. The table itself
 * is built in `node_modules/@medusajs/utils/dist/modules-sdk/definition.js:70-84`,
 * where `TEMPORARY_REDIS_MODULE_PACKAGE_NAMES` adds the four
 * `@medusajs/medusa/*-redis` subpaths on top of the base (in-memory) entries
 * -- marked in that file's own comment `TODO: temporary fix until the event
 * bus, cache and workflow engine are migrated to use providers`. This is why
 * declaring one of these `resolve` paths *replaces* Medusa's in-memory
 * default for that key rather than sitting beside it, and why a bare package
 * name (`"@medusajs/event-bus-redis"`, not the `resolve` string above) is not
 * in the table and throws `doesn't have a serviceName`.
 */
import {
  redisConnectionOptions,
  redisConnectionUrl,
  type RedisRuntimeConfig,
} from "./runtime";

/** The flat `{ redisUrl, redisOptions }` shape `event-bus-redis`'s loader destructures. */
export interface RedisModuleWiring {
  readonly resolve: string;
  readonly options: {
    readonly redisUrl: string;
    readonly redisOptions: { readonly password: string };
  };
}

/**
 * The event bus: without it, an event emitted in one process reaches only
 * that process's own subscribers. See `node_modules/@medusajs/event-bus-redis/dist/loaders/index.js`,
 * which reads `options.redisUrl` and `options.redisOptions` -- this exact,
 * flat shape.
 */
export function redisEventBusModule(redis: RedisRuntimeConfig): RedisModuleWiring {
  return {
    resolve: "@medusajs/medusa/event-bus-redis",
    options: {
      redisUrl: redisConnectionUrl(redis),
      redisOptions: redisConnectionOptions(redis),
    },
  };
}

/**
 * The workflow engine: without it, a workflow's async steps, retries and
 * timeouts live only in the process that started them, and die with that
 * pod. `node_modules/@medusajs/workflow-engine-redis/dist/loaders/redis.js`
 * destructures `options.redis.redisUrl` and `options.redis.redisOptions` --
 * one level deeper than the event bus's shape, not the same shape reused.
 */
export function redisWorkflowEngineModule(redis: RedisRuntimeConfig): {
  readonly resolve: string;
  readonly options: { readonly redis: RedisModuleWiring["options"] };
} {
  return {
    resolve: "@medusajs/medusa/workflow-engine-redis",
    options: {
      redis: {
        redisUrl: redisConnectionUrl(redis),
        redisOptions: redisConnectionOptions(redis),
      },
    },
  };
}

/**
 * Locking, once two processes run workflows, needs a lock they both see, or
 * per-process mutual exclusion excludes nothing.
 *
 * **`locking-redis` is a provider inside the `locking` module, not a module
 * of its own.** The `resolve` below is `.../locking`; `locking-redis` only
 * appears nested inside `options.providers`, where
 * `node_modules/@medusajs/locking-redis/dist/loaders/index.js` reads its own
 * `options.redisUrl` / `options.redisOptions` -- the provider's `options`
 * field, not the module's. `is_default: true` is written even though this is
 * the only provider in the list -- `node_modules/@medusajs/locking/dist/loaders/providers.js`
 * promotes a provider over the built-in in-memory default when it is marked
 * `is_default` **or** when it is the only entry, so the flag is redundant
 * today and load-bearing the day a second provider is added.
 */
export function redisLockingModule(redis: RedisRuntimeConfig): {
  readonly resolve: string;
  readonly options: {
    readonly providers: ReadonlyArray<{
      readonly resolve: string;
      readonly id: string;
      readonly is_default: true;
      readonly options: RedisModuleWiring["options"];
    }>;
  };
} {
  return {
    resolve: "@medusajs/medusa/locking",
    options: {
      providers: [
        {
          resolve: "@medusajs/medusa/locking-redis",
          id: "locking-redis",
          is_default: true,
          options: {
            redisUrl: redisConnectionUrl(redis),
            redisOptions: redisConnectionOptions(redis),
          },
        },
      ],
    },
  };
}
