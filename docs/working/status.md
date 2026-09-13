# Initiative status

**The resume point.** Read this first, do `Next action`, and update this file
before you stop for any reason. The contract this executes is
[`fresh-build.md`](./fresh-build.md); §27 there states what belongs here and what
does not — it points, it does not hold.

| | |
| --- | --- |
| Updated | 2026-09-13 |
| Current slice | **LD-08 — Launch polish**, implementation merged; release and deployed verification in progress |
| In flight | L0–L4 (#215–#219), the LD-10 deferral (#220), D1 (Deploys #41), M1 (Meeme #8), O1 (inventory #48, Orange #97), the release repair (#221) and the predeploy mail-provider repair (Orange #99) are merged. Release `34753505217` validated, built, scanned and promoted main. Live runs backend `sha256:49b5cf3c…` and storefront `sha256:3210535f…`; test retains its distinct Gate F digests. Both Argo applications were Synced/Healthy after the 2026-09-13 reconcile. Live and test remain `STORE_OPEN=false`; Cloudflare Access still gates both public hostnames. |
| Next action | Complete the two human-authority steps already prepared: obtain a short-lived OpenBao OIDC operator session, seed/verify the live Printful and Meeme social sources, then merge and reconcile private inventory #50; and rotate the exposed test-mode Stripe keys before any further Stripe test. Separately disable Google Enhanced Measurement and the named Google/Meta account-side automatic collection settings. Recover only Gate F order #7's two original failed email rows after explicit authorization, then complete E1/F2 and the final evidence PR. |
| Blocked | **Closed public publication** waits on operator confirmation of Printful billing, the scoped Access removal and unauthenticated closed-site verification; it does not require live Stripe readiness. **LD-08 completion** still requires all eleven criteria, including live Printful secret/runtime/webhook evidence, live Stripe runtime/key and webhook evidence, Buffer draft lifecycle evidence, clean analytics account read-back, recovered Gate F mail and public verification. **Payment opening** is later and remains blocked on Stripe account acceptance plus an explicit `STORE_OPEN=true` promotion. Provider reporting remains deferred and non-blocking in [`LD-10`](./ld-10-provider-reporting.md). |

Nothing in this file is a secret. No credential value, no live private hostname,
no rendered Secret. It is public, like the rest of the repository.

## Done

| Slice | State | Record |
| --- | --- | --- |
| LD-00 — Governance | closed | `fresh-build.md` itself |
| LD-01 — Foundation | closed by the operator 2026-09-06 | [`ld-01-foundation.md`](./ld-01-foundation.md) |
| LD-09 — Visual identity | complete; sixteen rows, PRs 71–83 here and 35 in `deploys` | [`ld-09-visual-identity.md`](./ld-09-visual-identity.md) |
| LD-02 — Certificates | complete 2026-09-07; sixteen rows across three repositories | [`ld-02-certificates.md`](./ld-02-certificates.md) |
| LD-03 — Gifting | complete 2026-09-08; nine rows, `lousydeal` only | [`ld-03-gifting.md`](./ld-03-gifting.md) |
| LD-05 — Baldrick | complete 2026-09-08; nine rows, PRs 126–136 | [`ld-05-baldrick.md`](./ld-05-baldrick.md) |
| LD-04 — Printful and merch | complete 2026-09-10; thirty-two rows across three repositories | [`ld-04-merch.md`](./ld-04-merch.md) |
| LD-06 — Worse discounts | complete 2026-09-11; eleven rows and PRs 199–211 plus the closure record | [`ld-06-discounts.md`](./ld-06-discounts.md) |

**Each of those has been driven end to end, not merely built.** LD-02 paid for a
certificate on the test environment and sent the § 55 confirmation; LD-03 paid
for a gift to a different address and the recipient's details reached no public
surface; LD-05 held a real ten-turn conversation from the keyboard against a
production build; LD-04's checkout was completed by the operator on 2026-09-10
with real Printful postage — `ATTACHED postage = 6.48`, `cart total = 38.48`;
LD-06 captured `$44.47` for a coded order, issued its `$6.00` certificate and
kept the surcharge out of its Printful order.

## Open

| Slice | State |
| --- | --- |
| **LD-07 — Enterprise** | **deferred out of V1** by operator decision. A numbered slot, not work. §10, §26 |
| **LD-08 — Launch polish** | implementation and release repairs are merged and deployed closed. E1/F1/F2 are partially evidenced; external account authority and final publication gates remain. |
| **LD-10 — Provider reporting** | **deferred post-launch, non-blocking.** [`ld-10-provider-reporting.md`](./ld-10-provider-reporting.md) owns the external authority, aggregate-report, private-binding, Orange lifecycle and recovery work. Its Meeme #9, private inventory #49 and Orange #98 drafts are evidence only and require re-review/rebase on repaired, merged M1/O1 before use. |

**No other V1 work is open.** On 2026-09-10 the operator closed every remaining
question at its current state, which is recorded below.

## Gates

| Gate | State |
| --- | --- |
| A — product scope | passed |
| B — brand/copy | passed |
| C — visual design | passed |
| D — per-task code review | run per row; every merged row carries its answers in its slice plan |
| E — rendered UI review | passed for LD-02 through LD-06 |
| F — integration review | **in progress.** Gate F order #7 proved the $44.47 certificate, merch, surcharge, gift, Stripe test authorization and analytics-absent test flow; email recovery and duplicate-webhook evidence remain. Test was returned closed immediately. |

## What the operator closed on 2026-09-10

Their instruction: the current state of each is the decided state. None of them
is deferred, and none returns as an open item.

| Item | Closed as | Written up in |
| --- | --- | --- |
| §23 legal gate, items 8, 10, 12, 13, 17, 18 | the position the documents already state, accepted as an exposure rather than resolved | [`ld-09-visual-identity.md`](./ld-09-visual-identity.md) |
| §23 item 15 — the deletion job for the seven-year accounting record | **not built.** Retention is enforced by hand. The first record does not reach seven years old until 2033 | same |
| Eight questions for EMTA, across `013`, `014` and `015` | proceed on the reading each document argues. None gates code and none can change a total anybody paid | [`013`](../decisions/013-the-vat-arrangement.md) |
| Decision `009`, reopened by the OSS registration | absorbed VAT stands unchanged; the margin varies by destination, the price does not | [`009`](../decisions/009-merchant-absorbs-the-vat.md) |
| The sticker's cut | cut to shape, as rendered — not the 4″ square the row described | [`ld-04-merch.md`](./ld-04-merch.md) |
| Argo CD's sync cadence | observed and tolerated; a manual sync is the workaround | same |
| LD-02's two `OWNER MUST FILL` items | the inscription is retained with the order for seven years; a certificate link is not re-issued, so the confirmation email remains its only copy | [`ld-09-visual-identity.md`](./ld-09-visual-identity.md) |
| Whether the €10,000 threshold was crossed earlier in 2026 | it was not — the shop has taken no live payment | [`013`](../decisions/013-the-vat-arrangement.md) |

**One correction belongs here rather than buried.** The date the Latvian `EX`
takes effect was described as unblocking a zero rate in code. There is no such
switch: `vatRateFor` grosses up postage by the destination's rate and treats
Latvia like every other member state. The `EX` reaches the quarterly report and
the €50,000 counter, both already built.

## Operator items

What is actually held, as against what the contract expects in §2b.

| Item | Held | Note |
| --- | --- | --- |
| Domain `lousydeal.com` | yes | DNS not yet published |
| Company identity, Aislopica OÜ | yes | §2b |
| Merchant identity in the private `orange.yml` | yes | both environments render `Aislopica OÜ`; the imprint has no gap |
| Stripe test-mode keys | **rotation required** | Both test-mode values were exposed in a 2026-09-13 operator-session command output. Treat them as compromised, rotate them in Stripe, then update through the existing OpenBao lifecycle before another Stripe test. No live key was involved. |
| **Stripe live keys** | **no** | not before the publication gate, by design. An LD-08 item |
| SMTP credentials, host, port, servername, egress CIDR | yes | mail verified sending from both environments |
| Printful test store | yes | Existing token, webhook and four products remain the Gate F test path. Order #7 reached Printful and failed at the known missing-billing gate. |
| Printful live store | prepared, not projected | The live token is paired with a newly subscribed signing secret; exactly four committed products were reconciled, and the immediate second run reported four unchanged and zero mutations. Private inventory #50 enables projection after OpenBao seeding. |
| **Printful billing information** | **no** | Required before publication. The LD-06 test order reached Printful with only its shirt, then failed at billing. An LD-08 item |
| Google Analytics Data API authority | **no** | LD-10 needs a dedicated read-only principal, the numeric GA4 property ID and a property Viewer grant for aggregate reports. **Non-blocking:** the deferred post-launch initiative waits on it; LD-08 does not |
| Meta owned-asset read authority | **no** | LD-10 needs a valid authorized Page and linked professional Instagram asset token with verified read scopes; the Facebook App ID/secret is not data access authority. **Non-blocking**, like the row above |
| Printful webhook and its secret | yes | verified end to end — correctly signed 200, wrongly signed 401 |
| Merch buyable end to end | yes, 2026-09-10 | the operator completed a checkout |
| Union OSS registration, and the `EX` filing | yes / filed 2026-09-09 | the `EX` number follows within 35 working days; nothing waits on it |
| Article 28 agreement with Printful | held by incorporation | its Data Processing Terms are incorporated by ToS §19; nothing to countersign |
| Destination VAT rates verified against TEDB | yes, 2026-09-10 | all 27 agree; a pass is dated, not permanent |
| Cloudflare Access on all three hostnames | yes | measured 2026-09-05: each answers 302 |
| The two VAT counters | **a standing procedure, not an open item** | `npm run report:vat-thresholds`. Nothing schedules it, deliberately. Crossing €100,000 must reach EMTA within 15 working days |

## Deployment

Both environments run the storefront closed and are still gated behind
Cloudflare Access. Through the live origin, the complete homepage returned 200
with the closure notice and trader identity while cart creation returned 503
`store_closed`; live public totals remained zero while test held seven deals.
**Deploying is not publishing**, and the site is not yet public.
`deploys/lousydeal/` carries the base and both overlays; images are promoted by
digest.

## Deferred ideas

None recorded. When there is one, it goes to `docs/working/backlog.md` rather
than quietly into V1 scope (§25).
