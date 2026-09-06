/**
 * §5's inscription filter, and the guarantee that both copies of it agree.
 *
 * Two things are asserted here and they catch different failures. The fixture
 * says what the rules must *do*, and would still pass if one copy silently
 * gained a rule the other lacks but no case exercises. The character
 * comparison says the two copies *are* the same text, and catches exactly
 * that.
 *
 * The storefront runs the same fixture against its own copy in
 * `storefront/tests/certificate.test.ts`. This file is the one that reads both
 * source files, because the backend's copy is the one a drift would leave
 * behind — it is the pass that decides what gets stored, and the only one C9's
 * email will go through.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  DEAL_INSCRIPTION_LIMITS,
  DEAL_INSCRIPTION_METADATA,
  readInscription,
  sanitiseInscription,
} from "../src/modules/deal/inscription";

const repositoryRoot = join(__dirname, "..", "..");

interface InscriptionSpec {
  readonly limits: { readonly displayName: number; readonly dedication: number };
  readonly cases: readonly { readonly why: string; readonly input: string; readonly expected: string | null }[];
}

const spec = JSON.parse(
  readFileSync(join(repositoryRoot, "tests", "fixtures", "inscription-cases.json"), "utf8"),
) as InscriptionSpec;

/** The text between the sentinels, which is what the two files must share. */
function sharedRegion(path: string): string {
  const source = readFileSync(join(repositoryRoot, path), "utf8");
  const start = source.indexOf("// >>> shared inscription filter");
  const end = source.indexOf("// <<< shared inscription filter");
  if (start === -1 || end === -1) throw new Error(`${path} has no shared-filter sentinels`);
  return source.slice(start, end);
}

describe("the shared §5 filter", () => {
  it.each(spec.cases.map((one) => [one.why, one.input, one.expected] as const))(
    "%s",
    (_why, input, expected) => {
      expect(sanitiseInscription(input)).toBe(expected);
    },
  );

  it("is the same text in both workspaces, character for character", () => {
    // The fixture alone cannot catch a rule added to one copy and not the
    // other, because a rule no case exercises changes no case's answer.
    expect(sharedRegion("backend/src/modules/deal/inscription.ts")).toBe(
      sharedRegion("storefront/src/lib/inscription.ts"),
    );
  });

  it("covers every rule the shared region declares", () => {
    // Guards the fixture rather than the filter: a rule with no case is a rule
    // the character comparison protects and nothing describes. Each named
    // pattern must appear in at least one case's stated reason.
    const region = sharedRegion("backend/src/modules/deal/inscription.ts");
    const declared = [...region.matchAll(/^const ([A-Z_]+) = /gm)]
      .map((match) => match[1])
      .filter((name): name is string => name !== undefined);
    expect(declared.length).toBeGreaterThan(0);

    // Every case's `why`, joined -- the fixture's own account of what it tests.
    const described = spec.cases.map((one) => one.why).join(" ").toLowerCase();
    const forRule: Record<string, RegExp> = {
      EXECUTABLE: /script element|style element/,
      MARKUP: /markup|unclosed tag/,
      URLS: /\ba link\b|bare host/,
      BARE_DOMAIN: /bare domain|full stop/,
      EMAIL: /email address/,
      PHONE_CANDIDATE: /telephone number/,
      ISO_DATE: /iso date/,
    };
    for (const rule of declared) {
      const expectation = forRule[rule];
      expect(expectation, `no fixture case describes ${rule}`).toBeDefined();
      expect(described, rule).toMatch(expectation as RegExp);
    }
  });
});

describe("reading an inscription off an order, now that it is filtered", () => {
  const read = (displayName: unknown, dedication: unknown) =>
    readInscription({
      [DEAL_INSCRIPTION_METADATA.displayName]: displayName,
      [DEAL_INSCRIPTION_METADATA.dedication]: dedication,
    });

  it("filters what a visitor put on their own cart, not merely what the form sent", () => {
    // `POST /store/carts/:id` is public and takes any metadata
    // (`carts/validators.js:11`), so this is the boundary. Before C3c the
    // stored value was whatever arrived.
    expect(read("<script>alert(1)</script>", "buy at evil.example.com/pay")).toEqual({
      displayName: null,
      dedication: "buy at",
    });
  });

  it("counts the limit after filtering, not before", () => {
    // §5's 120 is a limit on what appears on the certificate. Counting before
    // would let a buyer spend the allowance on text that was going to be
    // removed anyway, and arrive with a dedication shorter than the one they
    // were shown.
    const padding = "x".repeat(DEAL_INSCRIPTION_LIMITS.dedication);
    const { dedication } = read(null, `https://evil.example.com/${padding} ${padding}`);

    expect(dedication).toBe("x".repeat(DEAL_INSCRIPTION_LIMITS.dedication));
  });

  it("takes its limits from the same fixture the storefront's field does", () => {
    // Two numbers in two workspaces. The fixture is where they are decided.
    expect(DEAL_INSCRIPTION_LIMITS.displayName).toBe(spec.limits.displayName);
    expect(DEAL_INSCRIPTION_LIMITS.dedication).toBe(spec.limits.dedication);
  });

  it("still treats the empty pair as ordinary, and non-strings as absent", () => {
    expect(read(null, null)).toEqual({ displayName: null, dedication: null });
    expect(read(42, ["x"])).toEqual({ displayName: null, dedication: null });
    expect(read("   ", "<b></b>")).toEqual({ displayName: null, dedication: null });
  });
});
