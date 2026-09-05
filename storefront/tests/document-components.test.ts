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

  // Measured in Chromium at a 390px viewport before this was fixed: a value
  // that could not shrink took its max-content width, ran 48px past the
  // viewport and gave the page horizontal scroll, while the label collapsed to
  // zero and rendered its text over the value. Both halves are asserted,
  // because either one alone leaves the row broken.
  it("lets a long value wrap instead of overflowing a narrow screen", () => {
    const value = /\.ledger-value\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(value).toContain("flex: 0 1 auto");
    expect(value).toContain("overflow-wrap: anywhere");
    expect(value).toContain("min-width: 0");

    const label = /\.ledger-label\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(label).toMatch(/min-width:\s*(?!0[;\s])/);
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

describe("focus", () => {
  it("is a 2px stamp outline, offset, and is never removed", () => {
    const block = /:focus-visible\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(block).toContain("outline: 2px solid var(--stamp)");
    expect(block).toContain("outline-offset: 2px");
    expect(css).not.toMatch(/outline:\s*(?:none|0)\b/);
  });
});

describe("Rule and DoubleRule", () => {
  it("are each one element, so one boundary is announced once", () => {
    expect(renderToStaticMarkup(createElement(Rule))).toBe("<hr/>");
    expect(renderToStaticMarkup(createElement(DoubleRule))).toBe('<hr class="double-rule"/>');
  });

  it("draws the double rule as two lines a gap apart", () => {
    const block = /\.double-rule\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(block).toContain("border-top");
    expect(block).toContain("border-bottom");
    expect(block).toContain("height: var(--rule-gap)");
    expect(block).toContain("border-top: var(--rule-width)");
    expect(block).toContain("border-bottom: var(--rule-width)");
    // content-box, or the declared gap would silently be the gap minus the
    // two borders under the global border-box.
    expect(block).toContain("box-sizing: content-box");
  });
});

describe("DocumentFrame", () => {
  const html = renderToStaticMarkup(
    createElement(DocumentFrame, {
      title: "Purchase order",
      form: "Form LD-1",
      revision: "Rev. 2026-09",
      children: createElement(FinePrint, { children: "Terms apply." }),
    }),
  );

  it("names its content once, with the heading rather than a second landmark", () => {
    expect(html).toContain('<section class="document">');
    expect(html).toContain('<h1 class="document-title">Purchase order</h1>');
    // A named <section> is a region landmark; one named the same as the <h1>
    // inside it has assistive tech announce the title twice.
    expect(html).not.toContain("aria-label");
  });

  it("writes its strings naturally and capitalises them in CSS", () => {
    expect(html).not.toContain("PURCHASE ORDER");
    expect(css).toMatch(/\.document-reference\s*\{[^}]*text-transform:\s*uppercase/);
    expect(css).toMatch(/^h1,\nh2,\nh3,\nh4 \{[^}]*text-transform:\s*uppercase/m);
  });

  it("carries a double rule at the top and at the bottom", () => {
    expect(html.match(/class="double-rule"/g)).toHaveLength(2);
    expect(html.indexOf("double-rule")).toBeLessThan(html.indexOf("document-header"));
    expect(html.lastIndexOf("double-rule")).toBeGreaterThan(html.indexOf("Terms apply."));
  });

  it("joins the form number and revision itself, so no caller can differ", () => {
    expect(html).toContain("Form LD-1 · Rev. 2026-09");
  });
});

describe("StampMark", () => {
  const html = renderToStaticMarkup(createElement(StampMark, { lines: ["Certified", "lousy deal"] }));

  it("has an accessible name rather than loose strings, and keeps it as words", () => {
    expect(html).toContain('role="img"');
    // Sentence case in the name: an aria-label of "CERTIFIED LOUSY DEAL" is
    // the shape screen readers spell out letter by letter, and this is the one
    // element brand.md requires to carry a name.
    expect(html).toContain('aria-label="Certified lousy deal"');
    expect(html).toContain("<title>Certified lousy deal</title>");
  });

  it("capitalises the stamped text in CSS, not in the caller's string", () => {
    expect(css).toMatch(/\.stamp-mark text\s*\{[^}]*text-transform:\s*uppercase/);
  });

  it("is a double ring", () => {
    expect(html.match(/<circle/g)).toHaveLength(2);
    expect(css).toMatch(/\.stamp-mark\s*\{[^}]*stroke-width:\s*1\.5/);
    expect(css).toMatch(/\.stamp-mark\s*\{[^}]*stroke:\s*var\(--stamp\)/);
    expect(css).toMatch(/\.stamp-mark\s*\{[^}]*width:\s*var\(--stamp-size\)/);
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

  it("is a stamp ground with paper text, on the one border this identity draws", () => {
    const primary = /\.button\.is-primary\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(primary).toContain("background: var(--stamp)");
    expect(primary).toContain("color: var(--paper)");
    const secondary = /\.button\.is-secondary\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(secondary).toContain("background: transparent");
    expect(secondary).toContain("color: var(--ink)");
    const base = /\.button\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(base).toContain("border: var(--rule-width) solid var(--ink)");
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
  it("is a paragraph in the fine-print style: fine step, italic, --ink-soft", () => {
    expect(renderToStaticMarkup(createElement(FinePrint, { children: "No refunds." }))).toBe(
      '<p class="fine-print">No refunds.</p>',
    );
    const block = /\.fine-print\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(block).toContain("font-size: var(--size-fine)");
    expect(block).toContain("font-style: italic");
    expect(block).toContain("color: var(--ink-soft)");
  });
});
