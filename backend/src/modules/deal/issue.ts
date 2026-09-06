/**
 * Issuing a deal, once, for an order that may arrive more than once.
 *
 * **The whole file is about the second arrival.** Contract §16 ends with
 * "ensure certificate issuance is idempotent" and "Stripe/webhook retries must
 * not generate duplicate certificates", and there are two independent reasons
 * a retry is ordinary traffic rather than an error: Medusa's Redis event bus
 * delivers at least once, and Stripe retries a webhook it did not see
 * acknowledged. Neither is a fault, so neither may produce a second
 * certificate.
 *
 * **Kept out of the Medusa service class so it can be tested without a
 * database.** The service passes itself in as {@link DealStore}; a test passes
 * a fake with the same two methods, and drives the race the database cannot be
 * asked to stage on demand. This is the same injected-seam shape the storefront
 * uses for the Store API (`storefront/src/lib/medusa-client.ts`'s `FetchJson`).
 */

import { CURRENT_CERTIFICATE_LAYOUT } from "./models/lousy-deal";
import { generateDealSlug, type RandomBytes } from "./slug";

/** A row, as much of it as issuance reads back. */
export interface IssuedDeal {
  readonly id: string;
  readonly order_id: string;
  readonly serial: number;
  readonly public_slug: string;
}

/**
 * The two generated methods issuance needs, and no more.
 *
 * Narrow on purpose: `DealModuleService` also generates `updateLousyDeals`,
 * `deleteLousyDeals` and `softDeleteLousyDeals`, and issuance has no business
 * with any of them. A seam that admitted them would let a later edit reach for
 * one.
 */
export interface DealStore {
  listLousyDeals(filters: { order_id: string }): Promise<IssuedDeal[]>;
  createLousyDeals(data: Record<string, unknown>): Promise<IssuedDeal>;
}

/** Everything the certificate is made of, as the order carried it. */
export interface DealIssuanceInput {
  readonly orderId: string;
  readonly tier: string;
  readonly amountPaid: number;
  readonly currencyCode: string;
  /** §5's two inscription fields, already filtered. `null` where the buyer left one blank. */
  readonly displayName: string | null;
  readonly dedication: string | null;
  /**
   * The order's own creation time, not the clock at issuance.
   *
   * A subscriber can run a day after the order it is about — a queue backlog,
   * a redelivery, a replay after an outage — and a certificate dated by
   * whenever the worker happened to catch up would be wrong on its face.
   * Passing it in also makes a replay produce the identical record rather
   * than a differently-dated one.
   */
  readonly issuedAt: Date;
}

/**
 * Returns the order's deal, minting it if there is not one yet.
 *
 * **Read first, then insert, then read again.** Three steps, and the third is
 * the one that matters:
 *
 *  1. The common case. A replayed event finds the deal and returns it without
 *     touching the sequence, so a retry storm does not burn a serial per
 *     delivery.
 *  2. The insert. `order_id` carries a unique partial index
 *     (`models/lousy-deal.ts`), so two workers that both passed step 1 cannot
 *     both land here.
 *  3. The loser of that race asks the question again. **Not "what did the
 *     error say".** Medusa's `dbErrorMapper`
 *     (`@medusajs/utils/dist/dal/mikro-orm/db-error-mapper.js:20-30`) rewrites
 *     a Postgres 23505 into a `MedusaError` whose text is
 *     `"Lousy deal with order_id: …, already exists."` — the SQLSTATE is gone
 *     by the time a caller sees it, and matching that sentence would make this
 *     function depend on Medusa's phrasing. Asking the database whether the
 *     deal now exists is the same question the error was trying to answer, and
 *     it stays true however the error is worded.
 *
 * An error that leaves no deal behind is rethrown. It is a real failure —
 * the connection, a not-null violation, a bug — and swallowing it would leave
 * an order that took money looking successfully certified.
 *
 * **A slug collision is not retried.** Sixteen characters over a
 * thirty-character alphabet is about 78 bits; at a million deals the chance
 * that any two collide is around 10^-11. A retry loop for that would be
 * code no test could reach and no reviewer could check, so the insert is
 * allowed to fail and say so.
 */
export async function issueDeal(
  deals: DealStore,
  input: DealIssuanceInput,
  randomBytes?: RandomBytes,
): Promise<IssuedDeal> {
  const existing = await deals.listLousyDeals({ order_id: input.orderId });
  if (existing.length > 0 && existing[0]) return existing[0];

  try {
    return await deals.createLousyDeals({
      order_id: input.orderId,
      public_slug: generateDealSlug(randomBytes),
      tier: input.tier,
      amount_paid: input.amountPaid,
      currency_code: input.currencyCode,
      display_name: input.displayName,
      dedication: input.dedication,
      // Frozen here and never updated: §5's rule that a redesign is additive
      // and never restyles a certificate somebody already owns.
      layout_version: CURRENT_CERTIFICATE_LAYOUT,
      status: "issued",
      issued_at: input.issuedAt,
      // `serial` is deliberately absent. The column defaults to
      // `nextval('lousy_deal_serial_seq')`; naming it here would be this code
      // choosing a number, which is the failure the sequence exists to
      // prevent.
    });
  } catch (error) {
    const afterFailure = await deals.listLousyDeals({ order_id: input.orderId });
    if (afterFailure.length > 0 && afterFailure[0]) return afterFailure[0];
    throw error;
  }
}
