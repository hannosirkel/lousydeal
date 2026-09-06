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
 * **This is §5's entry-side pass, and C3c is where it arrived.** §5 requires
 * markup, scripts, URLs, bare domains, email addresses and telephone numbers
 * stripped "at entry and again at render". The render pass is
 * `storefront/src/lib/inscription.ts`, shipped with LD-09's certificate. The
 * entry pass has to run **here** and not in the checkout form, for the reason
 * the paragraph above gives: a filter in front of a public API filters
 * nothing.
 *
 * C2 stored what a buyer typed after checking only its shape. Nothing rendered
 * it — C5 is the first row that will — so no unfiltered inscription ever
 * reached a page, but the stored value was raw and the email C9 builds would
 * have been handed it.
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

/*
 * The rules below are character-for-character the same as the ones in
 * `storefront/src/lib/inscription.ts`, and `tests/inscription-filter.test.ts`
 * compares the two.
 *
 * There is no package shared between the two workspaces -- this one emits
 * CommonJS under `ts-node`, the storefront is ESM under Next -- and §5 asks
 * for a pass at entry and a pass at render regardless, so the rules are
 * duplicated on purpose and held identical by a test rather than by hope. The
 * sentinels are what the test slices between; the prose above them is each
 * file's own.
 *
 * Edit one, edit both, and add the case to
 * `tests/fixtures/inscription-cases.json` that proves what changed.
 */

// >>> shared inscription filter
/**
 * A script or style element **and what is inside it**. Removing only the tags
 * would leave the body as text — `<script>alert(1)</script>` became the
 * inscription `alert(1)`, which is not markup but is still somebody's payload
 * printed on a certificate.
 */
const EXECUTABLE = /<\s*(script|style)\b[^>]*>[\s\S]*?(?:<\s*\/\s*\1\s*>|$)/gi;

/** Anything else angle-bracketed. React escapes it; §5 wants it gone. */
const MARKUP = /<[^>]*>?/g;

/** `https://…`, `www.…`, and a bare `example.com/path`. */
const URLS = /\b(?:[a-z][a-z0-9+.-]*:\/\/|www\.)\S+/gi;

/**
 * A bare host, lower-case only and deliberately so.
 *
 * Case-insensitively this ate any two words joined by a full stop with no
 * space after it: Gate D measured `regrettably.Bought anyway` becoming
 * `regrettably anyway`. A missing space is a typing slip, and §7 tells a buyer
 * their domain names are removed, not their sentences. Requiring a lower-case
 * label after the dot keeps `example.com` and returns the slip.
 */
const BARE_DOMAIN = /\b[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9-]+)*\.[a-z]{2,24}\b(?:\/\S*)?/g;

const EMAIL = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/gi;

/**
 * A candidate telephone number: a run written with the punctuation one is
 * written with. What survives the check below is what is actually removed.
 */
const PHONE_CANDIDATE = /\+?\d[\d\s().-]{5,}\d/g;

/** An ISO date is a date. Somebody writing one on a certificate meant it. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Whether a candidate is a telephone number rather than a quantity or a date.
 *
 * The pattern alone was too hungry: Gate D measured `1 000 000 nothings`
 * losing its number and `2026-09-05 at 14:32:10` losing its date. Neither is a
 * telephone number, and §7 promises a buyer that telephone numbers go — not
 * that arithmetic does. Seven digits is the floor because a shorter run is a
 * year, a quantity or a serial; space-grouped digits are a quantity, because
 * nobody writes a phone number as `1 000 000`.
 */
function looksLikeATelephoneNumber(candidate: string): boolean {
  const trimmed = candidate.trim();
  if (ISO_DATE.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7) return false;
  return trimmed.startsWith("+") || !/\d \d/.test(trimmed);
}

/**
 * The inscription as it may be shown, or `null` when nothing is left to show.
 *
 * `null` is also what an empty string, a whitespace-only string and a string
 * that was entirely a URL all become — the certificate has one no-inscription
 * state and it looks deliberate. Returning `""` instead would leave the bearer
 * row blank with its leader running to the edge, which is the truncated look
 * §5 says an empty inscription must never have.
 */
export function sanitiseInscription(raw: string | null | undefined): string | null {
  if (raw == null) return null;

  const stripped = raw
    .replace(EXECUTABLE, " ")
    .replace(MARKUP, " ")
    .replace(EMAIL, " ")
    .replace(URLS, " ")
    .replace(BARE_DOMAIN, " ")
    .replace(PHONE_CANDIDATE, (match) => (looksLikeATelephoneNumber(match) ? " " : match))
    .replace(/\s+/g, " ")
    .trim();

  return stripped === "" ? null : stripped;
}
// <<< shared inscription filter

/**
 * Filters, caps, trims, and refuses anything that is not a string.
 *
 * **In that order.** Filtering first means the limit counts what will actually
 * appear, not what was typed -- 120 characters of dedication after the URLs
 * come out, which is what §5's figure is a limit on. Capping first would let a
 * buyer spend their allowance on text that was going to be removed anyway.
 *
 * An over-long value is truncated rather than rejected. Rejecting it would
 * throw away a paid-for order's inscription entirely over a length nobody was
 * told about; truncating keeps what the buyer wrote up to the limit the
 * checkout showed them. Whitespace is trimmed **after** the cut, so a
 * truncation cannot leave a trailing space on the certificate.
 */
function field(value: unknown, limit: number): string | null {
  const filtered = sanitiseInscription(typeof value === "string" ? value : null);
  if (filtered === null) return null;
  const trimmed = filtered.slice(0, limit).trim();
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
