import type { MetadataRoute } from "next";
import { headers } from "next/headers";

import { requestOrigin } from "../lib/request-origin";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = requestOrigin(await headers());
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Pages and PDFs carrying `noindex` must remain crawlable so a crawler
      // can read that directive. These two namespaces are endpoints, not
      // indexable documents.
      disallow: ["/api/", "/analytics/"],
    },
    ...(origin === null ? {} : { sitemap: new URL("/sitemap.xml", origin).href }),
  };
}
