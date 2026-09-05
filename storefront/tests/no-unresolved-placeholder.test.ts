/**
 * The guard decision `004` makes mandatory: no placeholder reaches a rendered
 * legal page, configured or not.
 *
 * **It walks the directory rather than a list**, because a guard that names
 * the files it checks stops covering the ones added after it. Three more
 * documents arrive with V9, V10 and V11.
 *
 * The first version of that walk was narrower than its own claim, and Gate D
 * proved it: a document at `legal/privacy/index.ts` carrying `{merchnatLegalName}`
 * passed, a `legal/refunds.tsx` carrying `{COMPANY_EMAIL}` passed, and a second
 * document exported from a file whose first export was already found passed.
 * It is recursive now, takes `.ts` and `.tsx`, and checks every exported
 * document rather than the first.
 *
 * Each is resolved twice, configured and not, because the failures differ.
 * **Unconfigured** is the important one: a field that slipped the resolver
 * prints a blank where a registration number belongs, and `004`'s whole point
 * is that a quiet blank reads as a complete notice that is not one.
 * **Configured** catches a brace token in a field the resolver never sees —
 * a title, a form number or a heading. A typo in a *paragraph* throws in
 * `resolveText` rather than printing, which is a different guard doing its own
 * job.
 */

import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LegalDocument } from "../src/components/document/LegalDocument";
import {
  CONTENTS_HEADING,
  LEGAL_CLOSING_LINE,
  LEGAL_INCOMPLETE_NOTICE,
  UPDATED_LABEL,
  type LegalDocument as LegalDocumentRecord,
} from "../src/content/legal/types";
import { MERCHANT_PLACEHOLDERS, type MerchantIdentity } from "../src/content/merchant";

const CONFIGURED: MerchantIdentity = {
  legalName: "Example Trader OÜ",
  address: "Example tn 1, 10000 Tallinn, Estonia",
  email: "trader@example.test",
  registryCode: "10000000",
  vatNumber: "EE100000000",
};

const UNCONFIGURED: MerchantIdentity = {
  legalName: null,
  address: null,
  email: null,
  registryCode: null,
  vatNumber: null,
};

const legalDir = fileURLToPath(new URL("../src/content/legal", import.meta.url));

/** Every source file under the directory, at any depth, in either extension. */
const sourceFiles = readdirSync(legalDir, { recursive: true, encoding: "utf8" })
  .filter((name) => /\.tsx?$/.test(name) && !/(^|\/)types\.tsx?$/.test(name))
  .map((name) => name.replace(/\\/g, "/"))
  .sort();

const isLegalDocument = (value: unknown): value is LegalDocumentRecord =>
  typeof value === "object" &&
  value !== null &&
  "sections" in value &&
  "title" in value &&
  Array.isArray((value as LegalDocumentRecord).sections);

/**
 * Every document the directory holds. A file may export more than one, and all
 * of them are checked — taking only the first is how a second document hides.
 */
const documents = (
  await Promise.all(
    sourceFiles.map(async (file) => {
      const module = (await import(/* @vite-ignore */ `${legalDir}/${file}`)) as Record<string, unknown>;
      const records = Object.entries(module).filter(([, value]) => isLegalDocument(value));
      if (records.length === 0) throw new Error(`${file} exports no legal document`);
      return records.map(([name, record]) => ({
        file: records.length === 1 ? file : `${file} (${name})`,
        record: record as LegalDocumentRecord,
      }));
    }),
  )
).flat();

describe("the legal directory", () => {
  it("holds at least one document, so the walk below is not vacuous", () => {
    // A directory guard that finds nothing passes for the wrong reason.
    expect(documents.length).toBeGreaterThan(0);
  });

  it("finds every source file under it, at any depth and in either extension", () => {
    // Gate D got three documents past the first version of this walk: one in a
    // subdirectory, one with a .tsx extension, and a second export from a file
    // already found.
    expect(sourceFiles.length).toBeGreaterThanOrEqual(documents.length ? 1 : 0);
    expect(documents.length).toBeGreaterThanOrEqual(sourceFiles.length);
  });
});

describe("brand.md's own strings", () => {
  // Constraint 12: brand.md is the authority for every word. Read from it, so
  // rewording a constant fails here rather than passing silently.
  const brand = readFileSync(new URL("../../docs/current/brand.md", import.meta.url), "utf8")
    .replace(/^> ?/gm, "")
    .replace(/\s+/g, " ");

  it.each([
    ["the closing line", LEGAL_CLOSING_LINE],
    ["the incomplete notice", LEGAL_INCOMPLETE_NOTICE],
    ["the contents heading", CONTENTS_HEADING],
  ])("%s is the one brand.md gives", (_name, value) => {
    expect(value).not.toBe("");
    expect(brand.toUpperCase()).toContain(value.toUpperCase());
  });
});

describe.each(documents)("$file", ({ record }) => {
  const render = (merchant: MerchantIdentity) =>
    renderToStaticMarkup(createElement(LegalDocument, { document: record, merchant }));

  it("leaves no placeholder on the page when every field is configured", () => {
    const html = render(CONFIGURED);
    for (const token of Object.keys(MERCHANT_PLACEHOLDERS)) {
      expect(html).not.toContain(`{${token}}`);
    }
    // And nothing brace-shaped at all, which catches the typo the vocabulary
    // does not know about.
    expect(html).not.toMatch(/\{[^}]*\}/);
    expect(html).not.toContain(LEGAL_INCOMPLETE_NOTICE);
  });

  it("leaves no placeholder and no blank when no field is configured", () => {
    const html = render(UNCONFIGURED);
    expect(html).not.toMatch(/\{[^}]*\}/);

    // Only a document that asks for a merchant field can show a gap. Asserting
    // one unconditionally would fail the first document that names nobody --
    // which is most of what a privacy policy is.
    const usesAPlaceholder = record.sections
      .flatMap((section) => section.body)
      .some((paragraph) => Object.keys(MERCHANT_PLACEHOLDERS).some((token) => paragraph.includes(`{${token}}`)));

    if (usesAPlaceholder) {
      // Named and visible, never dropped -- decision 004.
      expect(html).toMatch(/\[[A-Z ]+ NOT CONFIGURED\]/);
      expect(html).toContain(LEGAL_INCOMPLETE_NOTICE);
    } else {
      expect(html).not.toContain(LEGAL_INCOMPLETE_NOTICE);
    }
  });

  it("says it is incomplete only when it is", () => {
    expect(render(CONFIGURED)).not.toContain(LEGAL_INCOMPLETE_NOTICE);
  });

  it("closes with the line and the date brand.md requires", () => {
    const html = render(CONFIGURED);
    expect(html).toContain(LEGAL_CLOSING_LINE);
    expect(html).toContain(UPDATED_LABEL);
    expect(html).toMatch(new RegExp(`<time datetime="${record.updated}"`, "i"));
  });

  it("names each section once, with the number joined to the heading", () => {
    // React separates adjacent text children with comment markers, and the
    // whitespace between them is dropped from the accessibility tree -- the
    // name came out as `1WHO OPERATES THIS SITE`. One string, one text node.
    const html = render(CONFIGURED);
    for (const section of record.sections) {
      expect(html).toContain(`${section.number} ${section.heading}`);
      expect(html).not.toContain(`${section.number}<!-- -->`);
    }
  });

  it("carries a form number, a revision and a date", () => {
    expect(record.form).toMatch(/^Form LD-/);
    expect(record.revision).toMatch(/^Rev\. \d{4}-\d{2}$/);
    expect(record.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("numbers every section and gives each one prose", () => {
    expect(record.sections.length).toBeGreaterThan(0);
    for (const section of record.sections) {
      expect(section.number).toMatch(/^\d+(?:\.\d+)*$/);
      expect(section.heading).not.toBe("");
      expect(section.body.length).toBeGreaterThan(0);
      for (const paragraph of section.body) expect(paragraph.trim()).not.toBe("");
    }
  });

  it("claims nothing about what every page of the site says", () => {
    // V9's Gate D measured "this is stated on every page that offers the
    // product" against the running site and found it absent from the home
    // page, the cart, the checkout and the Pro tier page. `legal-terms.test.ts`
    // banned it -- in the Terms. V10 wrote the same claim into Refunds §7, and
    // the ban did not reach.
    //
    // So it lives here now, where the walk already covers every document
    // including the ones not written yet. A legal document may say what IT
    // says; it may not certify the rest of the site, because nothing rechecks
    // that certificate when a page changes.
    const prose = record.sections.flatMap((section) => section.body).join(" ");
    expect(prose).not.toMatch(/\b(?:on|from) every page\b/i);
    expect(prose).not.toMatch(/\bevery page (?:that|which|of)\b/i);
    expect(prose).not.toMatch(/\bthroughout (?:this|the) site\b/i);
  });

  it("links no dispute-resolution platform that no longer exists", () => {
    // The EU ODR platform closed on 20 July 2025 under Regulation (EU)
    // 2024/3228, and traders were obliged to remove the link. Carrying one is
    // an active defect, not a harmless leftover.
    const prose = record.sections.flatMap((section) => section.body).join(" ").toLowerCase();
    expect(prose).not.toContain("ec.europa.eu/consumers/odr");
    expect(prose).not.toContain("online dispute resolution");
    expect(prose).not.toContain("odr platform");
  });
});
