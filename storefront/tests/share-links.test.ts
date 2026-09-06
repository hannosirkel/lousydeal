/**
 * The share row: the first external links this site has ever carried.
 *
 * Before C7, `grep 'href="http' storefront/src` was empty. That is the fact
 * these assertions protect — not that sharing works, which is three anchors,
 * but that adding it did not quietly change what the site loads, what it tells
 * anybody, or what a reader of the Privacy Policy would find true.
 */

import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ShareRow } from "../src/components/document/ShareRow";
import {
  SHARE_EMAIL_SUBJECT,
  SHARE_LABEL,
  SHARE_NOTICE,
  SHARE_TARGETS,
  SHARE_TEXT,
} from "../src/content/certificate";

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
