/**
 * The two figures decision `013` says are watched rather than discovered.
 *
 * The small-enterprise scheme (KMS § 19¹) is what lets a Latvia-dispatched,
 * Latvia-delivered sale be exempt without a Latvian registration, and it ends
 * the moment Union turnover reaches **€100,000**. Crossing that must reach
 * EMTA within 15 working days and costs the scheme for the following year —
 * so it is the kind of number a shop finds out about from a letter if nobody
 * is counting.
 *
 * **§11 applies to a number the operator acts on exactly as it applies to one
 * a visitor reads.** So this counts orders and does not estimate: no forecast,
 * no run-rate, no projection to year end. What it reports is what has
 * happened.
 *
 * ## Two things it deliberately over-counts, and why that is the safe direction
 *
 * **Latvian supplies.** What the €50,000 national threshold measures is
 * supplies *located* in Latvia: dispatched from there **and** delivered there.
 * This counts every order delivered to Latvia, whatever Printful printed it
 * in — because the dispatch country is answered by the shipping quote and is
 * not stored on the order, and adding a column to store it is a row of its
 * own. Over-counting a threshold warns early. Under-counting it warns after
 * the letter.
 *
 * **The currency.** Prices are in the store's currency and the thresholds are
 * in euro, and converting between them needs an ECB rate for a stated date,
 * which is a figure this file does not have and will not invent. The totals
 * are reported in the store's own currency and compared against the euro
 * ceiling directly.
 *
 * That comparison warns **early** for as long as a unit of the store's
 * currency is worth less than a euro — a dollar total of 100,000 is under
 * €100,000 at any rate below parity. The assumption is stated here rather than
 * buried, because it is the one thing that could turn an early warning into a
 * late one: {@link ASSUMES_STORE_CURRENCY_AT_OR_BELOW_EURO}. Above parity the
 * report still counts correctly; it is the *ceiling* that would need
 * converting, and the operator is told which figure is which.
 */

/** KMS § 19¹ and Article 284(2): the Union-wide ceiling on the small-enterprise scheme. */
export const UNION_TURNOVER_CEILING_EUR = 100_000;

/** Latvia's own national threshold, which is what makes a Latvian domestic supply exempt. */
export const LATVIAN_DOMESTIC_CEILING_EUR = 50_000;

/**
 * Named so it can be cited, and so a reader knows the comparison rests on it.
 *
 * True while a dollar is worth less than a euro, which it has been throughout
 * this shop's life. It is not a rate and nothing computes with it.
 */
export const ASSUMES_STORE_CURRENCY_AT_OR_BELOW_EURO = true;

/** One order, in the fields the count reads. */
export interface CountedOrder {
  readonly total: number;
  readonly currencyCode: string;
  /** Where it went. `null` for an order with no address, which is a certificate. */
  readonly destinationCountry: string | null;
  readonly placedAt: Date;
}

export interface ThresholdReport {
  readonly year: number;
  readonly currencyCode: string;
  /** Supplies to EU member states, which is what the scheme's Union turnover measures. */
  readonly unionTurnover: number;
  /** Orders delivered to Latvia. See this file's head: an upper bound on Latvian domestic supplies. */
  readonly latvianSupplies: number;
  readonly orders: number;
  /** Ceilings reached or passed, worst first. Empty is the ordinary answer. */
  readonly crossed: readonly string[];
}

/**
 * Rounds to the cent, once, at the end.
 *
 * Summing tax-inclusive prices produces the same floating residue decision
 * `009` records on every tier — a figure ending `.000000000000001` in a report
 * an operator reads against a legal threshold is noise that looks like
 * precision.
 */
function cents(total: number): number {
  return Math.round(total * 100) / 100;
}

/**
 * What has been sold this year, against the two ceilings.
 *
 * The year is passed in rather than read from a clock: a report that changes
 * answer depending on when it runs cannot be checked, and both thresholds are
 * annual figures about a calendar year rather than a rolling window.
 *
 * An order in another currency is **counted and flagged**, not converted and
 * not dropped. Dropping it understates a threshold, which is the one
 * direction that matters; converting it needs a rate this does not have.
 */
export function thresholdReport(
  orders: readonly CountedOrder[],
  euMemberStates: readonly string[],
  year: number,
  storeCurrency: string,
): ThresholdReport {
  const members = new Set(euMemberStates.map((code) => code.toUpperCase()));
  const inYear = orders.filter((order) => order.placedAt.getUTCFullYear() === year);

  let unionTurnover = 0;
  let latvianSupplies = 0;

  for (const order of inYear) {
    const destination = order.destinationCountry?.trim().toUpperCase() ?? null;
    // **An order with no destination counts as domestic.** A certificate has
    // no address and is supplied where the trader is, which is Estonia and
    // therefore inside the Union figure. Leaving it out would understate the
    // one threshold that ends the scheme.
    const country = destination ?? "EE";
    if (!members.has(country)) continue;

    unionTurnover += order.total;
    if (country === "LV") latvianSupplies += order.total;
  }

  const crossed: string[] = [];
  if (cents(unionTurnover) >= UNION_TURNOVER_CEILING_EUR) {
    crossed.push(
      `Union turnover has reached the ${String(UNION_TURNOVER_CEILING_EUR)} EUR small-enterprise ceiling: ` +
        `report to EMTA within 15 working days, and the scheme is lost for the following year`,
    );
  }
  if (cents(latvianSupplies) >= LATVIAN_DOMESTIC_CEILING_EUR) {
    crossed.push(
      `Latvian supplies have reached the ${String(LATVIAN_DOMESTIC_CEILING_EUR)} EUR national threshold: ` +
        `a Latvia-dispatched, Latvia-delivered sale is no longer exempt without a Latvian registration`,
    );
  }

  return {
    year,
    currencyCode: storeCurrency,
    unionTurnover: cents(unionTurnover),
    latvianSupplies: cents(latvianSupplies),
    orders: inYear.length,
    crossed,
  };
}

/** Currencies present in the counted orders that are not the store's. Named so a report can say so. */
export function foreignCurrencies(orders: readonly CountedOrder[], storeCurrency: string): readonly string[] {
  const store = storeCurrency.toLowerCase();
  return [...new Set(orders.map((order) => order.currencyCode.toLowerCase()))].filter((code) => code !== store).sort();
}
