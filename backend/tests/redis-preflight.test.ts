import { spawn } from "node:child_process";
import { connect, createServer, type Server } from "node:net";
import { join } from "node:path";

import { createClient } from "redis";
import { afterEach, describe, expect, it } from "vitest";

import {
  pingRedis,
  redisClientOptions,
  REDIS_PREFLIGHT_TIMEOUT_MS,
  runRedisPreflight,
  type RedisPreflightFailure,
} from "../src/config/redis-preflight";

/**
 * **The regression this suite exists to catch is a credential in a log line**
 * -- see the header of `src/config/redis-preflight.ts` for the mechanism.
 * Nothing below asserts against the preflight's own source text: each check
 * is aimed at something externally observable -- what the preflight emits,
 * the options object it builds, the raw error node-redis raises, or the time
 * a refusal took.
 *
 * The password below is a fixture string, sent to a stub server inside this
 * process and to nothing else; it guards no Redis anywhere.
 */
const FIXTURE_PASSWORD = "preflight-fixture-password-not-a-credential";

/**
 * A Redis that is only as real as these tests need, so the suite needs no
 * server, no container and no network. It has to speak enough RESP to be
 * believed: node-redis 6.2.1 opens every connection by pipelining
 * `HELLO 3 AUTH default <password>`, so `HELLO` is the command that decides
 * authentication here -- rejecting it is this stub's stand-in for a real
 * Redis rejecting `AUTH`.
 */
type StubBehaviour = "answers" | "wrongpass" | "noauth" | "silent";

const HELLO_MAP =
  "%7\r\n" +
  "$6\r\nserver\r\n$5\r\nredis\r\n" +
  "$7\r\nversion\r\n$5\r\n7.4.6\r\n" +
  "$5\r\nproto\r\n:3\r\n" +
  "$2\r\nid\r\n:1\r\n" +
  "$4\r\nmode\r\n$10\r\nstandalone\r\n" +
  "$4\r\nrole\r\n$6\r\nmaster\r\n" +
  "$7\r\nmodules\r\n*0\r\n";

/** Split whatever has arrived into whole RESP command arrays, keeping the tail. */
function takeCommands(pending: Buffer): { commands: string[][]; rest: Buffer<ArrayBufferLike> } {
  const commands: string[][] = [];
  let offset = 0;

  for (;;) {
    const start = offset;

    if (pending[offset] !== 0x2a) break; // '*'

    let end = pending.indexOf("\r\n", offset);
    if (end < 0) break;

    const count = Number(pending.subarray(offset + 1, end).toString());
    offset = end + 2;

    const parts: string[] = [];
    let whole = true;

    for (let index = 0; index < count; index += 1) {
      if (pending[offset] !== 0x24) {
        whole = false;
        break;
      } // '$'

      end = pending.indexOf("\r\n", offset);
      if (end < 0) {
        whole = false;
        break;
      }

      const length = Number(pending.subarray(offset + 1, end).toString());
      offset = end + 2;

      if (pending.length < offset + length + 2) {
        whole = false;
        break;
      }

      parts.push(pending.subarray(offset, offset + length).toString());
      offset += length + 2;
    }

    if (!whole) {
      offset = start;
      break;
    }

    commands.push(parts);
  }

  return { commands, rest: pending.subarray(offset) };
}

const running: Server[] = [];

async function startStubRedis(behaviour: StubBehaviour): Promise<number> {
  const server = createServer((socket) => {
    let pending: Buffer<ArrayBufferLike> = Buffer.alloc(0);

    socket.on("error", () => undefined);
    socket.on("data", (chunk: Buffer) => {
      pending = Buffer.concat([pending, chunk]);

      const { commands, rest } = takeCommands(pending);
      pending = rest;

      if (behaviour === "silent") return;

      for (const command of commands) {
        const name = (command[0] ?? "").toUpperCase();

        if (name === "HELLO") {
          socket.write(
            behaviour === "wrongpass"
              ? "-WRONGPASS invalid username-password pair or user is disabled.\r\n"
              : HELLO_MAP,
          );
        } else if (name === "PING") {
          socket.write(behaviour === "noauth" ? "-NOAUTH Authentication required.\r\n" : "+PONG\r\n");
        } else {
          socket.write("+OK\r\n");
        }
      }
    });
  });

  running.push(server);

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("the stub Redis did not bind a TCP port");
  }

  return address.port;
}

/**
 * A port nothing is listening on, for the unreachable case.
 *
 * The kernel is free to hand this port to an unrelated process the instant
 * the listener below releases it; if that happens, the "unreachable"
 * assertions elsewhere in this file would exercise that process instead --
 * and, if it also refuses or ignores what `pingRedis` sends, would still
 * pass, silently testing nothing. Full determinism is not reachable through
 * Node's `net` API -- a race between this probe and `pingRedis`'s own dial
 * afterwards is always possible. The probe below narrows the window instead:
 * it turns the close-to-probe gap into a loud failure here (the port
 * answering, or answering with something other than a refusal, fails this
 * function instead of letting a later assertion pass for the wrong reason),
 * leaving only the much shorter probe-to-dial gap unguarded.
 */
async function closedPort(): Promise<number> {
  const port = await startStubRedis("answers");
  const server = running.pop();

  await new Promise<void>((resolve) => (server as Server).close(() => resolve()));

  await new Promise<void>((resolve, reject) => {
    const probe = connect({ host: "127.0.0.1", port });

    probe.once("connect", () => {
      probe.destroy();
      reject(new Error(`closedPort(): port ${String(port)} was claimed by another listener`));
    });

    probe.once("error", (error: NodeJS.ErrnoException) => {
      probe.destroy();

      if (error.code === "ECONNREFUSED") {
        resolve();
      } else {
        reject(
          new Error(`closedPort(): port ${String(port)} did not refuse the connection (${error.code ?? "unknown"})`),
        );
      }
    });
  });

  return port;
}

afterEach(async () => {
  await Promise.all(
    running.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))),
  );
});

function configFor(port: number, password = FIXTURE_PASSWORD) {
  return { host: "127.0.0.1", port, password } as const;
}

describe("pingRedis", () => {
  it("reports success when the server answers PONG", async () => {
    await expect(pingRedis(configFor(await startStubRedis("answers")), 2_000)).resolves.toBeUndefined();
  });

  // The two failures are told apart because an operator acts on them
  // differently -- `unreachable` is a networking or start-ordering problem,
  // `authentication` is a credential-rotation incident. Both codes a stub can
  // produce here are pinned; `NOPERM`, `ERR invalid password` and `ERR Client
  // sent AUTH` need a real redis-server -- Q6 item 4. The classification is
  // the only thing
  // that survives the reply -- the reply text itself is discarded.
  it.each<[string, StubBehaviour]>([
    ["WRONGPASS", "wrongpass"],
    ["NOAUTH", "noauth"],
  ])("classifies a %s reply as an authentication failure, distinct from unreachable", async (_code, behaviour) => {
    const failure: RedisPreflightFailure | undefined = await pingRedis(
      configFor(await startStubRedis(behaviour)),
      2_000,
    );

    expect(failure).toBe("authentication");
  });

  // Refusal against a closed port, the checkbox's own example.
  it("reports a closed port as unreachable", async () => {
    await expect(pingRedis(configFor(await closedPort()), 2_000)).resolves.toBe("unreachable");
  });

  /**
   * The bound half of refusal against a closed port: a NetworkPolicy that
   * drops the SYN, or a Redis wedged mid-handshake, answers nothing at all.
   * Without the outer deadline the preflight would wait forever and the pod
   * would report nothing -- strictly worse than the log it replaces, because
   * at least the log arrived. Measured: with the deadline removed, `connect()`
   * against a silent server here is still pending after 12 seconds, so
   * deleting the deadline does not make `resolves.toBe("unreachable")` pass
   * for the wrong reason -- it turns this test red on vitest's own timeout
   * instead, a failure either way. The lower-bound assertion below is what
   * pins the deadline actually elapsing, rather than the promise resolving
   * some other way in under 700ms; the upper bound keeps the elapsed time
   * from drifting materially past that deadline, while staying comfortably
   * inside vitest's unconfigured 5000ms `testTimeout` so it can still fail if
   * that ever stops being true.
   */
  it("gives up on a server that never answers, rather than hanging the workload", async () => {
    const port = await startStubRedis("silent");
    const started = Date.now();

    await expect(pingRedis(configFor(port), 700)).resolves.toBe("unreachable");

    const elapsed = Date.now() - started;
    expect(elapsed).toBeGreaterThanOrEqual(600);
    expect(elapsed).toBeLessThan(2_000);
  });

  it("keeps a deadline short enough to be a preflight", () => {
    expect(REDIS_PREFLIGHT_TIMEOUT_MS).toBeLessThanOrEqual(10_000);
  });
});

/**
 * The header on `src/config/redis-preflight.ts` credits node-redis with an
 * error that carries no command and no arguments -- the property this whole
 * file exists to rely on. That property belongs to node-redis, not to this
 * file's own code, so `pingRedis`'s output can never be evidence for it: it
 * discards the raw error before printing anything. Assert it here instead, on
 * the error node-redis itself raises, so a node-redis upgrade that starts
 * attaching a command to that error turns this suite red. Measured here
 * against redis@6.2.1: the error is a `SimpleError`, and
 * `Object.getOwnPropertyNames` on it is `["message", "stack"]`. The reference
 * implementation states the property narratively and inspects no raw client
 * error, so this assertion is new work rather than a port of one.
 */
describe("the raw client error node-redis raises", () => {
  it("carries only message and stack, never a command or its arguments", async () => {
    const client = createClient(redisClientOptions(configFor(await startStubRedis("wrongpass")), 2_000));
    client.on("error", () => undefined);

    let caught: unknown;

    try {
      await client.connect();
    } catch (error) {
      caught = error;
    } finally {
      try {
        client.destroy();
      } catch {
        // Nothing to release.
      }
    }

    expect(caught).toBeInstanceOf(Error);
    // The error caught above must be the server's `-WRONGPASS` reply, not
    // some other failure `connect()` raised first -- otherwise a future
    // node-redis that fails the handshake earlier, for an unrelated reason,
    // would make this guard inspect the wrong error, find no `command` on
    // it, and pass green while the reply error carrying the command escaped
    // unpinned.
    expect((caught as Error).message).toContain("WRONGPASS");
    expect(Object.getOwnPropertyNames(caught).sort()).toEqual(["message", "stack"]);
  });
});

/**
 * The password reaches the client options and never a connection string.
 * Asserted on the object `pingRedis` actually hands `createClient` -- not on
 * a claim about the library.
 */
describe("redisClientOptions", () => {
  it("carries the password on the options object, and constructs no connection string", () => {
    const options = redisClientOptions(configFor(6379, FIXTURE_PASSWORD), 1_234);

    expect(options.password).toBe(FIXTURE_PASSWORD);
    expect(options.socket).toMatchObject({ host: "127.0.0.1", port: 6379, connectTimeout: 1_234 });

    // No `url` field exists for a `redis://user:password@host:port` string to
    // hide in, and nothing anywhere in the options carries the password
    // except the dedicated `.password` field.
    expect("url" in options).toBe(false);
    const rest: Record<string, unknown> = { ...options };
    delete rest.password;
    expect(JSON.stringify(rest)).not.toContain(FIXTURE_PASSWORD);
  });
});

/**
 * What the preflight writes, captured from the streams it writes to, because
 * "does not print the password" is a claim about output and nothing else.
 */
async function captureRedisPreflight(environment: Record<string, string | undefined>): Promise<{
  code: number;
  output: string;
}> {
  const restore = { ...process.env };
  const chunks: string[] = [];
  const write = (chunk: unknown): boolean => {
    chunks.push(String(chunk));
    return true;
  };
  const stdout = process.stdout.write.bind(process.stdout);
  const stderr = process.stderr.write.bind(process.stderr);

  for (const [name, value] of Object.entries(environment)) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }

  process.stdout.write = write as typeof process.stdout.write;
  process.stderr.write = write as typeof process.stderr.write;

  try {
    return { code: await runRedisPreflight(), output: chunks.join("") };
  } finally {
    process.stdout.write = stdout;
    process.stderr.write = stderr;
    for (const name of Object.keys(process.env)) {
      if (!(name in restore)) delete process.env[name];
    }
    Object.assign(process.env, restore);
  }
}

describe("what the preflight writes", () => {
  // A real credential rejection, driven end to end through this file's own
  // entry point, with the assertion made against the process output rather
  // than against source code.
  it("names the variable and never the password when the credential is refused", async () => {
    const port = await startStubRedis("wrongpass");
    const { code, output } = await captureRedisPreflight({
      REDIS_HOST: "127.0.0.1",
      REDIS_PORT: String(port),
      REDIS_PASSWORD: FIXTURE_PASSWORD,
    });

    expect(code).toBe(1);
    expect(output).not.toContain(FIXTURE_PASSWORD);
    expect(output).toContain("REDIS_PASSWORD");
    // The operational fact the 29-line dump buried, and the reason a
    // WRONGPASS crash-loop is a rotation event rather than a restart.
    expect(output).toContain("credential-rotation event");
    // Nothing the server said, and no rendered error object.
    expect(output).not.toContain("WRONGPASS");
    expect(output).not.toContain("command:");
  });

  it("names the host and port variables, and no password, when nothing answers", async () => {
    const { code, output } = await captureRedisPreflight({
      REDIS_HOST: "127.0.0.1",
      REDIS_PORT: String(await closedPort()),
      REDIS_PASSWORD: FIXTURE_PASSWORD,
    });

    expect(code).toBe(1);
    expect(output).not.toContain(FIXTURE_PASSWORD);
    expect(output).toContain("REDIS_HOST");
    expect(output).toContain("REDIS_PORT");
    expect(output).not.toContain("ECONNREFUSED");
  });

  it("says the ping was answered, and nothing else, on the path that succeeds", async () => {
    const { code, output } = await captureRedisPreflight({
      REDIS_HOST: "127.0.0.1",
      REDIS_PORT: String(await startStubRedis("answers")),
      REDIS_PASSWORD: FIXTURE_PASSWORD,
    });

    expect(code).toBe(0);
    expect(output).toContain("PING answered");
    expect(output).not.toContain(FIXTURE_PASSWORD);
  });

  /**
   * The one path that quotes an upstream message: a configuration
   * `readRedisRuntimeConfig` refuses. It is quoted because every throw in
   * that function names the variable and never its value -- and this is the
   * assertion that keeps it true, with a malformed port and a real-looking
   * password both distinctive enough that either leaking would fail here.
   */
  it("quotes the configuration refusal without quoting either value", async () => {
    const { code, output } = await captureRedisPreflight({
      REDIS_HOST: "127.0.0.1",
      REDIS_PORT: "6379zzz-not-a-port",
      REDIS_PASSWORD: FIXTURE_PASSWORD,
    });

    expect(code).toBe(1);
    expect(output).not.toContain(FIXTURE_PASSWORD);
    expect(output).not.toContain("6379zzz-not-a-port");
    expect(output).toContain("REDIS_PORT");
  });

  it("refuses a missing password by name", async () => {
    const { code, output } = await captureRedisPreflight({
      REDIS_HOST: "127.0.0.1",
      REDIS_PORT: "6379",
      REDIS_PASSWORD: undefined,
    });

    expect(code).toBe(1);
    expect(output).toContain("REDIS_PASSWORD");
  });
});

/**
 * The whole mechanism, as a process, because everything above calls an
 * exported function and the image calls a file.
 *
 * This is what `npm run redis:preflight` runs in a source checkout; the built
 * image runs the compiled `.js` beside it. It proves the three things the
 * in-process assertions cannot: that the module runs itself when it is the
 * entry point, that a refusal becomes a non-zero exit status so `&&` stops
 * before Medusa, and that nothing -- not an unhandled `error` event, not a
 * rendered stack -- puts the password on a stream on the way out. This is
 * the leak-freedom claim's end-to-end form.
 */
describe("the preflight as the image runs it", () => {
  it(
    "exits non-zero on a refused credential with no copy of it anywhere in the output",
    async () => {
      const port = await startStubRedis("wrongpass");
      const backend = join(__dirname, "..");

      // `spawn`, never `spawnSync`: the stub Redis is served by this
      // process's own event loop, and a synchronous spawn blocks it -- the
      // child would find a socket nothing ever accepts and report the wrong
      // failure.
      const child = spawn(
        process.execPath,
        ["-r", "ts-node/register", join(backend, "src", "config", "redis-preflight.ts")],
        {
          cwd: backend,
          env: {
            ...process.env,
            REDIS_HOST: "127.0.0.1",
            REDIS_PORT: String(port),
            REDIS_PASSWORD: FIXTURE_PASSWORD,
          },
        },
      );

      let output = "";
      child.stdout.on("data", (chunk: Buffer) => (output += chunk.toString()));
      child.stderr.on("data", (chunk: Buffer) => (output += chunk.toString()));

      const status = await new Promise<number | null>((resolve) => {
        child.on("close", resolve);
      });

      expect(status).toBe(1);
      expect(output).not.toContain(FIXTURE_PASSWORD);
      expect(output).toContain("REDIS_PASSWORD");
      expect(output).toContain("credential-rotation event");
    },
    60_000,
  );
});
