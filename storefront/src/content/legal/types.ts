/**
 * What a legal document is, as data.
 *
 * Structured rather than written as markup for the reason decision `004`
 * gives: a disclosure that is a placeholder in a content file can be changed
 * by editing content; one interpolated inside a component cannot. Section
 * numbers, headings and paragraphs are fields, so a lawyer's edit is an edit
 * to a list of strings and never to JSX.
 *
 * **Paragraphs may carry `{merchantLegalName}`-shaped placeholders and nothing
 * else.** `tests/no-unresolved-placeholder.test.ts` walks every document in
 * this directory and fails on a token that survives resolution — with every
 * field configured and again with none — so a typo cannot reach a page.
 */

export interface LegalSection {
  /** `1`, or `1.1` for a sub-section. Rendered with a section sign. */
  readonly number: string;
  readonly heading: string;
  /** One string per paragraph. Placeholders are resolved at render. */
  readonly body: readonly string[];
}

export interface LegalDocument {
  readonly title: string;
  /** The form number, as every other document on the site carries one. */
  readonly form: string;
  readonly revision: string;
  /** ISO. Rendered as stored, like the certificate's issue date. */
  readonly updated: string;
  readonly sections: readonly LegalSection[];
}

/** `brand.md` §5: every legal document closes with this line, then its date. */
export const LEGAL_CLOSING_LINE = "This document is legally binding, unlike our value proposition.";

/** Heading for the short table of contents `brand.md` §5 asks each document to carry. */
export const CONTENTS_HEADING = "Contents";

/** Label for the last-updated line under the closing sentence. */
export const UPDATED_LABEL = "Last updated";

/**
 * Shown when any field a document needed was unconfigured.
 *
 * Decision `004`'s rule, in the place it matters most: an imprint that quietly
 * loses its registration number reads as a complete legal notice and is not
 * one. The gaps themselves are named and visible; this says the document as a
 * whole is incomplete.
 */
export const LEGAL_INCOMPLETE_NOTICE =
  "This document is incomplete: a detail it is required to state has not been configured.";
