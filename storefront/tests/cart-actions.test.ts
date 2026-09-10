import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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

  it("exports exactly four actions, because every export here is a POST endpoint", async () => {
    // Next gives each export of a `"use server"` module a public action id, so
    // anything exported is reachable by any visitor with any arguments.
    //
    // **One until LD-04 P9c, two until the cart could be undone.** The count
    // is asserted rather than a maximum, for the reason the guard existed at
    // one: a helper accidentally exported from this module is a public POST
    // endpoint, and nothing else in the repository would notice.
    //
    // `removeFromCart` was the third; `applyCode` is the fourth. Both are
    // reachable by any visitor. The former therefore reads the cart from the
    // caller's own cookie and removes only a line that cart actually holds. A
    // line id from somebody else's cart matches nothing and is a no-op.
    const actions = await import("../src/lib/cart-actions");
    expect(Object.keys(actions).sort()).toEqual(["addMerchToCart", "addToCart", "applyCode", "removeFromCart"]);
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
      listTiers: async () => [{ variantId: "var_tier_a" }, { variantId: "var_tier_b" }, { variantId: "var_chosen" }],
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

class TestStoreApiError extends Error {
  constructor(
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(`Store API ${String(status)}`);
  }
}

async function runApplyCode(options: {
  readonly code?: string;
  readonly cartId?: string;
  readonly refusal?: string;
  readonly refusalStatus?: number;
}): Promise<{ readonly applied: readonly unknown[] }> {
  vi.resetModules();
  const applied: unknown[] = [];
  vi.doMock("../src/lib/store-cart", () => ({
    applySurcharge: async (...args: unknown[]) => {
      applied.push(args);
      if (options.refusal !== undefined) {
        throw new TestStoreApiError(options.refusalStatus ?? 422, { reason: options.refusal });
      }
      return { id: "cart_1", total: 6 };
    },
  }));
  vi.doMock("../src/lib/medusa-client", () => ({
    StoreApiError: TestStoreApiError,
    createStoreFetchJson: () => async () => ({}),
    getDefaultRegion: async () => ({ id: "reg_1", currency_code: "usd" }),
    listTiers: async () => [],
  }));
  vi.doMock("next/headers", () => ({
    cookies: async () => ({
      get: () => (options.cartId === undefined ? undefined : { value: options.cartId }),
      set: () => undefined,
    }),
  }));
  vi.doMock("next/navigation", () => ({
    redirect: (path: string) => {
      throw new Error(`REDIRECT:${path}`);
    },
  }));
  vi.doMock("../src/lib/store-session", () => ({
    CART_ID_COOKIE: "lousydeal_cart_id",
    CART_COOKIE_OPTIONS: { httpOnly: true, sameSite: "lax", path: "/", secure: true },
    requireStoreClientConfig: () => ({ backendUrl: "http://backend.example", publishableKey: "pk" }),
  }));

  const { applyCode } = await import("../src/lib/cart-actions");
  const form = new FormData();
  if (options.code !== undefined) form.set("code", options.code);
  const acceptedRefusal = (options.refusalStatus ?? 422) === 422
    && (options.refusal === "unknown_code" || options.refusal === "no_certificate" || options.refusal === "completed");
  const expected = options.cartId === undefined
    ? "REDIRECT:/cart?code_reason=no_certificate"
    : options.refusal === undefined
      ? "REDIRECT:/cart"
      : acceptedRefusal
        ? `REDIRECT:/cart?code_reason=${options.refusal}`
        : `Store API ${String(options.refusalStatus ?? 422)}`;
  await expect(applyCode(form)).rejects.toThrow(expected);

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
  return { applied };
}

describe("applying a code", () => {
  it("refuses a submission carrying no code", async () => {
    const { applyCode } = await import("../src/lib/cart-actions");
    await expect(applyCode(new FormData())).rejects.toThrow(/missing code/);
  });

  it("posts the one entered field against the caller's cookie cart", async () => {
    const run = await runApplyCode({ code: " BALDRICK20 ", cartId: "cart_1" });
    expect(run.applied).toEqual([[expect.any(Function), "cart_1", " BALDRICK20 "]]);
  });

  it.each(["unknown_code", "no_certificate", "completed"])(
    "carries the stable %s refusal back to the cart",
    async (refusal) => {
      const run = await runApplyCode({ code: "BALDRICK20", cartId: "cart_1", refusal });
      expect(run.applied).toHaveLength(1);
    },
  );

  it.each([
    { refusal: "attacker-controlled", refusalStatus: 422 },
    { refusal: "unknown_code", refusalStatus: 500 },
  ])("does not turn an untrusted $refusalStatus/$refusal error into a redirect", async (error) => {
    const run = await runApplyCode({ code: "BALDRICK20", cartId: "cart_1", ...error });
    expect(run.applied).toHaveLength(1);
  });

  it("does not call Medusa without a cart owned by the caller", async () => {
    const run = await runApplyCode({ code: "BALDRICK20", refusal: "no_certificate" });
    expect(run.applied).toHaveLength(0);
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
  /** `[cartId, code]` for each surcharge re-price, in order. */
  readonly applied: [string, string][];
  readonly events: string[];
  readonly createdCarts: number;
  readonly cookieWrittenAs: string | undefined;
}

/** Drives `addToCart` against a stubbed `store-cart`, and reports what it did. */
async function runAddToCart(options: {
  cookieCartId?: string;
  /** What `getCart` answers for the cookie's cart, or `"unresolvable"` for one that does not. */
  existingCart?: {
    id: string;
    completed_at?: string | null;
    items?: { id: string; variant_id: string | null; metadata?: Record<string, unknown> }[];
  } | "unresolvable";
  reapplyFails?: boolean;
}): Promise<AddToCartRun> {
  vi.resetModules();
  const removed: [string, string][] = [];
  const added: [string, string, number][] = [];
  const applied: [string, string][] = [];
  const events: string[] = [];
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
      events.push(`remove:${lineId}`);
    },
    addLineToCart: async (_fetchJson: unknown, cartId: string, variantId: string, quantity: number) => {
      added.push([cartId, variantId, quantity]);
      events.push(`add:${variantId}`);
    },
    applySurcharge: async (_fetchJson: unknown, cartId: string, code: string) => {
      applied.push([cartId, code]);
      events.push(`apply:${code}`);
      if (options.reapplyFails === true) throw new Error("re-price failed");
    },
  }));
  vi.doMock("../src/lib/medusa-client", () => ({
    createStoreFetchJson: () => async () => ({}),
    getDefaultRegion: async () => ({ id: "reg_1", currency_code: "usd" }),
    // The certificate variants, which is what decides what gets cleared. P9a
    // made this list actually exclude merch.
    listTiers: async () => [{ variantId: "var_tier_a" }, { variantId: "var_tier_b" }, { variantId: "var_chosen" }],
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

  return { removed, added, applied, events, createdCarts, cookieWrittenAs };
}

describe("addToCart keeps the cart to one certificate", () => {
  it("clears the certificates that were there before adding the chosen tier", async () => {
    // Two lines, whether from two tiers or one tier added twice. Both go:
    // pressing "add" on a second tier is changing your mind, not ordering a
    // pair.
    const run = await runAddToCart({
      cookieCartId: "cart_1",
      existingCart: {
        id: "cart_1",
        completed_at: null,
        items: [
          { id: "line_a", variant_id: "var_tier_a" },
          { id: "line_b", variant_id: "var_tier_b" },
        ],
      },
    });

    expect(run.removed).toEqual([
      ["cart_1", "line_a"],
      ["cart_1", "line_b"],
    ]);
    expect(run.added).toEqual([["cart_1", "var_chosen", 1]]);
    expect(run.createdCarts).toBe(0);
    expect(run.cookieWrittenAs).toBe("cart_1");
  });

  it("leaves the merch alone, which LD-04 made the point of the rule", async () => {
    // **It used to clear every line.** "Replace what is in the cart" and "keep
    // at most one certificate" were the same sentence while a certificate was
    // the only thing sold. A buyer with a mug in the cart, changing their mind
    // about which tier they wanted, would have had the mug deleted by a
    // control labelled ACQUIRE with nothing on the page saying so.
    const run = await runAddToCart({
      cookieCartId: "cart_1",
      existingCart: {
        id: "cart_1",
        completed_at: null,
        items: [
          { id: "line_mug", variant_id: "var_mug" },
          { id: "line_tier", variant_id: "var_tier_a" },
          { id: "line_cap", variant_id: "var_cap" },
        ],
      },
    });

    expect(run.removed).toEqual([["cart_1", "line_tier"]]);
    expect(run.added).toEqual([["cart_1", "var_chosen", 1]]);
  });

  it("removes nothing from a cart that holds only merch", async () => {
    const run = await runAddToCart({
      cookieCartId: "cart_1",
      existingCart: { id: "cart_1", completed_at: null, items: [{ id: "line_mug", variant_id: "var_mug" }] },
    });
    expect(run.removed).toEqual([]);
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
      existingCart: { id: "cart_paid", completed_at: "2026-09-06T10:00:00.000Z", items: [{ id: "line_a", variant_id: "var_tier_a" }] },
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

  it("re-prices an existing surcharge after replacing the certificate", async () => {
    const run = await runAddToCart({
      cookieCartId: "cart_1",
      existingCart: {
        id: "cart_1",
        completed_at: null,
        items: [
          { id: "line_old_tier", variant_id: "var_tier_a" },
          { id: "line_surcharge", variant_id: null, metadata: { code: "BALDRICK20" } },
        ],
      },
    });

    expect(run.applied).toEqual([["cart_1", "BALDRICK20"]]);
    expect(run.events).toEqual(["remove:line_old_tier", "add:var_chosen", "apply:BALDRICK20"]);
    expect(run.removed).not.toContainEqual(["cart_1", "line_surcharge"]);
  });

  it("removes the stale surcharge when re-pricing it fails", async () => {
    const run = await runAddToCart({
      cookieCartId: "cart_1",
      reapplyFails: true,
      existingCart: {
        id: "cart_1",
        completed_at: null,
        items: [
          { id: "line_old_tier", variant_id: "var_tier_a" },
          { id: "line_surcharge", variant_id: null, metadata: { code: "BALDRICK20" } },
        ],
      },
    });

    expect(run.events).toEqual([
      "remove:line_old_tier",
      "add:var_chosen",
      "apply:BALDRICK20",
      "remove:line_surcharge",
    ]);
  });
});

describe("taking a line back out", () => {
  /**
   * **The operator reported it: "once added, the products can't be removed".**
   * `removeLineFromCart` had existed since the cart did and no page ever
   * offered it, so a buyer who added a mug to see what would happen had two
   * exits: complete the order, or abandon the cart. That is not an upsell, it
   * is a trap.
   */
  it("refuses a submission carrying no line", async () => {
    const { removeFromCart } = await import("../src/lib/cart-actions");
    await expect(removeFromCart(new FormData())).rejects.toThrow(/missing lineId/);
  });

  it("removes only a line the caller's own cart holds", async () => {
    /**
     * **It is a public POST endpoint**, like every export of a `"use server"`
     * module: anyone may call it with any line id. What stops that mattering
     * is that the cart comes from the caller's own cookie and the line must be
     * in it — a line id belonging to somebody else's cart matches nothing.
     */
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../src/lib/cart-actions.ts"),
      "utf8",
    ).replace(/\/\*[\s\S]*?\*\//g, "");
    const action = source.slice(source.indexOf("export async function removeFromCart"));

    expect(action).toContain("cookieStore.get(CART_ID_COOKIE)?.value");
    // The line is looked up in that cart before anything is deleted, rather
    // than the id being passed straight through to Medusa.
    expect(action).toMatch(/\(cart\.items \?\? \[\]\)\.find\(\(item\) => item\.id === lineId\)/);
    expect(action.indexOf("cart.items")).toBeLessThan(action.indexOf("removeLineFromCart"));
  });

  it("treats an id that is already gone as done, not as an error", () => {
    // Two clicks, a stale page, a back button. The buyer's intent is "this
    // should not be in my cart", and it already is not.
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../src/lib/cart-actions.ts"),
      "utf8",
    ).replace(/\/\*[\s\S]*?\*\//g, "");
    const action = source.slice(source.indexOf("export async function removeFromCart"));

    expect(action).toMatch(/if \(line !== undefined\) await removeLineFromCart/);
    expect(action).toContain("redirect(\"/cart\")");
  });

  it("reads the stripping, so a broken regex cannot pass by emptying the file", () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../src/lib/cart-actions.ts"),
      "utf8",
    ).replace(/\/\*[\s\S]*?\*\//g, "");
    expect(source).toContain("export async function removeFromCart");
  });
});

describe("which lines the cart offers to remove", () => {
  /**
   * **The certificate is deliberately not removable, and a mutation proved
   * nothing said so.** Replacing the gate with `true` offered the control on
   * every line and every test passed.
   *
   * `isPayableCart` requires exactly one certificate — merch is an upsell,
   * settled by the operator on 2026-09-09 — so a cart stripped of it is one
   * the pay control refuses with nothing on the page explaining why. A buyer
   * changing tier replaces the certificate from the purchase order; they do
   * not void it from the cart.
   */
  const source = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../src/app/cart/page.tsx"),
    "utf8",
  ).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

  it("decides from the merch already on the page, not from a title", () => {
    // The upsell is fetched here anyway, so its variant ids are known. A
    // second question to Medusa, or a guess from the line's words, would both
    // be worse.
    expect(source).toContain("const removable = new Set(merch.flatMap((row) => row.variants.map((variant) => variant.variantId)))");
  });

  it("gates the control on that set", () => {
    expect(source).toMatch(/removable\.has\(item\.variant_id\) \? \(/);
    // And the gate is a condition, not a constant somebody left behind.
    expect(source).not.toMatch(/\btrue \? \(\s*<RemoveLine/);
  });

  it("reads the stripping, so a broken regex cannot pass by emptying the file", () => {
    expect(source).toContain("export default async function CartPage");
  });
});

describe("what a cart line says it is", () => {
  /**
   * **The cart-side half of the same defect the upsell table had.** Medusa
   * sets a line's `title` from the *product* — which here is a joke — and puts
   * the size in `variant_title`. So the ledger read "Original Purchase
   * Receipt" and a buyer could tell neither what the object was nor which size
   * they had chosen until the parcel arrived.
   *
   * `items.variant_title` is already in Medusa's `defaultStoreCartFields`, so
   * this costs one field read and no extra request.
   */
  const source = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../src/app/cart/page.tsx"),
    "utf8",
  ).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

  it("names the size beside the title", () => {
    expect(source).toContain("function lineLabel(");
    expect(source).toContain('label={lineLabel(item.title ?? item.variant_id ?? "Cart item", item.variant_title)}');
  });

  it("drops a variant title that would only repeat the product", () => {
    // A certificate has one variant and no size worth printing; Medusa's own
    // placeholder is worse than nothing.
    expect(source).toMatch(/size === title \|\| size === "Default variant"/);
  });

  it("drops an empty or whitespace variant title", () => {
    // An em dash trailing nothing reads as a rendering fault.
    expect(source).toMatch(/size\.length === 0/);
  });

  it("reads the stripping, so a broken regex cannot pass by emptying the file", () => {
    expect(source).toContain("export default async function CartPage");
  });
});
