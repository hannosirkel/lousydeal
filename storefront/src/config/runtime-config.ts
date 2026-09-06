/**
 * The one per-environment configuration object.
 *
 * `getRuntimeConfig` reads `process.env` (through `env.ts`'s `readEnv`) only
 * when called with no argument, and that call must happen from inside a
 * dynamically rendered request — see `src/app/layout.tsx`, which awaits
 * `connection()` so the tree renders per request instead of once at build
 * time. A value read at build time would be baked into the image, which is
 * exactly what decision 002 forbids for an environment-specific value
 * (`docs/decisions/002-rebuild-live-from-merged-main.md:33-34`; also Global
 * Constraint 2): no environment-specific value is ever baked into an image,
 * so this must be read fresh from the process environment at container
 * start, not once at build time.
 *
 * The default parameter is also what makes this testable: a test passes a
 * synthetic record and nothing here ever touches the test runner's own
 * `process.env`.
 *
 * Only what LD-01 actually consumes is here: the Medusa backend URL and
 * publishable key (Task 9/10), and the Stripe **publishable** key (C6, a
 * paid Stripe test-mode order reached through the storefront).
 *
 * The six `MERCHANT_*` fields are read here rather than written into content
 * because decision `004` rules that a disclosure must be changeable by
 * configuration, not by a code change — see `src/content/merchant.ts` for the
 * substitution and `src/content/chrome.ts` for the templates that use it.
 */

import { readEnv, type EnvRecord } from "./env";

export interface RuntimeConfig {
  readonly medusa: {
    /**
     * Server-side only. T9 answered the question this comment used to pose:
     * nothing in the browser reads the backend origin, and T10's row promises
     * it never will (`docs/working/ld-01-foundation.md`, T10) — so this field
     * is not in `ClientRuntimeConfig` and never reaches the browser.
     */
    readonly backendUrl: string | null;
    /**
     * Public credential, safe to hand to the browser -- but not published
     * either, because nothing in the browser reads it yet. A row that adds a
     * browser-side Medusa call names it in `ClientRuntimeConfig` on purpose.
     */
    readonly publishableKey: string | null;
  };
  readonly stripe: {
    /** Stripe's publishable key is public by design; no secret key lives here. */
    readonly publishableKey: string | null;
  };
  /**
   * Trader identity, server-side only. Every field is public information and
   * none of it is in `ClientRuntimeConfig`: what the browser is handed is a
   * decision each field earns, and no page needs these in the browser.
   *
   * `registryCode` and `vatNumber` are the two the operator has not supplied.
   * They stay `null` until a deployment sets them, and a `null` renders as a
   * named visible gap rather than a blank — `src/content/merchant.ts`.
   */
  readonly merchant: {
    readonly legalName: string | null;
    readonly address: string | null;
    readonly email: string | null;
    readonly registryCode: string | null;
    readonly vatNumber: string | null;
    readonly phoneNumber: string | null;
  };
}

export function getRuntimeConfig(env: EnvRecord = process.env): RuntimeConfig {
  return {
    medusa: {
      backendUrl: readEnv("MEDUSA_BACKEND_URL", env) ?? null,
      publishableKey: readEnv("MEDUSA_PUBLISHABLE_API_KEY", env) ?? null,
    },
    stripe: {
      publishableKey: readEnv("STRIPE_PUBLISHABLE_KEY", env) ?? null,
    },
    merchant: {
      legalName: readEnv("MERCHANT_LEGAL_NAME", env) ?? null,
      address: readEnv("MERCHANT_ADDRESS", env) ?? null,
      email: readEnv("MERCHANT_EMAIL", env) ?? null,
      registryCode: readEnv("MERCHANT_REGISTRY_CODE", env) ?? null,
      vatNumber: readEnv("MERCHANT_VAT_NUMBER", env) ?? null,
      phoneNumber: readEnv("MERCHANT_PHONE_NUMBER", env) ?? null,
    },
  };
}

/**
 * The client-side half of the one serialized runtime-config object.
 *
 * `src/app/layout.tsx` serializes this projection — never `RuntimeConfig`
 * itself — into the HTML of every route. An earlier build of this seam
 * (`plepic/storefront/src/lib/client-runtime-config.ts`) constructed that
 * blob by spreading the server config wholesale (`{ ...runtimeConfig,
 * isTestHost }`), so every field the configuration object had, and every
 * field it would ever gain, was published to the browser on every page by
 * default — which is how an unrelated merchant contact address ended up
 * readable, unquoted, from `/checkout`. Naming each field here, rather than
 * spreading or `Omit`-ting, makes publishing a new one a decision someone
 * makes on purpose instead of a side effect of adding it to `RuntimeConfig`.
 */
export interface ClientRuntimeConfig {
  readonly stripe: RuntimeConfig["stripe"];
}

/**
 * Every key the browser is given. `tests/runtime-config.test.ts` fails if
 * `toClientRuntimeConfig` returns a key not listed here; the reverse — a key
 * listed here that is not a key of `ClientRuntimeConfig` — fails at `tsc`,
 * not in this suite.
 */
export const CLIENT_RUNTIME_CONFIG_KEYS: readonly (keyof ClientRuntimeConfig)[] = ["stripe"];

/** The id `layout.tsx` gives the inert JSON script element carrying the projection below. */
export const RUNTIME_CONFIG_ELEMENT_ID = "lousydeal-runtime-config";

/** Projects `RuntimeConfig` onto the subset the browser is given. Not a spread — see the module comment above. */
export function toClientRuntimeConfig(config: RuntimeConfig): ClientRuntimeConfig {
  return {
    stripe: config.stripe,
  };
}

/**
 * Serializes the projected config for `dangerouslySetInnerHTML`, escaping `<`
 * so a `</script>`-shaped substring in any configured value cannot close the
 * enclosing `<script>` element early — an HTML parser scans script content
 * for `</script`, it does not tokenise it as JSON. Asserted directly in
 * `tests/runtime-config.test.ts`.
 */
export function serializeRuntimeConfig(config: ClientRuntimeConfig): string {
  return JSON.stringify(config).replace(/</g, "\\u003c");
}
