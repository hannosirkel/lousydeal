/**
 * Reading §5's two inscription fields off an order.
 *
 * **Where they come from, and why that is a trust boundary.** The storefront
 * writes them onto the cart, and Medusa copies cart metadata to the order. The
 * endpoint it writes them through is `POST /store/carts/:id`, which is public
 * and whose validator accepts any metadata at all —
 * `metadata: z.record(z.string(), z.unknown()).nullish()`
 * (`@medusajs/medusa/dist/api/store/carts/validators.js:11`). So any visitor
 * can put any value under any key on their own cart, and it will arrive here.
 * Nothing read below is trusted because the storefront sent it.
 *
 * **This row validates shape, not content, and that is deliberate.** §5
 * requires markup, scripts, URLs, bare domains, email addresses and telephone
 * numbers to be stripped "at entry and again at render". The render-side pass
 * exists — `storefront/src/lib/inscription.ts`, shipped with LD-09's
 * certificate — and the entry-side pass is C3's. What C3's plan text does not
 * yet say, and what the validator above makes true, is that entry-side
 * filtering has to run **here**, at issuance, and not only in the storefront's
 * checkout form: a filter in front of a public API filters nothing. That is
 * recorded in the plan against C3.
 *
 * The ordering makes the gap unreachable rather than merely small: nothing
 * renders a stored inscription until C5, and C3 lands first.
 */

/**
 * The metadata keys the storefront writes and this reads.
 *
 * Prefixed, because cart metadata is a shared bag: Medusa writes to it, a
 * payment provider may, and an unprefixed `dedication` is a name somebody else
 * can reasonably take. C3 carries the identical two strings on the storefront
 * side — there is no shared package between the two workspaces — and its test
 * pins them to these.
 */
export const DEAL_INSCRIPTION_METADATA = {
  displayName: "lousydeal_display_name",
  dedication: "lousydeal_dedication",
} as const;

/**
 * §5 gives one of these two numbers and calls the other "short".
 *
 * 120 is the contract's, for the dedication. **60 for the display name is this
 * row's choice, not the contract's**: it is what fits on one line of the
 * certificate's `BEARER` row at 390px without wrapping, which is the constraint
 * that actually exists. It is recorded in the plan as a number the brand
 * document should either adopt or replace.
 */
export const DEAL_INSCRIPTION_LIMITS = {
  displayName: 60,
  dedication: 120,
} as const;

export interface Inscription {
  readonly displayName: string | null;
  readonly dedication: string | null;
}

/**
 * Trims, caps, and refuses anything that is not a string.
 *
 * An over-long value is truncated rather than rejected. Rejecting it would
 * throw away a paid-for order's inscription entirely over a length nobody was
 * told about; truncating keeps what the buyer wrote up to the limit the
 * checkout will show them. Whitespace is trimmed **after** the cut so a
 * truncation cannot leave a trailing space on the certificate.
 */
function field(value: unknown, limit: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, limit).trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Both fields off an order's metadata. The empty pair is the expected case, not a failure. */
export function readInscription(metadata: unknown): Inscription {
  const bag = typeof metadata === "object" && metadata !== null ? (metadata as Record<string, unknown>) : {};
  return {
    displayName: field(bag[DEAL_INSCRIPTION_METADATA.displayName], DEAL_INSCRIPTION_LIMITS.displayName),
    dedication: field(bag[DEAL_INSCRIPTION_METADATA.dedication], DEAL_INSCRIPTION_LIMITS.dedication),
  };
}
