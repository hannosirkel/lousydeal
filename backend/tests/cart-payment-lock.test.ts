import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { stockPost } = vi.hoisted(() => ({ stockPost: vi.fn() }));

vi.mock("@medusajs/medusa/api/store/payment-collections/[id]/payment-sessions/route", () => ({
  POST: stockPost,
}));

import { POST } from "../src/api/store/payment-collections/[id]/payment-sessions/route";

function requestWith(dependencies: Readonly<Record<string, unknown>>) {
  return {
    params: { id: "paycol_1" },
    scope: {
      resolve(key: string) {
        const dependency = dependencies[key];
        if (dependency === undefined) throw new Error(`unexpected dependency: ${key}`);
        return dependency;
      },
    },
  };
}

describe("POST /store/payment-collections/:id/payment-sessions", () => {
  beforeEach(() => {
    stockPost.mockReset();
  });

  it("holds one owned cart lock while the stock session handler runs", async () => {
    const events: unknown[] = [];
    const locking = {
      acquire: vi.fn(async (key: string, options: unknown) => events.push(["acquire", key, options])),
      release: vi.fn(async (key: string, options: unknown) => events.push(["release", key, options])),
    };
    const remoteQuery = vi.fn(async () => [{ cart_id: "cart_1" }]);
    stockPost.mockImplementation(async () => {
      events.push(["stock"]);
    });
    const request = requestWith({
      [ContainerRegistrationKeys.REMOTE_QUERY]: remoteQuery,
      [Modules.LOCKING]: locking,
    });

    await POST(request as never, {} as never);

    expect(remoteQuery).toHaveBeenCalledWith({
      __value: {
        cart_payment_collection: {
          __args: { filters: { payment_collection_id: "paycol_1" } },
          fields: ["cart_id"],
          isServiceAccess: false,
        },
      },
    });
    expect(events).toEqual([
      ["acquire", "cart_1", { ownerId: expect.any(String), expire: 600 }],
      ["stock"],
      ["release", "cart_1", { ownerId: expect.any(String) }],
    ]);
    const acquiredOwner = (events[0] as [string, string, { ownerId: string }])[2].ownerId;
    const releasedOwner = (events[2] as [string, string, { ownerId: string }])[2].ownerId;
    expect(acquiredOwner).toBe(releasedOwner);
    expect(acquiredOwner).not.toBe("*");
  });

  it("owner-releases the cart when the stock handler fails", async () => {
    const ownerIds: string[] = [];
    const locking = {
      acquire: vi.fn(async (_key: string, options: { ownerId: string }) => ownerIds.push(options.ownerId)),
      release: vi.fn(async (_key: string, options: { ownerId: string }) => ownerIds.push(options.ownerId)),
    };
    stockPost.mockRejectedValue(new Error("provider failed"));
    const request = requestWith({
      [ContainerRegistrationKeys.REMOTE_QUERY]: async () => [{ cart_id: "cart_1" }],
      [Modules.LOCKING]: locking,
    });

    let failure: unknown;
    try {
      await POST(request as never, {} as never);
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toBe("provider failed");
    expect(ownerIds).toHaveLength(2);
    expect(ownerIds[0]).toBe(ownerIds[1]);
    expect(locking.release).toHaveBeenCalledOnce();
  });
});
