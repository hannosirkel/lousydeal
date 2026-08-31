/**
 * The Medusa Store API transport, and the one function that lists tiers
 * through it.
 *
 * `FetchJson` is the injected seam: `listTiers` takes it as a parameter
 * instead of calling a module-level `fetch`, so `tests/store-cart.test.ts`
 * can pass a stub that never opens a socket. `createStoreFetchJson` below is
 * the one real implementation, used from a server component (see
 * `src/app/page.tsx`) with the values `getRuntimeConfig()` reads per request.
 *
 * **Server-side, not browser.** `plepic/storefront/src/lib/medusa-client.ts`
 * builds a browser client that talks to `/store-api`, a same-origin proxy
 * route that allowlists which Store API paths a browser may reach. That
 * proxy does not exist in this repository and this row does not add one.
 * Fetching from the server component instead is simpler for what this row
 * needs -- one list call and one cart mutation -- and it is what
 * `src/app/layout.tsx` already established the shape for: read
 * `getRuntimeConfig()` inside a dynamically rendered request, server-side,
 * never in the browser.
 *
 * **No `@medusajs/js-sdk` dependency.** The package is present in
 * `node_modules` only because `backend/package.json` depends on
 * `@medusajs/medusa`, which pulls it in transitively; `storefront/package.json`
 * does not declare it, and importing it here would be a hidden coupling to
 * the backend workspace's dependency tree, not a real one. It is used only as
 * a source to read the contract from, which is what the two constants below
 * cite.
 */

/**
 * The subset of `RequestInit` this transport actually accepts. `RequestInit`
 * itself widens `headers` to `HeadersInit`, which also admits a `Headers`
 * instance or a `[string, string][]` pair list -- and `{ ...init.headers }`
 * below does not handle either safely. Measured: spreading a `Headers`
 * instance yields `{}` (its entries are silently dropped); spreading a pair
 * list yields an object keyed `"0"`, `"1"`, ... holding the original pairs as
 * values, not as header names -- corrupted, not merely dropped. Narrowed here
 * to the one shape `{ ...init.headers }` spreads correctly, so a future
 * caller cannot pass either of the other two and have its headers vanish or
 * corrupt without a type error.
 */
export interface StoreFetchInit {
  readonly method?: string;
  readonly body?: string;
  readonly headers?: Readonly<Record<string, string>>;
}

/** A JSON-returning HTTP call, parameterised so a test can stub it. */
export type FetchJson = <T>(path: string, init?: StoreFetchInit) => Promise<T>;

export interface StoreClientConfig {
  readonly backendUrl: string;
  readonly publishableKey: string;
}

/**
 * The header name the Store API requires on every request, established from
 * the installed package rather than assumed: both
 * `node_modules/@medusajs/js-sdk/dist/esm/client.js:40`
 * (`export const PUBLISHABLE_KEY_HEADER = "x-publishable-api-key"`) and
 * `node_modules/@medusajs/utils/dist/api-key/api-key-type.js:20` export this
 * exact literal, and the middleware that enforces it --
 * `node_modules/@medusajs/framework/dist/http/middlewares/ensure-publishable-api-key.js` --
 * reads `req.get(PUBLISHABLE_KEY_HEADER)` and refuses the request with
 * `MedusaError.Types.NOT_ALLOWED` when it is absent.
 */
export const STORE_PUBLISHABLE_KEY_HEADER = "x-publishable-api-key";

/**
 * The one real `FetchJson`. Every response is read as JSON and every
 * non-2xx status is a thrown error -- there is no partial-success shape in
 * the Store API responses this row calls.
 */
export function createStoreFetchJson(config: StoreClientConfig): FetchJson {
  return async function storeFetchJson<T>(path: string, init: StoreFetchInit = {}): Promise<T> {
    const response = await fetch(`${config.backendUrl}${path}`, {
      ...init,
      headers: {
        ...init.headers,
        "content-type": "application/json",
        [STORE_PUBLISHABLE_KEY_HEADER]: config.publishableKey,
      },
    });
    if (!response.ok) {
      throw new StoreApiError(response.status, path);
    }
    return (await response.json()) as T;
  };
}

/**
 * Thrown by `storeFetchJson` above for any response that fails its own
 * `!response.ok` check, carrying the HTTP status so a caller can act on which
 * one it was -- see `src/app/cart/page.tsx`, which treats status 404 on a
 * cart lookup as a stale cookie and every other status as a real failure to
 * re-throw.
 */
export class StoreApiError extends Error {
  constructor(
    readonly status: number,
    path: string,
  ) {
    super(`Medusa store API returned ${String(status)} for ${path}`);
    this.name = "StoreApiError";
  }
}

/** The Store API's own region shape, narrowed to the two fields this row reads. */
export interface StoreRegion {
  readonly id: string;
  readonly currency_code: string;
}

/**
 * `variants.calculated_price`'s shape, present only when the request carries
 * a `region_id` -- `node_modules/@medusajs/medusa/dist/api/utils/middlewares/products/set-pricing-context.js`
 * resolves the region from `req.filterableFields.region_id` and populates
 * `req.pricingContext` from it; `.../store/products/route.js` then only adds
 * `context.variants.calculated_price` when `req.pricingContext` is present.
 */
export interface StoreCalculatedPrice {
  readonly calculated_amount: number;
  readonly currency_code: string;
}

export interface StoreProductVariant {
  readonly id: string;
  readonly calculated_price?: StoreCalculatedPrice | null;
}

export interface StoreProduct {
  readonly id: string;
  readonly handle: string;
  readonly title: string;
  readonly variants?: readonly StoreProductVariant[];
}

/** What this page renders for one tier -- the API's own fields, carried through, not reformatted. */
export interface Tier {
  readonly id: string;
  readonly handle: string;
  readonly title: string;
  readonly variantId: string;
  readonly amount: number;
  readonly currencyCode: string;
}

const TIER_PRODUCT_FIELDS = ["id", "title", "handle", "*variants", "*variants.calculated_price"].join(",");

/**
 * The one region this store prices into (`backend/src/scripts/configure-commerce.ts`
 * declares exactly one, `REGION_NAME = "Worldwide"`). Read from the API
 * rather than assumed, so this file names no region and no currency of its
 * own.
 */
export async function getDefaultRegion(fetchJson: FetchJson): Promise<StoreRegion> {
  const { regions } = await fetchJson<{ regions: readonly StoreRegion[] }>("/store/regions");
  const region = regions[0];
  if (region === undefined) {
    throw new Error("no region configured on this Medusa store");
  }
  return region;
}

/**
 * Every tier the store API answers with, each carrying its one variant's id
 * (`backend/src/scripts/seed-product.ts`: one variant per product) and the
 * price exactly as the API returned it. A product with no `calculated_price`
 * on its first variant -- no region resolved, or genuinely unpriced -- is
 * left out rather than rendered with a fabricated amount.
 */
export async function listTiers(fetchJson: FetchJson): Promise<Tier[]> {
  const region = await getDefaultRegion(fetchJson);
  const query = new URLSearchParams({ region_id: region.id, fields: TIER_PRODUCT_FIELDS });
  const { products } = await fetchJson<{ products: readonly StoreProduct[] }>(`/store/products?${query.toString()}`);

  return products.flatMap((product) => {
    const variant = product.variants?.[0];
    const price = variant?.calculated_price;
    if (variant === undefined || price == null) return [];
    return [
      {
        id: product.id,
        handle: product.handle,
        title: product.title,
        variantId: variant.id,
        amount: price.calculated_amount,
        currencyCode: price.currency_code,
      },
    ];
  });
}
