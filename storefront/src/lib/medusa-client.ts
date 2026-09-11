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
      const body: unknown = await response.json().catch(() => undefined);
      throw new StoreApiError(response.status, path, body);
    }
    return (await response.json()) as T;
  };
}

/**
 * Thrown by `storeFetchJson` above for any response that fails its own
 * `!response.ok` check, carrying the HTTP status and parsed JSON body so a
 * caller can act on the API's stable reason -- see `cart-actions.ts` for D4's
 * surcharge refusals. `src/app/cart/page.tsx` treats status 404 on a cart
 * lookup as a stale cookie and every other status as a real failure to re-throw.
 */
export class StoreApiError extends Error {
  constructor(
    readonly status: number,
    path: string,
    readonly body?: unknown,
  ) {
    super(`Medusa store API returned ${String(status)} for ${path}`);
    this.name = "StoreApiError";
  }
}

/**
 * One row of a region's own `countries`, narrowed to the two fields the
 * checkout country control (`checkout/PaymentForm.tsx`) reads: `iso_2` to
 * send back to Medusa, `display_name` to show. `iso_2` is exactly the value
 * `update-cart.js:30-34`'s `data.region.countries.find((c) => c.iso_2 === ...)`
 * matches a cart's `country_code` against, and it is already lower-case on
 * this row -- `@medusajs/region/dist/loaders/defaults.js:10` writes
 * `iso_2: c.alpha2.toLowerCase()` when the country table is seeded. A value
 * read from this array cannot fail that lookup on case, because it *is* one
 * of the rows the lookup matches against.
 */
export interface StoreRegionCountry {
  readonly iso_2: string;
  readonly display_name: string;
}

/**
 * The Store API's own region shape, narrowed to the fields this row reads:
 * `id` and `currency_code` (T9), and `countries` (T10b, for the checkout
 * country control). `GET /store/regions` already returns `countries` by
 * default -- `@medusajs/medusa/dist/api/store/regions/query-config.js`'s
 * `defaultStoreRegionFields` includes `"*countries"` -- so widening this
 * interface is the whole change; no request changes to `getDefaultRegion`
 * below were needed to reach the data.
 *
 * `countries` is optional on the type, not because the live endpoint ever
 * omits it, but because `tests/store-cart.test.ts` -- outside this row's
 * authority, so not a file this row edits -- builds its own `StoreRegion`
 * fixture without it; `listTiers` never reads the field, so that fixture is
 * faithful to what it stubs. `getDefaultRegion`'s caller (`checkout/page.tsx`)
 * defaults a missing array to `[]` rather than assuming presence.
 */
export interface StoreRegion {
  readonly id: string;
  readonly currency_code: string;
  readonly countries?: readonly StoreRegionCountry[];
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
  readonly sku?: string | null;
  readonly title?: string | null;
  /**
   * `seed-merch.ts` writes the Printful mapping here and `seed-product.ts`
   * writes nothing. That is what tells the two catalogues apart — see
   * {@link isMerchProduct}.
   */
  readonly metadata?: Record<string, unknown> | null;
}

export interface StoreProduct {
  readonly id: string;
  readonly handle: string;
  readonly title: string;
  /** Medusa's own line under the title. `seed-merch.ts` writes what the object is. */
  readonly subtitle?: string | null;
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

/**
 * `*variants.metadata` is asked for **explicitly** rather than trusted to
 * arrive inside `*variants`.
 *
 * The whole split below turns on that field, and its absence does not look
 * like an error: every product would read as a certificate, which is exactly
 * the state this row is fixing. A discriminator that fails closed into the bug
 * it fixes is worse than none, so `listMerch` refuses to be silently empty —
 * see the note there.
 */
const PRODUCT_FIELDS = [
  "id",
  "title",
  // What the object is, plainly -- the titles are jokes and a buyer cannot
  // shop from a joke. `seed-merch.ts` writes it from `catalogue.ts`.
  "subtitle",
  "handle",
  "*variants",
  "*variants.calculated_price",
  "*variants.metadata",
].join(",");

/**
 * Whether a product is something printed and posted.
 *
 * **Decided from the data, not from a list of handles.** A handle list in the
 * storefront would be a second copy of `catalogue.ts`, free to drift the day a
 * product is added — and drifting quietly, because a merch product mistaken
 * for a certificate is sold with `VALUE` zero and no address asked for.
 *
 * The Printful mapping is the honest discriminator: a product carrying it is
 * by construction something Printful prints, and one without it cannot be
 * ordered from Printful at all. `seed-merch.ts` writes it on every variant and
 * `seed-product.ts` writes no metadata whatever.
 *
 * The shipping profile would say the same thing — `seed-merch.ts` calls it
 * "the whole of the difference here" — and is not used because the Store API's
 * exposure of `shipping_profile_id` on a product is not something this file
 * can check from here. The mapping arrives with the variants, which it can.
 */
export function isMerchProduct(product: StoreProduct): boolean {
  return (product.variants ?? []).some(
    (variant) => typeof variant.metadata?.printful_variant_id === "string",
  );
}

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
async function listProducts(fetchJson: FetchJson): Promise<readonly StoreProduct[]> {
  const region = await getDefaultRegion(fetchJson);
  const query = new URLSearchParams({ region_id: region.id, fields: PRODUCT_FIELDS });
  const { products } = await fetchJson<{ products: readonly StoreProduct[] }>(`/store/products?${query.toString()}`);
  return products;
}

export async function listTiers(fetchJson: FetchJson): Promise<Tier[]> {
  const products = (await listProducts(fetchJson)).filter((product) => !isMerchProduct(product));

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

/** One printed thing, as the upsell renders it. */
export interface MerchItem {
  readonly id: string;
  readonly handle: string;
  readonly title: string;
  /** What it actually is: T-Shirt, Mug, Trucker Cap, Sticker. `null` if unseeded. */
  readonly kind: string | null;
  readonly variants: readonly {
    readonly variantId: string;
    /** Medusa's variant title, which `seed-merch.ts` sets from the size. */
    readonly size: string;
    readonly amount: number;
    readonly currencyCode: string;
  }[];
}

/**
 * The printed things, each with every priced variant it has.
 *
 * Every variant, not the first: a shirt has sizes and a buyer has to pick one,
 * which is the one place merch differs from a tier. A variant with no
 * `calculated_price` is dropped for the reason `listTiers` drops one — a
 * fabricated amount is worse than an absent row — and a product left with no
 * priced variants is dropped with it, because an item nobody can buy is not an
 * offer.
 *
 * **The failure mode worth naming is silence.** If `*variants.metadata` ever
 * stops arriving — a fields list edited, a Medusa upgrade that changes what
 * `*variants` expands to — then every product reads as a certificate,
 * `listTiers` returns shirts again, the home page offers one at `VALUE` zero,
 * and the checkout asks nobody for an address. The defect this row removes
 * would come back with no test failing.
 *
 * There is no runtime check that distinguishes "no merch in this store" from
 * "the field did not arrive", because the two are the same answer. What is
 * guarded instead is the thing that would actually cause it:
 * `medusa-client.test.ts` asserts `PRODUCT_FIELDS` names `*variants.metadata`,
 * so an edit that drops it fails rather than quietly changing what the shop
 * sells.
 */
export async function listMerch(fetchJson: FetchJson): Promise<MerchItem[]> {
  const products = await listProducts(fetchJson);
  const merch = products.filter((product) => isMerchProduct(product));

  return merch.flatMap((product) => {
    const variants = (product.variants ?? []).flatMap((variant) => {
      const price = variant.calculated_price;
      if (price == null) return [];
      return [
        {
          variantId: variant.id,
          // The size, as Medusa titled the variant. `seed-merch.ts` sets it
          // and "One size" is a real answer rather than a missing one.
          size: variant.title ?? "",
          amount: price.calculated_amount,
          currencyCode: price.currency_code,
        },
      ];
    });
    if (variants.length === 0) return [];
    // **Trimmed, and `null` where it is missing rather than an empty string.**
    // A product seeded before the subtitle existed has none, and the row
    // should then render nothing at all rather than an empty line under the
    // title -- which reads as a rendering fault.
    const subtitle = typeof product.subtitle === "string" ? product.subtitle.trim() : "";
    return [
      { id: product.id, handle: product.handle, title: product.title, kind: subtitle.length > 0 ? subtitle : null, variants },
    ];
  });
}
