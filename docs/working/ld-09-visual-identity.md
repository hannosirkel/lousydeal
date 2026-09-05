# LD-09 — Visual identity and the storefront's visual layer

Give the storefront the identity approved in [`brand.md`](../current/brand.md):
design tokens, document components, every surface LD-01 left as unstyled
scaffolding, four legal documents, and one generated social image — deployed to
both environments, both still gated.

The contract is [`fresh-build.md`](./fresh-build.md). Gates B and C are closed by
the operator's acceptance of [`brand.md`](../current/brand.md); this plan
executes against it. The prompt this plan was derived from is
[`lousyvisual.md`](./lousyvisual.md), and §0 below records where the two differ
and why.

**Slice number.** The contract's §17 list runs LD-00 to LD-08 and calls itself
"approximately like", inviting a better decomposition. This work is not LD-08
launch polish and it is not a feature slice; it is §14's visual phase made
executable, and it runs now, before LD-02, because §14 requires an approved
visual layer before further customer-facing surfaces are built on top of it.

**Execution.** Directly, not through `big-build`. Fifteen rows, one pull request
each.

## Global constraints

These are LD-01's, carried forward unchanged except where noted, because the
failures they encode have not stopped being possible.

1. **Never commit a secret.** `lousydeal` and `deploys` are public and must be
   safe to publish on every commit. No merchant registry code, VAT number or
   bank detail becomes a literal in either repository — decision `004` and §2b.
2. **Nothing that differs between test and live is baked into a built
   artifact.** No `NEXT_PUBLIC_*`. Per-environment values are read server-side
   per request through `src/config/runtime-config.ts`.
3. **One pull request closes one row.** Over 800 changed lines or over 10 files
   needs a named operator override in the pull-request body. Vendored font
   binaries and lockfiles are excluded from the line count and named separately.
4. **Comments explain non-obvious intent, constraints, invariants or
   trade-offs. They do not narrate code.**
5. **Test durable behaviour, not file existence.** A focused test in the same
   commit.
6. **A row's file list stays inside one repository.** Cross-repository work is
   two rows with a stated order.
7. **Global constraint 7 is now spent.** LD-01's storefront was declared
   provisional scaffolding pending Gates B and C. This slice is what replaces
   it. Any file still claiming to be unstyled scaffolding is falsified by the
   row that styles it, and constraint 9 applies.
8. **Run `bash scripts/validate` before declaring a row done.**
9. **A row that falsifies a tracked document carries that document in its
   `Files` list.**
10. **A claim is bounded, cited, or executed. Otherwise it does not go in.**
11. **A claim proven false may be corrected by a maintenance pull request** in
    any file no open row declares.
12. **No component invents brand.** [`brand.md`](../current/brand.md) is the
    authority for every colour, size, word and rule. A surface that needs
    something the document does not give amends the document in the same pull
    request, so the operator reviews the copy as copy rather than finding it in
    a diff.

## 0. Where this plan departs from the prompt, and why

[`lousyvisual.md`](./lousyvisual.md) is the operator's brief. Nine of its
instructions conflict with the contract, the decisions, or the facts. Each is
resolved here rather than silently in an implementation.

| # | The prompt says | This plan does | Because |
| --- | --- | --- | --- |
| 1 | Tailwind theme config | Plain CSS custom properties in one stylesheet | The same prompt forbids new dependencies; the storefront has no Tailwind and no CSS at all |
| 2 | `{COMPANY_LEGAL_NAME}` tokens listed in the PR body | `{merchantLegalName}` placeholders resolved server-side, unconfigured fields rendered as a named visible gap, guarded by a `no-unresolved-placeholder` test | Decision [`004`](../decisions/004-trader-identity-is-runtime-configuration.md) already settled the mechanism |
| 3 | Certificate at `/deal/nr/[publicId]` | Component built now, specimen at `/design/certificate`; LD-02 mounts it at `/done-deals/{slug}` | Contract §5 fixes the URL, the opaque slug, and that the serial never appears in a URL |
| 4 | A `TOTAL VOLUNTARILY WASTED` counter | No counter | `AGENTS.md`: a public counter reports real orders or does not ship. There are no orders |
| 5 | Gift toggle on the tier page | No gift toggle | Gifting is LD-03 and has no backend. A control that does nothing is a lie in a control |
| 6 | Merch upsell on an order-confirmed page | Neither | Merch is LD-04; there is no confirmed-order route in this codebase to style |
| 7 | Link the EU ODR platform | Estonian TTJA and its consumer disputes committee | The ODR platform closed 20 July 2025 under Regulation (EU) 2024/3228, and traders were required to remove the link |
| 8 | Unit tests for component rendering | `renderToStaticMarkup` in `.test.ts` files | The Vitest storefront project is `environment: node`, `tests/**/*.test.ts`; jsdom and testing-library would both be new dependencies the prompt forbids |
| 9 | IBM Plex Mono "via `next/font`" | `next/font/local` over committed OFL font files | `next/font/google` fetches at build time, and `next/og` needs a font buffer the Google loader does not expose. One committed set serves both |

Two further gaps the prompt does not mention: `/cart` and `/checkout` exist, are
customer-facing, and are unstyled — they are rows here. And the checkout consent
checkbox the prompt asks for is also a contract requirement (§23), so it is a
build obligation independent of the legal documents.

**One departure runs the other way.** §23 and §25 place legal, tax and
consumer-compliance work outside the build, after it and before publication. The
operator directed on 2026-09-05 that this slice write the four documents as
finished copy. Row V0 records that as a decision rather than leaving the
contract silently contradicted. The Legal gate is unaffected: it remains an
operator gate that a qualified human reader closes, and nothing publishes until
it does.

## Current repository facts

Verified 2026-09-05 against `main` at `e7d8ef8`. Constraint 9 applies to this
table.

| Fact | Value |
| --- | --- |
| Storefront routes | `/`, `/cart`, `/checkout`, `/api/store/[...path]` — all unstyled |
| Storefront CSS | none; no stylesheet, no font, no `public/` directory |
| Storefront dependencies | `next` 16.3.0, `react` 19.2.8, `@stripe/react-stripe-js`, `@stripe/stripe-js` |
| Vitest storefront project | inline, root `./storefront`, `tests/**/*.test.ts`, `environment: node` |
| Tier handles | `lousy-deal`, `lousy-deal-plus`, `lousy-deal-pro` — `backend/src/commerce/product-model.ts` |
| Prices | $5.00 / $10.00 / $25.00 USD, tax-inclusive; merchant absorbs EU VAT — decisions `007`, `009` |
| Trader identity | Aislopica OÜ, Pihlaka tn 2, Jüri alevik, Rae vald, Harju maakond, 75301, Estonia, `baldrick@lousydeal.com` — §2b. VAT registered; number not supplied. Registry code not supplied |
| Merchant runtime config | **absent** — `runtime-config.ts` declares no `MERCHANT_*` field, and `deploys/lousydeal/base/storefront.yaml:41-50` states so |
| Deployment | both namespaces `Synced`/`Healthy`; digests rewritten on merge to `main` by `scripts/update-gitops-digest.sh` |
| Exposure | five hostnames resolve, all five behind Cloudflare Access; nothing is served unauthenticated |
| Certificates, gifting, merch, counters, Baldrick | **absent** — LD-02 to LD-06 |

## Target exposure

Unchanged by this slice. Both environments stay behind Cloudflare Access; a
merge deploys, and deploying is not publishing. **No row here removes an Access
policy, publishes a hostname, or seeds a live Stripe key.** Live Stripe waits on
the visual work *and* the print-on-demand provider, per the operator's ruling of
2026-09-04.

## Completion criteria

| # | Criterion | Fed by |
| --- | --- | --- |
| 1 | Every route a customer can reach renders in the approved identity | V1–V6 |
| 2 | The checkout carries an unticked express-consent checkbox that gates payment | V5 |
| 3 | The certificate exists as a reviewable artifact at 390px and 1200px | V7 |
| 4 | Four legal documents render, with no unresolved placeholder and a named gap where a fact is missing | V8–V12 |
| 5 | The home page has a 1200×630 social image from the same tokens | V13 |
| 6 | Both environments run the new storefront, both still gated | V14 |
| 7 | Gate E is executed against the rendered site, desktop and 390px | V15 |

## Rows

### V0 — Decision `011`: the legal documents are written inside this slice

**Repository:** `lousydeal`.
**Files:** `docs/decisions/011-legal-copy-drafted-in-the-visual-slice.md`,
`docs/working/fresh-build.md`, `docs/working/status.md`,
`docs/current/brand.md`, `docs/working/ld-09-visual-identity.md` (this file).

- [ ] Record the operator's 2026-09-05 direction that Terms, Refunds &
      Withdrawal, Privacy and Imprint are drafted as finished copy in this
      slice, against §23 and §25 which place them after the build. State what
      does **not** move: the Legal gate stays an operator gate, no agent closes
      it on its own evidence, and publication still waits on it.

The decision record is the truth-maker. Without it §23 and §25 stay in the
repository saying the opposite of what is being done, which is precisely the
failure constraint 9 exists for.

### V1 — Tokens and the typeface

**Repository:** `lousydeal`.
**Files:** `storefront/src/app/globals.css`,
`storefront/src/fonts/plex-mono.ts`,
`storefront/src/fonts/LDMono-Regular.woff2`,
`storefront/src/fonts/LDMono-Italic.woff2`,
`storefront/src/fonts/LDMono-Bold.woff2`, `storefront/src/fonts/OFL.txt`,
`storefront/src/app/layout.tsx`, `storefront/tests/tokens.test.ts`.

- [ ] Serve IBM Plex Mono from committed OFL files through `next/font/local`,
      and declare every token in [`brand.md`](../current/brand.md) §3 as a CSS
      custom property on `:root`. Verified by a test asserting the stylesheet
      declares each named token exactly once, that no colour literal appears
      outside that block, and that `--ink`, `--stamp` and `--ink-soft` each
      meet AA against `--paper` by the WCAG relative-luminance formula — so a
      token nudged later fails the build rather than an audit.

**This row also installs the base element styles**, and that is deliberate
rather than scope creep: a stylesheet of custom properties nothing consumes
leaves every page unstyled until V3, and the elements it sets — headings,
lists, links, rules, tables, form controls, focus — are the layer every later
row builds on rather than re-solves. It restyles the three surfaces LD-01
already serves, which is what the slice is for.

Three cuts, not four: 400, 400 italic and 700. The 500 the prompt asked for
earns nothing in an identity whose emphasis is caps and letter-spacing.

`OFL.txt` ships beside the files because the licence requires the notice to
travel with them. **The family is renamed to `LD Mono` and the files with it**:
subsetting makes them Modified Versions, and OFL 1.1 clause 3 forbids a
Modified Version bearing the Reserved Font Name. `next/font/local` emits its
own `@font-face` family and never reads the internal one, so this costs
nothing.

**The TTFs the image renderer needs are V13's, not this row's.** Satori, which
backs `next/og`, reads TTF, OTF and WOFF and **not** WOFF2, so the web files
cannot serve it — but the runtime read is `readFile(join(process.cwd(), …))`,
which Next's file tracing cannot follow, so those files have to reach the
image through `storefront/public/` and a `COPY` the Dockerfile does not yet
carry. That is three more files and a Dockerfile change; putting them here
would have pushed this row over the file bound for a capability it does not
use.

### V2 — Chrome: masthead, footer, and the merchant configuration behind it

**Repository:** `lousydeal`.
**Files:** `storefront/src/components/document/Masthead.tsx`,
`storefront/src/components/document/Footer.tsx`,
`storefront/src/content/merchant.ts`,
`storefront/src/config/runtime-config.ts`, `storefront/src/app/layout.tsx`,
`storefront/tests/runtime-config.test.ts`,
`storefront/tests/merchant.test.ts`.

- [ ] Add the `MERCHANT_*` runtime configuration and the placeholder resolver
      decision `004` specifies, and render the masthead and footer on every
      page. Verified by a test asserting that a resolved value substitutes,
      that an unconfigured value renders the named gap rather than the token or
      a blank, and that no `MERCHANT_*` field reaches `ClientRuntimeConfig`.

Trader identity is server-side only. It is public information, and it still does
not belong in the browser bundle: `ClientRuntimeConfig` names each published
field on purpose, and this row adds none.

This row falsifies `runtime-config.ts`'s own header, which states there is no
`MERCHANT_*` field and why. Constraint 9: it is in the Files list.

### V3 — Document components

**Repository:** `lousydeal`.
**Files:** `storefront/src/app/globals.css`,
`storefront/src/components/document/DocumentFrame.tsx`,
`storefront/src/components/document/LedgerRow.tsx`,
`storefront/src/components/document/Rule.tsx`,
`storefront/src/components/document/FinePrint.tsx`,
`storefront/src/components/document/StampMark.tsx`,
`storefront/src/components/document/Button.tsx`,
`storefront/src/lib/money.ts`,
`storefront/tests/document-components.test.ts`,
`storefront/tests/money.test.ts`.

- [ ] Build the six motifs of [`brand.md`](../current/brand.md) §3 and the one
      money formatter every surface shares. Verified by tests rendering each
      component with `renderToStaticMarkup` and asserting the semantics rather
      than the classes: `LedgerRow` emits `dl`/`dt`/`dd`, `StampMark` carries an
      accessible name, `Button` renders a real `button` or `a`, and the
      formatter turns the Store API's own amount into a currency string
      without floating-point drift.

The ledger is the signature component and the accessibility risk: a dotted
leader is decoration, so it is drawn by a border on a pseudo-element and never
by characters a screen reader would read aloud.

`money.ts` exists because three surfaces format the same amount, and its units
are not what they look like. **They are major units, not cents.** Medusa is
seeded with `amountMinor / 100` (`backend/src/scripts/seed-product.ts:122`), so
a five-dollar tier is stored as `5`; the read path does not rescale it either
(`node_modules/@medusajs/pricing/dist/services/pricing-module.js:238-240` sets
`calculated_amount` to `parseFloat(calculatedPrice.amount)`). This row's text
said "minor units" and "cents" until V3 was implemented and disproved it.

The row edits `globals.css` because the six motifs need styles and this
repository has one stylesheet by decision — no Tailwind, no CSS modules. That
file is declared by V1 as well; both rows write to it, and neither is the sole
author.

### V4 — Home

**Repository:** `lousydeal`.
**Files:** `storefront/src/app/page.tsx`,
`storefront/src/components/document/TierTable.tsx`,
`storefront/src/components/document/OrderForm.tsx`,
`storefront/src/lib/tier-rows.ts`, `storefront/src/content/home.ts`,
`storefront/src/app/globals.css`, `storefront/tests/home-page.test.ts`,
`docs/current/brand.md`.

- [ ] Render the home page as `FORM LD-1` per [`brand.md`](../current/brand.md)
      §4: masthead, offer ledger, tier table, terms-of-offer fine print. Keep
      the existing server action and cookie behaviour exactly as LD-01 left it.
      Verified by a test asserting the three tiers render as table rows with
      their prices and `$0.00` values, and that the add-to-cart form still
      posts a `variantId`.

The tier table is a real `<table>`, and below 640px each row becomes a stacked
ledger block through CSS alone — no second markup tree, no JavaScript, no
duplicated content for a screen reader to read twice.

The page's mapping lives in `src/lib/tier-rows.ts` and its purchase control in
`OrderForm`, both because the page itself cannot be rendered outside a request
— it awaits `connection()` and `cookies()`. A test that rebuilds the mapping
and then asserts a renderer echoed it is asserting a copy, and passes while the
page swaps two columns.

Its copy is in `src/content/home.ts` for the reason `004` gives about the
trader line: copy the operator will want to change should be changeable by
editing content. **No price is written there** — every figure on the page is
formatted from what the Store API returned, so there is no second copy to
drift, and `tests/store-cart.test.ts` forbids one anyway.

The terms-of-offer block ships without the links [`brand.md`](../current/brand.md)
§4 gives it. Those four routes arrive with V8–V11 and V12 adds the links, the
same deferral the footer's legal column already carries.

### V5 — Tier page

**Repository:** `lousydeal`.
**Files:** `storefront/src/app/deal/[handle]/page.tsx`,
`storefront/src/content/deal.ts`, `storefront/src/lib/tier-rows.ts`,
`storefront/src/components/document/TierTable.tsx`,
`storefront/src/components/document/Quotation.tsx`,
`storefront/src/app/not-found.tsx`,
`storefront/tests/tier-page.test.ts`, `storefront/tests/home-page.test.ts`,
`docs/current/brand.md`.

- [ ] Render `/deal/[handle]` as a quotation, with the tier's ledger, the
      more expensive tiers under `UPGRADES AVAILABLE`, the acquire button, and
      the withdrawal fine print. An unknown handle is a 404, not an empty
      document. Verified by a test asserting the upgrade list for the cheapest
      tier holds the other two and for the most expensive holds none, and that
      an unknown handle raises the not-found path.

The lookup by handle, the upgrade list and the tier's path go in
`src/lib/tier-rows.ts` beside V4's mapping rather than in `medusa-client.ts`:
they are decisions about what the page shows, not about the transport, and the
page cannot be rendered outside a request so they have to be callable on their
own to be tested at all.

`TierTable.tsx` is here because the tier name in the home page's table becomes
the link to this route. V4's review had found `TierRow.handle` dead and removed
it, guessing this row would want it; what this row wants is the *path*, so the
row carries `href` from `tierPath()` instead and the handle stays where it
belongs.

**`not-found.tsx` is here because this row makes a 404 reachable.** It is the
first route that can produce one, and without the file Next serves its own —
an empty document under server rendering, filled in by client JavaScript, in
the UA's serif, with a `prefers-color-scheme: dark` block. Three separate
`brand.md` rules broken by a framework default. `error.tsx` and `loading.tsx`
are the same gap and are **V5b**, below; they predate this row, since the home
page could already throw.

**The withdrawal notice ships without the link `brand.md` §4 gives it.** V10
builds the route and **V12 adds the link** — its checkbox and `Files` list now
name `content/deal.ts`, which they did not, so the link had no owner at all.

**The `addToCart` action is a second copy of the home page's.** The two bodies
are byte-identical, and the cookie name, its four attributes, the quantity and
the redirect target must now stay in step across two files with nothing
guarding them. **V6 shares it** — it owns `cart/page.tsx` and
`checkout/page.tsx`, which already import `CART_ID_COOKIE` from the home
page's route module, so it is the row that can move the constant somewhere
sensible at the same time.

### V5b — The system pages

**Repository:** `lousydeal`. **Runs before V6.**
**Files:** `storefront/src/app/error.tsx`,
`storefront/src/app/global-error.tsx`, `storefront/src/app/loading.tsx`,
`storefront/src/app/globals.css`, `storefront/tests/system-pages.test.ts`,
`docs/current/brand.md`.

- [ ] Render the error and loading states as
      [`brand.md`](../current/brand.md) §4's system-pages table describes them:
      `PROCESSING ERROR` as a document, and a single blinking block cursor
      drawn in CSS rather than set as a glyph. Verified by a test asserting
      each against the strings `brand.md` itself carries.

**This row exists because the plan never had one.** `brand.md` §4 has specified
three system pages since Gate C, and the row that should have built them was
never written — V5's review found it while finding the 404. The 404 itself is
V5's, because V5 is what made one reachable.

**`notFound()` from a dynamic route delivers an empty body, and this row
accepts it.** Measured on the built server: a URL matching no route
(`/nonexistent`) server-renders the whole document, masthead and footer
included; `notFound()` thrown from `/deal/[handle]` returns
`<html id="__next_error__">` with an empty body and the document only in the
flight payload. The shell is flushed before the throw and Next cannot rewind a
started response.

**One hypothesis was tried and disproved.** Moving the decision into
`generateMetadata`, which runs before the page renders, changes nothing:
measured, `/deal/nope` still returns the error shell with an empty body while
`/deal/lousy-deal` renders normally. The two shapes that would fix it are both
barred here — `generateStaticParams` with `dynamicParams: false` needs the tier
list at build time, which decision `002` forbids baking into an image, and a
middleware check needs the Store API and its credential at the edge.

So it is **accepted, with its blast radius stated**: one route, one condition,
readers without JavaScript, status still 404, and every reader with JavaScript
sees the right document.

**That sentence was false for as long as V5b's `loading.tsx` was on `main`,
and the row that wrote it is the row that falsified it.** A Suspense fallback
at the app root made every route flush its shell immediately, so the status
was committed before any page rendered: measured, `/` served masthead, cursor
and footer and nothing else without JavaScript, `/deal/nope` answered **200**,
and a store outage answered 200 as well. Not one route and not one condition —
every route, every request, every reader without JavaScript. V5c removes the
file and re-measures; the guard against its return is in
`tests/system-pages.test.ts`.

V15's Gate E confirms it has not widened, **by fetching from a built server
with scripting disabled** rather than by rendering components.

`error.tsx` must carry `"use client"`: a React error boundary cannot be a
Server Component. That is the third exception to §6's no-client-JavaScript
rule, after the consent checkbox and the Stripe element, and it is a framework
requirement rather than a choice — so it amends `brand.md` §6 rather than
quietly widening it.

### V6a — One cart action, in one place

**Repository:** `lousydeal`.
**Files:** `storefront/src/lib/cart-actions.ts`,
`storefront/src/lib/store-session.ts`, `storefront/src/app/page.tsx`,
`storefront/src/app/deal/[handle]/page.tsx`,
`storefront/src/app/cart/page.tsx`, `storefront/src/app/checkout/page.tsx`,
`storefront/tests/cart-actions.test.ts`.

- [ ] Share the `addToCart` Server Action, which V4 and V5 each carry a
      byte-identical copy of, and move `CART_ID_COOKIE` out of the home page's
      route module, which three other files import it from. Verified by a test
      asserting the cookie's attributes as one object, that the action refuses
      a submission with no variant, that it exports exactly one function, and
      that the quantity is not read from the form.

**Split out of V6 because it is a different responsibility and would have put
that row over the file bound.** Two Gate D reviews flagged the duplication; the
second observed that the objection to sharing — that a `"use server"` module
would couple two routes — did not survive the fact that both routes already
imported a constant from the home page's route module.

**Every export of a `"use server"` module is a POST endpoint.** Next gives each
one a public action id reachable by any visitor with any arguments, which is
why that module exports one function and the cookie constants live beside it
rather than in it.

### V6b — Cart, checkout, and the express-consent checkbox

**Repository:** `lousydeal`.
**Files:** `storefront/src/app/cart/page.tsx`,
`storefront/src/app/checkout/page.tsx`,
`storefront/src/app/checkout/PaymentForm.tsx`,
`storefront/src/content/checkout.ts`,
`storefront/src/components/document/Button.tsx`,
`storefront/src/lib/checkout-rules.ts`, `storefront/src/lib/store-cart.ts`,
`storefront/src/app/globals.css`,
`storefront/tests/checkout-consent.test.ts`, `docs/current/brand.md`.

- [ ] Render the cart as `ORDER SUMMARY` and the checkout as `PAYMENT
      AUTHORISATION`, with the total explicit above an unticked consent
      checkbox that the pay control is disabled behind. Verified by a test
      asserting the payment control is disabled while consent is unticked and
      enabled after it is ticked, and that the checkbox defaults to unticked.

The checkbox is the one piece of legal mechanism that is unambiguously build
work: §23 requires *"a checkout that can carry a consent checkbox"*, and VÕS
§ 53(4) makes the waiver depend on the consumer's prior express consent and
acknowledgement. Its wording is fixed by
[`brand.md`](../current/brand.md) §4 and moves only with the legal documents.

Disabling the control is the guard a customer sees; it is not the guard that
matters legally, because a disabled button is a client-side fact. This row does
not claim otherwise, and no server-side enforcement is added here — the order is
created by Medusa from a cart this storefront does not gate. That is recorded,
not fixed, and it belongs to whichever row wires consent into the order record.

**The consent gate is checked twice and asserted on rendered markup.**
`payDisabled` is a function in `src/lib/checkout-rules.ts` that the component
calls, and `handleSubmit` refuses without consent as well — `disabled` alone is
one attribute between an unticked box and a completed order, and
`form.requestSubmit()` ignores it. The checkbox also carries `required`. The
suite renders the real control with `@stripe/react-stripe-js` mocked, which is
possible because nothing under test touches Stripe.

`Button` gains a `disabled` prop, on the button branch only: a disabled link is
not a thing HTML has, and `<a aria-disabled>` is still focusable and still
followed. `store-cart.ts` gains the cart's own `total`, optional for the same
reason `StoreRegion.countries` is — the live endpoint answers with it and the
suite's fixtures do not — because summing the lines here would be a second
computation of a figure the API already gives.

### V7 — Certificate, and its specimen

**Repository:** `lousydeal`.
**Files:** `storefront/src/components/document/Certificate.tsx`,
`storefront/src/lib/certificate-model.ts`, `storefront/src/lib/inscription.ts`,
`storefront/src/lib/money.ts`,
`storefront/src/content/certificate.ts`,
`storefront/src/app/design/certificate/page.tsx`,
`storefront/src/app/globals.css`, `storefront/tests/certificate.test.ts`,
`docs/current/brand.md`.

- [ ] Build the certificate against a typed model — inscription, tier, amount,
      serial, issue date, layout version — and render one specimen record at
      `/design/certificate`. Verified by a test asserting the empty-inscription
      case renders "the bearer" and looks deliberate rather than truncated, and
      that the specimen carries its specimen notice.

`certificate-model.ts` is a type and a fixture, not a data source. Contract §5
requires that a rendered certificate is always derived and never the only copy,
and that an issued certificate keeps the layout version it was issued under —
so the model carries the version from the first render, before there is anything
to version.

**The specimen is not at a `/done-deals/` URL.** A fabricated deal must never
occupy an address a real deal could have. `/design/` is a design surface and
says so, the certificate says so on its own face, and the route carries
`noindex, nofollow` so that stays true after Access comes off.

**The inscription is filtered at render, not only at entry.** §5 asks for both
in those words, and this row builds the render — `sanitiseInscription` strips
markup, script and style bodies, URLs, bare domains, email addresses and phone
numbers, and returns `null` when nothing is left. It is a mechanical filter
against the page becoming a billboard or a phishing surface, which is how §5
describes it, and it is not moderation: that is a legal-gate decision and not a
regular expression's.

**The layout field is recorded, not dispatched on.** §5 wants a redesign to be
additive, and nothing reads the field yet, so a layout 2 could still restyle
every layout 1 certificate. LD-02 issues the first real certificate and is
where the field starts carrying weight; the row that adds a second layout is
the row that has to branch on it. Stated rather than implied.

`money.ts` exports its thousands grouping so the serial uses it. Two figures on
one document must not be grouped by two rules, and `toLocaleString` moves with
the runtime's ICU data — the reason that file gives for not using it.

### V8 — The legal document shell, proven on the imprint

**Repository:** `lousydeal`.
**Files:** `storefront/src/content/legal/types.ts`,
`storefront/src/content/legal/imprint.ts`,
`storefront/src/components/document/LegalDocument.tsx`,
`storefront/src/app/legal/layout.tsx`,
`storefront/src/app/legal/imprint/page.tsx`,
`storefront/src/components/document/Parts.tsx`,
`storefront/src/components/document/Footer.tsx`,
`storefront/src/app/globals.css`,
`storefront/tests/no-unresolved-placeholder.test.ts`,
`docs/current/brand.md`.

- [ ] Render a legal document from structured content — numbered sections, a
      table of contents, the closing line and date — and ship the imprint as
      the first one. Verified by a test that walks **every** legal content file
      in the directory, resolves it against a configuration with all fields
      present and again with all absent, and fails on any surviving `{token}`
      in either pass.

The guard test is written here, against the smallest document, so the three long
ones land under a check that already works rather than beside one written to fit
them. **It walks the directory rather than a list**, because a guard that names
its files stops covering the ones added after it — V9, V10 and V11 are covered
the moment they land, without editing the test. Recursively, in both
extensions, and every exported document rather than the first: Gate D got a
document past the first version of that walk in each of those three shapes.

`Parts` is one component now. The footer and the legal documents each had their
own copy of decision `004`'s rendering rule and the two had already diverged,
which is one copy too many for a rule about how a missing legal detail
appears.

The imprint is where an unconfigured field is most dangerous: an imprint quietly
missing its registration number reads as a complete legal notice and is not one.
Decision `004`'s named-visible-gap rule is executed here, not described.

### V9 — Terms of Service

**Repository:** `lousydeal`.
**Files:** `storefront/src/content/legal/terms.ts`,
`storefront/src/app/legal/terms/page.tsx`,
`storefront/src/components/document/Footer.tsx`.

- [ ] Draft the Terms: seller identity; that the customer receives a numbered
      digital certificate and nothing else of value, and that this is the
      point; that the displayed price is the price charged and includes VAT
      where it applies; order process; immediate delivery; acceptable use of
      public inscriptions and the seller's right to remove one; liability
      limits; governing law Estonia; and Estonian consumer-dispute information
      naming the TTJA and its consumer disputes committee, with no ODR link.

Every factual claim is checked against this repository before it is written:
prices from `product-model.ts`, the VAT reading from decision `009`, the
inscription rules from contract §5, the trader identity from §2b through the
resolver. **A clause describing a mechanism that does not exist yet is written
in the present tense only if the mechanism ships before publication**, and any
such clause is named in the pull request so the Legal gate sees it — the
certificate itself is LD-02, and terms that promise one must not outlive an
unpublished site.

### V10 — Refunds & Withdrawal

**Repository:** `lousydeal`.
**Files:** `storefront/src/content/legal/refunds.ts`,
`storefront/src/app/legal/refunds/page.tsx`,
`storefront/src/components/document/Footer.tsx`.

- [ ] Draft the withdrawal policy: the 14-day statutory right of **VÕS
      § 56(1)**, the digital-content exception of **§ 53(4) p 7¹**, and all
      three conditions that exception requires — including the trader's
      § 55(1)–(2) confirmation, which the checkout alone does not satisfy.

**The clause is verified, and it has a third condition this plan did not
account for.** Read 2026-09-05 from Riigi Teataja's own public API —
`https://www.riigiteataja.ee/public-api/api/v1/akt/106072023116/blob-html`,
which serves the consolidated text the site's JavaScript application renders;
the `/akt/…`, `/consolide`, `/print` and `.pdf` URLs all return the
application shell instead. § 53(4) p 7¹ excludes the right only where supply
began before the period ended, **and** the consumer gave express prior consent
with an acknowledgement of losing the right, **and** *ettevõtja on andnud
käesoleva seaduse § 55 lõigetes 1 ja 2 nimetatud kinnituse* — the trader has
given the § 55(1)–(2) confirmation.

§ 55(1) requires that confirmation **on a durable medium**, no later than when
supply begins; § 55(2) requires it, for digital content, to state that the
consumer gave the § 53(4) p 7¹ consent.

**So the checkbox alone never excludes the right.** Until an order
confirmation goes out on a durable medium saying so, the 14-day right stands —
and that email is LD-02. This row writes the position accurately, which means
writing a document describing a mechanism the site does not yet have. That is
named in the pull request and carried to the Legal gate rather than softened,
because the alternative is a page overstating what the buyer gave up.

The statutory paragraph is straight prose with no flourish. A `NO REFUNDS` stamp
may appear on this page **only** below the consent explanation, where it is
true, and never above it.

### V11 — Privacy Policy

**Repository:** `lousydeal`.
**Files:** `storefront/src/content/legal/privacy.ts`,
`storefront/src/app/legal/privacy/page.tsx`,
`storefront/src/components/document/Footer.tsx`.

- [ ] Draft the GDPR notice: controller identity; what is processed and why;
      legal bases; retention; processors actually in the path; international
      transfers; data-subject rights; and the complaint right to the Estonian
      Data Protection Inspectorate.

**Only processors that actually process something are named.** Stripe and
Cloudflare are in the path today. Printful is not, because there is no merch;
listing it would describe processing that does not happen. Adding it is LD-04's
row.

Cookies: the cart id and Stripe's own, both strictly necessary, no analytics.
That is stated plainly and no consent banner is added — §24's analytics work is
LD-08's, and a banner for cookies nobody sets is a dark pattern in reverse.

### V12 — Footer links and the legal index

**Repository:** `lousydeal`.
**Files:** `storefront/src/components/document/Footer.tsx`,
`storefront/src/app/legal/page.tsx`,
`storefront/tests/legal-routes.test.ts`.

- [ ] Link all four documents from every page and give `/legal` an index, and
      add the link from the tier page's withdrawal notice that
      [`brand.md`](../current/brand.md) §4 gives it. Verified by a test
      asserting each link resolves to a content file that exists.
- [ ] Build the footer's remaining two columns — LEGAL and COMPANY — so the
      footer is the three-column block [`brand.md`](../current/brand.md) §4
      specifies rather than a single trader line.

**The second checkbox exists because V2's review found the column had no
owner.** V2 ships the trader line and defers the LEGAL column, correctly: its
four links have no routes until V8–V11. But the COMPANY column was folded
silently into that line and named by no row, so the three-column footer would
have quietly never arrived.

Folded out of V9–V11 so three copy-review rows carry copy and one structural row
carries structure, which is what §13's "do not bury copy review inside a
frontend PR" asks for in the other direction too.

### V13 — The social image

**Repository:** `lousydeal`.
**Files:** `storefront/src/app/opengraph-image.tsx`,
`storefront/src/app/icon.svg`, `storefront/src/app/layout.tsx`,
`storefront/public/fonts/IBMPlexMono-Regular.ttf`,
`storefront/public/fonts/IBMPlexMono-Bold.ttf`, `storefront/Dockerfile`,
`storefront/tests/opengraph.test.ts`.

- [ ] Render a 1200×630 social image for the home page from the same tokens,
      with the offer ledger as its content, and set the metadata that points at
      it. Verified by a test asserting the route produces a PNG of those exact
      dimensions.

`metadataBase` is per-environment and therefore never a literal: it is derived
from the request host, like every other environment-specific value in this
storefront. Certificate images wait for LD-02, when there is a certificate.

**This row is where `storefront/public/` first exists**, and the Dockerfile
says what that costs: its runtime stage carries no `COPY` for the directory
and states that "a row that adds static assets adds this line with them". A
`public/` that a build never copies is a font the image renderer cannot open
at runtime, and `next build` would not notice.

`icon.svg` replaces the default favicon with the stamp mark. It is the one other
piece of vector artwork the identity admits, and it is the same SVG.

### V14 — Merchant configuration in both environments

**Repository:** `deploys`. **Runs after V2 merges, before V15.**
**Files:** `deploys/lousydeal/base/storefront.yaml`,
`deploys/lousydeal/overlays/live/kustomization.yaml`,
`deploys/lousydeal/overlays/test/kustomization.yaml`,
`deploys/lousydeal/README.md`.

- [ ] Supply every `MERCHANT_*` value the storefront reads, in both overlays,
      so no legal document renders a gap in either environment. Verified by
      rendering both overlays and asserting each variable is present and
      non-empty.

`storefront.yaml`'s existing comment states that the storefront reads exactly
three variables and that there is no `MERCHANT_*` field "per that file's own
header". V2 falsifies it; constraint 9 puts it in this row's Files list.

**Which values may be committed here is an operator decision, not this row's.**
Legal name, address and contact are §2b public facts. Registry code and VAT
number are explicitly *not* covered by that decision and are each their own
call — they either come as committed configuration or through the sanctioned
secrets path, and the operator says which before this row is written. Until
they do, those two fields render as named gaps, which is the designed
behaviour and not a defect.

### V15 — Gate E, and the record

**Repository:** `lousydeal`.
**Files:** `docs/working/status.md`, `docs/current/brand.md`,
`docs/working/ld-09-visual-identity.md`, `AGENTS.md`.

- [ ] Fetch every route from a built server **with scripting disabled**, and
      record the status and the served body for each. V5b shipped a change
      that blanked every page and turned a 404 into a 200 while the whole unit
      suite stayed green; nothing that renders components in isolation can
      catch that class of defect.
- [ ] Run the site, inspect every surface at desktop width and at 390px,
      exercise add-to-cart and the consent checkbox, and compare against
      [`brand.md`](../current/brand.md). Record the result, the date and what
      was inspected. Update the resume point.
- [ ] Confirm both environments serve the new storefront and both still refuse
      an unauthenticated request.

A passing unit suite is not visual acceptance — §14 says so directly. This row
produces screenshots and a written comparison, and it is the row that may fail
after everything else is green.

## What this slice does not do

Recorded here so the completion report lists them as deferrals rather than as
loose ends.

| Not done | Belongs to |
| --- | --- |
| The public "total wasted" counter | LD-02, wired to real orders |
| The certificate at `/done-deals/{slug}`, its PDF, and its social image | LD-02 |
| Gift flow and its toggle | LD-03 |
| Merch upsell, and Printful as a named processor | LD-04 |
| Baldrick, and his voice section in `brand.md` | LD-05 |
| Server-side enforcement that consent was given before an order exists | the row that records consent on the order |
| `robots.txt`, sitemap, analytics, performance budget | LD-08 |
| Sharing the `addToCart` action between the home and tier routes | done, V6a |
| Closing the Legal gate | the operator, with a qualified human reader |
| Publishing anything — removing an Access policy, seeding a live Stripe key | after the Legal gate, LD-02, and the print-on-demand provider |

**One of those deferrals became a hard precondition at V10's research.** The
site cannot publish before **LD-02** regardless of the Legal gate, because
VÕS § 53(4) p 7¹ excludes the right of withdrawal only where the trader has
given the § 55(1)–(2) confirmation on a durable medium — the order
confirmation email, which LD-02 builds. Publishing before it exists would mean
a checkout that tells a buyer they have waived a right they have not waived.
See V10.

## OWNER MUST FILL

Collected as they are found; V15 carries the final list into the completion
report.

| Value | Needed by | State |
| --- | --- | --- |
| Registry code | imprint, terms | not supplied — **renders as a named gap on `/legal/imprint` today** |
| VAT number | imprint, terms | registered, number not supplied — **renders as a named gap on `/legal/imprint` today** |
| Whether registry code and VAT number may be committed to `deploys` | V14 | operator decision |
| Hosting arrangement as it should be described to a data subject | V11 | operator confirmation |
| Retention periods for order and inscription data | V11 | operator decision |
