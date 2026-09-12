# LD-08 — Launch polish

Make the finished store safe to publish before it is ready to take money, then
close the last quality and operational gaps without turning a small shop into a
platform.

The contract is [`fresh-build.md`](./fresh-build.md), especially §17 LD-08,
§21 Gates E and F, §22 testing, §23 honest payment UX and §24 analytics. This
slice follows completed LD-02 through LD-06 and is the final V1 slice; LD-07
remains deliberately deferred.

## Operator decisions, 2026-09-12

| Question | Decision |
| --- | --- |
| How Stripe sees the site before activation | Publish the complete site with ordering closed. `STORE_OPEN` defaults to `false`; the public can understand the product and trader, but cart, checkout and payment mutations refuse. |
| Shape of the work | An ordered stack of independently understandable pull requests, including inside `lousydeal`. The operator merges and verifies them one by one; implementation continues ahead without waiting at each merge checkpoint. |
| Pull-request sizing | For LD-08, the usual 800 changed-line and 10-file bounds are guidance rather than a hard split point. Do not split coherent work merely to meet them. The operator explicitly approved exceeding them where coherence requires it, and every over-bound PR names this approval and the reason in its body. |
| Analytics | Configure the supplied Google Analytics tag and Meta Pixel. Use basic consent: neither vendor's code nor any measurement request loads before opt-in, and refusal remains fully functional. |
| Social management | Meeme gets no Buffer token. A fixed authenticated n8n webhook accepts a narrow draft request and creates Buffer drafts with `saveToDraft: true`; it cannot schedule or publish. Public posting remains an explicit operator-approved action. |
| Provider reporting | Deferred to non-launch-blocking LD-10. It does not change the consent-gated Google Analytics and Meta Pixel collection in this slice, or the Buffer-only draft workflow. |
| Reddit | Buffer does not support Reddit, and no Reddit API credential is provided. Meeme prepares post and reply copy as durable drafts, but a human publishes it. Do not add another credential or direct Reddit integration for V1. |
| Printful billing | Manual publication item. The public Printful API can create products and orders but exposes no billing-method lifecycle. `STORE_OPEN` remains false until the operator confirms billing is configured. |
| Printful live catalogue | Reproduce the four test-store products in the live Printful store from the repository's pinned artwork and committed catalogue; do not copy remote product identifiers between stores. |
| Rollback compatibility | Selecting the previous image is acceptable without additional fencing. The operator accepts that an image predating `STORE_OPEN` ignores the closed-store setting if used after public exposure. |

## Architecture

There are four code owners and one explicit lifecycle:

1. `lousydeal` owns runtime behavior, consent-gated analytics, SEO and the
   customer-facing quality pass. Its PRs form a dependency stack.
2. `deploys` owns the committed fail-closed `STORE_OPEN=false` default and the
   environment-variable seams consumed by the image.
3. `orange` plus its private `orange-inventory` owns live non-secret settings,
   OpenBao projection, public exposure and the narrow Meeme-to-n8n credential
   path. Inventory lands before the public Orange interface that consumes it.
4. `meeme` owns the draft-only social workflow contract, helper and operating
   instructions. It never owns a Buffer credential.
5. The launch lifecycle seeds already-provided credentials without printing
   them, configures the live Printful store and catalogue, deploys the closed
   site, verifies it, and stops for the two external gates: Printful billing and
   Stripe activation. Opening the shop is a later explicit one-value promotion,
   not an automatic consequence of passing tests.

## Global constraints

1. **Fail closed.** Missing, empty, malformed and unrecognised `STORE_OPEN`
   values all mean closed. Only the exact value `true` opens ordering. Both
   storefront and backend enforce it independently.
2. **Browse while closed; never transact.** Public GET pages, legal documents,
   certificates, withdrawal requests and analytics consent remain available.
   Every cart, checkout, surcharge, payment-session and cart-completion
   mutation returns a stable closed-store response before touching Medusa. The
   UI offers no enabled purchase control while closed.
3. **No environment value in an image.** `STORE_OPEN`, the Google tag and Meta
   Pixel ID are read server-side at request time and projected through the
   explicit client-runtime allow-list. No `NEXT_PUBLIC_*` variable is added.
4. **Basic consent only.** Before opt-in the browser loads no Google or Meta
   resource and sends no analytics request, including a consent-status ping.
   Consent is one first-party local-storage value, can be refused, and can be
   changed later from the footer. Test deployments configure no analytics IDs.
5. **Minimal events.** Implement §24's V1 funnel names exactly:
   `landing_view`, `tier_selected`, `baldrick_opened`, `baldrick_intent`,
   `bad_discount_issued`, `bad_discount_accepted`, `gift_selected`,
   `merch_added`, `checkout_started`, `purchase_completed`, and
   `certificate_shared`. Events carry only fixed names, product handles,
   currency and integer money; never names, email, inscription, gift message,
   address, cart/order/deal IDs, URL query strings or free-form Baldrick text.
   Google automatic page views/history measurement and Meta's automatic
   `PageView` are disabled. Vendor calls receive an explicit fixed route class
   rather than `location.href`, `document.title`, certificate serials or
   withdrawal query parameters.
6. **Analytics never breaks commerce.** An absent ID, denied consent, blocked
   request or vendor exception makes event emission a no-op. Purchase and
   redirect behavior remain unchanged.
7. **No new analytics framework.** Reuse the proven Plepic consent/emitter
   shape, adapted to Lousy Deal. Do not add a CMP, tag manager, server-side tag
   service, analytics database or npm analytics dependency.
8. **Meeme cannot publish through the integration.** The n8n workflow always
   sets Buffer `saveToDraft: true`; its public webhook accepts no scheduling,
   approval or publish switch. It accepts only fixed channel aliases and
   bounded copy/media URLs. The Buffer credential remains encrypted inside n8n;
   Meeme receives only its own webhook key.
9. **No secrets in Git or output.** Credential values stay in ignored `.keys`,
   OpenBao and n8n's encrypted credential store. Lifecycle commands use files or
   standard input, run `no_log` where appropriate, and report sanitized IDs and
   counts only.
10. **One source of store truth.** A reviewed lifecycle runner invokes the
    existing `syncMerchProducts` reconciliation against the selected Printful
    store, then `seed:merch` joins those remote variants into Medusa. It uses
    the pinned artwork revision, and a second identical run is unchanged.
    Verification compares safe handles, SKUs, artwork URLs and counts, not
    remote IDs or credential-bearing exports.
11. **Public does not mean open.** Cloudflare Access is removed from the live
    storefront only after the closed behavior is deployed and verified through
    the existing Access gate. It is then verified again from an unauthenticated
    client. Test stays behind Access. Backend/admin origins and infrastructure
    remain non-public except for already-approved webhook paths.
12. **Quality fixes are evidence-driven.** Responsive, accessibility, copy and
    performance work fixes observed failures only. No redesign, broad refactor,
    speculative abstraction or dependency upgrade belongs in this slice.
13. **The operator closes external gates.** Agents may verify configuration and
    prepare changes, but only the operator confirms Printful billing, accepts
    Stripe's account obligations, authorizes each public social post or reply
    and flips `STORE_OPEN=true`.

## Completion criteria

| # | Criterion | Task |
| --- | --- | --- |
| 1 | With no setting or `STORE_OPEN=false`, the complete public site explains the product and trader while all commerce mutations refuse before state changes | L1, D1, O1 |
| 2 | `STORE_OPEN=true` preserves the already-proven cart and payment flow without a second checkout implementation | L1 |
| 3 | Google Analytics and Meta Pixel load only after explicit consent, can be refused/revoked, and receive the fixed non-personal funnel events | L2 |
| 4 | Metadata, canonical URLs, robots and sitemap are correct; carts, checkout and public certificate instances are not indexed | L3 |
| 5 | Desktop and mobile rendered review covers homepage, deal, goods, cart, checkout, legal, certificate, Baldrick and system pages; keyboard, reduced-motion and no-script paths work | L3, F2 |
| 6 | Production build meets a recorded performance budget with no avoidable third-party work before consent | L3 |
| 7 | Live Stripe and Printful credentials are projected from OpenBao without entering Git; the four live Printful products and webhook exist | L4, O1, E1 |
| 8 | Meeme can create Buffer drafts for its six supported networks without receiving a Buffer credential or a publish-capable route; Reddit posts and replies remain manual drafts | M1, O1, E1 |
| 9 | The closed live site is reachable without Cloudflare Access while test and non-store surfaces retain their existing gates | O1, F2 |
| 10 | Gate F exercises the closed public site and the open test purchase path, including webhook, idempotent certificate, email, gift, merch, discount, analytics consent and absence of test data from public statistics | F1, F2 |
| 11 | Status records the measured remaining operator prerequisites and the exact later `STORE_OPEN=true` promotion without assuming only two remain | F2 |

## Tasks

Each task is one reviewable pull request. Lousy Deal branches stack in the
dependency order below; cross-repository tasks use their own repository's main
branch and state their consumed interface commit.

### L0 — Plan and resume point

**Repository:** `lousydeal`.

**Files:** `docs/working/ld-08-launch-polish.md`,
`docs/working/status.md`.

- [ ] Record this plan, the PR-size ruling, the external gates and the
      current resume point.

**Verification:** `markdownlint-cli2 docs/working/ld-08-launch-polish.md docs/working/status.md`.

### L1 — Fail-closed store gate

**Repository:** `lousydeal`.

**Files:** `storefront/src/config/runtime-config.ts`,
`storefront/src/lib/store-availability.ts`,
`storefront/src/lib/cart-actions.ts`, `storefront/src/app/layout.tsx`,
`storefront/src/app/api/store/[...path]/route.ts`,
the purchase-form components and pages that render them,
`backend/src/config/runtime.ts`, `backend/src/api/middlewares.ts`, focused
storefront/backend tests.

**Produces:** `RuntimeConfig.store.open: boolean`, the same field in the
explicit client projection, `assertStoreOpen()` for server actions, and a
backend write guard returning HTTP 503 with `{ code: "store_closed" }`.

- [ ] Write failing config tests for absent/false/malformed/true settings.
- [ ] Write failing action and middleware tests proving closed writes never
      call their Medusa dependency and open writes remain unchanged.
- [ ] Write failing proxy tests for mismatched settings in both directions:
      closed storefront/open backend still refuses locally, and open
      storefront/closed backend receives the backend refusal. Withdrawal and
      webhook routes remain outside both guards.
- [ ] Add the minimal strict reader and both enforcement layers.
- [ ] Replace enabled purchase controls with a concise closed-store notice;
      keep navigation, catalogue and legal content usable.
- [ ] Run focused tests red, then green, and the complete application gate.

### L2 — Consent-gated Google and Meta analytics

**Repository:** `lousydeal`.

**Files:** `storefront/src/config/runtime-config.ts`,
`storefront/src/lib/analytics.ts`, `storefront/src/lib/consent.ts`,
`storefront/src/components/analytics/ConsentManager.tsx`,
`storefront/src/app/layout.tsx`, funnel interaction components/actions,
`storefront/src/content/legal/privacy.ts`, `storefront/src/app/globals.css`,
focused tests including the existing third-party and storage disclosure guards.

**Produces:** optional runtime `GOOGLE_ANALYTICS_TAG_ID` and
`META_PIXEL_ID`, a client emitter for the eleven fixed events, and one consent
surface that loads both vendors only after opt-in.

- [ ] Write failing tests for an unanswered/refused/revoked choice loading no
      vendor code or request, and accepted consent loading only configured IDs.
- [ ] Write failing event tests that reject unknown names and strip prohibited
      fields while vendor failures remain non-fatal.
- [ ] Write failing request tests for consent followed by direct visits and
      client navigation to certificate and withdrawal-result URLs: no request
      may contain a raw URL, query string, title, serial or form contents.
- [ ] Implement the smallest local-storage consent manager and vendor loaders;
      use basic consent so neither vendor mounts before acceptance. Configure
      Google with `send_page_view: false`, automatic history measurement off,
      Google signals/ad personalization off, and explicit safe event fields;
      never emit Meta's automatic `PageView`.
- [ ] Instrument the existing interaction boundaries without changing their
      commerce behavior.
- [ ] Correct Privacy and storage disclosures to name Google, Meta, purpose,
      consent, revocation and the one first-party preference value.
- [ ] Run focused tests red, then green, and the complete application gate.

### L3 — SEO, accessibility, responsive and performance closeout

**Repository:** `lousydeal`.

**Files:** metadata-bearing layouts/pages, new `robots.ts` and `sitemap.ts`,
`storefront/src/app/globals.css`, only components/pages with reproduced
rendering failures, and focused system/browser/build tests.

**Produces:** request-derived canonical metadata, an indexable public
catalogue, non-indexed transactional/personal routes, and a dated rendered
review record in this plan.

- [x] Write failing tests for canonical metadata, sitemap membership and
      `noindex` on cart, checkout and individual certificates.
- [x] Run the production build and browser suite at 360×800 and 1440×900 with
      scripting on and off; record concrete accessibility, overflow, focus,
      contrast, reduced-motion, error-state and copy failures.
- [x] Fix only those reproduced failures, adding a focused regression test for
      each durable behavior.
- [x] Measure the production homepage before consent: no Google/Meta requests,
      no horizontal overflow, and a Lighthouse mobile budget of performance
      ≥90, accessibility ≥95, best-practices ≥95 and SEO ≥95. A miss blocks
      completion unless the operator explicitly accepts that measured score as
      an exception; it is never rounded up or merely noted as complete.
- [x] Repeat the full rendered matrix and application gate.

#### L3 rendered review — 2026-09-12

The Browser plugin was not available in this session, so the approved fallback
was regular Playwright 1.57.0 with its Chromium 153 executable. A production
Next.js 16.3.4 build ran against a local, deterministic Store API fixture with
synthetic catalogue and certificate data. The fixture, executable browser
script, exact commands, machine-readable route/console/network results, raw
Lighthouse JSON and representative screenshots are retained through review in
the controller's ignored
`.superpowers/sdd/ld-08-launch-polish/l3-evidence/` package and are not part of
the repository commit. They remain there through merge, not merely through the
first review pass.

The repeated matrix covered `/`, `/deal/lousy-deal`,
`/goods/original-purchase-receipt`, `/cart`, `/checkout`, `/legal`,
`/legal/terms`, `/legal/withdraw`, `/done-deals/browser-fixture`,
`/design/certificate` and the branded 404 at `/missing-browser-fixture`. Each
route ran at 360×800 and 1440×900, both with scripting enabled and disabled:
44 route cases. Two more interaction cases proved visible keyboard focus,
analytics refusal, an unobstructed mobile tier link and real navigation from
its centre, Baldrick's exact expected reply with no reduced-motion cursor, and
the no-script withdrawal GET-to-confirmation step. Cart and checkout were
deliberately exercised in the public `STORE_OPEN=false` state; their open-state
rendering remains deferred to F2, where the sanctioned runtime integration is
available. The scripting-enabled cases also ran axe-core 4.11.0 at WCAG 2
A/AA and 2.1 A/AA.

| Check | Repeated result |
| --- | --- |
| Meaningful document, title, expected status and no framework overlay | 44/44 |
| Horizontal overflow | 0 px in 44/44 |
| axe WCAG A/AA violations | 0 across 22 scripting-enabled route cases |
| Relevant browser console warnings/errors | 0; Chromium logged only the intentional main-document 404 |
| Google, Meta or any other third-party request before/refused consent | 0 |
| Persistent privacy control | static document flow in 22/22 scripting-enabled cases; after Refuse the mobile Plus link centre remained its anchor and a real click navigated |
| Baldrick | present with scripting on only its four declared sales-assistance routes; absent without scripting |
| System pages | branded 404 returned 404; deliberately broken certificate fixture returned branded 500 |
| Visual review | mobile and desktop full-page captures showed no clipping, overlap, unreadable control or scroll trap |

The first implementation matrix reproduced one application failure: closing
the store added a third cart return which omitted Baldrick, contrary to the
cart's existing all-states contract. The focused guard failed at two mounts
where it required three; adding Baldrick after the closed cart document made
that test and the repeated browser case pass. Independent review then found
that `robots.txt` blocked crawlers from pages carrying `noindex`, and that
query-bearing withdrawal confirmations, receipts and prefilled forms inherited
the clean form's index policy. Focused red tests reproduced both boundaries;
`robots.txt` now excludes only API/analytics endpoints while noindex pages and
certificate PDFs remain crawlable, and every query-bearing withdrawal state is
canonicalized to the clean form but emits `noindex, nofollow`. The default
sitemap's catalogue success and failure paths also gained direct stubbed tests.

The retained screenshot then exposed a missed mobile overlap: after refusal,
the fixed privacy control covered and intercepted the Lousy Deal Plus link.
The focused regression first failed on the fixed positioning. The control now
sits in normal document flow immediately after the footer, where it remains a
keyboard-operable way to reopen preferences or stop analytics without covering
the document. At 360×800 the repeated interaction measured the Plus link,
confirmed `document.elementFromPoint` at its centre returned that anchor, and
clicked those coordinates; the browser reached `/deal/lousy-deal-plus`. The
same interaction required Baldrick's exact “A certificate. That is the whole
list.” reply under reduced motion and found no cursor.

During evidence replay, four goods-image 404 console failures exposed a fixture
assembly error: copying the source `public` directory into the already traced
standalone `public` directory nested it one level too deep. Copying directory
contents and restarting the server removed all four; no application code was
changed for that harness-only failure. Earlier flags for the home/goods
document names, the deliberately assistant-free certificate and the intentional
404 console entry were likewise harness errors, not application changes.

Lighthouse 13.0.3 ran its mobile profile on the production homepage before
consent, on the same Chromium 153 build. These are the reported scores, without
rounding or an exception:

| Category | Score | Budget |
| --- | ---: | ---: |
| Performance | 99 | ≥90 |
| Accessibility | 100 | ≥95 |
| Best practices | 100 | ≥95 |
| SEO | 100 | ≥95 |

It measured FCP 0.8 s, LCP 1.9 s, total blocking time 76 ms, CLS 0 and speed
index 0.8 s. Its network log contained no origin other than the local
storefront. The remaining coverage risk is deliberate: this pass used Chromium
and deterministic local data; F2 owns cross-service and deployed-environment
verification.

### L4 — Explicit Printful catalogue reconciliation runner

**Repository:** `lousydeal`.

**Files:** `backend/src/scripts/sync-printful.ts`, `backend/package.json`,
focused tests for the script port and reconciliation behavior, and the store
smoke harness only if needed to invoke the command against a real Medusa.

**Produces:** `npm run sync:printful`, a Medusa exec lifecycle that resolves
the selected runtime configuration and invokes the existing
`syncMerchProducts` once. It prints only safe product handles and change counts,
never a token, remote identifier or response body.

- [ ] Write a failing script-port test proving missing Printful configuration
      refuses before a network call and configured input invokes
      `syncMerchProducts` with the committed catalogue and pinned artwork base.
- [ ] Write a failing idempotency test proving an unchanged second
      reconciliation reports no mutations and preserves SKU joins.
- [ ] Add the minimal Medusa exec wrapper and package command; do not duplicate
      reconciliation logic already owned by `modules/printful/sync.ts`.
- [ ] Run the focused unit tests red, then green, and the complete application
      gate. E1 supplies the real-store read-back.

### D1 — Deployment contract defaults closed

**Repository:** `deploys`.

**Files:** `lousydeal/base/storefront.yaml`, `lousydeal/base/backend.yaml`,
`lousydeal/base/worker.yaml` where present, overlay tests and README/contract
documentation.

**Consumes:** the exact runtime variable names from L1/L2.

- [ ] Add `STORE_OPEN=false` to storefront, backend and worker/predeploy
      workloads that assemble runtime config; add optional analytics variables
      only to the storefront.
- [ ] Assert test renders closed with no analytics IDs and live renders closed
      pending Orange's runtime patch.
- [ ] Run `bash scripts/validate` and strict Kustomize schema validation for
      both Lousy Deal overlays.

### O1 — Live configuration, public closed exposure and gated n8n seam

**Repositories:** private `orange-inventory` first, then public-ready `orange`.

**Inventory files:** Lousy Deal environment records, OpenBao source registry,
Meeme agent variables and private working status/docs.

**Orange files:** Lousy Deal Argo CD defaults/template/tests, OpenBao seed
registry and tests, OpenClaw/n8n credential projection, fixed n8n credential
import lifecycle and current documentation.

**Consumes:** D1 variable names and M1's fixed webhook/credential identifiers.

- [ ] Add reserved-example and test-first contracts for `STORE_OPEN`, both
      analytics identifiers, the live Printful credential projection, the
      Meeme webhook key and encrypted Buffer credential import.
- [ ] Extend the seed/import lifecycle so supplied ignored key files reach
      OpenBao/n8n under least-privilege paths without values in arguments,
      output, facts or diffs.
- [ ] Enable Meeme's n8n access with only its fixed webhook key; do not install
      the Buffer API key or n8n owner/API key on Meeme. Replace the current
      all-or-nothing `openclaw_n8n_enabled` behavior with separately declared
      webhook and API capabilities, and negatively test Meeme's rendered
      secret registry, installed files and OpenBao policy for the API object.
- [ ] Keep live `STORE_OPEN=false`, test analytics absent, and make only the
      live storefront's Access gate configurable. Inventory selects public,
      but F1 must verify the deployed closed response through the existing
      gate before F2 applies that selection. Preserve all backend/admin/test
      gates.
- [ ] Validate private inventory in both contexts, then Orange's full gate;
      land inventory before Orange.

### M1 — Meeme social drafts

**Repository:** `meeme`.

**Files:** new `skills/social-drafts/` helper and skill, new
`workflows/lousydeal-social-drafts/` generator/logic/export/tests, `TOOLS.md`,
`docs/current/operating-model.md`, and `scripts/validate` only as required to
validate generated workflow parity.

**Produces:** a fixed authenticated `meeme-social-draft` webhook accepting a
bounded JSON draft and creating Buffer drafts only; a separate local Reddit
post/reply draft command that performs no network write.

- [ ] Write failing unit/contract tests for fixed channel aliases, length and
      media constraints, HTML/control-character rejection, `saveToDraft: true`,
      sanitized responses and absence of publish/schedule fields from the
      webhook input. The Buffer request itself fixes
      `schedulingType: automatic`, `mode: addToQueue` and
      `saveToDraft: true`, and the response must report draft status.
- [ ] Generate the n8n workflow that holds the encrypted Buffer credential,
      resolves only connected allow-listed channel IDs and creates one draft
      per requested supported channel.
- [ ] Add a narrow helper that reads its webhook key from the installed file,
      never prints it, and exposes only list-channels/create-draft/status.
- [ ] Add Reddit post/reply draft output to the workspace with no API call and
      document that public posting or replying is still Tier 3 approval.
- [ ] Run `bash scripts/validate` and `habit-hooks`.

### E1 — Explicit credential and vendor lifecycle

**Repositories changed:** none. **State owners:** OpenBao, n8n, Stripe,
Printful and Buffer.

- [ ] Verify the supplied key files by name, owner, mode and parseable shape
      without printing values; seed only named sources through the reviewed
      Orange lifecycle.
- [ ] Read back sanitized OpenBao metadata and n8n credential IDs; deploy and
      activate M1's reviewed workflow.
- [ ] Query Buffer for connected channels and prove the six supported Lousy
      Deal profiles are allow-listed; create one non-publishing draft and
      remove it after verification. Record Reddit as manual publication.
- [ ] Configure/read back the supplied Google Analytics tag and Meta Pixel IDs
      in live runtime state. F2 performs browser request verification after
      public exposure.
- [ ] Configure the live Printful token/webhook, run the existing merch seed
      only after a reviewed lifecycle runner has called `syncMerchProducts` for
      the live store. Verify exactly four handles, their SKU joins and pinned
      artwork, then run the lifecycle again and observe no change. Do not
      submit a fulfillment order until billing is confirmed.
- [ ] Verify Stripe live account/key/webhook configuration using safe metadata
      only. Do not take a live payment and do not set `STORE_OPEN=true`.

### F1 — Test verification and closed live promotion

**Repositories changed:** none. Deployed systems are read-only during evidence
collection except for the explicitly named test purchase and approved
promotion commands below.

- [ ] As each stacked Lousy Deal PR becomes ready, label-promote its open-PR
      digest to test for operator verification, retargeting the PR to `main`
      after its predecessor merges and before applying the deployment label.
      After D1, M1 and O1 have landed, label-promote L4 while its PR remains
      open with the test-only `STORE_OPEN=true` override.
- [ ] Complete the existing real-dependency smoke matrix on test: purchase,
      duplicate webhook, certificate, confirmation email, gift, merch,
      surcharge and Printful submission; verify analytics remains absent.
- [ ] Merge L4, let the existing release workflow rebuild main and promote its
      distinct live digests with `STORE_OPEN=false`. Record both the verified
      test digest and rebuilt live digests, retain Cloudflare Access, and
      verify through the gate that public reads work while commerce writes
      return the stable closed response without a state change.

### F2 — Public verification, publication record and handoff

**Repository:** `lousydeal` in a documentation-only closure PR. This follows
E1, so all reviewed code and explicit vendor configuration are already in
place.

**Files:** this plan, `docs/working/status.md`, and durable current/decision
documentation only where runtime behavior changed.

- [ ] Run the reviewed Orange lifecycle that removes Access only from the live
      storefront, then from an unauthenticated client verify public content,
      withdrawal and SEO while cart, surcharge, checkout and payment writes
      return the stable closed-store response without a state change.
- [ ] Exercise unanswered, refused, accepted and revoked analytics consent in
      a real browser. Confirm vendor requests are absent before/refused/after
      revocation and use only safe route classes after acceptance, including
      direct and client-side visits to certificate and withdrawal-result URLs.
- [ ] On the still-gated test environment, repeat the critical open-store
      smoke matrix against the promoted digest: purchase, duplicate webhook,
      certificate, confirmation email, gift, merch, surcharge and Printful
      submission; verify analytics remains absent there.
- [ ] Verify public counters contain no test order and no fabricated number.
- [ ] Record exact dated evidence, remaining operator gates and rollback
      digest. Mark LD-08 complete only when code/configuration/integration are
      complete; leave publication blocked on manual Printful billing, Stripe
      activation acceptance and the later explicit `STORE_OPEN=true` change.

## Dependency order

`L0 → L1 → L2 → L3 → L4` is the application stack. `D1` follows L2's runtime
interface. `M1` defines the social webhook before O1 consumes it. F1 verifies L4's
open-PR digest on open test, then verifies the release workflow's distinct
rebuilt live digests closed through Access. E1 performs the explicit
credential/vendor lifecycles. F2 applies the scoped Access removal, performs
unauthenticated closed verification and lands the documentation-only closure
PR.

## Rollback

Set or retain `STORE_OPEN=false` and roll the application digest back to the
previous image. By the operator's decision above, no compatibility fence is
added: an image predating `STORE_OPEN` ignores the setting if selected after
public exposure. Disabling the n8n workflow removes Meeme's social write path
without rotating Buffer; revoking its dedicated Buffer key is the
credential-level rollback. Printful products may remain in the live store while
closed because no order can reach them.
