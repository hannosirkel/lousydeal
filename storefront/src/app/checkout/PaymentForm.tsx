/**
 * The interactive half of `./page.tsx`: the Stripe Payment Element and the
 * pay control, and the only client-side code this row adds.
 *
 * A `"use client"` file because `@stripe/react-stripe-js`'s `<Elements>` and
 * `<PaymentElement>` (and this file's own `useStripe`/`useElements`) are React
 * hooks, which only run in a module the compiler has marked as a client
 * boundary -- `page.tsx`'s own comment says why that boundary cannot be this
 * same file.
 *
 * Talks to Medusa only through the same-origin proxy at `/api/store/*`
 * (`src/app/api/store/[...path]/route.ts`) -- this file has no backend origin
 * and no publishable key to call Medusa directly with, by design (T10:
 * "the browser never learns the backend origin"). `createProxyFetchJson`
 * below is this file's own `FetchJson` (`src/lib/medusa-client.ts`'s
 * injected-transport shape), so `store-payment.ts`'s functions run unchanged
 * whether the caller is this browser code or `tests/store-checkout.test.ts`'s
 * stub.
 *
 * Q7 (`docs/working/ld-01-foundation/open-questions.md`) records five:
 * card, Google Pay, Apple Pay, Link (collapsed) and PayPal. This file does
 * not implement that list itself -- card and PayPal are payment methods,
 * chosen by the operator in the Stripe Dashboard and surfaced through the
 * backend's `automaticPaymentMethods: true` (T6b), not something a
 * `PaymentElement` prop names. `wallets` below is narrower: the three of the
 * five that *are* `PaymentElement` wallet options -- Apple Pay, Google Pay
 * and Link -- are what this file sets `"auto"` rather than leaving to
 * Stripe's own default, and it sets no `paymentMethodOrder` or layout beyond
 * that.
 */
"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import type { FetchJson, StoreFetchInit } from "../../lib/medusa-client";
import { completeCheckoutCart, createPaymentCollection, initiateStripePaymentSession } from "../../lib/store-payment";

/** This route's own mount point (`src/app/api/store/[...path]/route.ts`), never the backend origin. */
const STORE_API_PROXY_PREFIX = "/api/store";

/**
 * The browser's `FetchJson`: same-origin, through the proxy, with no
 * publishable key of its own -- the proxy attaches it server-side. Kept local
 * to this file rather than added to `medusa-client.ts`, which T9 closed.
 */
function createProxyFetchJson(): FetchJson {
  return async function proxyFetchJson<T>(path: string, init: StoreFetchInit = {}): Promise<T> {
    const response = await fetch(`${STORE_API_PROXY_PREFIX}${path}`, {
      ...init,
      headers: { ...init.headers, "content-type": "application/json" },
    });
    if (!response.ok) {
      throw new Error(`Store API proxy returned ${String(response.status)} for ${path}`);
    }
    return (await response.json()) as T;
  };
}

interface PaymentFormProps {
  readonly cartId: string;
  readonly stripePublishableKey: string;
}

/** Creates the cart's Stripe session, then renders the Payment Element once a client secret exists. */
export function PaymentForm({ cartId, stripePublishableKey }: PaymentFormProps) {
  const stripePromise = useMemo(() => loadStripe(stripePublishableKey), [stripePublishableKey]);
  const fetchJson = useMemo(() => createProxyFetchJson(), []);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Guards against firing `createPaymentCollection` twice for the same
  // `cartId`, not just against setting state after one -- see
  // `store-payment.ts`'s own comment on that function for why a second
  // concurrent call can throw rather than harmlessly return the first's
  // collection. React 18 `StrictMode` (dev only) runs this effect, its
  // cleanup, and this effect again -- with the same `cartId` -- before either
  // `fetch` resolves, so relying on the cleanup's `cancelled` flag alone
  // still lets both network calls go out. A `ref` survives that synthetic
  // unmount/remount (only effects re-run, not hook state), so comparing
  // against the `cartId` it last started is what stops the second call from
  // being made at all, while still firing again if `cartId` genuinely
  // changes or a fresh `PaymentForm` instance mounts with a fresh `ref`.
  const startedForCartRef = useRef<string | null>(null);

  useEffect(() => {
    if (startedForCartRef.current === cartId) return;
    startedForCartRef.current = cartId;
    let cancelled = false;
    createPaymentCollection(fetchJson, cartId)
      .then((paymentCollectionId) => initiateStripePaymentSession(fetchJson, paymentCollectionId))
      .then((session) => {
        if (!cancelled) setClientSecret(session.clientSecret);
      })
      .catch((thrown: unknown) => {
        if (!cancelled) setError(thrown instanceof Error ? thrown.message : "Could not start payment.");
      });
    return () => {
      cancelled = true;
    };
  }, [cartId, fetchJson]);

  if (error !== null) {
    return <p>{error}</p>;
  }
  if (clientSecret === null) {
    return <p>Preparing payment…</p>;
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PayButton cartId={cartId} fetchJson={fetchJson} />
    </Elements>
  );
}

interface PayButtonProps {
  readonly cartId: string;
  readonly fetchJson: FetchJson;
}

/** The card-entry form and the pay control. Split from `PaymentForm` because `useStripe`/`useElements` require an `<Elements>` ancestor. */
function PayButton({ cartId, fetchJson }: PayButtonProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (stripe === null || elements === null || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      // `redirect: "if_required"` keeps a standard test-mode card on this
      // page; `return_url` still has to be an absolute URL because Stripe
      // uses it for the wallets and payment methods that redirect regardless.
      const confirmation = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: `${window.location.origin}/checkout` },
        redirect: "if_required",
      });
      if (confirmation.error) {
        throw new Error(confirmation.error.message ?? "Payment could not be confirmed.");
      }
      const order = await completeCheckoutCart(fetchJson, cartId);
      setOrderId(order.orderId);
    } catch (thrown: unknown) {
      setError(thrown instanceof Error ? thrown.message : "Payment could not be completed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (orderId !== null) {
    return <p>Order placed: {orderId}</p>;
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)}>
      <PaymentElement options={{ wallets: { applePay: "auto", googlePay: "auto", link: "auto" } }} />
      {error !== null && <p>{error}</p>}
      <button type="submit" disabled={stripe === null || submitting}>
        {submitting ? "Paying…" : "Pay"}
      </button>
    </form>
  );
}
