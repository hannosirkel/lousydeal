/**
 * `GET /store/deals/:slug` — a certificate, as much of it as is public.
 *
 * The first custom Store API route in this repository, and the only way the
 * storefront learns anything about a deal.
 *
 * **The slug is the whole of the authorisation.** There are no accounts
 * (contract §12), so nothing here identifies a caller and nothing could: this
 * request succeeding *is* the permission. §5 is why that is tolerable — the
 * slug is sixteen characters of `crypto.randomBytes` over a thirty-character
 * alphabet, about 78 bits, "a public URL nobody can enumerate", and C1's tests
 * hold it to that.
 *
 * **The publishable key is still required**, and not by anything here.
 * `ensurePublishableApiKeyMiddleware` is applied to the whole `/store`
 * namespace by the framework's own loader
 * (`@medusajs/framework/dist/http/router.js:98`), so a route file placed under
 * `src/api/store/` inherits it. That is worth knowing rather than discovering:
 * it means this endpoint is not reachable from an arbitrary browser, only from
 * something holding the key — which is the storefront, server-side.
 *
 * **The projection is an allowlist and the test asserts its key set exactly.**
 * That is the inverse of the usual test and it is deliberate: `lousy_deal`
 * will grow columns, and a `toMatchObject` here would let each new one reach a
 * public endpoint by default. §5's rule that the billing name is never public
 * is an *absence*, and an absence is only testable against a closed set.
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import { DEAL_MODULE } from "../../../../modules/deal";

/** A row, as much of it as this route reads. Deliberately not the model's type: what a column *is* and what is *published* are different questions. */
export interface StoredDeal {
  readonly public_slug: string;
  readonly serial: number;
  readonly tier: string;
  readonly amount_paid: number;
  readonly currency_code: string;
  readonly display_name: string | null;
  readonly dedication: string | null;
  readonly layout_version: number;
  readonly status: string;
  readonly issued_at: Date | string;
}

export interface PublicDeal {
  readonly serial: number;
  readonly tier: string;
  readonly amount_paid: number;
  readonly currency_code: string;
  readonly display_name: string | null;
  readonly dedication: string | null;
  readonly layout_version: number;
  /** `YYYY-MM-DD`. See {@link publicDeal}. */
  readonly issued_at: string;
}

/**
 * What a deal looks like to anybody who has its address.
 *
 * Written field by field rather than by deleting the private ones from a
 * spread, so a column added to the model appears here only when somebody
 * decides it should.
 *
 * **The date and not the timestamp.** §5 asks the certificate to carry an
 * issuance date and that is what this serves; the exact second somebody bought
 * something is more than the document needs, and this endpoint is
 * unauthenticated. Sliced rather than formatted, because a locale-aware format
 * moves with the runtime's ICU data — the reason `money.ts` gives for not
 * using `toLocaleString`.
 *
 * `id`, `order_id`, `public_slug` and `status` are absent, each for its own
 * reason: the first two address the order and §16 keeps billing identity with
 * it; the third the caller already has; and the fourth carries no information,
 * because `hidden` never reaches here.
 */
export function publicDeal(deal: StoredDeal): PublicDeal {
  const issuedAt = deal.issued_at instanceof Date ? deal.issued_at.toISOString() : String(deal.issued_at);
  return {
    serial: deal.serial,
    tier: deal.tier,
    amount_paid: deal.amount_paid,
    currency_code: deal.currency_code,
    display_name: deal.display_name,
    dedication: deal.dedication,
    layout_version: deal.layout_version,
    issued_at: issuedAt.slice(0, 10),
  };
}

interface DealLister {
  listLousyDeals(filters: { public_slug: string }): Promise<StoredDeal[]>;
}

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  // `req.params.slug` is `string | undefined`, and the guard is not
  // ceremonial: without it the filter reaches the database as
  // `{ public_slug: undefined }`, which MikroORM reads as no condition at all
  // -- an unfiltered list, whose first row would then be answered to a request
  // that named no deal. Both `tsc` and `medusa build` refuse the unguarded
  // version; only Vitest does not, because Vitest does not typecheck.
  const slug = req.params.slug;
  if (typeof slug !== "string" || slug.length === 0) {
    res.status(404).json({ message: "No such deal" });
    return;
  }

  const deals = req.scope.resolve(DEAL_MODULE) as DealLister;
  const [deal] = await deals.listLousyDeals({ public_slug: slug });

  // **404 for a slug that does not exist and for one that is hidden, in the
  // same words.** Telling them apart would say "there is a certificate here
  // and you may not see it", which makes the address enumerable — and §5 says
  // unenumerability is the entire reason the slug exists. 410 Gone would leak
  // the same fact more politely.
  if (deal === undefined || deal.status !== "issued") {
    res.status(404).json({ message: "No such deal" });
    return;
  }

  res.json({ deal: publicDeal(deal) });
}
