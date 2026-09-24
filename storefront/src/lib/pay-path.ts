/**
 * The pay path, as one sequence whose failures are classified by position.
 * LD-11 H3.
 *
 * **Extracted from `PayButton`'s submit handler so each position can be made
 * to fail.** The storefront suite has no DOM, so a throw inside the handler
 * could be reached only by matching its source — an assertion that cannot
 * fail for the defect it names. Here a test hands in the three steps and
 * makes any of them throw.
 *
 * The position is the whole point. Before `confirm` nothing has been charged;
 * a refusal from `confirm` whose type says the card was judged means Stripe
 * took nothing, and any other failure there leaves it unknown; after
 * `confirm` succeeds the money is taken (`capture: true`). After a charge, or
 * the chance of one, what the buyer must hear is the opposite of "try again".
 */

import {
  PAYMENT_DECLINED_NOTICE,
  PAYMENT_NOT_STARTED_NOTICE,
  PAYMENT_UNCONFIRMED_NOTICE,
  PAYMENT_UNKNOWN_NOTICE,
} from "../content/checkout";

/**
 * What a `confirmPayment` error says about the card, read in order. LD-11 H3.
 *
 * **The PaymentIntent first, when Stripe attached one.** `StripeError` carries
 * `payment_intent` for errors on a request involving one, and it outranks the
 * type: confirming an intent that has already succeeded — a form restored
 * from bfcache after a redirect, say — is answered with an
 * `invalid_request_error`, and the intent says the card was charged.
 *
 * Then the type. `card_error`, `validation_error` and `invalid_request_error`
 * mean the card was judged and not taken. `rate_limit_error`,
 * `authentication_error` and `idempotency_error` mean Stripe refused the
 * request itself, so nothing was charged and trying again is right. Anything
 * else — `api_connection_error` above all, which can follow a confirmation
 * that reached Stripe — leaves the outcome unknown.
 */
const CHARGED_INTENT_STATUSES: ReadonlySet<string> = new Set(["succeeded", "requires_capture"]);
const DECLINED_TYPES: ReadonlySet<string> = new Set(["card_error", "validation_error", "invalid_request_error"]);
const REFUSED_REQUEST_TYPES: ReadonlySet<string> = new Set(["rate_limit_error", "authentication_error", "idempotency_error"]);

function classifyConfirmError(error: unknown): PayPathOutcome {
  const { type, payment_intent: intent } = error as {
    readonly type?: unknown;
    readonly payment_intent?: { readonly status?: unknown } | null;
  };
  const status = intent?.status;
  if (typeof status === "string" && CHARGED_INTENT_STATUSES.has(status)) {
    return { placed: false, notice: PAYMENT_UNCONFIRMED_NOTICE, charged: true };
  }
  if (status === "processing") return { placed: false, notice: PAYMENT_UNKNOWN_NOTICE, charged: true };
  if (typeof type === "string" && DECLINED_TYPES.has(type)) {
    return { placed: false, notice: PAYMENT_DECLINED_NOTICE, charged: false };
  }
  if (typeof type === "string" && REFUSED_REQUEST_TYPES.has(type)) {
    return { placed: false, notice: PAYMENT_NOT_STARTED_NOTICE, charged: false };
  }
  return { placed: false, notice: PAYMENT_UNKNOWN_NOTICE, charged: true };
}

export interface PayPathSteps {
  /** Everything written to the cart before the card is confirmed. */
  readonly prepare: () => Promise<void>;
  /** Stripe's `confirmPayment`, which resolves with `error` rather than throwing when it refuses. */
  readonly confirm: () => Promise<{ readonly error?: unknown }>;
  /** Medusa's cart completion, which creates the order. */
  readonly complete: () => Promise<{ readonly orderId: string }>;
}

export type PayPathOutcome =
  | { readonly placed: true; readonly orderId: string }
  /**
   * `charged` is what keeps the pay control off: the card was, or may have
   * been, charged, and a second press could be a second charge.
   */
  | { readonly placed: false; readonly notice: string; readonly charged: boolean };

export async function runPayPath(steps: PayPathSteps): Promise<PayPathOutcome> {
  try {
    await steps.prepare();
  } catch {
    return { placed: false, notice: PAYMENT_NOT_STARTED_NOTICE, charged: false };
  }

  let confirmation: { readonly error?: unknown };
  try {
    confirmation = await steps.confirm();
  } catch {
    // Stripe documents `confirmPayment` as resolving with `error` when
    // confirmation fails and says nothing of it rejecting, so a rejection
    // says nothing about the card either.
    return { placed: false, notice: PAYMENT_UNKNOWN_NOTICE, charged: true };
  }
  if (confirmation.error !== undefined && confirmation.error !== null) return classifyConfirmError(confirmation.error);

  try {
    const { orderId } = await steps.complete();
    return { placed: true, orderId };
  } catch {
    return { placed: false, notice: PAYMENT_UNCONFIRMED_NOTICE, charged: true };
  }
}
