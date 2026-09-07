/**
 * `GET /store/deals/totals` — how many lousy deals there are, and what they
 * came to.
 *
 * Contract §11 names three: "total number of lousy deals", "total nominal
 * amount spent on lousy deals", "latest deal number". It also says, in the same
 * section, "do not fabricate customers, transaction totals, testimonials, or
 * reviews", and `AGENTS.md` puts it more sharply: a public counter reports real
 * orders or does not ship. `brand.md` §4 recorded the same rule as a deferral —
 * "it arrives with LD-02, wired to real orders, or it does not arrive".
 *
 * So every figure here is computed from the `lousy_deal` table and from
 * nothing else. There is no floor, no offset, no seeded starting value, and no
 * rounding up.
 *
 * **A hidden certificate still counts.** §5 lets an operator hide one without a
 * new serial and without reissuing; that is a decision about a *page*, not a
 * claim that the sale did not happen. Excluding it would make the count
 * disagree with the serial sequence and would understate real orders, which is
 * the same offence as overstating them in the other direction.
 *
 * **This reads every row.** At the volumes a counter like this exists for that
 * is cheap, and the honest thing is to say where the bound is rather than to
 * imply there is none: the row that finds this slow should replace it with a
 * SQL aggregate, and the number that makes it slow is thousands, not hundreds.
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import { DEAL_MODULE } from "../../../../modules/deal";

interface CountedDeal {
  readonly serial: number;
  readonly amount_paid: number;
  readonly currency_code: string;
}

interface DealLister {
  listLousyDeals(filters: Record<string, never>): Promise<CountedDeal[]>;
}

export interface DealTotals {
  readonly count: number;
  /** Major units, summed as stored. `null` when there is nothing to sum. */
  readonly amount: number | null;
  /** `null` when there are no deals — there is no currency to name. */
  readonly currency_code: string | null;
  /** The highest serial issued, or `null`. Never a count in disguise: a gap makes them differ. */
  readonly latest_serial: number | null;
}

/**
 * The three figures, from the rows.
 *
 * **`latest_serial` is the maximum, not the count.** They are equal today and
 * need not stay so: a rolled-back insert consumes a sequence number, so one gap
 * makes the highest serial exceed the number of deals. Reporting the count as
 * the latest number would then overstate the last certificate's name, and
 * reporting the maximum as the count would overstate volume — §11 forbids the
 * second and honesty forbids the first.
 */
export function dealTotals(deals: readonly CountedDeal[]): DealTotals {
  if (deals.length === 0) {
    return { count: 0, amount: null, currency_code: null, latest_serial: null };
  }

  return {
    count: deals.length,
    amount: deals.reduce((total, deal) => total + deal.amount_paid, 0),
    // Every deal on this deployment is priced in the store's one currency
    // (decision `007`). Taken from the rows rather than assumed, so a future
    // second currency shows up as a wrong-looking total rather than as a
    // confidently mislabelled one.
    currency_code: deals[0]?.currency_code ?? null,
    latest_serial: deals.reduce((highest, deal) => Math.max(highest, deal.serial), 0),
  };
}

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const deals = req.scope.resolve(DEAL_MODULE) as DealLister;
  res.json({ totals: dealTotals(await deals.listLousyDeals({})) });
}
