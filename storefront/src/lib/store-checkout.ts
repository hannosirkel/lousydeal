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

import { GIFT_METADATA } from "./gift";
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
  /**
   * The same lines, with what each one is.
   *
   * LD-04 P6a: the cart may now hold a certificate and a mug, so "how many
   * lines" stopped being enough to decide whether the cart is payable. A line
   * is a certificate when its `product_handle` is one the tier model declares;
   * `null` where Medusa gave none, which its own line item permits.
   */
  readonly lines: ReadonlyArray<{ readonly quantity: number; readonly handle: string | null }>;
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

/** A line's product handle, or `null` — Medusa's line item permits none. */
function lineHandle(item: unknown): string | null {
  const handle = (item as { readonly product_handle?: unknown } | null)?.product_handle;
  return typeof handle === "string" && handle.length > 0 ? handle : null;
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
  const items = Array.isArray(cart.items) ? cart.items : [];
  const quantities = items.map((item) => lineQuantity(item) ?? Number.NaN);
  const lines = items.map((item) => ({
    quantity: lineQuantity(item) ?? Number.NaN,
    handle: lineHandle(item),
  }));

  return { id: cart.id, currencyCode: cart.currency_code, total: cart.total, quantities, lines };
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

/**
 * The metadata keys the backend reads an inscription back out of.
 *
 * The same two strings as `backend/src/modules/deal/inscription.ts`'s
 * `DEAL_INSCRIPTION_METADATA`, written again because there is no package
 * shared between the workspaces. Prefixed, because cart metadata is a shared
 * bag: Medusa writes to it, a payment provider may, and an unprefixed
 * `dedication` is a name somebody else can reasonably take.
 */
export const INSCRIPTION_METADATA = {
  displayName: "lousydeal_display_name",
  dedication: "lousydeal_dedication",
} as const;

interface StoreCartMetadataResponse {
  readonly cart?: { readonly metadata?: unknown };
}

/**
 * Writes §6's four gift fields onto the cart, beside the inscription.
 *
 * **One call with the inscription, not two.** Medusa replaces the whole
 * `metadata` object on each `POST /store/carts/:id`, so a second call would
 * erase the first's keys — the inscription would arrive at issuance as an
 * absence rather than as what the buyer typed. That is why this takes both
 * and `setCartInscription` is gone: two writers of one field is the bug, not
 * the shape.
 *
 * **Sends what the buyer typed, not what this page showed them.** The preview
 * beside each field runs the render-side filter so a buyer sees what will
 * appear before paying, but the value that travels is the raw one: the pass
 * that decides what is *stored* runs in the backend, at issuance, because this
 * endpoint is public and accepts arbitrary metadata
 * (`carts/validators.js:11`). Filtering here as well would make the two look
 * agreed when only one of them is load-bearing.
 *
 * **A blank field sends `null`, not `""`.** §5 wants one no-inscription state
 * and the certificate has one; an empty string would be a second, arriving at
 * the backend as a value to be trimmed away rather than as an absence.
 *
 * **A closed gift block sends four nulls.** Not four absent keys, and not four
 * empty strings: `readGift` decides a gift on whether a usable address
 * survived, and `null` is the state that says "no gift" without needing to be
 * trimmed away first.
 */
export async function setCartInscriptionAndGift(
  fetchJson: FetchJson,
  cartId: string,
  fields: {
    readonly displayName: string;
    readonly dedication: string;
    readonly gift: {
      readonly recipientName: string;
      readonly recipientEmail: string;
      readonly senderName: string;
      readonly message: string;
    } | null;
  },
): Promise<void> {
  const value = (raw: string): string | null => {
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  };
  const gift = fields.gift;

  await fetchJson<StoreCartMetadataResponse>(`/store/carts/${encodeURIComponent(cartId)}`, {
    method: "POST",
    body: JSON.stringify({
      metadata: {
        [INSCRIPTION_METADATA.displayName]: value(fields.displayName),
        [INSCRIPTION_METADATA.dedication]: value(fields.dedication),
        [GIFT_METADATA.recipientName]: gift === null ? null : value(gift.recipientName),
        [GIFT_METADATA.recipientEmail]: gift === null ? null : value(gift.recipientEmail),
        [GIFT_METADATA.senderName]: gift === null ? null : value(gift.senderName),
        [GIFT_METADATA.message]: gift === null ? null : value(gift.message),
      },
    }),
  });
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
/**
 * Puts the whole postal address on the cart.
 *
 * **A superset of `setCartCountry`, not a replacement for it.** The country is
 * still written on its own for a certificate-only cart, where there is nothing
 * to post and the country exists to resolve a tax region. This is what runs
 * when there is a parcel.
 *
 * Both addresses are written, as `setCartCountry` does: Medusa resolves tax
 * from the shipping address and Stripe reconciles against the billing one, and
 * a cart carrying two different countries is a cart whose total nobody can
 * explain.
 */
export async function setCartShippingAddress(
  fetchJson: FetchJson,
  cartId: string,
  address: {
    readonly name: string;
    readonly line1: string;
    readonly city: string;
    readonly postcode: string;
    readonly province: string;
    readonly countryCode: string;
  },
): Promise<CartCountry> {
  const body = {
    // Medusa splits a name in two and this shop collects one. Putting the
    // whole of it in `first_name` keeps it intact for a courier's label rather
    // than guessing where a name divides -- a guess that is wrong for most of
    // the world.
    first_name: address.name,
    address_1: address.line1,
    city: address.city,
    postal_code: address.postcode,
    country_code: address.countryCode,
    ...(address.province.trim().length === 0 ? {} : { province: address.province }),
  };

  const { cart } = await fetchJson<StoreCartAddressResponse>(`/store/carts/${encodeURIComponent(cartId)}`, {
    method: "POST",
    body: JSON.stringify({ shipping_address: body, billing_address: body }),
  });

  if (typeof cart?.shipping_address?.country_code !== "string" || cart.shipping_address.country_code.length === 0) {
    throw new Error(`Medusa did not return a shipping-address country for cart ${cartId}`);
  }
  return {
    countryCode: cart.shipping_address.country_code,
    taxTotal: typeof cart.tax_total === "number" ? cart.tax_total : undefined,
  };
}

/** One shipping option Medusa offers this cart, with the price our provider calculated. */
export interface CartShippingOption {
  readonly id: string;
  readonly name: string;
  /**
   * Major units, VAT-inclusive — and **`null` for a calculated option, which
   * is the only kind this shop has.**
   *
   * Medusa's store route runs `listShippingOptionsForCartWorkflow`, not the
   * `…WithPricing` variant, so it never asks a provider what a calculated
   * option costs: the response carries `calculated_price: null` and no
   * `amount` at all. The price exists only once the method is attached, which
   * is what `setCartShippingMethod` returns.
   *
   * This field was `number` and an option lacking one was dropped, so every
   * cart holding a parcel listed **zero** shipping options and every buyer was
   * told "postage could not be quoted for this address". Measured against the
   * live test deployment on 2026-09-10; the endpoint answers 200 with the
   * option present and unpriced.
   */
  readonly amount: number | null;
}

interface StoreShippingOptionsResponse {
  readonly shipping_options?: ReadonlyArray<{
    readonly id?: unknown;
    readonly name?: unknown;
    readonly amount?: unknown;
    readonly calculated_price?: { readonly calculated_amount?: unknown } | null;
  }>;
}

/**
 * What it would cost to post this cart, asked of Medusa rather than of Printful.
 *
 * **Medusa is the one that calls Printful**, through P7a's provider, when this
 * endpoint calculates a price. Going straight to Printful from the browser
 * would need the token in a browser, and would produce a number the cart does
 * not know about — which is the same as not having a price at all.
 *
 * **An option with no price is dropped.** `calculatePrice` throws rather than
 * inventing a figure, and Medusa reports that as an option it could not price.
 * An unpriced option offered to a buyer is a control that cannot be used.
 */
export async function listCartShippingOptions(
  fetchJson: FetchJson,
  cartId: string,
): Promise<readonly CartShippingOption[]> {
  const { shipping_options } = await fetchJson<StoreShippingOptionsResponse>(
    `/store/shipping-options?cart_id=${encodeURIComponent(cartId)}`,
  );

  return (shipping_options ?? []).flatMap((option): CartShippingOption[] => {
    const id = typeof option.id === "string" && option.id.length > 0 ? option.id : null;
    const raw = option.calculated_price?.calculated_amount ?? option.amount;
    const amount = typeof raw === "number" && Number.isFinite(raw) ? raw : null;
    // **Only the id is required.** A price is what a *flat* option carries
    // here; a calculated one has none until it is attached, and dropping it
    // for that left the checkout with nothing to offer. The id is what
    // `setCartShippingMethod` needs, and its answer is where the real figure
    // comes from.
    if (id === null) return [];
    return [{ id, name: typeof option.name === "string" && option.name.length > 0 ? option.name : id, amount }];
  });
}

interface StoreShippingMethodResponse {
  readonly cart?: {
    readonly total?: unknown;
    readonly shipping_methods?: ReadonlyArray<{ readonly shipping_option_id?: unknown; readonly amount?: unknown }>;
  };
}

/**
 * Puts a shipping method on the cart, so Stripe collects the postage.
 *
 * The point of the whole shipping half: until this runs, the cart's total is
 * the goods alone and a completed order would have taken the buyer's money
 * without the postage in it — which the merchant would then pay.
 *
 * Reads back rather than assuming: a method Medusa did not attach is a method
 * that is not being charged for.
 */
export async function setCartShippingMethod(
  fetchJson: FetchJson,
  cartId: string,
  optionId: string,
): Promise<{ readonly total: number; readonly shippingAmount: number }> {
  const { cart } = await fetchJson<StoreShippingMethodResponse>(
    `/store/carts/${encodeURIComponent(cartId)}/shipping-methods`,
    { method: "POST", body: JSON.stringify({ option_id: optionId }) },
  );

  const attached = (cart?.shipping_methods ?? []).find((method) => method.shipping_option_id === optionId);
  if (attached === undefined) {
    throw new Error(`Medusa did not attach shipping option ${optionId} to cart ${cartId}`);
  }
  if (typeof cart?.total !== "number") {
    throw new Error(`Medusa returned no total for cart ${cartId} after adding shipping`);
  }
  return {
    total: cart.total,
    shippingAmount: typeof attached.amount === "number" ? attached.amount : 0,
  };
}

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
