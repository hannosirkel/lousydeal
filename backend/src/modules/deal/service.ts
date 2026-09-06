/**
 * The module's service.
 *
 * `MedusaService` generates the data-management methods for every model handed
 * to it — `createLousyDeals`, `listLousyDeals`, `retrieveLousyDeal` and the
 * rest — so nothing here restates CRUD.
 *
 * **Issuance is the one method written by hand**, and its logic is in `./issue`
 * rather than in the body below. That file says why; the short version is that
 * all the interesting behaviour is what happens when the same order arrives
 * twice, and a free function over a two-method seam can be driven through that
 * race by a test with no database. What is left here is the binding — the
 * service *is* the store.
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
import { issueDeal, type DealIssuanceInput, type DealStore, type IssuedDeal } from "./issue";
import { LousyDeal } from "./models/lousy-deal";

export default class DealModuleService extends MedusaService({ LousyDeal }) {
  /**
   * Mints the order's certificate, or returns the one it already has.
   *
   * `this as unknown as DealStore`: the two methods `DealStore` names are
   * generated onto this class by `MedusaService`, so they exist at runtime,
   * but their generated signatures are the wide overloaded ones every model
   * gets (filters, config, context, arrays). The seam is the narrow shape
   * issuance actually uses, and the assertion is where the two meet — once,
   * here, rather than at every call site.
   */
  async issueDeal(input: DealIssuanceInput): Promise<IssuedDeal> {
    return issueDeal(this as unknown as DealStore, input);
  }
}
