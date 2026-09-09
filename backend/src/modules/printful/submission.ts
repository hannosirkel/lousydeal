/**
 * Placing one Printful order per Medusa order, exactly once, for an order that
 * may arrive more than once.
 *
 * This is `../deal/issue.ts`'s problem with money attached, and the difference
 * is the whole design. Issuing a certificate is free and purely local, so
 * read-insert-read closes every window: the unique index on `lousy_deal.order_id`
 * is both the record and the guarantee. Placing a Printful order is neither
 * free nor local, and a local unique index cannot close the window that
 * matters:
 *
 *   1. look up — no row;
 *   2. call Printful — **an order exists and money is committed**;
 *   3. die before the insert;
 *   4. redelivery looks up — still no row — and orders it again.
 *
 * Nothing written here afterwards can prevent that, because the fact to be
 * remembered was created somewhere else. What prevents it is a constraint held
 * by the party holding the fact, and **Printful has one**: `external_id` is
 * unique per store and a second create for the same value is refused.
 *
 * **Measured, on 2026-09-09, against the live API.** The field is documented
 * only as "Order ID from the external system", which says nothing about
 * uniqueness, so the fact this design rests on was established by creating the
 * same `external_id` twice: the first returned `id=175705264 status=draft`,
 * the second `HTTP 400 … "Order with this External ID already exists"`,
 * `api_error_code: OR-13`. Creation makes a draft — confirmation is a separate
 * endpoint — so the probe cost nothing, and the draft was deleted afterwards.
 *
 * **Two things that probe also settled, and both changed the code:**
 *
 *  - **v2 cannot order what this store sells.** `POST /v2/orders` refuses
 *    `source: "sync"` — "Source must be one of: catalog, warehouse,
 *    product_template" — so it cannot reference the sync products `sync.ts`
 *    creates and reconciles. Ordering through v2 would mean re-specifying the
 *    artwork per order as catalog placements, which is the same artwork
 *    described twice and free to drift. **v1 takes `sync_variant_id`**, so the
 *    order references the exact product whose print files are pinned to a
 *    commit. That is why this uses v1 for the create while `shipping.ts` uses
 *    v2 for rates: each is the version that can answer.
 *  - **Deleting a Printful order cancels it and keeps the external id taken.**
 *    The probe's delete returned 200, the order's status became `canceled`,
 *    and re-creating with the same `external_id` was refused again. So a
 *    successful look-up does **not** mean the item is coming, and treating one
 *    as "already handled" would go silent on exactly the case where somebody
 *    cancelled the print: paid for, not coming, nothing saying so. The remote
 *    status is stored and `canceled` is a state of its own.
 *
 * **Nothing here reads the error.** `issue.ts` records why at length — Medusa
 * rewrites a Postgres 23505 into prose, so matching the sentence couples the
 * code to somebody's phrasing. The same argument reaches further here: rather
 * than detect `OR-13`, a failed create asks Printful whether the order now
 * exists. That is the question the error was trying to answer, it stays true
 * however Printful words it, and it is right for a lost response too — a
 * timeout that hid a successful create looks identical, and is handled by the
 * same three lines.
 */

import type { PrintfulSubmissionStatus } from "../deal/models/printful-submission";

/** A row, as much of it as submission reads back. */
export interface PrintfulSubmissionRecord {
  readonly id: string;
  readonly order_id: string;
  readonly printful_order_id: string | null;
  readonly printful_status: string | null;
  readonly status: PrintfulSubmissionStatus;
  readonly attempts: number;
  readonly last_error: string | null;
  readonly submitted_at: Date | null;
}

/**
 * The three generated methods this needs, and no more.
 *
 * Narrow for the reason `DealStore` is: the service also generates deletes and
 * soft-deletes, and **a soft delete here would be actively dangerous** — the
 * unique index the migration writes is partial, `WHERE deleted_at IS NULL`, so
 * soft-deleting a submission releases its `order_id` locally. Printful's own
 * constraint would still hold, which is the point of the file, but a seam that
 * admitted the method would invite somebody to try.
 */
export interface SubmissionStore {
  listPrintfulSubmissions(filters: { order_id: string }): Promise<PrintfulSubmissionRecord[]>;
  createPrintfulSubmissions(data: Record<string, unknown>): Promise<PrintfulSubmissionRecord>;
  updatePrintfulSubmissions(data: Record<string, unknown>): Promise<PrintfulSubmissionRecord>;
}

/** A Printful order, as much of it as this cares about. */
export interface RemotePrintfulOrder {
  readonly id: string;
  readonly status: string;
}

/**
 * One thing to be printed and posted.
 *
 * The SKU, not a Printful id. `orders.ts` resolves it through the join
 * `sync.ts` already made — each sync variant's `external_id` is its SKU — so
 * nothing here or upstream has to carry a mapping that Printful is already
 * keeping and that cannot drift from the products because it is them.
 */
export interface PrintfulOrderLine {
  readonly sku: string;
  readonly quantity: number;
}

/** Where it goes. Printful's own field names are `client.ts`'s business, not this file's. */
export interface PrintfulRecipient {
  readonly name: string;
  readonly address1: string;
  readonly city: string;
  readonly countryCode: string;
  readonly postcode: string;
  readonly province: string | null;
}

/**
 * The two operations, over a seam a test can drive.
 *
 * `findByExternalId` returns `null` for a 404 rather than throwing, because a
 * missing order is an ordinary answer here and the caller asks the question in
 * the path where something has already gone wrong.
 */
export interface PrintfulOrders {
  findByExternalId(externalId: string): Promise<RemotePrintfulOrder | null>;
  create(input: {
    readonly externalId: string;
    readonly recipient: PrintfulRecipient;
    readonly lines: readonly PrintfulOrderLine[];
  }): Promise<RemotePrintfulOrder>;
  /**
   * **The call that spends the money.** A created order is a `draft` and
   * nothing prints a draft; v2 describes this as starting fulfilment in the
   * production facility.
   */
  confirm(printfulOrderId: string): Promise<RemotePrintfulOrder>;
}

export interface PrintfulSubmissionInput {
  readonly orderId: string;
  /** The merch lines only. A certificate is not posted and never reaches here. */
  readonly lines: readonly PrintfulOrderLine[];
  /** `null` where the order carried no usable address — which is what an order of certificates looks like. */
  readonly recipient: PrintfulRecipient | null;
  readonly submittedAt: Date;
}

/**
 * Printful statuses that mean the order can never be made.
 *
 * Both spellings of cancelled, because the field is somebody else's and the
 * live API answered `canceled` while its own documentation uses both.
 *
 * **`failed` was in here and does not belong.** Printful's own status table
 * calls it recoverable — *"If a charge or auto-recharge fails, the order gets
 * the 'Failed' status. It won't be sent to fulfillment on its own, so once
 * you've resolved the cause you'll need to submit the order again manually"* —
 * and the dashboard offers a Confirm order retry. The order still exists under
 * its `external_id`, which is the thing that decides whether a later attempt
 * can do anything. A cancelled one cannot be replaced under that id, so it is
 * terminal; a failed one is a draft with a billing problem in front of it.
 *
 * Recording the recoverable case as the unrecoverable one made a paid order
 * that a person could have rescued into one nothing would ever try again.
 */
const NEVER_GOING_TO_BE_MADE = new Set(["canceled", "cancelled"]);

/** Printful's word for an order it accepted and then could not charge. */
const CHARGE_FAILED = "failed";

/** Printful's word for an order that exists and has not been sent to a facility. */
const DRAFT = "draft";

/**
 * **P8a recorded a draft as `submitted`, and P8b closes that.**
 *
 * A created order is a draft — measured — and nothing prints a draft. So a
 * draft is not a success, and it is not a permanent failure either: it is an
 * order that exists and needs one more call. Mapping it to `failed` makes it
 * **retryable**, and a retry finds the existing order by `external_id` and
 * confirms it rather than creating a second one.
 *
 * That is the whole reason confirmation is a separate call here rather than a
 * `?confirm=1` on the create. A crash between creating and confirming leaves a
 * recoverable draft; an atomic create-and-confirm would leave the same crash
 * indistinguishable from a create that never happened.
 *
 * **Printful's `failed` maps the same way, and for the same reason.** It is a
 * confirmed order whose charge did not go through: it exists, it is not going
 * anywhere on its own, and a person who fixes the billing can have it. Local
 * `failed` is the retryable state, so that is where both belong. Only a
 * cancellation is terminal.
 */
function statusFor(remote: RemotePrintfulOrder): PrintfulSubmissionStatus {
  const status = remote.status.toLowerCase();
  if (NEVER_GOING_TO_BE_MADE.has(status)) return "canceled";
  return status === DRAFT || status === CHARGE_FAILED ? "failed" : "submitted";
}

/**
 * Whether a recorded submission is finished with.
 *
 * `failed` is not: it is the one state a later attempt may act on, which is
 * what makes a redelivery after an outage useful rather than a no-op. Every
 * other state is terminal, `canceled` included — a cancelled order cannot be
 * replaced under the same `external_id`, so retrying would fail forever and a
 * person has to look.
 */
function settled(record: PrintfulSubmissionRecord): boolean {
  return record.status !== "failed";
}

/**
 * Places the order, or reports the one that is already placed.
 *
 * Returns the record either way. Throws only where Printful failed *and* has
 * no order for this id — a genuine failure, which the caller must not treat as
 * a delivered parcel.
 */
export async function submitPrintfulOrder(
  submissions: SubmissionStore,
  orders: PrintfulOrders,
  input: PrintfulSubmissionInput,
): Promise<PrintfulSubmissionRecord> {
  const existing = (await submissions.listPrintfulSubmissions({ order_id: input.orderId }))[0];
  if (existing && settled(existing)) return existing;

  // Nothing to post. Written down rather than left absent, so the next
  // redelivery of a certificate-only order costs one indexed read instead of
  // re-deciding. Most orders here are this one.
  if (input.lines.length === 0) {
    return await record(submissions, existing, {
      order_id: input.orderId,
      status: "skipped",
      printful_order_id: null,
      printful_status: null,
      last_error: null,
      submitted_at: null,
    });
  }

  /*
   * **Something to post and nowhere to post it, which is not the same thing
   * and used to be recorded as if it were.**
   *
   * Gate D found the two conditions sharing a branch. `skipped` is terminal —
   * `settled()` admits everything but `failed` — and `order-placed.ts` logged
   * it at no level at all, because it was the ordinary answer for the
   * ordinary order. So a paid order whose address `recipientFrom` refused was
   * charged, sent to nobody, recorded as unremarkable, and **never retried,
   * even after an operator fixed the address**.
   *
   * `failed` is the honest state: retryable, and loud in the subscriber. The
   * plan promised exactly that for the case where Printful rejects an address
   * — "ends in a message that says what happened rather than a silent
   * failure" — and the locally-rejected case got the silent version.
   */
  if (input.recipient === null) {
    return await record(submissions, existing, {
      order_id: input.orderId,
      status: "failed",
      printful_order_id: null,
      printful_status: null,
      last_error: "The order has lines to post and no usable delivery address",
      submitted_at: null,
      attempts: (existing?.attempts ?? 0) + 1,
    });
  }

  const attempts = (existing?.attempts ?? 0) + 1;

  try {
    const created = await orders.create({
      externalId: input.orderId,
      recipient: input.recipient,
      lines: input.lines,
    });
    return await settle(submissions, orders, existing, input, created, attempts);
  } catch (error) {
    // **The question the error was trying to answer.** Not "was this OR-13",
    // which couples us to Printful's wording; and it is the right question for
    // a lost response too, where there is no error code to read because the
    // create succeeded and the answer never arrived.
    const already = await orders.findByExternalId(input.orderId);
    if (already !== null) return await settle(submissions, orders, existing, input, already, attempts);

    // Printful has nothing for this order, so nothing was ordered and nothing
    // was charged. Recorded as failed and rethrown: an order that took a
    // buyer's money and printed nothing must not look successful.
    await record(submissions, existing, {
      order_id: input.orderId,
      status: "failed",
      printful_order_id: null,
      printful_status: null,
      last_error: messageOf(error),
      submitted_at: null,
      attempts,
    });
    throw error;
  }
}

/**
 * Confirms the order if it still needs it, then writes the row.
 *
 * Reached from both paths — a fresh create and a recovered one — because a
 * recovered order is exactly as likely to be an unconfirmed draft. That is the
 * case a crash between create and confirm leaves behind, and the one this
 * two-call shape exists to make recoverable.
 *
 * A confirmation that fails is not rethrown. The order exists, it is not lost,
 * and the row says `failed` with the reason — which makes the next redelivery
 * try the confirmation again instead of the create. Throwing would be right if
 * nothing had happened; something has.
 */
async function settle(
  submissions: SubmissionStore,
  orders: PrintfulOrders,
  existing: PrintfulSubmissionRecord | undefined,
  input: PrintfulSubmissionInput,
  remote: RemotePrintfulOrder,
  attempts: number,
): Promise<PrintfulSubmissionRecord> {
  let current = remote;
  let error: string | null = null;

  if (current.status.toLowerCase() === DRAFT) {
    try {
      current = await orders.confirm(current.id);
    } catch (confirmation) {
      error = messageOf(confirmation);
    }
  }

  const status = statusFor(current);
  return await record(submissions, existing, {
    order_id: input.orderId,
    status,
    printful_order_id: current.id,
    printful_status: current.status,
    last_error: error ?? (status === "failed" ? "Printful order is still a draft and will not be printed" : null),
    submitted_at: status === "submitted" ? input.submittedAt : null,
    attempts,
  });
}

/**
 * Writes the row, updating in place where a previous attempt left one.
 *
 * The `attempts` default of 1 belongs to `skipped`, which is reached without
 * calling anybody and would otherwise carry the caller's count for an attempt
 * that never happened.
 *
 * **The insert can lose a race, and the first version of this did not think
 * so.** Two workers that both passed the look-up both reach here. Printful
 * settles which of them placed the order — one create, one recovery, and both
 * end up holding the same remote order — but they then both try to *write*
 * it, and the local unique index refuses the second. The concurrency test
 * found exactly that, and it would have surfaced in production as a paid
 * order that was correctly printed and then reported as a failure.
 *
 * So the loser asks the question again, which is `issue.ts`'s step 3 and the
 * same reasoning: **not what the error said** — Medusa rewrites a Postgres
 * 23505 into prose — but whether the row is there now. It is, because that is
 * what the collision means, and updating it is what the winner would have
 * done.
 */
async function record(
  submissions: SubmissionStore,
  existing: PrintfulSubmissionRecord | undefined,
  data: Record<string, unknown> & { readonly order_id: string },
): Promise<PrintfulSubmissionRecord> {
  const payload = { attempts: 1, ...data };
  if (existing) return await submissions.updatePrintfulSubmissions({ id: existing.id, ...payload });

  try {
    return await submissions.createPrintfulSubmissions(payload);
  } catch (error) {
    const raced = (await submissions.listPrintfulSubmissions({ order_id: data.order_id }))[0];
    if (raced) return await submissions.updatePrintfulSubmissions({ id: raced.id, ...payload });
    // Nothing there, so the failure was not a collision — a dead connection, a
    // not-null violation, a bug. Rethrown for the same reason `issue.ts`
    // rethrows: swallowing it would leave the order looking recorded.
    throw error;
  }
}

/** Never the error object: `client.ts` keeps the token out of its messages and this keeps the shape out of the column. */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
