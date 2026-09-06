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
} from "../../../content/withdrawal";

export const metadata: Metadata = { title: WITHDRAWAL_DOCUMENT.title };

const one = (value: string | string[] | undefined): string =>
  (Array.isArray(value) ? value[0] : value) ?? "";

export default async function WithdrawPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const params = await searchParams;
  const step = one(params.step);
  const entered = {
    consumerName: one(params[WITHDRAWAL_FIELDS.name.name]),
    contractDetails: one(params[WITHDRAWAL_FIELDS.contract.name]),
    contactAddress: one(params[WITHDRAWAL_FIELDS.contact.name]),
  };

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
            </dl>
            <Rule />
            {WITHDRAWAL_DONE_LINES.map((line) => (
              <p key={line}>{line}</p>
            ))}
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
                transmits. GET so the record is a URL the buyer can keep. */}
            <form action="/legal/withdraw" method="GET">
              <input type="hidden" name="step" value="done" />
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
