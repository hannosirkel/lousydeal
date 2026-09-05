/**
 * Holds the system pages to `docs/current/brand.md` §4's table, by reading
 * that table rather than restating it.
 *
 * These pages exist because a framework default is still a page a customer
 * sees. Without them Next serves its own: the UA's serif on white, or black
 * under `prefers-color-scheme: dark`, in a register §2's worked examples name
 * as the thing not to write.
 *
 * **What this file cannot do is prove a page reaches a browser.** V5b shipped
 * a root `loading.tsx` that made every route serve a Suspense fallback and
 * nothing else without JavaScript, turned a 404 into a 200, and left this
 * suite green throughout. The guard below is the cheap half of the answer —
 * it stops that exact shape returning. The expensive half is V15's, which
 * fetches from a built server with scripting disabled.
 */

import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import ErrorPage from "../src/app/error";
import NotFound from "../src/app/not-found";

const brand = readFileSync(new URL("../../docs/current/brand.md", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

/**
 * The body text `brand.md` §4 gives a page, pulled out of its own table by the
 * title *and* the row's position, because two rows carry `PROCESSING ERROR`
 * and taking the first would silently follow a reordering of that table.
 */
function bodyFor(title: string, occurrence = 1): string {
  const rows = [...brand.matchAll(new RegExp(`\\| \`${title}\` \\| ([^|]+) \\|`, "g"))];
  const row = rows[occurrence - 1]?.[1];
  if (row === undefined) throw new Error(`brand.md has no system-pages row ${String(occurrence)} for ${title}`);
  return row.trim();
}

describe("no Suspense boundary above the document", () => {
  // A `loading.tsx` at a route root makes Next flush the shell as soon as its
  // fallback renders. After that the status is committed and the body arrives
  // only through inline scripts -- so the page is blank without JavaScript,
  // `notFound()` returns 200, and a thrown error returns 200. Measured on the
  // commit that shipped one: `/` served masthead, "Loading" and footer;
  // `/deal/nope` answered 200.
  //
  // Every route in this storefront is a document that has to arrive whole, so
  // there is no segment here that can afford to stream.
  it("has no loading.tsx anywhere under app", () => {
    const appRoot = fileURLToPath(new URL("../src/app", import.meta.url));
    const found: string[] = [];
    const walk = (dir: string, prefix: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) walk(`${dir}/${entry.name}`, `${prefix}${entry.name}/`);
        else if (/^loading\.(tsx?|jsx?)$/.test(entry.name)) found.push(`${prefix}${entry.name}`);
      }
    };
    walk(appRoot, "");
    expect(found).toEqual([]);
  });
});

describe("the 404", () => {
  const html = renderToStaticMarkup(createElement(NotFound));

  it("says what the brand document says", () => {
    expect(html).toContain(bodyFor("DOCUMENT NOT FOUND"));
    // Sentence case in the markup; the capitals are `text-transform`.
    expect(html).toContain("Document not found");
  });

  it("is a document with a form number", () => {
    expect(html).toContain('<section class="document">');
    expect(html).toContain("Form LD-404");
  });
});

describe("the error page", () => {
  const html = renderToStaticMarkup(createElement(ErrorPage));

  it("says what the brand document says", () => {
    expect(html).toContain(bodyFor("PROCESSING ERROR"));
    expect(html).toContain("Processing error");
  });

  it("is a document with a form number, not a bare heading", () => {
    expect(html).toContain('<section class="document">');
    expect(html).toContain("Form LD-5XX");
  });

  it("offers a link rather than a control needing a handler", () => {
    // `reset()` would need an onClick. A link needs none.
    expect(html).toContain('<a class="button is-secondary" href="/">');
    expect(html).not.toContain("<button");
  });
});

describe("the layout error page", () => {
  it("is the same document, less the masthead and footer, with its own head", async () => {
    // `next/font/local` returns a loader Vitest cannot run, which is the real
    // reason this page went untested -- an earlier commit blamed the CSS
    // import, and that import works.
    vi.doMock("next/font/local", () => ({ default: () => ({ variable: "font-mock" }) }));
    vi.resetModules();
    const { default: GlobalError } = await import("../src/app/global-error");
    const html = renderToStaticMarkup(createElement(GlobalError));

    // The same sentence as `error.tsx` -- the table's second row describes
    // what differs, which is the chrome, not the words.
    expect(html).toContain(bodyFor("PROCESSING ERROR"));
    expect(bodyFor("PROCESSING ERROR", 2)).toContain("without masthead or footer");
    expect(html).toContain('<section class="document">');
    expect(html).toContain("Form LD-5XX");
    expect(html).toContain('<a class="button is-secondary" href="/">');
    // The layout that renders these is what failed.
    expect(html).not.toContain("masthead");
    expect(html).not.toContain("footer");

    // Replacing the document replaces the head. Without the viewport meta this
    // page ships to a phone at desktop width.
    expect(html).toContain("<title>LOUSYDEAL.COM</title>");
    expect(html).toContain('name="viewport"');
    expect(html).toContain('name="description"');

    vi.doUnmock("next/font/local");
    vi.resetModules();
  });
});

describe("the loading cursor", () => {
  // The component that used it is gone -- see the Suspense guard above -- but
  // the mark stays, because `brand.md` §4 gives it to a state inside a page
  // rather than to a route boundary. The checkout's payment step uses it.
  it("is drawn in CSS rather than set as a glyph", () => {
    // U+25AE is not in this typeface, so a character would be tofu.
    expect(css).toMatch(/\.cursor \{[^}]*background: var\(--ink\)/);
    expect(css).toContain("@keyframes cursor-blink");
    expect(css).not.toContain("▮");
  });

  it("stops blinking outright under reduced motion", () => {
    // The blanket rule shortens animations to 0.01ms, which can leave a
    // two-keyframe blink stopped on the invisible one.
    const query = /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";
    expect(query).toMatch(/\.cursor \{[^}]*animation: none/);
  });
});
