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
const BARE_DOMAIN = /\b[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?:\/\S*)?/gi;

const EMAIL = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/gi;

/**
 * Seven or more digits with the punctuation a phone number is written with.
 * Seven because a shorter run is a serial, a year or a price, and this filter
 * would rather keep a number than take a sentence apart.
 */
const PHONE = /\+?[\d][\d\s().-]{5,}\d/g;

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
    .replace(PHONE, " ")
    .replace(/\s+/g, " ")
    .trim();

  return stripped === "" ? null : stripped;
}
