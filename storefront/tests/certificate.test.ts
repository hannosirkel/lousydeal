/**
 * Holds the certificate to `docs/current/brand.md` §4 and to contract §5.
 *
 * The component is pure props, so this renders the real thing rather than
 * describing it — including the case §5 says matters most, which is the buyer
 * who left the inscription empty.
 */

import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Certificate } from "../src/components/document/Certificate";
import CertificateSpecimenPage from "../src/app/design/certificate/page";
import {
  CERTIFICATE_CLAUSE,
  CERTIFICATE_TITLE,
  NO_INSCRIPTION,
  SPECIMEN_NOTICE,
} from "../src/content/certificate";
import {
  CERTIFICATE_LAYOUT_V1,
  formatSerial,
  SPECIMEN_CERTIFICATE,
  type Certificate as CertificateRecord,
} from "../src/lib/certificate-model";
import { formatMoney } from "../src/lib/money";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

const ISSUED: CertificateRecord = {
  serial: 18421,
  inscription: "Jane Example",
  tier: "Lousy Deal Pro",
  amount: 25,
  currencyCode: "usd",
  issuedOn: "2026-09-05",
  layout: CERTIFICATE_LAYOUT_V1,
};

const render = (certificate: CertificateRecord, notice?: string) =>
  renderToStaticMarkup(createElement(Certificate, { certificate, notice }));

describe("the certificate", () => {
  const html = render(ISSUED);

  it("carries every fact brand.md gives it", () => {
    expect(html).toContain(CERTIFICATE_TITLE);
    expect(html).toContain("Jane Example");
    expect(html).toContain("Lousy Deal Pro");
    expect(html).toContain(formatMoney(25, "usd"));
    expect(html).toContain(formatSerial(18421));
    expect(html).toContain(CERTIFICATE_CLAUSE);
  });

  it("sets the serial as a grouped figure, not a padded one", () => {
    // s 5 forbids inflating the sequence to look busier; padding is the same
    // claim made typographically. Grouped through money.ts's own rule rather
    // than toLocaleString, so the amount beside it groups identically.
    expect(formatSerial(18421)).toBe("#18,421");
    expect(formatSerial(1)).toBe("#1");
    expect(formatSerial(0)).toBe("#0");
  });

  it("is double-ruled top and bottom and carries exactly one stamp", () => {
    expect(html.match(/class="double-rule"/g)).toHaveLength(2);
    expect(html.match(/class="stamp-mark"/g)).toHaveLength(1);
    expect(html).toContain('aria-label="Certified lousy deal"');
  });

  it("dates itself in a form that does not move with the reader", () => {
    // A shared screenshot outlives the runtime that rendered it; a locale
    // format would read differently for the person it was sent to.
    // HTML attribute names are case-insensitive; React's server renderer
    // emits the JSX spelling.
    expect(html).toMatch(/<time datetime="2026-09-05"/i);
    expect(html).toContain(">2026-09-05</time>");
  });

  it("takes the narrow measure, because it is read rather than scanned", () => {
    expect(css).toMatch(/\.certificate \{[^}]*max-width: var\(--measure-narrow\)/);
  });
});

describe("a certificate nobody inscribed", () => {
  // s 5: both fields are optional, most buyers leave them empty, and an empty
  // pair must render deliberately rather than as an unfinished document.
  const html = render({ ...ISSUED, inscription: null });

  it("names the bearer rather than leaving a blank", () => {
    expect(html).toContain(NO_INSCRIPTION);
    expect(html).not.toContain("Jane Example");
  });

  it("loses no row and no rule", () => {
    const inscribed = render(ISSUED);
    expect(html.match(/class="ledger-row"/g)).toHaveLength((inscribed.match(/class="ledger-row"/g) ?? []).length);
    expect(html.match(/class="double-rule"/g)).toHaveLength(2);
  });
});

describe("the specimen", () => {
  const html = renderToStaticMarkup(createElement(CertificateSpecimenPage));

  it("says on its face that it records nothing", () => {
    // AGENTS.md forbids publishing a fabricated transaction, and a
    // certificate is a record of one.
    expect(html).toContain(SPECIMEN_NOTICE);
    expect(html).toContain(formatSerial(0));
  });

  it("carries no inscription, which is the case worth designing for", () => {
    expect(SPECIMEN_CERTIFICATE.inscription).toBeNull();
    expect(html).toContain(NO_INSCRIPTION);
  });

  it("is stamped with the layout it was issued under", () => {
    // s 5: a redesign is additive. New deals get a new layout; every existing
    // deal still renders exactly as its holder first saw it.
    expect(SPECIMEN_CERTIFICATE.layout).toBe(CERTIFICATE_LAYOUT_V1);
  });
});
