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
 * No masthead and no footer: the layout that renders them is what failed.
 */

import { plexMono } from "../fonts/plex-mono";

import "./globals.css";

export default function GlobalError() {
  return (
    <html lang="en" className={plexMono.variable}>
      <body>
        <div className="sheet">
          <main>
            <hr className="double-rule" />
            <h1>Processing error</h1>
            <p>The request could not be completed. This was not, on this occasion, deliberate.</p>
            <hr className="double-rule" />
          </main>
        </div>
      </body>
    </html>
  );
}
