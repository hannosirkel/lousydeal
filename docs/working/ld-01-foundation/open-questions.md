# LD-01 — open questions

Batched at task boundaries rather than asked one at a time. A question whose
answer blocks the very next action is asked immediately and recorded here
anyway.

## Open

## Answered

**Q10 · answered at T7d. The store now converges onto the currency the tiers
price in.**

Medusa's `create-default-store.js:42-47` overrides `supported_currencies` to
EUR-only regardless of input, and `configure-commerce.ts` threw rather than
adding USD — so `predeploy` could not complete on a clean database.

`applyStoreCurrency` converges instead: other currencies preserved and demoted,
the deployment's currency set default with its tax preference. The refusal
survives as a post-condition, firing only if the workflow silently half-applies.

**Verified against real services, twice, and reproduced independently** — the
whole `predeploy` chain to exit 0 with three published tiers, one USD region
bound to `pp_stripe_stripe`, 27 EU tax regions at 24%, and no duplicated rows on
the second run. T7b's checkbox is met now; it was not before.

**Q8 · answered by the operator 2026-08-30. `@medusajs/admin-sdk` is added, and
T11 proves the build rather than assuming it.**

`medusa build` cannot complete on the lockfile as it stands: the backend half
compiles, the admin-frontend half fails with `"defineRouteConfig" is not
exported by __vite-optional-peer-dep`. **T11 hits this on its first build.**

The operator ruled the dependency is added. It belongs to T11, which already
declares `backend/package.json` and now declares the root lockfile too. The
reference declares `@medusajs/admin-sdk` at `2.18.0` alongside six further
admin-side packages (`admin-shared`, `caching`, `cli`, `dashboard`,
`draft-order`, `ui`), so **whether one dependency is enough is unmeasured** —
T11's verification is that both images build, not that a named package was
added.

Note the interaction with Q5: the admin bundle carries the react-router
advisories, the only cluster with a deployed-surface future. Adding the SDK does
not change that; exposing the admin would, and no row in LD-01 does.

**Q9 · answered by the operator 2026-08-30. The Region carries the provider, in
the reference's pattern, and T7 gains a checkbox for it.**

`@medusajs/medusa/dist/api/store/payment-providers/route.js:7-15` filters by
`region_id`, so the Region link — not the module registration — is what a
storefront can see. Registering the Stripe package registers eight provider
services and offers none of them until something binds one.

The reference does it as a **field on the region record**, not a separate step:
`~/app/plepic/backend/src/commerce/configuration.ts` carries
`paymentProviderIds: [STRIPE_PAYMENT_PROVIDER_ID]` beside the region's currency,
countries and tax flags. T7 already declares `configure-commerce.ts` and already
configures the region, so this is one more checkbox there rather than a new
task: **T7c, `93a5605cdcad`**.

It also settles what T6b's review deleted. `payment.ts` had claimed "the
customer-facing gate is a later row's Region link", which was false because no
such row existed. The row exists now; the sentence stays deleted, because the
binding is asserted by a test rather than by a comment.

**Q2 · answered 2026-08-30. The diagnosis was wrong about the mechanism; the
window was too short, not the retry logic.**

lychee does retry 5xx — `lychee-lib/src/retry.rs:21-26` in the pinned 0.24.2,
all 5xx plus 408 and 429 are retryable. The problem was the window:
`max_retries = 2` gave three attempts across 1s+2s, which a GitHub blip past
~3s outlives. Fixed in `lychee.toml`: `max_retries = 4`, `retry_wait_time = 3`,
five attempts across 3+6+12+24 = 45 seconds. The token theory was rejected: in
0.24.2 a token never reaches the plain HTTP GET, only the API fallback, which
would help only 2 of the 12 `github.com` links. The duplicate run belongs to
T12.

**Q5 · answered 2026-08-30. 77 rows are 11 root advisories across 7 packages;
the pin holds through LD-01.**

Of the 65 "high" rows only 2 are root highs. None is reachable from what this
project runs; the react-router cluster in the admin bundle is the only one
with a deployed future, at T15. No 2.18.1 exists; 2.19.0 fixes 7 of 11, and
npm's `fixAvailable` over-promises. The pin holds through LD-01, with a
lockstep bump of both repositories recommended before T15.

**Q6 · answered 2026-08-30. Items 1, 4 and 7 settled false and corrected;
item 2 true in substance with its universal removed; item 3 already settled;
item 6 re-measured true; item 5 alone still waits.**

Items 1, 4 and 7 settled **false** and are corrected here, in
`redis-preflight.ts` and `database-url.ts`. Item 2 settled **true in
substance**, with its universal removed. Item 3 was already settled. Item 6
was re-measured **true**. **Item 5 alone is not settleable** and waits for
T17, which should conform its artefacts to the frozen description rather than
the reverse.

**Q7 · answered by the operator at T6b. Card, Google Pay, Apple Pay, Link and
PayPal — and most of the answer is not this repository's business.**

Registering `@medusajs/medusa/payment-stripe` registers eight provider services,
all upserted `is_enabled: true`
(`node_modules/@medusajs/payment/dist/loaders/providers.js:81-95`). The operator
chose to offer **card, Google Pay, Apple Pay, Link (collapsed) and PayPal**, and
nothing else.

**Three of those five are not Medusa providers.** Google Pay, Apple Pay and Link
are wallet methods on the card PaymentIntent, surfaced by Stripe's Payment
Element. Medusa needs no configuration for any of them, and "collapsed" is not a
setting — it describes what `wallets: { link: "auto" }` produces, Link appearing
inside the card flow rather than as its own tab.

**What the code had to get right was to not pin `payment_method_types`.** It does
not: `@medusajs/payment-stripe/dist/services/stripe-provider.js:12`'s
`paymentIntentOptions` returns `{}`, and only the seven country sub-providers
pin theirs. T6b sets `automaticPaymentMethods: true` explicitly rather than
relying on the installed SDK's pinned API version defaulting to it.

**The eight registrations stay, and that is not a defect.** There is no supported
option to subset them —
`@medusajs/modules-sdk/dist/loaders/module-provider-loader.js:32-35` throws on an
empty `services` and then maps over all of them with no filter. The
customer-facing gate is the Region link:
`@medusajs/medusa/dist/api/store/payment-providers/route.js:7-15` requires a
`region_id` and filters by it. **No row in this plan performs that binding**, and
a row that does is needed before a storefront can offer anything.

**Operator work, in the Stripe Dashboard, test mode throughout.** Enable the
five; disable bancontact, blik, giropay, iDEAL, Przelewy24, PromptPay and OXXO;
register `test.lousydeal.com` as a payment method domain, without which none of
the four wallets renders. Optionally create a payment method configuration and
set `STRIPE_PAYMENT_METHOD_CONFIGURATION_ID`, which T6b reads optionally — the
value is a `pmc_…` id, not a secret, and requiring it would block boot on a
manual step no row performs.

**Two residues, both the operator's.** PayPal through Stripe requires the
merchant account be in Europe, Switzerland or the UK, and **nothing in this
repository records the Stripe account's country**. And payment method domain
validation of `test.lousydeal.com` may be blocked by Cloudflare Access — the
domain object returns per-method statuses, so it is checkable after registering
and a bypass is available. T16 owns that gate.

**Q4 · answered at T2b, and the answer is a rule rather than a patch.**

`README.md` stated that the catalogue records `languages: [shell]` and
`npm_project: false`. T2a falsified it. `AGENTS.md` had carried the same claim
and was corrected at T2c because it happened to be in that row's `Files` list;
`README.md` was in no open row's, and Q1's answer had put it in T1b's, which had
closed.

That was the third occurrence of one failure: a tracked document falsified by a
merge, with no row authorised to correct it. The operator chose a class-level
answer over a third patch.

**The plan gained global constraint 9 at T2b:** *a row that falsifies a tracked
document carries that document in its `Files` list.* Constraints are copied
verbatim into every subagent's context packet, so the remaining rows inherit it
with their work rather than depending on the orchestrator remembering. A
decision record is exempt — it states what was decided then, and is superseded
rather than rewritten.

`README.md` was added to T2b's `Files` list and corrected in the same row. The
plan's own "Current repository facts" table, stale on three counts, was
refreshed under the new constraint at the same time.

**2026-08-29 · T1 boundary batch.** Q1 below, and the workspace typecheck gap
raised at review pass 2. Both answered; see `decisions.md`. Q1 resolved by
option 1 — `AGENTS.md` and `README.md` added to T1b's `Files` list. The
typecheck gap resolved by guarding it in `scripts/validate`, which T1b owns.

**Q1 · raised at the T1a review, for the T1 boundary. Three documents describe
this repository as holding no application code, and no row's `Files` list can
correct them.**

`AGENTS.md` lines 60–62 and `README.md` lines 12–13 both say the repository
"holds documentation and the checks that gate it" and that `typescript` joins the
catalogue "in the same commit as the first TypeScript file, never ahead of it".
`docs/decisions/001` line 53 says `npm_project` becomes `true` "at the same
moment".

T1a introduces the first TypeScript file. The plan defers the catalogue flip to
T2 as a separate pull request against `architecture`, which is correct under
Global Constraint 6 — a row's file list stays inside one repository. But the
consequence is that from the moment T1a merges, three tracked documents in this
repository state something false about it, and **no row in the 26-row plan
declares `AGENTS.md` or `README.md` in its `Files` list**, so no subagent has the
authority to fix them.

The `AGENTS.md` paragraph sits outside the managed architecture baseline markers,
so it is editable here rather than regenerated from `architecture`.

Three ways to close it, for the operator to choose:

1. Add `README.md` and the `AGENTS.md` prose section to T1b's `Files` list and
   correct them there, one row after the statement stops being true.
2. Carry it to LD-01 retirement, where the binding already relocates durable
   facts to `docs/current/`. The documents stay wrong for the width of the slice.
3. Treat it as out of scope for LD-01 and open it as the first entry in
   `docs/issues/`, which the binding declares absent "and correctly so, until the
   first known issue".

Editing the plan changes what the ledger hashes, so option 1 is a plan edit that
must happen before T1b is classified, not after.

**2026-08-29 · preflight batch.** Five account-ownership questions, the T13a
size override, and the two absent tools. All answered; see `decisions.md`.
