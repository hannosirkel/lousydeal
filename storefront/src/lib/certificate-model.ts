/**
 * What a certificate is, as data, and the one specimen this slice renders.
 *
 * **A type and a fixture, not a data source.** LD-02 issues certificates; this
 * row designs one. Contract §5 requires that a rendered certificate is always
 * *derived* and never the only copy — an operator must be able to sanitise,
 * hide or blank an inscription later without a schema change, a new serial or
 * a reissue — so everything below is what a stored deal record yields, not
 * what it stores.
 *
 * **The layout is dispatched on**, as of C5b. §5 wants an issued certificate to
 * keep the layout it was issued under, so a redesign is additive; LD-09 could
 * only record the number, because nothing rendered from a stored record. Now
 * `./certificate-layouts` resolves the component from the field, and refuses a
 * version it does not know rather than falling back to the current one — a
 * fallback would restyle a certificate somebody already owns, which is the one
 * thing §5 forbids.
 */

import { groupThousands } from "./money";

/** The layout an issued certificate keeps for life. */
export const CERTIFICATE_LAYOUT_V1 = 1;

export interface Certificate {
  /**
   * The sequential display number — `#18,421`. §5: it appears on the
   * certificate, the share card and the counter, and **never in a URL**. The
   * URL carries an opaque slug instead, and neither is derivable from the
   * other.
   */
  readonly serial: number;
  /**
   * Who the certificate names, or `null`. **Never the billing name** — §5 is
   * explicit that billing identity is order data and appears nowhere public.
   *
   * Most buyers leave it empty, and an empty one has to look deliberate
   * rather than unfinished.
   */
  readonly displayName: string | null;
  /**
   * The shareable line, or `null`.
   *
   * **Separate from {@link displayName}, and that is §5's requirement rather
   * than a layout preference.** An operator must be able to "further sanitise,
   * hide, or blank **either** field" later; one column would make blanking the
   * dedication a rewrite of the name. They also occupy different places on the
   * document — the bearer row and the quoted line beneath the ledger — so a
   * single string would have to be split to be rendered anyway.
   */
  readonly dedication: string | null;
  /** The tier's own title, as the Store API returned it. */
  readonly tier: string;
  /** Major units, as everything else in this storefront carries them. */
  readonly amount: number;
  readonly currencyCode: string;
  /** ISO date. Rendered, never parsed into a locale format that moves. */
  readonly issuedOn: string;
  /**
   * The layout this certificate was issued under, and therefore the one it is
   * rendered with for life. §5: a redesign is additive and never restyles a
   * certificate somebody already owns.
   *
   * **`number`, not `typeof CERTIFICATE_LAYOUT_V1`.** It was the literal `1`
   * while the only source was the specimen below. C5b made the source a
   * database row, which can carry any number the schema allows — including one
   * this build has never heard of, if an older image is rolled back over a
   * newer one. Narrowing that to `1` at the type level would be the compiler
   * asserting something only the registry can check, so
   * `./certificate-layouts` checks it instead and refuses what it does not
   * know.
   */
  readonly layout: number;
}

/**
 * The one certificate this slice renders, at `/design/certificate`.
 *
 * **Serial zero, and it says so on the face.** `AGENTS.md` forbids publishing a
 * fabricated transaction total, and a certificate carries one. This is not at
 * a `/done-deals/` URL either: a specimen must never occupy an address a real
 * deal could have.
 *
 * **Both inscription fields empty**, because that is what most certificates
 * will carry and it is the case the design has to survive. A specimen with a
 * name and a dedication would be the flattering one.
 */
export const SPECIMEN_CERTIFICATE: Certificate = {
  serial: 0,
  displayName: null,
  dedication: null,
  tier: "Lousy Deal",
  amount: 5,
  currencyCode: "usd",
  issuedOn: "2026-09-05",
  layout: CERTIFICATE_LAYOUT_V1,
};

/**
 * The serial as it is set: hashed and grouped, never padded.
 *
 * Grouped through `money.ts`'s own helper rather than `toLocaleString`, for
 * the reason that file gives: locale formatting moves with the runtime's ICU
 * data, and the amount beside this figure is grouped by that rule.
 *
 * Not zero-padded. §5 forbids starting the sequence at an inflated offset to
 * look busier; padding is not that rule, but it is the same instinct — a
 * sequence dressed to look longer than it is. Deal one is `#1`.
 *
 * Refuses what a serial cannot be. `serial` is typed `number`, and a
 * non-integer or a negative one would set nonsense on the face of a document
 * whose whole purpose is being believed.
 */
export function formatSerial(serial: number): string {
  if (!Number.isInteger(serial) || serial < 0) {
    throw new Error(`a serial is a whole count, never ${String(serial)}`);
  }
  return `#${groupThousands(String(serial))}`;
}
