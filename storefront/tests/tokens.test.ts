/**
 * Holds `src/app/globals.css` to being the only place a colour, a type size or
 * a spacing value is written, and holds the five colours to WCAG AA.
 *
 * The contrast assertions are here rather than in a document because
 * `docs/current/brand.md` §3 publishes three ratios as measurements. A number
 * in prose drifts the first time somebody nudges a hex value by two digits to
 * make a screenshot look better; a number a suite computes from the file
 * cannot.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

/** The `:root` block, which is the one place a literal value may appear. */
const rootBlock = /:root\s*\{([\s\S]*?)\n\}/.exec(css)?.[1];

/**
 * Every token the brand document declares, enumerated here so "every token" is
 * a set a reader can check rather than a quantifier over something unstated.
 */
const TOKENS = [
  "--paper",
  "--paper-shade",
  "--ink",
  "--ink-soft",
  "--stamp",
  "--size-fine",
  "--size-small",
  "--size-body",
  "--size-section",
  "--size-title",
  "--size-display",
  "--leading-body",
  "--leading-heading",
  "--tracking-label",
  "--space-1",
  "--space-2",
  "--space-3",
  "--space-4",
  "--space-5",
  "--space-6",
  "--space-7",
  "--space-8",
  "--measure-document",
  "--measure-narrow",
  "--rule-width",
  "--rule-gap",
  "--transition",
] as const;

function tokenValue(name: string): string {
  const match = new RegExp(`${name}:\\s*([^;]+);`).exec(rootBlock ?? "");
  if (match?.[1] === undefined) throw new Error(`token ${name} is not declared in :root`);
  return match[1].trim();
}

/** WCAG 2.1 relative luminance, from a `#rrggbb` literal. */
function luminance(hex: string): number {
  const parsed = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (parsed === null) throw new Error(`not a six-digit hex colour: ${hex}`);
  const [r, g, b] = parsed.slice(1, 4).map((pair) => {
    const channel = parseInt(pair, 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

describe("design tokens", () => {
  it("declares each token exactly once in :root", () => {
    expect(rootBlock).toBeDefined();
    for (const token of TOKENS) {
      const declarations = css.match(new RegExp(`^\\s*${token}:`, "gm")) ?? [];
      expect(declarations, `${token} should be declared once`).toHaveLength(1);
    }
  });

  it("writes no colour literal outside :root", () => {
    const outsideRoot = css.replace(rootBlock ?? "", "");
    // Six-digit and three-digit hex, plus the functional notations. A named
    // colour would pass this and is caught by review, not here: `white` and
    // `currentcolor` are not distinguishable from a property name by a regex
    // over a stylesheet, and a false positive in a guard is how a guard gets
    // deleted.
    expect(outsideRoot).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(outsideRoot).not.toMatch(/\b(?:rgba?|hsla?|oklch|color-mix)\s*\(/i);
  });
});

describe("contrast against the paper", () => {
  const paper = tokenValue("--paper");

  // 4.5:1 is AA for normal-size text. Every one of these three is used as
  // text somewhere -- --ink as body, --stamp as a figure and a button ground,
  // --ink-soft as fine print -- so none of them may be held only to the 3:1
  // large-text or non-text bound.
  it.each([
    ["--ink", 4.5],
    ["--stamp", 4.5],
    ["--ink-soft", 4.5],
  ])("%s clears AA", (token, minimum) => {
    expect(contrast(paper, tokenValue(token))).toBeGreaterThanOrEqual(minimum);
  });

  it("keeps paper legible on the primary button's stamp ground", () => {
    expect(contrast(tokenValue("--stamp"), paper)).toBeGreaterThanOrEqual(4.5);
  });

  it("matches the three ratios the brand document publishes", () => {
    const round = (n: number) => Math.round(n * 10) / 10;
    expect(round(contrast(paper, tokenValue("--ink")))).toBe(17.6);
    expect(round(contrast(paper, tokenValue("--stamp")))).toBe(6.3);
    expect(round(contrast(paper, tokenValue("--ink-soft")))).toBe(5.1);
  });
});
