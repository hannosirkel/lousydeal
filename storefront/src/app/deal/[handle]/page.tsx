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
 * The acquire control posts to `addToCart`, the one Server Action in
 * `src/lib/cart-actions.ts`, which this page and the home page share.
 */

import { connection } from "next/server";

import { DocumentFrame } from "../../../components/document/DocumentFrame";
import { OrderForm } from "../../../components/document/OrderForm";
import { Quotation } from "../../../components/document/Quotation";
import { DEAL_DOCUMENT } from "../../../content/deal";
import { ACQUIRE_LABEL_PREFIX } from "../../../content/home";
import { addToCart } from "../../../lib/cart-actions";
import { createStoreFetchJson, listTiers } from "../../../lib/medusa-client";
import { formatMoney } from "../../../lib/money";
import { requireStoreClientConfig } from "../../../lib/store-session";
import { NO_VALUE, requireTier, tierPath, upgrades } from "../../../lib/tier-rows";

export default async function DealPage({ params }: { readonly params: Promise<{ readonly handle: string }> }) {
  await connection();
  const { handle } = await params;
  const fetchJson = createStoreFetchJson(requireStoreClientConfig());
  const tiers = await listTiers(fetchJson);
  const tier = requireTier(tiers, handle);


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
