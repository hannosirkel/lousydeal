# 008. Take Plepic's tax treatment: net prices, Estonia's rate to the EU, no rest-of-world region

- **Date:** 2026-08-30
- **Status:** accepted
- **Supersedes:** the tax ruling of [`007`](./007-usd-and-tax-inclusive-pricing.md) (its currency ruling, USD, is unaffected and stands)

## Context and problem statement

`007` ruled the three tiers tax-inclusive and configured no tax at all, on the
reasoning that tax-inclusive "is the only reading that keeps `$5` true on the
page that shows it." That record also named its own cost: *"the day a rate is
introduced is the day someone recalculates all three amounts."* That day is
this one.

The operator has ruled that Lousy Deal takes Plepic's tax treatment instead:
net prices, VAT added for an EU buyer. `007`'s own predicted consequence is
now accepted rather than avoided — `$5` stops being what an EU buyer is
charged, and this record exists to say what they are charged instead and why
that is correct rather than a regression.

## Considered options

- Keep `007`'s ruling: tax-inclusive, no tax region, no tax rate.
- Take Plepic's tax treatment: net prices, one EU-wide rate at Estonia's
  standard rate, no rest-of-world tax region.

## Decision

**Lousy Deal takes Plepic's tax treatment.** Net prices; Estonia's standard
rate charged to every EU member state; no rest-of-world tax region. Operator,
2026-08-30.

- `is_tax_inclusive` is `false` on both the `usd` currency preference and the
  `Worldwide` region record. The two move together —
  `backend/src/commerce/tax-model.ts`'s header has the trace of why a price
  with no matching preference is read as tax-exclusive regardless of what
  either flag alone says.
- `automatic_taxes` is `true` on the region, set explicitly rather than left
  to `@medusajs/region/dist/models/region.js:12`'s own default of `true` —
  explicit because a reader should not have to know that default to know this
  region calculates tax.
- A tax region exists for each of the 27 EU member states, each carrying one
  default rate at Estonia's standard percentage. No tax region exists for any
  other country: an export carries no EU VAT, and Medusa resolves an address
  with no matching tax region to a cart with no tax line, which is correct
  rather than an omission. That resolution is `TaxModuleService.getTaxLines`,
  which returns `[]` as soon as the address matches no parent tax region —
  `node_modules/@medusajs/tax/dist/services/tax-module-service.js:175-178`,
  `if (!parentRegion) { return []; }`.

**The gross price of each tier, for an EU buyer, at 24%:**

| Tier | Net (what `product-model.ts` declares) | Gross (what an EU buyer is charged) |
| --- | --- | --- |
| Lousy Deal | $5.00 | $6.20 |
| Lousy Deal Plus | $10.00 | $12.40 |
| Lousy Deal Pro | $25.00 | $31.00 |

A non-EU buyer is charged the net figure in the left column: no tax region
matches their address, so no VAT line is added — the early return cited above.

## Rationale

**Why Estonia's rate, as a chain rather than an assertion.** Lousy Deal is
operated by Aislopica OÜ, an Estonian company
(`docs/working/fresh-build.md:150-162` carries the entity and address, and
records that committing those public business-register facts is a deliberate
decision). **Aislopica OÜ is VAT registered** — the operator, 2026-08-30.
That is recorded here as a fact and not as a number; nothing in this build
needs the number. On the operator's reading of the VAT Directive, a supplier
established and VAT registered in Estonia charges Estonia's domestic rate on
its B2C supplies to consumers elsewhere in the EU while it stays below the
annual threshold the next paragraph names — the same chain that makes
Estonia's rate the right rate for Plepic, not a borrowed convenience this
record copies without asking why it applied. This configuration therefore
writes that rate. The rate itself, 24% since 1 July 2025, and its citation to
the Estonian Tax and Customs Board, are carried from `/home/hanno/app/plepic/backend/src/commerce/tax-model.ts`
rather than restated from memory; `backend/src/commerce/tax-model.ts` repeats
the citation.

**Why one rate and not per-destination rates.** On the operator's reading,
Article 59c of the VAT Directive sets an annual threshold of EUR 10,000, and
staying below it is what allows charging the domestic rate to every member
state rather than each destination's own. What counts towards it here is what
this supplier sells: electronically supplied services, and nothing else — the
three tiers are a digital service, and this row builds no fulfillment and
ships no goods. That reading is the operator's accepted position as of
2026-08-30, not an open question: three tiers of a digital service sold by
one supplier are far below that threshold today. What reopens this record is
the threshold itself — crossing it is a commercial event with an
administrative answer (One Stop Shop registration, destination rates), and
that is a change to this file when it happens, not something this file
anticipates happening.

**Why no rest-of-world tax region.** The alternative — a zero-rated
rest-of-world region — would record something the operator's reading holds to
be false: a non-EU sale is not subject to EU VAT at a 0% rate, it is simply
outside the EU VAT system.
Configuring nothing for it and letting `automatic_taxes` resolve to no tax
line is the accurate statement, and it is Plepic's own reasoning
(`/home/hanno/app/plepic/backend/src/commerce/tax-model.ts`'s header),
carried across because nothing about it is specific to a physical game.

**Why the EU member-state list lives in `tax-model.ts`.** Plepic keeps its
own list in its shipping model, because there a shipping zone and a VAT
territory are two different questions asked of the same countries. This
repository has no shipping model and asks only the VAT question, so
`EU_MEMBER_STATE_CODES` is declared in `tax-model.ts`, where that question is
asked.

## Consequences

- `backend/src/commerce/product-model.ts`'s `amountMinor` doc, and its
  header's citation, now point at this record and say the amount is net. The
  three amounts themselves do not change — `500`, `1000` and `2500` are
  still what `PRODUCT_TIERS` declares; only the reading of that number moved.
- `backend/src/scripts/configure-commerce.ts` writes the `usd` currency
  preference and the region's `is_tax_inclusive` as `false`, and 27 tax
  regions at Estonia's rate. It writes no rest-of-world tax region, and a row
  that adds one is a review finding rather than an improvement.
- `007`'s currency ruling — USD, lowercase `currency_code` — is unaffected
  and stands. Only its tax half is superseded.
- The first change to `ESTONIAN_STANDARD_VAT_PERCENT`, or the day this
  supplier's Article 59c threshold is crossed, reopens this record.
