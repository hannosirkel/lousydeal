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

/**
 * The share row. C7.
 *
 * **Three destinations and no widget.** `brand.md` §4 says why: a share button
 * that loads a script is a third party on a page whose whole posture is that
 * there are none, and every count on this site of what it loads would have to
 * change. These are ordinary links. Nothing is sent anywhere until somebody
 * presses one, and the notice says so — not as a disclaimer, but because a
 * reader of this site's privacy notice would reasonably wonder.
 */
export const SHARE_LABEL = "Show somebody";

export const SHARE_TARGETS = {
  x: "on X",
  bluesky: "on Bluesky",
  email: "by email",
} as const;

/**
 * What a shared link says before the reader opens it.
 *
 * First person and past tense, because the person sharing is the one who did
 * it. `brand.md` §2's register: a clerk noting a fact, not a brand asking to be
 * retweeted.
 */
export const SHARE_TEXT = "I bought a certificate that confers nothing. It has a number.";

/** The subject line for the email share, which needs one and cannot borrow the body's. */
export const SHARE_EMAIL_SUBJECT = "A certificate of lousy judgment";

/** Said under the row, because a page that claims no third parties owes the reader this. */
export const SHARE_NOTICE =
  "These are ordinary links. Nothing reaches any of them until you press one, and this page loads nothing from them either way.";

/** The alt text a generated card carries, completed with the serial. */
export const SHARE_CARD_ALT = "Certificate of lousy judgment";
