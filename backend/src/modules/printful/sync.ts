/**
 * Making the Printful store agree with `catalogue.ts`, repeatably.
 *
 * **This is the answer to the one objection against sync products.** The
 * review that argued for catalogue orders was right that holding products in
 * Printful creates two sources of truth that can drift. This module is why
 * that is survivable: the table is the source, this reconciles Printful to it,
 * and running it twice produces four products rather than eight.
 *
 * **`external_id` is the join, and it is ours.** Printful assigns its own when
 * a product is created without one — the four products LD-04 created by hand
 * on 2026-09-08 carry values like `6aa0168fc91b89`, which say nothing and
 * match nothing. Setting it to the catalogue's `handle` makes "does this
 * already exist" a lookup rather than a guess, and makes the two systems
 * joinable by a name a human recognises.
 *
 * **It reconciles rather than only creating.** A product whose retail price or
 * artwork has moved in the table is updated, because a sync that only creates
 * leaves exactly the drift the review warned about — and the drift would be
 * silent, in the direction of a stale price on a real shelf.
 *
 * **It deletes nothing.** A product in the store that the table does not know
 * about is reported, not removed. Deleting is a decision with an order history
 * attached to it, and this module is not entitled to take it.
 */

import { MERCH_CATALOGUE, type MerchProduct } from "./catalogue";
import type { PrintfulClient } from "./client";

/** One Printful sync product, as the v1 list and detail endpoints return it. */
interface SyncProductSummary {
  readonly id: number;
  readonly external_id: string;
  readonly name: string;
}

interface SyncVariant {
  readonly id: number;
  readonly variant_id: number;
  readonly retail_price: string;
  readonly files?: ReadonlyArray<{ readonly type?: string; readonly url?: string }>;
}

interface SyncProductDetail {
  readonly sync_product: SyncProductSummary;
  readonly sync_variants: readonly SyncVariant[];
}

export interface SyncOptions {
  /**
   * Where Printful fetches artwork from, without a trailing slash.
   *
   * **Pinned to a commit, not to a branch.** `assertPinnedArtworkBase` enforces
   * it: a branch URL would let the artwork change under a product somebody has
   * already ordered against, and the buyer would receive a shirt this
   * repository can no longer reproduce.
   */
  readonly artworkBaseUrl: string;
  /** Report what would change without changing it. */
  readonly dryRun?: boolean;
}

export interface SyncResult {
  readonly created: readonly string[];
  readonly updated: readonly string[];
  readonly unchanged: readonly string[];
  /** In the store, unknown to the table. Reported; never deleted. */
  readonly unrecognised: readonly string[];
}

const PINNED = /^https:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/[0-9a-f]{40}\//;

/**
 * Refuse an artwork base that is not immutable.
 *
 * A `main` URL resolves to whatever `main` says today. A commit URL resolves to
 * one set of bytes for ever, which is the property a print file needs: the
 * shirt somebody received last month must still be reproducible from the same
 * address.
 */
export function assertPinnedArtworkBase(url: string): void {
  if (!PINNED.test(`${url}/`)) {
    throw new Error(`Artwork base must be a commit-pinned raw URL, not ${url}`);
  }
}

/**
 * The payload a create or an update sends, built once so both agree.
 *
 * **An update must carry each existing sync variant's `id`**, and finding that
 * out cost a live run. Without it Printful reads every variant in the payload
 * as a new one and refuses the whole request — "Variant with this external_id
 * already exists in store. External_id: LD-TEE-S" — so a second run against a
 * populated store failed outright. Passing `existing` is what makes an update
 * an update rather than six rejected creations.
 */
function body(product: MerchProduct, artworkBaseUrl: string, existing?: SyncProductDetail) {
  return {
    sync_product: { name: product.title, external_id: product.handle },
    sync_variants: product.variants.map((variant) => {
      const held = existing?.sync_variants.find((candidate) => candidate.variant_id === variant.printfulVariantId);
      return {
        ...(held === undefined ? {} : { id: held.id }),
        external_id: variant.sku,
        variant_id: variant.printfulVariantId,
        retail_price: (product.retailPrice / 100).toFixed(2),
        files: [{ type: product.placement, url: `${artworkBaseUrl}/${product.printFile.file}` }],
      };
    }),
  };
}

/**
 * Whether Printful already holds what the table says.
 *
 * Compared on the three things a buyer can be given wrongly: which blank it is
 * printed on, what it costs, and what is printed. Printful returns other
 * fields — thumbnails, mockup urls, timestamps — and comparing those would make
 * every run report an update.
 *
 * **The artwork is matched by URL, not by placement**, and that too cost a live
 * run. Printful normalises the placement it was sent: the shirt is created with
 * `front` and stored as `default`, while the cap's `front_dtf_hat` survives
 * unchanged. Comparing the placement we sent against the one it kept compares
 * our vocabulary to theirs, so every run reported a change and tried to write.
 * The URL is the thing that decides what gets printed, and it is ours.
 */
function matches(detail: SyncProductDetail, product: MerchProduct, artworkBaseUrl: string): boolean {
  if (detail.sync_product.name !== product.title) return false;
  if (detail.sync_variants.length !== product.variants.length) return false;

  return product.variants.every((variant) => {
    const found = detail.sync_variants.find((candidate) => candidate.variant_id === variant.printfulVariantId);
    if (found === undefined) return false;
    if (found.retail_price !== (product.retailPrice / 100).toFixed(2)) return false;
    const wanted = `${artworkBaseUrl}/${product.printFile.file}`;
    return (found.files ?? []).some((candidate) => candidate.url === wanted);
  });
}

export async function syncMerchProducts(client: PrintfulClient, options: SyncOptions): Promise<SyncResult> {
  const artworkBaseUrl = options.artworkBaseUrl.replace(/\/+$/, "");
  assertPinnedArtworkBase(artworkBaseUrl);

  const listing = await client.request<{ result: readonly SyncProductSummary[] }>(
    "GET",
    "/store/products?limit=100",
  );
  const existing = new Map(listing.result.map((summary) => [summary.external_id, summary]));

  const created: string[] = [];
  const updated: string[] = [];
  const unchanged: string[] = [];

  for (const product of MERCH_CATALOGUE) {
    const found = existing.get(product.handle);

    if (found === undefined) {
      if (!options.dryRun) await client.request("POST", "/store/products", body(product, artworkBaseUrl));
      created.push(product.handle);
      continue;
    }

    const detail = await client.request<{ result: SyncProductDetail }>("GET", `/store/products/${String(found.id)}`);
    if (matches(detail.result, product, artworkBaseUrl)) {
      unchanged.push(product.handle);
      continue;
    }

    if (!options.dryRun) {
      await client.request("PUT", `/store/products/${String(found.id)}`, body(product, artworkBaseUrl, detail.result));
    }
    updated.push(product.handle);
  }

  const known = new Set(MERCH_CATALOGUE.map((product) => product.handle));
  const unrecognised = [...existing.values()]
    .filter((summary) => !known.has(summary.external_id))
    .map((summary) => `${String(summary.id)} ${summary.name}`);

  return { created, updated, unchanged, unrecognised };
}
