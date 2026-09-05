/**
 * The one typeface, self-hosted from files committed beside this module.
 *
 * `next/font/local` rather than `next/font/google`, for two reasons that are
 * not about preference. The Google loader fetches the font over the network
 * during `next build`, and this repository's build runs inside
 * `storefront/Dockerfile` -- a build that reaches a third party is a build
 * that can fail for a reason no commit here caused. And `next/og` needs the
 * font as a byte buffer it can hand to Satori, which the Google loader never
 * exposes; committed files serve the pages and the generated images from one
 * source.
 *
 * ## Provenance, and why the family is not called IBM Plex Mono
 *
 * These files are subsets of IBM Plex Mono, SIL Open Font License 1.1, taken
 * from IBM/plex at tag `v6.4.2`, commit
 * `242c4cccd37e87985a5337815c99b960ef13c65c`, path
 * `IBM-Plex-Mono/fonts/complete/ttf/`. Source SHA-256:
 *
 *   Regular fe11304a5fe956d5744e9b6a246cc83d90425245e75a62230044966ca96a7f50
 *   Italic  8ebe04c8c6cc82f0be19896ddc61d9935cdd0f027b0173c1945b8d247d7dfc2a
 *   Bold    ca403c56931baef307d20ba64b69acb71abcad61f75e66414661d57484b690ec
 *
 * **Subsetting makes them Modified Versions, and OFL 1.1 clause 3 forbids a
 * Modified Version bearing the Reserved Font Name.** The licence defines a
 * Modified Version as a derivative made "by adding to, deleting, or
 * substituting -- in part or in whole -- any of the components of the Original
 * Version, by changing formats", and these are both deleted-from and
 * reflavoured. So the `name` table is rewritten: family `LD Mono`, PostScript
 * `LDMono-<Style>`, with the attribution moved into name ID 10, which is where
 * the OFL FAQ puts acknowledgement of an original. Nothing renders differently
 * -- `next/font/local` emits its own `@font-face` with its own family name and
 * never reads the internal one -- so this costs nothing and removes the one
 * clause subsetting actually trips. `OFL.txt` beside these files is the notice
 * clause 2 requires to travel with them.
 *
 * ## The subset range
 *
 * Rebuilt with `pyftsubset` (fonttools) as:
 *
 *   pyftsubset <src>.ttf --flavor=woff2 --layout-features='' --name-IDs='*' \
 *     --unicodes=U+0020-00FF,U+0100-017F,U+2000-206F
 *
 * Three ranges, each earning its place. **U+0020-00FF** is the Latin the site
 * is written in, and it carries `§` (U+00A7) for the legal documents' numbered
 * sections. **U+0100-017F**, Latin Extended-A, is here because Estonian
 * authority and statute names spell with `š` (U+0161) and `ž` (U+017E), which
 * Latin-1 does not hold, and those names appear in legal prose rather than in
 * decoration. **U+2000-206F** is the general punctuation the prose uses: em
 * dash, ellipsis, and directional quotes.
 *
 * Measured: 359 mapped codepoints per cut, three cuts totalling 49 kB. The
 * comparison that matters is against the same format unsubset -- the same
 * three cuts reflavoured to woff2 without subsetting are 143 kB -- so this is
 * roughly a third, not the tenth a comparison against the 480 kB TTF sources
 * would suggest.
 *
 * **`▮` (U+25AE) is deliberately not in that range**, and neither is any other
 * block glyph: U+25AE is not in IBM Plex Mono at all -- measured against the
 * source files above, whose cmaps hold 983 codepoints and not that one -- so
 * the loading indicator the brand document calls a blinking cursor is drawn in
 * CSS rather than set as a glyph. A character the typeface does not carry
 * renders as tofu, which is the one thing this identity cannot afford.
 */

import localFont from "next/font/local";

/**
 * Exposed as the `--font-mono` custom property rather than a class, because
 * `globals.css` is where every other token lives and a stylesheet cannot read
 * a class name Next generates at build time.
 *
 * **`adjustFontFallback` is off on purpose.** Left at its default,
 * `next/font/local` synthesises a metric-matched fallback from *Arial* and
 * inserts it ahead of whatever `fallback` declares -- so under
 * `display: "swap"` the pre-swap paint, and any failed load, renders this
 * site's ledgers in a proportional face. A dotted leader with a right-aligned
 * figure is the signature component here, and it is exactly what a
 * proportional fallback misaligns before reflowing. Off, the declared
 * monospace stack below is what actually degrades to.
 */
export const plexMono = localFont({
  src: [
    { path: "./LDMono-Regular.woff2", weight: "400", style: "normal" },
    { path: "./LDMono-Italic.woff2", weight: "400", style: "italic" },
    { path: "./LDMono-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-mono",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["ui-monospace", "SFMono-Regular", "monospace"],
});
