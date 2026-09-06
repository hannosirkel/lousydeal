/**
 * The opaque public address of a deal.
 *
 * §5 fixes what this has to be: "opaque and random ... not the serial, not
 * sequential, and not guessable. A public URL nobody can enumerate is the
 * entire reason it exists." Everything below follows from that one sentence,
 * because the slug is the only thing standing between a certificate and the
 * whole internet — there is no account, no login and no second check
 * (contract §12), so `GET /done-deals/{slug}` succeeding *is* the
 * authorisation.
 */

import { randomBytes as nodeRandomBytes } from "node:crypto";

/**
 * Thirty characters: Crockford's base32 alphabet with its four ambiguous
 * glyphs already absent (`i`, `l`, `o`, `u`), minus the two vowels it keeps
 * (`a`, `e`), lowercased for a URL.
 *
 * **No vowels** so the generator cannot emit a word. A slug that happens to
 * read as something is a slug somebody screenshots, and the one this site
 * would eventually produce is not one anybody wants printed on a certificate.
 * That is the whole of the reason; it adds no security.
 *
 * Thirty is not a power of two, which is why {@link generateDealSlug} rejects
 * rather than takes a modulus — see there.
 */
export const SLUG_ALPHABET = "0123456789bcdfghjkmnpqrstvwxyz";

/**
 * Sixteen characters, so 30^16 ≈ 4.3 × 10^23, or about 78 bits.
 *
 * The figure that matters is not the count but the ratio: with a hundred
 * thousand deals issued, a guess lands on one in about 4 × 10^18 attempts.
 * Enumeration is not slowed down here, it is off the table.
 */
export const SLUG_LENGTH = 16;

/** The seam the test drives. Node's `randomBytes` in production, always. */
export type RandomBytes = (size: number) => Buffer;

/**
 * Draws a slug.
 *
 * **Rejection sampling, not `% 30`.** A modulus over 32 five-bit values maps
 * two of them onto the first two characters twice, so `0` and `1` would appear
 * at 2/32 and every other character at 1/32 — a 6% bias, published in every
 * URL. It would not make a slug guessable at 78 bits, but a biased generator
 * that happens not to matter is a biased generator, and the fix costs one
 * comparison.
 *
 * Bytes are drawn in blocks rather than one at a time because the expected
 * rejection rate is 2/32, so a block sized for the whole slug clears it about
 * 36% of the time and two blocks about 96% of the time — while a per-character
 * draw pays a syscall for every one of the sixteen.
 */
export function generateDealSlug(randomBytes: RandomBytes = nodeRandomBytes): string {
  let slug = "";
  while (slug.length < SLUG_LENGTH) {
    for (const byte of randomBytes(SLUG_LENGTH)) {
      // The low five bits: 0-31 against a 30-character alphabet. 30 and 31
      // are rejected, which is what keeps the distribution flat.
      const index = byte & 0b11111;
      if (index < SLUG_ALPHABET.length) {
        slug += SLUG_ALPHABET[index];
        if (slug.length === SLUG_LENGTH) break;
      }
    }
  }
  return slug;
}
