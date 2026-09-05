/**
 * The cart, as an order summary — `docs/current/brand.md` §4.
 *
 * Looked up by the id the shared `addToCart` action left in `CART_ID_COOKIE`.
 *
 * **The total is the cart's own.** Medusa returns one; summing the lines here
 * would be a second computation of a figure the API already answers with, and
 * the two would differ the day anything is discounted or taxed differently
 * from what this file assumes.
 */

import { cookies } from "next/headers";
import { connection } from "next/server";

import { Button } from "../../components/document/Button";
import { DocumentFrame } from "../../components/document/DocumentFrame";
import { Ledger, LedgerRow } from "../../components/document/LedgerRow";
import { CART_DOCUMENT, CART_EMPTY_NOTICE, CART_LABELS, CHECKOUT_LABEL } from "../../content/checkout";
import { createStoreFetchJson, StoreApiError } from "../../lib/medusa-client";
import { formatMoney } from "../../lib/money";
import { getCart } from "../../lib/store-cart";
import { CART_ID_COOKIE, requireStoreClientConfig } from "../../lib/store-session";

function EmptyCart() {
  return (
    <main>
      <DocumentFrame title={CART_DOCUMENT.title} form={CART_DOCUMENT.form} revision={CART_DOCUMENT.revision}>
        <p>{CART_EMPTY_NOTICE}</p>
      </DocumentFrame>
    </main>
  );
}

export default async function CartPage() {
  await connection();
  const cookieStore = await cookies();
  const cartId = cookieStore.get(CART_ID_COOKIE)?.value;

  if (cartId === undefined) return <EmptyCart />;

  const fetchJson = createStoreFetchJson(requireStoreClientConfig());

  // A cookie naming a cart the backend no longer has (expired, or from a
  // reset backend) is not a transient error: it is the same "no cart" state
  // as no cookie at all, so it gets the same response and the stale cookie
  // is cleared rather than left in place, repeatedly failing every request
  // for the rest of the session.
  let cart;
  try {
    cart = await getCart(fetchJson, cartId);
  } catch (error) {
    if (error instanceof StoreApiError && error.status === 404) {
      cookieStore.delete(CART_ID_COOKIE);
      return <EmptyCart />;
    }
    throw error;
  }

  const items = cart.items ?? [];
  if (items.length === 0) return <EmptyCart />;

  return (
    <main>
      <DocumentFrame title={CART_DOCUMENT.title} form={CART_DOCUMENT.form} revision={CART_DOCUMENT.revision}>
        <Ledger>
          {items.map((item) => (
            <LedgerRow
              key={item.id}
              label={item.title ?? item.variant_id}
              value={formatMoney(item.unit_price * item.quantity, cart.currency_code)}
            />
          ))}
          {/* Rendered only when the API answered with one. Medusa's default
              store-cart fields include `total`, so this is present in
              practice; the branch exists because the type says it may not be
              and a missing figure must not become a computed one. */}
          {typeof cart.total === "number" ? (
            <LedgerRow label={CART_LABELS.total} value={formatMoney(cart.total, cart.currency_code)} />
          ) : null}
        </Ledger>
        {/* The only route to `/checkout` a shopper reaches by clicking. */}
        <Button href="/checkout">{CHECKOUT_LABEL}</Button>
      </DocumentFrame>
    </main>
  );
}
