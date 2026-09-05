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
 * **The layout is recorded, not yet dispatched on.** §5 wants an issued
 * certificate to keep the layout it was issued under, so a redesign is
 * additive. Recording the number is the half this row can do; nothing reads it
 * yet, and until something does, a layout 2 could still restyle every layout 1
 * certificate. The row that adds a second layout is the row that has to branch
 * on this field, and LD-02 — which issues the first real certificate — is
 * where the field starts carrying weight.
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
   * What the buyer chose to make public, or `null`. **Never the billing
   * name** — §5 is explicit that billing identity is order data and appears
   * nowhere public. Most buyers leave it empty, and an empty one has to look
   * deliberate rather than unfinished.
   */
  readonly inscription: string | null;
  /** The tier's own title, as the Store API returned it. */
  readonly tier: string;
  /** Major units, as everything else in this storefront carries them. */
  readonly amount: number;
  readonly currencyCode: string;
  /** ISO date. Rendered, never parsed into a locale format that moves. */
  readonly issuedOn: string;
  readonly layout: typeof CERTIFICATE_LAYOUT_V1;
}

/**
 * The one certificate this slice renders, at `/design/certificate`.
 *
 * **Serial zero, and it says so on the face.** `AGENTS.md` forbids publishing a
 * fabricated transaction total, and a certificate carries one. This is not at
 * a `/done-deals/` URL either: a specimen must never occupy an address a real
 * deal could have.
 */
export const SPECIMEN_CERTIFICATE: Certificate = {
  serial: 0,
  inscription: null,
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
