/**
 * The proxy that lets the browser reach the Medusa Store API without ever
 * being told the backend origin (T10; Target Exposure: "Medusa Admin: no
 * public hostname, in any encoding, never in LD-01"). It is the highest-risk
 * file in this row, for the reason `resolveStoreApiPath` documents below: a
 * forwarder that does not refuse path traversal publishes the whole Admin API
 * at this same public hostname.
 *
 * Ported from `plepic/storefront/src/lib/store-api-transport.ts`, narrowed to
 * three namespaces: this repository allows `store`, `hooks` and `webhooks`,
 * never `static`. The third is not a Medusa namespace at all -- it is this
 * application's own, holding the one route Printful posts to (LD-04 P15a),
 * and like `hooks` it is an allowlist of exactly one path rather than of a
 * namespace.
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
 * something outside `/store/`, the one `/hooks/` path or the one
 * `/webhooks/` path. Two further, independent things
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
import { STRIPE_PROVIDER_ID } from "../../../../lib/store-payment";

/** This route's own mount point. Never itself forwarded -- see {@link resolveStoreApiPath}. */
const MOUNT_PREFIX = "/api/store/";

/**
 * The only namespaces this route will forward to.
 *
 * **Two of the three are Medusa's and the third is this application's.**
 * `webhooks` names no Medusa surface: `backend/src/api/webhooks/printful` is
 * a route this repository wrote, and the namespace exists so Printful has a
 * path through the storefront's Access gate to reach it (LD-04 P15a). Like
 * `hooks`, it is admitted for exactly one path and `resolveStoreApiPath`
 * refuses the rest of it.
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
export const ALLOWED_NAMESPACES: ReadonlySet<string> = new Set(["store", "hooks", "webhooks"]);

/**
 * The provider segment {@link resolveStoreApiPath} admits under `hooks`,
 * derived from `store-payment.ts`'s {@link STRIPE_PROVIDER_ID} rather than
 * written out a second time here.
 *
 * `getWebhookActionAndData` (`node_modules/@medusajs/payment/dist/services/payment-module.js:697`,
 * measured: `` `pp_${eventData.provider}` ``) resolves the `:provider` route
 * param back to a payment-provider registration key by prefixing it with
 * `pp_` -- so the URL segment is that registration key *without* the prefix,
 * and `STRIPE_PROVIDER_ID` (`pp_stripe_stripe`) already is that key. Slicing
 * it here, instead of re-deriving `stripe_stripe` from
 * `backend/src/config/payment.ts`'s two identifiers, is what plepic's own
 * T22a review (`71c242d`) found the hard way: a second hand-written literal
 * agrees with a coherent rename of the backend's identifiers right up until
 * it doesn't, and no suite here names the backend's config to catch it. This
 * repository has one source for the identifier already -- T18a's
 * `STRIPE_PROVIDER_ID`, itself pinned by a literal-equality test
 * (`store-checkout.test.ts`) -- so deriving from it here means a corrupted
 * `STRIPE_PROVIDER_ID` moves this constant too, rather than the two silently
 * disagreeing.
 */
const STRIPE_WEBHOOK_PROVIDER_SEGMENT = STRIPE_PROVIDER_ID.slice("pp_".length);

/** The one path {@link resolveStoreApiPath} admits under `hooks` -- see its hooks branch. */
const STRIPE_WEBHOOK_PATH = `/hooks/payment/${STRIPE_WEBHOOK_PROVIDER_SEGMENT}`;

/**
 * The one path {@link resolveStoreApiPath} admits under `webhooks`, and the
 * reason that namespace exists at all.
 *
 * **Its counterpart is `backend/src/api/middlewares.ts`**, which sets
 * `preserveRawBody` for this exact matcher, with `method: "POST"`. The two
 * are one string in two workspaces, and `store-checkout.test.ts` asserts they
 * agree.
 *
 * **The drift matrix is not symmetric, and only one half of it is silent.**
 * If *this* literal moves, the backend has no route at the forwarded path and
 * answers 404: visible, logged, retried. If the *matcher* moves -- or merely
 * names a different method -- the route still exists, but `req.rawBody` is
 * absent, so it computes no signature and answers 401 to **every delivery
 * including the genuine ones**, logging that the request "was not signed with
 * this deployment's secret". That half presents exactly as a wrong secret
 * does, and it is the half worth a cross-workspace test. Printful retries at
 * 1, 4, 16, 64, 256 and 1024 minutes and then the event is gone for good, so
 * a buyer is never told their parcel shipped and a cancellation never reaches
 * the local record.
 *
 * The backend route is deliberately **not** relocated under `hooks` to reuse
 * that branch. `hooks` is admitted for one thing -- Medusa core's payment
 * webhook -- and its whole comment is about that one thing; parking an
 * application route inside it would blur the one branch in this file whose
 * narrowness is load-bearing, and would move a path that
 * `backend/tests/printful-webhook.test.ts` pins in four places for no gain --
 * three `readFileSync` locations and a URL literal.
 */
const PRINTFUL_WEBHOOK_SEGMENT = "printful";

/**
 * The one path {@link resolveStoreApiPath} admits under `webhooks`.
 *
 * **Derived, not written out twice.** The constant above it warns about
 * exactly this: a second hand-written literal agrees with a rename right up
 * until it doesn't.
 */
const PRINTFUL_WEBHOOK_PATH = `/webhooks/${PRINTFUL_WEBHOOK_SEGMENT}`;

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
 * Percent-decodes a segment exactly once, treating a malformed escape as its
 * own literal text rather than throwing.
 *
 * Deliberately not {@link decodeSegmentFully}: that function decodes to a
 * fixed point because a dot segment must be refused under *any* stacking of
 * `%25`. The provider segment below is the opposite case -- it is compared
 * for equality with a known-good identifier, not scanned for a dangerous
 * shape -- and a single decode is what Express itself performs on a route
 * param (`decode_param`, `node_modules/express/lib/router/layer.js:172`,
 * `decodeURIComponent`, confirmed against this repository's installed
 * express@4.22.2 and path-to-regexp@0.1.13). Decoding further than that would
 * admit `%2573tripe_stripe` (which single-decodes to the literal text
 * `%73tripe_stripe`, not the registered identifier) as though it were the
 * same request Express would route -- it is not; Express never performs that
 * second decode either.
 */
function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
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
 * **`webhooks` behaves exactly as `hooks` does here**, and for the same
 * reason: it too gets a narrower gate of its own that returns -- admitted or
 * refused -- for every input in that namespace, so the fifth line is
 * unreachable for it as well. That is safe for both branches on a stronger
 * ground than "unreachable": the fifth defence exists to re-validate a path
 * *derived from* caller input, and neither branch derives anything. Each
 * returns a compile-time constant, so no attacker byte reaches the output at
 * all. **A future edit that returns something computed from `segments` would
 * lose that property silently**, which is what the two branches' own tests
 * are written against.
 *
 * These five are written to apply to every namespace, `hooks` included --
 * but the fifth is unreachable for `hooks` in practice. `hooks` also gets a
 * sixth, narrower gate of its own (the `namespace === "hooks"` branch below),
 * which sits between the fourth and fifth and returns -- admitted or refused
 * -- for every `hooks` input, on nothing more than `segments.length !== 3`
 * for most refused shapes. Execution for that namespace never falls through
 * to the fifth line at all. Orchestrator review, Major: this is why
 * `store-checkout.test.ts`'s tab-splice cases for the fifth defence are
 * written against `store`, not `hooks` -- a `hooks` input there would go on
 * proving only this sixth gate's own segment-count check, unable to notice
 * the fifth line deleted. `store` never enters this branch, so it is the
 * only namespace left that still exercises the fifth line's own contract.
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

  // A sixth gate, narrower than and additional to the five general-purpose
  // defences above and below: `hooks` is only in ALLOWED_NAMESPACES for
  // `POST /hooks/payment/:provider`
  // (`node_modules/@medusajs/medusa/dist/api/hooks/payment/[provider]/route.js`),
  // which Medusa core queues a webhook job from before verifying anything,
  // including `:provider` against a registered provider. Admitting the
  // namespace and stopping at the four defences above would still forward
  // `/hooks/payment/<anything>` -- or a nested or sibling path one segment
  // over -- to that handler, enqueuing a job from an unauthenticated body. So
  // `hooks` gets an allowlist of exactly one path rather than a namespace.
  //
  // The two variable segments are compared two different ways, and the
  // asymmetry is deliberate:
  //
  // - `segments[1]` ("payment") is compared **undecoded**. It is a literal
  //   route segment, not a route parameter, and nothing observed in this
  //   repository's own Express says how (or whether) it decodes a literal
  //   segment before matching it -- so admitting an encoded spelling here
  //   would be a guess, not a proven equivalence, and it is refused.
  // - `segments[2]` (the provider) is compared **decoded**, via
  //   {@link decodeSegment}, against {@link STRIPE_WEBHOOK_PROVIDER_SEGMENT}.
  //   Express resolves `req.params.provider` with the same
  //   `decodeURIComponent` (see {@link decodeSegment}'s own comment), so
  //   every admitted spelling of this segment reaches the handler as the
  //   identical string -- the encoding variance is two spellings of one
  //   request, not a bypass, and refusing it would refuse traffic the handler
  //   treats as the real webhook.
  //
  // {@link STRIPE_WEBHOOK_PATH} -- the canonical spelling -- is returned
  // rather than the caller's, so a log or alert keyed on the resolved path
  // sees one string regardless of how the caller encoded the request.
  if (namespace === "hooks") {
    if (
      segments.length !== 3 ||
      segments[1] !== "payment" ||
      decodeSegment(segments[2] ?? "") !== STRIPE_WEBHOOK_PROVIDER_SEGMENT
    ) {
      return null;
    }
    return STRIPE_WEBHOOK_PATH;
  }

  // The same sixth gate again, for the same reason and in the same shape:
  // `webhooks` is in ALLOWED_NAMESPACES for exactly one path, not for a
  // namespace. Admitting the namespace and stopping at the general defences
  // would let the tail of this function resolve `/webhooks/<anything>` --
  // every future sibling route, admitted the day somebody adds one and
  // noticed by nobody.
  //
  // **Both segments are compared undecoded, and this gate is the simpler of
  // the two for a stated reason.** The Stripe branch above decodes its third
  // segment because that segment is an Express route *parameter*, resolved
  // with `decodeURIComponent`, so two spellings genuinely are one request.
  // `/webhooks/printful` has no parameter in it: both segments are literal
  // route segments, and the rule this file already records for those is that
  // an encoded spelling is a guess rather than a proven equivalence, so it is
  // refused. `%70rintful` and `%77ebhooks` reach nothing.
  if (namespace === "webhooks") {
    if (segments.length !== 2 || segments[1] !== PRINTFUL_WEBHOOK_SEGMENT) {
      return null;
    }
    return PRINTFUL_WEBHOOK_PATH;
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
const FORWARDED_REQUEST_HEADERS = [
  "content-type",
  "accept",
  "stripe-signature",
  // Printful's own signature, and without it this proxy would deliver a body
  // the backend cannot verify: `webhook.ts` reads exactly this header, and a
  // delivery arriving without it is refused like an unsigned one. T18a found
  // the identical failure for `stripe-signature`.
  //
  // **`content-type` is load-bearing for the same route**, not merely polite.
  // Medusa's bodyparser passes one `verify` hook to its json, text and
  // urlencoded parsers alike (`framework/dist/http/middlewares/bodyparser.js`),
  // and that hook is what sets `rawBody` -- so what matters is not the *json*
  // parser, as an earlier version of this comment said, but that Express runs
  // a body parser at all, which it decides from this header. Drop it and none
  // of the three matches, there is no raw body to sign over, and every
  // genuine event answers 401.
  //
  // **`x-pf-webhook-public-key` is deliberately absent.** Printful sends it to
  // say *which* configuration signed an event, where one URL serves several;
  // this deployment holds one secret and `webhook.ts` never reads it. It is
  // recorded here rather than left unmentioned so that a later change serving
  // several configurations knows this was a decision and not an oversight.
  "x-pf-webhook-signature",
] as const;

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

/**
 * The most this proxy will hold in memory for one request body.
 *
 * **Review finding F1, and the webhook is what made it urgent.** This
 * function buffers the whole body before forwarding it, and the bypassed
 * webhook path is reachable by anyone, unauthenticated, by design -- the
 * signature is checked at the backend, which is downstream of this
 * allocation. Medusa itself refuses anything over Express's ~100 kb default
 * (`framework/dist/http/middlewares/bodyparser.js` passes an undefined
 * `limit`), but only *after* this process has already allocated it, so a few
 * concurrent large POSTs take down the storefront rather than the webhook.
 *
 * 256 kb is far above anything this proxy legitimately carries -- a Printful
 * event is a few kilobytes and a cart operation less -- and far below what
 * hurts.
 */
const MAX_FORWARDED_BODY_BYTES = 256 * 1024;

/** What a body over {@link MAX_FORWARDED_BODY_BYTES} gets, instead of being buffered. */
const PAYLOAD_TOO_LARGE = 413;

/**
 * Reads a request body, refusing rather than buffering past the cap.
 *
 * **The cap is enforced on the stream, not on `content-length`.** A declared
 * length is the sender's claim about itself: a chunked request carries none
 * at all, and one that lies would be believed. Reading with a ceiling is
 * bounded whatever the sender says, and costs one loop.
 */
async function readCappedBody(request: Request): Promise<ArrayBuffer | null> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_FORWARDED_BODY_BYTES) return null;

  const stream = request.body;
  if (stream === null) return new ArrayBuffer(0);

  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_FORWARDED_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  // One allocation at the end, from chunks already counted against the cap.
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body.buffer;
}

/** Forwards one allowed request while preserving its method, query, headers and raw body. */
export async function forwardStoreApiRequest(
  request: Request,
  target: URL,
  publishableKey: string,
  fetchImpl: StoreApiFetch = fetch,
): Promise<Response> {
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const body = hasBody ? await readCappedBody(request) : undefined;
  if (body === null) {
    return new Response(null, { status: PAYLOAD_TOO_LARGE });
  }
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

/**
 * The resolved paths that exist for one sender and one verb.
 *
 * **Review finding F2.** `resolveStoreApiPath` answers about paths and knows
 * nothing about methods, and `GET` is exported for a future store read -- so
 * the two webhook paths, which are the ones carved out of the Access gate and
 * therefore the only ones an anonymous caller can reach, forwarded `GET` and
 * `HEAD` to Medusa as well. Nothing leaked: both backend routes are POST-only
 * and the response scrubbing holds. But a 404 shaped by Medusa is
 * distinguishable from this route's own empty one, which makes the pair a
 * liveness oracle for a backend that is otherwise not addressable at all --
 * and neither verb has a legitimate caller here.
 */
const POST_ONLY_PATHS: ReadonlySet<string> = new Set([STRIPE_WEBHOOK_PATH, PRINTFUL_WEBHOOK_PATH]);

/**
 * Whether a resolved path refuses this method.
 *
 * Its own exported function, for the reason `checkout-rules.ts` gives about
 * the pay gate: a condition written inline in a handler can only be tested by
 * reading the file, and reading a file proves the words rather than the rule.
 */
export function methodRefused(method: string, upstreamPath: string): boolean {
  return method !== "POST" && POST_ONLY_PATHS.has(upstreamPath);
}

async function handle(request: Request): Promise<Response> {
  const requestUrl = new URL(request.url);
  const upstreamPath = resolveStoreApiPath(requestUrl.pathname);
  if (upstreamPath === null) {
    return new Response(null, { status: 404 });
  }
  // The same empty 404 an unresolved path gets, deliberately: a webhook path
  // answering one shape to GET and another to a path that does not resolve
  // would be the oracle this refusal exists to close.
  if (methodRefused(request.method, upstreamPath)) {
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
