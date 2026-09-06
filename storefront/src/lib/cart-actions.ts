"use server";

/**
 * The one Server Action that puts a tier in a cart.
 *
 * **It was two.** The home page and the tier page each defined a
 * byte-identical copy — the same cookie name, the same four cookie attributes,
 * the same reuse-or-create, the same quantity, the same redirect — and nothing
 * kept them in step. Two Gate D reviews flagged it; the second pointed out
 * that the objection to sharing (that a `"use server"` module would couple two
 * routes) did not survive the fact that both routes already imported
 * `CART_ID_COOKIE` from the home page's route module.
 *
 * A `"use server"` module may export only async functions, which is why the
 * cookie name and its attributes are in `./store-session` rather than here.
 *
 * **Every export of this file is a POST endpoint.** Next gives each one a
 * public action id, so anything exported here is reachable by any visitor with
 * any arguments. That is why this module exports exactly one function, which
 * reads exactly one field and validates it.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { FetchJson } from "./medusa-client";
import { createStoreFetchJson, getDefaultRegion } from "./medusa-client";
import { addLineToCart, createCart, getCart, removeLineFromCart } from "./store-cart";
import { CART_COOKIE_OPTIONS, CART_ID_COOKIE, requireStoreClientConfig } from "./store-session";

/**
 * The cart this add goes into: the one the cookie names, or a new one.
 *
 * **Three ways the cookie's cart is unusable**, and only the first was handled
 * before C3a:
 *
 *  - there is no cookie;
 *  - it names a cart that no longer resolves. Nothing expires a cart here, but
 *    a database restored to an earlier point, a cookie carried between
 *    environments, or a hand-edited value all produce one. Until now this
 *    threw out of the Server Action, and a visitor got an error page for
 *    clicking a button;
 *  - **it names a cart that has already been paid for.** Nothing clears the
 *    cookie at checkout and nothing could — it is `httpOnly`, so the Client
 *    Component that knows the order succeeded cannot reach it. A visitor
 *    buying a second certificate arrives here holding the cart they already
 *    bought, whose lines can no longer be changed.
 */
async function cartToAddTo(fetchJson: FetchJson, existingCartId: string | undefined): Promise<string> {
  if (existingCartId !== undefined) {
    try {
      const cart = await getCart(fetchJson, existingCartId);
      if (cart.completed_at == null) {
        for (const line of cart.items ?? []) {
          // Sequential, not `Promise.all`: these are writes to one cart and
          // Medusa refetches and recomputes it on each.
          await removeLineFromCart(fetchJson, cart.id, line.id);
        }
        return cart.id;
      }
    } catch {
      // Not rethrown, and not logged with the id -- a cart id is a bearer
      // token for that cart's contents. The recovery is the same whatever the
      // cause, so telling the causes apart earns nothing.
    }
  }
  return (await createCart(fetchJson, (await getDefaultRegion(fetchJson)).id)).id;
}

/**
 * Puts one certificate in the visitor's cart, replacing whatever was in it,
 * and sends them to it.
 *
 * **One certificate per order, made true here.** Contract §16 gives a deal one
 * `order_id` and no line reference, so an order for two things has no single
 * tier and no single price to certify — C2's subscriber refuses to issue for
 * one rather than print a transaction that did not happen. This is the row
 * that keeps the cart out of that state: every existing line goes before the
 * chosen one arrives, so clicking two tiers means the second, and clicking one
 * tier twice means one.
 *
 * That is also what the buyer means. The three tiers are a choice between
 * things that deliver the same nothing (§4.1); pressing "add" on a second one
 * is changing your mind, not ordering a pair.
 *
 * **It is not a security boundary.** `POST /store/carts/:id/line-items` is
 * public, so a visitor who wants a two-line cart can have one. What this stops
 * is an honest buyer reaching checkout in a state that cannot be certified —
 * `checkout/page.tsx` then refuses to take money in it, and C2's subscriber
 * refuses to certify it.
 *
 * The quantity is one and is not read from the form: nothing on this site
 * offers a quantity control, and a field the browser can set is a field a
 * visitor can set to something else.
 */
export async function addToCart(formData: FormData): Promise<void> {
  const variantId = formData.get("variantId");
  if (typeof variantId !== "string") {
    throw new Error("addToCart: missing variantId");
  }

  const fetchJson = createStoreFetchJson(requireStoreClientConfig());
  const cookieStore = await cookies();
  const cartId = await cartToAddTo(fetchJson, cookieStore.get(CART_ID_COOKIE)?.value);
  await addLineToCart(fetchJson, cartId, variantId, 1);

  cookieStore.set(CART_ID_COOKIE, cartId, CART_COOKIE_OPTIONS);
  redirect("/cart");
}
