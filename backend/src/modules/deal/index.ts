/**
 * The Lousy Deal module.
 *
 * Contract §16: Medusa stays the source of truth for product, cart, order and
 * payment, and a small custom module carries only the Lousy-Deal-specific
 * concepts. This is that module, and its whole surface is one model.
 *
 * It is registered by local path in `medusa-config.ts`, through
 * `src/config/deal.ts`, which is where the resolve string is justified.
 */

import { Module } from "@medusajs/framework/utils";

// Extensionless — see the note in `./service`.
import DealModuleService from "./service";

/**
 * The name the module registers under, and therefore the key
 * `container.resolve()` takes. Exported so no caller writes the string
 * a second time.
 */
export const DEAL_MODULE = "deal";

export default Module(DEAL_MODULE, { service: DealModuleService });
