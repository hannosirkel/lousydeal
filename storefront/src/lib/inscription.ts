/**
 * The render-time half of contract §5's inscription filter.
 *
 * §5 requires stripping markup, URLs, bare domain names, email addresses and
 * phone numbers **"at entry and again at render"**. This row builds the render,
 * so this is that half. The entry half is LD-02's, with the checkout field.
 *
 * **It is a mechanical filter, not a moderation policy.** §5 draws that line
 * explicitly: this exists so a public certificate cannot become a free
 * billboard or a phishing surface, and it makes no judgement about what
 * anybody wrote. Moderation is a legal-gate question and is somebody's
 * decision, not a regular expression's.
 *
 * Doing it at render as well as at entry is not belt-and-braces. §5 also
 * requires that an operator can sanitise or blank an inscription later
 * *without reissuing the certificate*, which is only possible if the rendered
 * document is derived every time — and a derivation that trusts what it was
 * given is not a filter.
 */

/*
 * The rules below are character-for-character the same as the ones in
 * `backend/src/modules/deal/inscription.ts`, and
 * `backend/tests/inscription-filter.test.ts` compares the two.
 *
 * There is no package shared between the two workspaces -- the backend emits
 * CommonJS under `ts-node`, this one is ESM under Next -- and §5 asks for a
 * pass at entry and a pass at render regardless, so the rules are duplicated
 * on purpose and held identical by a test rather than by hope. The sentinels
 * are what the test slices between; the prose above them is each file's own.
 *
 * Edit one, edit both, and add the case to
 * `tests/fixtures/inscription-cases.json` that proves what changed.
 */

/**
 * §5's two lengths, and the checkout field's `maxLength`.
 *
 * **Outside the shared region on purpose.** The backend has its own copy under
 * its own name (`DEAL_INSCRIPTION_LIMITS`), and neither is the authority:
 * `tests/fixtures/inscription-cases.json` is, and both suites assert their
 * constant against it. The numbers are counted *after* filtering, which is what
 * makes 120 a limit on what appears on the certificate rather than on what was
 * typed.
 */
export const INSCRIPTION_LIMITS = {
  displayName: 60,
  dedication: 120,
} as const;

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
