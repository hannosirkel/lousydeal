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
`storefront/src/content/legal/imprint.ts`,
`storefront/src/lib/inscription.ts`,
`storefront/tests/legal-terms.test.ts`,
`storefront/tests/certificate.test.ts`.

- [ ] Draft the Terms: seller identity; that the customer receives a numbered
      digital certificate and nothing else of value, and that this is the
      point; that the displayed price is the price charged and includes VAT
      where it applies; order process; immediate delivery; acceptable use of
      public inscriptions and the seller's right to remove one; liability
      limits; governing law Estonia; and Estonian consumer-dispute information
      naming the TTJA and its consumer disputes committee, with no ODR link.

`Footer.tsx` is **not** here: the footer's legal column is V12's, and this row
adds a route rather than a link to it.

**No price appears in the document.** A price written twice drifts, the offer
page's figures come from the Store API, and `tests/store-cart.test.ts` forbids
a currency literal anywhere under `storefront/src` — which includes a legal
content file. So the Terms say what governs a price rather than what one is.

**Gifting is not mentioned.** LD-03 has no backend, and a term about a feature
nobody can use is noise a lawyer has to read and a buyer has to disregard. The
row that builds gifting writes its clause.

Every factual claim is checked against this repository before it is written:
the VAT reading from decision `009`, the inscription rules from contract §5,
the withdrawal position from Riigi Teataja, the trader identity from §2b
through the resolver. **A clause describing a mechanism that does not exist yet is written
in the present tense only if the mechanism ships before publication**, and any
such clause is named in the pull request so the Legal gate sees it — the
certificate itself is LD-02, and terms that promise one must not outlive an
unpublished site.

### V10 — Refunds & Withdrawal

**Repository:** `lousydeal`.
**Files:** `storefront/src/content/legal/refunds.ts`,
`storefront/src/app/legal/refunds/page.tsx`,
`storefront/tests/legal-refunds.test.ts`.

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

The statutory paragraphs are straight prose with no flourish.

**No `NO REFUNDS` stamp is used.** The permission above stands, and this row
declined it: whether the sentence is true depends on whether all three
conditions of § 53(4) p 7¹ were met for a particular reader, and a static page
cannot know. A stamp true for some readers and false for others is the
misleading §23 forbids, and this is the last document on the site to make a
claim that only usually holds.

Four provisions this row read that the earlier research had not reached, all
from the same API path: § 56(2¹), a notice is in time if sent inside the
period; § 56(2²) and § 56(2³), the model form and its regulation; § 56(2⁵), the
consumer bears the burden of proving withdrawal; and § 62, which makes void any
agreement departing from these provisions to the consumer's detriment. The last
is worth stating on a page a buyer reads while already suspicious.

#### What V10's own Gate D changed

The first draft cited redaction `106072023116`, which stopped being law on
**12.07.2024**. Its metadata says so — `kehtivuseLopp`, and
`onHetkelKehtivKuvada = false` — and the row did not check. The in-force text is
`120062026018`, effective **01.09.2026**, and reading it added two provisions
absent from the stale redaction, one of which the site does not comply with.
Every citation is now re-read from the current text.

Three blocking defects, each recorded because each is a way this document could
have misled the reader it exists to protect:

1. **§7 claimed the worthlessness is "stated on every page that sells one".**
   Measured: absent from the cart and the checkout, which is where the sale is
   concluded. This is the identical claim V9's Gate D deleted from the Terms.
   The ban had been written into `legal-terms.test.ts`, so it did not reach a
   second document — it now lives in `no-unresolved-placeholder.test.ts`, which
   walks the directory and so covers documents not yet written.
2. **§4 said "We send it by email" in the unqualified present tense.** It is
   LD-02's email, it does not exist, and it is the third condition — so a
   reader taking §3 and §4 together concluded the right was gone. §4 now says
   we do not send it yet, and §3 says the third condition is missing for every
   order today.
3. **§ 56⁴ and § 54(1) p 13¹, both in force 01.09.2026**, require a withdrawal
   button marked "Taganen lepingust", reachable throughout the period, with a
   confirmation control and a durable-medium receipt — and require telling the
   buyer where it is. **There is no such button.** §5 states that as
   non-compliance rather than omitting it.

Nine further legal findings were fixed: the uncited § 56¹(1)/(4) refund rule;
the missing § 56(1³) start date, without which a buyer cannot compute a
deadline; § 55(2)'s full contents rather than the consent half; § 62¹⁴'s
remedies, and that the election is the consumer's; § 62¹¹/§ 62¹²'s periods and
burden of proof; the § 54(1) p 18 reminder; an unbounded "the only circumstance
in which we will say no"; §2 addressing the right to the reader rather than to
a consumer; and §7's flat "worth nothing is not a defect", which § 62¹⁰ makes
depend on an express and separate agreement the checkout does not collect.

**§5.1 reproduces the model form** rather than naming it, since § 54(1) p 13
makes the form itself pre-contractual information.

Two claims in the row's own commit were false and are corrected: the test count
(442 at the time, not 445 — the third miscount in this slice) and the closure
of gate item 2, which mentioning a form did not achieve.

**Two clauses in the Terms were wrong and this row fixed them**, because a row
that finds a neighbouring document wrong owns the correction: §5 put the
confirmation after supply, where § 55(1) requires it no later than the start of
supply; and §4 did not disclose that the consent is a condition of ordering —
the harsher term appeared only in the document a buyer is less likely to reach.

#### The legal gate list

Recorded here rather than in a commit message. V9's five items were named in
`bcaf378`'s message only, so a qualified reader given this plan — which is how
§23's gate is meant to work — could not see them. Item 2 is struck through
because V10 closed it; the numbering is kept so earlier references resolve.

| # | Item | Raised |
| --- | --- | --- |
| 1 | ~~No telephone number is published.~~ **Closed by V16.** `+372 51 35463`, published in the imprint. | V9 |
| 2 | ~~The model withdrawal form is not provided.~~ Closed by V10 §5.1. | V9 |
| 3 | ~~§ 54(1) p 5 is unstated.~~ **Closed by V17.** Terms §5 states how the certificate is used, that no technical protection measure applies to it, and what it is interoperable with (nothing). | V9 |
| 4 | ~~§ 54(1) p 18 is unstated.~~ Closed by V10 §7. | V9 |
| 5 | ~~§ 62²(2)'s information duty.~~ **Closed by V17.** The checkout now shows § 54(1) p 4, 10 and 11 immediately before the pay control; p 6 was already the ledger row. § 62²(3)'s button wording is fixed too — `PAY_LABEL` is the statute's own formulation, and its sanction is that the buyer is not bound at all. | V9 |
| 6 | ~~The §4/§5 contract-conclusion ordering in the Terms.~~ **Closed by V17.** §4 now says the contract concludes when payment succeeds, which is the moment §5's supply begins, and §5 points back at it. | V9 |
| 7 | ~~No § 56⁴ withdrawal button exists.~~ **Built by V17**, at `/legal/withdraw`: two controls in the statute's own words, the three § 56⁴(2) fields and no reason field, in the footer of every page, working with scripting off. § 54(1) p 13¹'s disclosure is in Refunds §5 and Terms §6. **What remains:** § 56⁴(4)'s durable-medium receipt needs email, which is LD-02's — the page says so and tells the buyer to keep it. | V10, built V17 |
| 8 | The consent is a **condition of ordering** — there is no way to buy without giving up the right. § 56²(9) voids a term hindering the exercise of the right, and § 62 voids departures to the consumer's detriment. Whether this crosses either line is the reader's call. | V10 |
| 9 | ~~Worthlessness departs from § 62⁷(3) p 2.~~ **Answered by drafting.** Refunds §7 declines to rely on § 62¹⁰ at all — it states that we do not treat worthlessness as removing any conformity remedy — so the express separate agreement the subsection would need is not something we claim to have. | V10 |
| 10 | The Estonian annex **has now been read** and §5.1 matches it line for line. What remains: the wording retrieved is the one in force 13.06.2014–26.05.2022, which lapsed the day before the 2021 amendments took effect. Whether a later redaction exists and differs is open. | V10, narrowed by V10a |
| 11 | **LD-02 is a hard precondition for publishing**, independently of this gate: without the § 55 confirmation the third condition is never met for any order. | V9 |
| 12 | **§ 56(1⁶): 14 days or 12 months.** The premise is out of date: V12 shipped the footer and V15 measured the legal links on every page, including the offer page, so the § 54(1) p 12 information *is* given pre-contractually now. Stated in both documents; whether that discharges the duty is the reader's. | V10a, narrowed V17 |
| 13 | The checkout requires the buyer to affirm "I acknowledge that I will lose my right of withdrawal" — an acknowledgement of something that, on this analysis, will not happen for any order placed today. § 53(4) p 7¹ requires that wording, so it is not a defect; but it sits beside item 8 and the reader should see the two together. | V10a |
| 14 | ~~§23 forbids writing these documents inside an LD slice.~~ **Closed by V17.** The instruction is recorded as [decision 011](../decisions/011-legal-documents-inside-ld-09.md), which says why LD-09 is the exception and that §23's gate is untouched. | V10a |
| 15 | **No deletion job exists** for the seven-year accounting record the Privacy Policy states. Nothing in either repository deletes or ages out anything. The obligation is real and nothing has reached it, so the document is not yet false — but it will be, on a fixed date. | V11 |
| 16 | ~~The request log has no configured retention.~~ **Corrected by V11a, closed by V17.** Medusa's log line carries the storefront pod's address, not the visitor's. Privacy §7 states 30 days for ours, and now says outright that Cloudflare keeps its own record under its own retention which we do not control. | V11, closed V17 |
| 17 | **Stripe's `__stripe_mid` is a 365-day device identifier set under this site's own domain**, for fingerprinting. §2 takes the view that it is part of accepting a card payment safely and asks for no consent. ePrivacy Art 5(3) governs any storage on terminal equipment and its exemption is narrow; whether fraud fingerprinting reaches it is contested. The notice states the position and the reason; it does not resolve the question. | V11a |
| 18 | **Stripe is an independent controller for fraud and regulatory checks**, and a processor for the payment. §5 now says both. Whether joint-controller arrangements under Art 26 are required for the first half is the reader's. | V11a |

### V10a — What the second Gate D found

**Files:** `storefront/src/content/legal/refunds.ts`,
`storefront/src/content/legal/terms.ts`, `storefront/src/content/deal.ts`,
`storefront/tests/legal-consistency.test.ts`,
`storefront/tests/legal-refunds.test.ts`,
`storefront/tests/legal-terms.test.ts`,
`storefront/tests/no-unresolved-placeholder.test.ts`.

V10 merged with the defect it was convened to remove still in it, one document
over. **Terms §6 said "and we send that confirmation by email"** — the
unqualified present tense, three sentences after reciting the three conditions,
so a reader of the Terms concluded the right was gone while a reader of Refunds
was told it stands. §5 said the same in the passive, on a line V10 edited and
left. The offer page, which a buyer reads *before* paying, said "you thereby
lose the 14-day right". Three surfaces, three positions, on the one fact the
exception turns on.

**Nothing caught it because every test checked one document against itself.**
The ban existed — in `legal-refunds.test.ts`, scoped to `REFUNDS`, worded
`(?:it|you|the confirmation)`, which does not match "that confirmation".
`legal-consistency.test.ts` now takes the claim as the unit instead of the
file: every surface a buyer can read is collected, including the offer page and
the checkout box, and the rules apply across all of them at once.

**Two other guards were weaker than their names.** The consent test compared
word *coverage*, so Gate D rewrote §4 to "You do not acknowledge anything by
ticking it, and you will not lose your right of withdrawal" — a superset of the
label's vocabulary, saying the opposite — and 459 tests passed. The refund
promise had no guard against acquiring a condition, and "provided you have not
used the certificate" (which § 62 voids) passed. Both now fail on those exact
mutations, verified.

**A false diagnostic was recorded in three places and is corrected.**
`onHetkelKehtivKuvada = false` was given as the tell that a redaction is dead.
It is `false` on the in-force redaction too. The discriminator is `aktiStaatus`
— `KEHTIV` against `KEHTINUD`. V11 would have reused the wrong recipe.

**The Estonian annex was retrievable all along.** `JM_m41_lisa1.pdf` answers an
HTTP error to curl's default user-agent and returns the PDF to a browser's; the
"empty redaction list" offered as evidence is empty for the Law of Obligations
Act as well. §5.1 matches the annex line for line, so gate item 10 narrows to
whether a post-2022 wording exists.

**Four legal corrections.** § 56(1⁶) added to both documents — the 12-month
extension, and the one provision that lengthens the right rather than limiting
it. § 62¹⁴(3) p 2 mistranslated "brought into conformity" as "delivered", which
is a different remedy and would leave a buyer unable to recognise their own
ground. § 62¹²(1) understated the burden, which is supply *in accordance with
§ 62⁶* and not supply at all. § 56²(7) added: where the exception does not
apply, the buyer owes nothing for what was supplied meanwhile. Two qualifiers
that ran in the buyer's favour but were not the law — § 62¹⁴(1)'s
reasonableness limit and § 62¹⁴(5)'s materiality — are now stated.

**§ 56⁴'s tense was itself the defect it describes.** "That is our
non-compliance" is a claim about a site that has published nothing, concluded
no consumer contract and runs Stripe in test mode. There is no breach yet, only
a certain one on opening, and the clause now says that.

### V11 — Privacy Policy

**Repository:** `lousydeal`.
**Files:** `storefront/src/content/legal/privacy.ts`,
`storefront/src/app/legal/privacy/page.tsx`,
`storefront/tests/legal-privacy.test.ts`,
`storefront/tests/browser-storage-disclosure.test.ts`,
`storefront/tests/third-party-disclosure.test.ts`,
`storefront/tests/legal-consistency.test.ts`.

`Footer.tsx` is **not** here. V12 owns the footer's legal column, and this row
adding a link there would have split one change across two rows.

- [x] Draft the GDPR notice: controller identity; what is processed and why;
      legal bases; retention; processors actually in the path; international
      transfers; data-subject rights; and the complaint right to the Estonian
      Data Protection Inspectorate.

**Every fact was measured, and the first measurement was wrong.** A survey of
the data flows ran against a checkout ten commits behind `main` and reported
that the certificate, the inscription filter and five routes did not exist. It
was re-run against `5d13aa4`. Nothing in the document rests on the first pass.

What the measurement found, and why the notice is short: **one cookie**
(`lousydeal_cart_id`, httpOnly, secure, sameSite lax, no `maxAge`, so it ends
with the session); **two form fields**, a country select and the consent
checkbox, which is the whole of what this site's own code receives from a
visitor; **no customer email anywhere**; **no analytics, pixel, beacon, error
reporter, third-party font or CDN**; and **no third party on any route except
the checkout**.

**Three disclosures a template would have missed**, each verified in the
installed code:

  §3  Stripe's `advancedFraudSignals`. `loadStripe` is called without
      `setLoadParameters`, so device fingerprinting is on by default. It is
      the closest thing to tracking on this site.
  §4  the payment record. Medusa retrieves the PaymentIntent with
      `expand: ["payment_method"]` and writes the result into `payment.data`,
      so billing details typed into Stripe's own frame reach this site's
      database having never passed through its code.
  §2  the request log. Medusa installs morgan, `LOG_LEVEL` is set nowhere so it
      defaults to `http`, and `trust proxy` is on — an IP address, user agent,
      referrer and path for every request.

**Only processors that actually process something are named.** Stripe,
Cloudflare and Backblaze. Printful is not, because there is no merch; the
sibling project's Google, Meta and Brevo are not, because none of them is here.
`third-party-disclosure.test.ts` asserts both halves — that each named party is
reachable from the code, and that none of the unnamed ones appears.

**No consent banner, and the document does not pretend otherwise.** One
strictly necessary cookie and no measurement of any kind: there is nothing to
consent to, and a banner for cookies nobody sets is a dark pattern in reverse.
§24's analytics work is LD-08's, and it will need one.

**Two operator answers.** Processing is in the EEA, so §6 states that and
carries the Stripe/Cloudflare transfer clause. The IP logging stays and is
disclosed; the missing deletion mechanism is recorded below rather than
promised in the document.

**Retention states periods, not mechanisms that exist.** Nothing in either
repository deletes or ages out anything — the only expiry that runs is the
cookie ending with the session. The seven-year accounting obligation is real
and nothing has reached it, so §7 states it; the log period is given as a
criterion, which Article 13(2)(a) permits, because the platform's own log
handling is a third repository outside this work.

**The guard is taken from the sibling project**, where it refuses any
`document.cookie` write outside one declared file. It is worth having because
the failure it prevents is silent: a cookie added for a good reason is not a
bug, fails no build, and leaves a privacy notice that has quietly become false.
`third-party-disclosure.test.ts` does the same for hosts and dependencies, so
§2's claim about what the pages load is executed rather than asserted —
constraint 10.

Two build items for the gate list, both about the gap between what the document
states and what runs: **no deletion job exists** for the seven-year accounting
record, and **the request log has no configured retention**. Setting
`LOG_LEVEL=info` in the deploys overlays would suppress the log entirely; that
is V14's repository, not this one.

#### What V11's Gate D found

**The document's most checkable sentence was false.** "This site sets one
cookie" is wrong on the payment page: Stripe.js writes `__stripe_mid` and
`__stripe_sid` under this site's own hostname. Read from `js.stripe.com/v3` —
the writer defaults `expiresIn` to `31536e6` ms and the caller passes
`domain: "." + document.location.hostname`, so `__stripe_mid` is a **365-day**
device identifier and `__stripe_sid` lasts 30 minutes.

**The row had the fact and dropped it.** The plan's own V11 line said "the cart
id **and Stripe's own**", and the draft deleted the second half. Everything
downstream followed: "it ends when you close your browser" was false of the
year-long one, and "there is nothing to consent to" was a conclusion drawn from
an inventory of one. §2 now describes three cookies and gives the reason no
consent is asked for rather than asserting there is nothing to ask about.

**Three more claims did not survive checking:**

1. **§3 said "there is nowhere on this site to type" a name or an email**, and
   contradicted §4 two paragraphs later. `<PaymentElement>` overrides only
   `wallets`, so Stripe's default billing-details fields render inside an
   element this site mounts on its own checkout page.
2. **§2 described a request log this deployment does not produce.** morgan is
   installed and `LOG_LEVEL` is unset, both true — but the store API is reached
   only through this site's own server, whose proxy forwards `content-type`,
   `accept` and `stripe-signature`. With no `x-forwarded-for`, `req.ip` is the
   storefront pod's address. The over-disclosure was harmless and the false
   statement was not.
3. **Backblaze was named as a current processor and holds nothing.** The
   platform repository's backup jobs are nine and none is this shop — the
   Printful test applied inconsistently. Worse, `third-party-disclosure.test.ts`
   *required* the name, so removing the falsehood would have failed the suite.

**Every semantic claim in `legal-privacy.test.ts` survived inversion — eight of
eight.** Each `it()` named a meaning and each assertion matched a fragment that
negation leaves intact. The tests locate a claim's paragraph and throw when it
is absent, so a deletion and an inversion now fail through the same call; the
three lawful bases are bound to their purposes in one string each, because they
share a paragraph and swapping them left it unchanged. All eight verified
failing.

**Two guard bypasses, both closed and both verified.** A cookie written as
`res.cookies.set({ name, value, maxAge })` presents no string to the name scan
and imports nothing from `next/headers`; the same write from a `middleware.ts`
was scanned by nothing at all. And the third-party scan looked for `https?://`,
so a protocol-relative `//fonts.googleapis.com/...` and a
`src={process.env.ANALYTICS_SCRIPT_URL}` both went into `layout.tsx` — every
page, including the legal ones — and passed. The guard checks the shape of the
tag now rather than the spelling of the host.

**The store proxy is declared as a cookie path.** It forwards whatever the
backend sends and strips the `Domain` attribute, which is a route to a browser
that appears nowhere else in the tree. A test pins it to forwarding only, so
§2's count of three stays true.

**Three Article 13 elements were missing** and are now present: 13(2)(e), the
consequence of not providing the data; 13(2)(f), the automated decision Stripe's
fraud check makes, which is live because it can decline a payment with no person
involved; and 13(1)(f)'s means of obtaining a copy of the transfer safeguards.
§5 also stops calling Stripe a pure processor: it acts for itself on fraud and
regulatory checks, which is the same processing §3 already called "Stripe's
own".

**Gate item 16 was wrong about its own premise** and is corrected below: the
platform's log retention is not unknowable. Alloy collects this namespace, Loki
keeps 720 hours, and the redaction stage drops secrets rather than addresses.
§7 states 30 days instead of a criterion.

The header cited two different measurement commits. It is `de0fb6a` now, and
the document title follows `brand.md` §5.

### V16 — The trader identity, published

**Repositories:** `lousydeal` and `deploys`.

The operator settled §2b's open decision on 2026-09-06 and the answer is the
reference project's: **the registry code, the VAT number and the telephone
number are committed, not withheld.**

**The values live in the private inventory, and Orange injects them.**
`orange`'s Application patches all six `MERCHANT_*` names onto the storefront
from `environment.merchant`, exactly as the reference's does for its seven; the
literals in `deploys/lousydeal` are the fallback that patch supersedes. The
first version of this row said the reference "commits these publicly" and
stopped there — true of the fallback, and not of the half that takes effect.

The argument for the fallback carrying real values rather than placeholders is
`deploys/plepic/README.md`'s. Article 6(1) CRD as amended by
Directive (EU) 2019/2161 and VÕS § 54¹ oblige a trader to publish its name,
registered address, contact address and telephone number; Article 5(1)(d) of
Directive 2000/31/EC obliges it to name the register and its code within it. So
each has exactly one correct value, the law's requirement is that it be
*published*, and — in that README's words — "a reserved placeholder in one of
these fields is a legally required disclosure that is wrong rather than a secret
withheld".

**The rule this replaces cited that project and described the opposite of what
it does.** §2b said the VAT number "reaches a page the way the reference
delivers it … never a literal in a repository", citing
`plepic/storefront/src/config/runtime-config.ts:176`. That line is real and
reads the environment variable exactly as described — but the reference writes
the *value* as a literal in `deploys/plepic/base/storefront.yaml`. Reading an
environment variable at runtime is true of both projects and says nothing about
where the value is written. §2b has been amended, and it records the misreading
rather than quietly replacing the rule.

**A sixth merchant field exists now.** `MERCHANT_PHONE_NUMBER` reaches the
resolver, the vocabulary and the imprint — closing gate item 1, which was
§ 54(1) p 2's requirement that a trader publish a telephone number where it has
one. `tests/legal-imprint.test.ts` derives its check from the vocabulary, so a
seventh field must be either published or deliberately excluded rather than
silently forgotten.

Global constraint 2 is untouched: it forbids baking a **per-environment** value
into the artifact, and there is one company, so none of these is
per-environment.

### V12 — Footer links and the legal index

**Repository:** `lousydeal`.
**Files:** `storefront/src/components/document/Footer.tsx`,
`storefront/src/app/legal/page.tsx`,
`storefront/tests/legal-routes.test.ts`.

- [x] Link all four documents from every page and give `/legal` an index, and
      add the link from the tier page's withdrawal notice that
      [`brand.md`](../current/brand.md) §4 gives it. Verified by a test
      asserting each link resolves to a content file that exists.
- [x] Build the footer's remaining two columns — LEGAL and COMPANY — so the
      footer is the three-column block [`brand.md`](../current/brand.md) §4
      specifies rather than a single trader line.

**One list, read by everything that points at a legal document.**
`src/content/legal-routes.ts` holds the four routes, their labels and their
summaries; the footer, the `/legal` index and the offer page's withdrawal link
all read it. It sits beside `content/legal/` rather than inside it because
`no-unresolved-placeholder.test.ts` requires every file in that directory to
export a legal document, and loosening that walk to admit a routing table is
how the next document hides.

**The route test checks the filesystem, not a second list.** A route is
`src/app/<path>/page.tsx`, which is what Next resolves too; comparing
`LEGAL_ROUTES` to a hand-written array of the same strings would agree with
itself forever. It runs both ways — a link with no page fails, and a page under
`src/app/legal/` with no link fails. Both verified by mutation.

**This narrows gate item 12 without closing it.** § 54(1) p 12 requires the
conditions, the time limit and the procedure for withdrawal to be given before
the contract is concluded, and § 56(1⁶) runs the period to 12 months rather
than 14 days where that duty was breached. Until this row nothing on the site
linked the document at all. Whether a footer link and the offer page's link
discharge p 12 is the qualified reader's question, not this row's.

`brand.md` §4 names the footer entry `Privacy` and §5 calls the document
`Privacy Policy`. The link keeps §4's label; the document's own title is V11's.

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

- [x] Render a 1200×630 social image for the home page from the same tokens,
      with the offer ledger as its content, and set the metadata that points at
      it. Verified by a test asserting the route produces a PNG of those exact
      dimensions.

**Next prerenders an `opengraph-image` by default, and it did.** The first
build of this row produced a static card with no offer rows, because the build
can reach no store — and a card baked at build time is baked once for two
environments, which is decision `002`'s rule with a price in it. `connection()`
makes it dynamic, the same marker every other route here uses, and a test now
asserts the marker rather than the symptom.

**The leader is dashed, and the site's is dotted.** Satori rejects
`borderStyle: "dotted"` outright — "Allowed values: solid | dashed" — so the
choice was the nearest thing it renders or a hand-drawn row of glyphs that sets
to a different rhythm at every width. Recorded here rather than left for someone
to find by comparing a share card with the page. At 1200px it reads as dotted.

**`public/fonts/` carries IBM Plex Mono under its own name.** Satori cannot read
woff2, so the route needs a different file from the one the pages use — and the
file it needs is the *unmodified* upstream TTF, which may keep the Reserved Font
Name that OFL 1.1 clause 3 denies the subsets. Two names for one typeface is
what the licence asks for, not an inconsistency.

Both files were fetched at the commit `src/fonts/plex-mono.ts` already records,
and their SHA-256 sums match the ones that file wrote down for the sources it
subsetted. `tests/opengraph.test.ts` re-checks both against that file, so
provenance is executed rather than asserted.

**`src/app/palette.ts` is the second declared home for a colour, and there are
exactly two.** Satori renders in Node with no cascade, so `var(--paper)` reaches
it as a string and paints nothing. `tokens.test.ts` bans hex literals everywhere
else under `src` and now compares every entry in the palette against the `:root`
declaration it mirrors, so the two homes cannot drift.

**The Dockerfile line was the one this row was warned about.** Its runtime stage
carried no `COPY` for `public/` and said "a row that adds static assets adds
this line with them". Satori reads the fonts on the first request, so without it
the route throws ENOENT in production and `next build` says nothing — which is
why the test asserts the Dockerfile line directly.

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

- [x] Fetch every route from a built server **with scripting disabled**, and
      record the status and the served body for each.
- [x] Run the site, inspect every surface at desktop width and at 390px,
      exercise add-to-cart and the consent checkbox, and compare against
      [`brand.md`](../current/brand.md).
- [x] Confirm both environments serve the new storefront and both still refuse
      an unauthenticated request.

**Run 2026-09-05**, against a built server (`next build`, `next start`) and a
stubbed Store API, with Chromium for the widths.

### With scripting disabled

Fourteen routes fetched. Every one serves its whole document — the masthead, the
content and the three-column footer — with no script executed.

| Route | Status | Body |
| --- | --- | --- |
| `/` | 200 | 155 words |
| `/deal/{lousy,worse,worst}-deal` | 200 | 118–121 words |
| `/deal/nope` | **404** | **empty** |
| `/cart`, `/checkout` | 200 | the empty-cart documents |
| `/legal` | 200 | 117 words |
| `/legal/{terms,refunds,privacy,imprint}` | 200 | 297–1459 words |
| `/design/certificate` | 200 | 74 words |
| `/nope-not-a-route` | 404 | the `FORM LD-404` document |

`/deal/nope` is the accepted limitation recorded under V5c: `notFound()` from a
dynamic route delivers the right status and an empty body. The status is the
half that matters and the half V5b broke; the body is the half nothing in this
slice can fix without `generateStaticParams` (barred by decision `002`) or
middleware (barred by credential-at-edge).

**Add-to-cart works with no JavaScript at all.** Posting the offer form as a
browser would — multipart, carrying the `$ACTION_ID` field Next renders —
answered `303`, set `lousydeal_cart_id`, and `/cart` then served *Worse deal
$10.00 · Total $10.00 · Proceed to payment*.

### Three defects, all fixed in this row

**1. The home page was a fourth surface saying the right was already gone.**
`TERMS_OF_OFFER[3]` read "acknowledge that you thereby lose the 14-day right of
withdrawal" — the exact flat form V10a corrected in the Terms, in Refunds and on
the offer page, three rows earlier. It survived because
`legal-consistency.test.ts` guards a *list* of surfaces and the home page's
offer terms were not on it. They are now, and the guard fails on the old
wording.

That is the second time in this slice a guard has been narrower than the claim
it protects, and both times the gap was a surface nobody had listed.

**2. The empty checkout was a dead end.** `/cart` has offered a way back since
V6a; `/checkout` in the same state offered nothing. A visitor whose cart expired
between the two pages reached a document with no action on it.

**3. The payment step said something untrue without scripting.** `/checkout`
served a blinking cursor and the words "Preparing payment", for ever — nothing
was preparing, because what resolves it is the script that will never run. The
inability to pay is inherent (the card form is Stripe's, and runs in the
browser); the message was not. A `<noscript>` now names the cause and offers a
way to reach a person.

### At 390px and at desktop

Nine surfaces at each width. The tier table collapses to stacked ledger blocks,
the contents list nests `§5.1` under `§5`, the dotted leaders hold, and nothing
overflows horizontally. The footer's three columns resolve `Aislopica OÜ`, its
address and its contact from V14's configuration.

### Both environments

`lousydeal.com`, `www.lousydeal.com` and `test.lousydeal.com` each answer `302`
to Cloudflare Access for an unauthenticated request. Deploying is not
publishing.

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
