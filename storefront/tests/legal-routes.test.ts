/**
 * Every link to a legal document resolves to a route that exists.
 *
 * **This is the test the row is for.** V2 deferred the footer's LEGAL column
 * with the reason "a link that 404s is worse than an absent one", which was
 * correct and left the site with four documents nothing pointed at. Adding the
 * links is easy; the part that has to survive is the guarantee that a renamed
 * or removed route takes the links with it.
 *
 * So the check is against the filesystem, not against a second list. A route is
 * `src/app/<path>/page.tsx`, and that is what Next resolves too — a test that
 * compared `LEGAL_ROUTES` to a hand-written array of the same strings would
 * agree with itself forever.
 *
 * **It also matters legally.** § 54(1) p 12 requires the conditions, the time
 * limit and the procedure for withdrawal to be given before the contract is
 * concluded, and § 56(1⁶) runs the period to 12 months instead of 14 days where
 * that duty was breached. A footer link that silently stops resolving is not a
 * cosmetic regression.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Footer } from "../src/components/document/Footer";
import { FOOTER_COLUMNS, LEGAL_ROUTES, WITHDRAWAL_ROUTE } from "../src/content/legal-routes";
import type { MerchantIdentity } from "../src/content/merchant";

const appDir = fileURLToPath(new URL("../src/app", import.meta.url));

const CONFIGURED: MerchantIdentity = {
  legalName: "Example Trader OÜ",
  address: "Example tn 1, 10000 Tallinn, Estonia",
  email: "trader@example.test",
  registryCode: "10000000",
  vatNumber: "EE100000000",
  phoneNumber: "+372 00 00000",
};

const footerHtml = (merchant: MerchantIdentity) =>
  renderToStaticMarkup(createElement(Footer, { merchant }));

describe("the routes", () => {
  it("lists four documents, which is what brand.md §4 names", () => {
    expect(LEGAL_ROUTES).toHaveLength(4);
  });

  it.each(LEGAL_ROUTES)("$href has a page file behind it", ({ href }) => {
    // The filesystem, not a second copy of the list. `/legal/terms` is
    // `src/app/legal/terms/page.tsx`, which is how Next resolves it too.
    expect(href).toMatch(/^\/legal\/[a-z-]+$/);
    expect(existsSync(`${appDir}${href}/page.tsx`)).toBe(true);
  });

  it("gives every document a label and a summary", () => {
    for (const route of LEGAL_ROUTES) {
      expect(route.label).not.toBe("");
      expect(route.summary).not.toBe("");
      // Sentence case: brand.md §2 sets the register, and a link is neither a
      // label nor a stamp.
      expect(route.label).not.toBe(route.label.toUpperCase());
    }
  });

  it("has an index at /legal that is not one of the four", () => {
    expect(existsSync(`${appDir}/legal/page.tsx`)).toBe(true);
    expect(LEGAL_ROUTES.map((route) => route.href)).not.toContain("/legal");
  });

  it("covers every legal route the app actually has", () => {
    // The other direction, and the one that catches a document shipped with no
    // link: a new `src/app/legal/<x>/page.tsx` must appear in LEGAL_ROUTES.
    const onDisk = readdirSync(`${appDir}/legal`, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && existsSync(`${appDir}/legal/${entry.name}/page.tsx`))
      .map((entry) => `/legal/${entry.name}`)
      .sort();
    expect([...LEGAL_ROUTES.map((route) => route.href)].sort()).toEqual(onDisk);
  });
});

describe("the footer", () => {
  it("renders all four links, with their labels", () => {
    const html = footerHtml(CONFIGURED);
    for (const route of LEGAL_ROUTES) {
      expect(html).toContain(`href="${route.href}"`);
      expect(html).toContain(route.label);
    }
  });

  it("carries both headed columns brand.md §4 names", () => {
    const html = footerHtml(CONFIGURED);
    expect(html).toContain(FOOTER_COLUMNS.legal);
    expect(html).toContain(FOOTER_COLUMNS.company);
    // Each column names itself for a screen reader, rather than being a fourth
    // unlabelled list in the page.
    expect(html).toContain('aria-labelledby="footer-legal"');
    expect(html).toContain('aria-labelledby="footer-company"');
  });

  it("keeps the contact address reachable and the trader line beneath", () => {
    const html = footerHtml(CONFIGURED);
    expect(html).toContain(`mailto:${CONFIGURED.email ?? ""}`);
    expect(html).toContain(CONFIGURED.legalName ?? "");
    expect(html).toContain(CONFIGURED.address ?? "");
  });

  it("still shows a named gap and the notice when nothing is configured", () => {
    // Decision 004 survives the restructuring: the columns must not have become
    // a place where an unconfigured field renders blank.
    const html = footerHtml({ legalName: null, address: null, email: null, registryCode: null, vatNumber: null, phoneNumber: null });
    expect(html).toMatch(/\[[A-Z ]+ NOT CONFIGURED\]/);
    expect(html).not.toMatch(/\{[^}]*\}/);
  });

  it("names no route of its own", () => {
    // The links come from the content file. A hard-coded `/legal/...` here is
    // the second copy this row exists to prevent.
    const source = readFileSync(new URL("../src/components/document/Footer.tsx", import.meta.url), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/^\s*\/\/.*$/gm, " ");
    expect(source).not.toMatch(/["'`]\/legal\//);
  });
});

describe("the offer page's withdrawal link", () => {
  it("points at the withdrawal document, looked up rather than indexed", () => {
    expect(WITHDRAWAL_ROUTE.href).toBe("/legal/refunds");
    expect(LEGAL_ROUTES).toContain(WITHDRAWAL_ROUTE);
  });

  it("is rendered by the offer page, not merely named in its prose", () => {
    // brand.md §4 gives the notice a link. Before this row the notice named the
    // document in words and nothing on the site linked it -- which is the
    // § 54(1) p 12 exposure in the plan's gate item 12.
    const source = readFileSync(new URL("../src/components/document/Quotation.tsx", import.meta.url), "utf8");
    expect(source).toContain("WITHDRAWAL_ROUTE.href");
  });
});
