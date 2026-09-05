/**
 * Holds the system pages to `docs/current/brand.md` §4's table, by reading
 * that table rather than restating it.
 *
 * These four pages exist because a framework default is still a page a
 * customer sees. Without them Next serves its own: the UA's serif on white,
 * or black under `prefers-color-scheme: dark`, in a register §2's worked
 * examples name as the thing not to write.
 */

import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ErrorPage from "../src/app/error";
import Loading from "../src/app/loading";
import NotFound from "../src/app/not-found";

const brand = readFileSync(new URL("../../docs/current/brand.md", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

/** The body text `brand.md` §4 gives each page, pulled out of its own table. */
function bodyFor(title: string): string {
  const row = new RegExp(`\\| \`${title}\` \\| ([^|]+) \\|`).exec(brand);
  if (row?.[1] === undefined) throw new Error(`brand.md has no system-pages row for ${title}`);
  return row[1].trim();
}

describe("the 404", () => {
  const html = renderToStaticMarkup(createElement(NotFound));

  it("says what the brand document says", () => {
    expect(html).toContain(bodyFor("DOCUMENT NOT FOUND"));
    // Sentence case in the markup; the capitals are `text-transform`.
    expect(html).toContain("Document not found");
  });

  it("is a document, rendered on the server", () => {
    expect(html).toContain('<section class="document">');
    expect(html).toContain("<h1");
  });
});

describe("the error page", () => {
  const html = renderToStaticMarkup(createElement(ErrorPage));

  it("says what the brand document says", () => {
    expect(html).toContain(bodyFor("PROCESSING ERROR"));
    expect(html).toContain("Processing error");
  });

  it("offers a link rather than a control needing a handler", () => {
    // `reset()` would need an onClick. A link works even where the boundary's
    // own JavaScript did not load, which is a state this page can be in.
    expect(html).toContain('<a class="button is-secondary" href="/">');
    expect(html).not.toContain("<button");
  });

  it("publishes nothing a server threw", () => {
    // The thrown message would tell a reader who cannot act on it something
    // about the inside of the system. Next logs it server-side instead.
    expect(html).not.toMatch(/stack|Error:|at \w+ \(/);
  });
});

describe("the loading state", () => {
  const html = renderToStaticMarkup(createElement(Loading));

  it("is one blinking block cursor and no spinner", () => {
    expect(html).toContain('<span class="cursor"');
    expect(html).not.toContain("spinner");
    expect(html).not.toContain("svg");
    expect(css).toMatch(/\.cursor \{[^}]*animation: cursor-blink/);
    expect(css).toContain("@keyframes cursor-blink");
  });

  it("draws the cursor rather than setting it as a glyph", () => {
    // U+25AE is not in this typeface -- see `src/fonts/plex-mono.ts` -- so a
    // character would render as tofu.
    expect(html).not.toContain("▮");
    expect(css).toMatch(/\.cursor \{[^}]*background: var\(--ink\)/);
  });

  it("stops blinking outright under reduced motion", () => {
    // The blanket reduced-motion rule shortens animations to 0.01ms, which can
    // leave a two-keyframe blink stopped on the invisible one.
    const query = /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";
    expect(query).toMatch(/\.cursor \{[^}]*animation: none/);
  });

  it("tells a reader who cannot see it that something is happening", () => {
    expect(html).toContain('role="status"');
    expect(html).toContain('<span class="visually-hidden">Loading</span>');
    expect(html).toContain('aria-hidden="true"');
  });
});
