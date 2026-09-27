# 016. Accept the V1 gates, and close the remaining V1 questions at their current state

- **Date:** 2026-09-10 (the operator's closure); gate dates as recorded below
- **Status:** accepted

## Context and problem statement

The V1 contract defined six review gates, A to F, in its §21. The table below
states what each one checked, because
[`specification.md`](../current/specification.md) §21 is now a stub. The
contract also defines one operator gate
for legal, tax and consumer compliance (§23). §23 requires the acceptance, its
date and the reviewed text to be recorded in `docs/decisions/`. The working
plans held these acceptances, and those plans are now retired. On 2026-09-10 a
set of V1 questions was also still open. Most of them waited on an authority or
on a qualified reader. None of them changed what a buyer pays.

## Considered options

- Keep each question open until an authority or a qualified reader answers it.
- Close each question at its current state, and record the position as an
  accepted exposure.

## Decision

**All six gates passed, and the operator closed every remaining V1 question at
its current state on 2026-09-10.** The operator's instruction: "the current state
of each is the decided state". No item is deferred, and no item returns as an
open item.

### The gates

| Gate | What it checks | Result and evidence |
| --- | --- | --- |
| A — product scope | the V1 scope is coherent before implementation | Passed 2026-08-28. Its decisions are [`001`](./001-one-repository-two-images.md)–[`006`](./006-two-naming-categories-in-keys.md); `006` supersedes `005`. |
| B — brand/copy | the customer-facing copy, reviewed on its own | Passed. The approved copy is [`brand.md`](../current/brand.md), settled 2026-09-05. |
| C — visual design | the visual direction, approved before major surfaces | Passed. The approved direction is [`brand.md`](../current/brand.md), settled 2026-09-05. |
| D — per-task code review | each row, by a separate top-tier reviewer with fresh context | Run per row. Each merged row recorded its review answers in its slice plan, now retired and readable in git history. |
| E — rendered UI review | desktop and mobile, real interactions, against the approved design | Passed for LD-02 to LD-06 (LD-06 by D10, 2026-09-11) and LD-09 (V15, 2026-09-05). Passed for LD-08 by L3 (2026-09-12, store closed) and F2 (2026-09-13, live store open, one certificate, up to the disabled pay control, no charge). LD-10 had browser checks, not a Gate E run. |
| F — integration review | the complete purchase path before production | Passed 2026-09-13. Test order #7 proved a $44.47 order with certificate, merch, surcharge, gift, Stripe test authorisation and no analytics. Two replays of the signed webhook changed nothing. |

**Gate E has one stated limit.** When it passed, no walk of the open store had
covered a gift, a parcel, a discount code, or anything at or after payment.
LD-11 was opened to walk those flows; see [`017`](./017-close-the-v1-initiative.md).

### The §23 legal gate

§23 reserves this gate to the operator with a qualified human reader. The list
had eighteen items. Drafting or later rows closed items 1–7, 9, 14 and 16. LD-02's
order confirmation email closed item 11. The operator closed the rest on
2026-09-10:

- **Items 8, 10, 12, 13, 17 and 18** close on the position the legal documents
  already state. Each divergence from a stricter reading is an accepted
  exposure, not a blocker. Nothing in the documents changed. The six are:

  | # | The exposure |
  | --- | --- |
  | 8 | The withdrawal-waiver consent is a condition of ordering: no purchase is possible without it. VÕS § 56²(9) voids a term that hinders the right, and § 62 voids a departure to the consumer's detriment. |
  | 10 | The Estonian model withdrawal form matches the annex, but the retrieved annex wording is the one in force 2014–2022. A later redaction may differ. |
  | 12 | § 56(1⁶) extends the withdrawal period to twelve months if the § 54(1) p 12 information is missing. The documents give it before the contract; whether that discharges the duty is the reader's call. |
  | 13 | The checkout requires the buyer to acknowledge the loss of a right that, on the documents' own analysis, no order loses today. § 53(4) p 7¹ requires the wording. It sits beside item 8. |
  | 17 | Stripe's `__stripe_mid` is a 365-day device identifier, set under this site's domain for fraud checks, without consent. ePrivacy Art 5(3)'s exemption is narrow, and its reach is contested. |
  | 18 | Stripe is an independent controller for fraud and regulatory checks, and a processor for the payment. Whether Art 26 joint-controller arrangements are needed for the first half is open. |

- **Item 15, the deletion job for the seven-year accounting record, is not
  built.** Retention is enforced by hand. The first record reaches seven years
  in 2033, so nothing is overdue. Nothing deletes a record unless a person does.

The reviewed text is `storefront/src/content/legal/` at commit `31c08be`
(2026-09-10). A later change to those files is a change to accepted text.

### Changes to the legal text after the gate

Four commits changed the accepted text. None was accepted through §23 again,
and no decision recorded them until this one:

| Commit | Date | Change | Authority, as recorded |
| --- | --- | --- | --- |
| `4e4e412` | 2026-09-11 | Terms: disclose that a code adds a removable adjustment. | The operator authorised LD-06 to correct legal text a code makes false. The plan said that authority to write is not acceptance. |
| `c447356` | 2026-09-12 | Privacy: name Google Analytics and Meta Pixel, their purpose and the consent control. | None recorded. |
| `410398c` | 2026-09-12 | Privacy: the measurement frame, and processing outside the EEA. | None recorded. |
| `85bb7c3` | 2026-09-23 | Terms §5: the certificate is issued on payment and its link is emailed. | The operator chose this wording for LD-11 H1. |

LD-04's legal rows (Refunds and withdrawal, Terms, Privacy, Imprint) were
drafted before `31c08be`, under authority the operator granted on 2026-09-09
("authority granted — build them now"). The gate then accepted them. Whether
the operator accepts the four later changes is an open question in
[`legal-and-privacy.md`](../issues/legal-and-privacy.md).

### The other questions closed on 2026-09-10

| Item | Closed as |
| --- | --- |
| Eight questions for EMTA, across [`013`](./013-the-vat-arrangement.md), [`014`](./014-special-territories-are-a-reporting-problem.md) and [`015`](./015-where-the-parcel-is-dispatched-from.md) | Proceed on the reading each record argues. None gates code. None can change a total that a buyer paid. |
| [`009`](./009-merchant-absorbs-the-vat.md), reopened by the OSS registration | Absorbed VAT stands unchanged. The margin varies by destination; the price does not. |
| The sticker's cut | Cut to shape, as rendered. Not the 4″ square the row described. |
| Argo CD's sync cadence | Observed and tolerated. A manual sync is the workaround. |
| LD-02's two `OWNER MUST FILL` items | The inscription is part of the order record and is kept seven years. A certificate link is not re-issued, so the confirmation email is its only copy. |
| Whether the €10,000 threshold was crossed earlier in 2026 | Closed as not crossed. The shop had taken no live payment. Whether Aislopica OÜ made other cross-border sales to consumers is a fact only the operator holds. |

### A correction to the EMTA record

An earlier record said the date of the Latvian `EX` number unblocks a zero rate
in code. **No such switch exists.** `vatRateFor` in
`backend/src/modules/printful/shipping.ts` grosses up postage by the
destination's rate. It treats Latvia like every other member state. The `EX`
number affects the quarterly report and the €50,000 counter. Both exist already
and run by hand. When the number arrives, the operator files it, and nothing in
the repository changes.

## Rationale

Every open question was about how a return is prepared or how a legal text
reads. None was about what a buyer is charged, because VAT is absorbed and
never itemised. The first OSS return is due in January 2027. Reopening a
question then is cheap. Holding V1 open until an authority replies would block
work that does not depend on the answer.

The trade-off: each closed item is an accepted exposure, not a resolved one. A
supervisory authority can read items 8, 10, 12, 13, 17 and 18 differently.
Item 15 depends on a person remembering it.

## Consequences

- No V1 question stays open. A later answer from EMTA or a reader opens a new
  decision that supersedes the relevant part of this one.
- Record retention past seven years needs a manual action from 2033.
- The VAT threshold counters stay a standing manual procedure:
  `npm run report:vat-thresholds`.
- The legal documents are accepted text. A rewrite must say what it changes.
