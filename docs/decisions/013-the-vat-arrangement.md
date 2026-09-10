# 013. The VAT arrangement

**Date:** 2026-09-08. **Status:** settled by the operator, except the United
Kingdom, which is deliberately left open and is not a blocker.

This is the operative document: what is registered, what is filed, and how each
sale is treated. The reasoning behind it, the provisions it rests on and the
verification against EU law, the käibemaksuseadus and EMTA is
[`012`](./012-vat-for-goods-printful-dispatches.md). Read this one to know what
to do; read that one to know why.

## The shape

An Estonian company, VAT-registered in Estonia, selling worldwide with no
restriction, fulfilled by Printful from centres in several EU states and outside
the EU. **Everything is filed in Estonia, to EMTA, in Estonian.** No other
country's VAT registration is taken.

## What is held and filed

| | | Cadence |
| --- | --- | --- |
| **Estonian VAT registration** | Held | **KMD**, monthly |
| **Union OSS**, in e-MTA | **Registered**, 2026-09-09 | Quarterly, in euro |
| **Small-enterprise scheme**, KMS § 19¹ | **Registered**, 2026-09-09 — the *eelteade* is filed and the `EX`-suffixed number follows within 35 working days | A per-country turnover report by the end of the month after each quarter |

Nothing else. No Latvian, Spanish, or other member-state registration.

**OSS is registered up front rather than on crossing €10,000.** The threshold is
worth arguing about — `012` does — and registering removes the argument. It also
takes effect only from the first day of the quarter after application, so it is
applied for before the first order, not after.

**The dispatch countries must be named on the OSS application.** EMTA's form has
a *Lähetamise riik* block, and supplies from a country not listed cannot be
declared. Every Printful EU fulfilment country goes on it.

## How each sale is treated

| Fulfilled in | Delivered to | What it is | Where it is reported |
| --- | --- | --- | --- |
| Any EU state | **Estonia** | Intra-Community distance sale, place of supply Estonia | **OSS** — not the KMD. EMTA's own worked example |
| Latvia, Spain, any EU | **A different EU state** | Intra-Community distance sale, destination VAT | **OSS** |
| Latvia | **Latvia** | Domestic Latvian supply | **Exempt**, under the `EX` number |
| Any EU | **Latvia** | Distance sale ending in Latvia | **Exempt**, under the `EX` number — the scheme takes every supply located there |
| Spain | **Spain** | Domestic Spanish supply | **Accepted exposure.** See below |
| Any | **The United Kingdom** | UK supply | **Open.** See below |
| Any | **Outside the EU and UK** | Export, outside EU VAT | **KMD**, zero-rated. The buyer bears any local import charge |
| United States | **United States** | Outside EU scope entirely | Nothing. No US registration at this volume |
| The certificate | Anywhere | Digital service | See "the certificate", below |

## The two that are not covered, stated as what they are

**Spain, fulfilled and delivered within Spain.** Spain is the only Member State
that has not implemented the small-enterprise scheme, so the `EX` number does
not reach it, and OSS cannot carry a domestic supply. The operator's instruction
is that Spain is treated as every other EU country and no Spanish registration is
taken. **That leaves this one case unaccounted**, and it is recorded as an
accepted exposure rather than as coverage. It is narrow — only orders Printful
both prints and delivers inside Spain — and it ends by law when ViDA extends OSS
to non-established domestic supplies on 1 July 2028.

**The United Kingdom.** Non-established sellers get no registration threshold
there, so a UK sale creates an obligation from the first one. **The operator has
decided this on a first-sale basis**: the question is settled when a UK order
actually arrives, and until then it blocks nothing. Printful accounts for UK VAT
on its own leg, so parcels clear customs and no buyer is charged at the door;
what is unaccounted is VAT on the margin. **Sales to the UK are not restricted.**

Both are decisions, taken with the position understood. Neither is a gap nobody
noticed, which is the only reason to write them down this plainly.

## The certificate

Registering for OSS most likely moves the $5 certificate to **destination VAT**
as well — the small-enterprise guidance treats OSS registration as giving up the
€10,000 threshold, and from 1 January 2027 an OSS-registered trader is *deemed*
to have opted for destination taxation. It stays in the same quarterly return
and adds no filing.

What it does change is decision [`009`](./009-merchant-absorbs-the-vat.md): a
single absorbed Estonian rate becomes a rate between 17% and 27% depending on
the buyer's country. At $5 inclusive, the company keeps $4.03 in Estonia and
$3.94 in Hungary. **`009` is reopened by this arrangement and LD-04 does not
close it.**

## What it costs, which is the part that reaches the prices

**Prices are VAT-inclusive and the company absorbs the VAT.** With destination
rates in play, a single worldwide price has to clear its margin at the *worst*
rate, not the Estonian one. That is why LD-04's shelf prices are derived at 27%.

**Shipping is inside the taxable amount** — Art 78(b), KMS § 12 lg 6¹. Printful's
quote is passed through unmarked-up, so it is **grossed up by the destination
rate** before the buyer sees it; otherwise the pass-through quietly loses about a
fifth of itself on every order. The buyer still sees one number and pays exactly
that number.

**Printful's own VAT is cost of goods.** Printful charges VAT on orders it
fulfils in Latvia, Spain, the UK and Northern Ireland, and the zero rate it
offers applies only where fulfilment happens in the country of the VAT number
given — Printful has no Estonian facility, so an Estonian number may never reach
it. None of that is recoverable on the KMD; a Directive 2008/9 reclaim is not
worth filing at this volume. **It is measured from a real invoice before any
margin table is trusted.**

**The small-enterprise exemption is exemption without deduction.** Input VAT on
the exempt Latvian activity is not deductible, and overhead input VAT is
apportioned on the KMD. Negligible here, and written down so it is not a
surprise.

**Two coming duties on small imports**: €3 per item under Council Regulation (EU)
2026/382 from 1 July 2026 to 1 July 2028 on sub-€150 consignments, and a Union
handling fee of about €2 planned from 1 November 2026.

## What the site has to do to make this true

1. **A destination VAT rate per EU member state**, because the reported VAT is
   computed backwards out of a tax-inclusive price and the rate is the buyer's,
   not ours.
2. **Gross the shipping quote up** by that rate.
3. **Two counters**, watched rather than assumed: Union turnover against the
   small-enterprise ceiling of €100,000, and Latvian supplies against €50,000.
   Crossing the first must be reported to EMTA within 15 working days and costs
   the scheme for the following year.
4. **A pre-contractual sentence** for buyers outside the EU and the UK, saying
   they may owe local import charges — § 54(1) requires it before the ordering
   process begins, and it is the honest form of "the amount shown is the amount
   charged".
5. **No destination allow-list.** Every country the shipping API quotes is
   offered.

## What would change this

- A UK order arriving — the first-sale decision falls due.
- Union turnover approaching €100,000, which ends the small-enterprise scheme
  and turns Latvia into a registration or a block.
- 1 July 2028, when ViDA folds non-established domestic supplies into OSS and
  the Spanish exposure closes by itself.
- 1 January 2027, when the certificate's destination treatment becomes statutory
  rather than probable.
- Printful opening or closing a fulfilment country, which changes which rows
  above can occur at all.

## Worth putting to EMTA in writing, once, when there is a reason

1. Do supplies of goods dispatched from another Member State count toward the
   €10,000 threshold — and does selling them cost the **certificate** its
   threshold? Registering for OSS makes this moot in practice; the answer still
   settles what `009` should say.
2. Once the `EX` number covers Latvia, do distance sales merely *ending* in
   Latvia also fall under the exemption rather than into OSS? This arrangement
   assumes yes.

## Closed by the operator, 2026-09-10

**All eight questions above — two here, four in `015`, two in `014` — are
closed at the position each already records.** The operator's instruction was
that their current state is the decided state, and this section is that
instruction being written down rather than carried forward.

**What closing them means, precisely.** It does not mean an answer arrived from
EMTA. It means the arrangement proceeds on the reading this document argues, the
reading is cited, and the divergence — if any of the eight is answered otherwise
later — is an accepted exposure rather than a blocker. Every one of them is a
question about how a return is *prepared*. None of them is a question about what
a buyer is charged, because VAT is absorbed and never itemised, so no answer to
any of the eight can change a total anybody has paid.

**None of them gates code, and one deserves the correction.** The date the `EX`
takes effect was described as unblocking a Latvian zero rate; there is no such
switch. `vatRateFor` in `backend/src/modules/printful/shipping.ts` grosses up
*postage* by the destination's rate and treats Latvia like every other member
state. The `EX` affects the quarterly report and the €50,000 counter, both of
which are already built and already run by hand. The filing was made 2026-09-09
and the number follows within 35 working days; when it arrives it is filed, and
nothing in the repository changes.

**The first return is due January 2027**, which is when any of these becomes a
practical question again. Reopening one then is cheap. Holding the slice open
until an authority replies is not, and would have blocked work that does not
depend on the answer.
