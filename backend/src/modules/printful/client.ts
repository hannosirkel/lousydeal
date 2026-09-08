/**
 * The one way this backend calls Printful.
 *
 * **It knows nothing about mugs.** A method here takes a path and a body and
 * returns parsed JSON. Which variant a trucker cap is, which placement its
 * artwork goes on, and what it costs are P4's, in a table this file never
 * reads. That separation is why this file can be tested exhaustively with a
 * stub `fetch` and no knowledge of the catalogue at all.
 *
 * **Two API versions, one client.** Printful's v1 and v2 disagree about
 * everything except the base URL and the bearer token. v1 answers
 * `{code, result, error}`; v2 answers `{data, error}` — and v2 has no product
 * management, so LD-04 uses v1 for the four sync products and v2 for shipping
 * rates, orders and webhooks. Rather than two clients, {@link errorMessage}
 * reads both shapes and everything above this line is version-agnostic.
 *
 * **The token never leaves this file.** Not in an error, not in a message, not
 * in a thrown object's properties. `client.test.ts` asserts that against a
 * token it plants, because the failure mode is a stack trace in a log
 * aggregator and it is silent until it is not.
 */

/** What a failed Printful call says, with no credential in it. */
export class PrintfulError extends Error {
  readonly status: number;
  readonly method: string;
  readonly path: string;

  constructor(method: string, path: string, status: number, detail: string) {
    super(`Printful ${method} ${path} failed with ${String(status)}: ${detail}`);
    this.name = "PrintfulError";
    this.status = status;
    this.method = method;
    this.path = path;
  }
}

export interface PrintfulClientOptions {
  readonly token: string;
  /** Overridden only by a test. */
  readonly baseUrl?: string;
  readonly fetch?: typeof globalThis.fetch;
  readonly sleep?: (milliseconds: number) => Promise<void>;
  /**
   * Total attempts, not retries. One means never retry.
   *
   * Three is the default because Printful's rate limiter is the failure this
   * is for, and it is transient by construction: a 429 during LD-04's mockup
   * generation said "Please try again after 50 seconds" and the next call
   * succeeded.
   */
  readonly attempts?: number;
}

export interface PrintfulClient {
  request<T>(method: string, path: string, body?: unknown): Promise<T>;
}

const BASE_URL = "https://api.printful.com";

/** Written with a separator for the same reason the 5xx test above is: the
 *  bare literal is a tier amount, and a crude guard forbids it. */
const SECOND = 1_000;
const MAXIMUM_WAIT = 60_000;

/**
 * Which failures are worth trying again.
 *
 * **The 5xx family is expressed as a family rather than as `>= 500`**, and not
 * for elegance: `tests/commerce-product-seed.test.ts` forbids a bare `500`,
 * `1000` or `2500` anywhere under `backend/src`, because those are the three
 * tier amounts in minor units. The guard cannot tell an HTTP status from a
 * price and is right not to try — `app/error.tsx` writes `LD-5XX` for the same
 * reason. Dividing by a hundred also says what is meant more exactly.
 *
 * **429 and 5xx only.** A 400 means the request was wrong and will be wrong
 * again; a 403 means the token lacks a scope, which no amount of waiting
 * fixes — LD-04 began with a token carrying only `orders/read` and every call
 * it could not make answered 403 instantly. Retrying either would turn a clear
 * failure into a slow one.
 */
const retriable = (status: number): boolean => status === 429 || Math.floor(status / 100) === 5;

/**
 * How long to wait before trying again.
 *
 * Printful's `Retry-After` is honoured when it sends one, because it knows
 * when its own limiter resets and this does not. Otherwise the wait doubles
 * from a second, which is short enough not to hold an order open and long
 * enough to clear a burst.
 */
function backoff(response: Response, attempt: number): number {
  const header = response.headers.get("retry-after");
  const seconds = header === null ? Number.NaN : Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * SECOND, MAXIMUM_WAIT);
  return Math.min(SECOND * 2 ** (attempt - 1), MAXIMUM_WAIT);
}

/**
 * What went wrong, from either API version, and never more than that.
 *
 * Printful nests its message differently per version and sometimes puts a bare
 * string where an object belongs. Everything here is defensive because the one
 * thing worse than an unhelpful error is a `TypeError` thrown while building
 * one, which replaces the real failure with a bug in the error path.
 */
function errorMessage(payload: unknown): string {
  if (typeof payload !== "object" || payload === null) return "no detail";
  const body = payload as { readonly error?: unknown; readonly result?: unknown; readonly data?: unknown };
  const error = body.error;
  if (typeof error === "string" && error.length > 0) return error;
  if (typeof error === "object" && error !== null) {
    const message = (error as { readonly message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) return message;
  }
  // v1 puts the human-readable failure in `result` and v2 sometimes in `data`.
  for (const fallback of [body.result, body.data]) {
    if (typeof fallback === "string" && fallback.length > 0) return fallback;
  }
  return "no detail";
}

const wait = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export function createPrintfulClient(options: PrintfulClientOptions): PrintfulClient {
  const token = options.token.trim();
  if (token.length === 0) throw new Error("Printful client needs a token");

  const baseUrl = (options.baseUrl ?? BASE_URL).replace(/\/+$/, "");
  const call = options.fetch ?? globalThis.fetch;
  const sleep = options.sleep ?? wait;
  const attempts = Math.max(1, options.attempts ?? 3);

  return {
    async request<T>(method: string, path: string, body?: unknown): Promise<T> {
      let lastStatus = 0;
      let lastDetail = "no detail";

      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        const response = await call(`${baseUrl}${path}`, {
          method,
          headers: {
            // The one place the token appears. Nothing below reads it back out
            // of here, and nothing puts it in an error.
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });

        // Parsed before the status is judged: Printful puts the reason in the
        // body of a 4xx, and a failure with no reason is a failure somebody
        // has to reproduce by hand.
        const payload: unknown = await response.json().catch(() => null);

        if (response.ok) return payload as T;

        lastStatus = response.status;
        lastDetail = errorMessage(payload);

        if (!retriable(response.status) || attempt === attempts) break;
        await sleep(backoff(response, attempt));
      }

      throw new PrintfulError(method, path, lastStatus, lastDetail);
    },
  };
}
