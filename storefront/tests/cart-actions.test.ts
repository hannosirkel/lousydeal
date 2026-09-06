/**
 * Holds the one shared cart action, and the cookie it writes.
 *
 * These invariants used to live in two byte-identical copies of an action, one
 * per route, agreeing by hand. Nothing asserted them. What follows is what has
 * to stay true across every route that puts a tier in a cart.
 */

import { describe, expect, it, vi } from "vitest";

import { CART_COOKIE_OPTIONS, CART_ID_COOKIE, requireStoreClientConfig } from "../src/lib/store-session";

describe("the cart cookie", () => {
  it("is written with every attribute that keeps it out of reach", () => {
    // httpOnly keeps the id out of document.cookie; secure keeps it off
    // plaintext; lax keeps it off cross-site POSTs while surviving the
    // top-level navigation back from Stripe. Partially set, it is a different
    // cookie -- so the object is asserted whole rather than field by field.
    expect(CART_COOKIE_OPTIONS).toEqual({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: true,
    });
  });

  it("has the name the cart and checkout pages read", () => {
    expect(CART_ID_COOKIE).toBe("lousydeal_cart_id");
  });
});

describe("requireStoreClientConfig", () => {
  it("refuses rather than rendering a shop that only looks empty", () => {
    // A storefront that cannot reach its backend has nothing true to render.
    // Degrading to an empty catalogue would tell a customer the shop is empty
    // when it is unreachable.
    const original = { ...process.env };
    try {
      delete process.env.MEDUSA_BACKEND_URL;
      delete process.env.MEDUSA_PUBLISHABLE_API_KEY;
      expect(() => requireStoreClientConfig()).toThrow(/must both be set/);

      process.env.MEDUSA_BACKEND_URL = "http://backend.example:9000";
      expect(() => requireStoreClientConfig()).toThrow(/must both be set/);

      process.env.MEDUSA_PUBLISHABLE_API_KEY = "pk_example";
      expect(requireStoreClientConfig()).toEqual({
        backendUrl: "http://backend.example:9000",
        publishableKey: "pk_example",
      });
    } finally {
      process.env = original;
    }
  });
});

describe("addToCart", () => {
  it("refuses a submission carrying no variant", async () => {
    const { addToCart } = await import("../src/lib/cart-actions");
    await expect(addToCart(new FormData())).rejects.toThrow(/missing variantId/);
  });

  it("exports exactly one action, because every export here is a POST endpoint", async () => {
    // Next gives each export of a `"use server"` module a public action id, so
    // anything exported is reachable by any visitor with any arguments.
    const actions = await import("../src/lib/cart-actions");
    expect(Object.keys(actions)).toEqual(["addToCart"]);
  });

  it("adds one, and does not read a quantity from the form", async () => {
    // A quantity the browser can send is a quantity a visitor can change.
    // Nothing on this site offers a quantity control.
    vi.resetModules();
    const added: unknown[] = [];
    vi.doMock("../src/lib/store-cart", () => ({
      createCart: async () => ({ id: "cart_1" }),
      addLineToCart: async (...args: unknown[]) => {
        added.push(args);
      },
      getCart: async () => ({ id: "cart_1" }),
    }));
    vi.doMock("../src/lib/medusa-client", () => ({
      createStoreFetchJson: () => async () => ({}),
      getDefaultRegion: async () => ({ id: "reg_1", currency_code: "usd" }),
    }));
    vi.doMock("next/headers", () => ({
      cookies: async () => ({ get: () => undefined, set: () => undefined }),
    }));
    vi.doMock("next/navigation", () => ({
      redirect: () => {
        throw new Error("REDIRECTED");
      },
    }));
    vi.doMock("../src/lib/store-session", () => ({
      CART_ID_COOKIE: "lousydeal_cart_id",
      CART_COOKIE_OPTIONS: { httpOnly: true, sameSite: "lax", path: "/", secure: true },
      requireStoreClientConfig: () => ({ backendUrl: "http://backend.example", publishableKey: "pk" }),
    }));

    const { addToCart } = await import("../src/lib/cart-actions");
    const form = new FormData();
    form.set("variantId", "var_1");
    form.set("quantity", "999");
    await expect(addToCart(form)).rejects.toThrow("REDIRECTED");

    expect(added).toHaveLength(1);
    expect(added[0]).toEqual([expect.any(Function), "cart_1", "var_1", 1]);
    vi.resetModules();
    vi.doUnmock("../src/lib/store-cart");
    vi.doUnmock("../src/lib/medusa-client");
    vi.doUnmock("next/headers");
    vi.doUnmock("next/navigation");
    vi.doUnmock("../src/lib/store-session");
  });
});

/**
 * C3a: one certificate per order, made true where the cart is filled.
 *
 * §16 gives a deal one `order_id` and no line reference, so an order for two
 * things has no single tier and no single price to certify — C2's subscriber
 * issues nothing for one rather than print a transaction that did not happen.
 * These are the cases that keep a cart out of that state.
 */
interface AddToCartRun {
  /** `[cartId, lineId]` for each line removed, in order. */
  readonly removed: [string, string][];
  /** `[cartId, variantId, quantity]` for each line added. */
  readonly added: [string, string, number][];
  readonly createdCarts: number;
  readonly cookieWrittenAs: string | undefined;
}

/** Drives `addToCart` against a stubbed `store-cart`, and reports what it did. */
async function runAddToCart(options: {
  cookieCartId?: string;
  /** What `getCart` answers for the cookie's cart, or `"unresolvable"` for one that does not. */
  existingCart?: { id: string; completed_at?: string | null; items?: { id: string }[] } | "unresolvable";
}): Promise<AddToCartRun> {
  vi.resetModules();
  const removed: [string, string][] = [];
  const added: [string, string, number][] = [];
  let createdCarts = 0;
  let cookieWrittenAs: string | undefined;

  vi.doMock("../src/lib/store-cart", () => ({
    createCart: async () => {
      createdCarts += 1;
      return { id: "cart_new" };
    },
    getCart: async () => {
      if (options.existingCart === undefined || options.existingCart === "unresolvable") {
        throw new Error("no such cart");
      }
      return options.existingCart;
    },
    removeLineFromCart: async (_fetchJson: unknown, cartId: string, lineId: string) => {
      removed.push([cartId, lineId]);
    },
    addLineToCart: async (_fetchJson: unknown, cartId: string, variantId: string, quantity: number) => {
      added.push([cartId, variantId, quantity]);
    },
  }));
  vi.doMock("../src/lib/medusa-client", () => ({
    createStoreFetchJson: () => async () => ({}),
    getDefaultRegion: async () => ({ id: "reg_1", currency_code: "usd" }),
  }));
  vi.doMock("next/headers", () => ({
    cookies: async () => ({
      get: () => (options.cookieCartId === undefined ? undefined : { value: options.cookieCartId }),
      set: (_name: string, value: string) => {
        cookieWrittenAs = value;
      },
    }),
  }));
  vi.doMock("next/navigation", () => ({
    redirect: () => {
      throw new Error("REDIRECTED");
    },
  }));
  vi.doMock("../src/lib/store-session", () => ({
    CART_ID_COOKIE: "lousydeal_cart_id",
    CART_COOKIE_OPTIONS: { httpOnly: true, sameSite: "lax", path: "/", secure: true },
    requireStoreClientConfig: () => ({ backendUrl: "http://backend.example", publishableKey: "pk" }),
  }));

  const { addToCart } = await import("../src/lib/cart-actions");
  const form = new FormData();
  form.set("variantId", "var_chosen");
  await expect(addToCart(form)).rejects.toThrow("REDIRECTED");

  vi.resetModules();
  for (const mocked of [
    "../src/lib/store-cart",
    "../src/lib/medusa-client",
    "next/headers",
    "next/navigation",
    "../src/lib/store-session",
  ]) {
    vi.doUnmock(mocked);
  }

  return { removed, added, createdCarts, cookieWrittenAs };
}

describe("addToCart keeps the cart to one certificate", () => {
  it("clears what was there before adding the chosen tier", async () => {
    // Two lines, whether from two tiers or one tier added twice. Both go:
    // pressing "add" on a second tier is changing your mind, not ordering a
    // pair.
    const run = await runAddToCart({
      cookieCartId: "cart_1",
      existingCart: { id: "cart_1", completed_at: null, items: [{ id: "line_a" }, { id: "line_b" }] },
    });

    expect(run.removed).toEqual([
      ["cart_1", "line_a"],
      ["cart_1", "line_b"],
    ]);
    expect(run.added).toEqual([["cart_1", "var_chosen", 1]]);
    expect(run.createdCarts).toBe(0);
    expect(run.cookieWrittenAs).toBe("cart_1");
  });

  it("removes nothing from a cart that is already empty", async () => {
    const run = await runAddToCart({
      cookieCartId: "cart_1",
      existingCart: { id: "cart_1", completed_at: null, items: [] },
    });

    expect(run.removed).toEqual([]);
    expect(run.added).toEqual([["cart_1", "var_chosen", 1]]);
  });

  it("starts a new cart when the cookie names one that has already been paid for", async () => {
    // Nothing clears the cookie at checkout and nothing could -- it is
    // httpOnly, so the Client Component that knows the order succeeded cannot
    // reach it. Reusing the completed cart would make a second purchase
    // impossible, its lines no longer being changeable.
    const run = await runAddToCart({
      cookieCartId: "cart_paid",
      existingCart: { id: "cart_paid", completed_at: "2026-09-06T10:00:00.000Z", items: [{ id: "line_a" }] },
    });

    expect(run.createdCarts).toBe(1);
    expect(run.removed).toEqual([]);
    expect(run.added).toEqual([["cart_new", "var_chosen", 1]]);
    expect(run.cookieWrittenAs).toBe("cart_new");
  });

  it("starts a new cart when the cookie names one that does not resolve, rather than erroring", async () => {
    // Before C3a this threw out of the Server Action, and a visitor got an
    // error page for pressing a button.
    const run = await runAddToCart({ cookieCartId: "cart_gone", existingCart: "unresolvable" });

    expect(run.createdCarts).toBe(1);
    expect(run.added).toEqual([["cart_new", "var_chosen", 1]]);
    expect(run.cookieWrittenAs).toBe("cart_new");
  });

  it("creates a cart when there is no cookie at all", async () => {
    const run = await runAddToCart({});

    expect(run.createdCarts).toBe(1);
    expect(run.added).toEqual([["cart_new", "var_chosen", 1]]);
  });
});
