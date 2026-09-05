/**
 * The home page: one purchase order, per `docs/current/brand.md` §4.
 *
 * `await connection()` is `src/app/layout.tsx`'s pattern, repeated here
 * because `getRuntimeConfig()` must run inside a dynamically rendered
 * request, not once at build time -- see that file's comment for why.
 *
 * The "add to cart" form actions are Server Actions defined in this Server
 * Component's own body, not client code: submitting posts to the server, which
 * reuses the cart named by `CART_ID_COOKIE` when the cookie names one, creates
 * a cart only when it does not, adds the one line, and redirects to `/cart`.
 * No client-side JavaScript is required for this to work, and the visual layer
 * added none.
 *
 * **The offer block and the table are the same three tiers.** The block at the
 * top is the cheapest of them, not a fourth thing written by hand: every
 * figure on this page is formatted from what the Store API returned, so there
 * is no second copy of a price to drift.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { DocumentFrame } from "../components/document/DocumentFrame";
import { FinePrint } from "../components/document/FinePrint";
import { Ledger, LedgerRow } from "../components/document/LedgerRow";
import { OrderForm } from "../components/document/OrderForm";
import { Rule } from "../components/document/Rule";
import { TierTable, type TierRow } from "../components/document/TierTable";
import { getRuntimeConfig } from "../config/runtime-config";
import {
  ACQUIRE_LABEL,
  ACQUIRE_LABEL_PREFIX,
  HOME_DOCUMENT,
  NO_OFFER_NOTICE,
  OFFER_LABELS,
  OFFER_RETURN,
  TERMS_OF_OFFER,
  TERMS_OF_OFFER_TITLE,
} from "../content/home";
import { createStoreFetchJson, getDefaultRegion, listTiers, type StoreClientConfig } from "../lib/medusa-client";
import { formatMoney } from "../lib/money";
import { addLineToCart, createCart } from "../lib/store-cart";
import { cheapest, NO_VALUE, tierRowData } from "../lib/tier-rows";

/** Also read by `src/app/cart/page.tsx`, which looks the cart up by this id. */
export const CART_ID_COOKIE = "lousydeal_cart_id";

function requireStoreClientConfig(): StoreClientConfig {
  const { medusa } = getRuntimeConfig();
  if (medusa.backendUrl === null || medusa.publishableKey === null) {
    throw new Error("MEDUSA_BACKEND_URL and MEDUSA_PUBLISHABLE_API_KEY must both be set to render the storefront");
  }
  return { backendUrl: medusa.backendUrl, publishableKey: medusa.publishableKey };
}

export default async function HomePage() {
  await connection();
  const fetchJson = createStoreFetchJson(requireStoreClientConfig());
  const tiers = await listTiers(fetchJson);

  async function addToCart(formData: FormData): Promise<void> {
    "use server";
    const variantId = formData.get("variantId");
    if (typeof variantId !== "string") {
      throw new Error("addToCart: missing variantId");
    }

    const actionFetchJson = createStoreFetchJson(requireStoreClientConfig());
    const cookieStore = await cookies();
    const existingCartId = cookieStore.get(CART_ID_COOKIE)?.value;
    const cart =
      existingCartId === undefined
        ? await createCart(actionFetchJson, (await getDefaultRegion(actionFetchJson)).id)
        : { id: existingCartId };
    await addLineToCart(actionFetchJson, cart.id, variantId, 1);

    cookieStore.set(CART_ID_COOKIE, cart.id, { httpOnly: true, sameSite: "lax", path: "/", secure: true });
    redirect("/cart");
  }

  const offer = cheapest(tiers);

  // Nothing offered is a state this page can reach -- `listTiers` drops any
  // tier the API prices with no `calculated_price` -- and a headed table with
  // no rows above terms describing a product nobody can buy is a rendering
  // artefact, not a document. `brand.md` §4's empty-document pattern applies.
  if (offer === undefined) {
    return (
      <main>
        <DocumentFrame title={HOME_DOCUMENT.title} form={HOME_DOCUMENT.form} revision={HOME_DOCUMENT.revision}>
          <p>{NO_OFFER_NOTICE}</p>
        </DocumentFrame>
      </main>
    );
  }

  const rows: TierRow[] = tiers.map((tier) => {
    const data = tierRowData(tier);
    return {
      ...data,
      action: (
        <OrderForm action={addToCart} variantId={data.variantId} label={ACQUIRE_LABEL} forTier={data.title} />
      ),
    };
  });

  return (
    <main>
      <DocumentFrame title={HOME_DOCUMENT.title} form={HOME_DOCUMENT.form} revision={HOME_DOCUMENT.revision}>
        <Ledger>
          <LedgerRow label={OFFER_LABELS.item} value={offer.title} />
          <LedgerRow label={OFFER_LABELS.price} value={formatMoney(offer.amount, offer.currencyCode)} />
          <LedgerRow label={OFFER_LABELS.value} value={formatMoney(NO_VALUE, offer.currencyCode)} />
          <LedgerRow label={OFFER_LABELS.return} value={OFFER_RETURN} tone="stamp" />
        </Ledger>
        {/* One template literal, not two children with a space between them:
            React renders `{a} {b}` as separate text nodes, and the accessible
            name comes out with the price run onto the label with no space.
            Measured. */}
        <OrderForm
          action={addToCart}
          variantId={offer.variantId}
          label={`${ACQUIRE_LABEL_PREFIX} ${formatMoney(offer.amount, offer.currencyCode)}`}
        />

        <Rule />
        <TierTable rows={rows} />

        <Rule />
        <h2>{TERMS_OF_OFFER_TITLE}</h2>
        {TERMS_OF_OFFER.map((line) => (
          <FinePrint key={line}>{line}</FinePrint>
        ))}
      </DocumentFrame>
    </main>
  );
}
