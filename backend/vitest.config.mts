import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// The root vitest.config.ts lists "./backend/vitest.config.*" as a project
// glob; this file is the first thing that matches it, which is what makes
// `npm run test:unit` at the repository root run this suite. See the comment
// in the root config for why the glob is shaped that way.
//
// `exclude` is left unset on purpose: naming it at all discards Vitest's own
// default ignore list (node_modules, dist, ...), and this suite has nothing
// to exclude beyond that default.
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  test: {
    name: "backend",
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
