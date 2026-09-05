"use client";

/**
 * The error state for a failure in the root layout itself, which is the one
 * case Next does not render `error.tsx` for — `global-error.tsx` replaces the
 * whole document, so it supplies its own `<html>` and `<body>`.
 *
 * It exists for the same reason `not-found.tsx` does: without it Next serves
 * its own default, which is a white — or under `prefers-color-scheme: dark`,
 * black — page in the UA's serif. `docs/current/brand.md` §3 says this
 * identity has no night edition, and a page nobody wrote is still a page a
 * customer can see.
 *
 * **It is the same document as `error.tsx`, less the masthead and footer**,
 * which is exactly what `brand.md` §4 says: the layout that renders those is
 * what failed. `DocumentFrame` and `Button` are pure presentational modules
 * with no server-only imports, so a client boundary can render both — an
 * earlier version of this file hand-rolled a bare heading between two rules
 * and lost the form number and the way back with it.
 *
 * **The head is this file's to supply.** Replacing the document replaces
 * `layout.tsx`'s `<head>`, so `<title>`, the description and — the one that
 * actually breaks a page — `viewport` have to be rendered here. React 19
 * hoists them out of the body. Without the viewport meta this page ships to a
 * phone at desktop width.
 */

import { Button } from "../components/document/Button";
import { DocumentFrame } from "../components/document/DocumentFrame";
import { plexMono } from "../fonts/plex-mono";

import "./globals.css";

export default function GlobalError() {
  return (
    <html lang="en" className={plexMono.variable}>
      <body>
        <title>LOUSYDEAL.COM</title>
        <meta name="description" content="Purveyors of objectively bad value." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <div className="sheet">
          <main>
            <DocumentFrame title="Processing error" form="Form LD-5XX" revision="Rev. 2026-09">
              <p>The request could not be completed. This was not, on this occasion, deliberate.</p>
              <Button variant="secondary" href="/">
                Return to the purchase order
              </Button>
            </DocumentFrame>
          </main>
        </div>
      </body>
    </html>
  );
}
