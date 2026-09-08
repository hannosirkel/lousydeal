# LD-03 — Gifting

Let a buyer pay for a certificate somebody else receives, without either of
them holding an account, and without publishing the recipient's name.

The contract is [`fresh-build.md`](./fresh-build.md); this slice executes its
§17 LD-03 line against §6 (gift purchases), §16 (domain model, "gift
metadata"), and §23 (legal and payment UX). It builds on
[LD-02](./ld-02-certificates.md), complete on 2026-09-07, whose certificate,
mail transport and § 55 confirmation this slice extends rather than replaces.

**The buyer is the consumer; the recipient is a stranger to the contract.**
That sentence decides most of this plan. The buyer pays, so the buyer holds
every right VÕS gives a consumer — the § 55(1)–(2) confirmation, the 14-day
withdrawal, the § 56⁴ function. The recipient gets a certificate and an email,
has no contract with us, and never gave us their address: the buyer did, on
their behalf, without being asked. That is a lawful basis question and a
minimisation question before it is a feature.

**Execution.** Directly, not through `big-build`. Nine rows, one pull request
each, in `lousydeal` only. No `deploys` or `orange` change: this slice adds no
environment value, no secret and no network destination — the mail transport
LD-02 built is the one this uses.

## Global constraints

LD-02's, carried forward. Constraints 1, 2, 3, 9, 12 and 13 are unchanged and
are not restated in full; what follows is what this slice adds or sharpens.

1. **Never commit a secret.** Unchanged. This slice introduces none, which is
   worth stating because it is the first slice since LD-01 that does not.
2. **Nothing environment-specific in a built artifact.** Unchanged. The gift
   email reads `SITE_BASE_URL` the way LD-02's confirmation does.
3. **One pull request closes one row**, 800 lines and 10 files, operator
   override by name. Unchanged.
4. **The recipient's name and email are never public.** Settled by the operator
   on 2026-09-07. The public certificate carries what the *buyer* typed into
   §5's `display_name` and `dedication` — the fields LD-02 already publishes,
   already filters, and already warns are public before payment. A gift adds no
   public field. A third party's name on an indexable page, supplied by someone
   else, is a different thing from your own name on your own certificate, and
   this slice does not do it.
5. **The recipient receives a certificate, not a contract.** No § 54(1)
   information, no withdrawal form, no consent recital in the recipient's
   email. Those belong to the buyer and sending them to the recipient would
   misdescribe who holds them.
6. **Two messages per gift order, and the buyer's is still the § 55 one.** The
   buyer's confirmation gains a line saying where the certificate went; it does
   not become a gift message. A confirmation that stopped reciting § 54(1)
   because the order was a gift would breach § 55(2).
7. **Data minimisation is a design constraint, not a policy sentence.** The
   recipient's address is used to send one message and is then only order data.
   No list, no second send, no re-send, no reminder, no "your friend hasn't
   opened it yet".
8. **A row that falsifies a tracked document carries it.** LD-02's constraint 9.
   Three documents currently say gifting does not exist: `brand.md`'s "No gift
   toggle", `terms.ts`'s header, and LD-02's own deferral table. The rows that
   make them false correct them.
9. **Retries mint nothing twice.** §16: "Stripe/webhook retries must not
   generate duplicate certificates, Printful orders, or gifts." LD-02's C2 made
   issuance idempotent; the gift send has to be too, and by the same evidence —
   fire the event twice and count the messages.

## Current repository facts

Measured against `origin/main` at `eae0900`, 2026-09-07. LD-02's plan opens with
the same warning and it earned it: a plan that assumes a codebase it has not
read produces rows that cannot be executed.

| Fact | Where | Consequence for this slice |
| --- | --- | --- |
| Cart metadata is the only channel from checkout to order | `backend/src/modules/deal/inscription.ts`, `storefront/src/lib/store-checkout.ts:130` | Gift fields travel the same way, under the same `lousydeal_` prefix, and are written twice — once per workspace — because there is no shared package. G2 states that duplication rather than hiding it. |
| Medusa's cart validator accepts **any** metadata | `@medusajs/medusa/dist/api/store/carts/validators.js` — `z.record(z.string(), z.unknown())` | Nothing rejects a hostile key. The filter is ours, on read, as §5's is. |
| The deal model has ten columns and no gift field | `backend/src/modules/deal/models/lousy-deal.ts` | §16 names "gift metadata" on the deal. G1 adds it and generates the migration; `medusa db:generate deal` only notices changes under `models/`. |
| `DEAL_STATUSES` is `["issued", "hidden"]` | same, `:36` | A gift is not a status. It is orthogonal to moderation and must not become a third enum value. |
| `amount_paid` is a `bigNumber` | same, `:94` | LD-02's fix row is the precedent: money arrives as a `BigNumber`, not a number. Any new code that reads an amount reads it through `amount()`. |
| The § 55 confirmation is built by one function | `backend/src/notifications/order-confirmation.ts` | G4 extends it rather than forking it. A second builder that drifted from § 55(2) is the failure `legal-consistency.test.ts` exists to prevent, one layer down. |
| There is no shared `transactional-email.ts` | LD-02's completion report | This slice adds a third message. Three callers is where the wrapper stops being guessed; G4 decides on the evidence rather than in advance. |
| The Privacy Policy describes only the buyer's data | `storefront/src/content/legal/privacy.ts` §3, §7 | It has no basis, no retention and no mention for a third party's address. G7 writes them. |
| The Terms say gifting is not mentioned, on purpose | `storefront/src/content/legal/terms.ts:53` — "The row that builds gifting writes its clause" | G7 is that row. |
| `brand.md` says "No gift toggle … a toggle that does nothing is a lie in a control" | `docs/current/brand.md:327` | G8 corrects it once the control does something. |
| The checkout is one form, already carrying six inputs | `storefront/src/app/checkout/PaymentForm.tsx` | Four more fields, conditionally shown, is the largest single change to that page since C3. G3 owns the layout at 390px, not a later row. |
| `legal-consistency.test.ts` collects **eight** surfaces | `storefront/tests/` | Any gift copy that mentions withdrawal or the confirmation joins that list, or the guard is narrower than the claim. |

## Target exposure

Both environments, both behind Cloudflare Access. §23's legal gate precedes
publication and this slice does not close it.

**This slice sends mail to somebody who did not place an order.** That is new,
and it is the only genuinely outward-facing thing here. Every other send in
LD-02 goes to the person who just paid. A gift message goes to an address a
third party typed in, which means the failure mode is not "our mail is broken"
but "we mailed a stranger". The constraints above exist for that; G5 is where
they are enforced and G9 is where a real one is sent and looked at.

No new secret, no new network destination, no new environment value.

## Completion criteria

| # | Criterion | Row |
| --- | --- | --- |
| 1 | The deal records who a gift went to, and a non-gift records nothing | G1 |
| 2 | The checkout collects recipient name, recipient email, optional sender name, optional message — and only when the buyer asks to gift | G2, G3 |
| 3 | The recipient's fields are filtered the way §5's are, and the filter is one specification both workspaces run | G2 |
| 4 | The recipient gets an email carrying the certificate link and the sender's message, and nothing that belongs to the buyer | G4, G5 |
| 5 | The buyer's § 55 confirmation still carries everything § 54(1) and § 55(2) require, plus where the certificate went | G4 |
| 6 | A replayed `order.placed` sends no second gift message | G5 |
| 7 | No public surface carries the recipient's name or address | G6 |
| 8 | The Privacy Policy states the basis and retention for a third party's address; the Terms carry a gifting clause | G7 |
| 9 | No document still says gifting does not exist | G7, G8 |
| 10 | Gate D on every row, Gate E on a real gift order, and the record written | G9 |

## Rows

Nine. Each names its repository, its files and its one checkbox. The order is a
dependency order: G1 before G2, G2 before G4, G4 before G5.

### G0 — This plan

**Repository:** `lousydeal`.
**Files:** `docs/working/ld-03-gifting.md`, `docs/working/status.md`.

- [ ] Land the plan and move the resume point to it.

### G1 — Gift metadata on the deal

**Repository:** `lousydeal`.
**Files:** `backend/src/modules/deal/models/lousy-deal.ts`,
`backend/src/modules/deal/migrations/*` (generated),
`backend/src/modules/deal/issue.ts`, `backend/tests/deal-model.test.ts`.

- [ ] Record who a gift went to, on the deal, without making a gift a status.

§16 names "gift metadata" among the deal's fields. Four nullable columns —
recipient name, recipient email, sender name, message — and a deal is a gift if
the recipient email is present. Not a boolean beside them: two fields that can
disagree is a state nobody meant, and the address is the one field a gift
cannot lack.

**The recipient's address is on the deal and not only on the order** because
the deal is what the send is derived from, and G5 must be able to answer "was
this already sent" from the row it just read. That is the same argument C2 made
for issuance.

`medusa db:generate deal` only notices changes under `models/`; C1 lost an
afternoon to that and the row records it so this one does not.

### G2 — What the buyer types, and what survives it

**Repository:** `lousydeal`.
**Files:** `backend/src/modules/deal/gift.ts`,
`storefront/src/lib/gift.ts`, `tests/fixtures/gift-cases.json`,
`backend/tests/gift.test.ts`, `storefront/tests/gift.test.ts`.

- [ ] Filter the four gift fields the way §5's two are filtered, from one
      specification both workspaces run.

The shared-filter arrangement C3c built: a character-identical filter in both
workspaces between sentinels, and `tests/fixtures/gift-cases.json` as the one
specification each runs. There is no package to share code through and this
plan does not invent one.

**The recipient's email is validated, not sanitised.** The other three are free
text and get §5's treatment — links, addresses and markup removed. An address
that has been "cleaned" is an address that may no longer reach the person it
names, and a gift that silently goes nowhere is worse than one refused at the
checkout.

**The message is bounded at the dedication's 120 characters.** Not because a
longer one would break anything, but because §5 already settled what a
sentence-length field on this product is, and a second answer would be an
accident rather than a decision.

### G3 — The checkout asks

**Repository:** `lousydeal`.
**Files:** `storefront/src/app/checkout/PaymentForm.tsx`,
`storefront/src/content/checkout.ts`, `storefront/src/lib/store-checkout.ts`,
`storefront/tests/checkout-gift.test.ts`.

- [ ] Collect the four fields, only when the buyer asks to gift, and say what
      happens to them.

`brand.md` forbids a toggle that does nothing; this is the row that gives it
something to do. Disclosure, not a separate route: the checkout is one document
and a gift is a variation of it, not a different purchase.

**It works with scripting off.** The disclosure is a `<details>` element or the
fields are simply present — the row decides on the rendered result at 390px,
not in advance — but the page must not require JavaScript to reach a control
that changes what the buyer is buying. LD-02's withdrawal row set that bar.

**It says the recipient will be emailed, before payment.** §6 wants the flow;
§23 wants the buyer to know what their money does. A buyer who did not realise
a stranger would receive mail has been surprised by us.

**The four fields are not shown as public.** They are the opposite of §5's two,
and the copy has to distinguish them clearly enough that a buyer does not put
the recipient's name in `display_name` expecting privacy, or the other way
round.

### G4 — Two messages, and what each may say

**Repository:** `lousydeal`.
**Files:** `backend/src/content/gift.ts`,
`backend/src/notifications/gift-message.ts`,
`backend/src/notifications/order-confirmation.ts`,
`backend/tests/gift-message.test.ts`.

- [ ] Build the recipient's message, and add one line to the buyer's
      confirmation, without either becoming the other.

**The recipient's message carries the certificate link, the sender's name if
given, and the message if given.** Nothing else. No § 54(1) recital, no
withdrawal form, no consent statement, no price — §6's premise line is about
what somebody spent, and whether the amount appears at all is a copy decision
this row makes and records. The recipient did not buy anything and telling them
about a right they do not hold would be worse than saying nothing.

**The buyer's confirmation gains one line and loses none.** § 55(2) requires
the § 54(1) information and the consent recital; a gift does not change that.
The line says the certificate was sent to the recipient, so the buyer knows
what happened and can act if it was the wrong address.

**Whether a shared wrapper appears here is decided on the evidence.** LD-02
declined one at two callers. This is the third. The row looks at what the three
actually share — a `ConfirmationMessage` type, an escaper, a placeholder
resolver — and either extracts it or records why not. Either answer is
acceptable; guessing is not.

### G5 — The send, and its idempotency

**Repository:** `lousydeal`.
**Files:** `backend/src/subscribers/order-placed.ts`,
`backend/tests/order-placed-gift.test.ts`.

- [ ] Send the recipient's message once per gift, never twice, and never
      instead of the buyer's confirmation.

**Order matters and is asserted.** The buyer's § 55 confirmation is a legal
duty on a deadline; the gift message is a courtesy. The confirmation is sent
first, and a gift-message failure never prevents it. The reverse — a gift sent
where the confirmation failed — would mean a stranger heard about the purchase
before the buyer got the document the law owes them.

**Idempotency is proven by firing the event twice**, the way C2 proved
issuance. §16 is explicit that retries must not generate duplicate gifts. The
deal row is the evidence: it already carries the recipient, and the row decides
whether "sent" needs its own timestamp or whether issuance idempotency is
sufficient — and proves the answer rather than asserting it.

**A gift to the buyer's own address is not special-cased.** It is legal, it is
somebody's idea of a joke, and code that noticed would be code guessing at
intent.

### G6 — Nothing public gains a name

**Repository:** `lousydeal`.
**Files:** `backend/src/api/store/deals/[slug]/route.ts`,
`storefront/src/lib/store-deal.ts`, `backend/tests/store-deal-route.test.ts`,
`storefront/tests/certificate-privacy.test.ts`.

- [ ] Prove the recipient's name and address reach no public surface.

Constraint 4, enforced rather than intended. The deal endpoint publishes an
allowlist of eight fields and its test asserts the key set exactly; four new
columns must not join it, and the assertion that they do not is this row's
whole point.

**Checked on both sides and on the rendered output.** The route's allowlist,
the storefront's field-by-field read, and the certificate page and PDF as
served — LD-02's Gate E found that its own billing-name check was vacuous
because no billing name existed. This row supplies one that does exist and then
looks for it.

**The counter is checked too.** §11's totals are computed from every row; a
gift is an order like any other and must not be excluded, but nothing about the
recipient may reach the total either.

### G7 — The documents catch up

**Repository:** `lousydeal`.
**Files:** `storefront/src/content/legal/privacy.ts`,
`storefront/src/content/legal/terms.ts`,
`storefront/tests/legal-privacy.test.ts`,
`storefront/tests/legal-terms.test.ts`,
`storefront/tests/legal-consistency.test.ts`.

- [ ] State the basis and retention for an address the data subject never gave
      us, and write the gifting clause the Terms deferred.

**This is the row with the sharpest legal question in the slice**, and it is not
one this plan settles. We process a third party's name and address, supplied by
somebody else, to send them one message. Article 14 requires informing a data
subject whose data was not obtained from them, within a reasonable period, and
Article 14(5) exempts what would be disproportionate effort — the gift message
itself is arguably that notice, and arguably not.

The row states the position taken and cites the provisions. §23 reserves
whether the position is right to the operator and a qualified human reader,
exactly as it does for items 8 and 17.

**The Terms clause says who holds what.** The buyer is the consumer; the
recipient has a certificate and no contract. Whether the buyer may withdraw
after the recipient has the certificate is answered the way LD-02 answered the
timing question — by not deciding it in the trader's favour.

**`legal-consistency.test.ts` gains any gift surface that mentions the
confirmation or the right.** A guard is only as wide as its list, which is the
lesson C13 learned twice.

### G8 — `brand.md` catches up

**Repository:** `lousydeal`.
**Files:** `docs/current/brand.md`.

- [ ] Replace "No gift toggle" with what the control now is, and specify the
      recipient's email as a document.

The mail LD-02 sends has no visual specification; it was written as content and
rendered as text and HTML. A third message is the point at which "what our
email looks like" is worth one paragraph rather than three files agreeing by
accident.

### G9 — Gate D, Gate E on a real gift, and the record

**Repository:** `lousydeal`.
**Files:** the findings, in this document; `docs/working/status.md`.

- [x] Review every row against the contract, buy a gift on the test
      environment, and read both messages.

#### Gate D — the review against the contract

**Constraint 1 holds and was cheap to hold.** This slice added no secret, no
environment value and no network destination — the first since LD-01 to touch
one repository. Checked by value anyway: no live Stripe prefix, and neither
address used in Gate E appears anywhere in the tree. The one `sk_live_` hit is
a comment in `payment-provider-config.test.ts` describing what a key looks
like.

**Constraint 5 holds, and is enforced rather than intended.** `content/gift.ts`
contains exactly one mention of § 54, § 55, withdrawal or consent, and it is
the comment saying why none of them is in the message. `gift-message.test.ts`
asserts each absence against the confirmation's own constants, so a later edit
that copies a section across fails rather than ships.

**Constraint 7 holds.** Four `createNotifications` calls exist in the whole
backend: the § 55 confirmation, the gift, and the § 56⁴(4) receipt's two
copies. Nothing schedules, queues, retries or re-sends to a recipient — no
`cron`, no reminder, no "your friend hasn't opened it". The only `setTimeout`
in `backend/src` is the Redis preflight's deadline.

**Constraint 4 is G6's and was proven there** against data that exists, on both
sides of the wire and on the rendered output, by key and by value — including
that a gift and an ordinary purchase render byte-identical HTML.

**§16's idempotency is G5's**, proven by firing the event three times and
counting two messages, and by two mutations.

Gate E is executed against a rendered site, at 390px and desktop, with
scripting disabled where the surface claims to work without it. LD-02's Gate E
is the argument for this row's existence: it found a defect that made every
paid order produce nothing, while 1,318 tests passed.

**A real gift order, to two different addresses**, so that "the buyer got the
confirmation and the recipient got the certificate" is observed rather than
inferred from one inbox. The operator holds both.

**The clean-up is part of the row.** LD-02 left two orders and a withdrawal in
the test database and recorded it. This row either clears them or says why not.

#### Gate E — a real gift, to two addresses

Executed against the test environment carrying G1–G8, reached through the same
SSH tunnel via Meeme that C15 used, so no ingress rule was widened to run it.
A real Stripe test-mode payment, driven through the built checkout with the
gift disclosure opened and §6's four fields filled.

**The buyer and the recipient are different people, which is the point.** The
plan's `OWNER MUST FILL` asked for a second real address and the operator
supplied one on 2026-09-07. So "the buyer got the confirmation and the
recipient got the certificate" is observed in two inboxes rather than inferred
from one.

| Step | Result |
| --- | --- |
| Pay, gift block open | `order_01M1YW4KR81CNRMXJ3JSN74RTE` |
| Issue | `deal #4`, all four gift columns populated |
| The buyer's mail | `§ 55 confirmation sent` |
| The recipient's mail | `gift message sent`, to the address the buyer typed |
| The counter | `Deals done 4 · Amount wasted $20.00 · Latest deal #4` |

**Constraint 4 verified against artefacts that could have leaked.** The
recipient's address, their name, the sender's name and the message appear in
none of the rendered HTML, the PDF's extracted text, or the PDF's raw bytes.
The certificate carries the buyer's own inscription, `Gate E` and `LD-03
acceptance`, which is the pair §5 makes public.

**G5's idempotency has production evidence as well as a unit test.** Both
notifications are stored with their keys and `status=success` —
`lousydeal:order-confirmation:01M1YW4…` and `lousydeal:gift-message:01M1YW4…` —
so the module's own filter excludes a redelivery. Notifications sent before G5
carry `key=NONE`, which is the defect that row closed, visible in the table.

**390px and desktop, no horizontal overflow** on the Terms, the Privacy Policy
or the gift's certificate. Both rewritten documents render with scripting
disabled and both carry the gifting clause. The gift block itself was rendered
and looked at in G3, which is where its `No message` empty state was found.

**Three payment attempts failed before one succeeded**, with Stripe's generic
`Please try again`. The same happened in C15. It is recorded rather than
diagnosed: it is test-mode Stripe behaviour on a repeated card, not this
application, and nothing in the logs shows a request reaching the backend.

**What no machine can accept on a human's behalf.** One § 55 confirmation went
to the buyer's address and one gift message to a real Gmail account. Whether
they arrived, are readable, and landed in an inbox rather than a spam folder is
the operator's to judge — and Gmail is stricter about an unsigned message than
the earlier sends' destination was, so this is also the first real test of the
DKIM signing corrected during LD-02.

## Completion report

**LD-03 is complete.** Nine rows, `G0` to `G9`, in `lousydeal` only — no
`deploys` or `orange` change, because the slice added no secret, no environment
value and no network destination.

### What the rows found that the plan did not predict

**Three rows corrected something already merged**, which is constraint 8
working rather than failing.

- `G4` shipped a gift message that took the trader identity as an argument and
  used it only as a null-guard, so every recipient got an unsigned message from
  an unidentified controller. `G7` found it and fixed it; Article 14(1)(a)
  wants the controller named, and a message from nobody reads like spam.
- `G4` also put the recipient's name in a section heading, which the text part
  upper-cases: `McDonald` would have printed `MCDONALD`. Found by reading the
  output rather than by a test.
- `G5` found that nothing had ever stopped a redelivered `order.placed`
  re-sending the § 55 confirmation. Issuance was idempotent since C2 and said
  nothing about the send.

**Two guards were inverted, in the changes that made them false**, and one
existing test caught a defect it was not written for: the subscriber's
`recipient === null` check, which let `undefined` through and sent a gift
message for every ordinary order. `order-placed-confirmation.test.ts` counted
two notifications where one was owed — the same file that caught LD-02's
`BigNumber` defect.

### Decisions the plan left open, and how they were settled

| Question | Answer |
| --- | --- |
| A shared `transactional-email.ts` at three callers | No. `G4` looked at what the three actually share — a type, an escaper, a resolver, about twelve lines — and each resolves different tokens. The escaper is duplicated three times and the file says so. |
| Does the send need its own timestamp? | No. `CreateNotificationDTO`'s `idempotency_key` is enforced by the module in a transaction, and its exclusion is keyed on `status === FAILURE`, so a failed send still retries. A column would have had to choose between those. |
| Does the gift message state the amount? | Yes, settled by the operator: `Someone spent $5.00 on absolutely nothing for you.` |
| A second shared filter for §6's fields | No. `G2` imported §5's rather than copying it: what these fields need is exactly §5's rule, and `inscription-filter.test.ts` already holds that block equal across the workspaces. |

### Deferrals, each with its reason

| Deferred | Why |
| --- | --- |
| Scheduled gift delivery | §6 permits deferring it unless exceptionally cheap. It needs a scheduler this deployment does not have and a story for a send that fails at 3am. |
| Revoking a gift when the buyer withdraws | Settled by the operator: nothing automatic. LD-02 keeps no withdrawal table, and acting on an unauthenticated form submission would let anyone take a stranger's certificate down. |
| Any second message to a recipient | Constraint 7. One message, no reminders, no "unopened" nudge. |
| Rate-limiting the gift send | Not built, and `G2` says so in the code. One visitor can send one message per completed order, which costs them the price of a certificate. That is the control; a free send would need more. |
| Closing the race window on the send | `G5`. Medusa's own module carries a `TODO` about locking idempotency keys; two simultaneous deliveries can both pass its list. The unique index makes that impossible for issuance and nothing makes it impossible for a send. |
| Letting a recipient claim or re-inscribe the certificate | There are no accounts (§12) and the inscription is frozen at issuance (§5). |
| Whether the Article 14 position is right | The operator, with a qualified human reader. §23. `G7` states it and cites the provisions rather than settling it. |

### The review after the record

The operator asked for the simplest wording, and for a fable review to resolve
anything left open. Both happened after `G9`, and the review found three things
the slice had wrong — one of them introduced by the simplification itself.

**The simplification broke Article 14(1)(c).** Dropping the explanatory prose
from privacy §6 also dropped the words "legitimate interest", which is the
basis. That mattered twice over: the basis has to be stated, and naming it is
what tells a recipient that Article 21 objection is theirs. It also made §8's
"§6 says so to them directly" a false statement about the document's own
contents — the defect class Gate D exists to catch, introduced three rows after
Gate D passed. §6 names the basis again and a test now holds §8's
cross-reference true.

**The retention reasoning was wrong, not merely arguable.** Both sections
attributed seven-year retention of a recipient's address to Estonian accounting
law. Raamatupidamise seadus § 12 requires the source document and § 7 makes that
the economic content — parties, date, amounts. A recipient's address establishes
none of it. Claiming the obligation would have put the processing on
Article 6(1)(c), which defeats erasure under 17(3)(b) and defeats objection: the
document was overstating the trader's position against the person with the least
standing to argue.

The "separating it would be worse" argument in `G7` was a rationalisation and is
withdrawn. Erasing a field is `UPDATE … SET … NULL`, not a second register of
who was sent what. The honest basis is narrower and is what the documents now
say: we keep the details to show, if the buyer disputes it, that we sent what
they paid for — and we remove them if the recipient asks. The operator chose
that over a three-year blanking job, which would have promised a mechanism gate
item 15 has not built.

**The gift message claimed data it might not hold.** "We have your name and
address" is false whenever the buyer left the name blank, which §6 makes
optional. It reads "your address, and your name if they gave one" now.

**One question was factual and went to the operator.** Privacy §5 says "there is
no other third party". The gift message is the only processing of a recipient's
address and it leaves through an SMTP submission host; if that host were
somebody else's, §5 would be false about the one processor touching a person who
never gave us anything. The operator confirmed on 2026-09-08 that it is
Aislopica OÜ's own machine, so the sentence stands. The check is recorded beside
§5 because the next sending path has to ask the same question.

**One thing the review said to leave alone, and why it is worth restating.** The
gift message is defensible against ePrivacy and ESS § 103¹ precisely because it
carries no offer, no referral, no discount and no price the recipient can act
on. Any "growth" addition would convert it from delivery of a purchased product
into direct marketing to somebody who never consented. `content/gift.ts` states
that as a constraint and should keep doing so.

### Left behind in the test environment

Four deals now, one of them a gift, and one withdrawal. They are Stripe
test-mode transactions and real rows; that environment's counter reads a real
`4`. A row that wants a clean counter clears them.

## What this slice does not do

Recorded here so the completion report lists them as deferrals rather than as
loose ends.

| Not done | Belongs to |
| --- | --- |
| Scheduled gift delivery | §6 permits deferring it unless it is exceptionally cheap; it is not. It needs a scheduler, a queue this deployment does not have, and a story for a send that fails at 3am. |
| Revoking a gift certificate when the buyer withdraws | Settled by the operator on 2026-09-07: nothing automatic. LD-02 keeps no withdrawal table, and acting on an unauthenticated form submission would let anyone take a stranger's certificate down. The trader's copy of the § 56⁴(4) receipt reaches a person who decides. |
| A gift receipt, or any second message to the recipient | Constraint 7. One message, no reminders, no "unopened" nudge. |
| Letting the recipient claim, rename or re-inscribe the certificate | There are no accounts (§12) and the inscription is frozen at issuance (§5). |
| Gift campaigns, bulk gifting, gift cards | §V2 in the contract's own list; none is V1. |
| The recipient's name on any public surface | Constraint 4, settled by the operator. |
| Closing the legal gate | The operator, with a qualified human reader. §23. |

## OWNER MUST FILL

| Value | Needed by | State |
| --- | --- | --- |
| A second real address, for the recipient in Gate E | G9 | not supplied; the buyer's is the one LD-02 used |
| Whether the Article 14 position in G7 is acceptable | G7 | judgement, not a value; §23 reserves it |
| Whether the gift message states the amount paid | G4 | §6's premise line implies it; the row proposes and the operator disposes |
