/**
 * The two rules this identity draws, per `docs/current/brand.md` §3: sections
 * are separated by rules rather than boxed, and a document's top and bottom
 * carry a double rule — two 1px lines 3px apart.
 *
 * Both are one `<hr>`, not two stacked elements. A double rule is a single
 * thematic break drawn twice, and rendering it as two `<hr>`s would have a
 * screen reader announce two separators where a reader sees one boundary.
 *
 * `Rule` carries no class: the base `hr` rule is already the single rule this
 * identity draws, and a class with no declarations behind it is a hook for
 * nothing.
 */

export function Rule() {
  return <hr />;
}

export function DoubleRule() {
  return <hr className="double-rule" />;
}
