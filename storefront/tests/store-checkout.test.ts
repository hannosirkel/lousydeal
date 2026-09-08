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
import { fileURLToPath } from "node:url";
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
import { cartNeedsAddress, isPayableCart } from "../src/lib/checkout-rules";
import {
  getCheckoutCart,
  listCartShippingOptions,
  setCartCountry,
  setCartShippingAddress,
  setCartShippingMethod,
} from "../src/lib/store-checkout";
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
   * turning `.\t.` into a real `..` and collapsing `/store/.\t./admin/users`
   * to `/admin/users` -- outside the `store` namespace that admitted the
   * request. Only the re-check's `startsWith` catches this; defences 1-4 all
   * pass it. Measured directly: `new URL("/store/.\t./admin/users",
   * "http://store-api-proxy.invalid").pathname === "/admin/users"`.
   *
   * Orchestrator review, Major: these two cases originally targeted `hooks`,
   * from before T22b gave `hooks` its own admitted-path branch. That branch
   * now returns -- admitted or refused -- for every `hooks` input on a
   * `segments.length !== 3` mismatch alone, before this function ever reaches
   * the re-check below; deleting the re-check does not change either
   * `hooks`-namespace outcome, so a `hooks` case here proved nothing about
   * this line. `store` still runs the shared code past all four defences
   * above, so it is the namespace this proof has to live in. The `hooks`
   * inputs this block used to carry moved to "the hooks namespace admits
   * exactly the registered webhook path" below, where they now assert that
   * branch's own segment-count refusal instead.
   */
  it("refuses a tab-spliced dot segment that defences 1-4 all pass, and only the re-check catches", () => {
    expect(resolveStoreApiPath("/api/store/store/.\t./admin/users")).toBeNull();
  });

  it("refuses the same tab-splice family with a leading real segment before it", () => {
    expect(resolveStoreApiPath("/api/store/store/x/.\t./.\t./admin/users")).toBeNull();
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
 * T22a's own review of the identical change in plepic (`71c242d`) found that
 * "a test that refuses one hardcoded sibling proves almost nothing," and that
 * its first draft tested the decode-based check with no percent-encoded input
 * at all. This suite is written against that lesson: it asserts the property
 * -- under `hooks`, the path resolves **iff** the second segment is exactly
 * `payment` (undecoded) and the third *decodes* to
 * `STRIPE_PROVIDER_ID.slice("pp_".length)` -- with a cross product covering
 * case variants and near misses, and it exercises the decode explicitly with
 * percent-encoded, double-encoded and encoded-fixed-segment inputs.
 */
describe("the hooks namespace admits exactly the registered webhook path, and nothing shaped like it", () => {
  const REAL_SEGMENT = STRIPE_PROVIDER_ID.slice("pp_".length);
  const REAL_PATH = `/api/store/hooks/payment/${REAL_SEGMENT}`;

  it("resolves only the exact (payment, provider) pair, and refuses every other combination in the cross product", () => {
    const secondSegments = ["payment", "Payment", "PAYMENT", "payments", "refunds", "hooks"];
    const thirdSegments = [
      REAL_SEGMENT,
      REAL_SEGMENT.toUpperCase(),
      `${REAL_SEGMENT}EVIL`,
      REAL_SEGMENT.slice(0, -1),
      "anything",
      "pp_stripe_stripe",
    ];

    for (const second of secondSegments) {
      for (const third of thirdSegments) {
        const pathname = `/api/store/hooks/${second}/${third}`;
        const expected = second === "payment" && third === REAL_SEGMENT ? `/hooks/payment/${REAL_SEGMENT}` : null;
        expect(resolveStoreApiPath(pathname), pathname).toBe(expected);
      }
    }
  });

  it("refuses a nested path past the real one, and a bare prefix of it", () => {
    for (const pathname of [`${REAL_PATH}/extra`, `${REAL_PATH}/`, "/api/store/hooks/payment", "/api/store/hooks"]) {
      expect(resolveStoreApiPath(pathname), pathname).toBeNull();
    }
  });

  // These two inputs used to live in "resolveStoreApiPath's normalization
  // re-check", proving that describe block's own re-check line. T22b's
  // `namespace === "hooks"` branch (`route.ts`) now returns for every `hooks`
  // input before that shared line runs, on `segments.length !== 3` alone for
  // both paths below -- so they moved here, where they assert this branch's
  // own segment-count refusal instead. The re-check is proved by the two
  // `store`-namespace equivalents in that describe block now, not by these.
  it("refuses a tab-spliced dot segment, via this branch's own segment count, not the shared re-check", () => {
    expect(resolveStoreApiPath("/api/store/hooks/.\t./admin/users")).toBeNull();
  });

  it("refuses the same tab-splice family with a leading real segment before it", () => {
    expect(resolveStoreApiPath("/api/store/hooks/x/.\t./.\t./admin/users")).toBeNull();
  });

  // The provider segment is compared decoded on purpose (see the
  // `namespace === "hooks"` branch's own comment): Express decodes
  // `:provider` with the same `decodeURIComponent`, so each spelling below
  // reaches the identical handler call as the plain one, and each resolves to
  // the *canonical* path -- not the caller's spelling.
  it("admits an encoded spelling of the provider segment that decodes to the registered one, and canonicalizes it", () => {
    const encodedProvider = `%${REAL_SEGMENT.charCodeAt(0).toString(16)}${REAL_SEGMENT.slice(1)}`;
    for (const candidate of [encodedProvider, REAL_SEGMENT.replace("_", "%5F")]) {
      const pathname = `/api/store/hooks/payment/${candidate}`;
      expect(resolveStoreApiPath(pathname), pathname).toBe(`/hooks/payment/${REAL_SEGMENT}`);
    }
  });

  // Double-encoding does not resolve: `decodeSegment` decodes exactly once,
  // so a `%25`-doubled escape decodes to literal `%`-bearing text, not the
  // registered identifier. Mirrors T22a's own case for the identical reason.
  it("refuses a double-encoded provider segment", () => {
    expect(resolveStoreApiPath(`/api/store/hooks/payment/%2573tripe_stripe`)).toBeNull();
  });

  // The fixed `payment` segment is compared undecoded, unlike the provider
  // segment above -- see the `namespace === "hooks"` branch's own comment for
  // why. T22a's first draft admitted this and Express then 404'd it.
  it("refuses an encoded spelling of the fixed payment segment", () => {
    expect(resolveStoreApiPath(`/api/store/hooks/%70ayment/${REAL_SEGMENT}`)).toBeNull();
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
  // **Resolved from the backend's own `package.json`, not from this file.**
  // `@medusajs/medusa` is the backend workspace's dependency and the
  // storefront's `node_modules` has no path to it; it was reachable from here
  // only because npm happened to hoist it to the repository root. At 2.20.1
  // the lockfile nests it under `backend/node_modules` instead -- a hoisting
  // decision, deterministic from the lockfile, and nothing this test should
  // have been relying on. Anchoring the require to the workspace that declares
  // the dependency is correct however npm lays it out.
  const backendPackage = fileURLToPath(new URL("../../backend/package.json", import.meta.url));
  const apiDir = join(dirname(createRequire(backendPackage).resolve("@medusajs/medusa/package.json")), "dist/api");
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
      if (namespace === "hooks") {
        // T22b narrows `hooks` from a namespace allowlist to a one-path
        // allowlist (see the dedicated describe block below): declared in
        // ALLOWED_NAMESPACES, but a bare `hooks/probe` is still refused
        // because it is not `hooks/payment/<the registered provider>`. This
        // is the one namespace where "declared" and "resolves a same-shape
        // probe" deliberately diverge.
        expect(resolved).toBeNull();
        continue;
      }
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
    expect(cart).toEqual({ id: "cart_fixture", currencyCode: "usd", total: 25, quantities: [], lines: [] });
  });

  it("refuses a cart the stub answers with no numeric total", async () => {
    const fetchJson = stubStoreApi({ total: "25" });
    await expect(getCheckoutCart(fetchJson, "cart_fixture")).rejects.toThrow(/incomplete cart/);
  });

  it("carries one quantity per line, in the order the API returned them", async () => {
    const fetchJson = stubStoreApi({ items: [{ id: "a", quantity: 1 }, { id: "b", quantity: 3 }] });
    expect((await getCheckoutCart(fetchJson, "cart_fixture")).quantities).toEqual([1, 3]);
  });

  it("keeps an unreadable line as NaN rather than dropping it", async () => {
    // C3a. Dropping it would turn a two-line cart into a one-line cart and let
    // the payability rule pass something it must refuse -- the exact failure
    // this path exists to prevent, reached by being tidy. LD-04 P6a kept the
    // property when the rule changed: `isPayableCart` refuses any line whose
    // quantity is not a finite number, rather than relying on NaN never
    // equalling one.
    const fetchJson = stubStoreApi({ items: [{ id: "a", quantity: 1 }, { id: "b" }] });
    const { quantities, lines } = await getCheckoutCart(fetchJson, "cart_fixture");

    expect(quantities).toHaveLength(2);
    expect(Number.isNaN(quantities[1])).toBe(true);
    expect(lines).toHaveLength(2);
    expect(isPayableCart(lines, ["lousy-deal"])).toBe(false);
  });

  it("reads each line's product handle, which is how a certificate is told from a mug", async () => {
    const fetchJson = stubStoreApi({
      items: [
        { id: "a", quantity: 1, product_handle: "lousy-deal" },
        { id: "b", quantity: 2, product_handle: "this-mug-cost-extra" },
        { id: "c", quantity: 1 },
        // An empty string is not a handle. Reading it as one would make a
        // line whose handle Medusa left blank compare equal to nothing and
        // sort into merch by accident rather than by decision.
        { id: "d", quantity: 1, product_handle: "" },
      ],
    });
    expect((await getCheckoutCart(fetchJson, "cart_fixture")).lines).toEqual([
      { quantity: 1, handle: "lousy-deal" },
      { quantity: 2, handle: "this-mug-cost-extra" },
      // Medusa's line item permits a null handle, and an empty string is not
      // a handle either.
      { quantity: 1, handle: null },
      { quantity: 1, handle: null },
    ]);
  });

  it("reports no quantities for a cart with no lines, rather than refusing it", async () => {
    // A cart legitimately has no lines between being created and being added
    // to. The checkout page has its own document for that state; it is not an
    // incomplete response.
    expect((await getCheckoutCart(stubStoreApi({ items: [] }), "cart_fixture")).quantities).toEqual([]);
  });
});

describe("cartNeedsAddress", () => {
  const TIERS = ["lousy-deal", "lousy-deal-plus", "lousy-deal-pro"];
  const line = (handle: string | null, quantity = 1) => ({ handle, quantity });

  it("asks for nothing when the cart holds only certificates", () => {
    // A certificate goes nowhere. A form that asked everyone for a postcode in
    // order to sell them a PDF would be collecting data it does not need --
    // the principle LD-02 applied to the certificate's own fields and LD-03 to
    // the gift's.
    expect(cartNeedsAddress([line("lousy-deal")], TIERS)).toBe(false);
    expect(cartNeedsAddress([line("lousy-deal"), line("lousy-deal-pro")], TIERS)).toBe(false);
  });

  it("asks for one as soon as anything is posted", () => {
    expect(cartNeedsAddress([line("this-mug-cost-extra")], TIERS)).toBe(true);
    expect(cartNeedsAddress([line("lousy-deal"), line("certified-worthless")], TIERS)).toBe(true);
  });

  it("asks for one for a line Medusa gave no handle for", () => {
    // The same reading `isPayableCart` takes: a null handle is not a
    // certificate. Erring toward asking collects one address too many;
    // erring the other way posts a parcel to nowhere.
    expect(cartNeedsAddress([line(null)], TIERS)).toBe(true);
  });

  it("asks for nothing for an empty cart", () => {
    expect(cartNeedsAddress([], TIERS)).toBe(false);
  });
});

describe("isPayableCart", () => {
  // §16 gives a deal one `order_id` and no line reference, so an order for two
  // certificates has no single tier and no single price to certify. C2's
  // subscriber issues nothing for such an order; this is what stops the
  // checkout offering to take the money for one.
  //
  // **LD-04 P6a replaced `isSingleCertificate` with this**, and the change is
  // narrower than it looks: the rule was never "one line", it was "one
  // certificate", and one line was only how that was expressed while the shop
  // sold one thing. A cart may now hold a mug beside it.
  const TIERS = ["lousy-deal", "lousy-deal-plus", "lousy-deal-pro"];
  const line = (handle: string | null, quantity = 1) => ({ handle, quantity });

  it("accepts one certificate alone, as it always did", () => {
    expect(isPayableCart([line("lousy-deal")], TIERS)).toBe(true);
  });

  it("accepts one certificate beside merch, which is the upsell §7 asks for", () => {
    expect(isPayableCart([line("lousy-deal"), line("this-mug-cost-extra")], TIERS)).toBe(true);
    expect(isPayableCart([line("lousy-deal-pro"), line("original-purchase-receipt", 3)], TIERS)).toBe(true);
  });

  it("accepts merch with no certificate at all", () => {
    // Nothing issues, which is correct: nobody bought one. `order-placed.ts`
    // reports that at info rather than error, because it is the shop working.
    expect(isPayableCart([line("this-mug-cost-extra")], TIERS)).toBe(true);
    expect(isPayableCart([line(null)], TIERS)).toBe(true);
  });

  it("refuses two certificates, however they are arranged", () => {
    expect(isPayableCart([line("lousy-deal"), line("lousy-deal-plus")], TIERS)).toBe(false);
    expect(isPayableCart([line("lousy-deal", 2)], TIERS)).toBe(false);
    // And with merch in the cart too, which is the arrangement the old
    // one-line rule would have refused for the wrong reason.
    expect(isPayableCart([line("lousy-deal", 2), line("this-mug-cost-extra")], TIERS)).toBe(false);
  });

  it("refuses an empty cart and an unreadable quantity", () => {
    expect(isPayableCart([], TIERS)).toBe(false);
    expect(isPayableCart([line("lousy-deal", Number.NaN)], TIERS)).toBe(false);
    expect(isPayableCart([line("lousy-deal"), line("this-mug-cost-extra", Number.NaN)], TIERS)).toBe(false);
    expect(isPayableCart([line("lousy-deal", 0)], TIERS)).toBe(false);
  });

  it("treats a line with no handle as merch, not as a certificate", () => {
    // Medusa's line item permits a null `product_handle`. Counting such a line
    // as a certificate would refuse carts that are fine; counting two of them
    // as certificates would refuse every cart.
    expect(isPayableCart([line("lousy-deal"), line(null), line(null)], TIERS)).toBe(true);
  });
});

describe("listCartShippingOptions", () => {
  const answer = (options: unknown): FetchJson =>
    (async <T,>(path: string): Promise<T> => {
      expect(path).toBe("/store/shipping-options?cart_id=cart_ship");
      return { shipping_options: options } as T;
    }) as FetchJson;

  it("reads the calculated price, which is what our provider returned", async () => {
    // Medusa is the one that calls Printful, through P7a's provider, when this
    // endpoint calculates a price. Going straight to Printful from a browser
    // would need the token in a browser and would produce a number the cart
    // does not know about, which is the same as having no price.
    expect(
      await listCartShippingOptions(answer([{ id: "so_1", name: "Printful", calculated_price: { calculated_amount: 663 } }]), "cart_ship"),
    ).toEqual([{ id: "so_1", name: "Printful", amount: 663 }]);
  });

  it("falls back to a flat amount where an option has one", async () => {
    expect(await listCartShippingOptions(answer([{ id: "so_2", name: "Flat", amount: 500 }]), "cart_ship")).toEqual([
      { id: "so_2", name: "Flat", amount: 500 },
    ]);
  });

  it("drops an option Medusa could not price", async () => {
    // `calculatePrice` throws rather than inventing a figure, and Medusa
    // reports that as an option with no price. Offering it to a buyer would be
    // offering a control that cannot be used.
    expect(
      await listCartShippingOptions(answer([{ id: "so_3", name: "Broken" }, { id: "so_4", calculated_price: {} }]), "cart_ship"),
    ).toEqual([]);
  });

  it("returns nothing for a cart with no options, rather than refusing", async () => {
    // A certificate-only cart has none, and that is not an error.
    expect(await listCartShippingOptions(answer([]), "cart_ship")).toEqual([]);
    expect(await listCartShippingOptions(answer(undefined), "cart_ship")).toEqual([]);
  });
});

describe("setCartShippingMethod", () => {
  it("attaches the option and reads the new total back", async () => {
    let seen: unknown;
    const fetchJson: FetchJson = (async <T,>(path: string, init?: StoreFetchInit): Promise<T> => {
      expect(path).toBe("/store/carts/cart_ship/shipping-methods");
      seen = init?.body === undefined ? undefined : JSON.parse(init.body);
      return {
        cart: { total: 2163, shipping_methods: [{ shipping_option_id: "so_1", amount: 663 }] },
      } as T;
    }) as FetchJson;

    expect(await setCartShippingMethod(fetchJson, "cart_ship", "so_1")).toEqual({ total: 2163, shippingAmount: 663 });
    expect(seen).toEqual({ option_id: "so_1" });
  });

  it("refuses when Medusa attached nothing, rather than reporting a total that excludes postage", async () => {
    // Until a method is on the cart the total is the goods alone. A completed
    // order there takes the buyer's money without the postage in it, and the
    // merchant pays the difference.
    const fetchJson: FetchJson = (async <T,>(): Promise<T> => ({ cart: { total: 1500, shipping_methods: [] } }) as T) as FetchJson;
    await expect(setCartShippingMethod(fetchJson, "cart_ship", "so_1")).rejects.toThrow(/did not attach shipping option/);
  });

  it("refuses when a different option came back", async () => {
    const fetchJson: FetchJson = (async <T,>(): Promise<T> =>
      ({ cart: { total: 1500, shipping_methods: [{ shipping_option_id: "so_other", amount: 1 }] } }) as T) as FetchJson;
    await expect(setCartShippingMethod(fetchJson, "cart_ship", "so_1")).rejects.toThrow(/did not attach shipping option/);
  });

  it("refuses when Medusa returned no total", async () => {
    const fetchJson: FetchJson = (async <T,>(): Promise<T> =>
      ({ cart: { shipping_methods: [{ shipping_option_id: "so_1", amount: 663 }] } }) as T) as FetchJson;
    await expect(setCartShippingMethod(fetchJson, "cart_ship", "so_1")).rejects.toThrow(/no total/);
  });
});

describe("setCartShippingAddress", () => {
  it("writes the whole address to both addresses, and reads the country back", async () => {
    let seen: unknown;
    const fetchJson: FetchJson = (async <T,>(path: string, init?: StoreFetchInit): Promise<T> => {
      if (path === "/store/carts/cart_ship" && init?.method === "POST") {
        seen = init.body === undefined ? undefined : JSON.parse(init.body);
        return { cart: { id: "cart_ship", shipping_address: { country_code: "us" }, tax_total: 0 } } as T;
      }
      throw new Error(`unexpected ${path}`);
    }) as FetchJson;

    const result = await setCartShippingAddress(fetchJson, "cart_ship", {
      name: "A Buyer",
      line1: "1 Test St",
      city: "New York",
      postcode: "10001",
      province: "NY",
      countryCode: "US",
    });

    expect(result.countryCode).toBe("us");
    const body = seen as { shipping_address: Record<string, unknown>; billing_address: Record<string, unknown> };
    // Both, as `setCartCountry` does: Medusa resolves tax from the shipping
    // address and Stripe reconciles against the billing one, and a cart
    // carrying two different countries is a cart whose total nobody can
    // explain.
    expect(body.shipping_address).toEqual(body.billing_address);
    expect(body.shipping_address).toEqual({
      // Medusa splits a name in two and this shop collects one. The whole of
      // it goes in `first_name` rather than guessing where a name divides --
      // a guess that is wrong for most of the world.
      first_name: "A Buyer",
      address_1: "1 Test St",
      city: "New York",
      postal_code: "10001",
      country_code: "US",
      province: "NY",
    });
  });

  it("omits the province where the country does not use one", async () => {
    let seen: unknown;
    const fetchJson: FetchJson = (async <T,>(_path: string, init?: StoreFetchInit): Promise<T> => {
      seen = init?.body === undefined ? undefined : JSON.parse(init.body);
      return { cart: { id: "c", shipping_address: { country_code: "ee" } } } as T;
    }) as FetchJson;

    await setCartShippingAddress(fetchJson, "c", {
      name: "A", line1: "1 St", city: "Tallinn", postcode: "10111", province: "  ", countryCode: "EE",
    });
    expect((seen as { shipping_address: Record<string, unknown> }).shipping_address).not.toHaveProperty("province");
  });

  it("refuses rather than guessing when Medusa returns no country", async () => {
    const fetchJson: FetchJson = (async <T,>(): Promise<T> => ({ cart: { id: "c" } }) as T) as FetchJson;
    await expect(
      setCartShippingAddress(fetchJson, "c", {
        name: "A", line1: "1 St", city: "T", postcode: "1", province: "", countryCode: "EE",
      }),
    ).rejects.toThrow(/did not return a shipping-address country/);
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
    // C3a: the stub keeps its lines, so the GET below answers with the line
    // the POST above created. Before, the GET returned a cart with no items
    // at all -- which passed while nothing read them, and would have let the
    // checkout's one-certificate rule be asserted against a fiction.
    const state: { total: number; completed: boolean; items: { id: string; variant_id: string; quantity: number; unit_price: number }[] } = {
      total: 25,
      completed: false,
      items: [],
    };

    const fetchJson: FetchJson = (async <T>(path: string, init?: StoreFetchInit): Promise<T> => {
      if (path === "/store/carts" && init?.method === "POST") {
        return { cart: { id: "cart_e2e", currency_code: "usd", items: [] } } as T;
      }
      if (path === "/store/carts/cart_e2e/line-items" && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as { variant_id: string; quantity: number };
        state.items.push({ id: "item_e2e", variant_id: body.variant_id, quantity: body.quantity, unit_price: state.total });
        return { cart: { id: "cart_e2e", currency_code: "usd", items: state.items } } as T;
      }
      if (path === "/store/carts/cart_e2e" && (init?.method ?? "GET") === "GET") {
        return { cart: { id: "cart_e2e", currency_code: "usd", total: state.total, items: state.items } } as T;
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
    expect(checkoutCart).toEqual({
      id: "cart_e2e",
      currencyCode: "usd",
      total: 25,
      quantities: [1],
      lines: [{ quantity: 1, handle: null }],
    });
    // C3a: the state the checkout page requires before it will render a pay
    // control at all.
    // LD-04 P6a: the stub's line carries no `product_handle`, so it reads as
    // merch rather than as a certificate — and a merch-only cart is payable.
    // The end-to-end property this asserts is unchanged: this cart can be
    // paid for.
    expect(isPayableCart(checkoutCart.lines, ["lousy-deal"])).toBe(true);

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
