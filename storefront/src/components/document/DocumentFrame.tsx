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
 * `aria-label` rather than `aria-labelledby`: labelling by id needs a unique
 * one, `useId` is a hook and this is a Server Component, and a hand-passed id
 * is a prop every caller could get wrong. The title is already the string the
 * label would resolve to.
 */

import type { ReactNode } from "react";

import { DoubleRule, Rule } from "./Rule";

export interface DocumentFrameProps {
  /** All-caps in the rendered output; written sentence case here reads better aloud. */
  readonly title: string;
  /** The form's own number, e.g. `FORM LD-1`. */
  readonly form: string;
  /** Its revision, e.g. `REV. 2026-09`. */
  readonly revision: string;
  readonly children: ReactNode;
}

export function DocumentFrame({ title, form, revision, children }: DocumentFrameProps) {
  return (
    <section className="document" aria-label={title}>
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
