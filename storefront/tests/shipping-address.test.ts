/**
 * The address the checkout asks for, and the rules it applies to it.
 *
 * These are the pay gate's rules, so they live in a module the page calls and
 * a test can call too — `checkout-rules.ts` says at its own head why: V6b
 * declared the pay gate inside its test, and Gate D then deleted the gate from
 * the component with every test still green. A rule written twice is a rule
 * guarded nowhere.
 */

import { describe, expect, it } from "vitest";

import {
  ADDRESS_LIMITS,
  EMPTY_SHIPPING_ADDRESS,
  addressComplete,
  missingAddressFields,
  needsProvince,
} from "../src/lib/shipping-address";
import {
  ADDRESS_HEADING,
  ADDRESS_LABELS,
  ADDRESS_NOTE,
  SHIPPING_UNAVAILABLE_NOTICE,
} from "../src/content/checkout";

const FULL = { name: "A Buyer", line1: "1 Test St", city: "Tallinn", postcode: "10111", province: "" };

describe("which fields are required", () => {
  it("takes a complete European address without a province", () => {
    expect(missingAddressFields(FULL, "EE")).toEqual([]);
    expect(addressComplete(FULL, "EE")).toBe(true);
  });

  it("names every missing field, in the order the form shows them", () => {
    // Names rather than a boolean, so the pay control's gate and the message a
    // buyer reads cannot disagree about which field is missing.
    expect(missingAddressFields(EMPTY_SHIPPING_ADDRESS, "EE")).toEqual(["name", "line1", "city", "postcode"]);
    expect(missingAddressFields({ ...FULL, city: "" }, "EE")).toEqual(["city"]);
  });

  it("treats whitespace as absence", () => {
    expect(missingAddressFields({ ...FULL, name: "   " }, "EE")).toEqual(["name"]);
  });

  it("requires a province exactly where Printful demands one", () => {
    // Measured 2026-09-08: the United States and Australia answer "State code
    // is missing" without one, and Japan asks for a prefecture. The list is
    // what was observed, not what might be true — a country added on a guess
    // would block a checkout nobody could complete.
    for (const code of ["US", "AU", "CA", "JP", "us"]) {
      expect(`${code}: ${String(needsProvince(code))}`).toBe(`${code}: true`);
      expect(missingAddressFields(FULL, code)).toEqual(["province"]);
    }
    for (const code of ["EE", "DE", "GB", "BR", "NO"]) {
      expect(`${code}: ${String(needsProvince(code))}`).toBe(`${code}: false`);
      expect(missingAddressFields(FULL, code)).toEqual([]);
    }
  });

  it("accepts an address with a province where one is needed", () => {
    expect(addressComplete({ ...FULL, city: "New York", postcode: "10001", province: "NY" }, "US")).toBe(true);
  });
});

describe("the limits", () => {
  it("is in the shape the other limit tables use", () => {
    expect(ADDRESS_LIMITS).toEqual({ name: 60, line1: 120, city: 60, postcode: 20, province: 60 });
  });

  it("has a limit for every field the form collects", () => {
    expect(Object.keys(ADDRESS_LIMITS).sort()).toEqual(Object.keys(ADDRESS_LABELS).sort());
    expect(Object.keys(EMPTY_SHIPPING_ADDRESS).sort()).toEqual(Object.keys(ADDRESS_LABELS).sort());
  });
});

describe("what the block says before anything is typed", () => {
  it("says why it is asked for, and who receives it", () => {
    // Before it is given rather than after, the shape `INSCRIPTION_NOTE` and
    // the gift note both take. Printful is a processor and a buyer is owed
    // that before they type, not in a policy they have to go and find.
    expect(ADDRESS_NOTE).toMatch(/Printful/);
    expect(ADDRESS_NOTE).toMatch(/courier/i);
    expect(ADDRESS_NOTE).toMatch(/Privacy Policy/);
    expect(ADDRESS_HEADING.length).toBeGreaterThan(0);
  });

  it("promises the address appears on no certificate", () => {
    // LD-02 kept the certificate free of anything that is not the document,
    // and LD-03's gift work kept a recipient's details off it. A postal
    // address is the largest thing yet that must not appear there.
    expect(ADDRESS_NOTE).toMatch(/none of it appears on a certificate/i);
  });

  it("offers no figure when the postage cannot be quoted", () => {
    // §11 forbids a fabricated figure and §23 requires the final price to be
    // explicit, so a shop that cannot price the postage says so.
    expect(SHIPPING_UNAVAILABLE_NOTICE).not.toMatch(/[$€£]|\d+\.\d\d/);
    expect(SHIPPING_UNAVAILABLE_NOTICE).toMatch(/Nothing has been charged/i);
    expect(SHIPPING_UNAVAILABLE_NOTICE).toMatch(/Imprint/);
  });

  it("carries no exclamation mark, like every other surface", () => {
    for (const line of [ADDRESS_HEADING, ADDRESS_NOTE, SHIPPING_UNAVAILABLE_NOTICE, ...Object.values(ADDRESS_LABELS)]) {
      expect(line).not.toContain("!");
    }
  });
});
