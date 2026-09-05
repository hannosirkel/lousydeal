/**
 * The copy the masthead and footer render.
 *
 * It is here rather than inside the components because decision `004` is
 * specific about where a disclosure lives: "A disclosure that is a placeholder
 * in a content file can be changed by editing content. A disclosure
 * interpolated inside a component cannot." The trader line is a disclosure —
 * contract §2b calls these the details a customer must be able to find.
 *
 * The wording is `docs/current/brand.md` §4, and `tests/merchant.test.ts`
 * reads that document to check these two strings still match it.
 */

/** `brand.md` §4: the wordmark, and the fine-print line beneath it. */
export const MASTHEAD_MARK = "LOUSYDEAL.COM";
export const MASTHEAD_LINE = "Purveyors of objectively bad value";

/**
 * Contract §2b's trader details. Registry code and VAT number are not here:
 * both are unconfigured, and a gap a reader cannot act on does not earn a
 * place on every page. The imprint is where a missing registration must be
 * visible, because completeness is that document's point.
 */
export const TRADER_LINE = "{merchantLegalName}, {merchantAddress}.";

/**
 * Separate from the line above only because the footer renders it as a
 * `mailto:` link, which a plain-text template cannot express. It still goes
 * through the same vocabulary, so its gap label comes from
 * `MERCHANT_PLACEHOLDERS` rather than being written twice.
 */
export const CONTACT_LINE = "{merchantEmail}";

/** Shown when any field the trader line asked for was unconfigured. */
export const INCOMPLETE_NOTICE =
  "This notice is incomplete: a detail this page is required to show has not been configured.";
