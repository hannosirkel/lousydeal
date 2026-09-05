/**
 * Holds `src/app/globals.css` to being the only place a colour, a type size or
 * a spacing value is written, and holds the three colours used as text to
 * WCAG AA.
 *
 * The contrast assertions are here rather than in a document because
 * `docs/current/brand.md` §3 publishes three ratios as measurements. A number
 * in prose drifts the first time somebody nudges a hex value by two digits to
 * make a screenshot look better; a number a suite computes from the file
 * cannot.
 */

import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const cssPath = fileURLToPath(new URL("../src/app/globals.css", import.meta.url));
const css = readFileSync(cssPath, "utf8");

/** The `:root` block, which is the one place a literal value may appear. */
const rootBlock = /:root\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";

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

/** Six-digit and three-digit hex, plus the functional colour notations. */
const COLOUR_LITERAL = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|color-mix)\s*\(/i;

function tokenValue(name: string): string {
  const match = new RegExp(`${name}:\\s*([^;]+);`).exec(rootBlock);
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

/** Order-independent: the caller need not know which of the two is lighter. */
function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

/** Every `.ts`, `.tsx` and `.css` file under `storefront/src`, recursively. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(?:tsx?|css)$/.test(entry.name) ? [path] : [];
  });
}

describe("design tokens", () => {
  it("declares each token exactly once, inside :root", () => {
    expect(rootBlock).not.toBe("");
    for (const token of TOKENS) {
      const inRoot = rootBlock.match(new RegExp(`^\\s*${token}:`, "gm")) ?? [];
      const anywhere = css.match(new RegExp(`^\\s*${token}:`, "gm")) ?? [];
      expect(inRoot, `${token} should be declared once in :root`).toHaveLength(1);
      expect(anywhere, `${token} should be declared nowhere else`).toHaveLength(1);
    }
  });

  it("writes no colour literal anywhere under src, outside :root", () => {
    const srcRoot = fileURLToPath(new URL("../src", import.meta.url));
    const offenders = sourceFiles(srcRoot)
      .map((path) => {
        const body = path === cssPath ? css.replace(rootBlock, "") : readFileSync(path, "utf8");
        const hit = COLOUR_LITERAL.exec(body);
        return hit === null ? null : `${path}: ${hit[0]}`;
      })
      .filter((hit): hit is string => hit !== null);
    expect(offenders).toEqual([]);
  });
});

describe("contrast against the paper", () => {
  const paper = tokenValue("--paper");

  // These three, and not the other two. --ink is body text, --stamp is a
  // figure and a button ground, --ink-soft is fine print; each is read, so
  // each is held to 4.5:1, the AA bound for normal-size text. --paper and
  // --paper-shade are grounds, never text, and are 1.09:1 against each other
  // by design -- there is no contrast bound that could hold them.
  it.each([
    ["--ink", 4.5],
    ["--stamp", 4.5],
    ["--ink-soft", 4.5],
  ])("%s clears AA as text on the paper", (token, minimum) => {
    expect(contrast(paper, tokenValue(token))).toBeGreaterThanOrEqual(minimum);
  });

  it("matches the three ratios the brand document publishes", () => {
    const round = (n: number) => Math.round(n * 10) / 10;
    expect(round(contrast(paper, tokenValue("--ink")))).toBe(17.6);
    expect(round(contrast(paper, tokenValue("--stamp")))).toBe(6.3);
    expect(round(contrast(paper, tokenValue("--ink-soft")))).toBe(5.1);
  });
});
