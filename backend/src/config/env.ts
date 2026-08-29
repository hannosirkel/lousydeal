/**
 * The only place in this backend that decides how an environment value is
 * read -- trimming, absence, and refusal all live here. Every other module
 * receives configuration as plain values rather than reading an environment
 * itself, which is what keeps the rest of the backend testable without
 * mutating global state: these readers accept any object shaped like an
 * environment, so a test passes a plain object and production passes
 * `process.env`.
 */

/** Whatever supplies environment values: `process.env`, or a plain object in a test. */
export type Environment = Record<string, string | undefined>;

/** Raised by a reader in this module. Distinguishable from any other thrown error. */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

/**
 * Read `name` from `environment`, trimmed.
 *
 * Absent, empty, or whitespace-only all fail: a value delivered through a
 * Kubernetes Secret or a `.env` file routinely carries a trailing newline,
 * and an untrimmed value breaks equality checks far from here (`"abc\n" !==
 * "abc"`). Whitespace-only is refused rather than accepted as a value,
 * because nobody sets a required variable to whitespace on purpose.
 */
export function requireEnv(environment: Environment, name: string): string {
  const value = environment[name]?.trim();

  if (value === undefined || value.length === 0) {
    throw new ConfigError(`Missing required environment variable: ${name}`);
  }

  return value;
}

/**
 * Read `name` from `environment`, trimmed, returning `undefined` if it is
 * absent, empty, or whitespace-only.
 *
 * An empty or whitespace-only value is treated the same as an absent one,
 * because a Kubernetes Secret or a `.env` line routinely projects `""` for a
 * variable nobody set, and `""` must not reach a caller as configuration.
 */
export function optionalEnv(environment: Environment, name: string): string | undefined {
  const value = environment[name]?.trim();
  return value === undefined || value.length === 0 ? undefined : value;
}
