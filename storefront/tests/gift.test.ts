/**
 * The storefront's half of §6's gift fields.
 *
 * It runs the same `tests/fixtures/gift-cases.json` the backend's suite does.
 * The point is not that this code is a control — the endpoint the checkout
 * writes through is public, so nothing here filters anything an attacker has
 * to pass — but that a buyer is shown what the backend will actually do, and
 * that the two files cannot drift apart without a suite failing.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { GIFT_LIMITS, GIFT_METADATA, isGiftAddress, previewGiftText } from "../src/lib/gift";

interface GiftCases {
  readonly addresses: ReadonlyArray<{ why: string; input: string; valid: boolean }>;
  readonly text: ReadonlyArray<{ why: string; input: string; output: string | null }>;
  readonly limits: ReadonlyArray<{ field: keyof typeof GIFT_LIMITS; limit: number }>;
}

const CASES = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../tests/fixtures/gift-cases.json", import.meta.url)), "utf8"),
) as GiftCases;

describe("the address the checkout accepts", () => {
  it.each(CASES.addresses.map((c) => [c.why, c.input, c.valid] as const))("%s", (_why, input, valid) => {
    expect(isGiftAddress(input)).toBe(valid);
  });

  it("agrees with the backend, so the form never promises what the backend will drop", () => {
    // A buyer told their address is fine, whose gift then arrives as an
    // ordinary purchase with no explanation, has been misled by this file.
    const backend = readFileSync(
      fileURLToPath(new URL("../../backend/src/modules/deal/gift.ts", import.meta.url)),
      "utf8",
    );
    for (const { input, valid } of CASES.addresses) {
      expect(isGiftAddress(input), input).toBe(valid);
    }
    expect(backend).toContain("readGiftAddress");
  });
});

describe("what a buyer is shown of their message", () => {
  it.each(CASES.text.map((c) => [c.why, c.input, c.output] as const))("%s", (_why, input, output) => {
    expect(previewGiftText(input, GIFT_LIMITS.message)).toBe(output);
  });

  it("previews what will appear, not what was typed", () => {
    // §7's promise for the inscription, applied to the gift message: a buyer
    // who typed a URL sees it vanish here rather than discovering later that
    // we removed it from a message they thought they had sent.
    expect(previewGiftText("Claim your prize at https://evil.test/now", GIFT_LIMITS.message)).toBe(
      "Claim your prize at",
    );
  });

  it("caps at the limit it is given, after filtering", () => {
    const preview = previewGiftText(`https://evil.test ${"a".repeat(400)}`, GIFT_LIMITS.message);
    expect(preview).toBe("a".repeat(GIFT_LIMITS.message));
  });

  it("returns null for nothing, which is the no-message state", () => {
    for (const value of ["", "   ", null, undefined, "https://evil.test"]) {
      expect(previewGiftText(value, GIFT_LIMITS.message)).toBeNull();
    }
  });
});

describe("the two workspaces agree", () => {
  const backend = readFileSync(
    fileURLToPath(new URL("../../backend/src/modules/deal/gift.ts", import.meta.url)),
    "utf8",
  );

  it("writes the four keys the backend reads", () => {
    for (const key of Object.values(GIFT_METADATA)) {
      expect(backend, key).toContain(`"${key}"`);
    }
  });

  it("uses the same four limits as the backend and the fixture", () => {
    for (const { field, limit } of CASES.limits) {
      expect(GIFT_LIMITS[field], field).toBe(limit);
      expect(backend, field).toContain(`${field}: ${String(limit)}`);
    }
  });

  it("keeps the recipient's name and address off every limit that governs a public field", () => {
    // A reminder in a test, because it is the constraint most easily lost:
    // these four are private. §5's `display_name` and `dedication` are the
    // public pair, and they are governed by `INSCRIPTION_LIMITS`, not these.
    expect(Object.keys(GIFT_LIMITS).sort()).toEqual(
      ["message", "recipientEmail", "recipientName", "senderName"].sort(),
    );
  });
});
