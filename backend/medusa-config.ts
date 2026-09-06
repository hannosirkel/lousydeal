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
 * The Stripe payment module is T6b's wiring, imported the same way -- see
 * `src/config/payment.ts` for why its provider id is derived rather than
 * written down here.
 *
 * The Lousy Deal module is C1's wiring, and one of the two resolved by a local
 * path -- see `src/config/deal.ts`.
 *
 * The notification module is C8's, and it is the only one that may be absent:
 * `notificationModule` answers `null` where a deployment has no mail
 * configured, and `modules` is filtered rather than carrying a hole. See
 * `src/config/notification.ts` and `readSmtpRuntimeConfig` for why mail is the
 * one optional thing here.
 */
import { defineConfig } from "@medusajs/framework/utils";

import { dealModule } from "./src/config/deal";
import { notificationModule } from "./src/config/notification";
import { stripePaymentModule } from "./src/config/payment";
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
    stripePaymentModule(runtime.stripe),
    dealModule(),
    notificationModule(runtime.smtp),
    // `notificationModule` is the one entry that can be `null`, and dropping it
    // here rather than inside `defineConfig` keeps the absence visible in this
    // list instead of hidden behind a call that sometimes does nothing.
  ].filter((module) => module !== null),
});
