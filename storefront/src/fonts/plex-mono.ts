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
 * ## Provenance
 *
 * IBM Plex Mono, SIL Open Font License 1.1 -- `OFL.txt` beside these files is
 * the notice the licence requires to travel with them. Taken from IBM/plex at
 * tag `v6.4.2`, commit `242c4cccd37e87985a5337815c99b960ef13c65c`, path
 * `IBM-Plex-Mono/fonts/complete/ttf/`. Source SHA-256:
 *
 *   Regular fe11304a5fe956d5744e9b6a246cc83d90425245e75a62230044966ca96a7f50
 *   Italic  8ebe04c8c6cc82f0be19896ddc61d9935cdd0f027b0173c1945b8d247d7dfc2a
 *   Bold    ca403c56931baef307d20ba64b69acb71abcad61f75e66414661d57484b690ec
 *
 * Each was subset and re-flavoured with `pyftsubset` (fonttools) as:
 *
 *   pyftsubset <src>.ttf --flavor=woff2 --layout-features='' \
 *     --unicodes=U+0020-00FF,U+0100-017F,U+2000-206F,U+20AC,U+2122,U+2212,U+2588
 *
 * **Latin-1 alone is not enough here and the range says so.** Latin Extended-A
 * (U+0100-017F) is in the set because Estonian consumer-authority and statute
 * names carry `š` (U+0161) and `ž` (U+017E), which Latin-1 does not hold, and
 * those names appear in the legal documents rather than in decoration. The
 * three cuts come to roughly 48 kB together, against roughly 480 kB unsubset.
 *
 * **`▮` (U+25AE) is deliberately absent**, and so is any need for it: it is
 * not in IBM Plex Mono at all -- measured against the source file above -- so
 * the loading indicator the brand document calls a blinking cursor is drawn in
 * CSS rather than set as a glyph. A character the typeface does not carry
 * renders as tofu, which is the one thing this identity cannot afford.
 */

import localFont from "next/font/local";

/**
 * Exposed as the `--font-mono` custom property rather than a class, because
 * `globals.css` is where every other token lives and a stylesheet cannot read
 * a class name Next generates at build time.
 */
export const plexMono = localFont({
  src: [
    { path: "./IBMPlexMono-Regular.woff2", weight: "400", style: "normal" },
    { path: "./IBMPlexMono-Italic.woff2", weight: "400", style: "italic" },
    { path: "./IBMPlexMono-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-mono",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "monospace"],
});
