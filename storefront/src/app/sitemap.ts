import type { MetadataRoute } from "next";
import { headers } from "next/headers";

import { LEGAL_ROUTES } from "../content/legal-routes";
import { createStoreFetchJson, listMerch, listTiers } from "../lib/medusa-client";
import { requestOrigin } from "../lib/request-origin";
import { requireStoreClientConfig } from "../lib/store-session";

interface SitemapItem {
  readonly handle: string;
}

export function buildSitemap(
  origin: URL,
  tiers: readonly SitemapItem[],
  merch: readonly SitemapItem[],
): MetadataRoute.Sitemap {
  const paths = [
    "/",
    ...tiers.map(({ handle }) => `/deal/${encodeURIComponent(handle)}`),
    ...merch.map(({ handle }) => `/goods/${encodeURIComponent(handle)}`),
    "/legal",
    ...LEGAL_ROUTES.map(({ href }) => href),
  ];
  return paths.map((path) => ({ url: new URL(path, origin).href }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = requestOrigin(await headers());
  if (origin === null) return [];

  // Keep the public catalogue tied to Medusa's actual products. A second list
  // of handles here would quietly drift when the catalogue changes.
  const fetchJson = createStoreFetchJson(requireStoreClientConfig());
  const [tiers, merch] = await Promise.all([listTiers(fetchJson), listMerch(fetchJson)]);
  return buildSitemap(origin, tiers, merch);
}
