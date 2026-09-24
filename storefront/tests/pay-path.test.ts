/**
 * LD-11 H3: a failure on the pay path speaks in our words, not Medusa's.
 *
 * `thrown.message` went straight into the rendered error, so a buyer could
 * read the proxy's status line or `Medusa did not place an order for cart …`
 * — and the second one arrived after the card was charged, with the pay
 * control re-enabled beside it. `runPayPath` is driven here with a throw at
 * each position, because the handler it came from cannot be reached without a
 * DOM.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  PAYMENT_DECLINED_NOTICE,
  PAYMENT_NOT_STARTED_NOTICE,
  PAYMENT_UNCONFIRMED_NOTICE,
  PAYMENT_UNKNOWN_NOTICE,
} from "../src/content/checkout";
import { payDisabled, paySubmitBlocked } from "../src/lib/checkout-rules";
import { checkPriorPayment, runPayPath, type PayPathSteps } from "../src/lib/pay-path";

/** Strings the upstream services really produce, which must never be rendered. */
const PROXY = "Store API proxy returned 500 for /store/carts/cart_1";
const MEDUSA = "Medusa did not place an order for cart cart_1";
const STRIPE = "Your card has insufficient funds.";

/** Every step succeeds unless overridden, and records that it ran. */
function steps(overrides: Partial<PayPathSteps> = {}): { steps: PayPathSteps; ran: string[] } {
  const ran: string[] = [];
  return {
    ran,
    steps: {
      prepare: async () => {
        ran.push("prepare");
        await overrides.prepare?.();
      },
      confirm: async () => {
        ran.push("confirm");
        return overrides.confirm === undefined ? {} : overrides.confirm();
      },
      complete: async () => {
        ran.push("complete");
        return overrides.complete === undefined ? { orderId: "order_1" } : overrides.complete();
      },
    },
  };
}

describe("before the card is confirmed", () => {
  it("says nothing was charged, and goes no further", async () => {
    const { steps: s, ran } = steps({
      prepare: async () => {
        throw new Error(PROXY);
      },
    });
    expect(await runPayPath(s)).toEqual({ placed: false, notice: PAYMENT_NOT_STARTED_NOTICE, charged: false });
    expect(ran).toEqual(["prepare"]);
  });
});

describe("when Stripe refuses the card", () => {
  it("says the card was not charged, in our words and not Stripe's", async () => {
    const { steps: s, ran } = steps({ confirm: async () => ({ error: { type: "card_error", message: STRIPE } }) });
    const outcome = await runPayPath(s);
    expect(outcome).toEqual({ placed: false, notice: PAYMENT_DECLINED_NOTICE, charged: false });
    expect(ran).toEqual(["prepare", "confirm"]);
  });

  it("reads every type that means the card was judged as a decline", async () => {
    for (const type of ["card_error", "validation_error", "invalid_request_error"]) {
      const { steps: s } = steps({ confirm: async () => ({ error: { type } }) });
      expect({ type, outcome: await runPayPath(s) }).toEqual({
        type,
        outcome: { placed: false, notice: PAYMENT_DECLINED_NOTICE, charged: false },
      });
    }
  });
});

describe("when Stripe's answer does not say whether the card was charged", () => {
  // H3's review: an `api_connection_error` can follow a confirmation that
  // reached Stripe, so "not charged" would be a claim the page cannot know.
  it("claims nothing about the card, and keeps the control off", async () => {
    for (const type of ["api_connection_error", "api_error", "some_future_type", undefined]) {
      const { steps: s, ran } = steps({ confirm: async () => ({ error: { type, message: STRIPE } }) });
      expect({ type, outcome: await runPayPath(s) }).toEqual({
        type,
        outcome: { placed: false, notice: PAYMENT_UNKNOWN_NOTICE, charged: true },
      });
      expect(ran).not.toContain("complete");
    }
  });

  it("reads a rejected confirmation the same way, whatever was thrown", async () => {
    for (const thrown of [new Error(STRIPE), null, undefined]) {
      const { steps: s, ran } = steps({
        confirm: async () => {
          throw thrown;
        },
      });
      expect(await runPayPath(s)).toEqual({ placed: false, notice: PAYMENT_UNKNOWN_NOTICE, charged: true });
      expect(ran).toEqual(["prepare", "confirm"]);
    }
  });

  it("tells the buyer not to pay again", () => {
    expect(PAYMENT_UNKNOWN_NOTICE).toMatch(/Do not pay again/);
    expect(PAYMENT_UNKNOWN_NOTICE).not.toMatch(/try again|not charged/i);
  });
});

describe("when Stripe's error carries the PaymentIntent", () => {
  // The review of H3's fixes: confirming an intent that already succeeded
  // answers `invalid_request_error`, and "not charged" would then be false.
  it("believes the intent over the type", async () => {
    for (const [status, notice, charged] of [
      ["succeeded", PAYMENT_UNCONFIRMED_NOTICE, true],
      ["requires_capture", PAYMENT_UNCONFIRMED_NOTICE, true],
      ["processing", PAYMENT_UNKNOWN_NOTICE, true],
      ["requires_payment_method", PAYMENT_DECLINED_NOTICE, false],
    ] as const) {
      const { steps: s, ran } = steps({
        confirm: async () => ({ error: { type: "invalid_request_error", payment_intent: { status } } }),
      });
      expect({ status, outcome: await runPayPath(s) }).toEqual({ status, outcome: { placed: false, notice, charged } });
      expect(ran).not.toContain("complete");
    }
  });
});

describe("when Stripe refused the request itself", () => {
  it("says nothing was charged, which is true, and allows another try", async () => {
    for (const type of ["rate_limit_error", "authentication_error", "idempotency_error"]) {
      const { steps: s } = steps({ confirm: async () => ({ error: { type } }) });
      expect({ type, outcome: await runPayPath(s) }).toEqual({
        type,
        outcome: { placed: false, notice: PAYMENT_NOT_STARTED_NOTICE, charged: false },
      });
    }
  });
});

describe("after the card is accepted", () => {
  it("says so, tells the buyer not to pay again, and keeps the control off", async () => {
    const { steps: s } = steps({
      complete: async () => {
        throw new Error(MEDUSA);
      },
    });
    expect(await runPayPath(s)).toEqual({ placed: false, notice: PAYMENT_UNCONFIRMED_NOTICE, charged: true });
  });

  it("borrows the reassurance and not the invitation to try again", () => {
    // `SHIPPING_UNAVAILABLE_NOTICE` ends "Try again shortly". After a charge
    // that is an instruction to be charged twice.
    expect(PAYMENT_UNCONFIRMED_NOTICE).toMatch(/Do not pay again/);
    expect(PAYMENT_UNCONFIRMED_NOTICE).not.toMatch(/try again/i);
  });
});

describe("when nothing fails", () => {
  it("places the order", async () => {
    const { steps: s, ran } = steps();
    expect(await runPayPath(s)).toEqual({ placed: true, orderId: "order_1" });
    expect(ran).toEqual(["prepare", "confirm", "complete"]);
  });
});

describe("the charged lock", () => {
  const open = { stripeReady: true, submitting: false, consented: true };

  it("keeps the control off and refuses a submit once the card was accepted", () => {
    expect(payDisabled({ ...open, charged: true })).toBe(true);
    expect(paySubmitBlocked({ ...open, charged: true })).toBe(true);
  });

  it("changes nothing for a caller that does not pass it", () => {
    expect(payDisabled(open)).toBe(false);
    expect(paySubmitBlocked(open)).toBe(false);
  });
});

describe("the checkout, as it uses all this", () => {
  // Source matches, for `GiftAddressNote`'s reason in `checkout-address.test.ts`:
  // the states they wire are unreachable in a `node` render. The behaviour is
  // asserted above; these assert only that the form is connected to it.
  const source = readFileSync(new URL("../src/app/checkout/PaymentForm.tsx", import.meta.url), "utf8");

  it("renders no thrown or Stripe message anywhere", () => {
    // The two ways upstream wording reached the page: a caught error's
    // message, and Stripe's `confirmation.error.message`.
    expect(source).not.toMatch(/(thrown|error)\??\.message/);
  });

  it("renders the outcome's notice and holds its charge", () => {
    expect(source).toMatch(/const outcome = await runPayPath\(\{/);
    expect(source).toMatch(/setError\(outcome\.notice\);\s*setCharged\(outcome\.charged\);/);
  });

  it("gives both gates the charge, and stops quoting after one", () => {
    expect(source.match(/consentRequired: needsConsent,\s*charged,/g)).toHaveLength(2);
    expect(source).toMatch(/if \(submitting \|\| orderId !== null \|\| charged\) return;/);
  });

  it("says nothing was charged when the payment cannot start", () => {
    expect(source.match(/setError\(PAYMENT_NOT_STARTED_NOTICE\)/g)).toHaveLength(2);
  });
});

/**
 * LD-11 H5: a checkout that already holds a Stripe session asks whether its
 * card was charged before making another. Medusa's session status stays
 * `pending` until Medusa authorises, so only Stripe can say.
 */
describe("the prior session's intent", () => {
  function prior(status: string | Error, completeFails = false) {
    const completed: string[] = [];
    return {
      completed,
      run: () =>
        checkPriorPayment({
          retrieveStatus: async () => {
            if (status instanceof Error) throw status;
            return status;
          },
          complete: async () => {
            completed.push("complete");
            if (completeFails) throw new Error(MEDUSA);
            return { orderId: "order_1" };
          },
        }),
    };
  }

  it("completes a charged one instead of replacing it", async () => {
    for (const status of ["succeeded", "requires_capture"]) {
      const p = prior(status);
      expect({ status, outcome: await p.run() }).toEqual({ status, outcome: { kind: "placed" } });
      expect(p.completed).toEqual(["complete"]);
    }
  });

  it("says the card was accepted when that completion fails, never 'nothing charged'", async () => {
    const p = prior("succeeded", true);
    expect(await p.run()).toEqual({ kind: "notice", notice: PAYMENT_UNCONFIRMED_NOTICE });
  });

  it("claims nothing about the card while Stripe is still processing", async () => {
    const p = prior("processing");
    expect(await p.run()).toEqual({ kind: "notice", notice: PAYMENT_UNKNOWN_NOTICE });
    expect(p.completed).toEqual([]);
  });

  it("claims nothing when Stripe cannot be asked", async () => {
    const p = prior(new Error("network"));
    expect(await p.run()).toEqual({ kind: "notice", notice: PAYMENT_UNKNOWN_NOTICE });
    expect(p.completed).toEqual([]);
  });

  it("lets an uncharged session be replaced as before", async () => {
    for (const status of ["requires_payment_method", "requires_confirmation", "requires_action", "canceled"]) {
      const p = prior(status);
      expect({ status, outcome: await p.run() }).toEqual({ status, outcome: { kind: "clear" } });
      expect(p.completed).toEqual([]);
    }
  });
});

describe("the checkout, as it asks before it replaces", () => {
  const form = readFileSync(new URL("../src/app/checkout/PaymentForm.tsx", import.meta.url), "utf8");
  const page = readFileSync(new URL("../src/app/checkout/page.tsx", import.meta.url), "utf8");

  it("hands the page's session secret to the form", () => {
    expect(page).toMatch(/priorClientSecret=\{cart\.stripeClientSecret\}/);
  });

  it("creates no collection, and so no session, until the prior intent is cleared", () => {
    expect(form).toMatch(/useEffect\(\(\) => \{\s*if \(priorCheck !== "clear"\) return;\s*if \(startedForCartRef\.current === cartId\) return;/);
    expect(form).toMatch(/\}, \[cartId, fetchJson, priorCheck\]\);/);
  });

  it("reloads onto the server's end state once, and only once", () => {
    expect(form).toMatch(/if \(url\.searchParams\.has\(PRIOR_COMPLETED_PARAM\)\) setError\(PAYMENT_UNCONFIRMED_NOTICE\);/);
    expect(form).toMatch(/url\.searchParams\.set\(PRIOR_COMPLETED_PARAM, "1"\);\s*window\.location\.replace\(url\.toString\(\)\);/);
    expect(form).toMatch(/\} else if \(outcome\.kind === "notice"\) setError\(outcome\.notice\);\s*else setPriorCheck\("clear"\);/);
  });

  it("checks once per mount, even when an effect runs twice", () => {
    expect(form).toMatch(/if \(priorClientSecret === null \|\| priorCheckStartedRef\.current\) return;\s*priorCheckStartedRef\.current = true;/);
  });

  it("announces a notice that replaces the form", () => {
    // Anchored on the assignment: `PayButton` renders its own alert with the
    // same markup, which an unanchored match would find instead.
    expect(form).toMatch(/paymentContent = \(\s*<p className="payment-error" role="alert">\s*\{error\}/);
  });
});

