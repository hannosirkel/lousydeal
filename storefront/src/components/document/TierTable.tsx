/**
 * The three tiers as rows of one invoice-style table, per
 * `docs/current/brand.md` §4 — rows, not cards.
 *
 * **One markup tree, two layouts.** Below 640px the table becomes stacked
 * ledger blocks through CSS alone: `display: block` on the table parts, the
 * header row dropped, and each cell's label supplied by
 * `content: attr(data-label)`. Rendering a second tree for small screens would
 * duplicate every price in the DOM and read both to a screen reader.
 *
 * **The header row is dropped from the accessibility tree too, and that is the
 * point rather than an oversight.** `display: none` removes it from both.
 * Measured in Chromium at 390px: each cell's generated label is absorbed into
 * its accessible name, so a cell reads as its own label followed by its own
 * figure and a column header would be a second label for the same thing. At
 * 1200px the five `columnheader` nodes are present as usual. This was measured in Chromium only; Firefox and WebKit have
 * historically differed both on exposing generated content and on keeping
 * table roles under a changed `display`, so V15's Gate E should look again.
 *
 * The value is wrapped in a `<span>` so the collapsed view can order it after
 * the leader. `::before` and `::after` can both be flex items, but an
 * anonymous text run cannot be given an `order`, so without the span the
 * stacked row would read label, value, leader instead of label, leader, value.
 */

import type { ReactNode } from "react";

import { TIER_TABLE_HEADINGS } from "../../content/home";

export interface TierRow {
  readonly id: string;
  readonly title: string;
  /** The tier's own quotation. The row header links to it. */
  readonly href: string;
  readonly description: string;
  readonly value: string;
  readonly price: string;
  readonly variantId: string;
  readonly action: ReactNode;
}

/**
 * `align="figure"` rather than a stylesheet keyed on the heading text. The
 * headings live in `src/content/home.ts` precisely so they can be edited, and
 * a selector reading `[data-label="Price"]` silently un-aligns the column the
 * day someone rewords it.
 */
function Cell({
  label,
  align,
  children,
}: {
  readonly label: string;
  readonly align?: "figure";
  readonly children: ReactNode;
}) {
  return (
    <td data-label={label} data-align={align}>
      <span className="cell-value">{children}</span>
    </td>
  );
}

export function TierTable({ rows }: { readonly rows: readonly TierRow[] }) {
  return (
    <table className="tier-table">
      <thead>
        <tr>
          <th scope="col">{TIER_TABLE_HEADINGS.item}</th>
          <th scope="col">{TIER_TABLE_HEADINGS.description}</th>
          <th scope="col" data-align="figure">
            {TIER_TABLE_HEADINGS.value}
          </th>
          <th scope="col" data-align="figure">
            {TIER_TABLE_HEADINGS.price}
          </th>
          {/* The action column's heading is for a screen reader reaching the
              submit control; sighted readers get the button's own label. */}
          <th scope="col">
            <span className="visually-hidden">{TIER_TABLE_HEADINGS.action}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            {/* `th scope="row"` rather than a fourth `td`: the tier name is
                what the other four cells are about, and a screen reader
                reading a cell out of order gets told which row it is in. */}
            <th scope="row" data-label={TIER_TABLE_HEADINGS.item}>
              <span className="cell-value">
                <a href={row.href}>{row.title}</a>
              </span>
            </th>
            <Cell label={TIER_TABLE_HEADINGS.description}>{row.description}</Cell>
            <Cell label={TIER_TABLE_HEADINGS.value} align="figure">
              {row.value}
            </Cell>
            <Cell label={TIER_TABLE_HEADINGS.price} align="figure">
              {row.price}
            </Cell>
            <td className="tier-action">{row.action}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
