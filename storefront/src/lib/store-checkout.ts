/**
 * The one figure the checkout page must show before payment: the cart's own
 * total, read from the Store API rather than recomputed here. Also the one
 * mutation that closes the T10 address gap: setting the customer's country so
 * Medusa resolves a tax region (`setCartCountry`, below).
 *
 * "The final price is explicit before payment" (T10) is a disclosure
 * requirement, not a pricing one -- no row in this slice adds shipping or a
 * VAT breakdown, so the one total Medusa already returns on a cart is the
 * whole of what a buyer needs to see, with no decomposition to get right or
 * wrong.
 *
 * Reads `/store/carts/:id` directly rather than through `getCart` in
 * `./store-cart.js` (T9): that function's `StoreCartResponse` type does not
 * declare `total` (T9 never needed it), and `total` is nonetheless already on
 * the wire -- `node_modules/@medusajs/medusa/dist/api/store/carts/query-config.js`'s
 * `defaultStoreCartFields` includes `total` among the default fields, no
 * `fields` override required. Declaring a second, checkout-scoped view of the
 * same endpoint's response is this file's own narrow slice, matching how
 * `medusa-client.ts` and `store-cart.ts` already each declare their own
 * independent view of overlapping Medusa shapes rather than sharing one.
 */

import type { FetchJson } from "./medusa-client";

export interface CheckoutCart {
  readonly id: string;
  readonly currencyCode: string;
  /** The cart's total, exactly as the Store API returns it -- not converted, not recomputed. */
  readonly total: number;
  /**
   * One quantity per line, in the order the API returned them. C3a.
   *
   * Quantities and not the lines: the only question the checkout asks of them
   * is `isSingleCertificate`, and a view carrying titles, prices and variant
   * ids would invite a second copy of the cart page's rendering to grow here.
   *
   * An empty array for a cart with no lines, which is a state the page has its
   * own document for -- not an error this function refuses on, because a cart
   * legitimately has no lines between being created and being added to.
   */
  readonly quantities: readonly number[];
}

interface StoreCartTotalResponse {
  readonly cart?: {
    readonly id?: unknown;
    readonly currency_code?: unknown;
    readonly total?: unknown;
    readonly items?: unknown;
  };
}

/** A line's quantity, or `null` if the response's line is not one this can read. */
function lineQuantity(item: unknown): number | null {
  if (typeof item !== "object" || item === null) return null;
  const quantity = (item as { quantity?: unknown }).quantity;
  return typeof quantity === "number" && Number.isFinite(quantity) ? quantity : null;
}

/** Reads the cart's own total and its line quantities. Refuses rather than guesses if the API answers with anything less than all three of id, currency and total. */
export async function getCheckoutCart(fetchJson: FetchJson, cartId: string): Promise<CheckoutCart> {
  const { cart } = await fetchJson<StoreCartTotalResponse>(`/store/carts/${encodeURIComponent(cartId)}`);
  if (
    typeof cart?.id !== "string" ||
    cart.id.length === 0 ||
    typeof cart.currency_code !== "string" ||
    typeof cart.total !== "number"
  ) {
    throw new Error(`Medusa returned an incomplete cart for ${cartId}`);
  }

  // A line whose quantity is unreadable is kept as `NaN` rather than dropped.
  // Dropping it would turn a two-line cart into a one-line cart and let
  // `isSingleCertificate` pass something it should refuse -- the failure this
  // whole path exists to prevent, arrived at by being tidy.
  const quantities = Array.isArray(cart.items) ? cart.items.map((item) => lineQuantity(item) ?? Number.NaN) : [];

  return { id: cart.id, currencyCode: cart.currency_code, total: cart.total, quantities };
}

interface StoreCartEmailResponse {
  readonly cart?: { readonly email?: unknown };
}

/**
 * Puts the buyer's email address on the cart, from where Medusa carries it onto
 * the order.
 *
 * **This is the address the § 55(1)-(2) confirmation has to go to**, and until
 * C3b there was none: nothing set `cart.email`, and Medusa tolerates that all
 * the way through -- `complete-cart.js:446,505` passes `cart.email` and
 * `cart.email || null` to the order without requiring either. An order with no
 * address cannot be confirmed on a durable medium, which is the third condition
 * VOS s 53(4) p 7-1 needs and the reason nothing here excludes the 14-day right.
 *
 * **Read back, not assumed.** Medusa validates the address itself
 * (`email: z.string().email().nullish()`, `carts/validators.js:18`) and answers
 * 400 for one it refuses, which `fetchJson` turns into a throw -- so a bad
 * address fails here, before the card is charged. The read-back is what
 * separates "Medusa accepted it" from "the request did not error".
 *
 * Setting it does not disturb an existing Stripe session: the payment
 * collection is refreshed on every cart update, but the session is dropped only
 * when the cart's own total changes or its currency differs
 * (`refresh-payment-collection.js:88-93`, cited in full on `setCartCountry`
 * below). An email address changes neither.
 */
export async function setCartEmail(fetchJson: FetchJson, cartId: string, email: string): Promise<string> {
  const { cart } = await fetchJson<StoreCartEmailResponse>(`/store/carts/${encodeURIComponent(cartId)}`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  if (typeof cart?.email !== "string" || cart.email.length === 0) {
    throw new Error(`Medusa did not return an email address for cart ${cartId}`);
  }
  return cart.email;
}

export interface CartCountry {
  readonly countryCode: string;
  /**
   * The cart's `tax_total` as recomputed for this country, read back from the
   * same response when Medusa returns one -- not derived here. `undefined`
   * when the response carries no numeric `tax_total`: nothing in this row
   * reads the value (`PaymentForm.tsx` discards `setCartCountry`'s return),
   * so its absence is surfaced rather than treated as the failure a missing
   * `countryCode` is -- see `setCartCountry`'s own guard, below.
   */
  readonly taxTotal: number | undefined;
}

interface StoreCartAddressResponse {
  readonly cart?: {
    readonly shipping_address?: { readonly country_code?: unknown } | null;
    readonly tax_total?: unknown;
  };
}

/**
 * Sets the customer's country on the cart, on both `shipping_address` and
 * `billing_address`. Only the shipping address drives tax -- Medusa reads
 * `shippingAddress ?? orderOrCart.shipping_address`
 * (`node_modules/@medusajs/core-flows/dist/tax/steps/get-item-tax-lines.js:7`,
 * cited in full under T10 in `docs/working/ld-01-foundation.md`, which also
 * records why a shipping-address field carries the country for a product that
 * ships nowhere) -- but billing is set too, since that field is what the
 * order record is actually for on a sale with no shipment, and an order
 * carrying a shipping address alone for a certificate is worse to read later.
 *
 * The two stay in the same case here because both are written from a single
 * already-canonical value -- the country selected from the region's own list
 * (`PaymentForm.tsx`'s `<select>`), passed once as `countryCode` and sent to
 * both fields below -- not because Medusa reconciles them for us. It does
 * not: `prepareCartToUpdateStep` (`update-cart.js:18-39`) rewrites only
 * `shipping_address.country_code`, to the matched region row's own `iso_2`
 * (`update-cart.js:35-38`); `billing_address` is spread from the request body
 * untouched (`update-cart.js:19-24`), no lookup, no normalization. A caller
 * that sent the two fields in different cases would persist them that way.
 *
 * `POST /store/carts/:id` recomputes tax synchronously when the shipping
 * country changes (`update-cart.js`'s `taxRelevantAddressChanged` step forces
 * `refreshCartItemsWorkflow` to run `updateTaxLinesWorkflow` before this
 * responds), so the `tax_total` returned here already reflects the country
 * just set, not a stale figure from before it.
 *
 * The cart's payment collection is refreshed on every cart update, but its
 * Stripe session is only deleted when the cart's own total changes, or when
 * the amounts compare equal but the currency differs
 * (`node_modules/@medusajs/core-flows/dist/cart/workflows/refresh-payment-collection.js:88-93`) --
 * decision `009`'s tax-inclusive pricing keeps that total fixed to the
 * precision Medusa stores it at, so calling this after a payment session
 * already exists does not invalidate it. "Fixed" is not a mathematical
 * identity: the round-trip through a 24% tax rate leaves a ~2.4e-21 residual
 * on every tier, invisible only because every `BigNumber` is rounded to
 * `toPrecision(20)` before it is compared or persisted
 * (`@medusajs/utils/dist/totals/big-number.js:26`).
 */
export async function setCartCountry(fetchJson: FetchJson, cartId: string, countryCode: string): Promise<CartCountry> {
  const { cart } = await fetchJson<StoreCartAddressResponse>(`/store/carts/${encodeURIComponent(cartId)}`, {
    method: "POST",
    body: JSON.stringify({
      shipping_address: { country_code: countryCode },
      billing_address: { country_code: countryCode },
    }),
  });
  if (typeof cart?.shipping_address?.country_code !== "string" || cart.shipping_address.country_code.length === 0) {
    throw new Error(`Medusa did not return a shipping-address country for cart ${cartId}`);
  }
  // `tax_total` is read back, not guarded on: nothing downstream consumes it
  // (see `CartCountry.taxTotal`'s own comment), so a response that omits it
  // is not treated as the failure a missing country would be.
  return {
    countryCode: cart.shipping_address.country_code,
    taxTotal: typeof cart.tax_total === "number" ? cart.tax_total : undefined,
  };
}
