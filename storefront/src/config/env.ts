/**
 * The one place `process.env` is read directly.
 *
 * `runtime-config.ts` goes through {@link readEnv} rather than touching
 * `process.env` itself, so a value's origin is traceable to here, and so a
 * test can stub a plain record instead of the real process environment.
 */

/**
 * A structural view of `process.env` — every value optional, exactly as
 * `NodeJS.ProcessEnv` actually behaves at runtime (an unset variable reads as
 * `undefined`). Used instead of `NodeJS.ProcessEnv` itself so a test can pass
 * a plain `{}` or a partial object without also supplying every ambient
 * variable the installed `@types/node` happens to declare as present.
 */
export type EnvRecord = Record<string, string | undefined>;

/** Reads `name` from `env`, trimmed, or `undefined` if unset or blank. */
export function readEnv(name: string, env: EnvRecord = process.env): string | undefined {
  const value = env[name];
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
