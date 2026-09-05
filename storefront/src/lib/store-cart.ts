/**
 * Cart creation and the one line-item mutation this row needs.
 *
 * Endpoints and response shapes are read from the installed package, not
 * assumed: `node_modules/@medusajs/medusa/dist/api/store/carts/route.js`
 * (`POST /store/carts`, returns `{ cart }`),
 * `.../carts/[id]/route.js` (`GET /store/carts/:id`, returns `{ cart }`), and
 * `.../carts/[id]/line-items/route.js` (`POST /store/carts/:id/line-items`,
 * body `{ variant_id, quantity }` per `.../carts/validators.js`'s
 * `StoreAddCartLineItem`, returns the whole cart, not the created line).
 * Default cart query fields
 * (`.../carts/query-config.js`'s `defaultStoreCartFields`) already include
 * `items.variant_id`, `items.quantity` and `items.unit_price`, so no
 * `fields` override is sent here.
 */

import type { FetchJson } from "./medusa-client";

export interface Cart {
  readonly id: string;
}

interface StoreCartLineItemResponse {
  readonly id: string;
  readonly variant_id: string;
  readonly quantity: number;
  readonly unit_price: number;
  readonly title?: string;
}

export interface StoreCartResponse {
  readonly id: string;
  readonly currency_code: string;
  readonly items?: readonly StoreCartLineItemResponse[];
  /**
   * The cart's own total. Optional for the same reason `StoreRegion.countries`
   * is (`medusa-client.ts`): `defaultStoreCartFields` includes `total`, so the
   * live endpoint answers with it, but `tests/store-cart.test.ts` builds
   * fixtures without it and those fixtures are faithful to what they stub.
   *
   * Read, never recomputed. Summing the lines would be a second computation of
   * a figure the API already answers with, and the two would differ the day
   * anything is discounted or taxed differently from what a caller assumes.
   */
  readonly total?: number;
}

/** The line this row's verification checks: the API's own line, carried through, not recomputed. */
export interface CartLine {
  readonly id: string;
  readonly cartId: string;
  readonly variantId: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly currencyCode: string;
}

export async function createCart(fetchJson: FetchJson, regionId: string): Promise<Cart> {
  const { cart } = await fetchJson<{ cart: StoreCartResponse }>("/store/carts", {
    method: "POST",
    body: JSON.stringify({ region_id: regionId }),
  });
  return { id: cart.id };
}

export async function getCart(fetchJson: FetchJson, cartId: string): Promise<StoreCartResponse> {
  const { cart } = await fetchJson<{ cart: StoreCartResponse }>(`/store/carts/${encodeURIComponent(cartId)}`);
  return cart;
}

/**
 * Adds one variant to an existing cart and returns the line the API created
 * for it. The endpoint's response is the whole cart, not the new line, so the
 * line is read back off `cart.items` by matching `variant_id` -- this only
 * works because a fresh cart carries at most one line per variant, which is
 * all this row ever creates.
 */
export async function addLineToCart(
  fetchJson: FetchJson,
  cartId: string,
  variantId: string,
  quantity: number,
): Promise<CartLine> {
  const { cart } = await fetchJson<{ cart: StoreCartResponse }>(`/store/carts/${encodeURIComponent(cartId)}/line-items`, {
    method: "POST",
    body: JSON.stringify({ variant_id: variantId, quantity }),
  });

  const line = cart.items?.find((item) => item.variant_id === variantId);
  if (line === undefined) {
    throw new Error(`cart ${cartId} has no line item for variant ${variantId} after adding it`);
  }

  return {
    id: line.id,
    cartId: cart.id,
    variantId: line.variant_id,
    quantity: line.quantity,
    unitPrice: line.unit_price,
    currencyCode: cart.currency_code,
  };
}
