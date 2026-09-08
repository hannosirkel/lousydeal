# 012. VAT for goods Printful dispatches

**Date:** 2026-09-08.
**Status:** the scheme is settled; **two choices remain open for the operator**
— Spain and the United Kingdom — and one question is for EMTA.
**Supersedes nothing.** [`009`](./009-merchant-absorbs-the-vat.md) stands for the
certificate; this record covers the goods LD-04 adds, which 009 said would
reopen it.

## The ruling

**Every country is served and nothing is blocked**, which was the operator's
firm constraint. The cost is **two filings, not one**: a Union OSS registration,
and the EU SME scheme's quarterly turnover report — both in e-MTA, both in
Estonian, and the second is four lines.

Spain and the United Kingdom sit outside that and are the operator's remaining
choice.

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

What resolves it is neither Printful's position nor a different reading of the
statute: it is the **EU SME scheme**, which the first draft did not know about.

## What Printful's guidance actually says, and what it does not

The [help article](https://help.printful.com/hc/en-us/articles/360014008740-Do-I-need-to-register-as-a-VAT-payer-in-each-country-I-sell-in)
opens with "This content is for informational purposes only and does not
constitute legal advice", and then:

> "When your total cross-border sales exceed 10,000 EUR across all EU member
> states in a calendar year, you can register for the One Stop Shop (OSS)
> scheme."
>
> "We're registered for both OSS and IOSS schemes, so we handle most VAT
> obligations for your orders within the EU and on imports under 150 EUR. That
> means you usually don't need to register separately, unless you're selling
> outside of the EU or have specific VAT needs."
>
> **Note:** "Even if you're registered under the OSS scheme, VAT will still be
> charged for orders fulfilled in Latvia, Spain, the UK, and Northern Ireland
> due to our local tax obligations in those countries."

**Read the note carefully, because it is easy to read backwards.** It is about
VAT *Printful charges the merchant*, arising from *Printful's* obligations in
those four places. It is a **cost line on the invoice you receive**, not a
filing duty you acquire.

**But it does not follow that the merchant has no duty of its own**, and the
last paragraph of the article is where it overreaches. Printful's OSS and IOSS
registrations can only report **Printful's** supplies. A Riga→Berlin sale is the
*merchant's* intra-Community distance sale under Art 14(4) p 1; no mechanism
exists by which Printful's OSS return could carry it. The article hedges the
sentence twice — "most", "usually" — and disclaims being advice in its first
line.

So this record follows Printful's guidance for what Printful does, which is the
part a supplier can speak to, and settles the merchant's own position from the
statute.

**And Printful's other article says the same thing outright**, which removes the
tension rather than leaving it as a judgement call. [*How do I comply with VAT
regulations when selling to EU
customers?*](https://help.printful.com/hc/en-us/articles/360014008620-How-do-I-comply-with-VAT-regulations-when-selling-to-EU-customers)
— same help centre, same disclaimer — has a section headed "Once you're
VAT-registered":

> "When you're registered for VAT, you'll need to:
>
> - Collect VAT on orders going to EU member states.
> - Check invoicing and reporting rules in the country where you're registered.
> - File VAT returns and pay VAT to your local tax authorities (deducting any
>   VAT you've paid on your supply chain).
> - Show VAT charges clearly at checkout for your customers."
>
> "Since July 1, 2021, the EU-wide distance selling threshold is EUR 10,000. If
> your total cross-border EU sales exceed this: you'll need to register for
> VAT under the Union scheme (OSS) or in the specific EU country where you
> sell."

**This trader is VAT-registered in Estonia.** So by Printful's own account it
collects VAT on its EU sales, files its own returns, and takes OSS above
€10,000 — which is the scheme above. The first article's "you usually don't need
to register separately" is addressed to the case the second article sets out
under "You haven't reached your country's sales threshold", where an
*unregistered* seller lets Printful's VAT stand as the only VAT in the chain.
That is not this trader.

**Two operational facts fall out of the second article**, and both are money:

> "After you've registered as a VAT payer, submit your VAT ID to Printful. Once
> approved, VAT will be charged based on where the order is fulfilled and
> shipped."
>
> "If you submit a valid VAT ID from an EU country where you're registered,
> we'll apply 0% VAT on orders fulfilled in that same EU country and shipped to
> customers in other EU destinations. However, if orders are fulfilled and
> delivered within the same EU country … VAT will be charged at that country's
> local rate under the OSS scheme."

The zero rate is conditional on **fulfilment happening in the country of
registration**. Printful has no Estonian facility, so an Estonian VAT ID may
never reach the 0% case at all, and Printful's VAT stays on every invoice. That
is precisely the cost of goods this record already sends P4 to measure — and it
raises the stakes on measuring it rather than assuming a reverse charge that may
never apply.

**A third article closes the question in one sentence.** *What formula should I
use to calculate VAT?*, same help centre, same disclaimer:

> "If you're selling to customers in the EU, you may need to collect VAT (Value
> Added Tax) on those orders, **regardless of where the order is fulfilled**.
> This applies even if the order is fulfilled outside the EU."
>
> "The VAT rate depends on both your business's country of registration and
> where the order is delivered."
>
> "(Retail price + shipping + services – discounts) × VAT rate"

There is no reading of that on which Printful's own registrations discharge the
merchant's duty. Printful says the merchant collects, and says the rate turns on
the delivery country. Three articles, one position, and it is the position this
record already took.

**And the formula carries a build consequence nobody had noticed: VAT applies to
the shipping line.** Confirmed in law, not only in Printful's arithmetic —
**Art 78(b)** puts "incidental expenses, such as commission, packing, transport
and insurance costs, charged by the supplier to the customer" in the taxable
amount, and **KMS § 12 lg 6¹** says the same of "kõrvalkulud". LD-04 quotes Printful's rate and passes it through
unmarked-up — but under decision `009` the price is VAT-inclusive, so a $5.22
quote shown to a buyer nets $4.21 at 24% while Printful charges the full $5.22.
**The pass-through loses about a fifth of itself on every order.**

The fix is arithmetic rather than policy, and it keeps both rules intact: the
quoted shipping is **grossed up** by the destination rate, so the net recovers
Printful's charge exactly. The buyer still sees one number and still pays
exactly that number, which is all `PRICE_NOTICE` promises; the pass-through
becomes genuinely neutral instead of quietly subsidised. P7 does the grossing
up, and P4's guard checks the net rather than the gross.

Printful also assumes the merchant can deduct "any VAT you've paid on your
supply chain". An Estonian registration does not deduct Latvian VAT on the
Estonian return; that needs a Directive 2008/9 reclaim, which is not worth
filing at this volume. So the deduction Printful assumes is, here, not
available.

## The scheme

| | What | How it is handled |
| --- | --- | --- |
| 1 | Sales to Estonian addresses | **The ordinary Estonian return** |
| 2 | Every intra-EU cross-border sale — **including Riga→Estonia** | **Union OSS**, registered in Estonia through e-MTA, naming Latvia and Spain as dispatch countries in the application. Quarterly, in euro |
| 3 | Latvia → a Latvian buyer, **and any sale ending in Latvia** | **The EU SME scheme**, transposed at **KMS § 19¹**. An *eelteade* in e-MTA yields an "EX" number within 35 working days and the supply is exempt in Latvia with no Latvian registration — Art 284(2) of the VAT Directive as amended by Directive (EU) 2020/285. Conditions: Union turnover ≤ €100,000 current and preceding year, Latvian supplies ≤ €50,000. Costs a per-country turnover report by the end of the month after each quarter |
| 4 | Spain → a Spanish buyer | **Nothing available.** Spain is the one member state that never transposed the SME directive. Either a Spanish registration, or a stated decision to accept the exposure — see below |
| 5 | The United Kingdom, both routes | **Nothing available.** Non-established persons get *no* registration threshold. Either a UK registration, or a stated decision to accept |
| 6 | US → EU parcels under €150 | **Printful's IOSS**, and only Printful's — merchants cannot supply their own number. Nothing to do |
| 7 | US, Canada, Australia, NZ, Norway, Switzerland, Japan, Singapore | **Nothing.** Every threshold is far above this volume, and print-on-demand creates no US physical nexus because no inventory is ever owned |
| 8 | Everywhere else | Export. The buyer bears any local import charge, disclosed before purchase |

**Nothing is blocked. Every destination the shipping API quotes is sellable**,
and it quoted every destination tried — Estonia to Brazil.

**Row 2 corrects the first version of this record**, which put Riga→Estonia on
the Estonian return. It does not belong there: it is an intra-Community distance
sale like any other, and EMTA's own worked example puts it in the OSS return.

**Row 3 is the finding that made "all countries" affordable**, and it was
verified against all three sources before being relied on, because the whole
design rests on it. The first version of this record proposed blocking Latvia
because it could find no way for a non-established trader to make a domestic
Latvian supply without registering there. The EU SME scheme is that way.

Four things about it could have been wrong, and none is:

- **It is in Estonian law**, at KMS § 19¹, in force since 1 January 2025: "…
  **ei teki teises liikmesriigis käibe tekkimise korral kohustust ennast selles
  teises liikmesriigis maksukohustuslasena registreerida**, kui ta rakendab …
  väikeettevõtete erikorda."
- **It covers goods**, not only services. Art 284(1) and (2) both say "goods and
  services", and the Commission's SME notes lead with domestic supplies of
  goods.
- **It covers a domestic supply in the other state.** Art 284(2) is mandatory on
  Member States operating an exemption: they "**shall** also grant that
  exemption to the supplies of goods and services **in their own territory**
  made by taxable persons established in another Member State".
- **A trader already VAT-registered in Estonia may use it** — the limb most
  likely to fail. EMTA answers exactly this configuration in its own FAQ: an
  Estonian VAT payer using OSS for sales to other member states asks whether it
  can also use the SME scheme, and the answer is "**Jah**", subject only to the
  €100,000 Union turnover ceiling.

**Row 3 also reaches further than the first draft of it did.** Once the EX
number covers Latvia, *every* supply located in Latvia falls under the Latvian
exemption — including a distance sale that merely *ends* there, such as
Barcelona → a Latvian consumer, because the SME scheme and OSS cannot both
apply in one jurisdiction. That is favourable, and it makes row 2 one line too
absolute: Latvia-terminating sales belong in row 3, not row 2. **Worth putting
to EMTA** alongside the certificate question below.

**One cost it carries, which is not a filing.** The SME exemption is exemption
*without* deduction. Input VAT on the exempt Latvian activity is not deductible,
and overhead input VAT has to be apportioned on the Estonian return. Negligible
money at this volume, and recorded so it is not a surprise.

## Spain and the United Kingdom, which are the two the scheme cannot absorb

Both are **legally required from the first sale**. Neither is covered by
Printful's registrations, the SME scheme, or OSS as it stands. The operator has
a genuine choice and it should be made with the labels attached rather than by
drift:

**Spain** — Modelo 303 quarterly plus Modelo 390 annually. Exposure is only
Barcelona→Spanish-buyer orders. **EMTA states the position itself**, which is
worth knowing because it is an Estonian source on a Spanish question:
"Hispaanias puudub käibemaksuvaba piirmäär ja seetõttu väikeettevõtete erikorda
seal kasutada ei saa ning seal käibe tekkimisel tuleb registreerida kohe
Hispaania käibemaksukohustuslaseks." Spain is the only Member State not to have
transposed the SME directive and was referred to the Court of Justice in March
2026 over it.

**It is time-boxed, with a caveat.** From 1 July 2028 ViDA puts non-established
domestic supplies into the same quarterly OSS return. But that relief also
depends on Spanish transposition, and Spain's current position before the Court
is precisely a failure to transpose — so the end date is the directive's, not a
promise.

**The United Kingdom** — quarterly returns under Making Tax Digital, and it does
*not* expire. Printful already remits 20% on its own leg, so parcels clear and
buyers are never charged at the door; what is unaccounted is VAT on the margin.
Unlike a US seller, an Estonian OÜ is reachable — the EU–UK agreement lets HMRC
collect through EMTA.

Accepting either is **non-compliance rather than a grey area**, and this record
says so plainly so that accepting it is a decision and not an oversight.

Three supporting details could not be checked against EU law, Estonian law or
EMTA, and are therefore held as plausible rather than established: that Spain
needs no fiscal representative from an EU business; that HMRC can collect
through EMTA under the EU–UK agreement; and that Printful requires its own IOSS
number rather than accepting a merchant's.

## Two things this creates that are not filings

**A counter for cross-border EU turnover.** Even under Printful's own reading the
threshold is a fact about turnover, and the way to get it wrong is to pass it
without noticing. LD-04 measures it and shows the operator.

**The wholesale-leg taxes, in the margin table.** Printful charges its own VAT on
orders fulfilled in Latvia, Spain, the UK and Northern Ireland, destination VAT
on US→EU imports under its IOSS, US sales tax on US orders, and GST on
Toronto-fulfilled Canadian ones. An Estonian registration recovers none of it
through the Estonian return, and a Directive 2008/9 reclaim is not worth filing
at this volume — so it is **cost of goods**. P4 measures it from a real invoice.
The margin table has been wrong twice; it will not be trusted a third time
without one.

Also worth knowing, and it is a **duty rather than a fee**: Council Regulation
(EU) 2026/382 applies a flat €3 per item to sub-€150 consignments imported
VAT-exempt under IOSS, from 1 July 2026 to 1 July 2028. A separate Union
handling fee of about €2 was provisionally agreed as of September 2026, planned
from 1 November 2026. Both are cost lines P4 will meet.

## The certificate, which this record cannot leave alone

The Commission's Explanatory Notes on the e-commerce rules say the €10,000
threshold is lost **at trader level** where goods are dispatched from a Member
State other than the state of establishment: "for the threshold to be applicable
the supplier must be established in one Member State and goods must be sent from
that Member State of establishment."

**That is guidance, and this record must not present it as more.** The Notes
disclaim being legally binding on their own title page; the in-force
Art 59c(1)(b) says goods dispatched "**to**" another Member State, not from — the
origin wording enters only with ViDA on 1 January 2027; and KMS § 10¹ lg 7's
conditions are arguably still met for the certificate, since the trader has no
seat or fixed establishment outside Estonia.

So the honest statement is that it is **unsettled**, and that if the
Commission's reading holds, selling the first mug costs the **certificate** its
threshold too and decision `009`'s single absorbed Estonian rate becomes a
per-country rate between 17% and 27%.

**ViDA settles it from 1 January 2027 regardless**: the amended Art 59c counts
only goods dispatched from the establishment state, *and* deems an OSS-registered
trader to have opted for destination taxation. Since this trader will be in OSS,
the certificate goes to destination VAT no later than that date.

The damage is contained — it lands in the same quarterly return and adds no
filing — but it touches `009`, the margin guard, and the Estonian return, and it
is **the thing to put to EMTA in writing** rather than the threshold question the
first version of this record proposed asking.

## Consequences

- LD-04's P14 implements this record and no longer blocks Gate E.
- P4's margin table carries Printful's wholesale-leg taxes as cost of goods,
  measured from an invoice.
- Decision `009` is reopened by the certificate finding above, and LD-04 does not
  close it.
- P7 has no destination allow-list; every country the rate API quotes is
  offered.
- P9 states, before the ordering process begins, that buyers outside the EU may
  owe local import charges — § 54(1), and it is the honest form of "the amount
  shown is the amount charged".
- A cross-border turnover counter is added, and watched.
- P7 grosses up the shipping quote by the destination rate, so passing
  Printful's charge through is neutral rather than a fifth short.
