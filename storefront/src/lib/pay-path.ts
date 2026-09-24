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

/**
 * What a checkout that already holds a Stripe session must do before it makes
 * another. LD-11 H5.
 *
 * **Medusa cannot say, so Stripe is asked.** H2 reads `completed_at`, but a
 * card can be charged while the cart is not yet completed: an in-page
 * completion that failed, or a redirect completion that threw, until Medusa's
 * webhook catches up. Medusa's own session status stays `pending` in that
 * window -- it changes only when Medusa authorises -- so the cart cannot tell
 * a paid session from an unpaid one. The PaymentIntent can, and the browser
 * may read it with the session's client secret. The storefront's server has
 * no route to Stripe at all.
 *
 * Mounting the form without asking is what made the window dangerous: a new
 * session makes Medusa cancel the old intent, which fails for a succeeded one,
 * and H3's "Nothing has been charged" then rendered over a charged card.
 */
export type PriorPaymentOutcome =
  | { readonly kind: "clear" }
  /** The cart was completed here; reloading renders H2's end state from the server. */
  | { readonly kind: "placed" }
  | { readonly kind: "notice"; readonly notice: string };

export interface PriorPaymentSteps {
  /** The existing intent's status as Stripe reports it. */
  readonly retrieveStatus: () => Promise<string>;
  readonly complete: () => Promise<unknown>;
}

export async function checkPriorPayment(steps: PriorPaymentSteps): Promise<PriorPaymentOutcome> {
  let status: string;
  try {
    status = await steps.retrieveStatus();
  } catch {
    // Not "nothing charged": the one thing unknown here is whether the card was.
    return { kind: "notice", notice: PAYMENT_UNKNOWN_NOTICE };
  }
  if (CHARGED_INTENT_STATUSES.has(status)) {
    try {
      await steps.complete();
      return { kind: "placed" };
    } catch {
      return { kind: "notice", notice: PAYMENT_UNCONFIRMED_NOTICE };
    }
  }
  if (status === "processing") return { kind: "notice", notice: PAYMENT_UNKNOWN_NOTICE };
  return { kind: "clear" };
}
