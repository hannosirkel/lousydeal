/**
 * The five colours, for the one consumer that cannot read a CSS custom
 * property: the generated social image.
 *
 * **This is the second declared home for a colour, and there are exactly two.**
 * `globals.css`'s `:root` is the first, and `tests/tokens.test.ts` bans a hex
 * literal anywhere else under `src` — a rule worth keeping, because the way an
 * identity of five colours becomes an identity of nine is one component at a
 * time. Satori renders in Node with no stylesheet and no cascade, so
 * `var(--paper)` reaches it as the string `var(--paper)` and paints nothing.
 *
 * The duplication is therefore real and unavoidable. What makes it safe is that
 * `tokens.test.ts` compares every value here against the `:root` declaration it
 * mirrors, so the two homes cannot drift: changing one and not the other fails.
 *
 * Nothing else should import this. A component has the cascade.
 */

export const PALETTE = {
  paper: "#fafaf7",
  paperShade: "#f1f0eb",
  ink: "#141412",
  inkSoft: "#6b6b66",
  stamp: "#b3261e",
} as const;

/** The `:root` custom property each entry above mirrors. */
export const PALETTE_TOKENS = {
  paper: "--paper",
  paperShade: "--paper-shade",
  ink: "--ink",
  inkSoft: "--ink-soft",
  stamp: "--stamp",
} as const;
