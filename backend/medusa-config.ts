/**
 * The file Medusa's CLI loads directly. Both entry points search for the bare
 * name `medusa-config` in the directory the CLI was started in
 * (`node_modules/@medusajs/cli/dist/create-cli.js:55`, `path.resolve(".")`):
 * `medusa start` through
 * `node_modules/@medusajs/framework/dist/config/loader.js:27`
 * (`configFileName = "medusa-config"`) and `medusa build` through
 * `node_modules/@medusajs/framework/dist/build-tools/compiler.js:383`
 * (`getConfigFile(projectRoot, "medusa-config")`). That directory is
 * `backend/` when the source tree is what runs -- where this `.ts` is loadable
 * only because `node_modules/@medusajs/cli/cli.js:4` registers `ts-node` --
 * and `backend/.medusa/server`, the `outDir` in `backend/tsconfig.json`, when
 * `medusa start` runs a built artifact and picks up the compiled `.js` there.
 *
 * Assembly happens once, at import time: reading
 * `process.env` through {@link readBackendRuntimeConfig} either returns a
 * complete configuration or throws before `defineConfig` is ever called, so a
 * missing required value refuses the whole process rather than reaching
 * `defineConfig` as `undefined`.
 *
 * The three Redis modules are T5b's wirings, imported rather than restated --
 * see `src/config/redis.ts` for why each of the three needs its own shape.
 * The Stripe payment module is registered here directly.
 */
import { defineConfig } from "@medusajs/framework/utils";

import { redisEventBusModule, redisLockingModule, redisWorkflowEngineModule } from "./src/config/redis";
import { readBackendRuntimeConfig } from "./src/config/runtime";

const runtime = readBackendRuntimeConfig(process.env);

export default defineConfig({
  projectConfig: {
    databaseUrl: runtime.database.url,
    databaseDriverOptions: runtime.database.driverOptions,
    http: {
      jwtSecret: runtime.http.jwtSecret,
      cookieSecret: runtime.http.cookieSecret,
    },
  },
  modules: [
    redisEventBusModule(runtime.redis),
    redisWorkflowEngineModule(runtime.redis),
    redisLockingModule(runtime.redis),
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/payment-stripe",
            id: "stripe",
            options: {
              apiKey: runtime.stripe.apiKey,
              webhookSecret: runtime.stripe.webhookSecret,
            },
          },
        ],
      },
    },
  ],
});
