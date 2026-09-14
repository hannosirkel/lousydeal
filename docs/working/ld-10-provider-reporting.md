# LD-10 — Meeme reporting, social delivery and operating polish

> **For agentic workers:** REQUIRED SUB-SKILL: use
> `superpowers:subagent-driven-development` or `superpowers:executing-plans`
> task by task. Every behaviour change follows red-green-refactor. Each task
> closes with one pull request in one repository.

**Goal:** Give Meeme gated access to truthful transaction, traffic, conversion
and owned-social aggregates; repair Instagram drafts; give campaign media a
durable upload path; open test ordering; and close the small storefront trust
and spacing gaps reported after launch.

**Architecture:** Meeme continues to call one authenticated, TLS-pinned n8n
workflow and never receives Buffer, Google Analytics, Medusa, database or
storage credentials. n8n exposes only fixed actions. Actual commerce totals
come from a narrow aggregate-only backend route, consented traffic and funnel
events come from GA4, and owned-post metrics come from Buffer's existing
personal API rather than a second Meta credential. Campaign media lives in a
dedicated public Backblaze B2 bucket; Meeme sends one bounded file through a
second authenticated webhook trigger and credential-aware n8n HTTP nodes upload
it through B2's native API. Buffer receives only the stable public object URL.

**Tech stack:** TypeScript, Next.js App Router, Medusa v2, JavaScript, n8n
workflow JSON, Ansible, OpenBao, Backblaze B2 S3-compatible API, GA Data API,
Buffer GraphQL API and Kubernetes/Argo CD.

**Spec:** This document is the approved specification and execution plan. It
extends [`fresh-build.md`](./fresh-build.md) without reopening LD-08.

## Global constraints

- Repositories hold no credential values or rendered secrets. Ignored Orange
  sources and OpenBao remain the only secret path.
- Meeme receives only the existing n8n webhook credential and public response
  data. It receives no provider, storage, database or n8n administration key.
- Reporting accepts no caller-selected account, property, metric, date range,
  query, path, cursor or identifier.
- All summaries cover the preceding seven completed days in the bound property
  timezone, unless the response explicitly identifies a current partial day.
- Transaction results contain aggregates only: no customer, email, address,
  inscription, order/cart/payment identifier or card metadata.
- GA figures are consented analytics and may differ from actual commerce.
  `commerce-summary` is authoritative for paid orders and money.
- Buffer remains draft-only. No implementation may publish, schedule, reply,
  moderate or send a direct message.
- Provider errors are classified into a small fixed vocabulary and raw messages
  remain operator-private. Workflow execution payload retention stays off.
- Media delivery URLs are stable, public and HTTPS. B2 authorization and
  temporary upload tokens never leave n8n.
- Test remains Cloudflare Access-gated, uses Stripe sandbox credentials and may
  accept orders. The known Printful test-store billing limitation is separate.
- The footer exposes the previously approved primary channels only: TikTok,
  Instagram and X. All links have accessible names and safe external-link
  behaviour.
- The payment disclosure says that Stripe supplies the card form and that the
  merchant does not receive or store the buyer's full card number. It does not
  imply that Stripe is the merchant or that the merchant receives no payment
  metadata at all.
- Pull-request size bounds are guidance. Any required override names the
  operator's standing approval and explains why splitting would weaken review.
- Run the owning repository's complete validation and `habit-hooks` before
  review. Public/public-ready changes receive Astra review before merge.

## Fixed interfaces

The existing social webhook adds the three report actions without changing its
authentication boundary. The media action uses a second multipart webhook
trigger with the same authentication and TLS boundary:

| Action | Request | Fixed response |
| --- | --- | --- |
| `commerce-summary` | `{ "action": "commerce-summary" }` | Currency-separated daily paid-order count, gross, refunded, net, certificate count and merch units; at most seven rows. |
| `analytics-summary` | `{ "action": "analytics-summary" }` | Daily `activeUsers`, `sessions` and the existing fixed funnel-event counts; at most seven rows plus the fixed event summary. |
| `social-summary` | `{ "action": "social-summary", "channel": "instagram" }` | One exact owned channel, fixed seven-day Buffer aggregate metrics and freshness. The channel is one of the existing fixed aliases, not an arbitrary ID. |
| `media-upload` | Authenticated multipart request containing one `media` file and its normalized name | One stable public URL under the bound bucket/prefix. The file is JPEG, PNG or MP4 and no larger than 8 MiB. |

Every report response is one of `available`, `empty`, `incomplete` or
`unavailable`. Zero is distinct from unavailable. The media action is one of
`stored` or a fixed refusal code. No response includes a remote credential,
provider request, raw error, private identifier or n8n execution ID.

## Work items

### L10-P — Approve and publish this execution contract

**Repository:** `lousydeal`

**Files:**

- Modify: `docs/working/ld-10-provider-reporting.md`
- Modify: `docs/working/status.md`

- [ ] Replace the deferred three-provider sketch with this approved design and
      set LD-10 as the active slice.
- [ ] Run `bash scripts/validate` and `habit-hooks`.
- [ ] Obtain Astra review, open the PR, and merge it before implementation rows.

### I10-A — Open test ordering with Stripe sandbox

**Repository:** private `orange-inventory`

**Files:** the existing Lousy Deal test runtime binding, focused inventory
validation and private operating status only.

**Interface produced:** test renders `STORE_OPEN=true`; live is unchanged.

- [ ] Write or extend the focused inventory test so it fails while test renders
      `STORE_OPEN=false` and proves the Stripe test source remains selected.
- [ ] Change only the durable test `store_open` binding to `true`; do not use
      the temporary Gate-F override and do not alter Access policy.
- [ ] Run the inventory gate in both its own and Orange contexts, then
      `habit-hooks`.
- [ ] Obtain Astra review and merge inventory before reconciliation.

### O10-A — Reconcile and verify the open test store

**Repository changes:** none. **State owners:** Orange, Argo CD and test.

- [ ] Apply the reviewed inventory through the existing Orange playbook and
      reconcile Argo CD. Do not patch an Argo-owned resource by hand.
- [ ] Verify the test storefront still redirects unauthenticated clients to
      Access, then authenticate and prove cart creation, checkout and the
      Stripe sandbox Payment Element are available.
- [ ] Submit at most one operator-approved Stripe sandbox order and verify the
      normal certificate/mail path. Record the existing Printful test billing
      limitation if the cart contains merch; it does not close by changing
      payment or storefront code.

### L10-U — Storefront trust and polish

**Repository:** `lousydeal`

**Files:**

- Create: `storefront/src/app/favicon.ico`
- Modify: `storefront/src/components/document/Footer.tsx`
- Modify: `storefront/src/components/document/MerchForm.tsx`
- Modify: `storefront/src/app/cart/page.tsx`
- Modify: `storefront/src/app/checkout/PaymentForm.tsx`
- Modify: `storefront/src/content/checkout.ts`
- Modify: `storefront/src/app/globals.css`
- Modify: focused storefront tests under `storefront/tests/`

**Interfaces produced:** a conventional ICO fallback; three labelled social
links; visibly separated cart/merch controls; truthful Stripe disclosure
immediately before the Stripe-owned element.

- [ ] Add failing rendered-markup tests proving the footer links only to the
      canonical TikTok, Instagram and X profiles, opens them safely, and gives
      each icon an accessible name.
- [ ] Add a failing favicon test that reads the ICO header and proves the
      fallback contains at least 16px and 32px square images derived from the
      existing stamp colours.
- [ ] Add failing structural/style tests proving the cart code form and
      checkout button, and the merch size/select and add button, use narrowly
      named wrappers with a non-zero design-token gap.
- [ ] Add a failing checkout render test proving the text immediately before
      the card slot says Stripe provides the card form and that Lousy Deal does
      not receive or store the full card number.
- [ ] Render the three social links as accessible inline SVG icons without a
      client component, tracking library or new network request. Keep legal and
      company footer content unchanged.
- [ ] Generate the ICO from `icon.svg`, retaining the SVG metadata route and
      adding no new brand drawing.
- [ ] Add only component-local spacing classes; do not increase global button
      or field margins.
- [ ] Add the checkout copy as ordinary HTML before `cardSlot`; link Stripe to
      its privacy notice if a link improves clarity, without adding a logo or
      script.
- [ ] Run the focused tests, `bash scripts/validate`, browser QA at narrow and
      wide viewports, and `habit-hooks`; obtain Astra review.

### L10-C — Aggregate commerce report route

**Repository:** `lousydeal`

**Files:**

- Create: `backend/src/commerce/meeme-report.ts`
- Create: `backend/src/api/integrations/meeme-report/route.ts`
- Create/modify: focused backend tests and runtime-config validation
- Modify: backend environment documentation as required

**Interface produced:** authenticated `GET /integrations/meeme-report` with no caller
query surface and the fixed `CommerceSummary` response.

```ts
interface CommerceSummaryDay {
  readonly date: string;
  readonly currencies: readonly {
    readonly currency: string;
    readonly paidOrders: number;
    readonly grossMinor: number;
    readonly refundedMinor: number;
    readonly netMinor: number;
    readonly certificates: number;
    readonly merchUnits: number;
  }[];
}

interface CommerceSummary {
  readonly status: "available" | "empty" | "incomplete";
  readonly from: string;
  readonly through: string;
  readonly omittedRecords: number;
  readonly days: readonly CommerceSummaryDay[];
}
```

There are exactly seven day objects and at most eight ISO-4217 currency rows
inside each. Amounts are integer minor units. Captured payments are attributed
to the capture timestamp; certificate and merch counts follow their order onto
that capture day. Refunds are negative movements attributed to the refund
timestamp, not rewritten into the original sale cohort, so a day's net may be
negative. A malformed, ambiguous or unrepresentable record increments
`omittedRecords` and makes the response `incomplete`; it is never silently
excluded from an `available` result. A provider/query failure returns HTTP 503
with only `{ "status": "unavailable" }`.

- [ ] Write unit tests for deterministic completed-day bounds, currency
      separation, paid/refunded/net arithmetic and certificate/merch counts.
      Watch them fail before adding the aggregator.
- [ ] Implement the pure aggregator from the minimum Medusa order/payment
      projection. A missing or ambiguous payment state is excluded rather than
      guessed.
- [ ] Write route tests proving missing/wrong report credential is refused,
      query parameters are refused, output has no forbidden identifiers or
      personal fields, and a backend/provider failure becomes a sanitized
      unavailable response.
- [ ] Implement constant-time credential comparison and the fixed server-side
      seven-completed-day query. The credential comes only from runtime
      environment/OpenBao.
- [ ] Use exactly `MEEME_REPORT_KEY`, `MEEME_REPORT_TIMEZONE` and
      `x-meeme-report-key`: D10-B projects both values; I10-B validates the
      shared backend/n8n timezone; O10-B delivers both; M10-R preserves the
      fixed dates with that exact header; V10 covers timezone and DST edges.
- [ ] Start a real Medusa and prove `/integrations/meeme-report` reaches the
      handler with the dedicated key, while missing/wrong keys and every query
      string fail. This guards against inherited `/admin` or `/store` auth.
- [ ] Run backend focused tests, `bash scripts/validate`, the backend smoke
      suite, and `habit-hooks`; obtain Astra review.

### M10-S — Repair Buffer channel and draft behaviour

**Repository:** `meeme`

**Files:** social-drafts logic, generator/export, helper CLI, tests, skill and
operating documentation.

**Interfaces produced:** Instagram post/reel metadata; safe channel capability
status; TikTok image-or-video drafts; fixed provider refusal categories.

- [ ] Add failing tests proving an Instagram image draft emits
      `metadata.instagram={type:"post",shouldShareToFeed:true}`, an Instagram
      video emits `type:"reel"`, and TikTok accepts one image or one video.
- [ ] Add failing tests for a read-only channel probe that distinguishes exact
      connected/unlocked identity from automatic-post capability and reminder
      fallback.
- [ ] Add failing tests mapping only reviewed Buffer failures to
      `media_unusable`, `channel_authorization`, `provider_validation` or the
      fallback `buffer_rejected`, with raw messages absent from Meeme output.
- [ ] Implement the smallest request/discovery/classifier changes and
      regenerate the workflow JSON from source.
- [ ] Run a private, removable Instagram draft control with the same public
      image: capture the original raw failure operator-side, repeat with the
      new metadata, delete any resulting draft, and retain no secret output.
- [ ] Reconcile Meeme's normal checkout to merged `main`; do not leave the
      operating helper dependent on a campaign worktree.
- [ ] Run the complete Meeme validation and `habit-hooks`; obtain Astra review.

### M10-R — Add fixed commerce, GA and Buffer reporting actions

**Repository:** `meeme`, stacked after M10-S.

**Files:** social workflow logic/generator/export, helper CLI, tests, skill,
`TOOLS.md` and operating-model documentation.

**Interfaces consumed:** L10-C's `CommerceSummary`; existing Buffer exact-channel
resolver; GA4 fixed event names.

- [ ] Add failing request-contract tests for `commerce-summary`,
      `analytics-summary` and `social-summary`, including rejection of every
      caller-supplied ID, date, metric, path, query or credential.
- [ ] Add provider fixtures for populated, empty, incomplete and unavailable
      responses. Prove zero remains zero and raw provider errors/identifiers do
      not escape.
- [ ] Implement the three fixed dispatch paths before Buffer draft discovery,
      so a disabled provider cannot disable draft creation.
- [ ] Use Buffer `aggregatedPostMetrics` against the exact resolved channel and
      fixed seven-day bounds. Return only allow-listed numeric metrics and
      freshness.
- [ ] Use the GA Data API only for `activeUsers`, `sessions` and the existing
      fixed event names. Do not add a separate conversion action.
- [ ] Regenerate the workflow export and run complete Meeme validation plus
      `habit-hooks`; obtain Astra review.

### M10-B — Add bounded media upload commands

**Repository:** `meeme`, stacked after M10-R.

**Files:** workflow upload/validation logic, generator/export, helper CLI,
tests, skill and operating documentation.

**Interface produced:** a second authenticated webhook trigger plus a local
command that reads one bounded regular file, submits it as multipart media, and
prints only the stable public URL.

- [ ] Add failing tests for accepted JPEG, PNG and MP4 types; filename
      normalization; byte and checksum bounds; unique object names; and
      rejection of paths, traversal, mixed encodings, redirects and arbitrary
      hosts.
- [ ] Add tests proving the returned stable URL is accepted by the exact same
      runtime-bound origin/prefix validator used by `create-draft`, while
      sibling buckets, credentials in URLs, redirects, traversal and prefix
      lookalikes are rejected by both CLI and workflow.
- [ ] Implement credential-free validation nodes, then use credential-aware
      HTTP nodes to authorize to B2, obtain a temporary native upload URL and
      upload the binary with B2's required checksum. Code nodes never access
      the B2 credential or temporary token, and execution retention stays off.
- [ ] Implement the bounded upload helper without logging authorization
      material or local file content. Keep the 8 MiB maximum below n8n's
      existing request-body limit; do not raise the instance-wide limit.
- [ ] Against real B2, prove the intended JPEG/PNG/MP4 upload succeeds and
      altered checksum, content type, size, bucket and prefix attempts fail.
- [ ] Regenerate the workflow export; run complete Meeme validation and
      `habit-hooks`; obtain Astra review.

### I10-B — Bind report and media resources privately

**Repository:** private `orange-inventory`

**Files:** the Lousy Deal/Meeme source registry, provider settings, focused
validation and private operating record.

**Interfaces produced:** exact GA property/timezone, exact commerce route,
exact B2 endpoint/bucket/prefix/public base, fixed enable flags and approved
ignored source filenames.

- [ ] Add failing private validation for complete-or-disabled GA, commerce and
      media bindings. Reject placeholders, public-repository leakage and
      unrelated credential reuse.
- [ ] Bind only verified identifiers and endpoints. GA, commerce and media
      enable independently; Buffer drafts never depend on them.
- [ ] Run the inventory gate in its own and Orange contexts and `habit-hooks`;
      obtain Astra review and merge before O10-B.

### D10-B — Project the commerce report credential into the backend

**Repository:** public `deploys`

**Files:** Lousy Deal backend base/overlay manifests and focused manifest tests.

- [ ] Add failing render tests for the named secret-key reference and exact
      n8n-to-backend ingress needed by the report path. Prove neither storefront
      nor unrelated workloads receive the key.
- [ ] Add the optional backend environment projection and narrow NetworkPolicy
      rule. Preserve digest promotion, test/live separation and default deny.
- [ ] Render and schema-check both overlays, run the complete deploys gate and
      `habit-hooks`, and obtain Astra review.

### O10-S — Import the repaired social-draft artifact

**Repository:** public-ready `orange`, after M10-S.

- [ ] Add failing artifact-parity tests, pin M10-S's merged digest alongside the
      retained rollback digest, and import/activate it through the existing
      workflow lifecycle without touching report or media credentials.
- [ ] Verify Instagram capability status and a removable draft through the
      repaired interface, plus continuing X/TikTok readiness.
- [ ] Run the complete Orange gate and `habit-hooks`; obtain Astra review.

### O10-B — Custody credentials, project runtime state and import reports/media

**Repository:** public-ready `orange`

**Files:** OpenBao source/seed helpers, ExternalSecret projections, backend
runtime/environment binding, n8n credential/workflow lifecycle, reserved
examples, focused tests and operator documentation. No private value or
identifier is committed.

**Interfaces consumed:** L10-C, M10-R, M10-B and I10-B.

- [ ] Add failing lifecycle tests for separate optional commerce-report, GA
      Viewer and B2 upload sources. Absence disables only its action.
- [ ] Import credentials only through ignored source, stdin, OpenBao and n8n
      lifecycle, with `no_log`; never place values in arguments, facts, diffs,
      temporary files or Meeme.
- [ ] Verify the generic workflow digest before secret access or network work,
      bind only the private configuration object, and prove all other bytes are
      derived from the reviewed template.
- [ ] Generate the report key through the approved secret lifecycle, project
      the same value into the backend and a narrow n8n header credential, bind
      the backend URL, and verify D10-B permits only n8n-to-backend reachability.
- [ ] Import B2 as a credential used only by credential-aware HTTP nodes. Code
      nodes have no path to it. Project the exact public media origin and prefix
      into Meeme's non-secret helper config so uploaded URLs pass the same
      allow-list in the workflow and CLI.
- [ ] Read back only safe credential metadata. A second run is unchanged.
- [ ] Run the complete Orange gate, public-content validation and
      `habit-hooks`; obtain Astra review.

### P10-G — Analytics and Buffer authority preflight

**Repository changes:** none. **State owners:** Google Analytics, Buffer and
Orange ignored sources.

- [ ] Create a dedicated GA service account, enable the GA Data API, grant
      Viewer only on the intended property, and place its JSON key only in the
      approved ignored source. Record the numeric property ID privately.
- [ ] Verify the existing Buffer key has `insightsRead`; connect Facebook,
      LinkedIn and YouTube if the account plan permits, otherwise record the
      account limit without adding another provider.
- [ ] Put credential values only into the approved ignored source files and
      verify safe metadata without printing values.

### P10-B — B2 media resource preflight

**Repository changes:** none. **State owners:** Backblaze B2 and Orange ignored
sources.

- [ ] Create a dedicated public B2 bucket and a dedicated application key
      restricted to the one media prefix and only the permissions needed to
      authorize, upload and read back metadata. Do not reuse the backup
      credential.
- [ ] Put credential values only into the approved ignored source files and
      verify safe metadata without printing values.

### V10 — Integrated verification, recovery and closure

**Repository changes:** closure record only after runtime verification.

- [ ] Verify commerce data against actual paid-order aggregates and verify GA
      traffic/funnel responses separately. Prove arbitrary-input and wrong-key
      refusals and provider-independent availability.
- [ ] Verify fixed Buffer aggregates against one owned channel, and prove a
      provider outage reports unavailable rather than zero.
- [ ] Upload one bounded media fixture through Meeme, verify the stable public
      URL directly, create removable Instagram and TikTok drafts through the
      reviewed workflow, then remove the drafts. Do not publish.
- [ ] Rotate each new credential through the reviewed lifecycle, repeat safe
      probes, then exercise disabled-state recovery without disturbing Buffer
      drafts or the open stores.
- [ ] Browser-check the deployed favicon, footer, both spacing fixes and Stripe
      disclosure at narrow and wide viewports. Verify live stays open and test
      stays Access-gated but order-enabled on Stripe sandbox.
- [ ] Update `docs/working/status.md` and durable current/decision records,
      retire this plan only when no row is open, run full validation and
      `habit-hooks`, and obtain final Astra review.

## Dependency and merge order

`L10-P → I10-A → O10-A` opens test independently. `L10-U` is independent.
`L10-C → D10-B` establishes the commerce producer and deployment seam.
`M10-S → O10-S` repairs Instagram independently. `M10-S → M10-R → P10-B →
M10-B` is the media path, so M10-B can close against its dedicated real
resource. `M10-R → P10-G → I10-B → O10-B → V10` is the reporting/activation
path: external capabilities are verified before their exact private bindings
land, and O10-B owns activation and reconciliation. P10-G never blocks the
independent media branch. Interface suppliers merge before consumers. Existing
Meeme #9, private
inventory #49 and Orange #98 remain evidence only and are not merged without a
fresh diff review against this contract. Existing Lousy Deal #231 is a bounded
launch-video workaround; it does not replace M10-B's ongoing media path.

## Rollback

Disable GA, commerce and media actions independently in private bindings while
leaving the shared Buffer draft workflow active. Restore the last reviewed
workflow artifact by digest if necessary. Close test ordering by restoring its
durable `store_open=false` binding; do not use a manual Kubernetes patch.
Revoke a suspected GA, report or B2 credential at its provider/source, seed the
replacement through OpenBao, and repeat the fixed safe probes. Storefront UI
rollback is the previous reviewed application image.
