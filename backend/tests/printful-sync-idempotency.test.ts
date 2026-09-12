/**
 * Two complete reconciliations against one stateful Printful substitute.
 *
 * The older focused suite starts from declared snapshots. This one retains
 * the first run's writes so it can catch a missing product or SKU
 * `external_id`: either defect would make the second run mutate again.
 */

import { describe, expect, it } from "vitest";

import type { PrintfulClient } from "../src/modules/printful/client";
import { syncMerchProducts } from "../src/modules/printful/sync";

const ART = "https://raw.githubusercontent.com/hannosirkel/lousydeal/0123456789abcdef0123456789abcdef01234567/design/merch/print-files";

interface HeldVariant {
  readonly id: number;
  readonly external_id: string;
  readonly variant_id: number;
  readonly retail_price: string;
  readonly files: ReadonlyArray<{ readonly type: string; readonly url: string }>;
}

interface HeldProduct {
  readonly id: number;
  readonly external_id: string;
  readonly name: string;
  readonly variants: readonly HeldVariant[];
}

function statefulStore() {
  const products: HeldProduct[] = [];
  const mutations: string[] = [];
  let nextProductId = 500;
  let nextVariantId = 5_000;
  const client: PrintfulClient = {
    request: <T,>(method: string, path: string, body?: unknown): Promise<T> => {
      if (method === "GET" && path.startsWith("/store/products?")) {
        return Promise.resolve({
          result: products.map(({ id, external_id, name }) => ({ id, external_id, name })),
        } as T);
      }
      if (method === "GET") {
        const id = Number(path.split("/").pop());
        const product = products.find((candidate) => candidate.id === id)!;
        return Promise.resolve({
          result: {
            sync_product: { id, external_id: product.external_id, name: product.name },
            sync_variants: product.variants,
          },
        } as T);
      }
      if (method === "POST") {
        const payload = body as {
          readonly sync_product: { readonly external_id: string; readonly name: string };
          readonly sync_variants: ReadonlyArray<Omit<HeldVariant, "id">>;
        };
        mutations.push(payload.sync_product.external_id);
        products.push({
          id: nextProductId,
          external_id: payload.sync_product.external_id,
          name: payload.sync_product.name,
          variants: payload.sync_variants.map((variant) => ({ ...variant, id: nextVariantId++ })),
        });
        nextProductId += 1;
        return Promise.resolve({ result: { id: nextProductId - 1 } } as T);
      }
      return Promise.reject(new Error(`unexpected ${method} ${path}`));
    },
  };
  return { client, mutations, products };
}

describe("two Printful catalogue reconciliations", () => {
  it("preserves every SKU join and reports no mutations on the unchanged second run", async () => {
    const { client, mutations, products } = statefulStore();
    const first = await syncMerchProducts(client, { artworkBaseUrl: ART });
    const firstMutationCount = mutations.length;

    const second = await syncMerchProducts(client, { artworkBaseUrl: ART });

    expect(first.created).toEqual([
      "original-purchase-receipt",
      "this-mug-cost-extra",
      "lousy-deals-trucker-cap",
      "certified-worthless",
    ]);
    expect(second).toEqual({
      created: [],
      updated: [],
      unchanged: first.created,
      unrecognised: [],
    });
    expect(mutations).toHaveLength(firstMutationCount);
    expect(products.flatMap(({ variants }) => variants.map((variant) => variant.external_id))).toEqual([
      "LD-TEE-S",
      "LD-TEE-M",
      "LD-TEE-L",
      "LD-TEE-XL",
      "LD-TEE-2XL",
      "LD-TEE-3XL",
      "LD-MUG-11",
      "LD-CAP-OS",
      "LD-STK-4",
    ]);
  });
});
