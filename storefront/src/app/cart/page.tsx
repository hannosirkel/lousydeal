/**
 * Renders the cart the home page's "add to cart" action created, looked up
 * by the id it left in `CART_ID_COOKIE`. Scaffolding (Global Constraint 7):
 * no colour, no font, no formatted price -- the API's own numbers, carried
 * through as-is.
 */

import { cookies } from "next/headers";
import { connection } from "next/server";

import { getRuntimeConfig } from "../../config/runtime-config";
import { createStoreFetchJson, StoreApiError } from "../../lib/medusa-client";
import { getCart } from "../../lib/store-cart";
import { CART_ID_COOKIE } from "../page";

export default async function CartPage() {
  await connection();
  const cookieStore = await cookies();
  const cartId = cookieStore.get(CART_ID_COOKIE)?.value;

  if (cartId === undefined) {
    return (
      <main>
        <p>Cart is empty.</p>
      </main>
    );
  }

  const { medusa } = getRuntimeConfig();
  if (medusa.backendUrl === null || medusa.publishableKey === null) {
    throw new Error("MEDUSA_BACKEND_URL and MEDUSA_PUBLISHABLE_API_KEY must both be set to render the cart");
  }
  const fetchJson = createStoreFetchJson({ backendUrl: medusa.backendUrl, publishableKey: medusa.publishableKey });

  // A cookie naming a cart the backend no longer has (expired, or from a
  // reset backend) is not a transient error: it is the same "no cart" state
  // as no cookie at all, so it gets the same response and the stale cookie
  // is cleared rather than left in place, repeatedly failing every request
  // for the rest of the session.
  let cart;
  try {
    cart = await getCart(fetchJson, cartId);
  } catch (error) {
    if (error instanceof StoreApiError && error.status === 404) {
      cookieStore.delete(CART_ID_COOKIE);
      return (
        <main>
          <p>Cart is empty.</p>
        </main>
      );
    }
    throw error;
  }

  return (
    <main>
      <ul>
        {(cart.items ?? []).map((item) => (
          <li key={item.id}>
            {item.title ?? item.variant_id} × {item.quantity} ({item.unit_price} {cart.currency_code})
          </li>
        ))}
      </ul>
      {/* The only route to `/checkout` from anywhere a shopper can reach by clicking -- see T10's report (Minor 10). */}
      <a href="/checkout">Checkout</a>
    </main>
  );
}
