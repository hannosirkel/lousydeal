/**
 * The one piece of vector artwork this identity admits: a thin double-ring
 * circle with all-caps text in `--stamp`. `docs/current/brand.md` §3.
 *
 * **At most one per page**, which nothing here can enforce — it is a review
 * question, like the display step.
 *
 * Inline SVG rather than a file, because it inherits the page's typeface and
 * its one colour from CSS rather than baking either into an asset. `role="img"`
 * with a `<title>` gives it the accessible name `brand.md` requires; the text
 * inside an SVG is otherwise announced as loose strings with no indication it
 * is a stamp.
 */

const SIZE = 120;
const OUTER_RADIUS = 57;
const INNER_RADIUS = 51;

export interface StampMarkProps {
  /** One line per row of stamped text; two or three read best. */
  readonly lines: readonly string[];
}

export function StampMark({ lines }: StampMarkProps) {
  if (lines.length === 0) throw new Error("StampMark needs at least one line of text");

  // Centred as a block: the first line sits above the middle by half the total
  // height, so two lines straddle the centre rather than hanging below it.
  const lineHeight = 15;
  const firstOffset = ((lines.length - 1) * lineHeight) / 2;

  return (
    <svg
      className="stamp-mark"
      viewBox={`0 0 ${String(SIZE)} ${String(SIZE)}`}
      role="img"
      aria-label={lines.join(" ")}
      focusable="false"
    >
      <title>{lines.join(" ")}</title>
      <circle cx={SIZE / 2} cy={SIZE / 2} r={OUTER_RADIUS} />
      <circle cx={SIZE / 2} cy={SIZE / 2} r={INNER_RADIUS} />
      {lines.map((line, index) => (
        <text key={line} x={SIZE / 2} y={SIZE / 2 - firstOffset + index * lineHeight} textAnchor="middle">
          {line}
        </text>
      ))}
    </svg>
  );
}
