# Initiative status

**The resume point.** Read this first, do `Next action`, and update this file
before you stop for any reason. The contract this executes is
[`fresh-build.md`](./fresh-build.md); §27 there states what belongs here and what
does not — it points, it does not hold.

| | |
| --- | --- |
| Updated | 2026-09-10 |
| Current slice | **LD-06 — Worse discounts.** Plan: [`ld-06-discounts.md`](./ld-06-discounts.md) |
| In flight | **D1**, the code table and its arithmetic: branch `deal/ld06-d1-codes`, worktree `~/app/.worktrees/lousydeal/ld06-d1`. D0 merged as #199 |
| Next action | Once D1 merges, execute **D2** (the backend's classifiers). Rows run in the plan's order: constraint 7 puts every line classifier before the one route that writes a surcharge |
| Blocked | nothing. `FREE`'s fee was named by the operator on 2026-09-10: $1.00 |

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

**Each of those has been driven end to end, not merely built.** LD-02 paid for a
certificate on the test environment and sent the § 55 confirmation; LD-03 paid
for a gift to a different address and the recipient's details reached no public
surface; LD-05 held a real ten-turn conversation from the keyboard against a
production build; LD-04's checkout was completed by the operator on 2026-09-10
with real Printful postage — `ATTACHED postage = 6.48`, `cart total = 38.48`.

## Open

| Slice | State |
| --- | --- |
| **LD-06 — Worse discounts** | **in flight.** Planned 2026-09-10 as eleven rows, D0–D10, `lousydeal` only. Five operator decisions are recorded at the head of the plan |
| **LD-07 — Enterprise** | **deferred out of V1** by operator decision. A numbered slot, not work. §10, §26 |
| **LD-08 — Launch polish** | not started, and last. Responsive review, accessibility, SEO, metadata, analytics, performance, error states, final copy and visual review, production readiness |

**Nothing else is open.** On 2026-09-10 the operator closed every remaining
question at its current state, which is recorded below.

## Gates

| Gate | State |
| --- | --- |
| A — product scope | passed |
| B — brand/copy | passed |
| C — visual design | passed |
| D — per-task code review | run per row; every merged row carries its answers in its slice plan |
| E — rendered UI review | passed for LD-02, LD-03, LD-04 and LD-05 |
| F — integration review | **not run.** It is before production and belongs with LD-08 |

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
| Stripe test-mode keys | yes | `.keys/stripe-lousydeal-test` in the Orange checkout, provider-first per `006` |
| **Stripe live keys** | **no** | not before the publication gate, by design. An LD-08 item |
| SMTP credentials, host, port, servername, egress CIDR | yes | mail verified sending from both environments |
| Printful account, store token, four products | yes | eight scopes, verified by read-back; artwork fetched from this repository at a pinned commit |
| Printful webhook and its secret | yes | verified end to end — correctly signed 200, wrongly signed 401 |
| Merch buyable end to end | yes, 2026-09-10 | the operator completed a checkout |
| Union OSS registration, and the `EX` filing | yes / filed 2026-09-09 | the `EX` number follows within 35 working days; nothing waits on it |
| Article 28 agreement with Printful | held by incorporation | its Data Processing Terms are incorporated by ToS §19; nothing to countersign |
| Destination VAT rates verified against TEDB | yes, 2026-09-10 | all 27 agree; a pass is dated, not permanent |
| Cloudflare Access on all three hostnames | yes | measured 2026-09-05: each answers 302 |
| The two VAT counters | **a standing procedure, not an open item** | `npm run report:vat-thresholds`. Nothing schedules it, deliberately. Crossing €100,000 must reach EMTA within 15 working days |

## Deployment

Both environments run the storefront and are gated behind Cloudflare Access.
**Deploying is not publishing**, and nothing here has been published.
`deploys/lousydeal/` carries the base and both overlays; images are promoted by
digest.

## Deferred ideas

None recorded. When there is one, it goes to `docs/working/backlog.md` rather
than quietly into V1 scope (§25).
