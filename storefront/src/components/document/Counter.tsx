/**
 * The public record: how many lousy deals, what they came to, and the last
 * number issued.
 *
 * Contract §11 names the three. `AGENTS.md` sets the condition they arrive
 * under — "a public counter reports real orders or does not ship" — so every
 * figure here comes from the deal table through `getDealTotals` and nothing on
 * this page invents one.
 *
 * **This component is never rendered when the figures could not be read.** The
 * page omits it entirely instead, because `0` and "could not ask" are different
 * claims and only one of them is a fact about the shop. That decision is the
 * caller's; this component's job is to render figures it was given.
 *
 * **Zero renders.** Most of this shop's life will be spent at zero, and a
 * counter that waits until it flatters is one that lies about its floor.
 */

import { COUNTER_LABELS, COUNTER_NONE_YET, COUNTER_TITLE } from "../../content/home";
import type { DealTotals } from "../../lib/store-deal";
import { formatSerial } from "../../lib/certificate-model";
import { formatMoney } from "../../lib/money";
import { Ledger, LedgerRow } from "./LedgerRow";

export function Counter({ totals }: { readonly totals: DealTotals }) {
  return (
    <section aria-labelledby="counter-title">
      <h2 id="counter-title">{COUNTER_TITLE}</h2>
      {totals.count === 0 ? (
        <p className="notice">{COUNTER_NONE_YET}</p>
      ) : (
        <Ledger>
          <LedgerRow label={COUNTER_LABELS.count} value={totals.count.toLocaleString("en-US")} />
          {/* The amount and the currency travel together or not at all: a
              figure with no currency beside it is a number pretending to be a
              total. Both are null only when there are no deals, which the
              branch above already took. */}
          {totals.amount !== null && totals.currencyCode !== null ? (
            <LedgerRow
              label={COUNTER_LABELS.amount}
              value={formatMoney(totals.amount, totals.currencyCode)}
              tone="stamp"
            />
          ) : null}
          {totals.latestSerial !== null ? (
            <LedgerRow label={COUNTER_LABELS.latest} value={formatSerial(totals.latestSerial)} />
          ) : null}
        </Ledger>
      )}
    </section>
  );
}
