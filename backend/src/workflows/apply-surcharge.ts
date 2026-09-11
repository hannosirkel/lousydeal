/**
 * The one workflow allowed to put a variant-less surcharge into a cart.
 *
 * Medusa's add/delete cart workflows normally lock for themselves, but their
 * lock steps skip when those workflows run as children. This parent therefore
 * owns the cart lock around the read, refusal checks, removal and addition.
 */

import {
  acquireLockStep,
  addToCartWorkflow,
  deleteLineItemsWorkflow,
  releaseLockStep,
} from "@medusajs/medusa/core-flows";
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils";
import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  when,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";

import { PRODUCT_TIERS } from "../commerce/product-model";
import { priceSurcharge, type SurchargeLine } from "../commerce/surcharge";

export const APPLY_SURCHARGE_WORKFLOW_ID = "apply-surcharge";
export const CART_PRICE_LOCK_SECONDS = 600;

export type SurchargeRefusalReason = "completed" | "no_certificate";

export interface SurchargeCartLine {
  readonly id: string;
  readonly product_handle?: string | null;
  readonly title?: string | null;
  readonly quantity?: number;
  readonly unit_price?: number;
  readonly variant_id?: string | null;
}

export interface SurchargeCart {
  readonly id: string;
  readonly completed_at?: string | Date | null;
  readonly items?: readonly SurchargeCartLine[] | null;
}

export type SurchargeMutation =
  | { readonly reason: SurchargeRefusalReason }
  | { readonly removeIds: readonly string[]; readonly line: SurchargeLine };

const certificateHandles = new Set(PRODUCT_TIERS.map((tier) => tier.handle));
const certificateTitles = new Set(PRODUCT_TIERS.map((tier) => tier.title));

function isCertificate(line: SurchargeCartLine): boolean {
  return certificateHandles.has(line.product_handle ?? "") || certificateTitles.has(line.title ?? "");
}

/** Decide the mutation from the cart snapshot read while the workflow owns its lock. */
export function surchargeMutationForCart(cart: SurchargeCart, code: string): SurchargeMutation {
  if (cart.completed_at !== null && cart.completed_at !== undefined) return { reason: "completed" };

  const items = Array.isArray(cart.items) ? cart.items : [];
  const certificates = items.filter(isCertificate);
  const certificate = certificates[0];
  if (
    certificates.length !== 1 ||
    certificate === undefined ||
    certificate.quantity !== 1 ||
    typeof certificate.unit_price !== "number"
  ) {
    return { reason: "no_certificate" };
  }

  const line = priceSurcharge(certificate.unit_price, code);
  if (line === null) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "unknown_code");
  }

  return {
    removeIds: items.filter((item) => item.variant_id === null).map((item) => item.id),
    line,
  };
}

export interface ApplySurchargeWorkflowInput {
  readonly cart_id: string;
  readonly code: string;
}

interface RemoteQuery {
  (query: {
    readonly entryPoint: string;
    readonly variables: { readonly filters: { readonly id: string } };
    readonly fields: readonly string[];
  }): Promise<readonly SurchargeCart[]>;
}

const readSurchargeMutationStep = createStep(
  "read-surcharge-cart-and-price",
  async (input: ApplySurchargeWorkflowInput, { container }) => {
    const remoteQuery = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY) as RemoteQuery;
    const [cart] = await remoteQuery({
      entryPoint: "cart",
      variables: { filters: { id: input.cart_id } },
      fields: [
        "id",
        "completed_at",
        "items.id",
        "items.product_handle",
        "items.title",
        "items.quantity",
        "items.unit_price",
        "items.variant_id",
      ],
    });
    if (cart === undefined) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `Cart with id '${input.cart_id}' not found`);
    }

    const mutation = surchargeMutationForCart(cart, input.code);
    if ("reason" in mutation) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, mutation.reason);
    }
    return new StepResponse(mutation);
  },
);

const cartPriceLockOwnerStep = createStep(
  "create-cart-price-lock-owner",
  async (_input: Record<string, never>, { transactionId, runId }) => new StepResponse(`${transactionId}:${runId}`),
);

export const applySurchargeWorkflow = createWorkflow(
  { name: APPLY_SURCHARGE_WORKFLOW_ID, idempotent: false },
  (input: ApplySurchargeWorkflowInput) => {
    const lockOwner = cartPriceLockOwnerStep({});
    acquireLockStep({
      key: input.cart_id,
      ownerId: lockOwner,
      timeout: 2,
      ttl: CART_PRICE_LOCK_SECONDS,
    });

    const mutation = readSurchargeMutationStep(input);
    const removed = when("remove-existing-surcharge", { mutation }, ({ mutation }) => mutation.removeIds.length > 0)
      .then(() => deleteLineItemsWorkflow.runAsStep({
        input: { cart_id: input.cart_id, ids: mutation.removeIds as string[] },
      }));

    const addInput = transform({ input, mutation, removed }, ({ input, mutation }) => ({
      cart_id: input.cart_id,
      items: [
        {
          title: mutation.line.title,
          unit_price: mutation.line.unitPrice,
          quantity: 1,
          is_tax_inclusive: true,
          requires_shipping: false,
          metadata: mutation.line.metadata,
        },
      ],
    }));
    const added = addToCartWorkflow.runAsStep({ input: addInput });
    const releaseKey = transform({ cartId: input.cart_id, added }, ({ cartId }) => cartId);
    releaseLockStep({ key: releaseKey, ownerId: lockOwner });

    return new WorkflowResponse(mutation);
  },
);
