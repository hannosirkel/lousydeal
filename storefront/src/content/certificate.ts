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

/**
 * Who can see the page. LD-11 J10.
 *
 * **Unlisted, not private, and the notice says which.** G4 walked a real
 * certificate and found nothing on the page saying who could read it, while
 * the Privacy Policy §3 already tells the buyer the inscription is printed "on a
 * certificate anybody with its address can read". This is that sentence, on
 * the page it describes, and each of the three reasons it gives is a fact in
 * code rather than a hope:
 *
 * - *nothing on this site links to it*: `sitemap.ts` lists no `/done-deals/`
 *   path, and `tests/share-links.test.ts` fails if any source outside the
 *   route's segment spells the path `/done-deals/` in code;
 * - *search engines are asked to leave it out*: the page's `generateMetadata`
 *   answers `robots: { index: false, follow: false }`, and the PDF and the
 *   share card send `x-robots-tag: noindex, nofollow`;
 * - *the address cannot be guessed*: `backend/src/modules/deal/slug.ts`
 *   draws sixteen characters from thirty, about 78 bits.
 *
 * It says "asked", because `noindex` is a request a well-behaved crawler
 * honours and nothing more. It sits at the share row because that is where
 * the question stops being idle.
 */
export const WHO_CAN_SEE =
  "Anybody with this page’s address can read it. It is unlisted, not private: nothing on this site links to it, search engines are asked to leave it out, and the address cannot be guessed.";

/** Said under the row, because a page that claims no third parties owes the reader this. */
export const SHARE_NOTICE =
  "These are ordinary links. Nothing reaches any of them until you press one, and this page loads nothing from them either way.";

/** The alt text a generated card carries, completed with the serial. */
export const SHARE_CARD_ALT = "Certificate of lousy judgment";
