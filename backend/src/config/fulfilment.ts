/**
 * Registering the Printful fulfilment provider, in the shape `./notification.ts`,
 * `./payment.ts`, `./redis.ts` and `./deal.ts` all take.
 *
 * **The module is registered only when Printful is configured**, which is why
 * this returns `null` rather than always returning a module — the same reason
 * `notificationModule` does. LD-04's P3a gives the token to the test workloads
 * and to nothing else, because there is no live Printful store and §23 keeps
 * one out until the publication gate. A deployment with no token must boot, and
 * boot without an option to ship anything, which is the truthful state of a
 * shop that sells one digital thing.
 *
 * **The artwork base is configuration, not a constant.** It is pinned to a
 * commit, and which commit is a fact about a deployment rather than about this
 * file: `sync.ts` refuses a branch URL for the reason that matters here too —
 * artwork must not change under a product somebody has already ordered
 * against.
 */

import { PRINTFUL_FULFILMENT_IDENTIFIER } from "../modules/printful/fulfilment-provider";

/** The path Medusa resolves, against the directory the process was started in -- see `./deal.ts`. */
export const FULFILMENT_PROVIDER_PATH = "./src/modules/printful/fulfilment-provider";

export interface PrintfulFulfilmentConfig {
  readonly apiToken: string;
  readonly artworkBaseUrl: string;
}

export function fulfilmentModule(config: PrintfulFulfilmentConfig | null) {
  if (config === null) return null;

  return {
    resolve: "@medusajs/medusa/fulfillment",
    options: {
      providers: [
        {
          resolve: FULFILMENT_PROVIDER_PATH,
          id: PRINTFUL_FULFILMENT_IDENTIFIER,
          options: { ...config },
        },
      ],
    },
  } as const;
}
