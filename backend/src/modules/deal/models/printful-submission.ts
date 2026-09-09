/**
 * What this shop has sent to Printful, as a row.
 *
 * **This table is the record, not the lock.** That distinction is the whole of
 * LD-04 P8 and it is worth stating before the columns.
 *
 * `lousy_deal` uses a unique index on `order_id` as its idempotency guarantee,
 * and for issuing a certificate that is enough: minting one is free and purely
 * local, so read-insert-read closes every window. Placing a Printful order is
 * not free. A unique index here would leave the window that matters wide open:
 *
 *   1. worker looks up — no row;
 *   2. worker calls Printful — **an order now exists and money is committed**;
 *   3. worker dies before the insert;
 *   4. redelivery looks up — still no row — and orders it again.
 *
 * No local table can close that, because the fact to be remembered was created
 * somewhere else. What closes it is a constraint held by the party that has
 * the fact, and **Printful has one**: `external_id` is unique per store, and a
 * second create for the same one is refused with `OR-13`. Measured on
 * 2026-09-09 against the live API rather than assumed — the field is
 * documented only as "Order ID from the external system", which says nothing
 * about uniqueness.
 *
 * So this row exists to answer cheaply, to be read by a human, and to make a
 * replay stop before it reaches the network. The correctness argument lives at
 * Printful. `../../printful/submission.ts` is where it is written down.
 *
 * **`canceled` is a real state and not a tidy-up.** Deleting a draft order at
 * Printful cancels it and **keeps the external id taken** — measured the same
 * day, by deleting a probe order and finding both that its status became
 * `canceled` and that the id could not be reused. A shop that treated any
 * successful look-up as "already handled" would therefore go quiet on exactly
 * the case where somebody cancelled the print: the buyer has paid, nothing is
 * coming, and no row says so. The status is stored so that case is visible.
 */

import { model } from "@medusajs/framework/utils";

/**
 * Where an order got to.
 *
 * `skipped` is not a failure. Most orders here carry a certificate and nothing
 * else, and a shop that left them unrecorded would re-examine every one of
 * them on every redelivery for the rest of its life. Writing the negative
 * answer down is what makes the common case cost one indexed read.
 *
 * `failed` is terminal for the attempt and not for the order: `attempts`
 * counts, and a human reads it. Nothing here retries on a schedule, because a
 * loop that keeps calling an endpoint that spends money is the failure this
 * whole file is about.
 */
export const PRINTFUL_SUBMISSION_STATUSES = ["submitted", "skipped", "canceled", "failed"] as const;

export type PrintfulSubmissionStatus = (typeof PRINTFUL_SUBMISSION_STATUSES)[number];

export const PrintfulSubmission = model
  .define("printful_submission", {
    id: model.id().primaryKey(),

    /**
     * The Medusa order this is about, and the string handed to Printful as
     * `external_id`. Unique here so a replay is one indexed read; unique
     * *there* so a replay that gets past this row still cannot place a second
     * order.
     */
    order_id: model.text(),

    /**
     * Printful's own order id, once there is one.
     *
     * Nullable because `skipped` never has one and `failed` may not. It is
     * what a person needs to find the order in Printful's dashboard, which is
     * the only reason this column is worth its width.
     */
    printful_order_id: model.text().nullable(),

    /** Printful's own status word, stored as it came. See the note on `canceled` above. */
    printful_status: model.text().nullable(),

    // Spread for the same reason `lousy_deal` spreads its own: `model.enum`
    // refuses a readonly tuple, and the tuple stays `as const` so the exported
    // type is the union rather than `string`.
    status: model.enum([...PRINTFUL_SUBMISSION_STATUSES]),

    /**
     * How many times this order has been through the submission path.
     *
     * Not a retry budget — nothing here retries automatically. It is the
     * number that tells an operator the difference between "Printful was down
     * once" and "this order has been thrown at Printful two hundred times",
     * which are different problems with the same status.
     */
    attempts: model.number(),

    /** Why the last attempt failed, for a person. Never a token: `client.ts` keeps those out of its errors. */
    last_error: model.text().nullable(),

    /**
     * When the order was accepted by Printful, distinct from the row's own
     * `created_at` for the reason `lousy_deal.issued_at` is: a replay must
     * produce the same record rather than a differently-dated one, and a row
     * rewritten later must not appear to have been submitted later.
     */
    submitted_at: model.dateTime().nullable(),
  })
  .indexes([
    // One submission per Medusa order. The local half of the argument at the
    // head of this file — the half that makes a replay cheap, not the half
    // that makes it safe.
    { on: ["order_id"], unique: true },
  ]);
