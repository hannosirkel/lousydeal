/**
 * The root layout: the typeface, the tokens, and the one serialized runtime
 * config every route carries.
 *
 * The design is `docs/current/brand.md`, approved at Gates B and C.
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
 * The font is applied as a CSS custom property on `<html>` rather than as the
 * generated class, so `globals.css` — which cannot know a build-time class
 * name — remains the single place the typeface is named. See
 * `src/fonts/plex-mono.ts` for why the files are local rather than fetched.
 */

import type { Metadata } from "next";
import { connection } from "next/server";
import type { ReactNode } from "react";

import { Footer } from "../components/document/Footer";
import { Masthead } from "../components/document/Masthead";
import {
  getRuntimeConfig,
  RUNTIME_CONFIG_ELEMENT_ID,
  serializeRuntimeConfig,
  toClientRuntimeConfig,
} from "../config/runtime-config";
import { plexMono } from "../fonts/plex-mono";

import "./globals.css";

/**
 * Deliberately without `metadataBase` or an image. Both are per-environment —
 * a social image URL is absolute and therefore names a host — and Global
 * Constraint 2 forbids baking a host into the built artifact. The row that
 * adds the social image derives its base from the request instead.
 */
export const metadata: Metadata = {
  title: "LOUSYDEAL.COM",
  description: "Purveyors of objectively bad value.",
};

export default async function RootLayout({ children }: { readonly children: ReactNode }) {
  await connection();
  const config = getRuntimeConfig();
  const serializedConfig = serializeRuntimeConfig(toClientRuntimeConfig(config));

  return (
    <html lang="en" className={plexMono.variable}>
      <body>
        <script
          id={RUNTIME_CONFIG_ELEMENT_ID}
          type="application/json"
          dangerouslySetInnerHTML={{ __html: serializedConfig }}
        />
        {/* One measure for the whole sheet, so the letterhead, the content
            and the trader line share an edge the way a printed document does.
            A <div> rather than a <main>: the three routes this repository
            serves today each render their own, and two would be invalid. The
            framework's built-in 404 renders here with none, which V6 fixes
            when it replaces that page. */}
        <div className="sheet">
          <Masthead />
          {children}
          <Footer merchant={config.merchant} />
        </div>
      </body>
    </html>
  );
}
