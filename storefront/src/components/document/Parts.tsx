/**
 * Renders what `resolveText` returns: literal text, and the named gaps left by
 * unconfigured fields.
 *
 * **One component, because decision `004`'s rendering rule is one rule.** The
 * footer and the legal documents each had their own copy and they had already
 * diverged — one wrapped every literal run in a `<span>` and the other did not,
 * so the same substitution produced different markup on different pages. A
 * rule about how a missing legal detail appears is not a rule to keep two of.
 *
 * A gap is `--stamp` because an incomplete legal notice is an error state, and
 * the bracketed uppercase label carries the meaning on its own, so the colour
 * is never the only signal.
 */

import { Fragment } from "react";

import type { ResolvedPart } from "../../content/merchant";

export function Parts({ parts }: { readonly parts: readonly ResolvedPart[] }) {
  return (
    <>
      {parts.map((part, index) =>
        part.kind === "text" ? (
          <Fragment key={index}>{part.text}</Fragment>
        ) : (
          <span key={index} className="gap">
            [{part.label} NOT CONFIGURED]
          </span>
        ),
      )}
    </>
  );
}
