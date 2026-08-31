/**
 * The row's verification: the proxy's refusals, its one legitimate path, its
 * header hygiene, and the checkout/payment data-layer functions -- all
 * against injected stubs, never a mocked global `fetch` and never a real
 * socket. `vitest.config.ts` collects `tests/**\/*.test.ts` only, not
 * `.tsx`, so nothing here renders `checkout/page.tsx` or `PaymentForm.tsx`.
 *
 * "The proxy's test is adversarial or it is nothing" (T10, section 6): each
 * refusal below is its own named case, so a regression says which defence
 * broke, and `describe("the store-api prefix allowlist")` closes with the one
 * path that must still pass.
 */

import { describe, expect, it } from "vitest";

import {
  forwardStoreApiRequest,
  resolveStoreApiPath,
  resolveStoreApiTarget,
  type StoreApiFetch,
} from "../src/app/api/store/[...path]/route";
import { STORE_PUBLISHABLE_KEY_HEADER, type FetchJson, type StoreFetchInit } from "../src/lib/medusa-client";
import { getCheckoutCart } from "../src/lib/store-checkout";
import { addLineToCart, createCart } from "../src/lib/store-cart";
import {
  completeCheckoutCart,
  createPaymentCollection,
  initiateStripePaymentSession,
  STRIPE_PROVIDER_ID,
} from "../src/lib/store-payment";

describe("resolveStoreApiPath refuses every attack in the row's brief", () => {
  it("refuses a literal .. immediately after the mount prefix", () => {
    expect(resolveStoreApiPath("/api/store/../admin/users")).toBeNull();
  });

  it("refuses a percent-encoded .. segment under the store namespace", () => {
    expect(resolveStoreApiPath("/api/store/store/%2e%2e/admin/users")).toBeNull();
  });

  it("refuses a segment whose decoded form hides a path separator (%2f)", () => {
    expect(resolveStoreApiPath("/api/store/store/%2e%2e%2f%2e%2e/admin/users")).toBeNull();
  });

  it("refuses the admin namespace by name", () => {
    expect(resolveStoreApiPath("/api/store/admin/users")).toBeNull();
  });

  it("refuses a path with no second segment", () => {
    expect(resolveStoreApiPath("/api/store/store")).toBeNull();
  });

  it("refuses a segment whose decoded form is a backslash", () => {
    expect(resolveStoreApiPath("/api/store/store/%5c")).toBeNull();
  });

  it("refuses a double-encoded .. segment (%252e%252e), which decodes to a dot segment only on a second pass", () => {
    expect(resolveStoreApiPath("/api/store/store/%252e%252e/admin/users")).toBeNull();
  });

  it("still resolves the one legitimate two-segment store path", () => {
    expect(resolveStoreApiPath("/api/store/store/products")).toBe("/store/products");
  });
});

describe("resolveStoreApiPath's normalization re-check", () => {
  // Belt and braces: even a resolved (non-null) path is refused unless the
  // parser's own output still sits under the namespace that admitted it.
  // Every escape above already returns null from the per-segment check first,
  // so this asserts the *contract* the re-check exists to hold, not a path
  // that reaches it uncaught -- see the "fails closed" evidence in the row's
  // report for a case that does reach it.
  it("never returns a path outside its own namespace for any input it accepts", () => {
    const accepted = resolveStoreApiPath("/api/store/store/products");
    expect(accepted).not.toBeNull();
    expect(accepted?.startsWith("/store/")).toBe(true);
  });
});

describe("resolveStoreApiTarget", () => {
  it("builds the backend URL by replacing the origin's path, not joining it", () => {
    const target = resolveStoreApiTarget("/store/products", "?limit=1", "https://backend.invalid:9000");
    expect(target.toString()).toBe("https://backend.invalid:9000/store/products?limit=1");
  });
});

describe("forwardStoreApiRequest header hygiene", () => {
  it("forwards only the allowlist (content-type, accept), and attaches the publishable key server-side", async () => {
    let seenInit: RequestInit | undefined;
    const fetchImpl: StoreApiFetch = async (_target, init) => {
      seenInit = init;
      return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
    };

    const request = new Request("https://storefront.example/api/store/store/products", {
      headers: {
        host: "storefront.example",
        "content-length": "0",
        connection: "keep-alive",
        "content-type": "application/json",
        accept: "application/json",
        [STORE_PUBLISHABLE_KEY_HEADER]: "pk_spoofed_by_the_browser",
        cookie: "session=browser-cookie-that-must-not-reach-medusa",
        authorization: "Bearer browser-supplied-token",
        "x-medusa-access-token": "spoofed-admin-token",
        origin: "https://storefront.example",
        referer: "https://storefront.example/checkout",
        "x-forwarded-host": "evil.example",
        "x-forwarded-for": "203.0.113.1",
      },
    });

    await forwardStoreApiRequest(request, new URL("https://backend.invalid/store/products"), "pk_real", fetchImpl);

    const headers = new Headers(seenInit?.headers);
    // The two the flow needs.
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("accept")).toBe("application/json");
    expect(headers.get(STORE_PUBLISHABLE_KEY_HEADER)).toBe("pk_real");

    // Everything else the browser sent -- the hop-by-hop set this route used
    // to strip by name, and every header Major 3 measured reaching Medusa
    // through the old denylist -- proven absent rather than merely unasserted.
    expect(headers.has("host")).toBe(false);
    expect(headers.has("content-length")).toBe(false);
    expect(headers.has("connection")).toBe(false);
    expect(headers.has("cookie")).toBe(false);
    expect(headers.has("authorization")).toBe(false);
    expect(headers.has("x-medusa-access-token")).toBe(false);
    expect(headers.has("origin")).toBe(false);
    expect(headers.has("referer")).toBe(false);
    expect(headers.has("x-forwarded-host")).toBe(false);
    expect(headers.has("x-forwarded-for")).toBe(false);

    // The full set Medusa receives is exactly the allowlist plus the key --
    // nothing extra rode along.
    expect([...headers.keys()].sort()).toEqual(["accept", "content-type", STORE_PUBLISHABLE_KEY_HEADER].sort());
  });

  it("strips content-encoding and content-length from the response, but keeps other upstream headers", async () => {
    const fetchImpl: StoreApiFetch = async () =>
      new Response("{}", {
        status: 200,
        headers: {
          "content-encoding": "gzip",
          "content-length": "999",
          "x-upstream-only": "kept",
        },
      });

    const response = await forwardStoreApiRequest(
      new Request("https://storefront.example/api/store/store/products"),
      new URL("https://backend.invalid/store/products"),
      "pk_real",
      fetchImpl,
    );

    expect(response.headers.get("content-encoding")).toBeNull();
    expect(response.headers.get("content-length")).toBeNull();
    expect(response.headers.get("x-upstream-only")).toBe("kept");
  });

  it("drops location, content-location and link -- the redirect/resource channels that can name the backend origin", async () => {
    const fetchImpl: StoreApiFetch = async () =>
      new Response(null, {
        status: 302,
        headers: {
          location: "https://medusa-internal.example.svc.cluster.local:9000/store/redirecting",
          "content-location": "https://medusa-internal.example.svc.cluster.local:9000/store/products",
          link: '<https://medusa-internal.example.svc.cluster.local:9000/store/products?page=2>; rel="next"',
        },
      });

    const response = await forwardStoreApiRequest(
      new Request("https://storefront.example/api/store/store/redirecting"),
      new URL("https://backend.invalid/store/redirecting"),
      "pk_real",
      fetchImpl,
    );

    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("content-location")).toBeNull();
    expect(response.headers.get("link")).toBeNull();
  });

  it("strips only the Domain attribute from a Set-Cookie, keeping the rest and every other cookie", async () => {
    const fetchImpl: StoreApiFetch = async () => {
      const headers = new Headers();
      headers.append(
        "set-cookie",
        "connect.sid=abc; Domain=medusa-internal.example.svc.cluster.local; Path=/; HttpOnly",
      );
      headers.append("set-cookie", "no_domain=xyz; Path=/; Secure");
      return new Response(null, { status: 200, headers });
    };

    const response = await forwardStoreApiRequest(
      new Request("https://storefront.example/api/store/store/carts"),
      new URL("https://backend.invalid/store/carts"),
      "pk_real",
      fetchImpl,
    );

    const setCookies = response.headers.getSetCookie();
    expect(setCookies).toHaveLength(2);
    expect(setCookies.some((cookie) => cookie.includes("Domain="))).toBe(false);
    expect(setCookies.some((cookie) => cookie.startsWith("connect.sid=abc;"))).toBe(true);
    expect(setCookies.some((cookie) => cookie.includes("HttpOnly"))).toBe(true);
    expect(setCookies.some((cookie) => cookie.startsWith("no_domain=xyz;"))).toBe(true);
  });
});

/** A `FetchJson` that answers the store API paths this row's checkout/payment functions call, and nothing else. */
function stubStoreApi(overrides: Record<string, unknown> = {}): FetchJson {
  return (async <T>(path: string, init?: StoreFetchInit): Promise<T> => {
    if (path === "/store/carts/cart_fixture") {
      return { cart: { id: "cart_fixture", currency_code: "usd", total: 25, ...overrides } } as T;
    }
    if (path === "/store/payment-collections" && init?.method === "POST") {
      return { payment_collection: { id: "paycol_fixture", payment_sessions: [] } } as T;
    }
    if (path === "/store/payment-collections/paycol_fixture/payment-sessions" && init?.method === "POST") {
      return {
        payment_collection: {
          id: "paycol_fixture",
          payment_sessions: [
            { provider_id: STRIPE_PROVIDER_ID, data: { client_secret: "pi_fixture_secret" } },
            { provider_id: "pp_system_default", data: {} },
          ],
        },
      } as T;
    }
    if (path === "/store/carts/cart_fixture/complete" && init?.method === "POST") {
      return { type: "order", order: { id: "order_fixture" } } as T;
    }
    throw new Error(`stub has no route for ${path} (${init?.method ?? "GET"})`);
  }) as FetchJson;
}

describe("getCheckoutCart", () => {
  it("reads the cart's own total, unconverted", async () => {
    const cart = await getCheckoutCart(stubStoreApi(), "cart_fixture");
    expect(cart).toEqual({ id: "cart_fixture", currencyCode: "usd", total: 25 });
  });

  it("refuses a cart the stub answers with no numeric total", async () => {
    const fetchJson = stubStoreApi({ total: "25" });
    await expect(getCheckoutCart(fetchJson, "cart_fixture")).rejects.toThrow(/incomplete cart/);
  });
});

describe("the Stripe payment session", () => {
  it("creates a payment collection, then its Stripe session's client secret", async () => {
    const fetchJson = stubStoreApi();
    const paymentCollectionId = await createPaymentCollection(fetchJson, "cart_fixture");
    expect(paymentCollectionId).toBe("paycol_fixture");

    const session = await initiateStripePaymentSession(fetchJson, paymentCollectionId);
    expect(session).toEqual({ clientSecret: "pi_fixture_secret" });
  });

  it("refuses a payment collection response with no matching Stripe session", async () => {
    const fetchJson: FetchJson = (async <T>(path: string, init?: StoreFetchInit): Promise<T> => {
      if (path === "/store/payment-collections/paycol_empty/payment-sessions" && init?.method === "POST") {
        return { payment_collection: { id: "paycol_empty", payment_sessions: [] } } as T;
      }
      throw new Error(`stub has no route for ${path}`);
    }) as FetchJson;

    await expect(initiateStripePaymentSession(fetchJson, "paycol_empty")).rejects.toThrow(/no Stripe client secret/);
  });
});

describe("completeCheckoutCart", () => {
  it("returns the placed order when Medusa answers type: order", async () => {
    const order = await completeCheckoutCart(stubStoreApi(), "cart_fixture");
    expect(order).toEqual({ orderId: "order_fixture" });
  });

  // The route this calls answers a failed completion with HTTP 200 and
  // `{ type: "cart", ... }` (see store-payment.ts's own comment) -- `!response.ok`
  // never fires, so this is the refusal that has to catch it instead.
  it("refuses a type: cart response as an order, even though the HTTP status was 200", async () => {
    const fetchJson: FetchJson = (async <T>(path: string, init?: StoreFetchInit): Promise<T> => {
      if (path === "/store/carts/cart_declined/complete" && init?.method === "POST") {
        return { type: "cart", cart: { id: "cart_declined" }, error: { message: "card declined" } } as T;
      }
      throw new Error(`stub has no route for ${path}`);
    }) as FetchJson;

    await expect(completeCheckoutCart(fetchJson, "cart_declined")).rejects.toThrow(/did not place an order/);
  });
});

/**
 * Section 1's own claim, end to end: "complete a cart through Stripe test
 * mode to a paid order." One stub, standing in for the whole Store API this
 * row's functions call in sequence -- `createCart`/`addLineToCart`
 * (`store-cart.ts`, T9, used unmodified) through `getCheckoutCart`,
 * `createPaymentCollection`, `initiateStripePaymentSession` and
 * `completeCheckoutCart` (this row) -- never a mocked global `fetch`.
 *
 * `stripe.confirmPayment` itself is the one step this stub cannot stand in
 * for: it is a real call into Stripe's own API from the browser, which is
 * exactly why `PaymentForm.tsx` is a `"use client"` component and not
 * something `tests/**\/*.test.ts` (no `.tsx`) can exercise. This test starts
 * from the same place `completeCheckoutCart`'s own comment does -- "after the
 * browser's own `stripe.confirmPayment` already succeeded" -- and the real
 * confirmation is what T17's smoke check against a real backend covers.
 */
describe("the cart-to-paid-order flow, against one stubbed backend", () => {
  it("creates a cart, adds a tier, shows its total, and completes it to a paid order", async () => {
    const state: { total: number; completed: boolean } = { total: 25, completed: false };

    const fetchJson: FetchJson = (async <T>(path: string, init?: StoreFetchInit): Promise<T> => {
      if (path === "/store/carts" && init?.method === "POST") {
        return { cart: { id: "cart_e2e", currency_code: "usd", items: [] } } as T;
      }
      if (path === "/store/carts/cart_e2e/line-items" && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as { variant_id: string; quantity: number };
        return {
          cart: {
            id: "cart_e2e",
            currency_code: "usd",
            items: [{ id: "item_e2e", variant_id: body.variant_id, quantity: body.quantity, unit_price: state.total }],
          },
        } as T;
      }
      if (path === "/store/carts/cart_e2e" && (init?.method ?? "GET") === "GET") {
        return { cart: { id: "cart_e2e", currency_code: "usd", total: state.total } } as T;
      }
      if (path === "/store/payment-collections" && init?.method === "POST") {
        return { payment_collection: { id: "paycol_e2e", payment_sessions: [] } } as T;
      }
      if (path === "/store/payment-collections/paycol_e2e/payment-sessions" && init?.method === "POST") {
        return {
          payment_collection: {
            id: "paycol_e2e",
            payment_sessions: [{ provider_id: STRIPE_PROVIDER_ID, data: { client_secret: "pi_e2e_secret" } }],
          },
        } as T;
      }
      if (path === "/store/carts/cart_e2e/complete" && init?.method === "POST") {
        // Only reachable once the browser's own `stripe.confirmPayment` has
        // already succeeded -- see this describe block's own comment.
        state.completed = true;
        return { type: "order", order: { id: "order_e2e" } } as T;
      }
      throw new Error(`stub has no route for ${path} (${init?.method ?? "GET"})`);
    }) as FetchJson;

    const cart = await createCart(fetchJson, "reg_fixture");
    const line = await addLineToCart(fetchJson, cart.id, "variant_pro", 1);
    expect(line.unitPrice).toBe(25);

    const checkoutCart = await getCheckoutCart(fetchJson, cart.id);
    expect(checkoutCart).toEqual({ id: "cart_e2e", currencyCode: "usd", total: 25 });

    const paymentCollectionId = await createPaymentCollection(fetchJson, checkoutCart.id);
    const session = await initiateStripePaymentSession(fetchJson, paymentCollectionId);
    expect(session.clientSecret).toBe("pi_e2e_secret");

    // Stands in for the browser's `stripe.confirmPayment(session.clientSecret)`
    // succeeding in Stripe test mode -- see the describe block's comment.
    const order = await completeCheckoutCart(fetchJson, checkoutCart.id);

    expect(state.completed).toBe(true);
    expect(order).toEqual({ orderId: "order_e2e" });
  });
});
