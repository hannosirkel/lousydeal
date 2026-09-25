/**
 * The share row: the first external links this site has ever carried.
 *
 * Before C7, `grep 'href="http' storefront/src` was empty. That is the fact
 * these assertions protect — not that sharing works, which is three anchors,
 * but that adding it did not quietly change what the site loads, what it tells
 * anybody, or what a reader of the Privacy Policy would find true.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ShareRow } from "../src/components/document/ShareRow";
import {
  SHARE_EMAIL_SUBJECT,
  SHARE_LABEL,
  SHARE_NOTICE,
  SHARE_PUBLISHES,
  SHARE_TARGETS,
  SHARE_TEXT,
  WHO_CAN_SEE,
} from "../src/content/certificate";
import { PRIVACY } from "../src/content/legal/privacy";

const URL_UNDER_TEST = "https://lousydeal.example/done-deals/xbts2k3mmv3trv3n";
const html = renderToStaticMarkup(createElement(ShareRow, { url: URL_UNDER_TEST }));

/** Every `href` the row renders. */
const hrefs = [...html.matchAll(/href="([^"]*)"/g)].map(([, href]) => href ?? "");

describe("the share row", () => {
  it("offers the three destinations and no more", () => {
    expect(hrefs).toHaveLength(Object.keys(SHARE_TARGETS).length);
    for (const label of Object.values(SHARE_TARGETS)) expect(html).toContain(label);
    expect(html).toContain(SHARE_LABEL);
  });

  it("loads nothing from anywhere, which is what makes it not a third party", () => {
    // A share widget is a script tag. This site's answer to "what do you load
    // from elsewhere" is "nothing", and that has to survive the row that adds
    // sharing -- the whole reason these are anchors.
    expect(html).not.toMatch(/<script/);
    expect(html).not.toMatch(/<iframe/);
    expect(html).not.toMatch(/<img/);
    expect(html).not.toMatch(/\bsrc=/);
  });

  it("hands no referrer to the service, so pressing a link does not disclose which certificate", () => {
    // `noopener` is the security rule and `noreferrer` is this site's posture:
    // without it, the destination learns the certificate's address from the
    // Referer header before the person has said anything.
    const anchors = [...html.matchAll(/<a\b[^>]*>/g)].map(([tag]) => tag);
    expect(anchors).toHaveLength(3);
    for (const anchor of anchors) {
      expect(anchor, anchor).toMatch(/rel="noopener noreferrer"/);
    }
  });

  it("carries the certificate's own address to each destination, encoded rather than spliced", () => {
    const encoded = encodeURIComponent(URL_UNDER_TEST);
    // Every destination gets the address, and gets it percent-encoded -- a raw
    // `?` or `&` in a URL parameter truncates it at the destination.
    for (const href of hrefs) expect(href, href).toContain(encoded);
    expect(hrefs.join("\n")).not.toContain(`=${URL_UNDER_TEST}`);
  });

  it("says the same thing at each destination, in the sharer's own voice", () => {
    const encoded = encodeURIComponent(SHARE_TEXT);
    for (const href of hrefs) expect(href, href).toContain(encoded);
    // First person, past tense: the person sharing is the one who did it.
    expect(SHARE_TEXT).toMatch(/^I bought/);
  });

  it("goes to the two hosts the disclosure guard permits, and to the reader's own mail client", () => {
    // The host list in `third-party-disclosure.test.ts` is where a third
    // destination becomes a decision. `mailto:` is not a host at all -- it
    // reaches whatever the reader's own machine opens.
    expect(hrefs.filter((href) => href.startsWith("https://x.com/"))).toHaveLength(1);
    expect(hrefs.filter((href) => href.startsWith("https://bsky.app/"))).toHaveLength(1);
    expect(hrefs.filter((href) => href.startsWith("mailto:"))).toHaveLength(1);
    expect(hrefs.some((href) => href.startsWith("mailto:") && href.includes(encodeURIComponent(SHARE_EMAIL_SUBJECT)))).toBe(
      true,
    );
  });

  it("tells the reader what pressing one does, because this site's notice invites the question", () => {
    expect(html).toContain(SHARE_NOTICE);
    expect(SHARE_NOTICE).toMatch(/nothing reaches any of them until you press one/i);
    expect(SHARE_NOTICE).toMatch(/loads nothing from them/i);
  });

  it("is labelled for a screen reader rather than being an unlabelled list of links", () => {
    expect(html).toContain('aria-labelledby="share-row-label"');
    expect(html).toContain('id="share-row-label"');
  });

  it("names no host of its own outside the destinations", () => {
    // The component builds URLs from constants and the address it is given.
    // A host written into a label, a comment stripped, or a second link added
    // without touching `destinations` would show up here.
    const source = readFileSync(new URL("../src/components/document/ShareRow.tsx", import.meta.url), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/^\s*\/\/.*$/gm, " ");
    const hosts = [...source.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)].map(([, host]) => host);

    expect([...new Set(hosts)].sort()).toEqual(["bsky.app", "x.com"]);
  });
});

/**
 * A line with its `//` comment removed: the first `//` at the start of the
 * line or after whitespace, with an even count of each quote character before
 * it. Deliberately simple -- a quote inside a template expression or a
 * regular expression can fool it -- and good enough for a guard that reads
 * this repository's own sources.
 */
function withoutLineComment(line: string): string {
  for (const match of line.matchAll(/(^|\s)\/\//g)) {
    const before = line.slice(0, match.index);
    const balanced = ['"', "'", "`"].every((quote) => before.split(quote).length % 2 === 1);
    if (balanced) return before;
  }
  return line;
}

/**
 * LD-11 J10: the page says who can read it, and each reason it gives is held
 * to the code that makes it true.
 */
describe("what the share row says about who can see the page", () => {
  it("says it before the links, where pressing one is still a choice", () => {
    const notice = html.indexOf(WHO_CAN_SEE);
    expect(notice).toBeGreaterThan(-1);
    expect(notice).toBeLessThan(html.indexOf("<a "));
  });

  it("names the page unlisted and not private, and says who can read it", () => {
    expect(WHO_CAN_SEE).toMatch(/^Anybody with this page’s address can read it\./);
    expect(WHO_CAN_SEE).toMatch(/\bunlisted, not private\b/);
  });

  it("says what the Privacy Policy already told the buyer about the same page", () => {
    // §3 tells a buyer, before they type an inscription, that it is printed on
    // "a certificate anybody with its address can read". The page now says it
    // too; if either is reworded, the two are reconciled rather than drifting.
    const privacy = PRIVACY.sections.flatMap((section) => section.body).join("\n");
    expect(privacy).toContain("a certificate anybody with its address can read");
    expect(WHO_CAN_SEE).toContain("Anybody with this page’s address can read it");
  });

  it("is true that nothing on this site links to a certificate", () => {
    // The notice says so. `seo.test.ts` keeps `/done-deals/` out of the
    // sitemap; this fails if any source outside the route's own segment
    // spells the path `/done-deals/` in code, so a link from a receipt page
    // or a gallery makes the sentence false here first. The route's own
    // segment builds the address to share, and is exempt.
    //
    // **Its limit:** it reads spellings, not values. A path assembled from
    // pieces (`"done-deals" + "/"`) passes it. Comments are stripped first --
    // block comments, and a `//` at the start of a line or after whitespace
    // outside any quote -- so prose that mentions the route does not count,
    // and `https://` inside a string is never mistaken for one.
    const root = fileURLToPath(new URL("../src", import.meta.url));
    const own = join(root, "app", "done-deals");
    const files = (function walk(dir: string): string[] {
      return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) return path === own ? [] : walk(path);
        return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
      });
    })(root);
    const offending = files.filter((file) =>
      readFileSync(file, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .split("\n")
        .map(withoutLineComment)
        .join("\n")
        .includes("/done-deals/"),
    );

    expect(files.length).toBeGreaterThan(50);
    expect(offending.map((file) => relative(root, file))).toEqual([]);
  });
});

/**
 * LD-11 J11: at the controls, that sending one gives the address away. The
 * address reaching every destination is asserted above ("carries the
 * certificate's own address"); the preview's name is asserted where the card
 * is rendered, in `certificate-indexing.test.ts`.
 */
describe("what the share row says pressing one does", () => {
  it("says it directly under the links, before the note about tracking", () => {
    expect(html).toContain(`</ul><p class="fine-print">${SHARE_PUBLISHES}</p>`);
    expect(html.indexOf(SHARE_PUBLISHES)).toBeLessThan(html.indexOf(SHARE_NOTICE));
  });

  it("says the address goes with it, and who can then open the page", () => {
    expect(SHARE_PUBLISHES).toMatch(/^Pressing one starts a post or an email with this page’s address in it\./);
    expect(SHARE_PUBLISHES).toMatch(/whoever reads it can open the certificate/);
    expect(SHARE_PUBLISHES).toMatch(/a post on X or Bluesky can be read by anybody/);
  });

  it("says the preview shows the name before anybody opens it", () => {
    expect(SHARE_PUBLISHES).toMatch(/its preview shows the name on the certificate\.$/);
  });
});
