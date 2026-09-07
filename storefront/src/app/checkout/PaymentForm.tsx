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
import { Ledger, LedgerRow } from "../../components/document/LedgerRow";
import {
  CONSENT_LABEL,
  CONSENT_REQUIRED_NOTICE,
  COUNTRY_LABEL,
  EMAIL_HINT,
  EMAIL_LABEL,
  INSCRIPTION_LABELS,
  INSCRIPTION_NOTICE,
  GIFT_CONFIRMATION_NOTE,
  GIFT_LABELS,
  GIFT_NOTICE,
  GIFT_PREVIEW_EMPTY,
  GIFT_PREVIEW_LABEL,
  GIFT_SUMMARY,
  INSCRIPTION_PREVIEW_LABEL,
  PAY_LABEL,
  PAYING_LABEL,
  PAYMENT_NEEDS_SCRIPTING,
  PREPARING_PAYMENT_LABEL,
} from "../../content/checkout";
import { NO_INSCRIPTION } from "../../content/certificate";
import { payDisabled } from "../../lib/checkout-rules";
import { GIFT_LIMITS, previewGiftText } from "../../lib/gift";
import { INSCRIPTION_LIMITS, sanitiseInscription } from "../../lib/inscription";
import type { FetchJson, StoreFetchInit, StoreRegionCountry } from "../../lib/medusa-client";
import { setCartCountry, setCartEmail, setCartInscriptionAndGift } from "../../lib/store-checkout";
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
      <>
        <p role="status">
          <span className="cursor" aria-hidden="true" />
          <span className="visually-hidden">{PREPARING_PAYMENT_LABEL}</span>
        </p>
        {/* Gate E: served without scripting, this page showed the cursor and
            "Preparing payment" for ever, and nothing was preparing. The
            element that resolves it is the script that will never run. */}
        <noscript>
          <p className="notice">{PAYMENT_NEEDS_SCRIPTING}</p>
        </noscript>
      </>
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
  /**
   * Where the s 55(1)-(2) confirmation goes. C3b.
   *
   * Empty by default and never prefilled: there is no account and nothing to
   * remember a buyer by, so anything here would be a guess.
   */
  const [email, setEmail] = useState("");
  /**
   * §5's two inscription fields, both optional and both public. C3c.
   *
   * Held raw. The preview below runs the render-side filter so the buyer sees
   * what will appear, but what travels to the cart is what they typed: the
   * pass that decides what is *stored* runs in the backend at issuance,
   * because the endpoint carrying this is public.
   */
  const [displayName, setDisplayName] = useState("");
  const [dedication, setDedication] = useState("");
  /**
   * §6's four gift fields. G3.
   *
   * Held raw for §5's reason, and read only when the disclosure is open: a
   * buyer who typed a recipient, changed their mind and closed the block has
   * not ordered a gift, and the closed block sends four nulls.
   *
   * `giftOpen` mirrors the `<details>` element rather than driving it. The
   * element opens on its own without scripting; this state exists so
   * `handleSubmit` knows whether the block was open, and so the preview
   * beneath the message renders. Reading `open` off the DOM at submit time
   * would work too and would be one more thing that only works with a
   * reference.
   */
  const [giftOpen, setGiftOpen] = useState(false);
  const [giftRecipientName, setGiftRecipientName] = useState("");
  const [giftRecipientEmail, setGiftRecipientEmail] = useState("");
  const [giftSenderName, setGiftSenderName] = useState("");
  const [giftMessage, setGiftMessage] = useState("");

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
      // C3b, and before `setCartCountry` only because a rejected address
      // should cost the buyer nothing: both run before `confirmPayment`
      // below, so neither can leave a charged card on an order Medusa then
      // refuses. `setCartEmail` throws on an address Medusa will not take.
      await setCartEmail(fetchJson, cartId, email);
      // One call, not two: Medusa replaces the whole `metadata` object on
      // each write, so a second would erase the first's keys.
      await setCartInscriptionAndGift(fetchJson, cartId, {
        displayName,
        dedication,
        gift: giftOpen
          ? {
              recipientName: giftRecipientName,
              recipientEmail: giftRecipientEmail,
              senderName: giftSenderName,
              message: giftMessage,
            }
          : null,
      });
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
      {/* C3b. `type="email"` and `required` are the enforcing half here, and
          unlike the consent box below they are enough: `requestSubmit()` runs
          constraint validation, so there is no bypass of the kind that made
          the consent gate need a second check in `handleSubmit`. The address
          is validated for real by Medusa (`z.string().email()`), which
          `setCartEmail` reads back. */}
      <p className="field">
        <label htmlFor="checkout-email">{EMAIL_LABEL}</label>
        <input
          id="checkout-email"
          type="email"
          value={email}
          autoComplete="email"
          required
          aria-describedby="checkout-email-hint"
          onChange={(event) => setEmail(event.target.value)}
        />
      </p>
      <FinePrint>
        <span id="checkout-email-hint">{EMAIL_HINT}</span>
      </FinePrint>

      {/* C3c. §5's two fields, and the notice that has to come before them
          rather than after: what is public, that the billing name is never
          used, and that some of what is typed is removed. No `required` on
          either -- §5 says most buyers leave both blank and the certificate
          has to look deliberate when they do. */}
      <FinePrint>
        <span id="checkout-inscription-notice">{INSCRIPTION_NOTICE}</span>
      </FinePrint>
      <p className="field">
        <label htmlFor="checkout-display-name">{INSCRIPTION_LABELS.displayName}</label>
        <input
          id="checkout-display-name"
          type="text"
          value={displayName}
          maxLength={INSCRIPTION_LIMITS.displayName}
          aria-describedby="checkout-inscription-notice"
          onChange={(event) => setDisplayName(event.target.value)}
        />
      </p>
      <p className="field">
        <label htmlFor="checkout-dedication">{INSCRIPTION_LABELS.dedication}</label>
        <input
          id="checkout-dedication"
          type="text"
          value={dedication}
          maxLength={INSCRIPTION_LIMITS.dedication}
          aria-describedby="checkout-inscription-notice"
          onChange={(event) => setDedication(event.target.value)}
        />
      </p>
      {/* The preview is the disclosure §5 asks for -- the buyer is shown what
          is public *before* they pay -- run through the same filter the
          certificate renders with, so it cannot flatter. `aria-live` because
          it changes as they type and a screen reader would otherwise never
          learn that something was removed. */}
      <Ledger>
        <LedgerRow
          label={INSCRIPTION_PREVIEW_LABEL}
          value={sanitiseInscription(displayName) ?? NO_INSCRIPTION}
        />
      </Ledger>
      <FinePrint>
        <span aria-live="polite">{sanitiseInscription(dedication) ?? ""}</span>
      </FinePrint>

      {/* G3. §6's gift block, closed by default because most orders are not
          gifts and four fields before the pay button would tax every ordinary
          purchase for the sake of the occasional one.

          `<details>` rather than a checkbox and a conditional render: it opens
          without JavaScript, screen readers already announce it, and it needs
          no state to work. `onToggle` records what the element did rather than
          driving it -- `handleSubmit` has to know whether the block was open,
          and a buyer who typed a recipient and then closed it has not ordered
          a gift.

          The surrounding checkout does require scripting, because of the card
          form. This block adds no dependency of its own; it does not claim the
          gift flow degrades. */}
      <details
        className="gift"
        onToggle={(event) => setGiftOpen((event.currentTarget as HTMLDetailsElement).open)}
      >
        <summary>{GIFT_SUMMARY}</summary>
        {/* Before the fields, not after: what is public, what is not, and that
            somebody else will be emailed. A buyer who put the recipient's name
            into the certificate's own field expecting privacy has been misled
            by this page. */}
        <FinePrint>
          <span id="checkout-gift-notice">{GIFT_NOTICE}</span>
        </FinePrint>
        {/* `required` only inside an open block: the constraint applies when
            the element is open, and a closed one submits nothing. `type="email"`
            is the enforcing half, the way it is on the buyer's own address --
            `requestSubmit()` runs constraint validation, so an open block
            cannot reach `handleSubmit` without one. */}
        <p className="field">
          <label htmlFor="checkout-gift-email">{GIFT_LABELS.recipientEmail}</label>
          <input
            id="checkout-gift-email"
            type="email"
            value={giftRecipientEmail}
            maxLength={GIFT_LIMITS.recipientEmail}
            autoComplete="off"
            required={giftOpen}
            aria-describedby="checkout-gift-notice"
            onChange={(event) => setGiftRecipientEmail(event.target.value)}
          />
        </p>
        <p className="field">
          <label htmlFor="checkout-gift-recipient">{GIFT_LABELS.recipientName}</label>
          <input
            id="checkout-gift-recipient"
            type="text"
            value={giftRecipientName}
            maxLength={GIFT_LIMITS.recipientName}
            autoComplete="off"
            aria-describedby="checkout-gift-notice"
            onChange={(event) => setGiftRecipientName(event.target.value)}
          />
        </p>
        <p className="field">
          <label htmlFor="checkout-gift-sender">{GIFT_LABELS.senderName}</label>
          <input
            id="checkout-gift-sender"
            type="text"
            value={giftSenderName}
            maxLength={GIFT_LIMITS.senderName}
            autoComplete="off"
            aria-describedby="checkout-gift-notice"
            onChange={(event) => setGiftSenderName(event.target.value)}
          />
        </p>
        <p className="field">
          <label htmlFor="checkout-gift-message">{GIFT_LABELS.message}</label>
          <input
            id="checkout-gift-message"
            type="text"
            value={giftMessage}
            maxLength={GIFT_LIMITS.message}
            autoComplete="off"
            aria-describedby="checkout-gift-notice"
            onChange={(event) => setGiftMessage(event.target.value)}
          />
        </p>
        {/* The same disclosure §5 gets, for the same reason: a buyer who typed
            a URL sees it vanish here rather than discovering later that we
            removed it from a message they thought they had sent. */}
        <Ledger>
          <LedgerRow
            label={GIFT_PREVIEW_LABEL}
            value={previewGiftText(giftMessage, GIFT_LIMITS.message) ?? GIFT_PREVIEW_EMPTY}
          />
        </Ledger>
        <FinePrint>
          <span>{GIFT_CONFIRMATION_NOTE}</span>
        </FinePrint>
      </details>

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
