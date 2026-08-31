/**
 * The checkout page: the cart's explicit total, then the Stripe Payment
 * Element. Scaffolding (Global Constraint 7) -- no colour, no font, the API's
 * own total carried through as-is.
 *
 * A Server Component, like `src/app/cart/page.tsx` -- it reads `CART_ID_COOKIE`
 * and fetches the cart directly against the backend (T9's established
 * pattern), never through the `/api/store/*` proxy, which exists for the
 * *browser* to reach the Store API without learning the backend origin, not
 * for this file, which already has it from `getRuntimeConfig()`.
 *
 * The interactive payment step is `./PaymentForm.tsx`, a Client Component this
 * page renders and hands `cartId`, the Stripe publishable key, and the
 * region's own `countries` to as props. It cannot live in this file:
 * `@stripe/react-stripe-js`'s `<Elements>` and `<PaymentElement>` use React
 * hooks, which only run in a module marked `"use client"`, and that directive
 * is file-scoped -- a file using `next/headers`'s `cookies()`, as this one
 * must to find the cart, cannot also be one. `docs/working/ld-01-foundation.md`'s
 * T10 Files block records `PaymentForm.tsx` for that reason.
 *
 * `countries` is fetched here, server-side against the backend directly
 * (`getDefaultRegion`, T9's established pattern -- see this file's own note
 * above on why this page never goes through the `/api/store/*` proxy), and
 * passed down as a plain, already-serializable array. `PaymentForm.tsx`
 * builds the checkout country control from exactly this list rather than
 * free text, which is what closes T10b's Finding 1: a value taken from a
 * region's own `countries` cannot fail Medusa's `iso_2` lookup, because it is
 * one of the rows that lookup matches against (`medusa-client.ts`'s own note
 * on `StoreRegionCountry`).
 */

import { cookies } from "next/headers";
import { connection } from "next/server";

import { getRuntimeConfig } from "../../config/runtime-config";
import { createStoreFetchJson, getDefaultRegion } from "../../lib/medusa-client";
import { getCheckoutCart } from "../../lib/store-checkout";
import { CART_ID_COOKIE } from "../page";
import { PaymentForm } from "./PaymentForm";

export default async function CheckoutPage() {
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

  const { medusa, stripe } = getRuntimeConfig();
  if (medusa.backendUrl === null || medusa.publishableKey === null) {
    throw new Error("MEDUSA_BACKEND_URL and MEDUSA_PUBLISHABLE_API_KEY must both be set to render checkout");
  }
  if (stripe.publishableKey === null) {
    throw new Error("STRIPE_PUBLISHABLE_KEY must be set to render checkout");
  }

  const fetchJson = createStoreFetchJson({ backendUrl: medusa.backendUrl, publishableKey: medusa.publishableKey });
  const cart = await getCheckoutCart(fetchJson, cartId);
  const region = await getDefaultRegion(fetchJson);

  return (
    <main>
      {/* The final price, explicit before the pay control -- the cart's own total, not recomputed. */}
      <p>
        Total: {cart.total} {cart.currencyCode}
      </p>
      <PaymentForm cartId={cart.id} stripePublishableKey={stripe.publishableKey} countries={region.countries ?? []} />
    </main>
  );
}
