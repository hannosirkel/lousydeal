/**
 * The home page: one purchase order, per `docs/current/brand.md` §4.
 *
 * `await connection()` is `src/app/layout.tsx`'s pattern, repeated here
 * because `getRuntimeConfig()` must run inside a dynamically rendered
 * request, not once at build time -- see that file's comment for why.
 *
 * The "add to cart" control posts to `addToCart`, the one Server Action in
 * `src/lib/cart-actions.ts`. Submitting posts to the server, which reuses the
 * cart the cookie names, creates one only when it does not, adds the line, and
 * redirects to `/cart`. No client-side JavaScript is required for this to
 * work, and the visual layer added none.
 *
 * **The offer block and the table are the same three tiers.** The block at the
 * top is the cheapest of them, not a fourth thing written by hand: every
 * figure on this page is formatted from what the Store API returned, so there
 * is no second copy of a price to drift.
 */

import { connection } from "next/server";

import { DocumentFrame } from "../components/document/DocumentFrame";
import { FinePrint } from "../components/document/FinePrint";
import { Ledger, LedgerRow } from "../components/document/LedgerRow";
import { OrderForm } from "../components/document/OrderForm";
import { Rule } from "../components/document/Rule";
import { TierTable, type TierRow } from "../components/document/TierTable";
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
import { addToCart } from "../lib/cart-actions";
import { createStoreFetchJson, listTiers } from "../lib/medusa-client";
import { formatMoney } from "../lib/money";
import { requireStoreClientConfig } from "../lib/store-session";
import { cheapest, NO_VALUE, tierRowData } from "../lib/tier-rows";

export default async function HomePage() {
  await connection();
  const fetchJson = createStoreFetchJson(requireStoreClientConfig());
  const tiers = await listTiers(fetchJson);


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
