/**
 * The three order operations `submission.ts` needs, over the typed client.
 *
 * `submission.ts` holds the argument about doing this exactly once and knows
 * nothing about Printful's field names. This file is the other half: it knows
 * the field names and holds no argument at all.
 *
 * **Three endpoints, and two API versions, each because it is the one that can
 * answer.** That is not untidiness; it was measured on 2026-09-09:
 *
 *   `GET  /v2/orders/@{external_id}`      look-up. v2 documents the `@` form.
 *   `POST /orders`                        create. **v1**, because
 *                                         `POST /v2/orders` refuses
 *                                         `source: "sync"` — "Source must be
 *                                         one of: catalog, warehouse,
 *                                         product_template" — and cannot
 *                                         reference the products `sync.ts`
 *                                         reconciles.
 *   `POST /v2/orders/{id}/confirmation`   confirm. **This is the call that
 *                                         spends money**: v2 describes it as
 *                                         starting fulfilment in the
 *                                         production facility, and a created
 *                                         order is a `draft` until it happens.
 *
 * **A SKU resolves to a sync variant through the join `sync.ts` already made.**
 * That file sets each sync variant's `external_id` to the SKU, so
 * `GET /store/variants/@{sku}` answers directly — measured: `LD-STK-4` returns
 * `id: 5488997617`, an unknown SKU returns 404. Nothing new is stored to hold
 * a mapping that Printful is already keeping, and the mapping cannot drift
 * from the products because it *is* the products.
 */

import { PrintfulError, type PrintfulClient } from "./client";
import type { PrintfulOrders, PrintfulRecipient, RemotePrintfulOrder } from "./submission";

/** What the v1 create answers with, in the fields this reads. */
interface V1OrderResponse {
  readonly result?: { readonly id?: unknown; readonly status?: unknown };
}

/** What v2 answers with, which is the other envelope — `client.ts` returns the body as it came. */
interface V2OrderResponse {
  readonly data?: { readonly id?: unknown; readonly status?: unknown };
}

/**
 * What `GET /store/variants/@{external_id}` answers with.
 *
 * **The sync variant is `result` itself — there is no wrapper — and reading
 * for one made every merch order impossible.** Measured against the live test
 * store on 2026-09-09: `@LD-TEE-L` answers `200` with
 * `result: { id: 5488997556, external_id: "LD-TEE-L", sync_product_id, name,
 * synced, variant_id, ... }`. This interface declared
 * `result.sync_variant.id`, so the read was `undefined` for every SKU that
 * exists, `syncVariantIdFor` threw "Printful holds no sync variant", and no
 * order was ever placed.
 *
 * The measurement in this file's own header was right all along — it records
 * "`LD-STK-4` returns `id: 5488997617`", the id at the top of `result`. The
 * shape was invented between reading it and typing it, probably from
 * `/store/products/{id}`, which really does answer `{ sync_product,
 * sync_variants }`. Gate E is what caught the difference, because a stub
 * shaped like the belief agrees with the belief.
 */
interface VariantResponse {
  readonly result?: { readonly id?: unknown };
}

/**
 * Printful's order id, as a string.
 *
 * It comes back as a number and is stored as text, because it is an
 * identifier: nothing adds two of them, and a column that can hold Printful's
 * next id format is cheaper than a migration.
 */
function orderFrom(id: unknown, status: unknown, where: string): RemotePrintfulOrder {
  if ((typeof id !== "number" && typeof id !== "string") || typeof status !== "string") {
    // Not a `PrintfulError`: nothing failed. The call succeeded and answered
    // something this cannot read, which is a different problem and one that
    // must not be mistaken for a transport failure — `submission.ts` treats a
    // failure by asking Printful what exists, and that would loop here.
    throw new Error(`Printful ${where} answered without a usable id and status`);
  }
  return { id: String(id), status };
}

export function createPrintfulOrders(client: PrintfulClient): PrintfulOrders {
  return {
    async findByExternalId(externalId: string): Promise<RemotePrintfulOrder | null> {
      try {
        const response = await client.request<V2OrderResponse>("GET", `/v2/orders/@${encodeURIComponent(externalId)}`);
        return orderFrom(response.data?.id, response.data?.status, "order look-up");
      } catch (error) {
        // A missing order is an ordinary answer, and the caller asks this
        // question in the path where something has already gone wrong. Only
        // 404 — every other status is a real failure and must not be reported
        // as "no order exists", which is the answer that would let
        // `submission.ts` record a failure for an order Printful holds.
        if (error instanceof PrintfulError && error.status === 404) return null;
        throw error;
      }
    },

    async create({ externalId, recipient, lines }): Promise<RemotePrintfulOrder> {
      const items = await Promise.all(
        lines.map(async (line) => ({
          sync_variant_id: await syncVariantIdFor(client, line.sku),
          quantity: line.quantity,
        })),
      );

      const response = await client.request<V1OrderResponse>("POST", "/orders", {
        external_id: externalId,
        recipient: recipientBody(recipient),
        items,
      });
      return orderFrom(response.result?.id, response.result?.status, "order create");
    },

    async confirm(printfulOrderId: string): Promise<RemotePrintfulOrder> {
      const response = await client.request<V2OrderResponse>(
        "POST",
        `/v2/orders/${encodeURIComponent(printfulOrderId)}/confirmation`,
      );
      return orderFrom(response.data?.id, response.data?.status, "order confirmation");
    },
  };
}

/**
 * Printful's own recipient field names.
 *
 * `state_code` is sent only where there is one. Printful rejects an empty
 * string for it — the same class of thing `shipping.ts` found when it sent a
 * partial address — and the four countries that need one are settled by
 * `shipping-address.ts` on the storefront side, measured rather than guessed.
 */
function recipientBody(recipient: PrintfulRecipient): Record<string, string> {
  const body: Record<string, string> = {
    name: recipient.name,
    address1: recipient.address1,
    city: recipient.city,
    country_code: recipient.countryCode,
    zip: recipient.postcode,
  };
  if (recipient.province !== null && recipient.province.trim().length > 0) {
    body.state_code = recipient.province.trim();
  }
  return body;
}

async function syncVariantIdFor(client: PrintfulClient, sku: string): Promise<number> {
  const response = await client.request<VariantResponse>("GET", `/store/variants/@${encodeURIComponent(sku)}`);
  const id = response.result?.id;
  if (typeof id !== "number") {
    // A SKU the store does not hold. Throwing here is what stops an order
    // being placed for the wrong thing: the alternative — dropping the line —
    // would post a parcel missing an item somebody paid for.
    throw new Error(`Printful holds no sync variant for SKU ${sku}`);
  }
  return id;
}
