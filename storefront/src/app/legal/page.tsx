/**
 * The `/legal` index.
 *
 * A document like the others — `DocumentFrame` at the narrow measure, a form
 * number, the ledger rows `brand.md` §4 gives a list — rather than a bare list
 * of links. The four entries and their routes come from
 * `content/legal-routes.ts`, which the footer reads too.
 *
 * `await connection()` is `src/app/layout.tsx`'s pattern, and this page needs
 * no merchant field: it names no trader detail, so there is nothing to resolve
 * and nothing that can be a gap.
 */

import type { Metadata } from "next";

import { DocumentFrame } from "../../components/document/DocumentFrame";
import { LEGAL_INDEX, LEGAL_ROUTES } from "../../content/legal-routes";

export const metadata: Metadata = {
  title: LEGAL_INDEX.title,
};

export default function LegalIndexPage() {
  return (
    <main>
      <DocumentFrame title={LEGAL_INDEX.title} form={LEGAL_INDEX.form} revision={LEGAL_INDEX.revision}>
        <p>{LEGAL_INDEX.intro}</p>

        <ul role="list" className="legal-index">
          {LEGAL_ROUTES.map((route) => (
            <li key={route.href}>
              {/* The link is the heading of its own entry: a summary that is
                  also a link makes two targets for one destination, and the
                  second one reads as a repeat to anyone tabbing through. */}
              <a href={route.href}>{route.label}</a>
              <span className="legal-index-summary">{route.summary}</span>
            </li>
          ))}
        </ul>
      </DocumentFrame>
    </main>
  );
}
