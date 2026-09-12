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

import { Baldrick } from "../../components/baldrick/Baldrick";
import { Button } from "../../components/document/Button";
import { DocumentFrame } from "../../components/document/DocumentFrame";
import { Ledger, LedgerRow } from "../../components/document/LedgerRow";
import { MerchForm } from "../../components/document/MerchForm";
import { RemoveLine } from "../../components/document/RemoveLine";
import { Rule } from "../../components/document/Rule";
import { TierTable } from "../../components/document/TierTable";
import {
  CART_CODE_NOTICES,
  CART_DOCUMENT,
  CART_EMPTY_NOTICE,
  CART_LABELS,
  CHECKOUT_LABEL,
  CODE_APPLY_LABEL,
  CODE_LABEL,
  CODE_REMOVE_LABEL,
  RETURN_LABEL,
  STORE_CLOSED_NOTICE,
} from "../../content/checkout";
import { getRuntimeConfig } from "../../config/runtime-config";
import { MERCH_APOLOGY, MERCH_HEADING, MERCH_TABLE_HEADINGS,
  MERCH_REMOVE_LABEL,
} from "../../content/merch";
import { addMerchToCart, applyCode, removeFromCart } from "../../lib/cart-actions";
import { createStoreFetchJson, listMerch, StoreApiError } from "../../lib/medusa-client";
import { goodsImagePath, goodsPath, merchRowData } from "../../lib/merch-rows";
import { formatMoney } from "../../lib/money";
import { getCart } from "../../lib/store-cart";
import { CART_ID_COOKIE, requireStoreClientConfig } from "../../lib/store-session";
import { surchargeLabel, surchargeValue } from "../../lib/surcharge";

/**
 * What one line reads as: the quantity and the unit price, never their
 * product. One of anything shows the price alone, because "1 ×" is noise.
 */
/**
 * What one line is called, for a title that is a joke.
 *
 * Medusa sets a line's `title` from the *product* — "Original Purchase
 * Receipt" — and puts the size in `variant_title`. On its own the ledger told
 * a buyer neither what the object was nor which size they had chosen, which is
 * the cart-side half of the same defect the upsell table had.
 *
 * The certificate's own lines have no size worth printing, so a variant title
 * that repeats the product title, or is Medusa's placeholder, is dropped.
 */
function lineLabel(title: string, variantTitle: string | null | undefined): string {
  const size = typeof variantTitle === "string" ? variantTitle.trim() : "";
  if (size.length === 0 || size === title || size === "Default variant") return title;
  return `${title} — ${size}`;
}

function lineValue(quantity: number, unitPrice: number, currencyCode: string): string {
  const price = formatMoney(unitPrice, currencyCode);
  return quantity === 1 ? price : `${String(quantity)} × ${price}`;
}

function CodeForm({ action }: { readonly action: (formData: FormData) => Promise<void> }) {
  return (
    <form action={action} className="code-form field baldrick-ask" data-analytics-event="bad_discount_accepted">
      <label htmlFor="cart-code">{CODE_LABEL}</label>
      <input id="cart-code" name="code" type="text" maxLength={64} required autoComplete="off" spellCheck={false} />
      <Button type="submit">{CODE_APPLY_LABEL}</Button>
    </form>
  );
}

function EmptyCart({ codeNotice }: { readonly codeNotice?: string }) {
  return (
    <main>
      <DocumentFrame title={CART_DOCUMENT.title} form={CART_DOCUMENT.form} revision={CART_DOCUMENT.revision}>
        <p className="notice">{CART_EMPTY_NOTICE}</p>
        {codeNotice === undefined ? null : <p className="notice payment-error">{codeNotice}</p>}
        <Button variant="secondary" href="/">
          {RETURN_LABEL}
        </Button>
      </DocumentFrame>
      {/* **After the document, inside `main`.** He arrives with hydration, so
          anything he sat above would move when he appeared -- and the thing
          above him here is the control that starts a purchase. Below the whole
          document he shifts nothing that matters. `tests/baldrick-reach.test.ts`
          holds the list of pages this appears on, and the longer list it does
          not. */}
      <Baldrick />
    </main>
  );
}

type CartSearchParams = Record<string, string | string[] | undefined>;

function codeNotice(parameters: CartSearchParams): string | undefined {
  const reason = parameters["code_reason"];
  return typeof reason === "string" && Object.hasOwn(CART_CODE_NOTICES, reason)
    ? CART_CODE_NOTICES[reason as keyof typeof CART_CODE_NOTICES]
    : undefined;
}

export default async function CartPage({
  searchParams = Promise.resolve({}),
}: { readonly searchParams?: Promise<CartSearchParams> } = {}) {
  await connection();
  if (!getRuntimeConfig().store.open) {
    return (
      <main>
        <DocumentFrame title={CART_DOCUMENT.title} form={CART_DOCUMENT.form} revision={CART_DOCUMENT.revision}>
          <p className="notice">{STORE_CLOSED_NOTICE}</p>
          <Button variant="secondary" href="/">{RETURN_LABEL}</Button>
        </DocumentFrame>
      </main>
    );
  }
  const notice = codeNotice(await searchParams);
  const cookieStore = await cookies();
  const cartId = cookieStore.get(CART_ID_COOKIE)?.value;

  if (cartId === undefined) return <EmptyCart codeNotice={notice} />;

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
    if (error instanceof StoreApiError && error.status === 404) return <EmptyCart codeNotice={notice} />;
    throw error;
  }

  const items = cart.items ?? [];
  if (items.length === 0) return <EmptyCart codeNotice={notice} />;

  // Refuse rather than omit. `getCheckoutCart` throws on this same missing
  // field from this same endpoint, and the page a buyer reads their total on
  // is the wrong one of the two to be silent: a summary with no total, and a
  // button leading to a checkout that will throw, is worse than an error that
  // says so. §23 requires the final price to be explicit.
  if (typeof cart.total !== "number") {
    throw new Error(`cart ${cart.id} came back with no total; refusing to show a summary without one`);
  }

  // §7's upsell, and it is fetched here rather than passed down because the
  // decision it offers belongs to this page. A store with no merch renders
  // nothing at all -- not a heading over an empty table, which would be a
  // question with no answers under it.
  const merch = merchRowData(await listMerch(fetchJson));

  // **Which lines a buyer may take out.** The upsell is already on this page,
  // so its variant ids are already known -- no second question to Medusa, and
  // no guess from a title. The certificate is deliberately not removable:
  // `isPayableCart` requires exactly one, so a cart stripped of it is one the
  // pay control refuses with nothing on the page saying why.
  const removable = new Set(merch.flatMap((row) => row.variants.map((variant) => variant.variantId)));
  const merchandise = items.filter((item) => item.variant_id !== null);
  const surcharges = items.filter((item) => item.variant_id === null);

  return (
    <main>
      <DocumentFrame title={CART_DOCUMENT.title} form={CART_DOCUMENT.form} revision={CART_DOCUMENT.revision}>
        <Ledger>
          {merchandise.map((item) => (
            <LedgerRow
              key={item.id}
              label={lineLabel(item.title ?? item.variant_id ?? "Cart item", item.variant_title)}
              value={lineValue(item.quantity, item.unit_price, cart.currency_code)}
              action={
                item.variant_id !== null && removable.has(item.variant_id) ? (
                  <RemoveLine
                    action={removeFromCart}
                    lineId={item.id}
                    title={item.title ?? item.variant_id}
                    label={MERCH_REMOVE_LABEL}
                  />
                ) : undefined
              }
            />
          ))}
          {surcharges.map((item) => {
            const label = surchargeLabel(item);
            const value = item.quantity === 1
              ? surchargeValue(item.unit_price, cart.currency_code)
              : `+${lineValue(item.quantity, item.unit_price, cart.currency_code)}`;
            return (
              <LedgerRow
                key={item.id}
                label={label}
                value={value}
                action={
                  <RemoveLine action={removeFromCart} lineId={item.id} title={label} label={CODE_REMOVE_LABEL} />
                }
              />
            );
          })}
          <LedgerRow label={CART_LABELS.total} value={formatMoney(cart.total, cart.currency_code)} />
        </Ledger>
        {notice === undefined ? null : <p className="notice payment-error">{notice}</p>}
        <CodeForm action={applyCode} />
        {/* The only route to `/checkout` a shopper reaches by clicking. */}
        <Button href="/checkout">{CHECKOUT_LABEL}</Button>
        {merch.length === 0 ? null : (
          <>
            <Rule />
            <h2 className="upsell-heading">{MERCH_HEADING}</h2>
            <TierTable
              headings={MERCH_TABLE_HEADINGS}
              rows={merch.map((row) => ({
                id: row.id,
                title: row.title,
                // §7's upsell said what a thing costs and never what it was.
                ...(row.kind === null ? {} : { subtitle: row.kind }),
                // **This row declined to link, and the page it declined to
                // link to now exists.** The reasoning was sound when written --
                // a link to nothing is worse than plain text -- and the
                // operator reported the consequence: four joke titles, no
                // picture, nothing to click.
                href: goodsPath(row.handle),
                thumbnail: goodsImagePath(row.handle),
                description: row.sizes,
                value: row.value,
                price: row.price,
                variantId: row.variants[0]?.variantId ?? "",
                action: <MerchForm action={addMerchToCart} title={row.title} variants={row.variants} storeOpen />,
              }))}
            />
            {/* Beneath the table, and the whole of the apology. */}
            <p className="notice">{MERCH_APOLOGY}</p>
          </>
        )}
      </DocumentFrame>
      {/* Both of this file's returns carry him, and the empty one is not an
          afterthought: a cart with nothing in it is where somebody is most
          likely to have a question, and where a shop with one product has the
          least to say. */}
      <Baldrick />
    </main>
  );
}
