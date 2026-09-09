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
    for (const party of ["Stripe", "Cloudflare", "Printful"]) {
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
      // Named in Printful's own documents as an affiliate location, never as a
      // company in this path. §5 says "no company is named here that is not in
      // the path today", and an affiliate of a processor is not one.
      "Shopify",
    ]) {
      expect(`${absent}: ${String(privacyProse.includes(absent))}`).toBe(`${absent}: false`);
    }
  });

  it("says the payment page is where Stripe is, since that is where the code puts it", () => {
    expect(privacyProse).toMatch(/payment page loads Stripe/i);
    expect(privacyProse).toMatch(/fetches nothing from anywhere else/i);
  });
});


/**
 * **The scan above reads `storefront/src`, and Printful is not in it.**
 *
 * That is the whole point of the paragraph §2 now carries: the browser never
 * contacts Printful, because the integration is server-to-server. Which means
 * this file's original method — "every recipient appears as a host literal in
 * the source we scan" — stopped being sufficient the moment a recipient existed
 * that the front end cannot see.
 *
 * So the claim is executed against the repository that does the contacting.
 */
describe("the recipient the browser never sees", () => {
  const backend = fileURLToPath(new URL("../../backend/src", import.meta.url));

  const backendSources = readdirSync(backend, { recursive: true, encoding: "utf8" })
    .filter((name) => /\.ts$/.test(name))
    .map((name) => name.replace(/\\/g, "/"))
    .map((file) => ({ file, text: readFileSync(`${backend}/${file}`, "utf8") }));

  it("reads the backend tree too", () => {
    expect(backendSources.length).toBeGreaterThan(20);
  });

  it("finds Printful reached from the server, which is what §2 promises", () => {
    // If this ever became empty, §5 would name a company nothing contacts --
    // the Backblaze defect, in the other repository.
    const callers = backendSources
      .filter(({ text }) => /api\.printful\.com/.test(withoutComments(text)))
      .map(({ file }) => file)
      .sort();
    expect(callers).toEqual(["modules/printful/client.ts"]);
  });

  it("keeps Printful's host out of the storefront, which is what makes §2 true", () => {
    // The claim is not "we do not load their script". It is that the host
    // appears nowhere the browser could reach, which is the checkable form.
    //
    // **Written first as a search for the word and it failed correctly**: the
    // Privacy Policy is under `src`, and §5 names the company in prose. The
    // subject of the claim is the host, not the name -- and `PERMITTED` above
    // would have rejected the host anyway, which is the belt this is the
    // braces for.
    const offending = sources
      .filter(({ text }) => /printful\.com/i.test(withoutComments(text)))
      .map(({ file }) => file);
    expect(offending).toEqual([]);
  });

  it("says the order goes to Printful, because the subscriber now sends it", () => {
    // **P11 wrote this guard and keyed it on the wrong thing.** It tied §5's
    // "does not yet hand its orders over for printing" to `createFulfillment`
    // being inert -- but the order is placed from the *subscriber*, and
    // `createFulfillment` is inert still and always will be. The guard would
    // have passed while the sentence became false, which is the exact failure
    // it was written to prevent, one file to the left.
    //
    // Keyed on the path that actually sends.
    const subscriber = readFileSync(`${backend}/subscribers/order-placed.ts`, "utf8");
    expect(subscriber).toContain("submitPrintfulOrder(");
    expect(privacyProse).toMatch(/the order goes to Printful so the item can be made/i);
    expect(privacyProse).not.toMatch(/does not yet hand its orders over/i);
  });

  it("claims no more goes than does, which is measured from the order body", () => {
    // `orders.ts` sends `external_id`, `recipient` and `items`. §5 says the
    // email address, the amount and the certificate stay here, and that is
    // checkable: none of them appears in the request this builds.
    const orders = readFileSync(`${backend}/modules/printful/orders.ts`, "utf8");
    const body = orders.slice(orders.indexOf('client.request<V1OrderResponse>("POST", "/orders"'));
    const request = body.slice(0, body.indexOf("});"));
    for (const absent of ["email", "total", "amount", "dedication", "display_name", "slug"]) {
      expect(`${absent}: ${String(request.includes(absent))}`).toBe(`${absent}: false`);
    }
    expect(privacyProse).toMatch(/not your email address, not what you paid/i);
  });

  it("names the address as what goes with a quote, and not the name", () => {
    // Measured against `shipping.ts`: the recipient block it sends carries
    // address1, city, country_code and zip. No name. A policy claiming more
    // left than actually does would be wrong in the direction that looks
    // cautious, and this document does not do that either.
    const shipping = readFileSync(`${backend}/modules/printful/shipping.ts`, "utf8");
    const recipient = shipping.slice(shipping.indexOf("recipient: {"), shipping.indexOf("recipient: {") + 220);
    expect(recipient).toContain("address1");
    expect(recipient).toContain("zip");
    expect(recipient).not.toMatch(/\bname:/);
    expect(privacyProse).toMatch(/Your name is not sent with it/i);
  });
});
