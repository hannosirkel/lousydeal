/**
 * The one place a price becomes a string.
 *
 * **The unit is not obvious and has been got wrong in this codebase's
 * neighbourhood before, so it is stated here.** Medusa is seeded with
 * `amount: record.amountMinor / 100` (`backend/src/scripts/seed-product.ts:122`),
 * so a five-dollar tier is stored and returned as `5`, not as a count of
 * cents. Every number this module formats -- `Tier.amount` from `listTiers`,
 * `total` from `getCheckoutCart` -- is a **major-unit decimal**, carried
 * through from the Store API without conversion.
 *
 * `Intl.NumberFormat` is deliberately not used. Its output varies with the
 * runtime's ICU data and the ambient locale, and `docs/current/brand.md` §3
 * asks for one figure shape site-wide, set in tabular numerals in a column
 * beside another figure. A price that renders with a leading symbol on one
 * machine and a trailing one on another is a §23 problem, not a cosmetic one.
 */

/** Grouped to three digits, always two decimal places, no locale involved. */
function groupThousands(whole: string): string {
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Formats a major-unit amount for display.
 *
 * `usd` is the only currency this store prices in (decision `007`), and it is
 * the only one that gets a symbol. Anything else renders with its ISO code
 * rather than a guessed symbol: showing the wrong currency's symbol on a price
 * is exactly the kind of dishonest checkout contract §23 forbids, and a throw
 * here would take out a page over a condition no configuration can currently
 * produce.
 */
export function formatMoney(amount: number, currencyCode: string): string {
  if (!Number.isFinite(amount)) throw new Error(`cannot format a non-finite amount: ${String(amount)}`);

  const negative = amount < 0;
  const [whole = "0", fraction = "00"] = Math.abs(amount).toFixed(2).split(".");
  const figure = `${groupThousands(whole)}.${fraction}`;
  const sign = negative ? "-" : "";

  return currencyCode.toLowerCase() === "usd"
    ? `${sign}$${figure}`
    : `${sign}${figure} ${currencyCode.toUpperCase()}`;
}
