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
