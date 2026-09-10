import { describe, expect, it } from "vitest";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

import { POST } from "../src/api/store/carts/[id]/surcharge/route";
import { PostStoreCartSurcharge } from "../src/api/middlewares";
import {
  APPLY_SURCHARGE_WORKFLOW_ID,
  surchargeMutationForCart,
} from "../src/workflows/apply-surcharge";

const CERTIFICATE = {
  id: "item_certificate",
  product_handle: "lousy-deal",
  quantity: 1,
  unit_price: 5,
  variant_id: "variant_certificate",
};

const SURCHARGE = {
  id: "item_surcharge",
  product_handle: null,
  quantity: 1,
  unit_price: 2.5,
  variant_id: null,
};

describe("the cart state accepted by the surcharge workflow", () => {
  it("refuses a completed cart before describing a mutation", () => {
    expect(
      surchargeMutationForCart(
        { id: "cart_1", completed_at: "2026-09-10T19:00:00.000Z", items: [CERTIFICATE] },
        "BALDRICK20",
      ),
    ).toEqual({ reason: "completed" });
  });

  it("refuses a cart unless it has exactly one certificate unit", () => {
    expect(surchargeMutationForCart({ id: "cart_1", completed_at: null, items: [] }, "BALDRICK20")).toEqual({
      reason: "no_certificate",
    });
    expect(
      surchargeMutationForCart(
        { id: "cart_1", completed_at: null, items: [CERTIFICATE, { ...CERTIFICATE, id: "item_second" }] },
        "BALDRICK20",
      ),
    ).toEqual({ reason: "no_certificate" });
    expect(
      surchargeMutationForCart(
        { id: "cart_1", completed_at: null, items: [{ ...CERTIFICATE, quantity: 2 }] },
        "BALDRICK20",
      ),
    ).toEqual({ reason: "no_certificate" });
  });

  it("prices one replacement line from the certificate and removes every old surcharge", () => {
    expect(
      surchargeMutationForCart(
        {
          id: "cart_1",
          completed_at: null,
          items: [SURCHARGE, CERTIFICATE, { ...SURCHARGE, id: "item_surcharge_2" }],
        },
        " save10 ",
      ),
    ).toEqual({
      removeIds: ["item_surcharge", "item_surcharge_2"],
      line: {
        unitPrice: 0.5,
        title: "Discount (SAVE10)",
        metadata: {
          internal_type: "baldrick_surcharge",
          code: "SAVE10",
          base_amount_major: 5,
          percentage: 10,
        },
      },
    });
  });
});

function fakeResponse() {
  const sent: { status: number; body: unknown } = { status: 200, body: undefined };
  const response = {
    status(code: number) {
      sent.status = code;
      return response;
    },
    json(body: unknown) {
      sent.body = body;
      return response;
    },
  };
  return { response, sent };
}

describe("POST /store/carts/:id/surcharge", () => {
  it("accepts one bounded code string and rejects malformed bodies", () => {
    expect(PostStoreCartSurcharge.safeParse({ code: "BALDRICK20" }).success).toBe(true);
    expect(PostStoreCartSurcharge.safeParse({ code: "X".repeat(64) }).success).toBe(true);
    expect(PostStoreCartSurcharge.safeParse({ code: "X".repeat(65) }).success).toBe(false);
    expect(PostStoreCartSurcharge.safeParse({ code: 20 }).success).toBe(false);
    expect(PostStoreCartSurcharge.safeParse({ code: "FREE", price: 0 }).success).toBe(false);
  });

  it("rejects an unknown code before resolving or touching the cart", async () => {
    const { response, sent } = fakeResponse();
    let resolutions = 0;
    const request = {
      params: { id: "cart_1" },
      validatedBody: { code: "NOT-A-CODE" },
      scope: { resolve: () => { resolutions += 1; } },
    };

    await POST(request as never, response as never);

    expect(sent).toEqual({ status: 422, body: { reason: "unknown_code" } });
    expect(resolutions).toBe(0);
  });

  it("maps a workflow refusal to its stable 422 reason", async () => {
    const { response, sent } = fakeResponse();
    const request = {
      params: { id: "cart_1" },
      validatedBody: { code: "BALDRICK20" },
      scope: {
        // The workflow orchestrator serializes step errors before its module
        // service throws them back to the route. This is the real boundary
        // shape, not an Error instance.
        resolve: () => ({ run: async () => { throw { type: "invalid_data", message: "no_certificate" }; } }),
      },
    };

    await POST(request as never, response as never);

    expect(sent).toEqual({ status: 422, body: { reason: "no_certificate" } });
  });

  it("runs the cart workflow and returns the cart it changed", async () => {
    const { response, sent } = fakeResponse();
    const calls: unknown[] = [];
    const returnedCart = { id: "cart_1", total: 6, items: [CERTIFICATE, { ...SURCHARGE, unit_price: 1 }] };
    const workflowEngine = {
      run: async (...args: unknown[]) => { calls.push(args); },
    };
    const remoteQuery = async () => [returnedCart];
    const request = {
      params: { id: "cart_1" },
      validatedBody: { code: " baldrick20 " },
      scope: {
        resolve: (key: string) => {
          if (key === Modules.WORKFLOW_ENGINE) return workflowEngine;
          if (key === ContainerRegistrationKeys.REMOTE_QUERY) return remoteQuery;
          throw new Error(`unexpected dependency: ${key}`);
        },
      },
    };

    await POST(request as never, response as never);

    expect(calls).toEqual([
      [APPLY_SURCHARGE_WORKFLOW_ID, { input: { cart_id: "cart_1", code: " baldrick20 " } }],
    ]);
    expect(sent).toEqual({ status: 200, body: { cart: returnedCart } });
  });
});
