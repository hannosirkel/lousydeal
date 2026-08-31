# 009. The advertised price is what the customer pays; the merchant absorbs Estonia's VAT

- **Date:** 2026-08-31
- **Status:** accepted
- **Supersedes:** the tax ruling of [`008`](./008-plepic-tax-treatment.md) (net
  prices, VAT added for an EU buyer), which itself superseded the tax ruling of
  [`007`](./007-usd-and-tax-inclusive-pricing.md) (tax-inclusive, no tax
  configured at all). `007`'s USD currency ruling is unaffected by any of the
  three and still stands.

## Context and problem statement

`008` ruled that Lousy Deal takes Plepic's tax treatment: net prices, with
Estonia's standard rate added at checkout for an EU buyer. That made `007`'s
own predicted consequence real — `$5` stopped being what an EU buyer is
charged; `008`'s table put the figure at $6.20.

The operator has now ruled a third time on the same question: **"EU buyers pay
Estonia VAT but this is to be absorbed by merchant."** The advertised price is
again what every buyer is charged, EU or not — but this is **not** a reversion
to `007`. `007` charged no VAT at all, because it configured no tax region and
no tax rate; a tax-inclusive price and a tax-exclusive one came to the same
number only because no rate existed to make them differ. This record keeps
every tax region `008` created — the same 27 EU member states, the same
Estonia-domestic rate, the same absence of a rest-of-world region — and the
VAT that rate produces is real and is deducted from what the merchant keeps.
What moved across all three rulings is only who pays it: nobody under `007`
(there was no rate), the buyer under `008`, the merchant under `009`.

## Considered options

- Keep `008`'s ruling: net prices, VAT added on top for an EU buyer.
- Revert to `007`: tax-inclusive pricing with no tax configured, so no VAT is
  ever computed for anyone.
- Price inclusively and compute the VAT `008` already established, absorbing
  it into the advertised price rather than adding it or discarding it.

## Decision

**The advertised price is what the customer pays, EU or not. Estonia's VAT,
where the buyer's address puts them in a tax region, comes out of that price
rather than being added to it.** Operator, 2026-08-31.

- `is_tax_inclusive` is `true` on both the `usd` currency preference and the
  `Worldwide` region record (`backend/src/scripts/configure-commerce.ts`). The
  two move together for the reason `008` already gave: a price with no
  matching preference is read as tax-exclusive regardless of what either flag
  alone says
  (`node_modules/@medusajs/pricing/dist/services/pricing-module.js:237`).
- `automatic_taxes` stays `true` on the region, unchanged from `008`.
- The 27 EU member-state tax regions `008` created are unchanged: same
  countries, same provider, same rate. Nothing under
  `backend/src/commerce/tax-model.ts`'s rate, its effective date, its
  Maksu- ja Tolliamet citation, or its one-rate/Article 59c threshold
  reasoning moves. `backend/src/commerce/product-model.ts`'s three amounts
  (`500`, `1000`, `2500`) do not change either — only the reading of that
  number, and who the VAT it now yields comes out of.

## What the numbers actually become (measured)

Medusa computes a tax-inclusive line item's subtotal by dividing the total
price by `1 + sumTaxRate` —
`node_modules/@medusajs/utils/dist/totals/line-item/index.js:54-56`, the
function's own comment: *"Original Price = Total Price / (1 + Tax Rate)"*.
Driving `getLineItemTotals` (the same function Medusa's cart totals call) with
each tier's price, `is_tax_inclusive: true`, and a single 24% tax line —
the exact reproduction is in this record's companion evidence, not restated
here — gives:

| Tier | Charged (`total`) | Merchant keeps (`subtotal`) | VAT absorbed (`tax_total`) |
| --- | --- | --- | --- |
| Lousy Deal | $5.00 | $4.032258 (≈ $4.03) | $0.967742 (≈ $0.97) |
| Lousy Deal Plus | $10.00 | $8.064516 (≈ $8.06) | $1.935484 (≈ $1.94) |
| Lousy Deal Pro | $25.00 | $20.161290 (≈ $20.16) | $4.838710 (≈ $4.84) |

A non-EU buyer's address matches no tax region, `tax_lines` is empty, and the
same function returns `subtotal = total` at the full advertised price, with
`tax_total = 0` — the merchant keeps all of it, exactly as under `008` and
`007` alike.

**Where the absorbed VAT appears, corrected against this row's own brief.**
The brief this row was built from expected `tax_total` to read `0` for an
inclusive line, reasoning from
`node_modules/@medusajs/utils/dist/totals/tax/index.js:9-11`
(`calculateTaxTotal` returns `0` immediately when its caller passes
`isTaxInclusive: true`) — which would leave the VAT visible only as the gap
between `subtotal` and `total`, not as a tax figure anywhere on the cart.
**Measurement shows this is not what happens.** `getLineItemTotals`'s own call
to `calculateTaxTotal`
(`node_modules/@medusajs/utils/dist/totals/line-item/index.js:71-75`) does not
pass `isTaxInclusive` at all, so the parameter takes the function's default of
`false` (`.../totals/tax/index.js:7`) and the early return never fires; it
computes 24% of the already-tax-extracted `currentSubtotal` instead, which is
numerically identical to `total − subtotal`. That populated `tax_total` is
then summed straight into the cart: `node_modules/@medusajs/utils/dist/totals/cart/index.js:61`
reads each item's `tax_total`, `:74` accumulates it into `itemsTaxTotal`,
`:106` adds it to `shippingTaxTotal` for the cart-level `taxTotal`, and `:116`
assigns it to `cart.tax_total`. **The absorbed VAT does appear as a tax
figure — `cart.tax_total` and every line item's `tax_total` — and not only as
the arithmetic gap between `subtotal` and `total`.** The two are equal for a
tax-inclusive line with a single rate, but they are not the same claim, and
the brief's assumption about which one holds was wrong.

## The address gap this ruling does not close

Medusa resolves a buyer's tax region from their address's country code —
`TaxModuleService.getTaxLines`,
`node_modules/@medusajs/tax/dist/services/tax-module-service.js:161-178`:
it queries `tax_region` by `country_code: normalizedContext.address.country_code`
and returns `[]` at `:176-178` as soon as no parent region matches. T10's
checkout collects no address anywhere in its flow — cart creation posts only
`{ region_id }` (`storefront/src/lib/store-cart.ts:47-53`), and cart
completion posts no body at all (`storefront/src/lib/store-payment.ts:122-130`)
— so no address ever reaches the cart, no tax region is ever resolved, and no
VAT is ever computed. Not added, not absorbed: simply absent, for every
buyer regardless of country.

The customer-facing number is unaffected by this gap — an EU buyer pays $5.00
either way, whether that $5.00 silently contains no VAT (today) or $0.97 of
absorbed VAT (once an address reaches the cart) — which is why closing it is
not urgent. But it means **LD-01 as built produces no VAT figure for
remittance**, and this record does not claim otherwise. Closing it is a
checkout row that collects and forwards a shipping or billing address to the
cart before it prices; no such row exists yet in this plan.

## What is unchanged

USD (`007`); the 27 EU member-state tax regions and their provider; Estonia's
24% rate, its 1 July 2025 effective date and Maksu- ja Tolliamet citation; the
one-rate/Article 59c threshold reasoning; the absence of a rest-of-world tax
region — all `008`'s, none reopened here.

## The trade-off, stated plainly

A single advertised price now costs the merchant a variable share of it. An
EU buyer nets the merchant roughly 80.6% of the charge (VAT absorbed); a
non-EU buyer, or any buyer while the address gap above stands, nets the
merchant the full charge. The merchant's take is no longer one number — it
depends on the buyer's country, and it will depend on it for real once the
address gap closes. That variability is the price of a single number on the
page, and it is what the operator chose over adding VAT on top (`008`) or
avoiding the question by configuring no tax at all (`007`).

## Consequences

- `backend/src/scripts/configure-commerce.ts` writes `taxInclusivePrices:
  true` for both the `store-currency` and `region` records; every other
  record is unchanged.
- `backend/src/commerce/product-model.ts`'s `amountMinor` doc now reads as
  what the customer pays, citing this record rather than `008`.
- `backend/src/commerce/tax-model.ts`'s header states the absorbed-VAT
  position; its rate, citation, and threshold reasoning sections are
  untouched.
- `docs/decisions/008-plepic-tax-treatment.md`'s Status line records that its
  tax ruling is superseded here, following the same partial-supersession form
  `007` already carries; its body is not rewritten.
- The first change to `ESTONIAN_STANDARD_VAT_PERCENT`, the day the Article
  59c threshold is crossed, or the row that finally collects an address at
  checkout, all reopen work adjacent to this record — the last of those
  reopens the address-gap section above specifically.
