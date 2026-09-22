/**
 * The operator's route to an issued inscription.
 *
 * **LD-11 F6.** §5 promises an operator can sanitise, hide or blank an
 * inscription without a reissue, and the render is derived precisely so they
 * can. Nothing implemented it. The repair on 2026-09-19 was a hand-written
 * `UPDATE` against the live database over `kubectl exec`: not a route, no
 * record of who changed what, and nothing to review.
 *
 * The logic is a free function over a two-method seam, the shape `issue.ts`
 * uses and for its reason — everything interesting is what happens when the
 * serial is wrong or the row is absent, and that can be driven without a
 * database.
 */

import { describe, expect, it } from "vitest";

import {
  EDIT_INSCRIPTION_USAGE,
  editInscription,
  inscriptionEditFrom,
  type InscriptionStore,
} from "../src/scripts/edit-inscription";

const deal = {
  id: "deal_1",
  serial: 4102,
  display_name: "A. Buyer",
  dedication: "For nothing in particular",
};

function store(rows: readonly (typeof deal)[] = [deal]) {
  const updates: Record<string, unknown>[] = [];
  const service: InscriptionStore = {
    listLousyDeals: async (filters) =>
      rows.filter((row) => row.serial === filters.serial).map((row) => ({ ...row })),
    updateLousyDeals: async (data) => {
      updates.push(data);
    },
  };
  return { service, updates };
}

describe("what the operator typed", () => {
  it("takes a serial and both fields", () => {
    expect(inscriptionEditFrom(["4102", "A. Buyer", "For nothing"])).toEqual({
      serial: 4102,
      displayName: "A. Buyer",
      dedication: "For nothing",
    });
  });

  it("reads an empty argument as blanking the field, which §5 requires", () => {
    // Blanking is the whole point: an inscription that cannot be emptied
    // cannot be withdrawn, and a reissue would change the serial.
    expect(inscriptionEditFrom(["4102", "", ""])).toEqual({
      serial: 4102,
      displayName: null,
      dedication: null,
    });
  });

  it("refuses anything that is not a serial", () => {
    for (const args of [[], ["4102"], ["4102", "a"], ["nope", "a", "b"], ["0", "a", "b"], ["-1", "a", "b"], ["1.5", "a", "b"]]) {
      expect(() => inscriptionEditFrom(args)).toThrow(EDIT_INSCRIPTION_USAGE);
    }
  });

  it("refuses every other thing `Number()` would have accepted as a serial", () => {
    // `Number("1e3")` is 1000, so the first draft of this command would have
    // blanked deal #1000 for an operator who typed `1e3`. A serial is
    // `model.autoincrement()` and is always plain digits.
    for (const serial of ["1e3", "0x10", "0b11", "0o17", "+5", " 5 ", "5\n", "4102.0", "9007199254740993", "١٢٣"]) {
      expect(() => inscriptionEditFrom([serial, "a", "b"]), serial).toThrow(EDIT_INSCRIPTION_USAGE);
    }
  });

  it("survives yargs converting numeric arguments before it sees them", () => {
    // `medusa exec` collects positionals through yargs, which hands over a
    // `number` for anything numeric-looking. A display name of `1999` would
    // otherwise fail `.length` on a number and be written through as one.
    expect(inscriptionEditFrom([4102, 1999, ""])).toEqual({
      serial: 4102,
      displayName: "1999",
      dedication: null,
    });
  });

  it("holds the operator to the same lengths as the buyer", () => {
    // A route named "sanitise" that accepts what the entry path refuses is a
    // way in, not a repair — and nothing on the render side truncates, so an
    // over-long name would print in full on the certificate and its card.
    expect(() => inscriptionEditFrom(["4102", "x".repeat(61), ""])).toThrow(
      "display name is longer than 60 characters",
    );
    expect(() => inscriptionEditFrom(["4102", "", "x".repeat(121)])).toThrow(
      "dedication is longer than 120 characters",
    );
    expect(inscriptionEditFrom(["4102", "x".repeat(60), "y".repeat(120)])).toMatchObject({
      serial: 4102,
    });
  });

  it("blanks a field the shell padded with spaces", () => {
    expect(inscriptionEditFrom(["4102", "   ", " "])).toEqual({
      serial: 4102,
      displayName: null,
      dedication: null,
    });
  });
});

describe("the edit", () => {
  it("writes both fields through the module, keyed by the row's own id", async () => {
    // Through the module and not the table: the service is the store, and a
    // hand-written `UPDATE` is what this row exists to replace.
    const { service, updates } = store();
    await editInscription(service, { serial: 4102, displayName: "Somebody", dedication: null });

    expect(updates).toEqual([{ id: "deal_1", display_name: "Somebody", dedication: null }]);
  });

  it("refuses a serial that does not exist, and writes nothing", async () => {
    const { service, updates } = store();
    await expect(
      editInscription(service, { serial: 9999, displayName: "x", dedication: null }),
    ).rejects.toThrow("no deal with serial 9999");
    expect(updates).toEqual([]);
  });

  it("reports what it changed, without reprinting the old inscription", async () => {
    // The return value is what the script logs. It names the serial and the
    // row, never the text: an operator log is not a place for a buyer's
    // words, and §5's whole reason for this route is that some of them should
    // not be anywhere.
    const { service } = store();
    const result = await editInscription(service, {
      serial: 4102,
      displayName: null,
      dedication: null,
    });

    expect(result).toEqual({ id: "deal_1", serial: 4102, displayNameSet: false, dedicationSet: false });
    expect(JSON.stringify(result)).not.toContain("A. Buyer");
    expect(JSON.stringify(result)).not.toContain("For nothing in particular");
  });
});
