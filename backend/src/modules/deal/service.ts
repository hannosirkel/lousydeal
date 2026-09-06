/**
 * The module's service.
 *
 * `MedusaService` generates the data-management methods for every model handed
 * to it — `createLousyDeals`, `listLousyDeals`, `retrieveLousyDeal` and the
 * rest — so nothing here restates CRUD.
 *
 * **Issuance is deliberately not here yet.** It is C2's row, and it is not a
 * `create` call: it has to survive a replayed `order.placed`, which means
 * inserting against the unique `order_id` index and reading back what is
 * already there when the insert refuses. Writing half of that now would leave
 * a `create` path that looks usable and is not idempotent.
 */

import { MedusaService } from "@medusajs/framework/utils";

// Extensionless, like every relative import inside this module and unlike the
// convention elsewhere in this backend. `medusa build` loads a local
// TypeScript module twice, and the second loader is MikroORM's
// `ConfigurationLoader.registerTsNode`, monkey-patched in
// `@medusajs/framework/dist/mikro-orm-cli/bin.js` to introspect every declared
// module for type generation. That loader's `require()` does not map a
// `./models/lousy-deal.js` specifier onto the sibling `.ts` file; the
// reference project hit exactly this and recorded it in
// `plepic/backend/src/modules/omniva/index.ts`. Node's own extensionless
// resolution does try `.ts` once `ts-node` is registered, and the compiled
// `.medusa/server` output resolves the same specifier against a real `.js`
// either way.
import { LousyDeal } from "./models/lousy-deal";

export default class DealModuleService extends MedusaService({ LousyDeal }) {}
