/**
 * Nothing may store anything in a visitor's browser without the Privacy Policy
 * saying so.
 *
 * The idea is taken from the sibling project, where the same guard refuses any
 * `document.cookie` write outside one declared file. It is worth having because
 * the failure it prevents is silent: a cookie added for a good reason is not a
 * bug, does not fail a build, and leaves a privacy notice that has quietly
 * become false — and a notice that is false about cookies is the one thing a
 * supervisory authority checks first.
 *
 * Three rules, and each fails closed:
 *
 *  1. A file may read or write cookies only if it is listed below. Adding a
 *     file to that list is the moment someone has to think about disclosure.
 *  2. Every cookie name the code writes must appear verbatim in the Privacy
 *     Policy. Renaming the cookie without touching the document fails here.
 *  3. `document.cookie`, `localStorage` and `sessionStorage` are forbidden
 *     outright. There are none today; the first one to arrive has to come with
 *     a paragraph, since none of the three is covered by anything §2 says.
 *
 * The scan is over source text rather than a parsed module graph, which makes
 * it cruder than it could be and harder to defeat by accident, which is the
 * trade this guard wants.
 */

import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { CART_ID_COOKIE } from "../src/lib/store-session";
import { PRIVACY } from "../src/content/legal/privacy";

/**
 * Files permitted to reach a cookie store.
 *
 * `cart-actions.ts` is the only writer; the two pages read. `store-session.ts`
 * is deliberately absent: it declares the name and the options and touches no
 * store, so listing it would have made the check below pass for a file that
 * cannot fail it. Its constant is imported instead, which is the stronger tie.
 */
const COOKIE_FILES = new Set(["lib/cart-actions.ts", "app/cart/page.tsx", "app/checkout/page.tsx"]);

const srcDir = fileURLToPath(new URL("../src", import.meta.url));

const sources = readdirSync(srcDir, { recursive: true, encoding: "utf8" })
  .filter((name) => /\.tsx?$/.test(name))
  .map((name) => name.replace(/\\/g, "/"))
  .sort()
  .map((file) => ({ file, text: readFileSync(`${srcDir}/${file}`, "utf8") }));

/** Comments describe the rules; only code may break them. */
const withoutComments = (text: string): string =>
  text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

const privacyProse = PRIVACY.sections.flatMap((section) => section.body).join("\n");

describe("the scan itself", () => {
  it("reads the source tree, so a passing run means something", () => {
    // A walk that finds nothing passes every assertion below for the wrong
    // reason -- the failure mode `no-unresolved-placeholder.test.ts` was
    // corrected for.
    expect(sources.length).toBeGreaterThan(20);
    for (const file of COOKIE_FILES) {
      expect(sources.map((source) => source.file)).toContain(file);
    }
  });
});

describe("who may touch a cookie", () => {
  it("is only the files that have been declared", () => {
    const touching = sources
      .filter(({ text }) => /from "next\/headers"|cookieStore|document\.cookie/.test(withoutComments(text)))
      .map(({ file }) => file);
    expect(touching.sort()).toEqual([...COOKIE_FILES].sort());
  });
});

describe("what the browser is asked to keep", () => {
  it("is one cookie, and the Privacy Policy names it", () => {
    // Rule 2. The name is imported rather than written twice, so this compares
    // the document against the code and not against itself.
    expect(privacyProse).toContain(CART_ID_COOKIE);
  });

  it("is described with the properties that make it strictly necessary", () => {
    // Session-scoped, opaque, and needed for the cart to work at all. Each is a
    // reason no consent is required, and dropping any one of them changes the
    // legal position the document takes.
    expect(privacyProse).toMatch(/opaque identifier/i);
    expect(privacyProse).toMatch(/ends when you close your browser/i);
    expect(privacyProse).toMatch(/strictly necessary/i);
  });

  it("has no name the document does not know about", () => {
    // Every literal written into the cookie store, not just the one imported
    // above: a second `.set("something", ...)` would otherwise pass silently.
    const written = sources
      .flatMap(({ text }) => [...withoutComments(text).matchAll(/\.(?:set|delete)\(\s*"([^"]+)"/g)])
      .map((match) => match[1] ?? "")
      .filter((name) => /^[a-z][a-z0-9_]*$/i.test(name));
    for (const name of written) {
      expect(privacyProse).toContain(name);
    }
  });

  it("uses no browser storage at all", () => {
    // Rule 3. §2 says the site sets one cookie and nothing else; local or
    // session storage would make that false without failing anything.
    for (const { file, text } of sources) {
      const code = withoutComments(text);
      expect(`${file}: ${String(/\blocalStorage\b/.test(code))}`).toBe(`${file}: false`);
      expect(`${file}: ${String(/\bsessionStorage\b/.test(code))}`).toBe(`${file}: false`);
      expect(`${file}: ${String(/\bdocument\.cookie\b/.test(code))}`).toBe(`${file}: false`);
    }
  });
});
