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
import { INSCRIPTION_LIMITS, sanitiseInscription } from "../src/lib/inscription";
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
  displayName: "Jane Example",
  dedication: "worth every cent, regrettably",
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
  const html = render({ ...ISSUED, displayName: null, dedication: null });

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
      expect(render({ ...ISSUED, displayName: empty })).toContain(
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

/**
 * C5a. §5 gives the buyer two fields, not one, and they behave differently:
 * the name is a ledger row that always holds its place, the dedication is a
 * quotation that disappears when there is nothing to quote.
 */
describe("the dedication", () => {
  const quoted = (certificate: CertificateRecord) =>
    /<blockquote class="certificate-dedication">(.*?)<\/blockquote>/.exec(render(certificate))?.[1];

  it("is set as a quotation between the ledger and the stamp", () => {
    const html = render(ISSUED);
    expect(html).toContain("worth every cent, regrettably");
    expect(html.indexOf("certificate-dedication")).toBeGreaterThan(html.indexOf("</dl>"));
    expect(html.indexOf("certificate-dedication")).toBeLessThan(html.indexOf("stamp-mark"));
  });

  it("is the one element that disappears when empty, rather than holding its place", () => {
    // Every ledger row keeps its place -- a missing row is a document with
    // something wrong with it. An empty quotation is not a deliberate blank;
    // it is a pair of quotation marks around nothing.
    for (const empty of [null, "", "   ", "https://evil.example.com"]) {
      expect(render({ ...ISSUED, dedication: empty }), String(empty)).not.toContain("certificate-dedication");
    }
  });

  it("is blanked without touching the name, and the name without touching it", () => {
    // §5 requires an operator to be able to blank *either* field later. One
    // stored string would make blanking one a rewrite of the other.
    expect(render({ ...ISSUED, dedication: null })).toContain("Jane Example");
    expect(quoted({ ...ISSUED, displayName: null })).toContain("worth every cent, regrettably");
    expect(render({ ...ISSUED, displayName: null })).toContain("The bearer");
  });

  it("is filtered on its own, not only alongside the name", () => {
    // The filter runs per field. A dedication that is entirely a URL leaves
    // nothing, and the element goes with it -- while the bearer row is
    // untouched.
    const html = render({ ...ISSUED, dedication: "buy at evil.example.com/pay" });
    expect(html).not.toContain("evil.example.com");
    expect(html).toContain("Jane Example");
  });

  it("draws its quotation marks in the stylesheet, not in the text", () => {
    // A buyer who uses a quote character must not end up nested inside the
    // document's own; and `q` would add locale-dependent marks, which a
    // document made to be screenshotted and sent on must not do -- the same
    // reason `brand.md` §4 gives for the ISO date.
    expect(quoted(ISSUED)).not.toContain("\u201C");
    expect(css).toMatch(/\.certificate-dedication p::before \{[^}]*content: "\\201C"/);
    expect(css).toMatch(/\.certificate-dedication p::after \{[^}]*content: "\\201D"/);
  });

  it("is the only italic on the document, which is what marks it as quoted", () => {
    expect(css).toMatch(/\.certificate-dedication \{[^}]*font-style: italic/);
    expect(brand).toContain("the only italic the certificate uses");
  });
});

describe("what an inscription may say", () => {
  // §5 requires markup, URLs, bare domains, emails and phone numbers stripped
  // "at entry and again at render". This is the render.
  const bearerOf = (displayName: string) =>
    /<dd class="ledger-value">([^<]*)<\/dd>/.exec(render({ ...ISSUED, displayName }))?.[1] ?? "";

  it("keeps an ordinary inscription", () => {
    expect(bearerOf("Jane Example")).toBe("Jane Example");
    expect(bearerOf("worth every cent, regrettably")).toBe("worth every cent, regrettably");
  });

  it("removes markup rather than relying on it being escaped", () => {
    expect(bearerOf("<script>alert(1)</script>")).toBe("The bearer");
    expect(bearerOf("Jane <b>Example</b>")).toBe("Jane Example");
  });

  it("takes the offending part and keeps the rest", () => {
    expect(bearerOf("Jane, at jane@evil.test")).toBe("Jane, at");
  });

  // The exhaustive rule-by-rule cases moved to
  // `tests/fixtures/inscription-cases.json` in C3c, which the block below runs
  // against this copy of the filter and `backend/tests/inscription-filter.test.ts`
  // runs against the other. What stays here is the render: that a filtered-away
  // inscription reaches the certificate's no-inscription state rather than a
  // blank row, which is a fact about this component and not about the filter.
});

/**
 * C3c. The specification both copies of §5's filter answer to.
 *
 * §5 asks for a pass "at entry and again at render" and this project runs them
 * in different runtimes: the entry pass is
 * `backend/src/modules/deal/inscription.ts`, because the endpoint carrying an
 * inscription is public, and the render pass is the one imported here. There is
 * no package shared between the two workspaces, so the fixture is where the
 * rules are agreed and `backend/tests/inscription-filter.test.ts` additionally
 * compares the two files character for character.
 */
describe("the shared §5 filter, as the fixture specifies it", () => {
  const spec = JSON.parse(
    readFileSync(new URL("../../tests/fixtures/inscription-cases.json", import.meta.url), "utf8"),
  ) as {
    limits: { displayName: number; dedication: number };
    cases: { why: string; input: string; expected: string | null }[];
  };

  it.each(spec.cases.map((one) => [one.why, one.input, one.expected] as const))("%s", (_why, input, expected) => {
    expect(sanitiseInscription(input)).toBe(expected);
  });

  it("agrees with the checkout's own limits", () => {
    expect(INSCRIPTION_LIMITS.displayName).toBe(spec.limits.displayName);
    expect(INSCRIPTION_LIMITS.dedication).toBe(spec.limits.dedication);
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
    expect(SPECIMEN_CERTIFICATE.displayName).toBeNull();
    expect(SPECIMEN_CERTIFICATE.dedication).toBeNull();
    expect(html).toContain(NO_INSCRIPTION);
  });

  it("is kept out of a search index, which Access will not always do", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
