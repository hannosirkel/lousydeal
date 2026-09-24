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

import type { Metadata } from "next";
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
  PAYMENT_UNCONFIRMED_NOTICE,
  orderSummaryLines,
  priceNotice,
  RETURN_LABEL,
  STORE_CLOSED_NOTICE,
} from "../../content/checkout";
import { cartHasCertificate, cartNeedsAddress, cartRefusedForSurcharge, isPayableCart } from "../../lib/checkout-rules";
import { createStoreFetchJson, getDefaultRegion, listTiers } from "../../lib/medusa-client";
import { formatMoney } from "../../lib/money";
import { getCheckoutCart } from "../../lib/store-checkout";
import { completeCheckoutCart } from "../../lib/store-payment";
import { CART_ID_COOKIE, requireStoreClientConfig } from "../../lib/store-session";
import { isSurchargeLine, surchargeLabel, surchargeValue } from "../../lib/surcharge";
import { OrderPlaced } from "./OrderPlaced";
import { PaymentForm } from "./PaymentForm";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function lineLabel(title: string, variantTitle: string | null): string {
  const detail = variantTitle?.trim() ?? "";
  if (detail.length === 0 || detail === title || detail === "Default variant") return title;
  return `${title} — ${detail}`;
}

function lineValue(quantity: number, unitPrice: number, currencyCode: string): string {
  const price = formatMoney(unitPrice, currencyCode);
  return quantity === 1 ? price : `${String(quantity)} × ${price}`;
}

type CheckoutSearchParams = Record<string, string | string[] | undefined>;

/**
 * Whether this request is Stripe handing a buyer back after a redirecting
 * payment method succeeded. LD-11 H2.
 *
 * `confirmPayment` names `/checkout` as its `return_url`, and Stripe appends
 * `redirect_status`. The value is only ever a reason to *ask* Medusa to
 * complete the cart, never evidence of payment. Medusa 2.21 authorises the
 * session against Stripe *last* (`complete-cart.js`, after `createOrdersStep`),
 * and a refused authorisation compensates the whole workflow: the order is
 * deleted, `completed_at` restored and the buffered `order.placed` dropped, so
 * nothing is issued. A visitor who types `?redirect_status=succeeded` onto an
 * unpaid cart gets a refusal and a transient order, never a kept one.
 */
function returnedPaid(parameters: CheckoutSearchParams): boolean {
  return parameters["redirect_status"] === "succeeded";
}

export default async function CheckoutPage({
  searchParams = Promise.resolve({}),
}: { readonly searchParams?: Promise<CheckoutSearchParams> } = {}) {
  await connection();
  const { stripe, store } = getRuntimeConfig();
  if (!store.open) {
    return (
      <main>
        <DocumentFrame title={CHECKOUT_DOCUMENT.title} form={CHECKOUT_DOCUMENT.form} revision={CHECKOUT_DOCUMENT.revision}>
          <p className="notice">{STORE_CLOSED_NOTICE}</p>
          <Button variant="secondary" href="/">{RETURN_LABEL}</Button>
        </DocumentFrame>
      </main>
    );
  }
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

  if (stripe.publishableKey === null) {
    throw new Error("STRIPE_PUBLISHABLE_KEY must be set to render checkout");
  }

  const fetchJson = createStoreFetchJson(requireStoreClientConfig());
  let cart = await getCheckoutCart(fetchJson, cartId);

  /*
   * LD-11 H2. **On a redirect the browser never completes the cart**, because
   * the page that would have called `completeCheckoutCart` was navigated away
   * from mid-payment. The order then existed only if Medusa's webhook made it,
   * and nothing read `redirect_status`. So the page completes it here.
   *
   * Safe to repeat: `completeCartWorkflow` takes a lock on the cart and
   * returns the existing order for one already completed, so this and the
   * webhook cannot make two.
   *
   * **H3: a failure here is after the charge**, so it says what
   * `PaymentForm` says in the same position: the card was accepted, do not
   * pay again. It replaced the site's error boundary, which offered a link
   * home and nothing about the money. No form is rendered, and a reload asks
   * again — by which time the webhook has usually completed the cart.
   */
  if (!cart.completed && returnedPaid(await searchParams)) {
    try {
      await completeCheckoutCart(fetchJson, cart.id);
    } catch {
      return (
        <main>
          <DocumentFrame
            title={CHECKOUT_DOCUMENT.title}
            form={CHECKOUT_DOCUMENT.form}
            revision={CHECKOUT_DOCUMENT.revision}
          >
            <p className="payment-error" role="alert">
              {PAYMENT_UNCONFIRMED_NOTICE}
            </p>
          </DocumentFrame>
        </main>
      );
    }
    cart = await getCheckoutCart(fetchJson, cartId);
  }
  /*
   * LD-04 P6a. Which handles are certificates comes from Medusa, not from a
   * constant declared here: `commerce/product-model.ts` is the one place the
   * three tiers are frozen, the backend seeds them from it, and a second copy
   * in this repository's other half is exactly the drift the merch sync spent
   * a row preventing. The cost is one Store API call on a page that already
   * makes two.
   */
  const certificateHandles = (await listTiers(fetchJson)).map((tier) => tier.handle);

  /*
   * LD-11 H2. **A paid cart never renders the payment form again.** Before the
   * payability check, because a paid cart is usually still a payable shape,
   * and before `PaymentForm` can mount, because mounting it asks Medusa for a
   * payment session and a new session is what cancels the PaymentIntent the
   * buyer has just paid. The cookie still names this cart until the next add
   * replaces it (`cart-actions.ts`), so a reload and Stripe's return arrive
   * here. The back-button usually does too — `no-store` keeps most browsers
   * from restoring the page from bfcache — but where one does restore it, the
   * restored form runs no effects and so asks for no new session.
   *
   * No ledger and no § 62²(2) lines above it: those describe an order about to
   * be placed, and this one has been.
   */
  if (cart.completed) {
    if (cart.email === null) {
      // Unreachable from this checkout, which sets the address before it
      // confirms. A cart completed without one came through the public
      // Store API directly, and the end state has no address to name.
      throw new Error("A completed cart carries no email address");
    }
    return (
      <main>
        <DocumentFrame
          title={CHECKOUT_DOCUMENT.title}
          form={CHECKOUT_DOCUMENT.form}
          revision={CHECKOUT_DOCUMENT.revision}
        >
          <OrderPlaced
            email={cart.email}
            giftRecipientEmail={cart.giftRecipientEmail}
            hasPostedGoods={cartNeedsAddress(cart.lines, certificateHandles)}
          />
        </DocumentFrame>
      </main>
    );
  }

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
  const items = cart.lines.filter((line) => !isSurchargeLine(line));

  return (
    <main>
      <DocumentFrame
        title={CHECKOUT_DOCUMENT.title}
        form={CHECKOUT_DOCUMENT.form}
        revision={CHECKOUT_DOCUMENT.revision}
      >
        <PaymentForm
          cartId={cart.id}
          stripePublishableKey={stripe.publishableKey}
          countries={region.countries ?? []}
          currencyCode={cart.currencyCode}
          initialTotal={cart.total}
          items={items.map((line) => ({
            label: lineLabel(line.title ?? line.variantId ?? "Cart item", line.variantTitle),
            value: lineValue(line.quantity, line.unitPrice, cart.currencyCode),
          }))}
          surcharge={
            surcharge === undefined
              ? undefined
              : {
                  label: surchargeLabel(surcharge),
                  value: surchargeValue(surcharge.unitPrice, cart.currencyCode),
                }
          }
          /* LD-04 P7. Decided from the cart's own lines, here rather than in
             the component, so the rule is one a test can call. */
          needsAddress={needsAddress}
          /* LD-04 P10. A cart with no certificate has no § 53(4) p 7¹ consent
             to give, so the box is not shown and the gate does not wait for
             it. Decided here for the same reason `needsAddress` is. */
          needsConsent={hasCertificate}
        >
          <FinePrint>{priceNotice(needsAddress)}</FinePrint>
          {/* § 62²(2): the § 54(1) p 4, 10 and 11 information, immediately
              before the order is transmitted. p 6, the total with taxes, is
              the ledger row above. */}
          {orderSummaryLines({
            hasCertificate,
            hasPostedGoods: needsAddress,
          }).map((line) => (
            <p key={line} className="notice">
              {line}
            </p>
          ))}
        </PaymentForm>
      </DocumentFrame>
    </main>
  );
}
