/**
 * The body of a tier's quotation, per `docs/current/brand.md` §4.
 *
 * Separated from the route for the reason V4 separated `TierTable`: a route is
 * an async Server Component awaiting `connection()` and `cookies()`, so
 * nothing it renders can be asserted without a request. Everything here is
 * pure props, so the suite renders it with `renderToStaticMarkup` and checks
 * what a reader actually gets — that VALUE is nothing rather than the price,
 * that the upgrade list is ledger rows, that the empty branch says there is
 * nothing further to pay for.
 */

import type { ReactNode } from "react";

import {
  DEAL_LABELS,
  NO_UPGRADES_LINE,
  OFFER_RETURN,
  UPGRADES_LINE,
  UPGRADES_TITLE,
  WITHDRAWAL_NOTICE,
} from "../../content/deal";
import { FinePrint } from "./FinePrint";
import { Ledger, LedgerRow } from "./LedgerRow";
import { Rule } from "./Rule";

/** One upgrade, already formatted and already given its route. */
export interface UpgradeRow {
  readonly id: string;
  readonly title: string;
  readonly price: string;
  readonly href: string;
}

export interface QuotationProps {
  readonly title: string;
  readonly price: string;
  /** Formatted, not typed: `brand.md` §4's VALUE column is nothing, in the same currency. */
  readonly value: string;
  /** The `OrderForm` the route builds, because only a route may define a Server Action. */
  readonly action: ReactNode;
  readonly upgrades: readonly UpgradeRow[];
}

export function Quotation({ title, price, value, action, upgrades }: QuotationProps) {
  return (
    <>
      <Ledger>
        <LedgerRow label={DEAL_LABELS.item} value={title} />
        <LedgerRow label={DEAL_LABELS.price} value={price} />
        <LedgerRow label={DEAL_LABELS.value} value={value} />
        <LedgerRow label={DEAL_LABELS.return} value={OFFER_RETURN} tone="stamp" />
      </Ledger>

      {action}

      <Rule />
      {upgrades.length === 0 ? (
        // No heading here: a document that says UPGRADES AVAILABLE directly
        // above a line saying there are none is inaccurate, and in this
        // identity accuracy is what carries the joke.
        <p>{NO_UPGRADES_LINE}</p>
      ) : (
        <>
          <h2>{UPGRADES_TITLE}</h2>
          <p>{UPGRADES_LINE}</p>
          <Ledger>
            {upgrades.map((upgrade) => (
              <LedgerRow key={upgrade.id} label={<a href={upgrade.href}>{upgrade.title}</a>} value={upgrade.price} />
            ))}
          </Ledger>
        </>
      )}

      <Rule />
      <FinePrint>{WITHDRAWAL_NOTICE}</FinePrint>
    </>
  );
}
