/**
 * The signature component: label left, dotted leader across the middle, value
 * right in tabular numerals. `docs/current/brand.md` §3.
 *
 * **The leader is drawn, not typed.** It is a `border-bottom: dotted` on a
 * pseudo-element that grows to fill the gap, so a screen reader reads
 * "PRICE, five dollars" rather than a label followed by forty full stops. A
 * row of literal dots is how this pattern is usually built, and it is
 * unreadable aloud.
 *
 * **A `<dl>`, not a table and not divs.** Each row is a term and its
 * description, which is what a definition list is for; `<div>` between `<dl>`
 * and `<dt>`/`<dd>` is explicitly allowed by HTML and is what lets one row be
 * one flex container.
 */

import type { ReactNode } from "react";

export function Ledger({ children }: { readonly children: ReactNode }) {
  return <dl className="ledger">{children}</dl>;
}

export interface LedgerRowProps {
  readonly label: ReactNode;
  readonly value: ReactNode;
  /**
   * `--stamp` is the only accent, and `brand.md` §3 spends it on negative
   * figures among four other things. A row asking for it is saying the figure
   * is bad news, not that it wants attention.
   */
  readonly tone?: "ink" | "stamp";
  /**
   * The display step, for the one figure a page is allowed to shout — a
   * serial, a price, `-100%`. `brand.md` §3 says at most one per page, which
   * no code here can enforce; it is a review question, like the stamp mark.
   */
  readonly scale?: "body" | "display";
}

export function LedgerRow({ label, value, tone = "ink", scale = "body" }: LedgerRowProps) {
  const valueClass = ["ledger-value", tone === "stamp" ? "is-stamp" : "", scale === "display" ? "is-display" : ""]
    .filter((name) => name !== "")
    .join(" ");

  return (
    <div className="ledger-row">
      <dt className="ledger-label">{label}</dt>
      <dd className={valueClass}>{value}</dd>
    </div>
  );
}
