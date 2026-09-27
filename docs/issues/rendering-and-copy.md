# Rendering and copy

Defects in how pages, the certificate PDF and the copy render, and source
comments that are out of date. See [the issues index](./README.md) for how to
take one up.

- **Characters outside the embedded font print as `?` in the PDF.** This
  affects Chinese, Japanese and Korean text, emoji and right-to-left scripts.
  A fallback font in the image fixes it.
- **An unknown deal page answers 404 with an empty body when scripting is
  off.** `requireTier` calls `notFound()`, and a reader without scripting sees
  nothing.
- **The address note and the dedication preview are not announced.** Both
  appear out of view as the buyer fills the form, and neither has
  `aria-live`.
- **Two cart notices are slightly wrong in edge cases.** Choosing the same
  tier again checks the cart's shape, not its prices, so a stale price stays
  and "already applied" can be said of it. "Could not be re-priced" also
  covers a doubled line that was removed. Neither state is reachable through
  the site's own controls.
- **Share previews are not verified.** No test shows that X and Bluesky
  unfurl the certificate's `og:image`, and there is no `twitter:card` tag.

- **Nothing limits the inscription length where it renders.** The checkout
  and the `edit:inscription` command enforce `DEAL_INSCRIPTION_LIMITS` (60
  and 120 characters). The certificate, its PDF and its OpenGraph card do not
  check length, so a longer stored value prints in full.
- **The checkout's two field groups use different styles.** `.inscription` is
  one rule with its name on it. `.address` still draws as a browser-default
  box. A merch cart shows both. Style `fieldset` once to fix it.
- **Much copy still uses straight apostrophes.** [`brand.md`](../current/brand.md)
  requires U+2019, because React escapes `'` in markup. A test that asserts
  copy with `'` against rendered HTML then passes when the text is absent.
  `GOODS_NOTICE` in `content/merch.ts` and several lines in
  `content/baldrick.ts` are examples; the content files hold many more.
- **Some copy writes "Refunds and Withdrawal"** with a capital W: two
  sentences in `content/checkout.ts`, one in `content/legal/terms.ts` and one
  in `content/legal/privacy.ts`. The page title, the footer and Baldrick write
  "Refunds and withdrawal". The terms and the privacy notice are legal text,
  so change them only with the legal documents' owner.

- **Some source comments are out of date.** The header of
  `storefront/src/lib/medusa-client.ts` says the browser proxy does not
  exist, and `storefront/src/lib/store-payment.ts` says `backend/src/api`
  does not exist; both exist. A comment in
  `backend/src/subscribers/order-placed.ts` calls a merch-only order "complete
  and correct", but the code logs it as an error. Comments in
  `backend/src/config/runtime.ts`, `config/fulfilment.ts`,
  `commerce/tax-model.ts` and the Printful webhook route say that §23 keeps a
  live Printful store or live payment keys out "until the publication gate".
  The gate closed on 2026-09-10, and both are live.
