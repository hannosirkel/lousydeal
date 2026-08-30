import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

import { PRODUCT_TIERS } from "../src/commerce/product-model";

describe("PRODUCT_TIERS", () => {
  it("declares exactly these three tiers, in this order, with these handles and minor-unit amounts", () => {
    expect(
      PRODUCT_TIERS.map((tier) => ({
        handle: tier.handle,
        title: tier.title,
        currency: tier.currency,
        amountMinor: tier.amountMinor,
        manageInventory: tier.manageInventory,
      })),
    ).toEqual([
      {
        handle: "lousy-deal",
        title: "Lousy Deal",
        currency: "usd",
        amountMinor: 500,
        manageInventory: false,
      },
      {
        handle: "lousy-deal-plus",
        title: "Lousy Deal Plus",
        currency: "usd",
        amountMinor: 1000,
        manageInventory: false,
      },
      {
        handle: "lousy-deal-pro",
        title: "Lousy Deal Pro",
        currency: "usd",
        amountMinor: 2500,
        manageInventory: false,
      },
    ]);
  });

  // concept.md:25-29 names a fourth tier, Enterprise, and defers it ("Medusa
  // has no subscription engine"). This asserts the deferral held, not that it
  // always will -- a future row may declare Enterprise deliberately.
  it("declares no Enterprise tier", () => {
    expect(PRODUCT_TIERS.some((tier) => /enterprise/i.test(tier.handle) || /enterprise/i.test(tier.title))).toBe(
      false,
    );
  });
});

describe("no tier amount is a bare literal in any .ts under backend/src except product-model.ts", () => {
  const srcDirectory = join(__dirname, "../src");
  const excludedFile = join(srcDirectory, "commerce", "product-model.ts");

  // Recursive and globbed rather than listed, so a file added anywhere under
  // `src/` is covered the day it lands rather than the day someone remembers
  // to extend a list.
  const allTsFiles = readdirSync(srcDirectory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
    .map((entry) => join(entry.parentPath, entry.name));

  // Named, so the assertion below can ask it about a path that is not on disk.
  const isExcluded = (path: string): boolean => path === excludedFile;

  const scannedFiles = allTsFiles.filter((path) => !isExcluded(path)).sort();

  const sources: Array<[string, string]> = scannedFiles.map((path) => [
    relative(srcDirectory, path).split(sep).join("/"),
    readFileSync(path, "utf8"),
  ]);

  it("finds product-model.ts on disk, then excludes exactly that path", () => {
    expect(allTsFiles).toContain(excludedFile);
    expect(scannedFiles).not.toContain(excludedFile);

    // The half the name turns on. The two assertions above hold just as well
    // if the exclusion matches on basename, and under that weakening a file
    // named `product-model.ts` anywhere else under `src/` is exempt without
    // anything going red. No such file exists on disk, so this asks the
    // predicate about one directly.
    expect(isExcluded(join(srcDirectory, "config", "product-model.ts"))).toBe(false);
  });

  it("covers every other .ts file under src/, including src/config", () => {
    const relativePaths = sources.map(([file]) => file);
    expect(relativePaths).toContain("config/payment.ts");
    expect(relativePaths).toContain("config/env.ts");
    expect(relativePaths).toContain("config/runtime.ts");
    expect(relativePaths).toContain("config/database-url.ts");
    expect(relativePaths).toContain("config/redis.ts");
    expect(relativePaths).toContain("config/redis-preflight.ts");
  });

  // Word-boundary, not substring: a substring match on "500" would also flag
  // "45001", "5000" and "45500", whereas \b requires a non-word character (or
  // a string edge) on each side, so digits adjacent to more digits do not
  // match.
  //
  // What this cannot catch, stated plainly (Constraint 10 -- bounded by this
  // file's own scan, not a claim about text in general):
  //   - A bare 500, 1000 or 2500 used for something that is not a price --
  //     an HTTP status, a millisecond timeout, a batch size -- reads as a
  //     false failure here. There is no such use under src/ today (this test
  //     suite is the proof: it passes), but this pattern does not know the
  //     difference and a legitimate future use of one of these three numbers
  //     would have to be phrased to avoid a bare-token match, or this scan
  //     narrowed.
  //   - Any amount that is not a plain decimal token in the .ts source text:
  //     computed (5 * 100), concatenated ("5" + "00"), hex/octal, read from
  //     JSON/.env/other non-.ts files under src/, or present only in compiled
  //     output -- none of those are scanned.
  //   - A digit token this pattern does not tokenise the same way: `2_500`
  //     (numeric separator) and `500n` (BigInt) both fail to match, because
  //     `_` and `n` are word characters and leave no boundary.
  //   - Anything outside `backend/src/`: this suite does not scan
  //     `backend/medusa-config.ts`, `backend/package.json`, or the other
  //     directories of this repository -- `storefront/`, `scripts/`, `docs/`.
  //     `storefront/` is the one that will matter. T8 creates it and T9
  //     renders the three tiers there
  //     (`docs/working/ld-01-foundation.md:409-417` and `:456-458`), both
  //     outside this scanned root, so nothing here constrains a price written
  //     into a storefront file.
  const PRICE_LITERAL_PATTERN = /\b(500|1000|2500)\b/;

  it.each(sources)("%s carries no bare 500, 1000 or 2500 token", (_file, source) => {
    expect(source).not.toMatch(PRICE_LITERAL_PATTERN);
  });
});
