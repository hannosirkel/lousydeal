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
import { headers } from "next/headers";
import { connection } from "next/server";
import type { ReactNode } from "react";

import { Footer } from "../components/document/Footer";
import { Masthead } from "../components/document/Masthead";
import { MASTHEAD_LINE, MASTHEAD_MARK } from "../content/chrome";
import {
  getRuntimeConfig,
  RUNTIME_CONFIG_ELEMENT_ID,
  serializeRuntimeConfig,
  toClientRuntimeConfig,
} from "../config/runtime-config";
import { plexMono } from "../fonts/plex-mono";

import "./globals.css";

/**
 * `metadataBase` is derived from the request, never written down.
 *
 * A social image URL is absolute and so names a host, and Global Constraint 2
 * forbids baking one into the built artifact — the same image has to serve
 * `test.` and the live host from one image. `headers()` gives the host the
 * request arrived on, which is the only place that fact exists at runtime.
 *
 * **The scheme is derived too.** `x-forwarded-proto` is what the tunnel sets,
 * and it decides the scheme: measured behind `next start`, a request carrying
 * `X-Forwarded-Proto: https` produced an `https://` image URL and one without
 * produced `http://` — so something upstream of this code supplies the header
 * even locally, and the `?? "https"` below is a fallback for the case where
 * nothing does rather than the usual path. It is https because an `http://`
 * image URL sends a scraper to a redirect, and not all of them follow one.
 */
export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";

  return {
    title: MASTHEAD_MARK,
    description: `${MASTHEAD_LINE}.`,
    // Absent rather than guessed when the host is: `metadataBase` with a wrong
    // origin produces confidently wrong absolute URLs, and Next falls back to a
    // relative one, which every scraper resolves against the page it fetched.
    ...(host === null ? {} : { metadataBase: new URL(`${proto}://${host}`) }),
  };
}

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
