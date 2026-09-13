/**
 * The § 56⁴ withdrawal function.
 *
 * Two steps, because the statute is two controls: § 56⁴(1)'s withdrawal button
 * leading to a form, and § 56⁴(3)'s confirmation button that transmits it.
 * They are two server round-trips rather than one page with a disclosure, so
 * "nothing has been sent yet" is true rather than asserted.
 *
 * **It works without JavaScript**, like every other route here except the card
 * form. Both steps are plain form posts, and the whole exchange survives with
 * scripting off — which matters more here than anywhere else on the site,
 * because this is the page a buyer reaches when they want their money back.
 *
 * `searchParams` carries the entered values between the two steps rather than
 * a cookie or a session: there is nothing to protect — the consumer is
 * volunteering these to us — and a stateless step means a reload does not lose
 * the form.
 *
 * **C14 made the third step transmit.** It was a GET that recorded nothing,
 * which was right while there was no mail to send. It is now a Server Action
 * that posts to `POST /store/withdrawals`, and Next.js runs one with scripting
 * off — the form degrades to a plain POST to this URL. The two earlier steps
 * are still GET because they still transmit nothing, and a step with an effect
 * must not be re-runnable by a reload or a link prefetch.
 *
 * The action redirects back here with `record=` naming which of three things
 * happened, so what a buyer reads about their own withdrawal is decided by
 * what the server actually did rather than by what the page hoped.
 */

import type { Metadata } from "next";
import { connection } from "next/server";

import { Button } from "../../../components/document/Button";
import { DocumentFrame } from "../../../components/document/DocumentFrame";
import { FinePrint } from "../../../components/document/FinePrint";
import { Rule } from "../../../components/document/Rule";
import {
  WITHDRAWAL_BUTTON_LABEL,
  WITHDRAWAL_CONFIRM_INTRO,
  WITHDRAWAL_CONFIRM_LABEL,
  WITHDRAWAL_DOCUMENT,
  WITHDRAWAL_DONE_LINES,
  WITHDRAWAL_DONE_TITLE,
  WITHDRAWAL_FIELDS,
  WITHDRAWAL_INTRO,
  WITHDRAWAL_RECORD_LINES,
  WITHDRAWAL_RECORD_STATES,
} from "../../../content/withdrawal";
import { submitWithdrawal } from "./actions";

type WithdrawalSearchParams = Record<string, string | string[] | undefined>;

export async function generateMetadata({
  searchParams,
}: {
  readonly searchParams: Promise<WithdrawalSearchParams>;
}): Promise<Metadata> {
  const parameters = await searchParams;
  const carriesQueryState = Object.keys(parameters).length > 0;
  return {
    title: WITHDRAWAL_DOCUMENT.title,
    alternates: { canonical: "/legal/withdraw" },
    ...(carriesQueryState ? { robots: { index: false, follow: false } } : {}),
  };
}

const one = (value: string | string[] | undefined): string =>
  (Array.isArray(value) ? value[0] : value) ?? "";

export default async function WithdrawPage({
  searchParams,
}: {
  readonly searchParams: Promise<WithdrawalSearchParams>;
}) {
  await connection();
  const params = await searchParams;
  const step = one(params.step);
  const entered = {
    consumerName: one(params[WITHDRAWAL_FIELDS.name.name]),
    contractDetails: one(params[WITHDRAWAL_FIELDS.contract.name]),
    contactAddress: one(params[WITHDRAWAL_FIELDS.contact.name]),
  };
  const receivedAt = one(params.at);
  // Anything that is not one of the three known states is treated as the
  // weakest of them. A hand-edited URL claiming `record=sent` should not make
  // this page assert a receipt exists, and the honest default when we cannot
  // tell is that we may hold nothing.
  const record = one(params.record);
  const recordState: keyof typeof WITHDRAWAL_RECORD_LINES =
    record === WITHDRAWAL_RECORD_STATES.sent || record === WITHDRAWAL_RECORD_STATES.received
      ? record
      : WITHDRAWAL_RECORD_STATES.unrecorded;

  return (
    <main>
      <DocumentFrame
        title={step === "done" ? WITHDRAWAL_DONE_TITLE : WITHDRAWAL_DOCUMENT.title}
        form={WITHDRAWAL_DOCUMENT.form}
        revision={WITHDRAWAL_DOCUMENT.revision}
      >
        {step === "done" ? (
          <>
            <dl className="withdrawal-record">
              {Object.values(WITHDRAWAL_FIELDS).map((field) => (
                <div key={field.name}>
                  <dt>{field.label}</dt>
                  <dd>{one(params[field.name])}</dd>
                </div>
              ))}
              {/* The server's own receipt time, not the browser's clock: this
                  is what § 56¹(1)'s 14 days are counted from, and the two
                  copies of the record have to agree. Absent when the request
                  never reached us, which is the one case where we have no
                  time to state. */}
              {receivedAt.length > 0 ? (
                <div>
                  <dt>Received</dt>
                  <dd>{`${receivedAt.slice(0, 10)} ${receivedAt.slice(11, 16)} UTC`}</dd>
                </div>
              ) : null}
            </dl>
            <Rule />
            {WITHDRAWAL_DONE_LINES.map((line) => (
              <p key={line}>{line}</p>
            ))}
            <p>{WITHDRAWAL_RECORD_LINES[recordState]}</p>
          </>
        ) : step === "confirm" ? (
          <>
            <p className="notice">{WITHDRAWAL_CONFIRM_INTRO}</p>
            <dl className="withdrawal-record">
              {Object.values(WITHDRAWAL_FIELDS).map((field) => (
                <div key={field.name}>
                  <dt>{field.label}</dt>
                  <dd>{one(params[field.name])}</dd>
                </div>
              ))}
            </dl>
            {/* § 56⁴(3): the confirmation control, and the only one that
                transmits. A Server Action rather than a GET, because C14 gave
                it an effect -- it posts the withdrawal and sends the § 56⁴(4)
                receipt. Next.js degrades this to a plain POST with scripting
                off, and the action redirects to a GET, so the record is still
                a URL the buyer can keep and a reload cannot re-send it. */}
            <form action={submitWithdrawal}>
              {Object.values(WITHDRAWAL_FIELDS).map((field) => (
                <input key={field.name} type="hidden" name={field.name} value={one(params[field.name])} />
              ))}
              <button type="submit" className="button">
                {WITHDRAWAL_CONFIRM_LABEL}
              </button>
            </form>
            <Button variant="secondary" href="/legal/withdraw">
              Change something
            </Button>
          </>
        ) : (
          <>
            {WITHDRAWAL_INTRO.map((line) => (
              <p key={line}>{line}</p>
            ))}
            {/* § 56⁴(2): name, details identifying the contract, and an
                electronic address for the receipt. Nothing else is asked. */}
            <form action="/legal/withdraw" method="GET">
              <input type="hidden" name="step" value="confirm" />
              {Object.values(WITHDRAWAL_FIELDS).map((field) => (
                <p className="field" key={field.name}>
                  <label htmlFor={field.name}>{field.label}</label>
                  <input
                    id={field.name}
                    name={field.name}
                    type={field.name === WITHDRAWAL_FIELDS.contact.name ? "email" : "text"}
                    defaultValue={entered[field.name as keyof typeof entered]}
                    required
                  />
                </p>
              ))}
              <button type="submit" className="button">
                {WITHDRAWAL_BUTTON_LABEL}
              </button>
            </form>
          </>
        )}
        <FinePrint>
          Refunds and withdrawal explains the right this exercises: <a href="/legal/refunds">Refunds and withdrawal</a>.
        </FinePrint>
      </DocumentFrame>
    </main>
  );
}
