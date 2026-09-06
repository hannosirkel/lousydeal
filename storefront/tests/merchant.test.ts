/**
 * Holds the resolver and the chrome to decision `004`'s rule: a configured
 * value substitutes, and an unconfigured one becomes a named visible gap
 * rather than a placeholder string, a blank, or a fabrication.
 *
 * Components are rendered with `renderToStaticMarkup`. The storefront Vitest
 * project runs in `environment: node` with no jsdom, and adding one to assert
 * on strings this short would be a dependency bought for nothing.
 */

import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Footer } from "../src/components/document/Footer";
import { Masthead } from "../src/components/document/Masthead";
import { MASTHEAD_LINE, MASTHEAD_MARK } from "../src/content/chrome";
import { hasGap, MERCHANT_PLACEHOLDERS, resolveText, type MerchantIdentity } from "../src/content/merchant";

const CONFIGURED: MerchantIdentity = {
  legalName: "Example Trader OÜ",
  address: "Example tn 1, 10000 Tallinn, Estonia",
  email: "trader@example.test",
  registryCode: "10000000",
  vatNumber: "EE100000000",
  phoneNumber: "+372 00 00000",
};

const UNCONFIGURED: MerchantIdentity = {
  legalName: null,
  address: null,
  email: null,
  registryCode: null,
  vatNumber: null,
  phoneNumber: null,
};

const text = (template: string, identity: MerchantIdentity) =>
  resolveText(template, identity)
    .map((part) => (part.kind === "text" ? part.text : `[${part.label}]`))
    .join("");

describe("resolveText", () => {
  it("substitutes a configured value", () => {
    expect(text("Operated by {merchantLegalName}.", CONFIGURED)).toBe("Operated by Example Trader OÜ.");
  });

  it("turns an unconfigured value into a named gap, not a blank", () => {
    const parts = resolveText("VAT {merchantVatNumber}.", UNCONFIGURED);
    expect(parts).toContainEqual({ kind: "gap", label: "VAT NUMBER" });
    expect(hasGap(parts)).toBe(true);
  });

  it("resolves every placeholder the vocabulary declares", () => {
    // Derived from the vocabulary rather than listed, so "every" stays true
    // when the vocabulary grows.
    const tokens = Object.keys(MERCHANT_PLACEHOLDERS).map((key) => `{${key}}`);
    expect(text(tokens.join(" "), CONFIGURED)).toBe(
      "Example Trader OÜ Example tn 1, 10000 Tallinn, Estonia trader@example.test 10000000 EE100000000 +372 00 00000",
    );
    expect(text(tokens.join(" "), UNCONFIGURED)).toBe(
      Object.values(MERCHANT_PLACEHOLDERS)
        .map((entry) => `[${entry.label}]`)
        .join(" "),
    );
  });

  // Each of these reached the page as literal text before the guard was
  // widened from `[A-Za-z]+` to anything brace-delimited. The first three are
  // the exact token shapes `docs/working/lousyvisual.md` §3 asked for, so they
  // are the shapes a content author is most likely to type; the last inherits
  // from Object.prototype and produced a part with no `text` at all, which the
  // ResolvedPart type says cannot exist.
  it.each([
    "{REG_CODE}",
    "{COMPANY_LEGAL_NAME}",
    "{VAT_NO}",
    "{merchant_registry_code}",
    "{merchantVatNumber2}",
    "{toString}",
    "{constructor}",
    "{}",
  ])("refuses %s, which no field backs", (token) => {
    expect(() => resolveText(`Reg ${token}.`, CONFIGURED)).toThrow(/unknown placeholder/);
  });

  it("tolerates whitespace inside a token rather than emitting it", () => {
    expect(text("Reg { merchantRegistryCode }.", CONFIGURED)).toBe("Reg 10000000.");
  });

  it("never emits a part whose text is undefined", () => {
    for (const parts of [resolveText("{merchantLegalName} x", CONFIGURED), resolveText("{merchantLegalName} x", UNCONFIGURED)]) {
      for (const part of parts) {
        if (part.kind === "text") expect(typeof part.text).toBe("string");
        else expect(typeof part.label).toBe("string");
      }
    }
  });
});

describe("Masthead", () => {
  it("says what the brand document says", () => {
    // Constraint 12: `brand.md` is the authority for these two strings, so the
    // test reads it rather than restating them.
    const brand = readFileSync(new URL("../../docs/current/brand.md", import.meta.url), "utf8");
    expect(brand).toContain(MASTHEAD_MARK);
    expect(brand.toUpperCase()).toContain(MASTHEAD_LINE.toUpperCase());

    const html = renderToStaticMarkup(Masthead());
    expect(html).toContain(MASTHEAD_MARK);
    expect(html).toContain(MASTHEAD_LINE);
    // Sentence case in the markup, capitals done by `text-transform`, so a
    // screen reader and a copy-paste both get words rather than letters.
    expect(html).not.toContain(MASTHEAD_LINE.toUpperCase());
  });
});

describe("Footer", () => {
  it("renders the trader line and the contact address when configured", () => {
    const html = renderToStaticMarkup(Footer({ merchant: CONFIGURED }));
    expect(html).toContain("Example Trader OÜ");
    expect(html).toContain("Example tn 1, 10000 Tallinn, Estonia");
    expect(html).toContain('href="mailto:trader@example.test"');
    expect(html).not.toContain("incomplete");
  });

  it("names each gap and says the notice is incomplete when it is", () => {
    const html = renderToStaticMarkup(Footer({ merchant: UNCONFIGURED }));
    for (const key of ["merchantLegalName", "merchantAddress", "merchantEmail"] as const) {
      expect(html).toContain(`[${MERCHANT_PLACEHOLDERS[key].label} NOT CONFIGURED]`);
    }
    expect(html).toContain("This notice is incomplete");
    expect(html).not.toContain("mailto:");
  });

  it("carries neither registry code nor VAT number, which belong to the imprint", () => {
    const html = renderToStaticMarkup(Footer({ merchant: CONFIGURED }));
    expect(html).not.toContain("10000000");
    expect(html).not.toContain("EE100000000");
  });
});
