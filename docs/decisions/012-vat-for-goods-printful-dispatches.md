# 012. VAT for goods Printful dispatches, and the reporting shape that costs least

**Date:** 2026-09-08.
**Status:** proposed. Two questions below are for EMTA or an Estonian VAT
adviser, and this decision is not final until they answer.
**Supersedes nothing.** [`009`](./009-merchant-absorbs-the-vat.md) stands for the
certificate; this record is about the goods LD-04 adds, which 009 explicitly
said would reopen it.

## The question

The operator ruled on 2026-09-08: "store is below 10k€ OSS threshold, Estonia
VAT is to be used." That is right for the certificate. It cannot be right for a
mug, and the reason is not the threshold.

## Why Estonian VAT cannot reach the merch

Art 59c disapplies **Art 33(a)**, the destination rule for intra-Community
distance sales. What is left is **Art 32**: the place of supply is where dispatch
begins. Printful dispatches from **Riga and Barcelona**. So under the threshold
the supply is Latvian or Spanish, and over it, the destination's. There is no
reading on which a mug posted from Riga to Berlin is an Estonian supply.

Estonia transposed it in those words. **KMS § 10¹(7)** makes Estonia the place of
supply under the €10,000 limit only for the supplies in **§ 10¹(5)** — "kaup
võõrandatakse ja toimetatakse **Eestist** … teise liikmesriiki". *From Estonia.*
Goods dispatched from Latvia are outside § 10¹(5) altogether, so Estonian law
offers no hook to charge Estonian VAT on them at any turnover.

**The ruling would be correct if one thing were physically true**: that Printful
ships stock to the trader in Estonia and the trader posts it onward. Place of
supply follows the goods, not the invoices, so this has to be a fact about
parcels. It is not one today.

## The decision: Union OSS, Estonia off it, and two countries closed

The shape that costs **one extra quarterly return and nothing else**:

| | What | Where it is reported |
| --- | --- | --- |
| 1 | Merch to any EU country except Estonia, Latvia, Spain | **Union OSS**, registered in Estonia through e-MTA. Quarterly, in euro |
| 2 | Merch to Estonian addresses | **The ordinary Estonian return.** Place of supply is Estonia, the trader is established and registered here, and EMTA's own page confirms home-country supplies are excluded from OSS |
| 3 | Merch to Latvia and Spain | **Closed at the checkout** |
| 4 | The certificate | **Unchanged.** Still § 10¹(6)–(7), still the Estonian return |
| 5 | Merch outside the EU | **Closed at the checkout**, for now |

**Why Latvia and Spain are closed rather than served.** Printful dispatches from
Riga and Barcelona, so those two orders never cross a border: they are domestic
supplies in a country where this trader is not established. OSS cannot carry a
domestic supply, and neither country gives a non-established trader a
registration threshold. Blocking two destinations is a shipping rule. Serving
them is two more filing regimes, in two more languages, for two of the EU's
smaller markets for a joke in English.

**Why the EU only, for now.** The United Kingdom taxes consumer goods under £135
at the point of sale and wants its own registration; the United States raises
sales-tax nexus questions that are not one quarterly return. Neither is
impossible and neither is minimal.

**Registration timing matters and is easy to get wrong.** OSS takes effect on the
first day of the quarter following the application — earlier only if the
application is in by the 10th of the month after the first supply. So it is
registered **before** merch goes on sale, not after the first order.

## The consequence for prices, which is where this record has to admit an error

**The margin table in `ld-04-merch.md` was wrong, and not only for the reason
the review found.** Decision [`007`](./007-usd-and-tax-inclusive-pricing.md)
makes every price tax-inclusive. The prices proposed to the operator were
derived as cost + 25% and then presented as shelf prices, which silently spends
the VAT out of the margin:

| Item | Cost | Proposed | Net at 24% | Actual margin |
| --- | --- | --- | --- | --- |
| T-shirt S–L | $15.58 | $25 | $20.16 | 29% |
| T-shirt XL | $17.45 | $25 | $20.16 | **16%** |
| T-shirt 2XL | $17.58 | $25 | $20.16 | **15%** |
| T-shirt 3XL | $19.58 | $25 | $20.16 | **3%** |
| Mug | $8.95 | $12 | $9.68 | **8%** |
| Trucker cap | $18.10 | $25 | $20.16 | **11%** |
| Sticker | $3.25 | $5 | $4.03 | 24% |

Only the small shirt clears the operator's floor. At destination rates it is
worse: Hungary's 27% leaves **1%** on a 3XL.

Prices that clear 25% at the worst EU rate, so one number works everywhere:

| Item | Was | **Is** |
| --- | --- | --- |
| T-shirt, S–2XL | $25 | **$28** |
| T-shirt, 3XL | $25 | **$32**, or the size is dropped |
| Mug | $12 | **$15** |
| Trucker cap | $25 | **$29** |
| Sticker | $5 | **$6** |

The sticker no longer costs what the certificate costs, which is a small loss.

## What EMTA or an adviser must confirm

1. **Do Latvia- and Spain-dispatched sales count toward the €10,000 threshold?**
   If they do, merch turnover could pull the **certificate** into destination
   VAT — a far larger change than the merch itself. The letter of Art 59c(1)(b)
   ("goods dispatched **to** a Member State other than…") suggests they count;
   the transposition in § 10¹(5) ("from Estonia") suggests they do not. This
   record cannot settle a conflict between a directive's letter and a national
   transposition.
2. **Is closing Latvia and Spain accepted**, or does the trader register there
   regardless of whether any sale is made?

Printful's routing table per destination is also needed, because every line
above assumes Riga for EU orders and this plan has not seen the table.

## Consequences

- LD-04's P14 implements this record rather than restating it, and still blocks
  Gate E until question 1 is answered.
- P4's margin guard is written against the corrected prices, not the proposed
  ones.
- P7 gains a destination allow-list, and P9 gains the sentence that says which
  countries this shop posts to — which § 54(1) requires stated before the
  ordering process begins, not discovered at the address field.
