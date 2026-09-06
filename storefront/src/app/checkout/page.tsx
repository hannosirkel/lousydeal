/**
 * The checkout, as a payment authorisation -- `docs/current/brand.md` §4: the
 * total explicit as a ledger row before anything else, then the price notice,
 * then the consent checkbox, then the payment element.
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

import { Button } from "../../components/document/Button";
import { DocumentFrame } from "../../components/document/DocumentFrame";
import { FinePrint } from "../../components/document/FinePrint";
import { Ledger, LedgerRow } from "../../components/document/LedgerRow";
import { getRuntimeConfig } from "../../config/runtime-config";
import { CART_EMPTY_NOTICE, CART_LABELS, CHECKOUT_DOCUMENT, PRICE_NOTICE, RETURN_LABEL } from "../../content/checkout";
import { createStoreFetchJson, getDefaultRegion } from "../../lib/medusa-client";
import { formatMoney } from "../../lib/money";
import { getCheckoutCart } from "../../lib/store-checkout";
import { CART_ID_COOKIE, requireStoreClientConfig } from "../../lib/store-session";
import { PaymentForm } from "./PaymentForm";

export default async function CheckoutPage() {
  await connection();
  const cookieStore = await cookies();
  const cartId = cookieStore.get(CART_ID_COOKIE)?.value;

  if (cartId === undefined) {
    return (
      <main>
        <DocumentFrame
          title={CHECKOUT_DOCUMENT.title}
          form={CHECKOUT_DOCUMENT.form}
          revision={CHECKOUT_DOCUMENT.revision}
        >
          <p className="notice">{CART_EMPTY_NOTICE}</p>
          {/* Gate E: this state had no way onward. The cart's identical state
              has carried one since V6a, and a visitor whose cart expired
              between the two pages reached a document with nothing to do. */}
          <Button variant="secondary" href="/">
            {RETURN_LABEL}
          </Button>
        </DocumentFrame>
      </main>
    );
  }

  const { stripe } = getRuntimeConfig();
  if (stripe.publishableKey === null) {
    throw new Error("STRIPE_PUBLISHABLE_KEY must be set to render checkout");
  }

  const fetchJson = createStoreFetchJson(requireStoreClientConfig());
  const cart = await getCheckoutCart(fetchJson, cartId);
  const region = await getDefaultRegion(fetchJson);

  return (
    <main>
      <DocumentFrame
        title={CHECKOUT_DOCUMENT.title}
        form={CHECKOUT_DOCUMENT.form}
        revision={CHECKOUT_DOCUMENT.revision}
      >
        {/* The final price, explicit before the pay control -- the cart's own
            total, not recomputed. §23 requires this; the notice under it says
            the figure is also final. */}
        <Ledger>
          <LedgerRow label={CART_LABELS.total} value={formatMoney(cart.total, cart.currencyCode)} />
        </Ledger>
        <FinePrint>{PRICE_NOTICE}</FinePrint>
        <PaymentForm cartId={cart.id} stripePublishableKey={stripe.publishableKey} countries={region.countries ?? []} />
      </DocumentFrame>
    </main>
  );
}
