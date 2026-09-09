/**
 * What has been sold this year, against the two ceilings decision `013`
 * watches.
 *
 * **Not a job and not an alert.** It is a command an operator runs, and that
 * is deliberate: a scheduled warning nobody reads is worse than a number
 * somebody asks for, and the failure this guards against — Union turnover
 * reaching €100,000 without anybody noticing — is one that develops over
 * months rather than minutes.
 *
 * It reads orders and reports. It writes nothing, and it decides nothing.
 */

import type { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { EU_MEMBER_STATE_CODES } from "../commerce/tax-model";
import { foreignCurrencies, thresholdReport, type CountedOrder } from "../commerce/vat-thresholds";

interface QueriedOrder {
  readonly total?: unknown;
  readonly currency_code?: unknown;
  readonly created_at?: unknown;
  readonly shipping_address?: { readonly country_code?: unknown } | null;
}

/**
 * The order's total as a number.
 *
 * Medusa carries money as a `BigNumber`-ish shape and `order-placed.ts`
 * records the same trap: a `.numeric` field, a `valueOf`, or a plain number
 * depending on where it came from. An unreadable total is **skipped and
 * counted**, never treated as zero — a zero silently understates the one
 * threshold that ends the scheme.
 */
function amount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "object" && value !== null) {
    const numeric = (value as { readonly numeric?: unknown }).numeric;
    if (typeof numeric === "number" && Number.isFinite(numeric)) return numeric;
    const valued = (value as { valueOf(): unknown }).valueOf();
    if (typeof valued === "number" && Number.isFinite(valued)) return valued;
  }
  return null;
}

export function countedOrders(orders: readonly QueriedOrder[]): {
  readonly counted: CountedOrder[];
  readonly unreadable: number;
} {
  const counted: CountedOrder[] = [];
  let unreadable = 0;

  for (const order of orders) {
    const total = amount(order.total);
    const placedAt = order.created_at instanceof Date ? order.created_at : new Date(String(order.created_at));
    const currencyCode = typeof order.currency_code === "string" ? order.currency_code : null;

    if (total === null || currencyCode === null || Number.isNaN(placedAt.getTime())) {
      unreadable += 1;
      continue;
    }

    const country = order.shipping_address?.country_code;
    counted.push({
      total,
      currencyCode,
      destinationCountry: typeof country === "string" ? country : null,
      placedAt,
    });
  }

  return { counted, unreadable };
}

export default async function reportVatThresholds({ container, args }: ExecArgs): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  // The year is an argument with today's as the default, so last year's figure
  // — which is what decides whether the scheme survives into this one — can be
  // asked for without editing anything.
  const year = Number(args[0] ?? new Date().getUTCFullYear());
  if (!Number.isInteger(year)) {
    logger.error(`report:vat-thresholds takes a four-digit year; got ${String(args[0])}`);
    return;
  }

  const { data } = await query.graph({
    entity: "order",
    fields: ["id", "total", "currency_code", "created_at", "shipping_address.country_code"],
    filters: {},
  });

  const { counted, unreadable } = countedOrders(data as QueriedOrder[]);
  const storeCurrency = counted[0]?.currencyCode ?? "usd";
  const report = thresholdReport(counted, EU_MEMBER_STATE_CODES, year, storeCurrency);
  const foreign = foreignCurrencies(counted, storeCurrency);

  logger.info(
    `VAT thresholds ${String(report.year)}: union=${report.unionTurnover.toFixed(2)} ` +
      `latvia=${report.latvianSupplies.toFixed(2)} ${report.currencyCode.toUpperCase()} ` +
      `across ${String(report.orders)} order(s)`,
  );
  // Said every time rather than only when it matters: a figure compared
  // against a ceiling in another currency is a figure whose comparison has an
  // assumption in it, and the operator reading it should see the assumption.
  logger.info(
    `Ceilings are 100000 EUR (Union) and 50000 EUR (Latvia). The totals above are in ` +
      `${report.currencyCode.toUpperCase()} and are not converted; the comparison warns early while a unit of it ` +
      `is worth less than a euro. Latvian supplies count every order delivered to Latvia, whatever Printful ` +
      `printed it in, which over-counts rather than under-counts.`,
  );

  if (unreadable > 0) {
    logger.error(`${String(unreadable)} order(s) could not be read and are not in these figures`);
  }
  if (foreign.length > 0) {
    logger.error(`orders in ${foreign.join(", ")} are counted at face value and not converted`);
  }
  for (const crossing of report.crossed) logger.error(crossing);
}
