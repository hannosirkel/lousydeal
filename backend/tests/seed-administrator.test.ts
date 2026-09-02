import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import type { ExecArgs, MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

import { ConfigError } from "../src/config/env";
import {
  describeAdministratorSeedOutcome,
  readAdministratorCredentials,
  seedInitialAdministrator,
  type AdministratorSeedPort,
} from "../src/admin/seed-administrator";
import seedAdministrator from "../src/scripts/seed-administrator";

const credentials = {
  email: "admin@example.test",
  password: "an-ordinary-password",
} as const;

function port(overrides: Partial<AdministratorSeedPort> = {}): AdministratorSeedPort {
  return {
    findAdministrator: vi.fn(async () => undefined),
    findAuthIdentity: vi.fn(async () => undefined),
    registerAuthIdentity: vi.fn(async () => ({ id: "authid_01" })),
    createAdministrator: vi.fn(async () => ({ id: "user_01" })),
    linkAuthIdentity: vi.fn(async () => undefined),
    ...overrides,
  };
}

/**
 * A store that actually holds state, rather than stubs that answer in
 * isolation.
 *
 * The defect this replaces was invisible to stubs: each call answered
 * plausibly on its own, and only the *sequence* -- create the user, fail
 * before linking, run again -- produced an administrator nobody could sign
 * in as. So the tests below run the real function against a store that
 * remembers what previous runs did, and interrupt it at a chosen step.
 *
 * `canSignIn` is the whole point of the exercise, and it is deliberately the
 * complete condition rather than a proxy for it: a user exists, an
 * `emailpass` identity exists for the same address, that identity's
 * `app_metadata.user_id` points at that user, and the password on it is the
 * one being offered. Three of those four were true in the broken state.
 */
function fakeStore() {
  interface StoredIdentity {
    id: string;
    password: string;
    app_metadata?: Record<string, unknown>;
  }

  const users = new Map<string, { id: string }>();
  const identities = new Map<string, StoredIdentity>();
  const interrupt = { register: false, create: false, link: false };
  let sequence = 0;

  const seedPort: AdministratorSeedPort = {
    findAdministrator: async (email) => users.get(email),

    findAuthIdentity: async (email) => identities.get(email),

    registerAuthIdentity: async (email, password) => {
      if (interrupt.register) throw new Error("interrupted at register");
      // Stricter than the real provider on purpose: `@medusajs/auth-emailpass`
      // does not refuse a duplicate here, it silently rotates the password of
      // whatever identity it finds (see `admin/seed-administrator.ts`'s
      // comment on `seedInitialAdministrator` for the exact branch). Adoption
      // is supposed to make this path unreachable; throwing turns a second
      // `registerAuthIdentity` call for the same address into a loud test
      // failure instead of a silent, unnoticed password rotation.
      if (identities.has(email)) throw new Error("identity already exists");
      const identity: StoredIdentity = { id: `authid_${++sequence}`, password };
      identities.set(email, identity);
      return identity;
    },

    createAdministrator: async (email) => {
      if (interrupt.create) throw new Error("interrupted at create");
      if (users.has(email)) throw new Error("duplicate email");
      const user = { id: `user_${++sequence}` };
      users.set(email, user);
      return user;
    },

    linkAuthIdentity: async (authIdentityId, userId) => {
      if (interrupt.link) throw new Error("interrupted at link");
      const identity = [...identities.values()].find((each) => each.id === authIdentityId);
      if (!identity) throw new Error(`no such auth identity: ${authIdentityId}`);
      identity.app_metadata = { ...identity.app_metadata, user_id: userId };
    },
  };

  return {
    port: seedPort,
    interrupt,
    users,
    identities,
    canSignIn(email: string, password: string): boolean {
      const user = users.get(email);
      const identity = identities.get(email);
      return Boolean(
        user && identity && identity.app_metadata?.user_id === user.id && identity.password === password,
      );
    },
  };
}

describe("readAdministratorCredentials", () => {
  /**
   * `predeploy-job.yaml` (once T14c lands) projects both from the
   * `*-database-admin` Secret -- not that Secret's only consumer, since the
   * PostgreSQL StatefulSet reads its `POSTGRES_SUPERUSER_PASSWORD` key
   * independently, but the only consumer of these two. If either arrives
   * empty the Job must say which, rather than seeding an administrator
   * nobody can sign in as.
   */
  it("refuses without either value, naming it", () => {
    expect(() => readAdministratorCredentials({ MEDUSA_ADMIN_PASSWORD: "x" })).toThrow(ConfigError);
    expect(() => readAdministratorCredentials({ MEDUSA_ADMIN_PASSWORD: "x" })).toThrow(/MEDUSA_ADMIN_EMAIL/);
    expect(() => readAdministratorCredentials({ MEDUSA_ADMIN_EMAIL: credentials.email })).toThrow(
      /MEDUSA_ADMIN_PASSWORD/,
    );
    expect(() =>
      readAdministratorCredentials({
        MEDUSA_ADMIN_EMAIL: credentials.email,
        MEDUSA_ADMIN_PASSWORD: "   ",
      }),
    ).toThrow(/MEDUSA_ADMIN_PASSWORD/);
  });

  it("rejects an address that could carry a second header line", () => {
    expect(() =>
      readAdministratorCredentials({
        MEDUSA_ADMIN_EMAIL: "admin@example.test\r\nBcc: attacker@example.test",
        MEDUSA_ADMIN_PASSWORD: "x",
      }),
    ).toThrow(/MEDUSA_ADMIN_EMAIL/);
  });

  /** A Job log is not a place for the administrator password. */
  it("never puts the password in the refusal", () => {
    let raised: unknown;
    try {
      readAdministratorCredentials({
        MEDUSA_ADMIN_EMAIL: "not-an-address",
        MEDUSA_ADMIN_PASSWORD: credentials.password,
      });
    } catch (error) {
      raised = error;
    }

    expect(raised).toBeInstanceOf(Error);
    expect(`${(raised as Error).message}\n${(raised as Error).stack ?? ""}`).not.toContain(credentials.password);
  });

  it("returns both values when both are supplied", () => {
    expect(
      readAdministratorCredentials({
        MEDUSA_ADMIN_EMAIL: `  ${credentials.email}  `,
        MEDUSA_ADMIN_PASSWORD: credentials.password,
      }),
    ).toEqual(credentials);
  });
});

describe("describeAdministratorSeedOutcome", () => {
  // The signature carries no `password` parameter -- there is nothing for a
  // future edit to interpolate by mistake, short of adding one. This test
  // pins the current, safe signature's output rather than that guarantee.
  it("names the outcome and the address, and nothing else", () => {
    expect(describeAdministratorSeedOutcome("created", credentials.email)).toBe(
      `initial administrator created: ${credentials.email}`,
    );
    expect(describeAdministratorSeedOutcome("already-present", credentials.email)).toBe(
      `initial administrator already-present: ${credentials.email}`,
    );
  });
});

describe("seedInitialAdministrator", () => {
  it("registers the identity, creates the user and links them", async () => {
    const seed = port();

    await expect(seedInitialAdministrator(seed, credentials)).resolves.toBe("created");

    expect(seed.registerAuthIdentity).toHaveBeenCalledWith(credentials.email, credentials.password);
    expect(seed.createAdministrator).toHaveBeenCalledWith(credentials.email);
    expect(seed.linkAuthIdentity).toHaveBeenCalledWith("authid_01", "user_01");
  });

  /**
   * The Job is an Argo CD sync hook. It runs again on every promoted digest,
   * against a database that already has an administrator, and a second run
   * must be a no-op rather than a duplicate-email failure that blocks the
   * sync.
   */
  it("is a no-op when the administrator already exists and can sign in", async () => {
    const seed = port({
      findAdministrator: vi.fn(async () => ({ id: "user_01" })),
      findAuthIdentity: vi.fn(async () => ({
        id: "authid_01",
        app_metadata: { user_id: "user_01" },
      })),
    });

    await expect(seedInitialAdministrator(seed, credentials)).resolves.toBe("already-present");

    expect(seed.registerAuthIdentity).not.toHaveBeenCalled();
    expect(seed.createAdministrator).not.toHaveBeenCalled();
    expect(seed.linkAuthIdentity).not.toHaveBeenCalled();
  });

  /**
   * Never rotates the password of an administrator who already exists. The
   * Job runs on every sync; re-registering would reset a password the
   * operator may since have changed, from a Secret, silently.
   */
  it("does not re-register an existing administrator's credentials", async () => {
    const seed = port({
      findAdministrator: vi.fn(async () => ({ id: "user_01" })),
      findAuthIdentity: vi.fn(async () => ({
        id: "authid_01",
        app_metadata: { user_id: "user_01" },
      })),
    });

    await seedInitialAdministrator(seed, credentials);

    expect(seed.registerAuthIdentity).not.toHaveBeenCalled();
  });

  /**
   * An existing administrator is not evidence of a complete one.
   *
   * The user is created before the identity is linked, so an interruption in
   * that window leaves a user with no identity pointing at them. Returning
   * `already-present` on the user alone would make every later run
   * short-circuit on the wreckage of the first, and -- because the Job then
   * exits 0 -- turn a broken environment into a green Argo CD sync.
   */
  it("repairs an administrator whose identity was never linked", async () => {
    const seed = port({ findAdministrator: vi.fn(async () => ({ id: "user_01" })) });

    await expect(seedInitialAdministrator(seed, credentials)).resolves.toBe("repaired");

    expect(seed.createAdministrator).not.toHaveBeenCalled();
    expect(seed.registerAuthIdentity).toHaveBeenCalledWith(credentials.email, credentials.password);
    expect(seed.linkAuthIdentity).toHaveBeenCalledWith("authid_01", "user_01");
  });

  /** The same repair where the identity survived but the link did not. */
  it("relinks an existing identity rather than registering a second one", async () => {
    const seed = port({
      findAdministrator: vi.fn(async () => ({ id: "user_01" })),
      findAuthIdentity: vi.fn(async () => ({ id: "orphan_01" })),
    });

    await expect(seedInitialAdministrator(seed, credentials)).resolves.toBe("repaired");

    expect(seed.registerAuthIdentity).not.toHaveBeenCalled();
    expect(seed.linkAuthIdentity).toHaveBeenCalledWith("orphan_01", "user_01");
  });

  /** An identity pointing at some other user cannot sign this one in either. */
  it("repairs an identity linked to a different user", async () => {
    const seed = port({
      findAdministrator: vi.fn(async () => ({ id: "user_01" })),
      findAuthIdentity: vi.fn(async () => ({
        id: "authid_01",
        app_metadata: { user_id: "user_99" },
      })),
    });

    await expect(seedInitialAdministrator(seed, credentials)).resolves.toBe("repaired");

    expect(seed.registerAuthIdentity).not.toHaveBeenCalled();
    expect(seed.linkAuthIdentity).toHaveBeenCalledWith("authid_01", "user_01");
  });

  /**
   * The half-created state a previous attempt can leave behind.
   * `backoffLimit` on the Job means a retry is the expected recovery, so an
   * identity without a user must be adopted rather than re-registered.
   * Adoption is not merely the safer option here -- `register` would not
   * refuse this duplicate, it would silently rotate the orphan's password
   * (`admin/seed-administrator.ts`'s comment on `seedInitialAdministrator`
   * cites the exact provider branch), which is the state a retry must not
   * produce.
   */
  it("adopts an orphaned auth identity from an interrupted run", async () => {
    const seed = port({ findAuthIdentity: vi.fn(async () => ({ id: "orphan_01" })) });

    await expect(seedInitialAdministrator(seed, credentials)).resolves.toBe("created");

    expect(seed.registerAuthIdentity).not.toHaveBeenCalled();
    expect(seed.linkAuthIdentity).toHaveBeenCalledWith("orphan_01", "user_01");
  });

  it("reports a failure without the password in it", async () => {
    const seed = port({
      registerAuthIdentity: vi.fn(async () => {
        throw new Error("the provider refused");
      }),
    });

    await expect(seedInitialAdministrator(seed, credentials)).rejects.toThrow(/the provider refused/);
  });
});

/**
 * Every way a run can be cut short, driven against a store that remembers.
 *
 * This is the Job's real recovery path rather than a hypothetical one:
 * `backoffLimit: 2` (`predeploy-job.yaml`) means Kubernetes reruns the pod
 * after a non-zero exit, and Argo CD reruns the hook on every promoted
 * digest. What matters is not that a rerun *succeeds* -- it is that the
 * administrator can sign in afterwards. A rerun that returns
 * `already-present` over a half-built administrator exits 0, turns the sync
 * green, and hides the damage until somebody tries the Admin.
 *
 * **This is also the idempotency the checkbox names.** Every scenario below
 * that ends by running the seeding twice against the same store is the proof
 * it demands: the second run resolves `already-present`, issues none of the
 * three writes, and leaves the same administrator able to sign in with the
 * same password.
 */
describe("seedInitialAdministrator across interrupted runs", () => {
  const { email, password } = credentials;

  it("leaves an administrator who can sign in, uninterrupted, and running it again changes nothing", async () => {
    const store = fakeStore();

    await expect(seedInitialAdministrator(store.port, credentials)).resolves.toBe("created");
    expect(store.canSignIn(email, password)).toBe(true);

    const usersBefore = new Map(store.users);
    const identitiesBefore = new Map(store.identities);

    await expect(seedInitialAdministrator(store.port, credentials)).resolves.toBe("already-present");
    expect(store.canSignIn(email, password)).toBe(true);
    expect(store.users).toEqual(usersBefore);
    expect(store.identities).toEqual(identitiesBefore);
  });

  /** Window A: interrupted between registering the identity and creating the user. */
  it("recovers when the first run died before the user existed", async () => {
    const store = fakeStore();

    store.interrupt.create = true;
    await expect(seedInitialAdministrator(store.port, credentials)).rejects.toThrow(/interrupted at create/);
    expect(store.canSignIn(email, password)).toBe(false);

    store.interrupt.create = false;
    await expect(seedInitialAdministrator(store.port, credentials)).resolves.toBe("created");
    expect(store.canSignIn(email, password)).toBe(true);
  });

  /**
   * Window B: interrupted between creating the user and linking the
   * identity.
   *
   * This is the one that would otherwise end with a green sync and an Admin
   * nobody could sign in to, and it would never self-heal -- the third run
   * would short-circuit on the same user as the second.
   */
  it("recovers when the first run died after the user existed but before the link", async () => {
    const store = fakeStore();

    store.interrupt.link = true;
    await expect(seedInitialAdministrator(store.port, credentials)).rejects.toThrow(/interrupted at link/);
    expect(store.users.get(email)).toBeDefined();
    expect(store.canSignIn(email, password)).toBe(false);

    store.interrupt.link = false;
    await expect(seedInitialAdministrator(store.port, credentials)).resolves.toBe("repaired");
    expect(store.canSignIn(email, password)).toBe(true);

    await expect(seedInitialAdministrator(store.port, credentials)).resolves.toBe("already-present");
    expect(store.canSignIn(email, password)).toBe(true);
  });

  /** Neither window may end with two identities for one address. */
  it("never registers a second identity for the same address", async () => {
    const store = fakeStore();

    store.interrupt.link = true;
    await expect(seedInitialAdministrator(store.port, credentials)).rejects.toThrow();
    store.interrupt.link = false;

    await seedInitialAdministrator(store.port, credentials);
    await seedInitialAdministrator(store.port, credentials);

    expect(store.identities.size).toBe(1);
    expect(store.users.size).toBe(1);
  });

  /**
   * A repair must not become a password reset for an administrator who is
   * already able to sign in. The Job holds the Secret on every sync; if a
   * later run re-registered, rotating the password through Medusa would be
   * undone silently at the next promoted digest.
   */
  it("does not overwrite the password of an administrator who can already sign in", async () => {
    const store = fakeStore();

    await seedInitialAdministrator(store.port, credentials);
    await seedInitialAdministrator(store.port, { email, password: "a-different-password" });

    expect(store.canSignIn(email, password)).toBe(true);
    expect(store.canSignIn(email, "a-different-password")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The script entry point, driven directly -- with a fake container rather
// than the pure port, so the assertions below cover the actual code
// `npm run seed:administrator` runs: the container-resolved logger, and the
// two Medusa services adapted into an AdministratorSeedPort.
// ---------------------------------------------------------------------------

/**
 * A password that would be unmistakable if it leaked -- into a log line, an
 * error message, or a stack trace -- rather than a fixture indistinguishable
 * from ordinary text. A test asserting "the password is absent" against a
 * value like `"password123"` proves nothing: plenty of unrelated strings
 * also lack it. This one is sent to a fake auth service inside this process
 * and to nothing else; it guards no account anywhere.
 */
const CANARY_PASSWORD = "⚡canary-pw-9f3c2e7a-would-be-visibly-wrong-if-logged⚡";

interface FakeWorld {
  users: Map<string, { id: string }>;
  identities: Map<string, { id: string; password: string; app_metadata?: Record<string, unknown> }>;
  sequence: number;
  /** When set, `register` returns this as the provider's own refusal text instead of creating an identity. */
  failRegisterWith?: string;
  /** When true, `createUsers` throws -- the window between registering the identity and creating the user. */
  throwOnCreateUser?: boolean;
  /** When true, `updateAuthIdentities` throws -- the window between creating the user and linking the identity. */
  throwOnLink?: boolean;
}

function fakeWorld(): FakeWorld {
  return { users: new Map(), identities: new Map(), sequence: 0 };
}

/**
 * Fakes of the two Medusa services the script's `AdministratorSeedPort`
 * adapts -- shaped only to the calls `src/scripts/seed-administrator.ts`
 * actually makes, and returned untyped: the container these plug into is
 * itself cast `as unknown as MedusaContainer` below, the same escape hatch
 * `tests/commerce-configuration.test.ts`'s `fakeContainer` uses, so nothing
 * here needs to satisfy Medusa's full service interfaces.
 */
function fakeAuthService(world: FakeWorld) {
  return {
    listAuthIdentities: async (filter: { provider_identities?: { entity_id?: string } }) => {
      const email = filter.provider_identities?.entity_id;
      const identity = email === undefined ? undefined : world.identities.get(email);
      return identity === undefined ? [] : [{ id: identity.id, app_metadata: identity.app_metadata }];
    },

    register: async (_provider: string, providerData: { body?: { email?: string; password?: string } }) => {
      const email = providerData.body?.email ?? "";
      const password = providerData.body?.password ?? "";

      if (world.failRegisterWith !== undefined) {
        return { error: world.failRegisterWith };
      }

      if (world.identities.has(email)) {
        // Stricter than the real provider here too -- see the matching
        // comment in `fakeStore` above for why this is a deliberate
        // divergence, not a model of what `@medusajs/auth-emailpass` does.
        return { error: "identity already exists" };
      }

      const identity = { id: `authid_${++world.sequence}`, password };
      world.identities.set(email, identity);
      return { authIdentity: { id: identity.id, app_metadata: undefined } };
    },

    updateAuthIdentities: async (input: { id: string; app_metadata?: Record<string, unknown> }) => {
      if (world.throwOnLink) throw new Error("interrupted at link");
      const entry = [...world.identities.entries()].find(([, identity]) => identity.id === input.id);
      if (entry === undefined) throw new Error(`no such auth identity: ${input.id}`);
      const [, identity] = entry;
      identity.app_metadata = { ...identity.app_metadata, ...input.app_metadata };
      return { id: identity.id, app_metadata: identity.app_metadata };
    },
  };
}

function fakeUserService(world: FakeWorld) {
  return {
    listUsers: async (filter: { email?: string }) => {
      const user = filter.email === undefined ? undefined : world.users.get(filter.email);
      return user === undefined ? [] : [user];
    },

    createUsers: async (input: { email: string }) => {
      if (world.throwOnCreateUser) throw new Error("interrupted at create");
      if (world.users.has(input.email)) throw new Error("duplicate email");
      const user = { id: `user_${++world.sequence}` };
      world.users.set(input.email, user);
      return user;
    },
  };
}

interface CapturedLog {
  method: string;
  args: unknown[];
}

/** Every method a Medusa logger exposes, each recorded rather than only the one the script currently calls. */
function capturingLogger(): { logger: Record<string, (...args: unknown[]) => void>; calls: CapturedLog[] } {
  const calls: CapturedLog[] = [];
  const logger: Record<string, (...args: unknown[]) => void> = {};
  for (const method of ["info", "warn", "error", "debug", "log", "panic", "success"]) {
    logger[method] = (...args: unknown[]) => {
      calls.push({ method, args });
    };
  }
  return { logger, calls };
}

async function runSeedAdministratorScript(
  world: FakeWorld,
  environment: Record<string, string | undefined>,
): Promise<{ calls: CapturedLog[]; error: unknown }> {
  const { logger, calls } = capturingLogger();
  const restore = { ...process.env };

  for (const [name, value] of Object.entries(environment)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }

  const container = {
    resolve: (key: string) => {
      if (key === ContainerRegistrationKeys.LOGGER) return logger;
      if (key === Modules.AUTH) return fakeAuthService(world);
      if (key === Modules.USER) return fakeUserService(world);
      throw new Error(`fake container: unexpected resolve(${key})`);
    },
  } as unknown as MedusaContainer;

  let error: unknown;
  try {
    await (seedAdministrator as (args: ExecArgs) => Promise<void>)({ container, args: [] });
  } catch (caught) {
    error = caught;
  } finally {
    for (const name of Object.keys(process.env)) {
      if (!(name in restore)) delete process.env[name];
    }
    Object.assign(process.env, restore);
  }

  return { calls, error };
}

/** Every string the script produced on this run, logger calls and any thrown error alike, concatenated for one substring check. */
function observedText(result: { calls: CapturedLog[]; error: unknown }): string {
  const fromCalls = result.calls
    .map((call) => call.args.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg))).join(" "))
    .join("\n");
  const error = result.error;
  const fromError =
    error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : error === undefined ? "" : JSON.stringify(error);

  return `${fromCalls}\n${fromError}`;
}

/**
 * The property the checkbox names, driven through `seedAdministrator` --
 * the actual `medusa exec` entry point, not the pure core -- so that what is
 * asserted is what `npm run seed:administrator` really does: what its
 * container-resolved logger receives, and what a thrown error carries when a
 * run fails. Every scenario captures both, across every branch
 * `seedInitialAdministrator` has: the happy path, the no-op rerun, both
 * repair windows, a provider refusal, and a missing credential.
 *
 * **What this catches, and what it does not.** `CANARY_PASSWORD` is checked,
 * not eyeballed, and it catches a *literal* leak on every path exercised
 * here. It cannot catch a leak computed from the password rather than
 * containing it verbatim: measured by adding, in turn, `logger.debug`
 * of the password's length, of a six-character prefix, and of a SHA-256
 * hash of it, all 24 tests in this file -- these included -- stay green,
 * because none of those three strings is the canary itself. The
 * `describe("every statement in the script that could put text somewhere
 * observable is pinned"` suite below is what closes that gap: it does not
 * run the script and inspect what came out, it pins the exact source text of
 * every `logger.` call and thrown `Error` in `seed-administrator.ts`, so an
 * added call, or an edit to one of the existing three -- computing anything
 * at all -- fails that test regardless of what it computes.
 */
describe("what the seed-administrator script's logger and any thrown error receive", () => {
  it("created: logs the outcome and address, and the password appears nowhere observed", async () => {
    const result = await runSeedAdministratorScript(fakeWorld(), {
      MEDUSA_ADMIN_EMAIL: credentials.email,
      MEDUSA_ADMIN_PASSWORD: CANARY_PASSWORD,
    });

    expect(result.error).toBeUndefined();
    const text = observedText(result);
    expect(text).toContain("created");
    expect(text).toContain(credentials.email);
    expect(text).not.toContain(CANARY_PASSWORD);
  });

  it("already-present: the no-op rerun's own logger output never contains the password", async () => {
    const world = fakeWorld();
    const env = { MEDUSA_ADMIN_EMAIL: credentials.email, MEDUSA_ADMIN_PASSWORD: CANARY_PASSWORD };

    await runSeedAdministratorScript(world, env);
    const second = await runSeedAdministratorScript(world, env);

    expect(second.error).toBeUndefined();
    const text = observedText(second);
    expect(text).toContain("already-present");
    expect(text).not.toContain(CANARY_PASSWORD);
  });

  it("repaired: the run that fixes an interrupted link logs no password, and neither did the failure before it", async () => {
    const world = fakeWorld();
    const env = { MEDUSA_ADMIN_EMAIL: credentials.email, MEDUSA_ADMIN_PASSWORD: CANARY_PASSWORD };

    world.throwOnLink = true;
    const first = await runSeedAdministratorScript(world, env);
    expect(first.error).toBeInstanceOf(Error);
    expect(observedText(first)).not.toContain(CANARY_PASSWORD);

    world.throwOnLink = false;
    const second = await runSeedAdministratorScript(world, env);
    expect(second.error).toBeUndefined();
    const text = observedText(second);
    expect(text).toContain("repaired");
    expect(text).not.toContain(CANARY_PASSWORD);
  });

  it("a provider refusal surfaces its own message, and never the password", async () => {
    const world = fakeWorld();
    world.failRegisterWith = "the address is already registered";

    const result = await runSeedAdministratorScript(world, {
      MEDUSA_ADMIN_EMAIL: credentials.email,
      MEDUSA_ADMIN_PASSWORD: CANARY_PASSWORD,
    });

    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toContain("already registered");
    expect(observedText(result)).not.toContain(CANARY_PASSWORD);
  });

  it("interrupted before the user exists: nothing is logged, and the failure carries no password", async () => {
    const world = fakeWorld();
    world.throwOnCreateUser = true;

    const result = await runSeedAdministratorScript(world, {
      MEDUSA_ADMIN_EMAIL: credentials.email,
      MEDUSA_ADMIN_PASSWORD: CANARY_PASSWORD,
    });

    expect(result.error).toBeInstanceOf(Error);
    expect(result.calls).toHaveLength(0);
    expect(observedText(result)).not.toContain(CANARY_PASSWORD);
  });

  it("a missing credential's refusal names the variable, and the password never appears", async () => {
    const result = await runSeedAdministratorScript(fakeWorld(), {
      MEDUSA_ADMIN_EMAIL: credentials.email,
      MEDUSA_ADMIN_PASSWORD: undefined,
    });

    expect(result.error).toBeInstanceOf(ConfigError);
    const text = observedText(result);
    expect(text).toContain("MEDUSA_ADMIN_PASSWORD");
    expect(text).not.toContain(CANARY_PASSWORD);
  });
});

// ---------------------------------------------------------------------------
// The structural half of "nothing derived from the password is logged":
// a source-level pin, not a runtime observation. See the docblock above
// `describe("what the seed-administrator script's logger and any thrown
// error receive"` for exactly what a canary catches and what it cannot.
// ---------------------------------------------------------------------------

const SCRIPT_SOURCE = readFileSync(join(__dirname, "..", "src", "scripts", "seed-administrator.ts"), "utf8");

/**
 * Every statement in the script that could put text somewhere observable: a
 * call through the container-resolved logger, or a thrown `Error`. Matched
 * on source text, not driven at runtime -- a canary can only be compared
 * against what a statement actually produced, and a derived leak produces a
 * string the canary never equals. `[^\n]*` rather than a paren-balanced
 * match is enough because every statement this needs to find is one line in
 * this file today; a change that split one across lines would make this
 * pattern find zero or a truncated match, which the exact-array assertion
 * below reports as a failure, not a silent pass.
 */
const OBSERVABLE_STATEMENT = /\b(?:logger\.[A-Za-z_]+|throw new Error)\([^\n]*\);/g;

describe("every statement in the script that could put text somewhere observable is pinned", () => {
  it("is exactly these three today, and none of them mentions password", () => {
    const statements = SCRIPT_SOURCE.match(OBSERVABLE_STATEMENT) ?? [];

    // An allowlist, not a blacklist: any statement added to the script --
    // whatever it logs or throws, however it computes it -- changes this
    // array and fails the equality below, regardless of which of `logger`'s
    // methods it calls. A blacklist of known-bad forms (a length, a prefix,
    // a hash, ...) does not converge, because it can only enumerate the
    // forms someone thought to try; this does not enumerate forms at all.
    expect(statements).toEqual([
      "throw new Error(`Could not register the initial administrator: ${error}`);",
      'throw new Error("The auth provider registered no identity for the initial administrator");',
      "logger.info(describeAdministratorSeedOutcome(outcome, credentials.email));",
    ]);

    // Belt and braces on top of the exact-array pin above: even a change
    // that also updated this test's own expectation to match would still
    // have to write the word "password" somewhere a reviewer can grep for.
    for (const statement of statements) {
      expect(statement, statement).not.toMatch(/password/i);
    }
  });
});
