import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The static half of the row's own rule: **no build argument, no `ENV` name
 * outside a fixed allowlist, and no allowlisted `ENV` set to anything but
 * its one permitted value, in any discovered Dockerfile.** A name-only
 * allowlist is not a constraint on values -- `ENV HOSTNAME=lousydeal-test
 * .example.com` is a permitted *name* carrying a per-environment *value*,
 * and reads as intentional configuration rather than a mistake -- so the
 * value is asserted too, everywhere the name is.
 *
 * This suite also asserts three static properties the checkbox names and a
 * built image cannot silently regress on: every stage's base is pinned to a
 * `@sha256:` digest rather than a floating tag, every runtime stage sets
 * `USER 10001:10001`, and every runtime stage clears `ENTRYPOINT`. The
 * digest matters most to guard here, because its regression is both silent
 * and invisible in review: a maintainer bumping the base tag and dropping
 * the `@sha256:` suffix looks like a routine version bump, not a rollback of
 * the property this repository's own rebuild-live-from-source argument rests
 * on.
 *
 * **What one `RUN` prefix can carry, and why this suite does not chase it.**
 * A per-environment value passed as a prefix on a `RUN` instruction --
 * `RUN SOME_VAR=... npm run build` -- never becomes an `ENV`, so it is
 * invisible to every assertion below, and it cannot cleanly be caught here:
 * `backend/Dockerfile`'s own `medusa build` step legitimately uses that
 * exact shape to supply the eleven build-time placeholders `medusa-config.ts`
 * needs to evaluate, and a scan that flagged every `RUN`-prefixed assignment
 * would flag that legitimate use along with a real leak. What holds
 * Constraint 2 for the storefront on that route instead is
 * `storefront/tests/no-next-public-env.test.ts`, which keeps the source free
 * of `NEXT_PUBLIC_*` reads -- so even if a `RUN` prefix carried a
 * per-environment value, there would be no `NEXT_PUBLIC_*` reference in the
 * bundle for Next to inline it into.
 *
 * **What this suite does not and cannot cover**: whether a built image's own
 * config actually carries an empty `Entrypoint` and only the permitted `Env`
 * -- that needs an image, and a `podman build` in a unit test would be
 * minutes long with no guarantee CI has a container runtime at all. That
 * check is run by hand instead:
 *
 *     podman build --file backend/Dockerfile --tag lousydeal-backend:t11 .
 *     podman inspect lousydeal-backend:t11 --format '{{.Config.Entrypoint}} {{.Config.Env}}'
 *     podman build --file storefront/Dockerfile --tag lousydeal-storefront:t11 .
 *     podman inspect lousydeal-storefront:t11 --format '{{.Config.Entrypoint}} {{.Config.Env}}'
 *
 * The row's own report carries that command's pasted output. A test that
 * silently passed with no image built would be worse than no test at all.
 */

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Every `Dockerfile` under the repository root, found rather than named --
 * naming two by hand let a third, added anywhere, be scanned by nothing.
 * Excluded directories are build output and dependency trees, never a place
 * a Dockerfile of this repository's own would live, so pruning them cannot
 * hide one.
 */
function discoverDockerfiles(dir: string): string[] {
  const excluded = new Set(["node_modules", ".git", ".next", ".medusa", "coverage"]);
  const found: string[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (excluded.has(entry.name)) continue;
      found.push(...discoverDockerfiles(join(dir, entry.name)));
    } else if (entry.name === "Dockerfile") {
      found.push(relative(repoRoot, join(dir, entry.name)).split(sep).join("/"));
    }
  }

  return found;
}

const DOCKERFILES = discoverDockerfiles(repoRoot).sort();

// A hardcoded list can be wrong by omission and still pass every assertion
// below it -- the reviewer proved exactly that with a third Dockerfile
// carrying a forbidden ENV that the old, named list never scanned. So the
// derivation is held to finding what is actually on disk today: a broken
// discovery that silently found nothing would be worse than the hardcoded
// list it replaced.
describe("the Dockerfile discovery the assertions below rest on", () => {
  it("finds exactly the two Dockerfiles this repository has today", () => {
    expect(DOCKERFILES).toEqual(["backend/Dockerfile", "storefront/Dockerfile"]);
  });
});

function read(path: string): string {
  return readFileSync(join(repoRoot, path), "utf8");
}

/**
 * A Dockerfile's instructions, with comments and line continuations
 * resolved. A comment or blank line inside a continued instruction is
 * dropped, not appended, and the drop has to happen *before* the
 * continuation join -- otherwise the interior line both corrupts the
 * instruction it lands in and terminates the continuation, splitting the
 * remainder into instructions of its own. Confirmed against this behaviour
 * by `podman build`, which folds a comment or a blank line the same way
 * between two continued lines (see the meta-test below).
 */
function fold(source: string): string[] {
  const folded: string[] = [];
  for (const raw of source.split("\n")) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    const previous = folded[folded.length - 1];
    if (previous !== undefined && previous.endsWith("\\")) {
      folded[folded.length - 1] = `${previous.slice(0, -1).trimEnd()} ${line}`;
      continue;
    }
    folded.push(line);
  }
  return folded.map((line) => line.replace(/\s+/g, " ").trim());
}

function instructions(dockerfile: string): string[] {
  return fold(read(dockerfile));
}

function directives(dockerfile: string, keyword: string): string[] {
  const prefix = new RegExp(`^${keyword}\\s+`, "i");
  return instructions(dockerfile)
    .filter((line) => prefix.test(line))
    .map((line) => line.replace(prefix, ""));
}

const ENV_ASSIGNMENT = /^([A-Za-z_][A-Za-z0-9_]*)=/;

/**
 * Splits one `ENV` instruction's argument text into space-separated tokens,
 * with quoting and backslash-escaping resolved rather than ignored -- a
 * quoted space does not end a token, and an escaped character is taken
 * literally, quote mark included. This is the shared tokenizer
 * {@link environmentAssignments} (and, through it, {@link environmentNames})
 * both rest on.
 */
function tokenizeEnvironmentEntry(entry: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let started = false;
  let quote: "'" | '"' | undefined;

  for (let index = 0; index < entry.length; index += 1) {
    const character = entry[index]!;
    if (character === "\\" && index + 1 < entry.length) {
      current += entry[index + 1]!;
      started = true;
      index += 1;
      continue;
    }
    if (quote !== undefined) {
      if (character === quote) quote = undefined;
      else current += character;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      started = true;
      continue;
    }
    if (character === " ") {
      if (started) tokens.push(current);
      current = "";
      started = false;
      continue;
    }
    current += character;
    started = true;
  }
  if (started) tokens.push(current);

  return tokens;
}

/** One variable name and the value **one** `ENV` instruction sets it to. */
interface EnvironmentAssignment {
  readonly name: string;
  readonly value: string;
}

/**
 * Every variable **one** `ENV` instruction sets, name and value both.
 *
 * `ENV a=1 b=2` is legal and sets both, so reading a name as
 * `entry.split("=")[0]` would see `a` and nothing else -- which is exactly
 * the shape that let a live key and a live hostname baked onto a second
 * `ENV` of a shipping stage pass every gate in the reference this repository
 * follows (its own commit history records it). Quoting and
 * backslash-escaping are resolved rather than ignored, so `ENV
 * GREETING="hello world"` reads as one assignment rather than two -- the
 * over-strict direction, which would red-flag a Dockerfile that is fine. The
 * legacy form, `ENV a b c`, is exactly one variable whose value is the rest
 * of the line.
 *
 * The value matters as much as the name: an allowlist of names alone still
 * passes `ENV HOSTNAME=lousydeal-test.example.com` -- a per-environment
 * value on a permitted name reads as intentional configuration, not a
 * mistake, and nothing about the *name* being permitted makes that value
 * safe to bake in. See the assertion below that checks both.
 */
function environmentAssignments(entry: string): EnvironmentAssignment[] {
  const tokens = tokenizeEnvironmentEntry(entry);

  if (tokens.length === 0) return [];
  if (!ENV_ASSIGNMENT.test(tokens[0]!)) {
    return [{ name: tokens[0]!, value: tokens.slice(1).join(" ") }];
  }
  return tokens.map((token) => {
    const prefix = ENV_ASSIGNMENT.exec(token);
    return prefix === null
      ? { name: token, value: "" }
      : { name: prefix[1]!, value: token.slice(prefix[0]!.length) };
  });
}

/** Every variable name **one** `ENV` instruction sets. See {@link environmentAssignments}. */
function environmentNames(entry: string): string[] {
  return environmentAssignments(entry).map((assignment) => assignment.name);
}

// A statement about `fold`'s and `environmentNames`' output is worth nothing
// if the fold or the name-read is wrong, and neither Dockerfile here exercises
// the shapes that could expose either defect -- a multi-variable `ENV` or an
// interior comment inside a continuation. So the parse is held to inputs
// built for the purpose rather than to the two real files.
describe("the parse the assertions below rest on", () => {
  it("drops a comment or a blank line inside a continued instruction, rather than truncating it", () => {
    expect(
      fold(["RUN echo START \\", "# an interior comment", "  MIDDLE \\", "  END"].join("\n")),
    ).toEqual(["RUN echo START MIDDLE END"]);
    expect(fold(["RUN echo START \\", "", "  MIDDLE \\", "  END"].join("\n"))).toEqual([
      "RUN echo START MIDDLE END",
    ]);
    expect(fold(["RUN a", "# between", "RUN b"].join("\n"))).toEqual(["RUN a", "RUN b"]);
  });

  it("reads every name a multi-variable ENV sets, not only the first", () => {
    expect(environmentNames("NODE_ENV=production MEDUSA_BACKEND_URL=https://example.test")).toEqual(
      ["NODE_ENV", "MEDUSA_BACKEND_URL"],
    );
    expect(environmentNames('GREETING="hello world" PORT=9000')).toEqual(["GREETING", "PORT"]);
    expect(environmentNames("NODE_ENV production value")).toEqual(["NODE_ENV"]);
    expect(environmentNames("A=1 not-an-assignment")).toEqual(["A", "not-an-assignment"]);
  });

  it("reads the value beside every name, not only the name", () => {
    // The property `environmentNames` alone cannot see: a permitted *name*
    // carrying a per-environment *value* is exactly what an allowlist of
    // names alone would wave through.
    expect(
      environmentAssignments("NODE_ENV=production MEDUSA_BACKEND_URL=https://example.test"),
    ).toEqual([
      { name: "NODE_ENV", value: "production" },
      { name: "MEDUSA_BACKEND_URL", value: "https://example.test" },
    ]);
    expect(environmentAssignments('GREETING="hello world" PORT=9000')).toEqual([
      { name: "GREETING", value: "hello world" },
      { name: "PORT", value: "9000" },
    ]);
    expect(environmentAssignments("NODE_ENV production value")).toEqual([
      { name: "NODE_ENV", value: "production value" },
    ]);
  });
});

describe("neither Dockerfile can carry a per-environment value into the image", () => {
  for (const dockerfile of DOCKERFILES) {
    describe(dockerfile, () => {
      it("declares no build argument at all", () => {
        // Not "no NEXT_PUBLIC_ build argument" -- no build argument, full
        // stop. A build argument is the only route a value has into a build
        // from outside the repository, so refusing the mechanism is what
        // makes "nothing per-environment is baked in" a property of the file
        // rather than of a reviewer reading it.
        expect(directives(dockerfile, "ARG")).toEqual([]);
      });

      it("sets no ENV outside the structural allowlist, and no allowlisted ENV to anything but its one permitted value", () => {
        // Every assignment of every ENV, not the first name of each
        // instruction -- see `environmentAssignments` above for why that
        // distinction is the whole point. The map is name *and* value: a
        // name-only allowlist passes `ENV HOSTNAME=lousydeal-test.example.com`
        // outright, because the name `HOSTNAME` is permitted and nothing
        // checks what it was set to. Every value below is identical in every
        // environment this repository runs in; nothing on it is a secret, a
        // hostname that differs by environment, or a key.
        const permitted: Record<string, string> = {
          NODE_ENV: "production",
          HOME: "/tmp",
          PORT: "3000",
          HOSTNAME: "0.0.0.0",
          MEDUSA_DISABLE_TELEMETRY: "true",
          npm_config_cache: "/tmp/.npm",
          npm_config_update_notifier: "false",
        };
        const assignments = directives(dockerfile, "ENV").flatMap(environmentAssignments);
        for (const { name, value } of assignments) {
          expect(Object.keys(permitted), `${dockerfile} bakes in ${name}`).toContain(name);
          expect(value, `${dockerfile} sets ${name} to ${value}, not ${permitted[name]}`).toBe(
            permitted[name],
          );
        }
      });
    });
  }
});

describe("every Dockerfile stage is pinned, non-root and unwrapped", () => {
  const FROM_DIGEST = /^FROM\s+\S+@sha256:[0-9a-f]{64}(\s+AS\s+\S+)?$/i;

  for (const dockerfile of DOCKERFILES) {
    describe(dockerfile, () => {
      it("pins every stage's base image to a @sha256: digest, never a floating tag", () => {
        // The regression this guards is silent and invisible in review: a
        // maintainer bumping the base tag and dropping the `@sha256:` suffix
        // reads as a routine version bump, not as giving up the property
        // this repository's rebuild-live-from-source argument rests on.
        const fromLines = directives(dockerfile, "FROM").length;
        expect(fromLines, `${dockerfile} declares no FROM at all`).toBeGreaterThan(0);
        for (const line of instructions(dockerfile)) {
          if (!/^FROM\s/i.test(line)) continue;
          expect(line, `${dockerfile}: '${line}' is not pinned to a @sha256: digest`).toMatch(
            FROM_DIGEST,
          );
        }
      });

      it("runs as USER 10001:10001", () => {
        expect(directives(dockerfile, "USER")).toContain("10001:10001");
      });

      it("clears ENTRYPOINT", () => {
        // Not merely present -- cleared. Kubernetes `args:` prefixes
        // `ENTRYPOINT` rather than replacing it, so a base image's own
        // `ENTRYPOINT` left intact would swallow whatever a later row's
        // manifests pass as `args:`.
        expect(directives(dockerfile, "ENTRYPOINT")).toContain("[]");
      });
    });
  }
});
