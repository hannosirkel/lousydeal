/**
 * Holds the certificate to `docs/current/brand.md` §4 and to contract §5.
 *
 * **The copy is pinned to the brand document, not to itself.** An earlier
 * version asserted `expect(html).toContain(CERTIFICATE_TITLE)` and its
 * siblings, which say only that the component rendered whatever the content
 * file happens to hold — and `toContain("")` is true of everything. Gate D
 * emptied `NO_INSCRIPTION` and `SPECIMEN_NOTICE`, retitled the document and
 * put an exclamation mark in the clause, and all 325 tests passed.
 *
 * `brand.md` §4 fixes these strings verbatim, so the assertions read them from
 * there.
 */

import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Certificate } from "../src/components/document/Certificate";
import CertificateSpecimenPage, { metadata } from "../src/app/design/certificate/page";
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

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
/**
 * Wrapped at 80 columns and quoted, so compare against it with the blockquote
 * markers dropped and runs of space collapsed.
 */
const brand = readFileSync(new URL("../../docs/current/brand.md", import.meta.url), "utf8")
  .replace(/^> ?/gm, "")
  .replace(/\s+/g, " ");

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

  it("is titled and closed as the brand document says, word for word", () => {
    // Read from brand.md rather than from the constant the component renders,
    // so rewording the constant fails here instead of passing silently.
    expect(brand).toContain("CERTIFICATE OF LOUSY JUDGMENT");
    expect(CERTIFICATE_TITLE.toUpperCase()).toBe("CERTIFICATE OF LOUSY JUDGMENT");
    expect(html).toContain(CERTIFICATE_TITLE);

    expect(brand).toContain(CERTIFICATE_CLAUSE);
    expect(CERTIFICATE_CLAUSE).toBe(
      "This certificate confers no rights, value, or benefits of any kind, and the bearer knew that.",
    );
    expect(html).toContain(CERTIFICATE_CLAUSE);
  });

  it("says nothing in a register the brand forbids", () => {
    for (const line of [CERTIFICATE_TITLE, CERTIFICATE_CLAUSE, NO_INSCRIPTION, SPECIMEN_NOTICE]) {
      expect(line).not.toBe("");
      expect(line).not.toContain("!");
    }
  });

  it("carries every fact brand.md gives it", () => {
    expect(html).toContain("Jane Example");
    expect(html).toContain("Lousy Deal Pro");
    expect(html).toContain("$25.00");
    expect(html).toContain("#18,421");
  });

  it("sets the serial as a grouped figure, not a padded one", () => {
    // Grouped through money.ts's own rule rather than toLocaleString, so the
    // amount beside it groups identically.
    expect(formatSerial(18421)).toBe("#18,421");
    expect(formatSerial(1)).toBe("#1");
    expect(formatSerial(0)).toBe("#0");
  });

  it("refuses a serial a count cannot be", () => {
    // The one field where an unconstrained `number` would set nonsense on the
    // face of a document whose purpose is being believed.
    expect(() => formatSerial(-42)).toThrow(/whole count/);
    expect(() => formatSerial(12.5)).toThrow(/whole count/);
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
  // §5: both fields are optional, most buyers leave them empty, and an empty
  // pair must render deliberately rather than as an unfinished document.
  const html = render({ ...ISSUED, inscription: null });

  it("names the bearer rather than leaving a blank", () => {
    expect(NO_INSCRIPTION).toBe("The bearer");
    expect(html).toContain("<dd class=\"ledger-value\">The bearer</dd>");
    expect(html).not.toContain("Jane Example");
  });

  it("treats an empty string, whitespace and null alike", () => {
    // `??` catches only null, and `""` is what an untouched text input sends.
    // Measured before the fix: the bearer cell rendered 0px wide with its
    // leader running to the edge, at four fifths the height of its neighbours.
    for (const empty of ["", "   ", "\t\n"]) {
      expect(render({ ...ISSUED, inscription: empty })).toContain(
        "<dd class=\"ledger-value\">The bearer</dd>",
      );
    }
  });

  it("loses no row and no rule", () => {
    const inscribed = render(ISSUED);
    expect(html.match(/class="ledger-row"/g)).toHaveLength((inscribed.match(/class="ledger-row"/g) ?? []).length);
    expect(html.match(/class="double-rule"/g)).toHaveLength(2);
  });
});

describe("what an inscription may say", () => {
  // §5 requires markup, URLs, bare domains, emails and phone numbers stripped
  // "at entry and again at render". This is the render.
  const bearerOf = (inscription: string) =>
    /<dd class="ledger-value">([^<]*)<\/dd>/.exec(render({ ...ISSUED, inscription }))?.[1] ?? "";

  it("keeps an ordinary inscription", () => {
    expect(bearerOf("Jane Example")).toBe("Jane Example");
    expect(bearerOf("worth every cent, regrettably")).toBe("worth every cent, regrettably");
  });

  it.each([
    ["https://evil.example.com/free-money", "a link"],
    ["www.evil.test", "a bare host"],
    ["evil.example.com/pay", "a bare domain"],
    ["me@evil.test", "an email address"],
    ["+372 5555 5555", "a phone number"],
  ])("strips %s, which would make this a billboard", (inscription) => {
    // Not moderation -- §5 calls this a mechanical filter against the public
    // page becoming a free billboard or a phishing surface.
    expect(bearerOf(inscription)).toBe("The bearer");
  });

  it("removes markup rather than relying on it being escaped", () => {
    expect(bearerOf("<script>alert(1)</script>")).toBe("The bearer");
    expect(bearerOf("Jane <b>Example</b>")).toBe("Jane Example");
  });

  it("takes the offending part and keeps the rest", () => {
    expect(bearerOf("Jane, at jane@evil.test")).toBe("Jane, at");
  });

  // §7 of the Terms tells a buyer that markup, links, domains, addresses and
  // telephone numbers are removed. It does not say their arithmetic is, and
  // Gate D measured all three of these being eaten.
  it.each([
    ["Worth every cent, regrettably.Bought anyway", "a missing space after a full stop"],
    ["I paid 25 dollars for 1 000 000 nothings", "a space-grouped quantity"],
    ["Bought on 2026-09-05 at 14:32:10", "a date and a time"],
  ])("keeps %s", (inscription) => {
    expect(bearerOf(inscription)).toBe(inscription);
  });
});

describe("the specimen", () => {
  const html = renderToStaticMarkup(createElement(CertificateSpecimenPage));

  it("says on its face that it records nothing", () => {
    // `AGENTS.md` forbids publishing a fabricated transaction total, and a
    // certificate carries one.
    expect(SPECIMEN_NOTICE).toBe("Specimen. No deal bears this number.");
    expect(brand).toContain(SPECIMEN_NOTICE);
    expect(html).toContain(SPECIMEN_NOTICE);
    expect(html).toContain("#0");
  });

  it("carries no inscription, which is the case worth designing for", () => {
    expect(SPECIMEN_CERTIFICATE.inscription).toBeNull();
    expect(html).toContain(NO_INSCRIPTION);
  });

  it("is kept out of a search index, which Access will not always do", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
