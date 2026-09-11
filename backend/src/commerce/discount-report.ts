/**
 * A read-only count of surcharge-bearing carts and orders.
 *
 * A surcharge is identified by its missing variant, never by visitor-writable
 * metadata. Metadata decides only which safe, committed bucket receives an
 * entity that has exactly one surcharge line.
 */

import { normalizeSurchargeCode, SURCHARGE_CODES } from "./surcharge";

export const UNKNOWN_DISCOUNT_CODE = "unknown code";

export interface DiscountQueryLine {
  readonly variant_id?: unknown;
  readonly metadata?: unknown;
}

export interface DiscountQueryEntity {
  readonly id?: unknown;
  readonly items?: readonly (DiscountQueryLine | null)[] | null;
}

export interface DiscountReportRow {
  readonly code: string;
  readonly carts: number;
  readonly paidOrders: number;
  /** Paid orders divided by carts, or null when there is no denominator. */
  readonly conversion: number | null;
}

export interface DiscountReport {
  readonly cartsWithCode: number;
  readonly rows: readonly DiscountReportRow[];
}

export type DiscountReportEnvironment = "test" | "live";

const COMMITTED_CODES = new Set(SURCHARGE_CODES.map(({ code }) => code));

function codeBucket(entity: DiscountQueryEntity): string | null {
  const surchargeLines = (entity.items ?? []).filter((line) => line?.variant_id === null);
  if (surchargeLines.length === 0) return null;
  if (surchargeLines.length !== 1) return UNKNOWN_DISCOUNT_CODE;

  const metadata = surchargeLines[0]?.metadata;
  if (typeof metadata !== "object" || metadata === null) return UNKNOWN_DISCOUNT_CODE;

  const code = (metadata as { readonly code?: unknown }).code;
  if (typeof code !== "string") return UNKNOWN_DISCOUNT_CODE;

  const normalized = normalizeSurchargeCode(code);
  return COMMITTED_CODES.has(normalized) ? normalized : UNKNOWN_DISCOUNT_CODE;
}

function bucketCounts(entities: readonly DiscountQueryEntity[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const entity of entities) {
    const bucket = codeBucket(entity);
    if (bucket === null) continue;
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  return counts;
}

/** Count entity rows once each; carts and paid orders remain separate. */
export function discountReport(
  carts: readonly DiscountQueryEntity[],
  orders: readonly DiscountQueryEntity[],
): DiscountReport {
  const cartCounts = bucketCounts(carts);
  const orderCounts = bucketCounts(orders);
  const codes = [...SURCHARGE_CODES.map(({ code }) => code), UNKNOWN_DISCOUNT_CODE];

  return {
    cartsWithCode: [...cartCounts.values()].reduce((total, count) => total + count, 0),
    rows: codes.map((code) => {
      const cartCount = cartCounts.get(code) ?? 0;
      const paidOrders = orderCounts.get(code) ?? 0;
      return {
        code,
        carts: cartCount,
        paidOrders,
        conversion: cartCount === 0 ? null : paidOrders / cartCount,
      };
    }),
  };
}

function percentage(value: number | null): string {
  return value === null ? "n/a" : `${(value * 100).toFixed(1)}%`;
}

/** Render only fixed labels and counts; unknown visitor metadata never leaves the classifier. */
export function renderDiscountReport(
  report: DiscountReport,
  environment: DiscountReportEnvironment,
): readonly string[] {
  return [
    `Environment: ${environment} (operator supplied; this command reads the connected runtime database)`,
    "Baldrick discount requests: not measured (the operator chose no Baldrick network call or analytics)",
    `Carts holding a surcharge/code line: ${String(report.cartsWithCode)} cart(s), not customers; includes incomplete carts`,
    ...report.rows.map(
      (row) =>
        `${row.code}: carts=${String(row.carts)} paid orders=${String(row.paidOrders)} conversion=${percentage(row.conversion)}`,
    ),
    "Read-only operator report: not public; feeds no counter; schedules nothing",
  ];
}
