/**
 * The first customer-facing page: the three tiers, from the store API.
 * Scaffolding a later slice replaces (Global Constraint 7) -- no colour, no
 * font, no invented product copy; the tier titles are the API's own and the
 * only string this file adds is the submit button's label.
 *
 * `await connection()` is `src/app/layout.tsx`'s pattern, repeated here
 * because `getRuntimeConfig()` must run inside a dynamically rendered
 * request, not once at build time -- see that file's comment for why.
 *
 * The "add to cart" form actions are Server Actions defined in this
 * Server Component's own body, not client code: submitting posts to the
 * server, which reuses the cart named by `CART_ID_COOKIE` when the cookie
 * names one, creates a cart only when it does not, adds the one line, and
 * redirects to `/cart` -- no client-side JavaScript is required for this to
 * work.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { getRuntimeConfig } from "../config/runtime-config";
import { createStoreFetchJson, getDefaultRegion, listTiers, type StoreClientConfig } from "../lib/medusa-client";
import { addLineToCart, createCart } from "../lib/store-cart";

/** Also read by `src/app/cart/page.tsx`, which looks the cart up by this id. */
export const CART_ID_COOKIE = "lousydeal_cart_id";

function requireStoreClientConfig(): StoreClientConfig {
  const { medusa } = getRuntimeConfig();
  if (medusa.backendUrl === null || medusa.publishableKey === null) {
    throw new Error("MEDUSA_BACKEND_URL and MEDUSA_PUBLISHABLE_API_KEY must both be set to render the storefront");
  }
  return { backendUrl: medusa.backendUrl, publishableKey: medusa.publishableKey };
}

export default async function HomePage() {
  await connection();
  const fetchJson = createStoreFetchJson(requireStoreClientConfig());
  const tiers = await listTiers(fetchJson);

  async function addToCart(formData: FormData): Promise<void> {
    "use server";
    const variantId = formData.get("variantId");
    if (typeof variantId !== "string") {
      throw new Error("addToCart: missing variantId");
    }

    const actionFetchJson = createStoreFetchJson(requireStoreClientConfig());
    const cookieStore = await cookies();
    const existingCartId = cookieStore.get(CART_ID_COOKIE)?.value;
    const cart =
      existingCartId === undefined
        ? await createCart(actionFetchJson, (await getDefaultRegion(actionFetchJson)).id)
        : { id: existingCartId };
    await addLineToCart(actionFetchJson, cart.id, variantId, 1);

    cookieStore.set(CART_ID_COOKIE, cart.id, { httpOnly: true, sameSite: "lax", path: "/", secure: true });
    redirect("/cart");
  }

  return (
    <main>
      <ul>
        {tiers.map((tier) => (
          <li key={tier.id}>
            {tier.title} ({tier.amount} {tier.currencyCode})
            <form action={addToCart}>
              <input type="hidden" name="variantId" value={tier.variantId} />
              <button type="submit">Add to cart</button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
