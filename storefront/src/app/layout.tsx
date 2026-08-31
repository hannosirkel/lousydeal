/**
 * The root layout — scaffolding a later slice replaces, not a design.
 *
 * `await connection()` opts the tree into dynamic rendering. A code comment
 * inside the `connection()` example in Next.js's own
 * `docs/01-app/02-guides/environment-variables.mdx` reads: "cookies, headers,
 * and other Request-time APIs will also opt into dynamic rendering, meaning
 * this env variable is evaluated at runtime." Read at build time instead of
 * per request, the same value is inlined into the built artifact rather than
 * read fresh at container start — which is what `getRuntimeConfig()` below
 * needs to avoid: called from a route `next build` prerenders, it would read
 * build-time values baked into the image, which is exactly what decision 002
 * forbids for an environment-specific value
 * (`docs/decisions/002-rebuild-live-from-merged-main.md:33-34`; also Global
 * Constraint 2). `connection()` is chosen over the route-segment `export
 * const dynamic = "force-dynamic"` because it opts in at the one call site
 * that actually needs per-request evaluation, rather than as a config export
 * a later file in this tree could rely on, override, or forget.
 *
 * A root layout renders no route by itself — `next build` succeeds against
 * this file with no `page.tsx` anywhere under it. T9 adds the first page.
 */

import { connection } from "next/server";
import type { ReactNode } from "react";

import {
  getRuntimeConfig,
  RUNTIME_CONFIG_ELEMENT_ID,
  serializeRuntimeConfig,
  toClientRuntimeConfig,
} from "../config/runtime-config";

export default async function RootLayout({ children }: { readonly children: ReactNode }) {
  await connection();
  const serializedConfig = serializeRuntimeConfig(toClientRuntimeConfig(getRuntimeConfig()));

  return (
    <html lang="en">
      <body>
        <script
          id={RUNTIME_CONFIG_ELEMENT_ID}
          type="application/json"
          dangerouslySetInnerHTML={{ __html: serializedConfig }}
        />
        {children}
      </body>
    </html>
  );
}
