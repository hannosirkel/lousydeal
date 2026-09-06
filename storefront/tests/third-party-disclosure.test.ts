/**
 * The Privacy Policy says the payment page loads Stripe and nothing else on
 * this site loads anything from anyone. That is a claim about the code, so it
 * is checked against the code.
 *
 * **Constraint 10: a claim is bounded, cited or executed.** This one is
 * executed. The alternative was to soften the sentence into uselessness — "we
 * may use third parties" is what a template says, and it tells a reader
 * nothing. A privacy notice earns its shortness by being checkable.
 *
 * Two things are asserted, and the second is the one that rots:
 *
 *  1. Stripe is reached only from the checkout. A `loadStripe` added to the
 *     layout would put a third party on every page, including the legal ones.
 *  2. No other external host appears in the source at all. A font, a CDN, an
 *     analytics beacon or an error reporter would each falsify §2, and none of
 *     them would fail a build.
 *
 * The dependency list is checked too, because that is where a tracker arrives
 * before it appears in any page.
 */

import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { PRIVACY } from "../src/content/legal/privacy";

const srcDir = fileURLToPath(new URL("../src", import.meta.url));

const sources = readdirSync(srcDir, { recursive: true, encoding: "utf8" })
  .filter((name) => /\.tsx?$/.test(name))
  .map((name) => name.replace(/\\/g, "/"))
  .sort()
  .map((file) => ({ file, text: readFileSync(`${srcDir}/${file}`, "utf8") }));

const withoutComments = (text: string): string =>
  text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

/**
 * Hosts that are allowed to appear as literals.
 *
 * Two are the proxy's own placeholder bases for URL parsing and the loopback
 * forms belong to tests and local development; none of those is a third party.
 *
 * **`x.com` and `bsky.app` are, and they arrived with C7's share row.** They
 * are the first external hosts this source has ever named — the list above
 * them was empty of real ones — so they are added here deliberately rather
 * than by widening the pattern. What makes them tolerable is the shape they
 * appear in: `<a href>` and nothing else. The page loads nothing from either,
 * the browser contacts neither until somebody presses a link, and both carry
 * `rel="noreferrer"` so that pressing one does not hand over which certificate
 * it came from. `tests/share-links.test.ts` asserts each of those.
 *
 * A fourth host is a decision, and this line is where it gets made.
 */
const PERMITTED =
  /^https?:\/\/(?:h|store-api-proxy\.invalid|localhost|127\.0\.0\.1|x\.com|bsky\.app)(?:[:/]|$)/;

const privacyProse = PRIVACY.sections.flatMap((section) => section.body).join("\n");

describe("the scan", () => {
  it("reads the source tree", () => {
    expect(sources.length).toBeGreaterThan(20);
  });
});

describe("what the pages load", () => {
  it("reaches Stripe only from the checkout", () => {
    const importers = sources
      .filter(({ text }) => /from "@stripe\//.test(withoutComments(text)))
      .map(({ file }) => file)
      .sort();
    // One file, measured. `checkout/page.tsx` and `lib/store-payment.ts`
    // mention `@stripe/...` in comments and import nothing from it, which is
    // why the scan strips comments before looking: counting those two would
    // have made this assertion agree with a guess instead of with the code.
    expect(importers).toEqual(["app/checkout/PaymentForm.tsx"]);
  });

  it("names no other external host anywhere in the source", () => {
    const offending = sources.flatMap(({ file, text }) =>
      [...withoutComments(text).matchAll(/https?:\/\/[a-zA-Z0-9.-]+/g)]
        .map((match) => match[0])
        .filter((url) => !PERMITTED.test(url))
        .map((url) => `${file}: ${url}`),
    );
    expect(offending).toEqual([]);
  });

  it("loads no script or stylesheet from anywhere, however the host is spelled", () => {
    // A full URL is the shape the scan above catches. Gate D reached for two it
    // did not: a protocol-relative `//fonts.googleapis.com/...`, which has no
    // `https:` to match, and `src={process.env.ANALYTICS_SCRIPT_URL}`, where
    // the host is not in the source at all. Both were placed in `layout.tsx` --
    // every page, including the legal ones -- and both passed.
    //
    // So the shape of the *tag* is checked rather than the spelling of the
    // host. The layout's one inline `<script>` carries the Stripe publishable
    // key through `dangerouslySetInnerHTML` and has no `src`, which is why the
    // rule is about `src` and not about `<script`.
    const offending = sources.flatMap(({ file, text }) => {
      const code = withoutComments(text);
      return [
        ["protocol-relative asset", /(?:src|href)=["']\/\//],
        ["external script", /<script[^>]*\bsrc\s*=/],
        ["external stylesheet", /<link[^>]*\brel=["']stylesheet/],
        ["host from the environment", /(?:src|href)=\{[^}]*process\.env/],
      ]
        .filter(([, pattern]) => (pattern as RegExp).test(code))
        .map(([what]) => `${file}: ${String(what)}`);
    });
    expect(offending).toEqual([]);
  });

  it("takes on no dependency that could become one", () => {
    // A tracker arrives here before it appears in a page. The list is short
    // enough to state, and stating it is what makes an addition deliberate.
    //
    // `pdfkit` is C6's, and it is the first addition since LD-01. It draws a
    // PDF from a font buffer and coordinates: it opens no socket, reads no
    // environment and contacts nobody, so it adds no third party to §5 of the
    // Privacy Policy -- which is what this guard is really asking. Contract §5
    // rules out the alternatives in as many words (no headless browser, no
    // object storage), so the choice was between a drawing library and hand-
    // written PDF syntax with a TrueType subsetter in it.
    const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
      dependencies: Record<string, string>;
    };
    expect(Object.keys(manifest.dependencies).sort()).toEqual([
      "@stripe/react-stripe-js",
      "@stripe/stripe-js",
      "next",
      "pdfkit",
      "react",
      "react-dom",
    ]);
  });
});

describe("the document that relies on all of it", () => {
  it("names every third party the code can reach, and claims no more", () => {
    // Backblaze was here and held nothing: the platform's backup jobs are nine
    // and none is this shop. A guard that *requires* a false name is worse than
    // no guard -- removing the falsehood would have failed the suite.
    for (const party of ["Stripe", "Cloudflare"]) {
      expect(privacyProse).toContain(party);
    }
    // §5 says "this is all of them". Nothing that is not in the code may be
    // named either -- describing processing that does not happen is the same
    // defect as omitting processing that does.
    // "Google" alone cannot be banned any more: §3 names Google Pay, which is
    // a wallet `<PaymentElement>` genuinely offers. The entries are the
    // products, not the companies.
    for (const absent of [
      "Google Analytics",
      "Meta",
      "Facebook",
      "Brevo",
      "Sentry",
      "Mailchimp",
      "Hotjar",
      "Backblaze",
    ]) {
      expect(`${absent}: ${String(privacyProse.includes(absent))}`).toBe(`${absent}: false`);
    }
  });

  it("says the payment page is where Stripe is, since that is where the code puts it", () => {
    expect(privacyProse).toMatch(/payment page loads Stripe/i);
    expect(privacyProse).toMatch(/fetches nothing from anywhere else/i);
  });
});
