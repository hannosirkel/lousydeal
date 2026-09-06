/**
 * Reading one deal from the Store API, and turning it into a certificate.
 *
 * The counterpart of C4's `GET /store/deals/:slug`. That route publishes an
 * allowlist of eight fields; this reads exactly those eight and builds the
 * record `Certificate` renders from.
 *
 * **Named field by field, not spread.** The wire shape and the render shape
 * are different vocabularies — `amount_paid` against `amount`, `issued_at`
 * against `issuedOn` — and translating them by hand is what stops a field
 * added to the endpoint arriving on the page because nobody stopped it. It is
 * the same allowlist argument the route makes on its own side, and having it
 * on both is deliberate: constraint 13 says the billing name is never public,
 * and an absence needs guarding wherever it could reappear.
 *
 * **A 404 is an answer, not a failure.** `StoreApiError` carries the status
 * for exactly this (`medusa-client.ts`), and `src/app/cart/page.tsx` set the
 * precedent: 404 means "no such thing", every other status is a real failure
 * and is re-thrown. Here 404 also covers a deal an operator has hidden — C4
 * answers the two identically on purpose, so this cannot tell them apart
 * either, which is the point.
 */

import { StoreApiError, type FetchJson } from "./medusa-client";
import type { Certificate } from "./certificate-model";

interface StoreDealResponse {
  readonly deal?: {
    readonly serial?: unknown;
    readonly tier?: unknown;
    readonly amount_paid?: unknown;
    readonly currency_code?: unknown;
    readonly display_name?: unknown;
    readonly dedication?: unknown;
    readonly layout_version?: unknown;
    readonly issued_at?: unknown;
  };
}

/** An optional field: present as a string, or absent. Anything else is absent. */
function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * The certificate at `slug`, or `null` if there is none to show.
 *
 * **Refuses a partial record rather than rendering one.** A certificate with a
 * missing tier or a missing amount is not a certificate with a gap in it; it
 * is a document making a claim it cannot support, on the surface people
 * screenshot. The two inscription fields are the only ones allowed to be
 * absent, because §5 says the empty pair is the ordinary case.
 */
export async function getDeal(fetchJson: FetchJson, slug: string): Promise<Certificate | null> {
  let response: StoreDealResponse;
  try {
    response = await fetchJson<StoreDealResponse>(`/store/deals/${encodeURIComponent(slug)}`);
  } catch (error) {
    if (error instanceof StoreApiError && error.status === 404) return null;
    throw error;
  }

  const deal = response.deal;
  if (
    typeof deal?.serial !== "number" ||
    typeof deal.tier !== "string" ||
    typeof deal.amount_paid !== "number" ||
    typeof deal.currency_code !== "string" ||
    typeof deal.layout_version !== "number" ||
    typeof deal.issued_at !== "string"
  ) {
    throw new Error(`the store API returned an incomplete deal for ${slug}`);
  }

  return {
    serial: deal.serial,
    tier: deal.tier,
    amount: deal.amount_paid,
    currencyCode: deal.currency_code,
    displayName: optionalText(deal.display_name),
    dedication: optionalText(deal.dedication),
    layout: deal.layout_version,
    issuedOn: deal.issued_at,
  };
}
