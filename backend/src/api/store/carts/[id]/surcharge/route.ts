import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import {
  ContainerRegistrationKeys,
  Modules,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils";

import { priceSurcharge } from "../../../../../commerce/surcharge";
import {
  APPLY_SURCHARGE_WORKFLOW_ID,
  type ApplySurchargeWorkflowInput,
  type SurchargeRefusalReason,
} from "../../../../../workflows/apply-surcharge";

export interface ApplySurchargeBody {
  readonly code: string;
}

interface WorkflowEngine {
  run(id: string, options: { readonly input: ApplySurchargeWorkflowInput }): Promise<unknown>;
}

interface RemoteQuery {
  (query: unknown): Promise<readonly unknown[]>;
}

const CART_RESPONSE_FIELDS = [
  "id",
  "currency_code",
  "region_id",
  "completed_at",
  "total",
  "subtotal",
  "tax_total",
  "item_total",
  "item_subtotal",
  "item_tax_total",
  "items.id",
  "items.title",
  "items.quantity",
  "items.unit_price",
  "items.total",
  "items.subtotal",
  "items.tax_total",
  "items.is_tax_inclusive",
  "items.requires_shipping",
  "items.variant_id",
  "items.product_handle",
  "items.metadata",
  "items.tax_lines.*",
];

function refusalReason(error: unknown): SurchargeRefusalReason | "unknown_code" | null {
  const message = error instanceof Error
    ? error.message
    : typeof error === "object" && error !== null && "message" in error && typeof error.message === "string"
      ? error.message
      : "";
  if (message === "completed" || message === "no_certificate" || message === "unknown_code") return message;
  return null;
}

export async function POST(
  request: MedusaRequest<ApplySurchargeBody>,
  response: MedusaResponse,
): Promise<void> {
  const cartId = request.params.id;
  if (typeof cartId !== "string" || cartId.length === 0) {
    response.status(404).json({ message: "Cart not found" });
    return;
  }
  const code = request.validatedBody.code;
  if (priceSurcharge(0, code) === null) {
    response.status(422).json({ reason: "unknown_code" });
    return;
  }

  const workflowEngine = request.scope.resolve(Modules.WORKFLOW_ENGINE) as WorkflowEngine;
  try {
    await workflowEngine.run(APPLY_SURCHARGE_WORKFLOW_ID, {
      input: { cart_id: cartId, code },
    });
  } catch (error) {
    const reason = refusalReason(error);
    if (reason !== null) {
      response.status(422).json({ reason });
      return;
    }
    throw error;
  }

  const remoteQuery = request.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY) as RemoteQuery;
  const [cart] = await remoteQuery(remoteQueryObjectFromString({
    entryPoint: "cart",
    variables: { filters: { id: cartId } },
    fields: CART_RESPONSE_FIELDS,
  }));
  response.status(200).json({ cart });
}
