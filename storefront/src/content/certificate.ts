/**
 * The certificate's copy, per `docs/current/brand.md` §4.
 *
 * In a content file for the reason decision `004` gives: an operator or a
 * lawyer will want to change the closing clause without touching a component.
 */

export const CERTIFICATE_TITLE = "Certificate of lousy judgment";

/** Labels for the ledger the certificate's facts are set in. */
export const CERTIFICATE_LABELS = {
  bearer: "Bearer",
  item: "Item",
  wasted: "Amount wasted",
  issued: "Issued",
} as const;

/**
 * What the bearer line reads when the buyer left the inscription empty.
 *
 * Most will. §5 requires an empty pair to render well — the certificate has to
 * look deliberate rather than unfinished — so this is a phrase, not a blank
 * and not a placeholder.
 */
export const NO_INSCRIPTION = "The bearer";

/** The stamp. `brand.md` §3 allows one per page; the certificate is its page. */
export const STAMP_LINES = ["Certified", "lousy deal"] as const;

/** The closing clause, verbatim from `brand.md` §4. */
export const CERTIFICATE_CLAUSE =
  "This certificate confers no rights, value, or benefits of any kind, and the bearer knew that.";

/**
 * What the specimen says that a real certificate does not.
 *
 * `AGENTS.md` forbids publishing a fabricated transaction total, and a
 * certificate carries one. This line is the difference between a design and a lie.
 */
export const SPECIMEN_NOTICE = "Specimen. No deal bears this number.";
