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
  /**
   * The tier's own quotation. The row header links to it.
   *
   * Optional since LD-04 P9c, when the printed things had no pages and a link
   * to nothing was worse than a name that is not a link. **They have pages
   * now**, so the merch rows pass one; the field stays optional because a row
   * is not obliged to have somewhere to go.
   */
  readonly href?: string;
  readonly description: string;
  /**
   * A plainer line under the title, for a title that will not say what a
   * thing is.
   *
   * Optional, and absent on the certificate's own tiers: "Lousy Deal" and
   * "Lousy Deal Pro" describe themselves as well as anything could. The merch
   * titles are jokes -- "Certified Worthless" is a sticker -- and this is
   * where a buyer is told which object they are buying.
   */
  readonly subtitle?: string;
  /**
   * A photograph of the thing this row sells, beside its name.
   *
   * Only the merch rows carry one: `brand.md` §6's amendment admits a
   * photograph of "a good actually on sale" and of nothing else, and a
   * certificate is not a good — there is nothing to photograph.
   */
  readonly thumbnail?: string;
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

/**
 * The headings, as a parameter since LD-04 P9c.
 *
 * The merch upsell is the same table with different words in it — five
 * columns, the same stacked-below-640px behaviour, the same measured
 * accessibility decision about dropping the header row. A second table
 * component would be a second copy of all of that, and the two would drift.
 */
export function TierTable({
  rows,
  headings = TIER_TABLE_HEADINGS,
}: {
  readonly rows: readonly TierRow[];
  // The keys of the tier table's own headings, with the values widened to
  // `string`. `as const` makes `TIER_TABLE_HEADINGS` a type of five literals,
  // which no other set of five words satisfies -- and the point of the
  // parameter is that another set is passed.
  readonly headings?: Readonly<Record<keyof typeof TIER_TABLE_HEADINGS, string>>;
}) {
  return (
    <table className="tier-table">
      <thead>
        <tr>
          <th scope="col">{headings.item}</th>
          <th scope="col">{headings.description}</th>
          <th scope="col" data-align="figure">
            {headings.value}
          </th>
          <th scope="col" data-align="figure">
            {headings.price}
          </th>
          {/* The action column's heading is for a screen reader reaching the
              submit control; sighted readers get the button's own label. */}
          <th scope="col">
            <span className="visually-hidden">{headings.action}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            {/* `th scope="row"` rather than a fourth `td`: the tier name is
                what the other four cells are about, and a screen reader
                reading a cell out of order gets told which row it is in. */}
            <th scope="row" data-label={headings.item}>
              {/* Empty `alt`: the name is right beside it in the same cell, so
                  announcing the picture too would read the row twice. The
                  dimensions are fixed because every one of these is square --
                  the browser reserves the space and the table does not jump. */}
              {row.thumbnail === undefined ? null : (
                <img className="cell-thumbnail" src={row.thumbnail} alt="" width={64} height={64} />
              )}
              <span className="cell-value">
                {row.href === undefined ? row.title : <a href={row.href}>{row.title}</a>}
              </span>
              {/* Inside the same `th`, so a screen reader reading the row
                  header gets "Certified Worthless, Sticker" as one label
                  rather than leaving the object unnamed. */}
              {row.subtitle === undefined ? null : <span className="cell-kind">{row.subtitle}</span>}
            </th>
            <Cell label={headings.description}>{row.description}</Cell>
            <Cell label={headings.value} align="figure">
              {row.value}
            </Cell>
            <Cell label={headings.price} align="figure">
              {row.price}
            </Cell>
            <td className="tier-action">{row.action}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
