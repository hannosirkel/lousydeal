/**
 * The frame every surface sits in, per `docs/current/brand.md` §3: a double
 * rule top and bottom, and a small-caps header row with the document title
 * left and its form number and revision right.
 *
 * **The number on the right is a form number, never a transaction number.**
 * `brand.md` has a section on why: `AGENTS.md` forbids publishing a fabricated
 * order, and a purchase-order number on a page nobody ordered is one. Only a
 * page rendered from a real order shows a real serial, and this component
 * cannot produce one.
 *
 * The `<section>` is unnamed on purpose. Naming it makes it a `region`
 * landmark, and a landmark named the same as the `<h1>` it contains has
 * assistive tech announce the title twice -- once as a region, once as the
 * heading. The heading already names this content, and a page carries one
 * document.
 *
 * **All three strings are written naturally and capitalised in CSS**, as
 * `brand.md` §4 requires of every other capitalised surface here: a screen
 * reader and a copy-paste both get words rather than letters.
 */

import type { ReactNode } from "react";

import { DoubleRule, Rule } from "./Rule";

export interface DocumentFrameProps {
  /** Written sentence case; the rendered heading is capitalised by CSS. */
  readonly title: string;
  /** The form's own number, e.g. `Form LD-1`. */
  readonly form: string;
  /** Its revision, e.g. `Rev. 2026-09`. */
  readonly revision: string;
  readonly children: ReactNode;
}

export function DocumentFrame({ title, form, revision, children }: DocumentFrameProps) {
  return (
    <section className="document">
      <DoubleRule />
      <div className="document-header">
        <h1 className="document-title">{title}</h1>
        {/* The separator lives here rather than in every caller's string, so
            one document cannot come out with a different one. */}
        <p className="document-reference">
          {form} · {revision}
        </p>
      </div>
      <Rule />
      {children}
      <DoubleRule />
    </section>
  );
}
