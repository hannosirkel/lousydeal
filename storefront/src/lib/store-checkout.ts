/**
 * The one figure the checkout page must show before payment: the cart's own
 * total, read from the Store API rather than recomputed here.
 *
 * "The final price is explicit before payment" (T10) is a disclosure
 * requirement, not a pricing one -- no row in this slice adds shipping or a
 * VAT breakdown, so the one total Medusa already returns on a cart is the
 * whole of what a buyer needs to see, with no decomposition to get right or
 * wrong.
 *
 * Reads `/store/carts/:id` directly rather than through `getCart` in
 * `./store-cart.js` (T9): that function's `StoreCartResponse` type does not
 * declare `total` (T9 never needed it), and `total` is nonetheless already on
 * the wire -- `node_modules/@medusajs/medusa/dist/api/store/carts/query-config.js`'s
 * `defaultStoreCartFields` includes `total` among the default fields, no
 * `fields` override required. Declaring a second, checkout-scoped view of the
 * same endpoint's response is this file's own narrow slice, matching how
 * `medusa-client.ts` and `store-cart.ts` already each declare their own
 * independent view of overlapping Medusa shapes rather than sharing one.
 */

import type { FetchJson } from "./medusa-client";

export interface CheckoutCart {
  readonly id: string;
  readonly currencyCode: string;
  /** The cart's total, exactly as the Store API returns it -- not converted, not recomputed. */
  readonly total: number;
}

interface StoreCartTotalResponse {
  readonly cart?: {
    readonly id?: unknown;
    readonly currency_code?: unknown;
    readonly total?: unknown;
  };
}

/** Reads the cart's own total. Refuses rather than guesses if the API answers with anything less than all three fields. */
export async function getCheckoutCart(fetchJson: FetchJson, cartId: string): Promise<CheckoutCart> {
  const { cart } = await fetchJson<StoreCartTotalResponse>(`/store/carts/${encodeURIComponent(cartId)}`);
  if (
    typeof cart?.id !== "string" ||
    cart.id.length === 0 ||
    typeof cart.currency_code !== "string" ||
    typeof cart.total !== "number"
  ) {
    throw new Error(`Medusa returned an incomplete cart for ${cartId}`);
  }
  return { id: cart.id, currencyCode: cart.currency_code, total: cart.total };
}
