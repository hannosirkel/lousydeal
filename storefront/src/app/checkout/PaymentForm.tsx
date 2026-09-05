/**
 * The interactive half of `./page.tsx`: the country control, the Stripe
 * Payment Element, and the pay control -- the only client-side code T10/T10b
 * add.
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
 * T10b, review pass 1: the checkout country field is a native `<select>`
 * populated from `countries`, the region's own list (`./page.tsx` fetches it
 * server-side and hands it down), not a Stripe `AddressElement`. This is not
 * a style choice, it fixes the row's Finding 1 by construction -- the
 * region's `countries` are the exact rows `update-cart.js:30-34` matches a
 * cart's `country_code` against, and they are already lower-case
 * (`medusa-client.ts`'s own note on `StoreRegionCountry`), so a value taken
 * from this list cannot fail that lookup on case the way `AddressElement`'s
 * upper-case `country` did. It also collects the one field the row's brief
 * asks for ("collect the customer's country") instead of a whole billing
 * address, which `AddressElement`'s installed typings have no way to narrow
 * to country-only -- `fields`/`display` only cover `phone` and `name`, and
 * `allowedCountries` restricts the dropdown, not the field set.
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

import { Button } from "../../components/document/Button";
import { FinePrint } from "../../components/document/FinePrint";
import {
  CONSENT_LABEL,
  CONSENT_REQUIRED_NOTICE,
  COUNTRY_LABEL,
  PAY_LABEL,
  PAYING_LABEL,
  PREPARING_PAYMENT_LABEL,
} from "../../content/checkout";
import { payDisabled } from "../../lib/checkout-rules";
import type { FetchJson, StoreFetchInit, StoreRegionCountry } from "../../lib/medusa-client";
import { setCartCountry } from "../../lib/store-checkout";
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
  /** The region's own countries (`./page.tsx`'s `getDefaultRegion`), not a list this file writes. */
  readonly countries: readonly StoreRegionCountry[];
}

/** Creates the cart's Stripe session, then renders the Payment Element once a client secret exists. */
export function PaymentForm({ cartId, stripePublishableKey, countries }: PaymentFormProps) {
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
    return <p className="payment-error">{error}</p>;
  }
  if (clientSecret === null) {
    // The one place `brand.md` §4's blinking cursor belongs: a state inside a
    // rendered page. As a route-level `loading.tsx` it made every page serve
    // nothing without JavaScript -- see V5c.
    return (
      <p role="status">
        <span className="cursor" aria-hidden="true" />
        <span className="visually-hidden">{PREPARING_PAYMENT_LABEL}</span>
      </p>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PayButton cartId={cartId} fetchJson={fetchJson} countries={countries} />
    </Elements>
  );
}

interface PayButtonProps {
  readonly cartId: string;
  readonly fetchJson: FetchJson;
  readonly countries: readonly StoreRegionCountry[];
}

/**
 * The card-entry form, the consent box and the pay control. Split from
 * `PaymentForm` because `useStripe`/`useElements` require an `<Elements>`
 * ancestor.
 *
 * **Exported so the suite can render it.** V6b's first version claimed this
 * could not be reached without a live Stripe client secret, and that was
 * wrong: nothing under test touches Stripe, so four lines of `vi.mock` over
 * `@stripe/react-stripe-js` render the real markup -- the real default, the
 * real `disabled`.
 */
export function PayButton({ cartId, fetchJson, countries }: PayButtonProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  /**
   * The express consent VÕS § 53(4) p 7¹ requires. Unticked by default and
   * never defaulted true: consent the trader supplies is not consent. The pay
   * control is disabled behind it, so the only way to pay is to have ticked
   * it.
   *
   * It is necessary and not sufficient. The same clause needs the trader's
   * § 55(1)-(2) confirmation on a durable medium as well -- the order email,
   * which is LD-02 -- so nothing here tells a buyer the right is already gone.
   */
  const [consented, setConsented] = useState(false);
  // Defaults to the region's first country rather than an empty selection --
  // `backend/src/scripts/configure-commerce.ts:90-92`'s `WORLDWIDE_COUNTRY_CODES`
  // is every `defaultCountries` alpha-2 code, so this list is never empty on
  // this deployment's one region -- and a non-empty default means the value
  // `handleSubmit` reads below is always one of `countries`' own rows, never
  // a placeholder string this file invented.
  const [countryCode, setCountryCode] = useState<string>(countries[0]?.iso_2 ?? "");

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    // Consent is checked here as well as on the control. `disabled` alone is
    // one attribute between an unticked box and a completed order --
    // `form.requestSubmit()` ignores it, which Gate D demonstrated by
    // completing a cart with the box visibly unticked.
    if (stripe === null || elements === null || submitting || !consented) return;
    setSubmitting(true);
    setError(null);
    try {
      // T10b: the country Medusa needs to resolve a tax region
      // (`store-checkout.ts`'s `setCartCountry` cites the exact read). Set
      // after the client secret already exists and before `completeCheckoutCart`
      // below -- decision 009 (`docs/decisions/009-merchant-absorbs-the-vat.md`)
      // is why that ordering does not disturb the payment amount already fixed.
      //
      // `countryCode` is `<select>` state, not a Stripe Element value -- there
      // is only one Element in this tree now (`PaymentElement`), so
      // `elements.submit()` is not required before `confirmPayment` below.
      // The prior version of this file called it anyway, citing
      // `elements-group.d.ts:74-79` for a claim that text does not make: that
      // typing documents validating "the Payment Element", not "every mounted
      // Element", and says nothing about element count.
      if (countryCode.length === 0) {
        throw new Error("No country is available for this region.");
      }
      await setCartCountry(fetchJson, cartId, countryCode);

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
      {/* Collects the one field the row asks for, sourced from `countries` --
          the region's own list, not free text -- and read by `setCartCountry`
          on submit. A certificate ships nowhere, so this stands in for a
          shipping address without being one (T10). */}
      <p className="field">
        <label htmlFor="checkout-country">{COUNTRY_LABEL}</label>
        <select
          id="checkout-country"
          value={countryCode}
          onChange={(event) => setCountryCode(event.target.value)}
          required
        >
          {countries.map((country) => (
            <option key={country.iso_2} value={country.iso_2}>
              {country.display_name}
            </option>
          ))}
        </select>
      </p>

      <p className="consent">
        {/* `required` as well as the disabled control: it is the native
            mechanism for this pattern and it blocks an implicit submission
            the `disabled` attribute does not. */}
        <input
          id="checkout-consent"
          type="checkbox"
          checked={consented}
          required
          aria-describedby={consented ? undefined : "checkout-consent-required"}
          onChange={(event) => setConsented(event.target.checked)}
        />
        <label htmlFor="checkout-consent">{CONSENT_LABEL}</label>
      </p>

      <PaymentElement options={{ wallets: { applePay: "auto", googlePay: "auto", link: "auto" } }} />
      {error !== null && (
        <p className="payment-error" role="alert">
          {error}
        </p>
      )}
      {/* Disabled until consent. `brand.md` §4 puts the pay control behind the
          box; this is the visible half of that. It is not the enforcing half
          -- a disabled button is a client-side fact -- and no row here claims
          otherwise; the order is created by Medusa from a cart this storefront
          does not gate. */}
      <Button
        type="submit"
        disabled={payDisabled({ stripeReady: stripe !== null, submitting, consented })}
      >
        {submitting ? PAYING_LABEL : PAY_LABEL}
      </Button>
      {/* Attached to the checkbox rather than to the button: a disabled
          `<button>` is not focusable, so a keyboard reader tabs from the box
          straight past the explanation. */}
      {consented ? null : (
        <FinePrint>
          <span id="checkout-consent-required">{CONSENT_REQUIRED_NOTICE}</span>
        </FinePrint>
      )}
    </form>
  );
}
