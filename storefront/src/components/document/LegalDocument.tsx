/**
 * A legal document, rendered from `src/content/legal/`.
 *
 * `docs/current/brand.md` §5: `DocumentFrame` at the narrow measure, numbered
 * sections with a section sign, a short table of contents, the closing line and
 * the date.
 *
 * **Decision `004` is the whole of the resolution rule.** Placeholders are
 * substituted from values read server-side per request; an unconfigured field
 * renders as a named, visible gap — never a placeholder string, never a blank,
 * never a fabricated value — and the document says it is incomplete. `004` is
 * specific about why that is not the same as dropping optional prose: losing an
 * alternative contact route costs a visitor nothing they could have used, but
 * an imprint that quietly loses its registration number reads as a complete
 * legal notice that is not one.
 *
 * **Depth comes from the number.** `1.1` is a sub-section of `1`: it takes the
 * next heading level and its own indent, and the contents list nests to match.
 * Deriving it means a content file stays a flat list of numbered sections and
 * a lawyer renumbering one does not restructure a component.
 *
 * **The section sign is `aria-hidden` and outside the accessible name.** `§1.1`
 * announced as "section sign one point one" is punctuation read aloud. The
 * number and heading are one string rather than two children, because React
 * separates adjacent text children with comment markers and the whitespace
 * between them is dropped from the accessibility tree — measured, the name came
 * out as `1WHO OPERATES THIS SITE`.
 */

import {
  CONTENTS_HEADING,
  LEGAL_CLOSING_LINE,
  LEGAL_INCOMPLETE_NOTICE,
  UPDATED_LABEL,
  type LegalDocument as LegalDocumentRecord,
  type LegalSection,
} from "../../content/legal/types";
import { hasGap, resolveText, type MerchantIdentity, type ResolvedPart } from "../../content/merchant";
import { DocumentFrame } from "./DocumentFrame";
import { FinePrint } from "./FinePrint";
import { Parts } from "./Parts";

/** `1` is depth 1, `1.1` is depth 2. Capped so a stray number cannot pick an element that is not a heading. */
function depthOf(number: string): number {
  return Math.min(number.split(".").length, 3);
}

/** A section's own anchor, so the contents list can reach it. */
function sectionId(number: string): string {
  return `section-${number.replace(/\./g, "-")}`;
}

/** The one string a heading and its contents entry both use. */
function titleOf(section: LegalSection): string {
  return `${section.number} ${section.heading}`;
}

interface ResolvedSection extends LegalSection {
  readonly resolved: readonly (readonly ResolvedPart[])[];
}

function Contents({ sections }: { readonly sections: readonly ResolvedSection[] }) {
  return (
    <ol role="list">
      {sections.map((section) => (
        <li key={section.number} className={`contents-depth-${String(depthOf(section.number))}`}>
          <a href={`#${sectionId(section.number)}`}>
            <span aria-hidden="true">§</span>
            {titleOf(section)}
          </a>
        </li>
      ))}
    </ol>
  );
}

function SectionHeading({ section }: { readonly section: ResolvedSection }) {
  const text = (
    <>
      <span aria-hidden="true">§</span>
      {titleOf(section)}
    </>
  );
  return depthOf(section.number) === 1 ? <h3>{text}</h3> : <h4>{text}</h4>;
}

export function LegalDocument({
  document,
  merchant,
}: {
  readonly document: LegalDocumentRecord;
  readonly merchant: MerchantIdentity;
}) {
  const sections: ResolvedSection[] = document.sections.map((section) => ({
    ...section,
    resolved: section.body.map((paragraph) => resolveText(paragraph, merchant)),
  }));
  const incomplete = sections.some((section) => section.resolved.some(hasGap));

  return (
    <DocumentFrame title={document.title} form={document.form} revision={document.revision}>
      <nav className="legal-contents" aria-labelledby="legal-contents-heading">
        <h2 id="legal-contents-heading">{CONTENTS_HEADING}</h2>
        <Contents sections={sections} />
      </nav>

      {sections.map((section) => (
        <section
          key={section.number}
          id={sectionId(section.number)}
          className={`legal-section legal-depth-${String(depthOf(section.number))}`}
        >
          <SectionHeading section={section} />
          {section.resolved.map((parts, index) => (
            <p key={index}>
              <Parts parts={parts} />
            </p>
          ))}
        </section>
      ))}

      {incomplete ? <p className="gap">{LEGAL_INCOMPLETE_NOTICE}</p> : null}

      <FinePrint>{LEGAL_CLOSING_LINE}</FinePrint>
      <FinePrint>
        {UPDATED_LABEL} <time dateTime={document.updated}>{document.updated}</time>
      </FinePrint>
    </DocumentFrame>
  );
}
