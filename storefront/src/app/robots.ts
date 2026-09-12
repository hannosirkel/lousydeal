import type { MetadataRoute } from "next";
import { headers } from "next/headers";

import { requestOrigin } from "../lib/request-origin";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = requestOrigin(await headers());
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/analytics/", "/cart", "/checkout", "/design/", "/done-deals/"],
    },
    ...(origin === null ? {} : { sitemap: new URL("/sitemap.xml", origin).href }),
  };
}
