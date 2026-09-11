/**
 * Operator-only discount reporting from the connected Medusa database.
 *
 * This command reads carts and orders, logs the report, and writes nothing.
 * Its required environment argument labels provenance only; database
 * selection remains the responsibility of the runtime invoking Medusa.
 */

import type { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

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

const REPORT_FIELDS = ["id", "items.variant_id", "items.metadata"] as const;

export default async function reportDiscounts({ container, args }: ExecArgs): Promise<void> {
  // Validate before resolving even the logger: a rejected invocation cannot
  // touch Medusa data or emit a partial report.
  const environment = environmentFrom(args);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  const { data: carts } = await query.graph({
    entity: "cart",
    fields: [...REPORT_FIELDS],
    filters: {},
  });
  const { data: orders } = await query.graph({
    entity: "order",
    fields: [...REPORT_FIELDS],
    filters: {},
  });

  const report = discountReport(carts as DiscountQueryEntity[], orders as DiscountQueryEntity[]);
  for (const line of renderDiscountReport(report, environment)) logger.info(line);
}
