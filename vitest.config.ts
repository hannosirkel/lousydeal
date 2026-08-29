import { defineConfig } from "vitest/config";

// This projects list is the single fact about what the repository tests. A
// suite outside it runs in no gate at all, silently, which is how the
// reference implementation once left its entire storefront suite unrun.
//
// The two workspaces are listed differently on purpose, because the plan gives
// them different shapes. T3 ships backend/vitest.config.mts, so the backend is
// referenced by a config glob. T8 ships storefront/tests but no storefront
// config at all, so a config reference there would match nothing, ever, and
// the storefront suite would run in no gate — including the guard that
// decision 002 rests on. The storefront is therefore an inline project rooted
// at the directory, which needs no file from T8 to work.
//
// The backend glob matches a config file rather than a directory, and that is
// load-bearing. An explicit path ("./backend/vitest.config.mts") is a startup
// error until T3 creates it, and so is a bare directory ("./backend"). A
// directory glob ("./backend/*") survives the absence but breaks as soon as
// backend/package.json exists, because Vitest rejects a matched file that is
// not a config — it would fail on the first file T3 writes. "vitest.config.*"
// tolerates the absence today, picks up T3's config when it lands, and leaves
// T17's vitest.smoke.config.mts alone, which is right: the smoke suite has its
// own runner and its own gate.
export default defineConfig({
  test: {
    projects: [
      { test: { name: "repo", include: ["scripts/**/*.test.ts"], environment: "node" } },
      "./backend/vitest.config.*",
      { test: { name: "storefront", root: "./storefront", include: ["tests/**/*.test.ts"], environment: "node" } },
    ],
    // Nothing above matches until the first suite exists, and an empty run is
    // a failure without this. No row of the plan removes it — this file is in
    // T1's file list and no other — so it stays on, and a project whose
    // include silently resolves to zero files will not announce itself.
    passWithNoTests: true,
  },
});
