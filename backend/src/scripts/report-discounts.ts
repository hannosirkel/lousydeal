/**
 * Operator-only discount reporting from the connected Medusa database.
 *
 * This command reads carts and orders, logs the report, and writes nothing.
 * Its required environment argument labels provenance only; database
 * selection remains the responsibility of the runtime invoking Medusa.
 */

import type { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, MathBN } from "@medusajs/framework/utils";

import {
  discountReport,
  renderDiscountReport,
  type DiscountQueryEntity,
  type DiscountReportEnvironment,
} from "../commerce/discount-report";

export const DISCOUNT_REPORT_USAGE_ERROR = "Usage: npm run report:discounts -- <test|live>";

function environmentFrom(args: readonly string[]): DiscountReportEnvironment {
  if (args.length !== 1 || (args[0] !== "test" && args[0] !== "live")) {
    throw new Error(DISCOUNT_REPORT_USAGE_ERROR);
  }
  return args[0];
}

const CART_REPORT_FIELDS = ["id", "items.variant_id", "items.metadata"] as const;
const ORDER_REPORT_FIELDS = [
  "id",
  "status",
  "is_draft_order",
  "items.variant_id",
  "items.metadata",
  "payment_collections.amount",
  "payment_collections.captured_amount",
] as const;

interface DiscountQueryOrder extends DiscountQueryEntity {
  readonly status?: unknown;
  readonly is_draft_order?: unknown;
  readonly payment_collections?:
    | readonly ({
        readonly amount?: unknown;
        readonly captured_amount?: unknown;
      } | null)[]
    | null;
}

/** Historical conversion: later refunds do not undo a completed capture. */
export function isPaidDiscountOrder(order: DiscountQueryOrder): boolean {
  if (order.is_draft_order === true || order.status === "draft") return false;
  if (!Array.isArray(order.payment_collections)) return false;

  try {
    const obligations = order.payment_collections.filter(
      (collection): collection is NonNullable<typeof collection> =>
        collection !== null && MathBN.gt(collection.amount, 0),
    );
    return (
      obligations.length > 0 &&
      obligations.every((collection) => MathBN.gte(collection.captured_amount, collection.amount))
    );
  } catch {
    return false;
  }
}

export default async function reportDiscounts({ container, args }: ExecArgs): Promise<void> {
  // Validate before resolving even the logger: a rejected invocation cannot
  // touch Medusa data or emit a partial report.
  const environment = environmentFrom(args);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  const { data: carts } = await query.graph({
    entity: "cart",
    fields: [...CART_REPORT_FIELDS],
    filters: {},
  });
  const { data: orders } = await query.graph({
    entity: "order",
    fields: [...ORDER_REPORT_FIELDS],
    filters: {},
  });

  const paidOrders = (orders as DiscountQueryOrder[]).filter(isPaidDiscountOrder);
  const report = discountReport(carts as DiscountQueryEntity[], paidOrders);
  for (const line of renderDiscountReport(report, environment)) logger.info(line);
}
