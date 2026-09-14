# Initiative status

**The resume point.** Read this first, do `Next action`, and update this file
before you stop for any reason. The contract this executes is
[`fresh-build.md`](./fresh-build.md); §27 there states what belongs here and what
does not — it points, it does not hold.

| | |
| --- | --- |
| Updated | 2026-09-14 |
| Current slice | **LD-10 — Meeme reporting, social delivery and operating polish is active.** |
| In flight | The operator approved the expanded [`LD-10`](./ld-10-provider-reporting.md) design: fixed transaction/traffic/conversion and owned-social aggregates, Instagram repair, gated B2 media uploads, test ordering, and the favicon/footer/form-spacing/Stripe-trust polish. This planning PR is the first row; implementation has not started. |
| Next action | Merge L10-P after validation and Astra review, then open test ordering through I10-A/O10-A while L10-U and the reporting interface begin independently. |
| Blocked | Runtime completion needs a dedicated GA Viewer principal and dedicated B2 bucket/key. Their absence does not block the plan, storefront polish, Instagram repair, commerce interface or test opening. |

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
| LD-08 — Launch polish | complete 2026-09-13; the public live store is open with analytics, fulfillment and live payment configuration verified | [`ld-08-launch-polish.md`](./ld-08-launch-polish.md) |

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
| **LD-10 — Meeme reporting, social delivery and operating polish** | **active.** [`ld-10-provider-reporting.md`](./ld-10-provider-reporting.md) owns the approved cross-system execution contract. Its old Meeme #9, private inventory #49 and Orange #98 drafts are evidence only and require fresh review before any reuse. |

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
| F — integration review | **passed.** Gate F order #7 proved the $44.47 certificate, merch, surcharge, gift, Stripe test authorization and analytics-absent test flow. Its two original failed mail rows were recovered with provider identifiers present. After rotating the exposed test Stripe pair, two sequential replays of the exact original signed event left the certificate, Printful submission, notifications, capture and order transaction unchanged. Test remains closed and Access-gated. |

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
| Domain `lousydeal.com` | yes | public at the apex; `www` redirects permanently to it |
| Company identity, Aislopica OÜ | yes | §2b |
| Merchant identity in the private `orange.yml` | yes | both environments render `Aislopica OÜ`; the imprint has no gap |
| Stripe test-mode keys | rotated and verified | The exposed pair was replaced on 2026-09-13 through the exact-version OpenBao lifecycle. Version advanced from 3 to 4, ESO delivered a newer Secret, backend and worker rolled ready, API authentication and valid/invalid signature behavior passed before and after the old values were revoked. No live key was involved. |
| **Stripe live keys** | projected and verified | The dedicated live source is at OpenBao version 3. All ten expected runtime fields were projected; Stripe authenticated from the workload with live key shapes, and the backend, worker and storefront were restarted onto the refreshed Secret. |
| SMTP credentials, host, port, servername, egress CIDR | yes | mail verified sending from both environments |
| Printful test store | yes | Existing token, webhook and four products remain the Gate F test path. Order #7 reached Printful and failed at the known missing-billing gate. |
| Printful live store | projected and verified | The dedicated live source and signing secret are projected. The 2026-09-13 runtime reconciliation reported zero mutations, four unchanged handles and zero unrecognised products; the idempotent Medusa join reported four records and nine variants. The v2 provider read-back returned HTTP 200, the exact live destination and four expected event types, with its public key present. |
| **Printful billing information** | yes | The operator confirmed the live store's billing method on 2026-09-13 before payments opened. |
| Buffer profiles | three-network launch scope verified | Meeme's gated status and channel checks pass. Instagram, TikTok and X are available exactly as supplied; one private X draft was created through Meeme and removed in the same operator session. Facebook, LinkedIn and YouTube remain supported in code, but their Buffer connections and runtime verification are deferred to LD-10. |
| Google Analytics Data API authority | **no** | LD-10 needs a dedicated read-only principal, the numeric GA4 property ID and a property Viewer grant for aggregate reports. **Non-blocking:** the deferred post-launch initiative waits on it; LD-08 does not |
| Meta owned-asset read authority | **no** | LD-10 needs a valid authorized Page and linked professional Instagram asset token with verified read scopes; the Facebook App ID/secret is not data access authority. **Non-blocking**, like the row above |
| Printful webhook and its secret | test and live verified | Test was verified end to end — correctly signed 200, wrongly signed 401. The 2026-09-13 live provider read-back returned HTTP 200, matched the exact destination and all four expected event types, and reported its public key while the workload held the projected signing secret. |
| Merch buyable end to end | yes, 2026-09-10 | the operator completed a checkout |
| Union OSS registration, and the `EX` filing | yes / filed 2026-09-09 | the `EX` number follows within 35 working days; nothing waits on it |
| Article 28 agreement with Printful | held by incorporation | its Data Processing Terms are incorporated by ToS §19; nothing to countersign |
| Destination VAT rates verified against TEDB | yes, 2026-09-10 | all 27 agree; a pass is dated, not permanent |
| Cloudflare Access | scoped | The live storefront is public. Live admin, test storefront and test admin still answer with the Access redirect. |
| The two VAT counters | **a standing procedure, not an open item** | `npm run report:vat-thresholds`. Nothing schedules it, deliberately. Crossing €100,000 must reach EMTA within 15 working days |

## Deployment

The live storefront is public and runs with `STORE_OPEN=true`; the test
storefront remains closed and Access-gated. Release `34788653897` built source
revision `827ed15` and promoted backend
`sha256:228fca784da04e4382ef5c5c5dc2f5125a3773cb7278a9c7c5871d396bd2fda7`
and storefront
`sha256:e6112f4db306ba2923a23a00b9ddee62ad1cb07cd53db5e804b103013fa26a53`
through Deploys revision `571c05c8`. A read-only runtime check matched that
backend digest on backend and worker and the storefront digest on storefront;
all six live/test workloads were healthy.
After opening, an unauthenticated client created and read a real empty live
cart, reached checkout, and loaded Stripe's Payment Element with only the live
publishable key; no payment was submitted and the completed live-order count
remained zero. `deploys/lousydeal/` carries the base and both overlays; images
are promoted by digest.

## Deferred ideas

None recorded. When there is one, it goes to `docs/working/backlog.md` rather
than quietly into V1 scope (§25).
