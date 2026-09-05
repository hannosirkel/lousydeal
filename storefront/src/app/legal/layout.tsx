/**
 * The measure a legal document is read at.
 *
 * `docs/current/brand.md` §3 gives certificates and legal documents the narrow
 * measure: they are read rather than scanned, and a line of legal prose 720px
 * wide is a line nobody finishes.
 *
 * A layout rather than a class on each page, so the four documents cannot
 * disagree about their own width.
 */

import type { ReactNode } from "react";

export default function LegalLayout({ children }: { readonly children: ReactNode }) {
  return <div className="legal">{children}</div>;
}
