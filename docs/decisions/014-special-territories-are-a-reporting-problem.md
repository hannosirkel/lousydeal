# 014. The special VAT territories are a reporting problem, not a checkout one

**Date:** 2026-09-10. **Status:** settled. Extends
[`013`](./013-the-vat-arrangement.md), which is the operative VAT document, and
closes the two `status.md` rows that said the territories were "wrong in both
directions" and Northern Ireland unhandled.

## The fact everything turns on

Prices are tax-inclusive and the merchant absorbs the VAT ([`009`](./009-merchant-absorbs-the-vat.md)),
so **no buyer's total depends on which rate the shop computes.** The § 55
confirmation says only that a price "includes value added tax where value added
tax applies" and itemises no tax line, and Art 220 of Directive 2006/112/EC as
amended by (EU) 2017/2455 removes the invoice obligation for intra-Community
distance sales declared through the One Stop Shop.

So a mis-routed territory corrupts exactly one thing: **the quarterly OSS return
and the KMD**, both prepared after the fact from the quarter's orders.

That is why this decision builds nothing in the checkout.

## What was wrong

Medusa routes tax on `country_code` alone, so the Canaries resolved as Spain,
Åland as Finland, Heligoland as Germany — each **outside the EU VAT area** under
Art 6 of the Directive, where the right answer is no EU VAT at all. Portugal's
autonomous regions were charged mainland 23%. Northern Ireland resolved to
nothing.

**Almost every one of those errors is an over-remit** — the trader pays a member
state a few points of its own margin and misstates a return in the direction
authorities do not chase. There are exactly two under-remits, and both are
reportable through the OSS registration already held:

- **Northern Ireland goods**, which are inside the EU VAT area under Article 8
  of the Protocol on Ireland/Northern Ireland as amended by the Windsor
  Framework — Annex 3 applies the VAT Directive to NI in respect of **goods**.
  An EU-dispatched parcel to Belfast is an intra-Community distance sale at the
  **UK's 20%**, declared with `XI` as the member state of consumption.
- **Monaco**, which Art 7(1) treats as France: **French 20%**, through OSS.

Northern Ireland is the one place on this list where the answer differs by
product. Annex 3's limitation is *"concerning goods"*, so a **certificate** sold
to a BT address is outside EU VAT entirely and falls into `013`'s open United
Kingdom question — where a non-established supplier has no registration
threshold and is liable from the first sale. One postcode, two answers, decided
by what is in the parcel.

## The decision

**No destination is blocked.** `013` says "no destination allow-list — every
country the shipping API quotes is offered", and the operator's own rule is that
an extra return is acceptable but closing regions is not. Blocking the Canaries
to avoid a reporting adjustment would be the tail wagging the dog — and it would
need *exactly the same postcode detection* as getting it right, plus a refusal
nobody benefits from.

**Nothing changes in Medusa.** Twenty-seven country regions, `country_code`
routing, wrong by design for the postcode slivers below. The tax lines it
computes are a pricing-internal artefact that reaches no buyer and no filing.

**The correction happens when the return is prepared.** Each quarter, the
orders are reclassified against the table below into a final bucket:
`OSS(member state, rate)`, `OSS(XI, 20%)` for an EU-dispatched Northern Irish
parcel, `OSS(FR, 20%)` for Monaco, Portugal's regional 16% or 22%, or
**outside the EU VAT area**, which leaves OSS altogether and becomes an export.

Until that reclassification is a script, it is a **hand scan**, and it is
honestly small: read the quarter's orders for postcodes beginning `BT`, `35`,
`38`, `51`, `52`, Finnish `22`, Portuguese `9`, French `97`/`98`, and five exact
codes. For a shop selling a joke certificate that is ten minutes' work, and the
first OSS return is not due until January 2027.

## The table this decision exists to record

Postcode is the discriminator throughout. Province is free-text on this
checkout and unreliable; the checkout asks for one only where Printful demands
it, which is the United States and Australia.

| Country | Postcode | Territory | Correct treatment |
| --- | --- | --- | --- |
| ES | `35`, `38` | Canary Islands | Outside EU VAT (Art 6(1)) — export |
| ES | `51`, `52` | Ceuta, Melilla | Outside EU VAT (Art 6(2)) — export |
| FI | `22…` | Åland | Outside EU VAT (Art 6(1)) — export |
| DE | `27498` | Heligoland | Outside EU VAT (Art 6(2)) — export |
| DE | `78266` | Büsingen | Outside EU VAT (Art 6(2)) — export |
| GR | `63086` | Mount Athos | Outside EU VAT (Art 6(1)) — export |
| IT | `23041`, `22061` | Livigno, Campione d'Italia | Outside EU VAT — export |
| FR | `97…`, `98…` except `980` | Outermost regions | Outside EU VAT (Art 6(1) via Art 349 TFEU) |
| FR `980…`, or MC | — | **Monaco** | **French 20%, through OSS** (Art 7(1)) |
| PT | `9000`–`9499` | Madeira | **22%** |
| PT | `9500`–`9999` | Azores | **16%** |
| GB | `BT…` | **Northern Ireland** | **Goods: UK 20% through OSS as `XI`.** Certificate: outside EU VAT — the UK question |
| DK | `39…` | Greenland entered as Denmark | Outside EU — export |
| IT | `47890`–`47899`, `00120` | San Marino, Vatican | Outside EU VAT — export |

Deliberately absent, and each for a reason:

- **The Greek reduced-rate islands.** From 1 January 2026 two dozen islands
  under 20,000 people take a 30% reduction, but whether a *foreign distance
  seller* may apply it is unresolved, and their postcodes interleave with
  full-rate islands at three-digit granularity. Charging the mainland 24%
  over-remits, which is the safe direction, and detection is unreliable anyway.
- **Jungholz and Mittelberg**, two Austrian villages on a 19% regional rate.
  A one-point over-remit on an order this shop will almost certainly never see.
- **Akrotiri and Dhekelia**, which Art 7(1) treats as Cyprus and which buyers
  enter as Cyprus — correct already, by accident.
- **Northern Cyprus**, where the acquis is suspended and which is not
  practically shippable.

## What is verified and what is not

The provisions are read from the consolidated Directive: **Art 6(1)** for the
territories inside the customs union and outside VAT, **Art 6(2)** for those
outside both, **Art 7(1)** for Monaco and the Sovereign Base Areas, and the
Protocol's **Art 8 with Annex 3** for Northern Ireland.

Three things are **inferred rather than established**, all of which move money
downward and none of which blocks anything:

1. **Azores 16% and Madeira 22% for a distance seller.** Portugal may apply
   lower rates in the autonomous regions under Art 105(2), and the place of
   supply is the region — but confirm on the next TEDB pass.
2. **Whether Italian postcodes `23041` and `22061` are exclusive** to Livigno
   and Campione. Verify against a CAP database before any script keys on them.
3. **Whether a local consumption tax reaches this trader** — IGIC in the
   Canaries, Finnish VAT on e-services to Åland. Both are questions to ask on
   first occurrence, not before, which is the disposition `013` already takes
   for the United Kingdom.

## Added to what EMTA is asked

`013` carries the questions for EMTA. Two more belong there:

- How a supply **dispatched from Latvia or Spain to an Art 6 territory** is
  declared — it is an export from the dispatch state, which is not obviously an
  Estonian KMD row.
- **Confirm the e-MTA OSS return accepts `XI`** as a member state of
  consumption, before the first Northern Irish parcel rather than after.
