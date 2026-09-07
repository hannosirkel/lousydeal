"use server";

/**
 * The § 56⁴(3) confirmation control's server half.
 *
 * **This is a Server Action so that the page keeps working with scripting
 * off.** Next.js renders `<form action={submitWithdrawal}>` as a plain POST to
 * the page's own URL with a hidden action id, and runs the function on the
 * server whether or not the client ever executed JavaScript. That property is
 * the whole design of this route — V17 verified the three GET steps end to end
 * with curl — and it is the one route where losing it matters most, because
 * this is the page a buyer reaches when they want their money back.
 *
 * The two earlier steps stay GET. They transmit nothing, `searchParams`
 * carries the entered values between them, and a reload does not lose the
 * form. Only this step has an effect, which is why only this step is a POST:
 * § 56⁴(3) makes the confirmation control the thing that transmits, and a step
 * that transmitted on GET could be re-sent by a reload or a prefetch.
 *
 * **It never throws back to the buyer.** § 56(2¹) makes the withdrawal
 * effective when they sent it, so a backend that is unreachable has not undone
 * anything — but it does mean we hold no record, and saying otherwise would be
 * the trader claiming a receipt it does not have. The `record` parameter in
 * the redirect carries which of the three outcomes happened, and
 * `content/withdrawal.ts` has the wording for each.
 */

import { redirect } from "next/navigation";

import { WITHDRAWAL_FIELDS, WITHDRAWAL_RECORD_STATES } from "../../../content/withdrawal";
import { createStoreFetchJson } from "../../../lib/medusa-client";
import { requireStoreClientConfig } from "../../../lib/store-session";

interface WithdrawalResponse {
  readonly withdrawal?: { readonly received_at?: unknown; readonly receipt_sent?: unknown };
}

/**
 * Posts the withdrawal, then redirects to the record.
 *
 * The redirect is what makes the final step a URL the buyer can keep, reload
 * and print — § 56(2⁵) puts the burden of proving withdrawal on them, so the
 * record has to survive the back button. It is also what stops a refresh
 * re-sending the withdrawal, since the page it lands on is a GET.
 */
export async function submitWithdrawal(formData: FormData): Promise<void> {
  const value = (name: string): string => {
    const raw = formData.get(name);
    return typeof raw === "string" ? raw.trim() : "";
  };

  const entered = {
    consumerName: value(WITHDRAWAL_FIELDS.name.name),
    contractDetails: value(WITHDRAWAL_FIELDS.contract.name),
    contactAddress: value(WITHDRAWAL_FIELDS.contact.name),
  };

  const parameters = new URLSearchParams({ step: "done", ...entered });
  let state: string;
  let receivedAt = "";

  try {
    const response = await createStoreFetchJson(requireStoreClientConfig())<WithdrawalResponse>("/store/withdrawals", {
      method: "POST",
      body: JSON.stringify(entered),
      headers: { "content-type": "application/json" },
    });
    const withdrawal = response.withdrawal ?? {};
    if (typeof withdrawal.received_at === "string") receivedAt = withdrawal.received_at;
    state = withdrawal.receipt_sent === true ? WITHDRAWAL_RECORD_STATES.sent : WITHDRAWAL_RECORD_STATES.received;
  } catch {
    // Deliberately swallowed. The buyer gets the `unrecorded` wording, which
    // tells them plainly that we may not hold this and what to do about it --
    // an error page would leave them believing nothing happened at all, when
    // § 56(2¹) says something did.
    state = WITHDRAWAL_RECORD_STATES.unrecorded;
  }

  parameters.set("record", state);
  if (receivedAt.length > 0) parameters.set("at", receivedAt);
  redirect(`/legal/withdraw?${parameters.toString()}`);
}
