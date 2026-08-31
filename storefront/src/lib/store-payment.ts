/**
 * Stripe payment session creation and cart completion, over the **stock**
 * Medusa Store API -- no custom backend route.
 *
 * Plepic adds its own `POST /store/carts/:id/stripe-payment-session`
 * (`backend/src/api/store/carts/[id]/stripe-payment-session`); this
 * repository's `backend/src/api` does not exist at all -- T6b registers the
 * Stripe provider but adds no custom route -- and this row's Files list does
 * not include the backend, so this file goes through the three routes
 * `@medusajs/medusa` itself ships instead:
 * `.../api/store/payment-collections/route.js` (`POST /store/payment-collections`,
 * body `{ cart_id }`, returns `{ payment_collection }`, creating one only if
 * the cart has none yet),
 * `.../payment-collections/[id]/payment-sessions/route.js`
 * (`POST /store/payment-collections/:id/payment-sessions`, body
 * `{ provider_id }`, returns the collection with its `payment_sessions`), and
 * `.../api/store/carts/[id]/complete/route.js` (`POST /store/carts/:id/complete`).
 *
 * `FetchJson` is the same injected seam `medusa-client.ts` and `store-cart.ts`
 * take: this file calls neither `fetch` nor Medusa directly, so the same
 * functions run against `createStoreFetchJson` (server-side, T9's pattern) or
 * a browser `FetchJson` that calls the same-origin proxy (`storefront/src/app/checkout/PaymentForm.tsx`)
 * -- and `tests/store-checkout.test.ts` exercises them with neither, a plain
 * stub.
 */

import type { FetchJson } from "./medusa-client";

/**
 * The Stripe provider's registration id in this deployment.
 *
 * `backend/src/config/payment.ts:27-28` composes this as
 * `` `pp_${STRIPE_PROVIDER_IDENTIFIER}_${STRIPE_PROVIDER_INSTANCE_ID}` ``
 * (`"pp_stripe_stripe"`), citing `@medusajs/payment/dist/loaders/providers.js:45`
 * for the `pp_${identifier}_${id}` registration-key shape and
 * `@medusajs/payment-stripe/dist/services/stripe-provider.js:16` for the
 * `"stripe"` identifier. Written out here rather than imported, because the
 * constant is not exported from `backend/src/config/payment.ts` and this
 * row's Files list does not include the backend to add an export to.
 */
export const STRIPE_PROVIDER_ID = "pp_stripe_stripe";

interface PaymentCollectionResponse {
  readonly payment_collection?: {
    readonly id?: unknown;
    readonly payment_sessions?: readonly unknown[];
  };
}

/**
 * Creates the cart's payment collection, or returns the existing one.
 *
 * Not an upsert inside a single locked operation -- measured against the
 * installed route (`node_modules/@medusajs/medusa/dist/api/store/payment-collections/route.js`):
 * it reads the cart's payment collection first, unlocked, and only calls
 * `createPaymentCollectionForCartWorkflow` when that read finds none; the
 * route's own comment names the gap directly ("We can potentially refactor
 * the workflow to behave more like an upsert"). The workflow itself does
 * acquire a lock on `cart_id` before its own re-read
 * (`node_modules/@medusajs/core-flows/dist/cart/workflows/create-payment-collection-for-cart.js`),
 * and `validateExistingPaymentCollectionStep` **throws**
 * `` `Cart ${cart.id} already has a payment collection` `` if that locked
 * re-read finds one -- so two calls that both reach this route while neither
 * has created a collection yet can have the second throw, rather than
 * receive the first's collection back. `PaymentForm.tsx` guards against
 * exactly that: see its own comment for why.
 */
export async function createPaymentCollection(fetchJson: FetchJson, cartId: string): Promise<string> {
  const { payment_collection: paymentCollection } = await fetchJson<PaymentCollectionResponse>(
    "/store/payment-collections",
    { method: "POST", body: JSON.stringify({ cart_id: cartId }) },
  );
  if (typeof paymentCollection?.id !== "string" || paymentCollection.id.length === 0) {
    throw new Error(`Medusa returned no payment collection for cart ${cartId}`);
  }
  return paymentCollection.id;
}

export interface StripePaymentSession {
  readonly clientSecret: string;
}

/**
 * Initiates the Stripe session on an existing payment collection and returns
 * its client secret -- the one value `@stripe/react-stripe-js`'s `<Elements>`
 * needs to render the Payment Element.
 */
export async function initiateStripePaymentSession(
  fetchJson: FetchJson,
  paymentCollectionId: string,
): Promise<StripePaymentSession> {
  const { payment_collection: paymentCollection } = await fetchJson<PaymentCollectionResponse>(
    `/store/payment-collections/${encodeURIComponent(paymentCollectionId)}/payment-sessions`,
    { method: "POST", body: JSON.stringify({ provider_id: STRIPE_PROVIDER_ID }) },
  );
  const session = paymentCollection?.payment_sessions?.find(
    (raw) => (raw as { provider_id?: unknown }).provider_id === STRIPE_PROVIDER_ID,
  ) as { data?: { client_secret?: unknown } } | undefined;
  if (typeof session?.data?.client_secret !== "string" || session.data.client_secret.length === 0) {
    throw new Error(`Medusa returned no Stripe client secret for payment collection ${paymentCollectionId}`);
  }
  return { clientSecret: session.data.client_secret };
}

export interface CompletedOrder {
  readonly orderId: string;
}

interface CompleteCartResponse {
  readonly type?: unknown;
  readonly order?: { readonly id?: unknown };
}

/**
 * Completes the cart after the browser's own `stripe.confirmPayment` already
 * succeeded. `.../api/store/carts/[id]/complete/route.js` answers a payment or
 * validation failure with **HTTP 200** and `{ type: "cart", cart, error }`
 * (its `statusOKErrors` branch, for `PAYMENT_AUTHORIZATION_ERROR` and
 * `PAYMENT_REQUIRES_MORE_ERROR`), so `!response.ok` alone cannot be trusted to
 * catch it -- `result.type !== "order"` is the check that does.
 */
export async function completeCheckoutCart(fetchJson: FetchJson, cartId: string): Promise<CompletedOrder> {
  const result = await fetchJson<CompleteCartResponse>(`/store/carts/${encodeURIComponent(cartId)}/complete`, {
    method: "POST",
  });
  if (result.type !== "order" || typeof result.order?.id !== "string" || result.order.id.length === 0) {
    throw new Error(`Medusa did not place an order for cart ${cartId}`);
  }
  return { orderId: result.order.id };
}
