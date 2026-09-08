# 012. VAT for goods Printful dispatches

**Date:** 2026-09-08.
**Status:** accepted by the operator, with one assumption recorded below and one
question left open for EMTA.
**Supersedes nothing.** [`009`](./009-merchant-absorbs-the-vat.md) stands for the
certificate; this record covers the goods LD-04 adds, which 009 said would
reopen it.

## The ruling

Estonian VAT on everything while cross-border EU sales stay under €10,000 a
year. **Union OSS when they pass it** — one quarterly return, filed in e-MTA in
euro. No registration in Latvia, Spain, the United Kingdom or Northern Ireland.
**Every country is served; nothing is blocked.**

That is the operator's decision of 2026-09-08 and it is also, almost word for
word, what Printful's own guidance says to do.

## Why the earlier draft of this record proposed something worse

An earlier version blocked Latvia, Spain and everything outside the EU. The
operator rejected the blocking, and was right to: it was the wrong lever.

The analysis behind it was not wrong, and it is kept here because if EMTA ever
asks, this is the question they will ask about. **Art 59c disapplies Art 33(a);
what is left is Art 32, place of supply is where dispatch begins, and Printful
dispatches from Riga and Barcelona.** Estonia transposed the threshold at
**KMS § 10¹(7)**, reaching only the supplies in **§ 10¹(5)** — "kaup
võõrandatakse ja toimetatakse **Eestist** … teise liikmesriiki". *From Estonia.*
On a strict reading, goods dispatched from Latvia never qualified for the
threshold, and destination VAT was due from the first cross-border sale.

**What resolves it is Printful's position, not a different reading of the
statute.**

## What Printful's guidance actually says, and what it does not

The [help article](https://help.printful.com/hc/en-us/articles/360014008740-Do-I-need-to-register-as-a-VAT-payer-in-each-country-I-sell-in)
opens with "This content is for informational purposes only and does not
constitute legal advice", and then:

> "When your total cross-border sales exceed 10,000 EUR across all EU member
> states in a calendar year, you can register for the One Stop Shop (OSS)
> scheme."

> "We're registered for both OSS and IOSS schemes, so we handle most VAT
> obligations for your orders within the EU and on imports under 150 EUR. That
> means you usually don't need to register separately, unless you're selling
> outside of the EU or have specific VAT needs."

> **Note:** "Even if you're registered under the OSS scheme, VAT will still be
> charged for orders fulfilled in Latvia, Spain, the UK, and Northern Ireland
> due to our local tax obligations in those countries."

**Read the note carefully, because it is the sentence that decides the
architecture and it is easy to read backwards.** It is about VAT *Printful
charges the merchant*, arising from *Printful's* obligations in those four
places. It is a **cost line on the invoice you receive**, not a filing duty you
acquire. Nothing in it asks the merchant to register anywhere, and the article
says so in its first line: "No, you don't need to register for VAT in every EU
country you sell to."

So the scheme below follows Printful's guidance where Printful is describing its
own conduct — which is the part a supplier can actually speak to — and does not
lean on it for anything else.

## The scheme

| | What | Where it is reported |
| --- | --- | --- |
| 1 | Every sale, while cross-border EU turnover is under €10,000/yr | **The ordinary Estonian return.** Estonian VAT, absorbed into the price per `009` |
| 2 | Cross-border EU sales once that figure is passed | **Union OSS**, registered in Estonia through e-MTA. Quarterly, in euro |
| 3 | Sales to Estonian addresses | The ordinary Estonian return, always. EMTA confirms home-country supplies are excluded from OSS |
| 4 | Orders Printful fulfils in LV, ES, UK, NI | **Nothing to file.** Printful charges its own VAT on its invoice to us |
| 5 | EU imports under €150 | **Printful's IOSS.** The buyer pays nothing at the door |
| 6 | Outside the EU | Export. The buyer bears any local import charge, disclosed before purchase |
| 7 | US sales tax | Printful computes and charges it; `/tax/countries` returns the per-state table it uses |

**Nothing is blocked. Every destination the shipping API quotes is sellable**,
and it quoted every destination tried — Estonia to Brazil.

## Three things this creates, and none of them is a filing

**A counter, and it is a build requirement rather than a note.** The €10,000
threshold is a fact about turnover, and the one way to get this wrong is to pass
it without noticing. LD-04 measures cross-border EU sales and says so where the
operator will see it. This site already counts things it must not fabricate; it
can count this.

**Registration timing, which is easy to get wrong the other way.** OSS takes
effect the first day of the quarter after application — earlier only if filed by
the 10th of the month after the first supply. So it is applied for as the
counter approaches €10,000, not after it is passed.

**An operator action worth taking today.** The Estonian VAT number belongs in
Printful's billing settings, so that reverse charge applies to Printful's supply
wherever it can. The note above says VAT is charged on LV/ES/UK/NI fulfilments
regardless; whatever that leaves is an input cost that an Estonian registration
does not recover through the Estonian return, and reclaiming Latvian VAT under
Directive 2008/9 is not worth a filing at this volume. **It is therefore a real
cost and P4 must carry it in the margin table**, measured from an invoice rather
than assumed.

## The assumption this record rests on, stated so it is visible

Printful's summary of the €10,000 threshold does not mention the dispatch-state
condition in Art 59c and § 10¹(5). If EMTA reads that condition strictly,
cross-border merch was destination-taxed from the first sale and the threshold
never applied to it.

The operator has accepted that risk on the basis of Printful's guidance, at a
volume where the amounts are small. **This record exists so that the decision is
visible rather than implicit**, and so that the answer is cheap if it is ever
questioned: register for OSS, and account for the difference.

**The open question for EMTA** — worth asking once, in writing, whenever there
is a reason to contact them: *do sales of goods dispatched from another Member
State count toward the €10,000 threshold?* If they do, the certificate's own
threshold position is affected too, which is the larger half of the question.

## Consequences

- LD-04's P14 implements this record and no longer blocks Gate E.
- P4's margin table carries Printful's LV/ES/UK VAT as a cost, from an invoice.
- P7 has no destination allow-list; every country the rate API quotes is
  offered.
- P9 states, before the ordering process begins, that buyers outside the EU may
  owe local import charges — § 54(1), and it is the honest form of "the amount
  shown is the amount charged".
- A cross-border turnover counter is added, and watched.
