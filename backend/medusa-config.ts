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
      // **Required by `defineConfig`'s type, and defaulted by Medusa itself.**
      // `src/config/runtime.ts` records why the compiler only started saying so
      // at 2.20.1 -- the requirement is older than that, and the old lockfile
      // hid it. Medusa still applies the same defaults it always did
      // (`define-config.js:433-435`, `process.env.STORE_CORS ||
      // DEFAULT_STORE_CORS` and friends), so these three reproduce exactly what
      // it would have done: same variables, same fallbacks, no behaviour
      // change. What they change is that the values are visible in this file
      // rather than inside a dependency.
      //
      // **CORS is not load-bearing for this deployment**, which is why nothing
      // ever set it. A browser never calls the Store API directly: the
      // storefront's own server does, same-origin from its pod, and a visitor's
      // browser reaches it only through `/api/store/*` on the storefront's own
      // origin (`src/app/api/store/[...path]/route.ts`). `deploys` declares
      // none of the three for that reason, and this does not ask it to start.
      authCors: runtime.http.authCors,
      storeCors: runtime.http.storeCors,
      adminCors: runtime.http.adminCors,
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
