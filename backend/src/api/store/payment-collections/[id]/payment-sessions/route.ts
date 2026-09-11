/**
 * Medusa's stock payment-session route, serialized with cart price changes.
 *
 * Stripe creates a session from the payment collection's current amount. The
 * stock handler does not lock its linked cart, so a surcharge could otherwise
 * change that amount between the handler's read and session creation.
 */

import { randomUUID } from "node:crypto";

import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type { HttpTypes } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils";
import { POST as stockPost } from "@medusajs/medusa/api/store/payment-collections/[id]/payment-sessions/route";

import { CART_PRICE_LOCK_SECONDS } from "../../../../../workflows/apply-surcharge";

interface CartPaymentCollectionLink {
  readonly cart_id?: unknown;
}

interface RemoteQuery {
  (query: unknown): Promise<readonly CartPaymentCollectionLink[]>;
}

interface Locking {
  acquire(key: string, options: { readonly ownerId: string; readonly expire: number }): Promise<void>;
  release(key: string, options: { readonly ownerId: string }): Promise<boolean>;
}

export async function POST(
  request: AuthenticatedMedusaRequest<HttpTypes.StoreInitializePaymentSession, HttpTypes.SelectParams>,
  response: MedusaResponse<HttpTypes.StorePaymentCollectionResponse>,
): Promise<void> {
  const paymentCollectionId = request.params.id;
  const remoteQuery = request.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY) as RemoteQuery;
  const [link] = await remoteQuery(
    remoteQueryObjectFromString({
      entryPoint: "cart_payment_collection",
      variables: { filters: { payment_collection_id: paymentCollectionId } },
      fields: ["cart_id"],
    }),
  );
  const cartId = link?.cart_id;
  if (typeof cartId !== "string" || cartId.length === 0) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Payment collection is not linked to a cart");
  }

  const locking = request.scope.resolve(Modules.LOCKING) as Locking;
  const ownerId = randomUUID();
  await locking.acquire(cartId, { ownerId, expire: CART_PRICE_LOCK_SECONDS });
  try {
    await stockPost(request, response);
  } finally {
    await locking.release(cartId, { ownerId });
  }
}
