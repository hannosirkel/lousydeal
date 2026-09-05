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
 * The section sign is `<span aria-hidden>` beside a plain number, because a
 * screen reader announcing "section sign one point one" for `§1.1` is reading
 * punctuation aloud. The heading text carries the meaning.
 */

import { hasGap, resolveText, type MerchantIdentity, type ResolvedPart } from "../../content/merchant";
import {
  CONTENTS_HEADING,
  LEGAL_CLOSING_LINE,
  LEGAL_INCOMPLETE_NOTICE,
  UPDATED_LABEL,
  type LegalDocument as LegalDocumentRecord,
} from "../../content/legal/types";
import { DocumentFrame } from "./DocumentFrame";
import { FinePrint } from "./FinePrint";

function Parts({ parts }: { readonly parts: readonly ResolvedPart[] }) {
  return (
    <>
      {parts.map((part, index) =>
        part.kind === "text" ? (
          <span key={index}>{part.text}</span>
        ) : (
          <span key={index} className="gap">
            [{part.label} NOT CONFIGURED]
          </span>
        ),
      )}
    </>
  );
}

/** A section's own anchor, so the contents list can reach it. */
function sectionId(number: string): string {
  return `section-${number.replace(/\./g, "-")}`;
}

export function LegalDocument({
  document,
  merchant,
}: {
  readonly document: LegalDocumentRecord;
  readonly merchant: MerchantIdentity;
}) {
  const resolved = document.sections.map((section) => ({
    ...section,
    body: section.body.map((paragraph) => resolveText(paragraph, merchant)),
  }));
  const incomplete = resolved.some((section) => section.body.some(hasGap));

  return (
    <DocumentFrame title={document.title} form={document.form} revision={document.revision}>
      <nav className="legal-contents" aria-label={CONTENTS_HEADING}>
        <h2>{CONTENTS_HEADING}</h2>
        <ol>
          {resolved.map((section) => (
            <li key={section.number}>
              <a href={`#${sectionId(section.number)}`}>
                <span aria-hidden="true">§</span>
                {section.number} {section.heading}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {resolved.map((section) => (
        <section key={section.number} id={sectionId(section.number)}>
          <h3>
            <span aria-hidden="true">§</span>
            {section.number} {section.heading}
          </h3>
          {section.body.map((parts, index) => (
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
