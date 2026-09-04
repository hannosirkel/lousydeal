/**
 * The proxy that lets the browser reach the Medusa Store API without ever
 * being told the backend origin (T10; Target Exposure: "Medusa Admin: no
 * public hostname, in any encoding, never in LD-01"). It is the highest-risk
 * file in this row, for the reason `resolveStoreApiPath` documents below: a
 * forwarder that does not refuse path traversal publishes the whole Admin API
 * at this same public hostname.
 *
 * Ported from `plepic/storefront/src/lib/store-api-transport.ts`, narrowed to
 * two namespaces: this repository allows `store` and `hooks`, never `static`.
 * `POST /hooks/payment/:provider` (`node_modules/@medusajs/medusa/dist/api/hooks/payment/[provider]/route.js`,
 * matched by `node_modules/@medusajs/medusa/dist/api/hooks/middlewares.js`)
 * is mounted unconditionally -- `dist/loaders/api.js:40-53` loads the whole
 * `../api` tree with no payment-provider condition -- so it was already live
 * before T6b, answering `system_default`
 * (`@medusajs/payment/dist/loaders/providers.js:53-56` registers
 * `SystemPaymentProvider` unconditionally too). T6b does not mount the route;
 * it registers the Stripe provider under `pp_stripe_stripe`, which is what
 * makes this route resolve *that* provider's webhook rather than only the
 * system one -- and only once this row also lets a request reach it. There is
 * still no media surface to serve, so `static` stays excluded. Plepic also
 * mounts this at `/store-api/*`; here it is `/api/store/*`, so
 * `/api/store/store/products` is the shape a legitimate request takes -- the
 * first `store` is this route's own mount point, the second is the Medusa
 * namespace being forwarded.
 *
 * Unlike Plepic, the publishable key is attached **here**, server-side, from
 * `getRuntimeConfig()`, not carried by the browser. Nothing in
 * `ClientRuntimeConfig` (`src/config/runtime-config.ts`) names the Medusa
 * backend URL or its publishable key, so the browser could not attach the
 * header itself even if this file tried to make it -- it calls a bare
 * same-origin path and this route supplies the credential.
 *
 * **The origin promise holds on the request path and the response path, not
 * just the first.** `resolveStoreApiPath` and its five defences (below) are
 * what stop a browser from ever making this proxy *ask* the backend for
 * something outside `/store/` or `/hooks/`. Two further, independent things
 * stop the backend's own *answer* from telling the browser where it came from:
 * {@link forwardedRequestHeaders} forwards an allowlist, not everything the
 * browser sent, so a browser `Cookie`, `Authorization` or a spoofed
 * `x-forwarded-host` never reaches Medusa in the first place; and
 * {@link forwardedResponseHeaders} drops `location`, `content-location` and
 * `link`, and strips any `Domain` attribute from `set-cookie`, so a redirect,
 * a resource link or a session cookie the backend emits cannot carry its own
 * internal hostname back to the browser. What each does and why is on the
 * function itself.
 */

import { getRuntimeConfig } from "../../../../config/runtime-config";
import { STORE_PUBLISHABLE_KEY_HEADER } from "../../../../lib/medusa-client";

/** This route's own mount point. Never itself forwarded -- see {@link resolveStoreApiPath}. */
const MOUNT_PREFIX = "/api/store/";

/**
 * The only Medusa namespaces this route will forward to.
 *
 * `store` is the Store API T9 built this proxy for. `hooks` is added at T18:
 * `POST /hooks/payment/:provider` is already mounted unconditionally (see the
 * module comment above), and T6b's Stripe payment provider is what makes it
 * resolve `stripe_stripe`'s webhook rather than only the system default --
 * this row is what lets a request reach it at all, which is why the
 * namespace was refused before and is a legitimate one to admit now.
 *
 * `static` (Plepic's product-media namespace) is deliberately still absent:
 * no row in this repository serves media, so admitting it would be an
 * allowlist entry for a backend surface nothing here requests.
 *
 * `ReadonlySet`, not `Set`: this is a security allowlist, and the module
 * exports it only so its own test suite can assert its declared membership
 * and drive a namespace-property test from it -- `readonly` is what stops a
 * caller from doing so by mutating this Set in place (`.add`, `.delete`)
 * rather than by editing this literal, so `tsc` catches an attempt at the
 * former.
 */
export const ALLOWED_NAMESPACES: ReadonlySet<string> = new Set(["store", "hooks"]);

/**
 * The origin dot segments are resolved against when {@link resolveStoreApiPath}
 * normalizes a candidate path for itself. Opaque and unroutable on purpose:
 * nothing is ever fetched from it, it exists only so the WHATWG URL parser has
 * a base.
 */
const NORMALIZATION_BASE = "http://store-api-proxy.invalid";

const HOP_BY_HOP_HEADERS = [
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
] as const;

/**
 * Percent-decodes one path segment to a fixed point -- repeating the decode
 * while it keeps changing the string, bounded so a pathological input cannot
 * spin forever -- treating a malformed escape as its own literal text rather
 * than throwing. A segment that cannot be decoded further is returned as
 * written, which can only make {@link isRefusedSegment} stricter.
 *
 * One decode is not enough. `%252e%252e` single-decodes to `%2e%2e`, which is
 * not `".."` by a literal comparison; a second decode is what turns it into
 * `".."`. This repository's own Express does not itself run a second decode
 * on the segments it receives (measured below), so a single-decode check was
 * safe *only by that upstream's accident* -- exactly the kind of assumption
 * `resolveStoreApiPath`'s own contract (below) says this file does not get to
 * make about its caller. Decoding to a fixed point removes the dependency:
 * this function refuses the dot segment on its own terms, whether or not
 * whatever eventually receives the path also declines to double-decode it.
 *
 * The five-iteration bound exists only so a segment of hundreds of stacked
 * `%25`s decodes in bounded work rather than one pass per encoding layer with
 * no ceiling; every attack measured against this file decodes to a fixed
 * point in two.
 */
function decodeSegmentFully(segment: string): string {
  let current = segment;
  for (let iteration = 0; iteration < 5; iteration += 1) {
    let next: string;
    try {
      next = decodeURIComponent(current);
    } catch {
      return current;
    }
    if (next === current) return next;
    current = next;
  }
  return current;
}

/**
 * Whether a segment may not appear in a forwarded path: empty, a dot segment
 * in *any* encoding (including one stacked more than once), or one hiding a
 * separator.
 *
 * The encoding clause is the load-bearing one. `..` written out is obvious;
 * `%2e%2e`, `%2E%2E`, `.%2e` and `%2e.` are the same segment to the WHATWG URL
 * parser -- its "double-dot path segment" rule is defined on the decoded form
 * and is case-insensitive -- and the parser is what `resolveStoreApiTarget`
 * runs the path through on its way to `fetch`. So a comparison against the
 * literal string `".."` alone lets `/api/store/store/%2e%2e/admin/users`
 * through this function and the URL parser then resolves the forwarded target
 * to `/admin/users` on the backend: the entire Medusa Admin API, reachable
 * from the public site origin.
 *
 * Measured, not assumed, that this repository is not relying on a caller to
 * have normalized first: `new Request("http://h/api/store/store/%2e%2e/store/products").url`
 * is `http://h/api/store/store/products` -- the WHATWG `Request` constructor
 * resolves the dot segment before any code here reads `request.url` -- and
 * `handle` below reads `new URL(request.url).pathname`, applying the identical
 * rule again. Both are properties of the *caller* (the Fetch-spec `Request`
 * constructor, then this route's own use of `URL`), not of this function, and
 * this function is entitled to assume neither: it is written to be safe on
 * its own terms given whatever pathname it is handed, which is what the
 * refusals below, and the normalization re-check at the end of
 * {@link resolveStoreApiPath}, are for.
 */
function isRefusedSegment(segment: string): boolean {
  if (segment.length === 0) return true;
  const decoded = decodeSegmentFully(segment);
  return decoded === "." || decoded === ".." || decoded.includes("/") || decoded.includes("\\");
}

/**
 * Resolves a request pathname to its Medusa target path, or `null` to refuse
 * it. No network operation happens in this function or before the caller
 * observes that result.
 *
 * Four defences, in order: a fixed prefix, a namespace allowlist, a
 * minimum segment count (a bare namespace with nothing after it forwards
 * nowhere legitimate), and a per-segment refusal on the *decoded* form of
 * every segment. The last line is a fifth, independent of the first four: the
 * allowlist is re-checked against the path the URL parser will actually
 * produce, not against the one this function was handed, so "the resolved
 * target still sits under `store`" holds on its own rather than only because
 * the segment refusals above happened to be complete.
 *
 * **No character or length bound.** A NUL byte, a raw control character, a
 * CRLF pair, a 100 000-character path or 5 000 segments all pass every
 * defence above unless they also happen to decode to a dot segment or a
 * separator -- none of the five defences reasons about a segment's content or
 * the path's size, only about what a segment *is*. That is a choice, not an
 * oversight: nothing downstream of this function parses the forwarded path as
 * anything other than opaque bytes on a `fetch` call (Node's `fetch` and
 * Medusa's own Express body-parsing both reject what they cannot handle
 * rather than misinterpreting it), so there is no known failure mode a bound
 * here would close. Recorded so the next reader does not mistake the absence
 * for one.
 */
export function resolveStoreApiPath(pathname: string): string | null {
  if (!pathname.startsWith(MOUNT_PREFIX)) return null;

  const upstreamPath = pathname.slice(MOUNT_PREFIX.length);
  const segments = upstreamPath.split("/");
  const namespace = segments[0];
  if (namespace === undefined || !ALLOWED_NAMESPACES.has(namespace) || segments.length < 2) {
    return null;
  }
  if (segments.some(isRefusedSegment)) {
    return null;
  }

  const normalized = new URL(`/${upstreamPath}`, NORMALIZATION_BASE).pathname;
  if (!normalized.startsWith(`/${namespace}/`)) {
    return null;
  }
  return normalized;
}

/**
 * Builds the backend URL for an already-resolved upstream path.
 *
 * `MEDUSA_BACKEND_URL` is an operator-set origin, not attacker input, and
 * `src/lib/medusa-client.ts`'s `createStoreFetchJson` already trusts it at the
 * same level -- string concatenation, no shape check -- so this does not add
 * a stricter validation than the rest of the codebase relies on. Assigning
 * `pathname` **replaces** the origin's own path rather than joining it, which
 * is exactly right for the bare origin `MEDUSA_BACKEND_URL` is documented to
 * be (`src/config/runtime-config.ts`) and wrong for anything else -- not this
 * function's problem to guard against, on the same trust boundary as above.
 */
export function resolveStoreApiTarget(upstreamPath: string, search: string, backendUrl: string): URL {
  const target = new URL(backendUrl);
  target.pathname = upstreamPath;
  target.search = search;
  return target;
}

/**
 * The only browser request headers this proxy forwards to Medusa, beyond the
 * publishable key it attaches itself.
 *
 * `content-type` is required: every POST this row makes carries a JSON body
 * (`store-payment.ts`), and Express's body-parser reads this header to decide
 * how to parse it -- drop it and a well-formed request is read as an empty
 * body. `accept` is forwarded because it costs nothing to and lets Medusa's
 * own content negotiation see what the browser asked for; nothing in this
 * row's flow depends on it.
 *
 * `stripe-signature` is not optional for the `hooks` namespace this row
 * admits: `node_modules/@medusajs/payment-stripe/dist/core/stripe-base.js:511-513`
 * reads `data.headers["stripe-signature"]` and passes it to
 * `stripe.webhooks.constructEvent(rawData, signature, webhookSecret)`, which
 * throws on `undefined`. `hooks/payment/[provider]/route.js` has already
 * answered Stripe `200` before that verification ever runs (it only enqueues
 * the event), so an omitted header does not surface as an error to Stripe or
 * this proxy -- it fails a delivery silently, with no retry and no alert.
 * Forwarding the header does not weaken the allowlist's own guarantee: it is
 * one more name Medusa is allowed to see, not a change to what it is allowed
 * to do with what it sees.
 *
 * Deliberately **not** an allowlist of everything a legitimate request
 * happens to carry: a browser `Cookie` or `Authorization` header, or a
 * client-supplied `x-forwarded-host`, has no purpose reaching Medusa in a
 * storefront with no customer accounts (LD-01) -- forwarding them anyway,
 * because a denylist did not name them, is exactly the defect this allowlist
 * replaces. See `tests/store-checkout.test.ts` for the header proven absent.
 */
const FORWARDED_REQUEST_HEADERS = ["content-type", "accept", "stripe-signature"] as const;

/** Forwards only {@link FORWARDED_REQUEST_HEADERS}, then sets the one credential the browser never carries. */
function forwardedRequestHeaders(request: Request, publishableKey: string): Headers {
  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  // `.set` on a `Headers` built from scratch here, not from the browser's own
  // headers -- a request cannot supply its own publishable key under this or
  // any other name and have it reach Medusa, because nothing the browser sent
  // is copied in the first place.
  headers.set(STORE_PUBLISHABLE_KEY_HEADER, publishableKey);
  return headers;
}

/**
 * Response headers this proxy will not hand back to the browser as Medusa
 * sent them, because each is a channel the backend's own internal origin can
 * travel through: a `Location` on a redirect, a `Content-Location` naming the
 * resource the response represents, and a `Link` header pointing elsewhere.
 * `redirect: "manual"` on the upstream `fetch` (in
 * {@link forwardStoreApiRequest}) is what makes a 3xx and its `Location`
 * visible here at all rather than followed and consumed before this code
 * runs.
 *
 * Dropped outright, not rewritten to the storefront's own origin: a Store API
 * response has no legitimate reason to redirect or link a browser to the
 * backend it is proxied from, so there is no destination on this side worth
 * preserving under a different name.
 */
const ORIGIN_LEAKING_RESPONSE_HEADERS = ["location", "content-location", "link"];

/**
 * Removes a `Domain` attribute from one `Set-Cookie` value, leaving every
 * other attribute (`Path`, `HttpOnly`, `Secure`, `SameSite`, the cookie's own
 * name and value) untouched. A cookie Medusa sets with no `Domain` attribute
 * is scoped by the browser to the host that answered the request -- this
 * storefront's own origin, through this proxy -- which is the correct scope
 * for a session cookie reaching the browser through a same-origin proxy; one
 * scoped to the backend's internal hostname is both useless to the browser
 * and a second copy of the leak {@link ORIGIN_LEAKING_RESPONSE_HEADERS}
 * exists to close.
 */
function stripCookieDomainAttribute(cookie: string): string {
  return cookie.replace(/;\s*Domain=[^;]*/gi, "");
}

/**
 * Strips hop-by-hop headers, then `content-encoding`/`content-length` when
 * the upstream response carried the former -- Node's `fetch` transparently
 * decodes a gzip/br/deflate body but retains the upstream representation
 * metadata, so the downstream response here carries decoded bytes under a
 * content-length that describes the compressed ones unless this runs.
 *
 * Then the two origin-disclosure defences described above: every header in
 * {@link ORIGIN_LEAKING_RESPONSE_HEADERS} is dropped, and every `Set-Cookie`
 * value has its `Domain` attribute stripped rather than the header dropped
 * wholesale -- `getSetCookie()` is what reads them apart, because a plain
 * `.get("set-cookie")` on a `Headers` with more than one joins them into a
 * single comma-separated string no cookie parser accepts.
 */
function forwardedResponseHeaders(response: Response): Headers {
  const headers = new Headers(response.headers);
  for (const name of HOP_BY_HOP_HEADERS) headers.delete(name);
  if (headers.has("content-encoding")) {
    headers.delete("content-encoding");
    headers.delete("content-length");
  }
  for (const name of ORIGIN_LEAKING_RESPONSE_HEADERS) headers.delete(name);

  const setCookies = response.headers.getSetCookie();
  if (setCookies.length > 0) {
    headers.delete("set-cookie");
    for (const cookie of setCookies) headers.append("set-cookie", stripCookieDomainAttribute(cookie));
  }

  return headers;
}

/**
 * The one real network call this module makes, parameterised so a test never
 * opens a socket -- the seam `src/lib/medusa-client.ts`'s `FetchJson`
 * established for the same reason. `handle` below calls this with no third
 * argument, so production traffic uses the real global `fetch`.
 */
export type StoreApiFetch = (target: URL, init: RequestInit) => Promise<Response>;

/** Forwards one allowed request while preserving its method, query, headers and raw body. */
export async function forwardStoreApiRequest(
  request: Request,
  target: URL,
  publishableKey: string,
  fetchImpl: StoreApiFetch = fetch,
): Promise<Response> {
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const body = hasBody ? await request.arrayBuffer() : undefined;
  const upstream = await fetchImpl(target, {
    method: request.method,
    headers: forwardedRequestHeaders(request, publishableKey),
    body,
    redirect: "manual",
  });

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: forwardedResponseHeaders(upstream),
  });
}

export const dynamic = "force-dynamic";

async function handle(request: Request): Promise<Response> {
  const requestUrl = new URL(request.url);
  const upstreamPath = resolveStoreApiPath(requestUrl.pathname);
  if (upstreamPath === null) {
    return new Response(null, { status: 404 });
  }

  const { medusa } = getRuntimeConfig();
  if (medusa.backendUrl === null || medusa.publishableKey === null) {
    return new Response(null, { status: 503 });
  }

  let target: URL;
  try {
    target = resolveStoreApiTarget(upstreamPath, requestUrl.search, medusa.backendUrl);
  } catch {
    return new Response(null, { status: 503 });
  }

  // 503 above is this route's own configuration being incomplete -- a state
  // an operator fixes by setting an env var, not a request that can retry its
  // way out. A `fetch` that never gets a response (`ECONNREFUSED`, DNS
  // failure, timeout) is a different failure -- this route is configured
  // correctly but the backend it points at did not answer -- and is reported
  // as 502, the standard code for "the upstream this proxy depends on
  // failed", rather than left to surface as Next's own unhandled server
  // error.
  try {
    return await forwardStoreApiRequest(request, target, medusa.publishableKey);
  } catch (error) {
    console.error("store-api proxy: request to the backend failed", error);
    return new Response(null, { status: 502 });
  }
}

/**
 * Only what the checkout flow this row builds actually calls through this
 * proxy: `PaymentForm.tsx` reads no store data through it and only ever
 * POSTs (`store-payment.ts`'s three functions), but this route's own module
 * comment cites `/api/store/store/products` as "the shape a legitimate
 * request takes" for a future GET read through the same proxy, so GET is kept
 * alongside it. `HEAD`, `PUT`, `PATCH` and `DELETE` have no caller in this row
 * and are dropped rather than exported "just in case".
 *
 * `OPTIONS` is dropped for its own reason, not merely absence of use:
 * forwarding it would hand a CORS preflight for `/api/store/*` -- a
 * same-origin path, which never triggers a real preflight from this
 * storefront's own browser code -- to the backend's `STORE_CORS`, which
 * `backend/src/config/runtime.ts:15` records Medusa silently defaults rather
 * than requires. Next's own platform response to an unimplemented method
 * (`405`) is what an `OPTIONS` request against this route gets instead.
 */
export const GET = handle;
export const POST = handle;
