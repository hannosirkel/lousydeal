/**
 * The loading state, per `docs/current/brand.md` §4: a single blinking block
 * cursor, no spinner.
 *
 * **Drawn in CSS, not set as a glyph.** `▮` (U+25AE) is not in this typeface —
 * measured against the source files `src/fonts/plex-mono.ts` cites — so a
 * character would render as tofu. The blink stops entirely under
 * `prefers-reduced-motion`.
 *
 * `role="status"` with a visually hidden word, because a blinking rectangle
 * announces nothing on its own and a reader who cannot see it would otherwise
 * be told the page is empty.
 */

export default function Loading() {
  return (
    <main>
      <p role="status">
        <span className="cursor" aria-hidden="true" />
        <span className="visually-hidden">Loading</span>
      </p>
    </main>
  );
}
