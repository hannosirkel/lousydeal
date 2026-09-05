/**
 * The guard decision `004` makes mandatory: no placeholder reaches a rendered
 * legal page, configured or not.
 *
 * **It walks the directory rather than a list.** Three more documents arrive
 * with V9, V10 and V11, and a guard that names the files it checks is a guard
 * that silently stops covering the ones added after it. Every `*.ts` under
 * `src/content/legal/` except `types.ts` is a document and is checked.
 *
 * Each is resolved twice — with every field configured, and with none — because
 * the two failures are different. Configured, a typo like `{merchnatEmail}`
 * would print itself on a legal page. Unconfigured, a field that slipped past
 * the resolver would print a blank where a registration number belongs, and
 * `004`'s whole point is that a quiet blank reads as a complete notice that is
 * not one.
 */

import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LegalDocument } from "../src/components/document/LegalDocument";
import { LEGAL_INCOMPLETE_NOTICE, type LegalDocument as LegalDocumentRecord } from "../src/content/legal/types";
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
const documentFiles = readdirSync(legalDir).filter((name) => name.endsWith(".ts") && name !== "types.ts");

/** Every document the directory holds, loaded by walking it. */
const documents = await Promise.all(
  documentFiles.map(async (file) => {
    const module = (await import(`../src/content/legal/${file}`)) as Record<string, unknown>;
    const record = Object.values(module).find(
      (value): value is LegalDocumentRecord =>
        typeof value === "object" && value !== null && "sections" in value && "title" in value,
    );
    if (record === undefined) throw new Error(`${file} exports no legal document`);
    return { file, record };
  }),
);

describe("the legal directory", () => {
  it("holds at least one document, so the walk below is not vacuous", () => {
    // A directory guard that finds nothing passes for the wrong reason.
    expect(documents.length).toBeGreaterThan(0);
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
    // Named and visible, never dropped -- decision 004.
    expect(html).toMatch(/\[[A-Z ]+ NOT CONFIGURED\]/);
    expect(html).toContain(LEGAL_INCOMPLETE_NOTICE);
  });

  it("says it is incomplete only when it is", () => {
    expect(render(CONFIGURED)).not.toContain(LEGAL_INCOMPLETE_NOTICE);
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
