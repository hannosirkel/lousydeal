# 007. Price the three tiers in USD, tax-inclusive, with no tax configured

- **Date:** 2026-08-30
- **Status:** accepted

## Context and problem statement

`docs/current/concept.md:21-24` prices the three tiers `$5`, `$10` and `$25`.
It writes the symbol and names no currency code, and `$` is the symbol of more
than one currency. A Medusa product price is a currency code and an amount,
so the code has to be settled before the first price is written.

The second question the amount raises is what it means. Medusa stores an amount
and, separately, whether an amount of that shape is read as including tax.
Plepic settled its own version of this — a EUR 25.00 net price at 24 % Estonian
VAT — and `docs/current/plepic-reuse.md:144-146` records that Lousy Deal must
not inherit it by copying a file, because Lousy Deal's tax treatment is a
legal-gate question under the build contract's §23.

Neither answer was written down anywhere in this repository until this record.
`backend/src/commerce/product-model.ts` cited the operator's ruling, and the
ruling had no truth-maker to open.

## Considered options

- USD, and the price read as what the customer pays.
- USD, and the price read as a net amount with tax added at checkout.
- EUR, matching the operating entity's own currency and Plepic's precedent.

## Decision

Two rulings, both the operator's, both made 2026-08-30.

**The currency is USD.** `currency_code` is `usd`, lowercase.

**The price is what the customer pays.** `$5` is what a customer is charged, not
a net amount that grows at checkout.

And the anti-goal that follows from the second: **no VAT, no tax region and no
tax rate is configured in LD-01.** That is the plan's boundary, and moving it is
the legal gate's work under §23, not a build row's.

## Rationale

USD over EUR because the concept document is the only statement of the price
that exists and it is written in a symbol that reads as dollars to the audience
it was written for. The operating entity's own currency is a bookkeeping fact,
not a shopfront one, and Stripe settles across the difference.

Tax-inclusive because it is the only reading that keeps `$5` true on the page
that shows it. A net price that becomes $6.20 at checkout makes the concept
document wrong, and the concept document is what the tiers are for.

The trade-off accepted: a tax-inclusive price is the harder one to change later.
Adding a tax rate on top of it moves the amount the merchant keeps, not the
amount the customer pays, so the day a rate is introduced is the day someone
recalculates all three amounts.

## What "tax-inclusive" costs to make true in Medusa

This is the part the ruling does not buy on its own, and the reason this record
exists rather than a comment.

**Tax-inclusiveness is not a property of an amount.** It is a stored row.
`node_modules/@medusajs/pricing/dist/models/price-preference.js:9` defines
`is_tax_inclusive` on the `PricePreference` model as
`model.boolean().default(false)`, keyed by an `attribute`/`value` pair —
typically `currency_code`/`usd` or `region_id`. A calculated price gets the flag
from that row and from nowhere else:
`node_modules/@medusajs/pricing/dist/services/pricing-module.js:237` resolves
`is_calculated_price_tax_inclusive` through `isTaxInclusive(...)` against the
preferences it just listed. Writing a price without a preference therefore
writes a price Medusa reads as **tax-exclusive**, whatever the operator ruled.

**And a Region arrives with tax calculation on.**
`node_modules/@medusajs/region/dist/models/region.js:12` declares
`automatic_taxes: model.boolean().default(true)`. The region T7b creates will
have it set unless something turns it off.

So the decision holds in LD-01 for a reason narrower than the ruling: **no tax
rate exists**, so automatic tax calculation adds nothing and an exclusive price
and an inclusive one come to the same number at checkout. That is a true
statement about this build and a fragile one about any later build.

## Consequences

- Every tier in `backend/src/commerce/product-model.ts` carries `currency:
  "usd"` and an `amountMinor` that is the full charge.
- **T7b writes a price preference** — `attribute: "currency_code"`,
  `value: "usd"`, `is_tax_inclusive: true` — so the ruling holds on its own
  terms rather than by the absence of a tax rate. Without it the ruling is
  recorded here and contradicted by the database.
- LD-01 configures no tax rate and no tax region, and a row that adds one is a
  review finding rather than an improvement.
- The first tax rate the legal gate produces re-opens this record, because it
  turns the two readings of the amount into different numbers.
