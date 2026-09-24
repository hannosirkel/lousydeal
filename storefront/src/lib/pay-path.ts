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
 * a refusal from `confirm` means Stripe took nothing; after `confirm`
 * succeeds the money is taken (`capture: true`), and what the buyer must hear
 * is the opposite of "try again".
 */

import { PAYMENT_DECLINED_NOTICE, PAYMENT_NOT_STARTED_NOTICE, PAYMENT_UNCONFIRMED_NOTICE } from "../content/checkout";

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
  /** `charged` is what keeps the pay control off: a second press would be a second charge. */
  | { readonly placed: false; readonly notice: string; readonly charged: boolean };

export async function runPayPath(steps: PayPathSteps): Promise<PayPathOutcome> {
  try {
    await steps.prepare();
  } catch {
    return { placed: false, notice: PAYMENT_NOT_STARTED_NOTICE, charged: false };
  }

  // A rejection is treated as a refusal. Stripe documents `confirmPayment` as
  // resolving with `error` when confirmation fails, and says nothing of it
  // rejecting, so a rejection is read as nothing having been confirmed.
  const confirmation = await steps.confirm().catch((thrown: unknown) => ({ error: thrown }));
  if (confirmation.error !== undefined && confirmation.error !== null) {
    return { placed: false, notice: PAYMENT_DECLINED_NOTICE, charged: false };
  }

  try {
    const { orderId } = await steps.complete();
    return { placed: true, orderId };
  } catch {
    return { placed: false, notice: PAYMENT_UNCONFIRMED_NOTICE, charged: true };
  }
}
