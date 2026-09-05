/**
 * One tier's own quotation, per `docs/current/brand.md` §4.
 *
 * `await connection()` is `src/app/layout.tsx`'s pattern, repeated because
 * `getRuntimeConfig()` must run inside a dynamically rendered request rather
 * than once at build time — see that file's comment.
 *
 * **An unknown handle is a 404, not an empty quotation.** `notFound()` renders
 * the not-found page and sends the status with it; a document headed
 * `QUOTATION` with no item would tell a crawler, and a reader, that this is a
 * real page for a deal that does not exist.
 *
 * The add-to-cart action is the home page's, repeated rather than shared: a
 * Server Action is defined in the component that uses it, and hoisting this
 * one into a module both pages import would make its `"use server"` boundary a
 * thing two routes depend on for a saving of nine lines.
 */

import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";

import { DocumentFrame } from "../../../components/document/DocumentFrame";
import { FinePrint } from "../../../components/document/FinePrint";
import { Ledger, LedgerRow } from "../../../components/document/LedgerRow";
import { OrderForm } from "../../../components/document/OrderForm";
import { Rule } from "../../../components/document/Rule";
import { getRuntimeConfig } from "../../../config/runtime-config";
import { ACQUIRE_LABEL_PREFIX } from "../../../content/home";
import {
  DEAL_DOCUMENT,
  DEAL_LABELS,
  NO_UPGRADES_LINE,
  UPGRADES_LINE,
  UPGRADES_TITLE,
  WITHDRAWAL_NOTICE,
} from "../../../content/deal";
import { createStoreFetchJson, getDefaultRegion, listTiers, type StoreClientConfig } from "../../../lib/medusa-client";
import { formatMoney } from "../../../lib/money";
import { addLineToCart, createCart } from "../../../lib/store-cart";
import { NO_VALUE, tierByHandle, tierPath, upgrades } from "../../../lib/tier-rows";
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
  const tier = tierByHandle(tiers, handle);

  if (tier === undefined) notFound();

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

  const worse = upgrades(tiers, tier);

  return (
    <main>
      <DocumentFrame title={DEAL_DOCUMENT.title} form={DEAL_DOCUMENT.form} revision={DEAL_DOCUMENT.revision}>
        <Ledger>
          <LedgerRow label={DEAL_LABELS.item} value={tier.title} />
          <LedgerRow label={DEAL_LABELS.price} value={formatMoney(tier.amount, tier.currencyCode)} />
          <LedgerRow label={DEAL_LABELS.value} value={formatMoney(NO_VALUE, tier.currencyCode)} />
          <LedgerRow label={DEAL_LABELS.return} value="-100%" tone="stamp" />
        </Ledger>

        <OrderForm
          action={addToCart}
          variantId={tier.variantId}
          label={`${ACQUIRE_LABEL_PREFIX} ${formatMoney(tier.amount, tier.currencyCode)}`}
        />

        <Rule />
        <h2>{UPGRADES_TITLE}</h2>
        {worse.length === 0 ? (
          <p>{NO_UPGRADES_LINE}</p>
        ) : (
          <>
            <p>{UPGRADES_LINE}</p>
            <Ledger>
              {worse.map((upgrade) => (
                <LedgerRow
                  key={upgrade.id}
                  label={<a href={tierPath(upgrade.handle)}>{upgrade.title}</a>}
                  value={formatMoney(upgrade.amount, upgrade.currencyCode)}
                />
              ))}
            </Ledger>
          </>
        )}

        <Rule />
        <FinePrint>{WITHDRAWAL_NOTICE}</FinePrint>
      </DocumentFrame>
    </main>
  );
}
