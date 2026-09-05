/**
 * The cart, as an order summary — `docs/current/brand.md` §4.
 *
 * Looked up by the id the shared `addToCart` action left in `CART_ID_COOKIE`.
 *
 * **No figure on this page is computed.** The total is Medusa's own, and each
 * line shows its quantity beside its unit price rather than the product of
 * them. `unit_price × quantity` looks harmless and is not: Medusa merges a
 * repeat add of the same variant into one line and sums the quantity
 * (`@medusajs/core-flows/dist/cart/steps/get-line-item-actions.js:57-61`), so
 * that product silently replaced "three at five dollars" with one figure and
 * showed no quantity at all. It is also pre-discount and pre-tax --
 * `defaultStoreCartFields` carries `items.adjustments` and `items.tax_lines`
 * but no `items.total` -- so it would stop adding up to the total beside it
 * the day anything is discounted.
 */

import { cookies } from "next/headers";
import { connection } from "next/server";

import { Button } from "../../components/document/Button";
import { DocumentFrame } from "../../components/document/DocumentFrame";
import { Ledger, LedgerRow } from "../../components/document/LedgerRow";
import { CART_DOCUMENT, CART_EMPTY_NOTICE, CART_LABELS, CHECKOUT_LABEL, RETURN_LABEL } from "../../content/checkout";
import { createStoreFetchJson, StoreApiError } from "../../lib/medusa-client";
import { formatMoney } from "../../lib/money";
import { getCart } from "../../lib/store-cart";
import { CART_ID_COOKIE, requireStoreClientConfig } from "../../lib/store-session";

/**
 * What one line reads as: the quantity and the unit price, never their
 * product. One of anything shows the price alone, because "1 ×" is noise.
 */
function lineValue(quantity: number, unitPrice: number, currencyCode: string): string {
  const price = formatMoney(unitPrice, currencyCode);
  return quantity === 1 ? price : `${String(quantity)} × ${price}`;
}

function EmptyCart() {
  return (
    <main>
      <DocumentFrame title={CART_DOCUMENT.title} form={CART_DOCUMENT.form} revision={CART_DOCUMENT.revision}>
        <p className="notice">{CART_EMPTY_NOTICE}</p>
        <Button variant="secondary" href="/">
          {RETURN_LABEL}
        </Button>
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

  // A cookie naming a cart the backend no longer has (expired, or from a reset
  // backend) is not a transient error: it is the same "no cart" state as no
  // cookie at all, and gets the same document.
  //
  // **The cookie is not cleared here, because it cannot be.** A Server
  // Component may not write cookies -- Next throws "Cookies can only be
  // modified in a Server Action or Route Handler" -- and the version of this
  // file that tried turned a stale cookie into a PROCESSING ERROR on every
  // subsequent visit, with no way out but clearing cookies by hand. Leaving it
  // costs one 404 per visit and always renders the right document.
  let cart;
  try {
    cart = await getCart(fetchJson, cartId);
  } catch (error) {
    if (error instanceof StoreApiError && error.status === 404) return <EmptyCart />;
    throw error;
  }

  const items = cart.items ?? [];
  if (items.length === 0) return <EmptyCart />;

  // Refuse rather than omit. `getCheckoutCart` throws on this same missing
  // field from this same endpoint, and the page a buyer reads their total on
  // is the wrong one of the two to be silent: a summary with no total, and a
  // button leading to a checkout that will throw, is worse than an error that
  // says so. §23 requires the final price to be explicit.
  if (typeof cart.total !== "number") {
    throw new Error(`cart ${cart.id} came back with no total; refusing to show a summary without one`);
  }

  return (
    <main>
      <DocumentFrame title={CART_DOCUMENT.title} form={CART_DOCUMENT.form} revision={CART_DOCUMENT.revision}>
        <Ledger>
          {items.map((item) => (
            <LedgerRow
              key={item.id}
              label={item.title ?? item.variant_id}
              value={lineValue(item.quantity, item.unit_price, cart.currency_code)}
            />
          ))}
          <LedgerRow label={CART_LABELS.total} value={formatMoney(cart.total, cart.currency_code)} />
        </Ledger>
        {/* The only route to `/checkout` a shopper reaches by clicking. */}
        <Button href="/checkout">{CHECKOUT_LABEL}</Button>
      </DocumentFrame>
    </main>
  );
}
