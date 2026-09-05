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

import { createStoreFetchJson, getDefaultRegion } from "./medusa-client";
import { addLineToCart, createCart } from "./store-cart";
import { CART_COOKIE_OPTIONS, CART_ID_COOKIE, requireStoreClientConfig } from "./store-session";

/**
 * Adds one of a variant to the visitor's cart, creating the cart if the cookie
 * names none, and sends them to it.
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
  const existingCartId = cookieStore.get(CART_ID_COOKIE)?.value;
  const cart =
    existingCartId === undefined
      ? await createCart(fetchJson, (await getDefaultRegion(fetchJson)).id)
      : { id: existingCartId };
  await addLineToCart(fetchJson, cart.id, variantId, 1);

  cookieStore.set(CART_ID_COOKIE, cart.id, CART_COOKIE_OPTIONS);
  redirect("/cart");
}
