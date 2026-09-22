# Initiative status

**The resume point.** Read this first, do `Next action`, and update this file
before you stop for any reason. The contract this executes is
[`fresh-build.md`](./fresh-build.md); §27 there states what belongs here and what
does not — it points, it does not hold.

| | |
| --- | --- |
| Updated | 2026-09-22 |
| Current slice | **LD-11 — User experience**, open. [`ld-11-user-experience.md`](./ld-11-user-experience.md) |
| In flight | G1, the browse-flow audit. Branch `deal/ld11-g1-browse-audit`, worktree `.worktrees/lousydeal/ld11-g1`. |
| Next action | Land G1, then walk G2. Part one is closed. G1 found six things and proposes six candidate fix rows; **the operator selects which become J-rows** before any of them is built. LD-07 remains deferred out of V1. |
| Blocked | Nothing. |

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
| LD-10 — Provider reporting | complete 2026-09-21; fixed commerce, analytics and owned-social reports, bounded campaign media, test ordering and storefront polish are active | [`provider-reporting.md`](../current/provider-reporting.md) |

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
| **LD-11 — User experience** | **open, started.** Sixteen rows in three parts; Part one closed: F3 by #238, F1 by #239, F2 by #240 and #241, F4 by #242, F5 by #243, F6 by #244. Part two: G1 in flight. Not V1. [`ld-11-user-experience.md`](./ld-11-user-experience.md) |

**No other V1 work is open.** On 2026-09-10 the operator closed every remaining
question at its current state, which is recorded below.

## Gates

| Gate | State |
| --- | --- |
| A — product scope | passed |
| B — brand/copy | passed |
| C — visual design | passed |
| D — per-task code review | run per row; every merged row carries its answers in its slice plan |
| E — rendered UI review | passed for LD-02 through LD-06 (LD-06 by D10 on 2026-09-11, open cart and checkout); LD-09 by V15 on 2026-09-05; LD-08 by L3 on 2026-09-12 at `STORE_OPEN=false`, and by F2 on 2026-09-13, which reached the live **open** store: one certificate, browse to checkout, as far as the disabled pay control, no charge. LD-10 had desktop and mobile browser checks, recorded in [`provider-reporting.md`](../current/provider-reporting.md), not run as Gate E and with no payment submitted. **No walk of the open store has ever covered a gift, a parcel, a discount code, or anything at or after payment.** |
| F — integration review | **passed.** Gate F order #7 proved the $44.47 certificate, merch, surcharge, gift, Stripe test authorization and analytics-absent test flow. Its two original failed mail rows were recovered with provider identifiers present. After rotating the exposed test Stripe pair, two sequential replays of the exact original signed event left the certificate, Printful submission, notifications, capture and order transaction unchanged. Test is open for sandbox ordering and remains Access-gated. |

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
| Buffer profiles | three-network launch scope verified | Meeme's gated status and channel checks pass. Instagram, TikTok and X are available, posting-authorized and automatic; Facebook, LinkedIn and YouTube remain unavailable. The deployed aggregate query returns a sanitized Instagram result through the same seam. The private Instagram and TikTok verification drafts were deleted by the operator on 2026-09-21; neither was scheduled or published. |
| Google Analytics Data API authority | **active through the gated seam** | The dedicated read-only principal authenticated against the privately bound property, whose timezone is `Europe/Tallinn`. Its exact OpenBao grant, n8n credential and reviewed workflow are active; repeat imports are unchanged. Meeme receives only the sanitized seven-day traffic and fixed funnel-event response. |
| Meta owned-asset read authority | not required | The approved LD-10 design reads owned-social aggregates through Buffer. It does not import a separate Facebook App credential. |
| B2 campaign-media authority | **active through the gated seam** | The privately bound public staging bucket and source are verified and seeded. The operator explicitly authorized its bucket-scoped management authority for disposable campaign media; Meeme's reviewed interface remains upload-only under its fixed campaign prefix. One approved PNG was uploaded and its stable public URL returned HTTP 200 with the expected type and length. |
| Printful webhook and its secret | test and live verified | Test was verified end to end — correctly signed 200, wrongly signed 401. The 2026-09-13 live provider read-back returned HTTP 200, matched the exact destination and all four expected event types, and reported its public key while the workload held the projected signing secret. |
| Merch buyable end to end | yes, 2026-09-10 | the operator completed a checkout |
| Union OSS registration, and the `EX` filing | yes / filed 2026-09-09 | the `EX` number follows within 35 working days; nothing waits on it |
| Article 28 agreement with Printful | held by incorporation | its Data Processing Terms are incorporated by ToS §19; nothing to countersign |
| Destination VAT rates verified against TEDB | yes, 2026-09-10 | all 27 agree; a pass is dated, not permanent |
| Cloudflare Access | scoped | The live storefront is public. Live admin, test storefront and test admin remain Access-gated; authenticated test visitors may order with Stripe sandbox. |
| The two VAT counters | **a standing procedure, not an open item** | `npm run report:vat-thresholds`. Nothing schedules it, deliberately. Crossing €100,000 must reach EMTA within 15 working days |

## Deployment

The live storefront is public and runs with `STORE_OPEN=true`; the test
storefront also runs with `STORE_OPEN=true`, uses Stripe sandbox and remains
Access-gated. The 2026-09-14 reconciliation left both applications
Synced/Healthy and rolled all six workloads ready. A bounded internal smoke
created an uncompleted test cart/payment session and proved cart, checkout and
Stripe readiness without confirming payment or completing an order. Release
`34788653897` built source
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

Subsequent digest promotions deployed LD-10's storefront polish and aggregate
commerce route. The 2026-09-20 public read-back found the favicon, three social
links, both control-gap rules and Stripe disclosure in the deployed assets;
live and its favicon returned HTTP 200 while test still redirected to Access.
Meeme's fixed reports returned the real paid commerce aggregate and separately
empty GA/Instagram results for the same seven completed Tallinn dates. Its
bounded media helper also stored and directly verified the approved campaign
PNG before creating the two private, unpublished Buffer verification drafts.
The operator deleted both drafts on 2026-09-21. The inactive local rollback
copy of the rotated commerce key was then irreversibly removed under explicit
operator authorization.

## Deferred ideas

None recorded. When there is one, it goes to `docs/working/backlog.md` rather
than quietly into V1 scope (§25).
