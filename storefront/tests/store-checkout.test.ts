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

import { createRequire } from "node:module";
import { readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ALLOWED_NAMESPACES,
  forwardStoreApiRequest,
  resolveStoreApiPath,
  resolveStoreApiTarget,
  type StoreApiFetch,
} from "../src/app/api/store/[...path]/route";
import { STORE_PUBLISHABLE_KEY_HEADER, type FetchJson, type StoreFetchInit } from "../src/lib/medusa-client";
import { getCheckoutCart, setCartCountry } from "../src/lib/store-checkout";
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

  // Review pass 1, Major 2: every case above is written against `store`; this
  // row's whole subject is admitting `hooks`, so the same two representative
  // attacks (a literal `..` and its percent-encoded form) are repeated here
  // against the namespace this row actually widened. Neither is new
  // *mechanism* -- defence 4 (the per-segment refusal) does not know which
  // namespace admitted a segment -- but nothing before this review exercised
  // it under `hooks` at all.
  it("refuses a literal .. under the hooks namespace this row admits", () => {
    expect(resolveStoreApiPath("/api/store/hooks/../admin/users")).toBeNull();
  });

  it("refuses a percent-encoded .. segment under the hooks namespace", () => {
    expect(resolveStoreApiPath("/api/store/hooks/%2e%2e/admin/users")).toBeNull();
  });
});

describe("resolveStoreApiPath's normalization re-check", () => {
  // Belt and braces: even a resolved (non-null) path is refused unless the
  // parser's own output still sits under the namespace that admitted it.
  // Every escape above already returns null from the per-segment check first,
  // so this asserts the *contract* the re-check exists to hold, not a path
  // that reaches it uncaught.
  it("never returns a path outside its own namespace for any input it accepts", () => {
    const accepted = resolveStoreApiPath("/api/store/store/products");
    expect(accepted).not.toBeNull();
    expect(accepted?.startsWith("/store/")).toBe(true);
  });

  /**
   * Review pass 1, Major 2's own case: this one *does* reach the re-check
   * uncaught, unlike every escape above. `decodeSegmentFully` only runs
   * `decodeURIComponent`, which does not touch a literal tab/CR/LF, so the
   * segment `".\t."` decodes to itself -- neither `"."` nor `".."` by a literal
   * comparison, so {@link isRefusedSegment} lets it through. The WHATWG URL
   * parser `resolveStoreApiTarget` (and this function's own re-check) runs the
   * path through then strips ASCII tab/newline/CR before parsing (the
   * `remove all ASCII tab or newline` step in the URL spec's basic parser),
   * turning `.\t.` into a real `..` and collapsing `/hooks/.\t./admin/users`
   * to `/admin/users` -- outside the `hooks` namespace that admitted the
   * request. Only the re-check's `startsWith` catches this; defences 1-4 all
   * pass it. Measured directly: `new URL("/hooks/.\t./admin/users",
   * "http://store-api-proxy.invalid").pathname === "/admin/users"`.
   */
  it("refuses a tab-spliced dot segment that defences 1-4 all pass, and only the re-check catches", () => {
    expect(resolveStoreApiPath("/api/store/hooks/.\t./admin/users")).toBeNull();
  });

  it("refuses the same tab-splice family with a leading real segment before it", () => {
    expect(resolveStoreApiPath("/api/store/hooks/x/.\t./.\t./admin/users")).toBeNull();
  });
});

describe("resolveStoreApiPath admits the payment webhook path (T18)", () => {
  // Review pass 1, Major 3: pinned literally, not derived. `STRIPE_PROVIDER_ID`
  // is itself a hand-written literal -- `store-payment.ts:41`'s own JSDoc says
  // so, and it is not derived from `backend/src/config/payment.ts` -- so a
  // test that derives its expectation from `STRIPE_PROVIDER_ID` as well never
  // checks that literal against anything: a corrupted `STRIPE_PROVIDER_ID` and
  // a derivation that correctly follows it agree with each other and the test
  // still passes. Confirmed both ways before this line existed: mutating the
  // "pp_" prefix to "px_", and mutating the instance half to "wrong", each
  // left the full 484-test suite green. This is the same limit
  // `ALLOWED_NAMESPACES`'s own declared-set test (above) closed with a
  // literal, applied here to the other spelling this row introduces.
  it("STRIPE_PROVIDER_ID is exactly pp_stripe_stripe", () => {
    expect(STRIPE_PROVIDER_ID).toBe("pp_stripe_stripe");
  });

  // The segment itself is derived, not spelled a second time:
  // `getWebhookActionAndData`
  // (`node_modules/@medusajs/payment/dist/services/payment-module.js:696`)
  // resolves the `:provider` URL param back to a registration key by
  // computing `pp_${provider}` -- i.e. the URL segment is the registration
  // key *without* its `pp_` prefix -- and `STRIPE_PROVIDER_ID`, pinned above,
  // is that same registration key. Safe to derive from now that the thing
  // being derived from is itself pinned rather than a second free-floating
  // guess.
  const webhookProviderSegment = STRIPE_PROVIDER_ID.slice("pp_".length);

  it("resolves /api/store/hooks/payment/<provider> to the real Medusa webhook route", () => {
    expect(resolveStoreApiPath(`/api/store/hooks/payment/${webhookProviderSegment}`)).toBe(
      `/hooks/payment/${webhookProviderSegment}`,
    );
  });

  // The end-to-end literal plepic's own webhook test pins twice
  // (`plepic/backend/tests/stripe-webhook-endpoint.test.ts:61`) -- independent
  // of both constants above, so it stays a true statement about the real
  // route even if some future change breaks the derivation between them.
  it("resolves the exact, literal route Stripe delivers to", () => {
    expect(resolveStoreApiPath("/api/store/hooks/payment/stripe_stripe")).toBe("/hooks/payment/stripe_stripe");
  });
});

/**
 * The top-level directory names under the installed `@medusajs/medusa`
 * package's own `dist/api` source tree -- read from disk rather than a
 * hand-typed guess, so this list cannot go stale relative to what this proxy
 * might one day be asked to forward to.
 *
 * Not itself a URL prefix, and not every entry holds a live route: `dist/api`
 * is Medusa's *source layout*, and `ApiLoader` (`@medusajs/framework/dist/http/router.js`)
 * mounts each `route.js` it finds at the application root using a matcher
 * derived from that file's own path -- `hooks/payment/[provider]/route.js`
 * becomes `/hooks/payment/:provider`, not `/api/hooks/payment/:provider`.
 * `utils` (measured: zero `route.js` files under it, only validators and
 * middleware) is exactly the case that distinction matters for: it is a real
 * top-level name in this source tree and a real candidate this measurement
 * produces, but not a route this proxy could ever legitimately be asked to
 * reach -- which the property below still gets right, because
 * `resolveStoreApiPath` never resolves anything not in `ALLOWED_NAMESPACES`,
 * live route or not.
 *
 * `static` is not among these directories at all: Medusa serves product media
 * from a static file server mounted directly on `app`
 * (`@medusajs/framework/dist/http/express-loader.js:159`,
 * `app.use("/static", express.static(...))`), not from anything under
 * `dist/api` -- so it is not a candidate this measurement can ever produce,
 * and its exclusion is asserted directly below instead.
 */
function medusaApiNamespaces(): readonly string[] {
  const apiDir = join(dirname(createRequire(import.meta.url).resolve("@medusajs/medusa/package.json")), "dist/api");
  return readdirSync(apiDir).filter((name) => statSync(join(apiDir, name)).isDirectory());
}

describe("the store-api namespace allowlist admits exactly what it declares", () => {
  // This is the one place the two names are written out. Everything else in
  // this file asserts a property computed from `ALLOWED_NAMESPACES` itself;
  // only this assertion notices if that declaration's *membership* ever
  // changes. Concretely: adding a third name here (say, "admin") makes this
  // assertion fail, while the property test below -- which derives its own
  // expectation from `ALLOWED_NAMESPACES.has(...)` -- passes regardless,
  // because it checks that the mechanism matches the declaration, not that
  // the declaration itself is the intended one.
  it("declares exactly store and hooks, and nothing else", () => {
    expect([...ALLOWED_NAMESPACES].sort()).toEqual(["hooks", "store"]);
  });

  it("resolves or refuses every namespace Medusa actually mounts, exactly as ALLOWED_NAMESPACES says it should", () => {
    const namespaces = medusaApiNamespaces();
    // Not vacuous: the measured universe really does contain both the
    // namespace this row admits and at least one this row must keep refusing.
    expect(namespaces).toContain("hooks");
    expect(namespaces).toContain("admin");

    for (const namespace of namespaces) {
      const resolved = resolveStoreApiPath(`/api/store/${namespace}/probe`);
      expect(resolved).toBe(ALLOWED_NAMESPACES.has(namespace) ? `/${namespace}/probe` : null);
    }
  });

  it("static has no consumer and stays refused", () => {
    expect(resolveStoreApiPath("/api/store/static/product.jpg")).toBeNull();
  });
});

describe("resolveStoreApiTarget", () => {
  it("builds the backend URL by replacing the origin's path, not joining it", () => {
    const target = resolveStoreApiTarget("/store/products", "?limit=1", "https://backend.invalid:9000");
    expect(target.toString()).toBe("https://backend.invalid:9000/store/products?limit=1");
  });
});

describe("forwardStoreApiRequest header hygiene", () => {
  it("forwards only the allowlist (content-type, accept, stripe-signature), and attaches the publishable key server-side", async () => {
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
        "stripe-signature": "t=1,v1=deadbeef",
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
    // The three the flow needs.
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("accept")).toBe("application/json");
    // Review pass 1, Major 1: without this, `stripe-base.js`'s
    // `constructWebhookEvent` sees `signature === null` and
    // `constructEvent` throws -- after Medusa has already answered Stripe
    // `200` (`hooks/payment/[provider]/route.js` enqueues before verifying).
    // Proven present here, and exercised end to end below.
    expect(headers.get("stripe-signature")).toBe("t=1,v1=deadbeef");
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
    expect([...headers.keys()].sort()).toEqual(
      ["accept", "content-type", "stripe-signature", STORE_PUBLISHABLE_KEY_HEADER].sort(),
    );
  });

  /**
   * Review pass 1, Major 1's exact-delivery probe: the real webhook path
   * (`resolveStoreApiPath`, not a hand-typed one), a raw, non-JSON body (a
   * Stripe event payload is signed over its exact bytes, so this is not
   * `JSON.stringify`'d and reparsed), and the header Stripe's SDK signs
   * requests with -- through the same `forwardStoreApiRequest` production
   * traffic uses, asserting what the simulated Medusa side actually receives.
   */
  it("carries stripe-signature and the byte-identical raw body through an exact webhook delivery", async () => {
    const requestPath = `/api/store/hooks/payment/${STRIPE_PROVIDER_ID.slice("pp_".length)}`;
    const upstreamPath = resolveStoreApiPath(requestPath);
    expect(upstreamPath).toBe(`/hooks/payment/${STRIPE_PROVIDER_ID.slice("pp_".length)}`);
    if (upstreamPath === null) throw new Error("unreachable: asserted above");

    const rawBody = '{"id":"evt_1","object":"event","data":{"object":{"id":"pi_1"}}}';
    let seenHeaders: Headers | undefined;
    let seenBody: string | undefined;
    const fetchImpl: StoreApiFetch = async (_target, init) => {
      seenHeaders = new Headers(init.headers);
      seenBody = new TextDecoder().decode(init.body as ArrayBuffer);
      return new Response(null, { status: 200 });
    };

    const request = new Request(`https://storefront.example${requestPath}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "stripe-signature": "t=1700000000,v1=exact-delivery-signature",
      },
      body: rawBody,
    });

    await forwardStoreApiRequest(request, new URL(`https://backend.invalid${upstreamPath}`), "pk_real", fetchImpl);

    expect(seenHeaders?.get("stripe-signature")).toBe("t=1700000000,v1=exact-delivery-signature");
    expect(seenBody).toBe(rawBody);
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

describe("setCartCountry sends the country to Medusa and reads back what it returned", () => {
  it("posts country_code on both shipping_address and billing_address, and returns the shipping-address country and tax_total the stub answered with", async () => {
    let seenBody: unknown;
    const fetchJson: FetchJson = (async <T>(path: string, init?: StoreFetchInit): Promise<T> => {
      if (path === "/store/carts/cart_country" && init?.method === "POST") {
        seenBody = init.body === undefined ? undefined : JSON.parse(init.body);
        return {
          cart: { id: "cart_country", shipping_address: { country_code: "ee" }, tax_total: 97 },
        } as T;
      }
      throw new Error(`stub has no route for ${path} (${init?.method ?? "GET"})`);
    }) as FetchJson;

    // "ee" -- lower-case, the shape this row's Finding 1 fix requires: a
    // value taken from a region's own `countries` (`medusa-client.ts`'s
    // `StoreRegion.countries`, already lower-case per
    // `@medusajs/region/dist/loaders/defaults.js:10`) is the only shape
    // `update-cart.js:30-34`'s strict `===` against `iso_2` accepts.
    // `PaymentForm.tsx` now sources this argument from exactly that list
    // (its `<select>`), rather than from Stripe's upper-case `AddressElement`
    // country, which is what this test asserted before this fix and why that
    // assertion had to change.
    const result = await setCartCountry(fetchJson, "cart_country", "ee");

    // The country this row's brief requires "reaching the cart" -- sent on
    // both address fields (T10b: only shipping drives tax, but billing is
    // set too -- see `store-checkout.ts`'s own comment for why), and proven
    // by inspecting the exact request body, not merely by not-throwing.
    expect(seenBody).toEqual({
      shipping_address: { country_code: "ee" },
      billing_address: { country_code: "ee" },
    });
    // What this function returns is the API's own response, read back, not
    // assumed to equal what was sent.
    expect(result).toEqual({ countryCode: "ee", taxTotal: 97 });
  });

  it("refuses a response with no shipping-address country", async () => {
    const fetchJson: FetchJson = (async <T>(): Promise<T> => {
      return { cart: { id: "cart_country" } } as T;
    }) as FetchJson;

    await expect(setCartCountry(fetchJson, "cart_country", "ee")).rejects.toThrow(
      /did not return a shipping-address country/,
    );
  });

  it("returns an undefined taxTotal, rather than throwing, when the response carries a country but no numeric tax_total -- nothing in this row reads the value (PaymentForm.tsx discards setCartCountry's return), so its absence is not the failure a missing country is", async () => {
    const fetchJson: FetchJson = (async <T>(): Promise<T> => {
      return { cart: { id: "cart_country", shipping_address: { country_code: "ee" } } } as T;
    }) as FetchJson;

    const result = await setCartCountry(fetchJson, "cart_country", "ee");
    expect(result).toEqual({ countryCode: "ee", taxTotal: undefined });
  });
});

/**
 * These two do not test Medusa's tax rule. They test that `setCartCountry`
 * passes whatever country it is given through to the request body, and
 * surfaces whatever `tax_total` the response carries back -- unmodified,
 * unrecomputed. The stub below encodes *this test file's own model* of
 * Medusa's EU/non-EU rule (a positive `tax_total` for `ee`, zero for `us`) so
 * the two cases read differently in this test; it is not a claim that a real
 * Medusa applies that rule the same way. No row in this LD-01 slice proves
 * Medusa's tax rule against a real backend: T17's own checkbox
 * (`docs/working/ld-01-foundation.md`) reads "Stand up PostgreSQL, Redis and
 * a migrated Medusa, then assert the store API answers with the three tiers
 * and that a cart can be created" -- no tax, no country -- and its `Files`
 * list is entirely `backend/` and `scripts/`. That proof does not exist in
 * this repository yet.
 */
describe("setCartCountry against a stub modelling (not proving) an EU/non-EU tax-region split", () => {
  function stubTaxByCountry(): FetchJson {
    return (async <T>(path: string, init?: StoreFetchInit): Promise<T> => {
      if (path === "/store/carts/cart_tax" && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as { shipping_address: { country_code: string } };
        const country = body.shipping_address.country_code;
        // This test's own model of Medusa's rule, not Medusa itself: an EU
        // country code resolves a tax region and a positive tax_total; any
        // other code resolves none. See this describe block's own comment.
        const taxTotal = country === "ee" ? 97 : 0;
        return { cart: { id: "cart_tax", shipping_address: { country_code: country }, tax_total: taxTotal } } as T;
      }
      throw new Error(`stub has no route for ${path} (${init?.method ?? "GET"})`);
    }) as FetchJson;
  }

  it("surfaces a positive tax_total for an EU country (ee), per this test's stub model of Medusa's rule", async () => {
    const result = await setCartCountry(stubTaxByCountry(), "cart_tax", "ee");
    expect(result).toEqual({ countryCode: "ee", taxTotal: 97 });
  });

  it("surfaces a zero tax_total for a non-EU country (us), per this test's stub model of Medusa's rule", async () => {
    const result = await setCartCountry(stubTaxByCountry(), "cart_tax", "us");
    expect(result).toEqual({ countryCode: "us", taxTotal: 0 });
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
