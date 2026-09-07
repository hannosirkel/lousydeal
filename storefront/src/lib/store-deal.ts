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

/** The three figures §11 names, as the counter renders them. */
export interface DealTotals {
  readonly count: number;
  readonly amount: number | null;
  readonly currencyCode: string | null;
  readonly latestSerial: number | null;
}

interface StoreTotalsResponse {
  readonly totals?: {
    readonly count?: unknown;
    readonly amount?: unknown;
    readonly currency_code?: unknown;
    readonly latest_serial?: unknown;
  };
}

const optionalNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

/**
 * The counter's figures, or `null` if they could not be read.
 *
 * **`null` and zero are different answers, and this is the whole point of the
 * signature.** Zero deals is a fact about the shop; an unreachable store is a
 * fact about the network. A counter that renders `0` when it could not ask
 * would be publishing a transaction total it has not got — which §11 forbids
 * in as many words and `AGENTS.md` forbids more sharply. So a failure yields
 * `null`, and the page omits the counter entirely rather than guessing at it.
 *
 * Every error is caught, not only a 404. There is no status for which
 * inventing a number is better than showing none.
 */
export async function getDealTotals(fetchJson: FetchJson): Promise<DealTotals | null> {
  let response: StoreTotalsResponse;
  try {
    response = await fetchJson<StoreTotalsResponse>("/store/deals/totals");
  } catch (error) {
    // Logged rather than swallowed: a permanently broken counter and a
    // momentarily unreachable one look identical on the page, so the
    // difference has to be somewhere. The storefront's only other log lines
    // are the proxy's and the social image's, for the same reason.
    console.error("the deal totals could not be read", error);
    return null;
  }

  const totals = response.totals;
  if (typeof totals?.count !== "number" || !Number.isFinite(totals.count)) return null;

  return {
    count: totals.count,
    amount: optionalNumber(totals.amount),
    currencyCode: typeof totals.currency_code === "string" ? totals.currency_code : null,
    latestSerial: optionalNumber(totals.latest_serial),
  };
}
