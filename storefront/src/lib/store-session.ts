/**
 * What a request needs to talk to the store on a customer's behalf: the client
 * configuration, and the cookie that names their cart.
 *
 * **These lived in `src/app/page.tsx` and were read from there by four other
 * files.** Three routes and a Server Action imported `CART_ID_COOKIE` from the
 * home page's route module, and two routes each carried their own copy of
 * `requireStoreClientConfig`. A route module is a strange thing to depend on —
 * it exists to answer a URL, not to publish constants — and the copies had to
 * agree by hand.
 *
 * The cookie's attributes are here for the same reason. They are the
 * security-relevant half of this seam: `httpOnly` keeps the cart id out of
 * document.cookie, `secure` keeps it off plaintext, and `sameSite: "lax"`
 * keeps it off cross-site POSTs while still surviving a top-level navigation
 * back from Stripe. Written once, they cannot drift between the two routes
 * that set them.
 */

import { getRuntimeConfig } from "../config/runtime-config";
import type { StoreClientConfig } from "./medusa-client";

/** The cookie the cart is looked up by, on every route that touches one. */
export const CART_ID_COOKIE = "lousydeal_cart_id";

/** How that cookie is written. Never partially: this object or nothing. */
export const CART_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  secure: true,
} as const;

/**
 * The Medusa client configuration, or a refusal.
 *
 * Throwing rather than degrading is deliberate and predates this module: a
 * storefront that cannot reach its backend has nothing true to render, and a
 * page that renders an empty catalogue instead would tell a customer the shop
 * is empty when it is unreachable.
 */
export function requireStoreClientConfig(): StoreClientConfig {
  const { medusa } = getRuntimeConfig();
  if (medusa.backendUrl === null || medusa.publishableKey === null) {
    throw new Error("MEDUSA_BACKEND_URL and MEDUSA_PUBLISHABLE_API_KEY must both be set to reach the store");
  }
  return { backendUrl: medusa.backendUrl, publishableKey: medusa.publishableKey };
}
