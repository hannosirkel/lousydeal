/**
 * §6's gift fields, read off an order.
 *
 * The cases live in `tests/fixtures/gift-cases.json` and the storefront's own
 * suite reads the same file, so a rule that moves in one workspace and not the
 * other fails on the side that did not move.
 *
 * **What this file spends most of its assertions on is the address**, because
 * that is the field the gift flow turns on and the one §5's filter must never
 * touch. Everything else is §5's rule reused, already specified by
 * `inscription-cases.json`, and asserted here only where a gift makes it mean
 * something different.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  DEAL_GIFT_LIMITS,
  DEAL_GIFT_METADATA,
  readGift,
  readGiftAddress,
} from "../src/modules/deal/gift";

interface GiftCases {
  readonly addresses: ReadonlyArray<{ why: string; input: string; valid: boolean }>;
  readonly text: ReadonlyArray<{ why: string; input: string; output: string | null }>;
  readonly limits: ReadonlyArray<{ field: keyof typeof DEAL_GIFT_LIMITS; limit: number }>;
}

/** `__dirname`, not `import.meta`: this workspace emits CommonJS under ts-node. */
const repositoryRoot = join(__dirname, "..", "..");
const source = (path: string) => readFileSync(join(repositoryRoot, path), "utf8");

const CASES = JSON.parse(source(join("tests", "fixtures", "gift-cases.json"))) as GiftCases;

const gift = (metadata: Record<string, unknown>) => readGift(metadata);
const withAddress = (extra: Record<string, unknown> = {}) => ({
  [DEAL_GIFT_METADATA.recipientEmail]: "recipient@example.test",
  ...extra,
});

describe("the recipient's address", () => {
  it.each(CASES.addresses.map((c) => [c.why, c.input, c.valid] as const))(
    "%s",
    (_why, input, valid) => {
      expect(readGiftAddress(input) === null).toBe(!valid);
    },
  );

  it("is validated and never sanitised", () => {
    // §5's filter exists to remove things that look like addresses. Running it
    // here would return null for every valid input, and an address that
    // survived it would be one that no longer reaches the person it names --
    // a gift that silently goes nowhere, which is worse than one refused.
    expect(readGiftAddress("recipient@example.test")).toBe("recipient@example.test");
  });

  it("refuses anything that is not a string, because the endpoint is public", () => {
    for (const value of [null, undefined, 42, true, {}, [], { toString: () => "a@b.test" }]) {
      expect(readGiftAddress(value)).toBeNull();
    }
  });

  it("rejects on length before matching, so a pathological input is not run through the pattern", () => {
    const long = `${"a".repeat(DEAL_GIFT_LIMITS.recipientEmail)}@example.test`;
    expect(long.length).toBeGreaterThan(DEAL_GIFT_LIMITS.recipientEmail);
    expect(readGiftAddress(long)).toBeNull();
  });
});

describe("the three free-text fields", () => {
  it.each(CASES.text.map((c) => [c.why, c.input, c.output] as const))(
    "%s",
    (_why, input, output) => {
      const read = gift(withAddress({ [DEAL_GIFT_METADATA.message]: input }));
      expect(read?.message ?? null).toBe(output);
    },
  );

  it("filters before capping, so the limit counts what will appear", () => {
    // `inscription.ts`'s argument, and it applies identically: capping first
    // would let a buyer spend their allowance on text that was going to be
    // removed anyway.
    const message = `https://evil.test/${"x".repeat(400)} ${"a".repeat(DEAL_GIFT_LIMITS.message)}`;
    const read = gift(withAddress({ [DEAL_GIFT_METADATA.message]: message }));
    expect(read?.message).toBe("a".repeat(DEAL_GIFT_LIMITS.message));
  });

  it("truncates rather than rejecting, and never leaves a trailing space", () => {
    const read = gift(withAddress({ [DEAL_GIFT_METADATA.message]: `${"a".repeat(DEAL_GIFT_LIMITS.message)} bbb` }));
    expect(read?.message).toBe("a".repeat(DEAL_GIFT_LIMITS.message));
    expect(read?.message).not.toMatch(/\s$/);
  });

  it("refuses anything that is not a string", () => {
    for (const value of [42, true, {}, [], null]) {
      expect(gift(withAddress({ [DEAL_GIFT_METADATA.recipientName]: value }))?.recipientName).toBeNull();
    }
  });
});

describe("what makes an order a gift", () => {
  it("is the address, and nothing else", () => {
    // G1's model says a deal is a gift when `gift_recipient_email` is present.
    // This is the other half of that sentence.
    expect(gift(withAddress())).not.toBeNull();
    expect(gift({})).toBeNull();
  });

  it("drops a recipient name and message supplied without a usable address", () => {
    // Not stored against a send that can never happen. The checkout is where
    // this is prevented -- G3 marks the address required and `type="email"` --
    // so an order reaching here without one did not come from the form.
    const read = gift({
      [DEAL_GIFT_METADATA.recipientName]: "A. Recipient",
      [DEAL_GIFT_METADATA.message]: "Happy birthday",
      [DEAL_GIFT_METADATA.recipientEmail]: "not-an-address",
    });
    expect(read).toBeNull();
  });

  it("treats the three optional fields as optional, because §6 does", () => {
    const read = gift(withAddress());
    expect(read).toEqual({
      recipientEmail: "recipient@example.test",
      recipientName: null,
      senderName: null,
      message: null,
    });
  });

  it("survives metadata that is not an object at all", () => {
    for (const value of [null, undefined, "gift", 42, []]) {
      expect(readGift(value)).toBeNull();
    }
  });
});

describe("the two workspaces agree", () => {
  it("writes the same four metadata keys", () => {
    const storefront = source("storefront/src/lib/gift.ts");
    for (const key of Object.values(DEAL_GIFT_METADATA)) {
      expect(storefront, key).toContain(`"${key}"`);
    }
  });

  it("uses the same four limits, and the fixture states them", () => {
    for (const { field, limit } of CASES.limits) {
      expect(DEAL_GIFT_LIMITS[field], field).toBe(limit);
    }
    const storefront = source("storefront/src/lib/gift.ts");
    for (const { field, limit } of CASES.limits) {
      expect(storefront, field).toContain(`${field}: ${String(limit)}`);
    }
  });

  it("uses the same address pattern, character for character", () => {
    // Not "both accept these examples" -- the fixture already does that. This
    // is the source comparison, so a workspace that quietly loosened its
    // pattern in a way no example covers still fails.
    const pattern = (text: string) => /const ADDRESS = (\/.*\/);/.exec(text)?.[1];
    const backend = pattern(source("backend/src/modules/deal/gift.ts"));
    const storefront = pattern(source("storefront/src/lib/gift.ts"));
    expect(backend).toBeDefined();
    expect(storefront).toBe(backend);
  });

  it("reuses §5's filter rather than carrying a second copy of it", () => {
    // LD-03's plan expected a second character-identical block held equal by a
    // test, mirroring C3c. That would be two duplications of one rule: what
    // these fields need is exactly §5's, and `inscription-filter.test.ts`
    // already holds that block equal across the workspaces. A second copy is a
    // second thing to keep in step for no additional property.
    for (const path of ["backend/src/modules/deal/gift.ts", "storefront/src/lib/gift.ts"]) {
      expect(source(path), path).toContain("sanitiseInscription");
      expect(source(path), path).not.toContain("shared inscription filter");
    }
  });
});
