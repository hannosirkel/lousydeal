/**
 * Registering the Lousy Deal module, in the same shape as `./payment.ts` and
 * `./redis.ts`: a function `medusa-config.ts` calls, so the wiring and the
 * reason for it live beside each other rather than in the config file.
 *
 * Unlike those two, this module is **local**, and the resolve string is a path
 * rather than a package name.
 */

import { DEAL_MODULE } from "../modules/deal";

/**
 * The path Medusa resolves. Not a package: `backend/src/modules/deal`.
 *
 * Resolved against the directory the process was started in.
 * `normalizeImportPathWithSource`
 * (`@medusajs/utils/dist/common/normalize-import-path-with-source.js:9-23`)
 * joins a `./src`-prefixed string straight onto `process.cwd()`, which is
 * `backend/` when the source tree runs under the CLI's `ts-node` and
 * `backend/.medusa/server` when the built artifact runs — each with
 * `src/modules/deal` beneath it, so one string serves both. The reference
 * project registers its one local module the same way
 * (`plepic/backend/medusa-config.ts:178`).
 */
export const DEAL_MODULE_PATH = "./src/modules/deal";

/**
 * **`key` is load-bearing, not decoration.**
 *
 * Without it, `defineConfig` derives the module's service name by `require`-ing
 * the module *at config-assembly time* and reading its joiner config
 * (`@medusajs/utils/dist/common/define-config.js:74-91`). That `require` is
 * Node's own, so it resolves a directory of `.ts` files only where something
 * has already registered `ts-node` — true under `medusa start` and `medusa
 * build`, false under Vitest, which transforms TypeScript itself but does not
 * teach `require` to. Importing `medusa-config.ts` in a test would therefore
 * fail on a path that is correct in production.
 *
 * `getKnownModuleName` (`define-config.js:88-91`) returns `key` when it is
 * present and skips the `require` entirely, which is the same escape hatch the
 * error message on the other branch points at. The name given here must equal
 * the one the module declares — `Module(DEAL_MODULE, …)` in
 * `../modules/deal` — and `tests/deal-module.test.ts` asserts exactly that,
 * because a drift between the two would register the module under a name
 * `container.resolve()` does not answer to.
 *
 * `defineConfig` deletes `key` after reading it (`define-config.js:76`), so the
 * assembled config carries `{ resolve }` alone.
 */
export function dealModule() {
  return { key: DEAL_MODULE, resolve: DEAL_MODULE_PATH };
}
