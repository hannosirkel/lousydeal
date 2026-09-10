/**
 * The four "discount" codes and what each adds to the certificate.
 *
 * `docs/working/fresh-build.md` §9 settled the mechanism: a surcharge is an
 * ordinary custom-priced cart line carrying the metadata below, never a
 * Medusa promotion, because a promotion cannot raise a price. This file is
 * the committed table and the arithmetic and nothing else -- no Medusa
 * import, so the route that writes the line (LD-06 D4) and the guard that
 * keeps Baldrick's script naming a real code (D7) both read one source, and
 * every case here is a plain unit test.
 *
 * **The surcharge is zero or more, by construction.** The base is accepted
 * only as a finite, non-negative amount, every rate and fee in the table is
 * non-negative, and the arithmetic is a product and a half-up rounding of
 * non-negative integers. There is no subtraction anywhere in this file, so
 * no code and no input can lower a price (LD-06 constraint 3).
 *
 * **Integer cents, not floats.** Medusa carries money on the wire in major
 * units with two decimals (the seed divides `amountMinor` by 100). A
 * percentage taken of a float and rounded with `Math.round(x * 100) / 100`
 * is not half-up at binary boundaries: ten percent of $1.45 lands at
 * 14.499999999999998 cents and rounds down. So the price is converted to
 * integer cents once on the way in, the rate is applied to that integer,
 * and the result is divided once on the way out.
 *
 * **Normalisation is trim and case, and nothing more.** A code that forgives
 * spacing starts forgiving spelling, and a code that works when mistyped is
 * one nobody chose. Only ASCII letters fold: Unicode case mapping would let
 * U+017F (long s) match `SAVE10`.
 *
 * **A base that is not a two-decimal amount throws.** `null` means "no such
 * code". Returning it for a corrupt price would make a data defect look like
 * a typo, and the route would answer `unknown_code` for a cart it should be
 * refusing loudly.
 *
 * The metadata is §9's shape with each amount's unit in its key name, because
 * it is stored as line-item metadata and read back by D9's report with no
 * schema beside it. It is display and analytics, not identity: the line is a
 * surcharge because it has no variant (constraint 6), not because of what
 * its metadata says.
 */

export const SURCHARGE_INTERNAL_TYPE = "baldrick_surcharge";

export type SurchargeCode =
  | {
      readonly code: string;
      readonly kind: "percentage";
      /** Whole percent of the certificate's price. Zero is a real code that adds a real $0.00 line. */
      readonly percentage: number;
    }
  | {
      readonly code: string;
      readonly kind: "fee";
      /** Minor units, added regardless of tier. */
      readonly feeAmountMinor: number;
    };

/** Operator-frozen (`ld-06-discounts.md`, decisions of 2026-09-10). Codes are stored normalised. */
export const SURCHARGE_CODES: readonly SurchargeCode[] = [
  { code: "BALDRICK20", kind: "percentage", percentage: 20 },
  { code: "SAVE10", kind: "percentage", percentage: 10 },
  { code: "FREE", kind: "fee", feeAmountMinor: 100 },
  { code: "BLACKFRIDAY", kind: "percentage", percentage: 0 },
];

export type SurchargeMetadata =
  | {
      readonly internal_type: typeof SURCHARGE_INTERNAL_TYPE;
      readonly code: string;
      readonly base_amount_major: number;
      readonly percentage: number;
    }
  | {
      readonly internal_type: typeof SURCHARGE_INTERNAL_TYPE;
      readonly code: string;
      readonly base_amount_major: number;
      readonly fee_amount_major: number;
    };

/** What D4 hands to `addToCartWorkflow`. Major units, as Medusa has them on the wire. */
export interface SurchargeLine {
  readonly unitPrice: number;
  readonly title: string;
  readonly metadata: SurchargeMetadata;
}

const MINOR_PER_MAJOR = 100;

// How far a major amount may sit from the nearest cent and still be read as
// that cent. `19.99 * 100` is 1998.9999999999998; a genuine third decimal is
// at least a tenth of a cent away.
const BINARY_TOLERANCE_MINOR = 1e-6;

export function normalizeSurchargeCode(input: string): string {
  return input.trim().replace(/[a-z]/g, (letter) => letter.toUpperCase());
}

function toMinor(major: number): number {
  const minor = Math.round(major * MINOR_PER_MAJOR);
  const isTwoDecimal =
    Number.isFinite(major) && Number.isSafeInteger(minor) && Math.abs(major * MINOR_PER_MAJOR - minor) < BINARY_TOLERANCE_MINOR;
  if (!isTwoDecimal || minor < 0) {
    throw new RangeError(`a certificate price must be a non-negative two-decimal amount, got ${String(major)}`);
  }
  return minor;
}

function toMajor(minor: number): number {
  return minor / MINOR_PER_MAJOR;
}

// Half-up as `floor((n + 50) / 100)` on a non-negative integer product. No
// float is rounded here.
function percentageOf(baseMinor: number, percentage: number): number {
  return Math.floor((baseMinor * percentage + MINOR_PER_MAJOR / 2) / MINOR_PER_MAJOR);
}

/**
 * Price a code against the certificate line's unit price.
 *
 * Returns `null` for a string that is not a code. Throws `RangeError` for a
 * price that is not a non-negative two-decimal amount, before the code is
 * looked at, so a corrupt base is loud whatever was typed.
 */
export function priceSurcharge(certificateUnitPrice: number, code: string): SurchargeLine | null {
  const baseMinor = toMinor(certificateUnitPrice);
  const normalized = normalizeSurchargeCode(code);
  const entry = SURCHARGE_CODES.find((candidate) => candidate.code === normalized);
  if (entry === undefined) return null;

  const base = { internal_type: SURCHARGE_INTERNAL_TYPE, code: entry.code, base_amount_major: toMajor(baseMinor) } as const;
  const title = `Discount (${entry.code})`;

  if (entry.kind === "fee") {
    return {
      unitPrice: toMajor(entry.feeAmountMinor),
      title,
      metadata: { ...base, fee_amount_major: toMajor(entry.feeAmountMinor) },
    };
  }
  return {
    unitPrice: toMajor(percentageOf(baseMinor, entry.percentage)),
    title,
    metadata: { ...base, percentage: entry.percentage },
  };
}
