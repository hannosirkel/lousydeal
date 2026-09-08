import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

import { PRODUCT_TIERS } from "../src/commerce/product-model";
import { type ProductSeedRecord, type ProductSeedTarget, productSeedRecords, seedProduct } from "../src/scripts/seed-product";

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

  /**
   * **Comments are stripped first**, which LD-04's P3b added and which the
   * bullet above anticipated: a bare 500 "used for something that is not a
   * price -- an HTTP status" would read as a false failure, and the two
   * dispositions offered were to phrase around it or to narrow the scan.
   *
   * `modules/printful/client.ts` phrases around it — its retry predicate is
   * `Math.floor(status / 100) === 5` rather than `status >= 500` — and then
   * tripped this anyway, on the *comment explaining why*. That is the fourth
   * time a guard in this repository has matched prose where it meant to match
   * code; `lib/baldrick/conversation.ts`'s purity guard records the first
   * three and settled on exactly this fix.
   *
   * **No coverage is lost.** A price written only in a comment is not a price
   * the code charges. The subject of this scan is a literal in code.
   */
  const code = (source: string): string =>
    source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  it.each(sources)("%s carries no bare 500, 1000 or 2500 token", (_file, source) => {
    expect(code(source)).not.toMatch(PRICE_LITERAL_PATTERN);
  });

  it("strips comments without stripping the code they sit beside", () => {
    // A stripper that returned "" would make every assertion above pass while
    // scanning nothing -- the failure mode of every guard that transforms its
    // input before matching.
    expect(code("const a = 1; // 500\n/* 1000 */ const b = 2;")).toBe("const a = 1; \n const b = 2;");
    expect(code("const price = 500;")).toMatch(PRICE_LITERAL_PATTERN);
    // And every real file still has code in it after stripping. The first
    // version of this asserted a quarter of the source survived, and
    // `commerce/tax-model.ts` failed it — that file is more comment than code,
    // which is characteristic of this repository rather than a defect in it.
    // What matters is that nothing is wiped, not what the ratio is.
    for (const [file, source] of sources) {
      expect(`${file}: ${String(code(source).trim().length > 0)}`).toBe(`${file}: true`);
    }
    // One file checked precisely, so "non-empty" cannot be satisfied by a
    // stripper that leaves only whitespace and punctuation.
    const runtime = sources.find(([file]) => file === "config/runtime.ts")?.[1] ?? "";
    expect(code(runtime)).toContain("export function readBackendRuntimeConfig");
  });
});

/**
 * A `ProductSeedTarget` that behaves the way a real backend must: `apply` is
 * a lookup by natural key (`handle`) followed by a create *or* an update,
 * modelled here as a `Map.set` -- the same key applied twice overwrites
 * rather than accumulates. `calls` records every invocation, so an assertion
 * about the second run's behaviour does not have to trust a mock's call
 * count.
 */
class RecordingProductSeedTarget implements ProductSeedTarget {
  readonly calls: ProductSeedRecord[] = [];
  private readonly products = new Map<string, ProductSeedRecord>();

  async apply(record: ProductSeedRecord): Promise<void> {
    this.calls.push(record);
    this.products.set(record.handle, record);
  }

  get seededHandles(): readonly string[] {
    return [...this.products.keys()].sort();
  }
}

describe("seedProduct run twice", () => {
  it("is called once per tier on each run, and converges on one product per handle", async () => {
    const target = new RecordingProductSeedTarget();

    await seedProduct(target);
    await seedProduct(target);

    // apply() is invoked for every record on every run -- idempotency lives
    // in what the target does with a repeated natural key, not in skipping
    // the call. Two runs of three tiers is six calls.
    expect(target.calls).toHaveLength(productSeedRecords().length * 2);

    // The natural key is what converges: two runs still leave exactly one
    // product per handle, matching PRODUCT_TIERS -- not six, and not a
    // count a mock's assertion could get right by accident.
    expect(target.seededHandles).toEqual(PRODUCT_TIERS.map((tier) => tier.handle).sort());
  });

  it("produces the same records on a second call, so a repeated run asserts the same tiers", () => {
    expect(productSeedRecords()).toEqual(productSeedRecords());
  });

  // `productSeedRecords`'s own doc says "in declaration order", and the
  // handles are written out here rather than read back from PRODUCT_TIERS, so
  // reversing either the model or the mapping goes red.
  it("emits one record per tier in declaration order", () => {
    expect(productSeedRecords().map((record) => record.handle)).toEqual([
      "lousy-deal",
      "lousy-deal-plus",
      "lousy-deal-pro",
    ]);
  });
});
