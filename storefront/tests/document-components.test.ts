/**
 * Holds the six document motifs to what `docs/current/brand.md` §3 says they
 * are.
 *
 * The assertions are about **semantics, not class names**: which element is
 * emitted, what a screen reader is given, whether the leader is drawn rather
 * than typed. A test that checked `className="ledger-row"` would pass on
 * markup that had stopped being a definition list, which is the one property
 * of this component that matters to a reader who cannot see the dots.
 *
 * `renderToStaticMarkup` rather than a DOM library: the storefront Vitest
 * project is `environment: node`, and jsdom would be a dependency bought to
 * assert on strings this short.
 */

import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Button } from "../src/components/document/Button";
import { DocumentFrame } from "../src/components/document/DocumentFrame";
import { FinePrint } from "../src/components/document/FinePrint";
import { Ledger, LedgerRow } from "../src/components/document/LedgerRow";
import { DoubleRule, Rule } from "../src/components/document/Rule";
import { StampMark } from "../src/components/document/StampMark";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

describe("LedgerRow", () => {
  const html = renderToStaticMarkup(
    createElement(Ledger, {
      children: createElement(LedgerRow, { label: "PRICE", value: "$5.00" }),
    }),
  );

  it("is a definition list, not a table and not divs", () => {
    expect(html).toMatch(/^<dl\b/);
    expect(html).toContain("<dt");
    expect(html).toContain("<dd");
    expect(html).not.toContain("<table");
  });

  it("reads as label then value, with nothing between them", () => {
    const spoken = html.replace(/<[^>]+>/g, "");
    expect(spoken).toBe("PRICE$5.00");
    // The leader is a border on a pseudo-element. If it were ever typed as
    // characters, they would land in `spoken` above and be read aloud.
    expect(spoken).not.toContain(".".repeat(3));
  });

  it("draws the leader in CSS rather than emitting it", () => {
    expect(css).toMatch(/\.ledger-label::after\s*\{[^}]*border-bottom:[^;]*dotted/);
    expect(css).toMatch(/\.ledger-label::after\s*\{[^}]*content:\s*""/);
  });

  it("marks a bad-news figure with the accent rather than a word", () => {
    const stamped = renderToStaticMarkup(
      createElement(Ledger, {
        children: createElement(LedgerRow, { label: "RETURN", value: "-100%", tone: "stamp" }),
      }),
    );
    expect(stamped).toContain("is-stamp");
    expect(css).toMatch(/\.ledger-value\.is-stamp\s*\{[^}]*color:\s*var\(--stamp\)/);
    // The value still reads as itself; the colour adds nothing spoken.
    expect(stamped.replace(/<[^>]+>/g, "")).toBe("RETURN-100%");
  });

  it("offers the display step for the one figure a page may shout", () => {
    const big = renderToStaticMarkup(
      createElement(Ledger, {
        children: createElement(LedgerRow, { label: "DEAL", value: "#0000", scale: "display" }),
      }),
    );
    expect(big).toContain("is-display");
    expect(css).toMatch(/\.ledger-value\.is-display\s*\{[^}]*font-size:\s*var\(--size-display\)/);
  });
});

describe("Rule and DoubleRule", () => {
  it("are each one element, so one boundary is announced once", () => {
    expect(renderToStaticMarkup(createElement(Rule))).toBe('<hr class="rule"/>');
    expect(renderToStaticMarkup(createElement(DoubleRule))).toBe('<hr class="double-rule"/>');
  });

  it("draws the double rule as two lines a gap apart", () => {
    const block = /\.double-rule\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(block).toContain("border-top");
    expect(block).toContain("border-bottom");
    expect(block).toContain("height: var(--rule-gap)");
    // content-box, or the declared gap would silently be the gap minus the
    // two borders under the global border-box.
    expect(block).toContain("box-sizing: content-box");
  });
});

describe("DocumentFrame", () => {
  const html = renderToStaticMarkup(
    createElement(DocumentFrame, {
      title: "PURCHASE ORDER",
      form: "FORM LD-1",
      revision: "REV. 2026-09",
      children: createElement(FinePrint, { children: "Terms apply." }),
    }),
  );

  it("is a labelled section with the title as its heading", () => {
    expect(html).toContain('<section class="document" aria-label="PURCHASE ORDER">');
    expect(html).toContain('<h1 class="document-title">PURCHASE ORDER</h1>');
  });

  it("carries a double rule at the top and at the bottom", () => {
    expect(html.match(/class="double-rule"/g)).toHaveLength(2);
    expect(html.indexOf("double-rule")).toBeLessThan(html.indexOf("document-header"));
    expect(html.lastIndexOf("double-rule")).toBeGreaterThan(html.indexOf("Terms apply."));
  });

  it("joins the form number and revision itself, so no caller can differ", () => {
    expect(html).toContain("FORM LD-1 · REV. 2026-09");
  });
});

describe("StampMark", () => {
  const html = renderToStaticMarkup(createElement(StampMark, { lines: ["CERTIFIED", "LOUSY DEAL"] }));

  it("has an accessible name rather than loose strings", () => {
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="CERTIFIED LOUSY DEAL"');
    expect(html).toContain("<title>CERTIFIED LOUSY DEAL</title>");
  });

  it("is a double ring", () => {
    expect(html.match(/<circle/g)).toHaveLength(2);
    expect(css).toMatch(/\.stamp-mark\s*\{[^}]*stroke-width:\s*1\.5/);
    expect(css).toMatch(/\.stamp-mark\s*\{[^}]*stroke:\s*var\(--stamp\)/);
  });

  it("centres its lines on the circle rather than hanging them below it", () => {
    const ys = [...html.matchAll(/<text[^>]*y="([\d.]+)"/g)].map((match) => Number(match[1]));
    expect(ys).toHaveLength(2);
    const [first, second] = ys as [number, number];
    expect((first + second) / 2).toBe(60);
  });

  it("refuses to render an empty stamp", () => {
    expect(() => renderToStaticMarkup(createElement(StampMark, { lines: [] }))).toThrow(/at least one line/);
  });
});

describe("Button", () => {
  it("is a button when it acts and a link when it navigates", () => {
    expect(renderToStaticMarkup(createElement(Button, { children: "ACQUIRE FOR $5.00" }))).toContain(
      '<button class="button is-primary" type="submit">',
    );
    expect(renderToStaticMarkup(createElement(Button, { href: "/cart", children: "CART" }))).toContain(
      '<a class="button is-primary" href="/cart">',
    );
  });

  it("inverts ground and text on hover, and does nothing else", () => {
    expect(css).toMatch(/\.button\.is-primary:hover\s*\{[^}]*background:\s*var\(--paper\)/);
    expect(css).toMatch(/\.button\.is-secondary:hover\s*\{[^}]*background:\s*var\(--ink\)/);
    const base = /\.button\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    // The `transform` property specifically, not the substring: `text-transform:
    // uppercase` is in this block and is required by brand.md §3.
    expect(base).not.toMatch(/(?:^|[;{]\s*)transform:/);
    expect(base).not.toContain("box-shadow");
    // brand.md §3: no transition longer than 120ms, and only on colour.
    expect(base).toMatch(/transition:\s*[^;]*background-color var\(--transition\)/);
    expect(base).toMatch(/transition:\s*[^;]*color var\(--transition\)/);
  });
});

describe("FinePrint", () => {
  it("is a paragraph in the fine-print style", () => {
    expect(renderToStaticMarkup(createElement(FinePrint, { children: "No refunds." }))).toBe(
      '<p class="fine-print">No refunds.</p>',
    );
    expect(css).toMatch(/\.fine-print\s*\{[^}]*font-size:\s*var\(--size-fine\)/);
    expect(css).toMatch(/\.fine-print\s*\{[^}]*font-style:\s*italic/);
  });
});
