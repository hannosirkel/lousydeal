/**
 * One printed thing's own page.
 *
 * **The page `cart/page.tsx` said did not exist.** Its upsell rows carried the
 * comment "a printed thing has no page of its own, and a link to one that does
 * not exist is worse than plain text" — true when it was written, and the
 * operator reported the consequence: four joke titles, no picture, nothing to
 * click. This is that page, and the comment retires with it.
 *
 * **Every figure comes from the Store API or is composed**, never retyped.
 * The price is Medusa's; the value line is `merchValue()`, the same call the
 * cart makes, so the gag cannot drift between the two surfaces. §11 forbids a
 * figure this site invented, and a second hand-typed price is how one gets
 * invented.
 */

import { notFound } from "next/navigation";
import { connection } from "next/server";

import { Baldrick } from "../../../components/baldrick/Baldrick";
import { DocumentFrame } from "../../../components/document/DocumentFrame";
import { Ledger, LedgerRow } from "../../../components/document/LedgerRow";
import { MerchForm } from "../../../components/document/MerchForm";
import { Rule } from "../../../components/document/Rule";
import {
  GOODS_DOCUMENT,
  GOODS_FIGURE_CAPTION,
  GOODS_LABELS,
  GOODS_NOTICE,
} from "../../../content/merch";
import { addMerchToCart } from "../../../lib/cart-actions";
import { createStoreFetchJson, listMerch } from "../../../lib/medusa-client";
import { goodsImagePath, merchRowData } from "../../../lib/merch-rows";
import { requireStoreClientConfig } from "../../../lib/store-session";

export default async function GoodsPage({ params }: { readonly params: Promise<{ readonly handle: string }> }) {
  await connection();
  const { handle } = await params;
  const fetchJson = createStoreFetchJson(requireStoreClientConfig());
  const rows = merchRowData(await listMerch(fetchJson));
  const row = rows.find((candidate) => candidate.handle === handle);

  // A handle the store does not sell is a 404, which is the rule the tier page
  // already states: a page that renders an empty specification is worse than
  // one that says there is nothing here.
  if (row === undefined) notFound();

  return (
    <main>
      <DocumentFrame title={GOODS_DOCUMENT.title} form={GOODS_DOCUMENT.form} revision={GOODS_DOCUMENT.revision}>
        <Ledger>
          <LedgerRow label={GOODS_LABELS.item} value={row.title} />
          {row.kind === null ? null : <LedgerRow label={GOODS_LABELS.object} value={row.kind} />}
          <LedgerRow label={GOODS_LABELS.sizes} value={row.sizes} />
          <LedgerRow label={GOODS_LABELS.value} value={row.value} />
          <LedgerRow label={GOODS_LABELS.price} value={row.price} scale="display" />
        </Ledger>

        {/* **The photograph `brand.md` §6 was amended to admit**, on the terms
            the amendment sets: framed by a rule and captioned like a figure in
            a filing, so it reads as an exhibit rather than a hero shot. Fixed
            dimensions because every one of these is 800×800 — the browser
            reserves the space and the page does not jump when it loads. */}
        <figure className="goods-figure">
          <img src={goodsImagePath(row.handle)} alt={`${row.title}, ${row.kind ?? ""}`} width={800} height={800} />
          <figcaption>{GOODS_FIGURE_CAPTION}</figcaption>
        </figure>

        <MerchForm action={addMerchToCart} title={row.title} variants={row.variants} />

        <Rule />
        <p className="notice">{GOODS_NOTICE}</p>
      </DocumentFrame>
      <Baldrick />
    </main>
  );
}
