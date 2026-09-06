/**
 * The deal model's schema, and the slug generator.
 *
 * **The schema is asserted as a closed set, not a subset.** Contract §5 says
 * the billing name appears nowhere public and §16 says not to duplicate order
 * state into custom tables; both are absences, and an absence is only testable
 * against an exact field list. `toEqual` on the sorted keys fails when a later
 * row adds a column — which is the point. A row that needs one amends this
 * list, in the open, rather than finding out at Gate D that the certificate
 * grew a `customer_email`.
 *
 * Nothing here touches a database. The DML is introspectable
 * (`DmlEntity.parse()`), so the column set, the nullability and the indexes
 * are readable from the definition itself; whether Postgres then builds what
 * the definition says is the migration's business and `scripts/store-smoke`'s.
 */

import { describe, expect, it } from "vitest";

import { dealModule } from "../src/config/deal";
import dealModuleDefinition, { DEAL_MODULE } from "../src/modules/deal";
import { DEAL_STATUSES, LousyDeal } from "../src/modules/deal/models/lousy-deal";
import { SLUG_ALPHABET, SLUG_LENGTH, generateDealSlug } from "../src/modules/deal/slug";

const schema = LousyDeal.parse();

/** `{ fieldName: { dataType, nullable } }`, flattened out of the DML's per-property parsers. */
const fields = Object.fromEntries(
  Object.entries(schema.schema).map(([name, property]) => {
    const parsed = (property as { parse: (name: string) => { dataType: { name: string }; nullable: boolean } }).parse(
      name,
    );
    return [name, { type: parsed.dataType.name, nullable: parsed.nullable }];
  }),
);

describe("the module's registered name", () => {
  it("is the same name the service declares, so the config's shortcut stays honest", () => {
    // `src/config/deal.ts` supplies `key` so that `defineConfig` does not have
    // to `require` an uncompiled TypeScript directory to learn the module's
    // name -- see that file for why. The cost of the shortcut is that the two
    // names are now written in two places and nothing in Medusa reconciles
    // them: a module registered under a `key` its service does not answer to
    // resolves at config time and fails at `container.resolve()`.
    //
    // Read from the joiner config the service actually carries, which is the
    // same source `define-config.js:83-87` would have read.
    const service = dealModuleDefinition.service as unknown as {
      prototype: { __joinerConfig: (() => { serviceName?: string }) | { serviceName?: string } };
    };
    const joinerConfig = service.prototype.__joinerConfig;
    const declared = typeof joinerConfig === "function" ? joinerConfig().serviceName : joinerConfig.serviceName;

    expect(declared).toBe(DEAL_MODULE);
    expect(dealModule().key).toBe(DEAL_MODULE);
  });
});

describe("the deal model", () => {
  it("is exactly the fields §16 names, plus Medusa's own timestamps, and nothing that could carry a billing identity", () => {
    expect(Object.keys(fields).sort()).toEqual(
      [
        "id",
        "order_id",
        "serial",
        "public_slug",
        "tier",
        "amount_paid",
        // `model.bigNumber()` materialises this second column; it is Medusa's,
        // not a field this schema chose, and it is listed so the closed set
        // above stays a true statement of what the table has.
        "raw_amount_paid",
        "currency_code",
        "display_name",
        "dedication",
        "layout_version",
        "status",
        "issued_at",
        "created_at",
        "updated_at",
        "deleted_at",
      ].sort(),
    );
  });

  it("keeps the serial a database sequence rather than a plain number", () => {
    // The distinction this asserts is `MAX(serial)+1` versus a sequence. A
    // `number` column would let two concurrent issuances read the same
    // maximum and mint the same certificate number; `serial` is what the DML
    // maps to `Property({ autoincrement: true })`.
    expect(fields.serial?.type).toBe("serial");
    expect(fields.layout_version?.type).toBe("number");
  });

  it("makes both inscription fields optional and everything the certificate needs mandatory", () => {
    // §5: most buyers leave both blank, and the empty pair has to be a
    // representable state rather than an empty string standing in for one.
    expect(fields.display_name?.nullable).toBe(true);
    expect(fields.dedication?.nullable).toBe(true);

    // The face of the document. A nullable one of these is a certificate that
    // can render a blank where a fact belongs.
    for (const required of ["order_id", "serial", "public_slug", "tier", "amount_paid", "currency_code", "layout_version", "status", "issued_at"]) {
      expect(fields[required]?.nullable, required).toBe(false);
    }
  });

  it("can hide a certificate without deleting it, and without a new serial", () => {
    // §5 requires an operator to be able to hide or blank an inscription
    // "without a schema change, without a new serial, and without reissuing".
    // A status is how that is done; soft-deleting the row is not, because the
    // unique indexes below are scoped to undeleted rows.
    expect(fields.status?.type).toBe("enum");
    expect(DEAL_STATUSES).toContain("hidden");
    expect(DEAL_STATUSES).toContain("issued");
  });

  it("makes the order, the slug and the serial unique, each scoped to undeleted rows", () => {
    const unique = schema.indexes
      .filter((index) => index.unique)
      .map((index) => ({ on: index.on, where: index.where }));

    expect(unique).toEqual(
      expect.arrayContaining([
        { on: ["order_id"], where: "deleted_at IS NULL" },
        { on: ["public_slug"], where: "deleted_at IS NULL" },
        { on: ["serial"], where: "deleted_at IS NULL" },
      ]),
    );
    expect(unique).toHaveLength(3);
  });
});

describe("the public slug", () => {
  it("is sixteen characters from a thirty-character alphabet with no vowel in it", () => {
    expect(SLUG_ALPHABET).toHaveLength(30);
    expect(SLUG_ALPHABET).not.toMatch(/[aeiou]/);
    // Crockford's four ambiguous glyphs, absent for the same reason he drops
    // them: a slug gets read aloud and typed back in.
    expect(SLUG_ALPHABET).not.toMatch(/[ilou]/);
    expect(new Set(SLUG_ALPHABET).size).toBe(SLUG_ALPHABET.length);

    const slug = generateDealSlug();
    expect(slug).toHaveLength(SLUG_LENGTH);
    expect(slug).toMatch(new RegExp(`^[${SLUG_ALPHABET}]{${SLUG_LENGTH}}$`));
  });

  it("rejects the two out-of-range values rather than folding them onto the first two characters", () => {
    // The defect this catches is `byte % 30`, which maps 30 -> '0' and
    // 31 -> '1' and publishes a 6% bias in every URL.
    //
    // **The control character is deliberately not the alphabet's first.** The
    // obvious version of this test feeds 30s and then 0s and expects '0' * 16
    // -- and a modulus passes it, because 30 % 30 is 0 and produces the same
    // string. Feeding 30s, then 31s, then 5s separates them: rejection
    // discards the first two blocks and answers with the sixth character
    // sixteen times, while a modulus answers from the first block and never
    // reaches the third.
    const blocks = [30, 31, 5];
    let call = 0;
    const feed = (size: number): Buffer => Buffer.alloc(size, blocks[Math.min(call++, blocks.length - 1)]);

    expect(generateDealSlug(feed)).toBe(SLUG_ALPHABET[5]?.repeat(SLUG_LENGTH));
  });

  it("draws every character of the alphabet and no character twice as often as another", () => {
    // Flatness, measured rather than asserted from the code. 30 characters
    // over 6,000 draws is 200 expected each; the band is wide enough that a
    // fair generator never trips it and narrow enough that a modulus bias
    // (which would put ~400 on the first two) always does.
    const counts = new Map<string, number>();
    for (let draw = 0; draw < 375; draw += 1) {
      for (const character of generateDealSlug()) {
        counts.set(character, (counts.get(character) ?? 0) + 1);
      }
    }

    expect(counts.size).toBe(SLUG_ALPHABET.length);
    for (const [character, count] of counts) {
      expect(count, character).toBeGreaterThan(120);
      expect(count, character).toBeLessThan(300);
    }
  });

  it("takes nothing that could tie it to the serial, and repeats none of ten thousand draws", () => {
    // §5: "The two are independent. The slug addresses the deal; the serial
    // names it. Neither is derivable from the other." The structural half of
    // that is the signature -- the generator is given no serial, no order and
    // no clock, so there is nothing for it to derive from. The statistical
    // half is below.
    expect(generateDealSlug.length).toBe(0);

    const drawn = new Set<string>();
    for (let draw = 0; draw < 10_000; draw += 1) drawn.add(generateDealSlug());
    expect(drawn.size).toBe(10_000);
  });
});
