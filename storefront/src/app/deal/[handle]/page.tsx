/**
 * One tier's own quotation, per `docs/current/brand.md` §4.
 *
 * `await connection()` is `src/app/layout.tsx`'s pattern, repeated because
 * `getRuntimeConfig()` must run inside a dynamically rendered request rather
 * than once at build time — see that file's comment.
 *
 * What this route decides is in `src/lib/tier-rows.ts` and what it renders is
 * in `Quotation`; both because a route awaiting `connection()` and `cookies()`
 * cannot be reached from a test.
 *
 * **The `addToCart` action is a second copy of the home page's, and that is a
 * known duplication rather than a considered one.** The two bodies are
 * identical — the same cookie name, the same four cookie attributes, the same
 * reuse-or-create, the same quantity, the same redirect — and nothing keeps
 * them in step. A Server Action used by two routes belongs in its own
 * `"use server"` module, which is Next's documented factoring; the objection
 * that it would couple two routes does not survive the fact that this file
 * already imports `CART_ID_COOKIE` from the home page's route module, as
 * `cart/page.tsx` and `checkout/page.tsx` do. V6 owns those files and shares
 * it; this row does not widen into them.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { DocumentFrame } from "../../../components/document/DocumentFrame";
import { OrderForm } from "../../../components/document/OrderForm";
import { Quotation } from "../../../components/document/Quotation";
import { getRuntimeConfig } from "../../../config/runtime-config";
import { DEAL_DOCUMENT } from "../../../content/deal";
import { ACQUIRE_LABEL_PREFIX } from "../../../content/home";
import { createStoreFetchJson, getDefaultRegion, listTiers, type StoreClientConfig } from "../../../lib/medusa-client";
import { formatMoney } from "../../../lib/money";
import { addLineToCart, createCart } from "../../../lib/store-cart";
import { NO_VALUE, requireTier, tierPath, upgrades } from "../../../lib/tier-rows";
import { CART_ID_COOKIE } from "../../page";

function requireStoreClientConfig(): StoreClientConfig {
  const { medusa } = getRuntimeConfig();
  if (medusa.backendUrl === null || medusa.publishableKey === null) {
    throw new Error("MEDUSA_BACKEND_URL and MEDUSA_PUBLISHABLE_API_KEY must both be set to render a quotation");
  }
  return { backendUrl: medusa.backendUrl, publishableKey: medusa.publishableKey };
}

export default async function DealPage({ params }: { readonly params: Promise<{ readonly handle: string }> }) {
  await connection();
  const { handle } = await params;
  const fetchJson = createStoreFetchJson(requireStoreClientConfig());
  const tiers = await listTiers(fetchJson);
  const tier = requireTier(tiers, handle);

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

  return (
    <main>
      <DocumentFrame title={DEAL_DOCUMENT.title} form={DEAL_DOCUMENT.form} revision={DEAL_DOCUMENT.revision}>
        <Quotation
          title={tier.title}
          price={formatMoney(tier.amount, tier.currencyCode)}
          value={formatMoney(NO_VALUE, tier.currencyCode)}
          action={
            <OrderForm
              action={addToCart}
              variantId={tier.variantId}
              label={`${ACQUIRE_LABEL_PREFIX} ${formatMoney(tier.amount, tier.currencyCode)}`}
            />
          }
          upgrades={upgrades(tiers, tier).map((upgrade) => ({
            id: upgrade.id,
            title: upgrade.title,
            price: formatMoney(upgrade.amount, upgrade.currencyCode),
            href: tierPath(upgrade.handle),
          }))}
        />
      </DocumentFrame>
    </main>
  );
}
