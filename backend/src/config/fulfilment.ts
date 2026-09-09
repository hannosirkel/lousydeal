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

/**
 * Printful's configuration, or `null` where this deployment has none.
 *
 * **One predicate, because two of them drifted and broke every predeploy.**
 * `medusa-config.ts` registers the provider only when both values are present;
 * `configure-commerce.ts` created a shipping option owned by that provider
 * unconditionally. So a deployment without Printful — which §23 says the live
 * one is, and which the module comment above says must boot — died in its
 * predeploy chain with "Unable to retrieve the fulfillment provider with id:
 * printful_printful". Gate E hit it on 2026-09-09 with a token and no artwork
 * base; the live workloads have neither, and were in the same state.
 *
 * Both callers ask this now, so the question is answered in one place and the
 * answer cannot disagree with itself.
 */
export function printfulFulfilmentConfig(runtime: {
  readonly printfulApiToken: string | null;
  readonly printfulArtworkBaseUrl: string | null;
}): PrintfulFulfilmentConfig | null {
  if (runtime.printfulApiToken === null || runtime.printfulArtworkBaseUrl === null) return null;
  return { apiToken: runtime.printfulApiToken, artworkBaseUrl: runtime.printfulArtworkBaseUrl };
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
