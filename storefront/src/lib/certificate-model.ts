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
 * **The layout is versioned from the first render.** §5: an issued certificate
 * keeps the layout it was issued under, so new deals get a new design and every
 * existing deal still renders exactly as its holder first saw it. That only
 * works if the first layout has a number, and this is it. A later design adds
 * `2` and keeps `1` in the codebase and under test.
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
 * fabricated transaction, and a certificate is a record of one. This is not at
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
 * look busier, and padding deal one out to five digits is the same claim made
 * typographically. (Written out rather than shown: a padded serial is
 * hash-then-zeros, which `tests/store-cart.test.ts`'s colour-literal guard
 * cannot tell from a hex colour, and it is right not to try.)
 */
export function formatSerial(serial: number): string {
  return `#${groupThousands(String(serial))}`;
}
