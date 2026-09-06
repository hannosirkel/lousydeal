/**
 * The imprint carries every trader detail the law requires to be published.
 *
 * **This is gate item 1's answer, and the reasoning is the sibling project's.**
 * Its `deploys` README states it plainly: Article 6(1) CRD as amended by
 * Directive (EU) 2019/2161 and VÕS § 54¹ oblige a trader to publish its name,
 * registered address, contact address and telephone number, and Article 5(1)(d)
 * of Directive 2000/31/EC obliges it to name the register and its code within
 * it — so each of these has exactly one correct value, the law's requirement is
 * that it be *published*, and a placeholder in one of them is "a legally
 * required disclosure that is wrong rather than a secret withheld".
 *
 * That is why the fields are asserted as *required content* here rather than as
 * optional prose. Until this row the imprint published no telephone number at
 * all, which was gate item 1: § 54(1) p 2 requires one where the trader has
 * one, and the operator has one.
 *
 * Whether each field is *configured* is `no-unresolved-placeholder.test.ts`'s
 * business — it renders every document twice and proves an unconfigured field
 * becomes a named, visible gap rather than a blank. What is here is that the
 * document asks for the field at all.
 */

import { describe, expect, it } from "vitest";

import { IMPRINT } from "../src/content/legal/imprint";
import { MERCHANT_PLACEHOLDERS } from "../src/content/merchant";

const prose = IMPRINT.sections.flatMap((section) => section.body).join("\n");

describe("the trader details the law requires", () => {
  it.each([
    ["the legal name", "{merchantLegalName}", "VÕS § 54¹ and Article 6(1) CRD"],
    ["the registered address", "{merchantAddress}", "the same"],
    ["the contact address", "{merchantEmail}", "the same"],
    ["the telephone number", "{merchantPhoneNumber}", "§ 54(1) p 2, where the trader has one"],
    ["the registry code", "{merchantRegistryCode}", "Article 5(1)(d) of Directive 2000/31/EC"],
    ["the VAT number", "{merchantVatNumber}", "Article 5(1)(g) of the same"],
  ])("publishes %s — %s", (_name, token) => {
    expect(prose).toContain(token);
  });

  it("does not say there is no telephone number, now that there is one", () => {
    // §2 read "There is no telephone number" and was true until the operator
    // settled §2b. Publishing one in §1 without touching §2 would have left the
    // document contradicting itself two sections apart -- which is the defect
    // V15 found on a fourth surface and V10a on a third.
    expect(prose).not.toMatch(/no telephone number/i);
    expect(prose).not.toMatch(/does not need a call centre/i);
  });

  it("names the register itself, not only the code within it", () => {
    // Article 5(1)(d) asks for both: the register the trader is entered in and
    // its identifier there. A bare number names neither.
    expect(prose).toMatch(/commercial register/i);
    expect(prose).toContain("äriregister");
  });

  it("asks for every field the vocabulary can resolve", () => {
    // Derived, so a seventh field added to the resolver has to be either
    // published here or deliberately excluded — not silently forgotten. The
    // imprint is the one document whose purpose is completeness.
    const missing = Object.keys(MERCHANT_PLACEHOLDERS).filter((token) => !prose.includes(`{${token}}`));
    expect(missing).toEqual([]);
  });
});
