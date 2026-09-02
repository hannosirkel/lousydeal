/**
 * The initial Medusa administrator the predeploy Job seeds.
 *
 * T14c wires `MEDUSA_ADMIN_EMAIL` and `MEDUSA_ADMIN_PASSWORD` into
 * `deploys/lousydeal/base/predeploy-job.yaml` from the environment's
 * `*-database-admin` Secret; T14d registers that Secret. Neither has landed
 * as this file is written -- `predeploy-job.yaml` on `main` today carries
 * neither variable, on purpose (see its own header comment), because this is
 * the row that first gives the Job something to do with them. Once both
 * land, the predeploy Job is that Secret's consumer for these two keys --
 * not its only consumer: the PostgreSQL StatefulSet reads a third key from
 * the same Secret, `POSTGRES_SUPERUSER_PASSWORD`, for its own bootstrap
 * (`deploys/lousydeal/base/postgresql.yaml:92-96`,
 * `deploys/lousydeal/README.md:329`).
 *
 * **Merge order is load-bearing in between.** The Job is an Argo CD `Sync`
 * hook at `sync-wave: "-10"`, so once this row lands in a promoted image but
 * before T14c and T14d do, `readAdministratorCredentials` throws a
 * `ConfigError` on the Job's still-missing environment, `seed:administrator`
 * exits non-zero, and the whole sync goes red -- `configure:commerce` and
 * `seed:product` never run either. Nothing in CI runs `predeploy`, so
 * nothing catches this before a real sync does.
 *
 * The logic lives here rather than in `src/scripts/`, behind a port, because
 * the interesting behaviour is not the Medusa API call. It is that the Job is
 * an Argo CD sync hook which runs again on every promoted digest and must
 * therefore be a no-op the second time, and that it must survive its own
 * partial failure -- none of which is observable from a script that can only
 * be tested by booting Medusa against a database.
 *
 * Medusa's own `medusa user` CLI command is not used, for both of those
 * reasons: it creates unconditionally, so a second run fails on the duplicate
 * email and the Argo CD sync fails with it, and it `process.exit(1)`s on a
 * registration error after having already created the user -- leaving
 * exactly the orphan state {@link seedInitialAdministrator} repairs.
 */

import { type Environment, ConfigError, requireEnv } from "../config/env";

export interface AdministratorCredentials {
  readonly email: string;
  readonly password: string;
}

/**
 * An `emailpass` identity as the seeding needs to see it.
 *
 * `app_metadata` is part of the port rather than an implementation detail
 * because it carries the *link*: an identity whose `app_metadata.user_id`
 * does not name the administrator cannot sign that administrator in, and an
 * identity fetched without it cannot be told apart from one that is properly
 * linked. Medusa types it as an open record, so the link is read through
 * {@link linkedUserId} rather than by assertion.
 */
export interface AdministratorAuthIdentity {
  readonly id: string;
  readonly app_metadata?: Record<string, unknown> | null;
}

export interface AdministratorSeedPort {
  /** The administrator user, if one already exists for this address. */
  findAdministrator(email: string): Promise<{ readonly id: string } | undefined>;
  /** The `emailpass` auth identity, if one already exists for this address. */
  findAuthIdentity(email: string): Promise<AdministratorAuthIdentity | undefined>;
  registerAuthIdentity(email: string, password: string): Promise<AdministratorAuthIdentity>;
  createAdministrator(email: string): Promise<{ readonly id: string }>;
  linkAuthIdentity(authIdentityId: string, userId: string): Promise<void>;
}

export type AdministratorSeedOutcome = "created" | "repaired" | "already-present";

/** The user this identity can sign in, if it can sign in anyone. */
function linkedUserId(identity: AdministratorAuthIdentity): string | undefined {
  const userId = identity.app_metadata?.user_id;
  return typeof userId === "string" && userId.length > 0 ? userId : undefined;
}

/**
 * Read the credentials, fail closed, and never echo the password.
 *
 * Trimming and the missing/empty/whitespace-only rule come from
 * {@link requireEnv} -- the one reader every other required value in this
 * backend goes through, `env.ts`'s own header. What this adds on top is
 * specific to this value: the address becomes the login identity and is
 * rendered into the one log line {@link describeAdministratorSeedOutcome}
 * produces, and a value carrying `\r\n` is not a single address -- accepting
 * it would let a Job log line be split across lines this file did not write.
 */
export function readAdministratorCredentials(environment: Environment): AdministratorCredentials {
  const email = requireEnv(environment, "MEDUSA_ADMIN_EMAIL");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || /[\r\n]/.test(email)) {
    throw new ConfigError("MEDUSA_ADMIN_EMAIL must be a single email address");
  }

  const password = requireEnv(environment, "MEDUSA_ADMIN_PASSWORD");

  return { email, password };
}

/**
 * The one line logged for a completed run.
 *
 * Takes the outcome and the address and no `password` parameter, so a future
 * edit cannot interpolate it by mistake without first adding one to the
 * signature. `email: string` is unbranded, so nothing stops a caller from
 * passing `credentials.password` in that slot on purpose -- this shape
 * resists an accidental leak; it does not forbid a deliberate one.
 */
export function describeAdministratorSeedOutcome(outcome: AdministratorSeedOutcome, email: string): string {
  return `initial administrator ${outcome}: ${email}`;
}

/**
 * Ensure there is an administrator for this address who can actually sign in.
 *
 * **The condition is the link, not the user.** An administrator is only
 * usable when three things hold together: the user exists, an `emailpass`
 * identity exists for the same address, and that identity's
 * `app_metadata.user_id` names that user. Seeding writes them in three
 * steps, so either gap between them can be a pod's last instant, and there
 * is no transaction spanning two Medusa modules that would make it
 * otherwise.
 *
 * Checking only the user would be a real defect, not a theoretical one. An
 * interruption between {@link AdministratorSeedPort.createAdministrator} and
 * {@link AdministratorSeedPort.linkAuthIdentity} leaves a user nothing points
 * at; a run that returned `already-present` on that user alone would exit
 * **0**, so Kubernetes would stop retrying, the Argo CD sync would go green,
 * and the environment would have an Admin nobody could sign in to. It would
 * never self-heal, because every later run would short-circuit on the same
 * wreckage. Under `backoffLimit` (2, in `predeploy-job.yaml`) the second
 * attempt is the *expected* path, which is precisely why it must not be the
 * one that hides the damage.
 *
 * So a run that finds an existing administrator verifies the link and
 * repairs it -- adopting an identity that is already there, registering one
 * only when there is none at all. What it never does is re-register over an
 * identity that works: the Job holds the Secret on every sync, and
 * re-registering would undo a password rotated through Medusa at the next
 * promoted digest. Registration happens only where no identity exists, where
 * there is no password to keep.
 *
 * Reversing the write order to user-then-identity would still pass every
 * test here: both lookups run fresh at the top of every call, and the branch
 * above already repairs a user with no linked identity, whichever of the two
 * writes an earlier, interrupted run reached. What actually makes a failure
 * before the user exists self-healing is that the next run adopts the
 * orphaned identity it finds rather than registering a second one -- not
 * because `register` would refuse the duplicate. It would not:
 * `@medusajs/auth-emailpass` treats an identity with no `app_metadata` as
 * claimable and silently succeeds, re-hashing and overwriting its password
 * (`node_modules/@medusajs/auth-emailpass/dist/services/emailpass.js:112-131`,
 * `upsertAuthIdentity("update", …)` at `:148-153`). Adoption is required for
 * the reason the paragraph above already gives: registration happens only
 * where no identity exists, because that is the one condition under which
 * there is no password on it yet to overwrite.
 */
export async function seedInitialAdministrator(
  port: AdministratorSeedPort,
  credentials: AdministratorCredentials,
): Promise<AdministratorSeedOutcome> {
  const existing = await port.findAdministrator(credentials.email);
  const identity = await port.findAuthIdentity(credentials.email);

  if (existing !== undefined) {
    if (identity !== undefined && linkedUserId(identity) === existing.id) {
      return "already-present";
    }

    const usable = identity ?? (await port.registerAuthIdentity(credentials.email, credentials.password));

    await port.linkAuthIdentity(usable.id, existing.id);

    return "repaired";
  }

  const registered = identity ?? (await port.registerAuthIdentity(credentials.email, credentials.password));

  const user = await port.createAdministrator(credentials.email);
  await port.linkAuthIdentity(registered.id, user.id);

  return "created";
}
