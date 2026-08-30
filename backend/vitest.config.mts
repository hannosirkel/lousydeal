import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

// The root vitest.config.ts lists "./backend/vitest.config.*" as a project
// glob; this file is the first thing that matches it, which is what makes
// `npm run test:unit` at the repository root run this suite. See the comment
// in the root config for why the glob is shaped that way.
//
// `tests/smoke/**` is excluded because that suite needs a running Medusa, a
// migrated PostgreSQL and a Redis, and refuses rather than skipping when they
// are absent -- collecting it here would fail this suite, and therefore
// `bash scripts/validate` and CI, on every checkout with nothing running.
// `backend/vitest.smoke.config.mts` runs it under its own gate instead. This
// file is frozen after T3, so no later row can narrow `include` or add an
// `exclude` here instead.
//
// The default exclusions are kept rather than replaced: naming `exclude` at
// all drops Vitest's own list, and a `node_modules` full of `*.test.ts` would
// then be collected.
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  test: {
    name: "backend",
    include: ["tests/**/*.test.ts"],
    exclude: [...configDefaults.exclude, "tests/smoke/**"],
    environment: "node",
  },
});
