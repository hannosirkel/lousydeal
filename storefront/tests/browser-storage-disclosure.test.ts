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
 *     outright **in code this repository writes**. Stripe's script uses
 *     `document.cookie` on the payment page — that is §2's second and third
 *     cookies, and it is not ours to forbid. What this rule keeps out is a
 *     fourth that nobody declared.
 *
 * **Gate D got two writes past the first version of this file**, and both are
 * closed: `res.cookies.set({ name: "…", value, maxAge })`, whose object form
 * presents no string first argument to the name scan and imports nothing from
 * `next/headers`; and the same write from a `middleware.ts`, which did not
 * exist and so was scanned by nothing. The docstring above claimed to prevent
 * exactly what those two did.
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
const COOKIE_FILES = new Set([
  "lib/cart-actions.ts",
  "app/cart/page.tsx",
  "app/checkout/page.tsx",
  // The proxy does not originate a cookie; it forwards whatever the backend
  // sends and strips the `Domain` attribute. That is still a path by which one
  // could reach a browser without appearing anywhere else in this tree, so it
  // is declared -- and the test below pins it to forwarding only.
  "app/api/store/[...path]/route.ts",
]);

/**
 * Every way a cookie can be written from this codebase.
 *
 * `cookies()` from `next/headers` is the one in use, matched on the named
 * import rather than on the module: V13's layout imports `headers` from the
 * same place to derive `metadataBase`, and reads no cookie at all. The other
 * two are what
 * Gate D reached for: a `NextResponse`/`NextRequest` cookie jar, which needs no
 * import from `next/headers`, and the raw header. Each is matched on its own
 * because a single "cookie" substring would fire on every comment in the tree.
 */
const COOKIE_WRITE =
  /import\s*\{[^}]*\bcookies\b[^}]*\}\s*from\s*"next\/headers"|cookieStore|\bcookies\s*\(\s*\)|\.cookies\.(?:set|delete)\b|document\.cookie|["']set-cookie["']/i;

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
      .filter(({ text }) => COOKIE_WRITE.test(withoutComments(text)))
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

  it("is described with the properties that carry its legal position", () => {
    // Session-scoped, opaque, and needed for the cart to work at all. Each is a
    // reason no consent is asked for, and dropping any one changes the position
    // the document takes. "Strictly necessary" as a phrase is gone: V11a stopped
    // asserting the conclusion and gives the reason instead, because Stripe's
    // two cookies made a blanket claim untenable.
    expect(privacyProse).toMatch(/opaque identifier/i);
    expect(privacyProse).toMatch(/ends when you close your browser/i);
    expect(privacyProse).toMatch(/a basket that cannot be found is not a shop/i);
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

  it("lets the proxy forward a cookie but never originate one", () => {
    // §2 counts three cookies. The proxy could make that false without any of
    // them appearing in this repository -- Medusa registers express-session,
    // and a `Set-Cookie` it emitted would be passed straight through. What
    // keeps the count honest is that the proxy writes no cookie of its own.
    const proxy = sources.find(({ file }) => file === "app/api/store/[...path]/route.ts");
    expect(proxy).toBeDefined();
    const code = withoutComments(proxy?.text ?? "");
    expect(code).toMatch(/headers\.append\("set-cookie"/);
    expect(code).not.toMatch(/\.cookies\.set\b/);
    expect(code).not.toMatch(/cookieStore/);
  });

  it("has no middleware, which is a file the scan above would not have covered", () => {
    // Gate D wrote the cookie from `src/middleware.ts`. It is scanned now --
    // the walk is over `src`, so it would be caught by the rule above -- but a
    // middleware is worth refusing outright for a second reason: it runs on
    // every request including the legal pages, and V5c already removed a root
    // `loading.tsx` for the same class of surprise.
    expect(sources.map(({ file }) => file)).not.toContain("middleware.ts");
    expect(sources.map(({ file }) => file)).not.toContain("middleware.tsx");
  });

  it("uses no browser storage at all", () => {
    // Rule 3. §2 says the site sets one cookie and nothing else; local or
    // session storage would make that false without failing anything.
    for (const { file, text } of sources) {
      const code = withoutComments(text);
      // Object form as well as the string one: `.set({ name: "x", value })`
      // writes a cookie and names it nowhere the first scan could see.
      const objectForm = /\.cookies\.set\(\s*\{/.test(code);
      expect(`${file}: ${String(objectForm)}`).toBe(`${file}: false`);
      expect(`${file}: ${String(/\blocalStorage\b/.test(code))}`).toBe(`${file}: false`);
      expect(`${file}: ${String(/\bsessionStorage\b/.test(code))}`).toBe(`${file}: false`);
      expect(`${file}: ${String(/\bdocument\.cookie\b/.test(code))}`).toBe(`${file}: false`);
    }
  });
});
