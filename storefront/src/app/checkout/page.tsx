/**
 * The checkout, as a payment authorisation -- `docs/current/brand.md` §4: the
 * total explicit as a ledger row first, beneath the adjustment row where there
 * is one, then the price notice, then the consent checkbox, then the payment
 * element.
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
import {
  CART_EMPTY_NOTICE,
  CART_LABELS,
  CART_LINK_LABEL,
  CART_NEEDS_CERTIFICATE_NOTICE,
  CART_NOT_SINGLE_NOTICE,
  CART_SURCHARGE_NOTICE,
  CHECKOUT_DOCUMENT,
  orderSummaryLines,
  priceNotice,
  RETURN_LABEL,
} from "../../content/checkout";
import { cartHasCertificate, cartNeedsAddress, cartRefusedForSurcharge, isPayableCart } from "../../lib/checkout-rules";
import { createStoreFetchJson, getDefaultRegion, listTiers } from "../../lib/medusa-client";
import { formatMoney } from "../../lib/money";
import { getCheckoutCart } from "../../lib/store-checkout";
import { CART_ID_COOKIE, requireStoreClientConfig } from "../../lib/store-session";
import { isSurchargeLine, surchargeLabel, surchargeValue } from "../../lib/surcharge";
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
  /*
   * LD-04 P6a. Which handles are certificates comes from Medusa, not from a
   * constant declared here: `commerce/product-model.ts` is the one place the
   * three tiers are frozen, the backend seeds them from it, and a second copy
   * in this repository's other half is exactly the drift the merch sync spent
   * a row preventing. The cost is one Store API call on a page that already
   * makes two.
   */
  const certificateHandles = (await listTiers(fetchJson)).map((tier) => tier.handle);

  // C3a. A cart holding anything other than one certificate cannot be
  // certified -- C2's subscriber issues nothing for it rather than print a
  // transaction that did not happen -- so this page must not offer to take the
  // money. The ledger row is still shown: the buyer is owed the figure they
  // were looking at, and hiding it would make the refusal harder to
  // understand, not easier. The total alone, though: nothing has proved a
  // surcharge's quantity is one here, so its `unit_price` is not its figure.
  if (!isPayableCart(cart.lines, certificateHandles)) {
    return (
      <main>
        <DocumentFrame
          title={CHECKOUT_DOCUMENT.title}
          form={CHECKOUT_DOCUMENT.form}
          revision={CHECKOUT_DOCUMENT.revision}
        >
          <Ledger>
            <LedgerRow label={CART_LABELS.total} value={formatMoney(cart.total, cart.currencyCode)} />
          </Ledger>
          {/* Three ways a cart is unpayable and three different things to do
              about it, so the notice says which. A buyer told "choose the one
              you want" when what they need is to add one has been told to fix
              the wrong thing, and so has one told either when the extra is a
              doubled discount line. */}
          <p className="notice">
            {cartRefusedForSurcharge(cart.lines, certificateHandles)
              ? CART_SURCHARGE_NOTICE
              : cartHasCertificate(cart.lines, certificateHandles)
                ? CART_NOT_SINGLE_NOTICE
                : CART_NEEDS_CERTIFICATE_NOTICE}
          </p>
          <Button variant="secondary" href="/cart">
            {CART_LINK_LABEL}
          </Button>
        </DocumentFrame>
      </main>
    );
  }

  const region = await getDefaultRegion(fetchJson);

  /* Both decided on the page rather than in the component, so each is a rule a
     test can call -- `checkout-rules.ts` says at its head why that matters. */
  const needsAddress = cartNeedsAddress(cart.lines, certificateHandles);
  const hasCertificate = cartHasCertificate(cart.lines, certificateHandles);
  const surcharge = cart.lines.find(isSurchargeLine);

  return (
    <main>
      <DocumentFrame
        title={CHECKOUT_DOCUMENT.title}
        form={CHECKOUT_DOCUMENT.form}
        revision={CHECKOUT_DOCUMENT.revision}
      >
        {/* The final price, explicit before the pay control -- the cart's own
            total, not recomputed. §23 requires this; the notice under it says
            the figure is also final.

            LD-06 D3: the surcharge above it, where there is one, so a total
            higher than the tier's price has the reason on the page that takes
            the money. Its value is the line's `unit_price`, formatted and not
            computed, and that is the line's whole figure only because
            `isPayableCart` has just proved its quantity is one. */}
        <Ledger>
          {surcharge === undefined ? null : (
            <LedgerRow label={surchargeLabel(surcharge)} value={surchargeValue(surcharge.unitPrice, cart.currencyCode)} />
          )}
          <LedgerRow label={CART_LABELS.total} value={formatMoney(cart.total, cart.currencyCode)} />
        </Ledger>
        <FinePrint>{priceNotice(needsAddress)}</FinePrint>
        {/* § 62²(2): the § 54(1) p 4, 10 and 11 information, immediately
            before the order is transmitted. p 6, the total with taxes, is the
            ledger row above. The subsection's sanction is that a buyer is not
            bound by an order made without it. */}
        {orderSummaryLines({ hasCertificate, hasPostedGoods: needsAddress }).map((line) => (
          <p key={line} className="notice">
            {line}
          </p>
        ))}
        <PaymentForm
          cartId={cart.id}
          stripePublishableKey={stripe.publishableKey}
          countries={region.countries ?? []}
          currencyCode={cart.currencyCode}
          /* LD-04 P7. Decided from the cart's own lines, here rather than in
             the component, so the rule is one a test can call. */
          needsAddress={needsAddress}
          /* LD-04 P10. A cart with no certificate has no § 53(4) p 7¹ consent
             to give, so the box is not shown and the gate does not wait for
             it. Decided here for the same reason `needsAddress` is. */
          needsConsent={hasCertificate}
        />
      </DocumentFrame>
    </main>
  );
}
