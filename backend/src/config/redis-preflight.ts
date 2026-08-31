// Extensionless on purpose, exactly as `runtime.ts` imports its own neighbours
// and for the same reason: the `redis:preflight` script runs this file from the
// compiled `.js` in the image and from the `.ts` through `ts-node` in a source
// checkout, and ts-node resolves a relative specifier literally -- a `.js`
// suffix here would not map back onto the `.ts` file beside it.
import { createClient, type RedisClientOptions } from "redis";

import { readRedisRuntimeConfig, type RedisRuntimeConfig } from "./runtime";

/**
 * **One `PING` in front of Medusa, because a Medusa that dials Redis itself
 * writes the password into the pod log.**
 *
 * `ioredis` -- the client `event-bus-redis`, `workflow-engine-redis` and
 * `locking-redis` each declare as their own direct dependency at `^5.4.1`
 * (each package's own `package.json`), resolved and deduped to 5.11.1
 * (`npm ls ioredis` inside `backend/`, checked at T5b once `@medusajs/medusa`
 * was installed -- this was an open question, Q6 item 3, until then), and the
 * one this repository never imports directly -- attaches the failing command
 * to its `ReplyError`:
 *
 * ```text
 * ReplyError: WRONGPASS invalid username-password pair or user is disabled.
 *     at parseError (…/redis-parser/lib/parser.js:179:12) {
 *   command: { name: 'auth', args: [ '<the password, in plaintext>' ] }
 * }
 * ```
 *
 * Nothing redacts it, because nothing formats it: `@medusajs/cli`'s entry point
 * installs `process.on("uncaughtException", (error) => console.log(error))`,
 * and `console.log` of an `Error` is `util.inspect`, which prints every
 * enumerable own property the error carries. Measured from this repository's
 * own `medusa build` output against a real Redis 8 started with
 * `--requirepass` (Q6, 2026-08-30, admin bundle stubbed): one failed
 * `medusa start` wrote the plaintext password 24 times, twice over, and one
 * `medusa db:migrate` — which exits 0 — wrote it 6 more on a first migration
 * and 4 on a rerun. Neither count is a constant: it moves with how much work
 * start-up and migration do before giving up, which is why the reference
 * measured 29 on its own, heavier build.
 *
 * **T11 built the image this admin bundle was stubbed against, and nothing on
 * the route that produced those counts changed.** `@medusajs/cli`'s handler
 * is unchanged at 2.18.0 (`node_modules/@medusajs/cli/dist/index.js:29`,
 * `console.log(error)` on `uncaughtException`), and it fires on a
 * module-loading failure -- a `redisUrl` a loader could not connect. The
 * Express `app` itself is built by the caller and handed in
 * (`node_modules/@medusajs/medusa/dist/commands/start.js:213-215`); what
 * precedes the admin bundle is the loader ordering inside it --
 * `MedusaAppLoader().load()` (`loaders/index.js:121`) runs before
 * `loadEntrypoints` (`:133`), which is what reaches the admin loader
 * (`:78`, `node_modules/@medusajs/medusa/dist/loaders/admin.js`'s
 * `serveProductionBuild`). A real admin bundle instead of a stubbed one
 * changes nothing this leak reaches through, so this is not an image
 * measurement and does not claim to be one.
 *
 * So the failure is moved in front of Medusa, and this file is the whole of
 * what runs there. It has three properties, and each of them is why it exists:
 *
 * 1. **It uses `redis`, not `ioredis`.** node-redis raises an error carrying
 *    the server's reply text and no command and no arguments -- pinned in
 *    `tests/redis-preflight.test.ts` by asserting the raw client error's own
 *    properties against a stub server, so a node-redis upgrade that starts
 *    attaching a command turns that suite red -- so the client this file
 *    dials with cannot reproduce the leak it exists to prevent. `ioredis`
 *    arrives only inside Medusa's own modules (T5b) and must not be imported
 *    here.
 * 2. **It prints no value it read**, and renders no error object. Not the
 *    password, not the host, not the port. The two connection failures below
 *    are classified from the reply and then described in this file's own
 *    words -- the reply text itself is read and discarded. Measured
 *    2026-08-30, a pre-6 server's `HELLO` rejection puts the password
 *    directly into that same text -- `ERR unknown command 'HELLO', with args
 *    beginning with: '3', 'AUTH', 'default', '<password>'` -- which this rule
 *    already discards. Configuration
 *    refusals raised by `readRedisRuntimeConfig` do surface their own message
 *    (see the `refused` branch), which names a variable and never a value.
 *    That is the standard `runtime.ts` and `database-url.ts` already keep:
 *    name the
 *    variable, never the value.
 * 3. **It is bounded.** A Redis whose SYN is dropped by a NetworkPolicy answers
 *    nothing at all, so a connect timeout and an outer deadline are both here.
 *    A preflight that hangs is a pod that never reports anything, which is
 *    worse than the log it replaces.
 *
 * **What it also closes.** `medusa db:migrate` exits 0 with no Redis at all,
 * and equally with a wrong password -- both measured 2026-08-30 -- so
 * `predeploy` would migrate happily against a Redis that was never there and
 * fail one command later. With the preflight in front of it the Job refuses
 * first, and a green migration stops being evidence of nothing.
 *
 * **What it is not.** It is a check at one instant, not a guarantee. A
 * password rotated in Redis while a pod is running still reaches `ioredis`,
 * and that pod still logs it.
 */
export const REDIS_PREFLIGHT_TIMEOUT_MS = 5_000;

export type RedisPreflightFailure = "unreachable" | "authentication";

/**
 * The replies that mean *the credential was refused* rather than *nothing
 * answered*.
 *
 * The distinction is the one an operator acts on differently: `unreachable` is
 * a networking or ordering problem, `authentication` is a credential-rotation
 * incident. Matching is on the RESP error code at the start of the reply --
 * `WRONGPASS` for a wrong password against `--requirepass` or an ACL user,
 * `NOAUTH` for a server that wanted a password it was not given, `NOPERM` for
 * an ACL that permits no `PING`, the pre-6 `ERR invalid password`, and the
 * pre-6 `ERR Client sent AUTH` for a server with no password set — both
 * measured against redis:5.0.14 and only there: from 6.0.0 a passwordless
 * server answers a bare AUTH with `ERR AUTH <password> called without any
 * password configured for the default user`, which this pattern deliberately
 * leaves to `unreachable`. Through node-redis 6.2.1 neither pre-6 reply is
 * reachable anyway — the client opens with `HELLO 3 AUTH`, which Redis 5
 * rejects as an unknown command and a passwordless Redis 6+ accepts outright.
 *
 * Anything unmatched is reported as `unreachable`, which is the safe
 * direction: it is the message that claims less.
 */
const AUTHENTICATION_REPLY =
  /^(?:WRONGPASS|NOAUTH|NOPERM)\b|^ERR (?:Client sent AUTH|invalid password)/;

/**
 * The exact options handed to `redis`'s `createClient` -- exported so
 * `tests/redis-preflight.test.ts` can assert on the object itself rather than
 * on `pingRedis`'s side effects: the password lives on `.password`, the
 * socket carries host, port, the connect timeout and no reconnection, and no
 * `url` field exists for a
 * connection string to hide in.
 */
export function redisClientOptions(
  redis: RedisRuntimeConfig,
  timeoutMs: number = REDIS_PREFLIGHT_TIMEOUT_MS,
): RedisClientOptions {
  return {
    disableOfflineQueue: true,
    password: redis.password,
    socket: {
      connectTimeout: timeoutMs,
      host: redis.host,
      port: redis.port,
      reconnectStrategy: false,
    },
  };
}

/**
 * Dial the configured Redis, authenticate, `PING`, and say what happened.
 *
 * Resolves `undefined` when the server answered `PONG`. It never rejects, and
 * it returns no text the server sent -- only a classification of it.
 */
export async function pingRedis(
  redis: RedisRuntimeConfig,
  timeoutMs: number = REDIS_PREFLIGHT_TIMEOUT_MS,
): Promise<RedisPreflightFailure | undefined> {
  const client = createClient(redisClientOptions(redis, timeoutMs));

  // **Load-bearing, not defensive.** An `error` event with no listener is
  // fatal, and Node renders it by inspecting the error object -- the exact
  // rendering this file replaces with one line.
  //
  // Measured against redis@6.2.1 on Node v24.18.1 by deleting this line and
  // driving pingRedis at stub servers: a mid-handshake RST and a
  // close-after-reply both crash the process without it. What that restores is
  // a rendered error object and a stack in place of this file's one line --
  // not the credential leak, since neither a socket error nor a node-redis
  // reply error carries command arguments; the reply error is the one the
  // suite below pins.
  client.on("error", () => undefined);

  let deadline: ReturnType<typeof setTimeout> | undefined;

  try {
    await Promise.race([
      (async () => {
        await client.connect();
        await client.ping();
      })(),
      new Promise<never>((_resolve, reject) => {
        deadline = setTimeout(() => {
          reject(new Error("Redis preflight deadline elapsed"));
        }, timeoutMs);
      }),
    ]);

    return undefined;
  } catch (error) {
    return classifyFailure(error);
  } finally {
    if (deadline !== undefined) {
      clearTimeout(deadline);
    }

    // `destroy` on a client that never connected is allowed to throw, and a
    // preflight that crashed while tidying up would print a stack instead of
    // its one line.
    try {
      client.destroy();
    } catch {
      // Nothing to release.
    }
  }
}

/**
 * Read the reply, keep the classification, discard the text.
 *
 * `message` is deliberately never returned, logged or interpolated. It is a
 * string from the server, and the rule this file keeps is that nothing it did
 * not write itself reaches the log.
 */
function classifyFailure(error: unknown): RedisPreflightFailure {
  const message = error instanceof Error ? error.message : "";

  return AUTHENTICATION_REPLY.test(message) ? "authentication" : "unreachable";
}

/**
 * The two refusals, in this file's own words.
 *
 * Each names the variables that decide the outcome and quotes none of them.
 * `unreachable` covers both an instantly refused connection and one that never
 * answered before the deadline -- an operator sees the same symptom either
 * way, REDIS_HOST or REDIS_PORT pointing somewhere wrong, and a duration
 * cannot be quoted here that is true of both: a refused connection returns in
 * about 0ms, not the bound. `authentication` says *credential-rotation event*
 * on purpose: that is the operational fact the old 29-line dump buried, and
 * the reason a WRONGPASS crash-loop is not merely a restart.
 */
const REFUSAL: Record<RedisPreflightFailure, string> = {
  unreachable:
    "no Redis answered. REDIS_HOST and REDIS_PORT name the server this workload " +
    "must reach before Medusa starts, and nothing usable answered there.",
  authentication:
    "Redis refused the credential. REDIS_PASSWORD does not match this server's, " +
    "so this is a credential-rotation event and not a restart.",
};

export async function runRedisPreflight(): Promise<number> {
  let redis: RedisRuntimeConfig;

  try {
    redis = readRedisRuntimeConfig(process.env);
  } catch (error) {
    // Safe to quote: every throw in `readRedisRuntimeConfig` names the
    // variable and never its value, and `tests/redis-preflight.test.ts` holds
    // it to that by running this path with a malformed port and a
    // real-looking password and asserting neither value appears.
    const named = error instanceof Error ? error.message : "the Redis configuration is unusable";
    process.stderr.write(`Redis preflight refused: ${named}\n`);

    return 1;
  }

  const failure = await pingRedis(redis);

  if (failure === undefined) {
    process.stdout.write("Redis preflight: PING answered.\n");

    return 0;
  }

  process.stderr.write(`Redis preflight failed: ${REFUSAL[failure]}\n`);

  return 1;
}

if (require.main === module) {
  void runRedisPreflight().then((code) => {
    process.exitCode = code;
  });
}
