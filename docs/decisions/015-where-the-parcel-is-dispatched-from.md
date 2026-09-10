# 015. Where the parcel is dispatched from

**Date:** 2026-09-10. **Status:** settled. Latvia covered, IOSS closed, and
**Spain settled by the operator on 2026-09-10: the exposure is accepted and no
country is closed.** Extends
[`013`](./013-the-vat-arrangement.md), whose Latvia row this confirms, whose
Spain row gains a third option, and whose "IOSS — nothing to do" row gains a
hard reason instead of a judgement.

## The two supplies decision `013` reasoned about in the abstract

Art 32 of Directive 2006/112/EC places a transported supply "where the goods
are located at the time when dispatch … begins". Printful dispatches from Riga
and Barcelona. So a parcel to a **Latvian** address is a Latvian domestic
supply, and one to a **Spanish** address is Spain-domestic. **The Union OSS
cannot carry a domestic supply**, and Estonia's threshold never reached them —
KMS § 10¹(5) says *from Estonia* in as many words.

`013` was right about all of that. What it did not have was an answer.

## Latvia — covered, with a gap in October

The EU small-enterprise scheme covers it, and the chain holds at every link:

1. **Art 284(2)**, as amended by Directive (EU) 2020/285, is *mandatory* on a
   Member State operating an exemption: it "shall also grant that exemption to
   the supplies … in their own territory made by taxable persons established in
   another Member State", subject to Union turnover ≤ €100,000 and the state's
   own domestic threshold.
2. **Latvia operates one**, at €50,000 a calendar year.
3. **Estonia transposed the cross-border limb at KMS § 19¹**: a trader applying
   the scheme does not become obliged to register in the other Member State.
4. **An Estonian VAT payer using OSS may also use the scheme.** EMTA's own
   handbook says so, and the Commission's SME Explanatory Notes settle the
   boundary `013` had to assume: cohabitation is possible, but "it is not
   possible to apply both the SME and OSS Union schemes at the same time in one
   same jurisdiction". Scenario 2 of §7.1.2 is this trader exactly — supplies
   located in Latvia are exempt under the `EX` number and go in the quarterly
   report, not in OSS.

**Two duties that follow, neither of them optional.** The quarterly report is
four a year *even at zero*. And crossing €100,000 of Union turnover must be
notified within 15 working days, after which the scheme is lost until the end
of the *following* calendar year — which is what `report:vat-thresholds`
already counts.

**The gap:** the exemption applies only from the day EMTA communicates the `EX`
number (KMS § 19², transposing Art 284(5)). The application went in on
2026-09-09 and decisions take up to 35 working days, so confirmation is due
around **28 October** — while destination taxation starts **1 October**. In
that window an LV→LV sale would require immediate Latvian registration. The
code closes the window by refusing rather than by hoping: see below.

**Not a way out, checked:** Printful's fulfilment does not make this Printful's
Latvian supply. There are two supplies — Printful to the trader, which is why
Printful charges Latvian VAT on that invoice, and the trader to the consumer.
Art 14a's deemed-supplier rule reaches an electronic interface *facilitating*
third-party sales; the trader's own shop is the interface and the trader is
EU-established, so no limb applies.

## Spain — not coverable, and the operator has three options

**Spain never transposed Directive (EU) 2020/285** and applies no domestic
exemption threshold, so Art 284(2) has nothing to extend. EMTA states it
outright: there is no Spanish threshold, the small-enterprise scheme cannot be
used there, and a trader with turnover in Spain must register there
immediately. The Commission referred Spain to the Court of Justice over this on
11 March 2026, seeking financial sanctions.

So listing Spain on the `EX` application would be applying for an exemption
that does not exist. The options are:

1. **Register in Spain.** Modelo 303 quarterly and 390 annually, in Spanish.
   One point improves on `012`'s note: Art 204 bars a Member State from
   *requiring* a tax representative of a person established in another Member
   State, so no fiscal representative can be demanded. It remains grossly
   disproportionate to the trade it would legalise.
2. **Accepted exposure**, which is what `013` records today. It is
   non-compliance from the first ES→ES sale. ViDA's 2028 end-date is the
   escape, and it depends on the transposition Spain is currently before the
   Court for not doing.
3. **Refuse the Spanish parcel at quote time.** Newly possible: `departsFrom`
   is known before the buyer pays. Lawful — Regulation (EU) 2018/302 does not
   oblige a trader to deliver to any particular Member State, so long as the
   refusal keys on the **delivery address** and never on the buyer's
   nationality or residence, and Spanish customers can buy everything else on
   the same terms. **The certificate is unaffected**; only the parcel is
   refused.

### The operator chose option 2, on 2026-09-10

**The exposure is accepted and sales stay open to every country**, which keeps
`013`'s "no destination allow-list" intact rather than spending it on the one
case that would have tested it. The operator also records the cost side:
**Printful charges Spanish VAT on a Barcelona-to-Spain dispatch**, on the
invoice to the trader, so the transaction is not untaxed — what is missing is
the trader's own Spanish output VAT, which is the exposure being accepted.

It remains non-compliance from the first ES→ES sale, and the honest reasons to
accept it are that a Spanish registration would dwarf the trade it legalises,
that the volumes are near zero, and that ViDA's 2028 end-date closes it — on
the same transposition Spain is currently before the Court for not doing.

**An accepted exposure that nobody measures is an assumed one**, so the
condition attached to accepting it is that it is counted:
`report:vat-thresholds` now reports supplies dispatched and delivered inside
one member state, per country. Latvia appears in the same line and is covered
by the `EX` number; Spain is the figure that matters, and it is a figure rather
than a guess.

## IOSS — closed, by elimination rather than convenience

`013` recorded "nothing to do" on judgement. There is now a hard reason: the
Commission's SME Explanatory Notes §7.2 state that **"The SME scheme and the
IOSS are mutually exclusive"** — a taxable person availing of the SME exemption
"would have to opt out of the SME scheme to be able to use the IOSS", and the
VAT Committee almost unanimously confirms it.

Taking IOSS would therefore forfeit the `EX` number and **reopen Latvia**. It
is not a candidate at all while the small-enterprise arrangement stands.

What the law requires instead is what the Terms already do. Without IOSS, a
US→EU consignment is outside EU VAT scope for the trader — Art 32 places it
where dispatch begins, and Art 33(c) relocates it into the EU *only* where the
VAT is declared under IOSS, which it is not. Import VAT falls on the buyer as
importer, and VÕS § 54(1) p 6 requires exactly the disclosure Terms §3 carries.

In practice Printful declares sub-€150 US→EU imports under **its own** IOSS and
charges the destination VAT to the merchant as a cost line, so a buyer usually
sees no doorstep charge. That is Printful's arrangement, not the trader's, and
it is recorded here as an expectation to verify against a real US-dispatched
order rather than a fact to rely on.

**The operational half:** US dispatch of an EU order is a *backup facility*
artefact. Printful's routing cannot be chosen per order — "you can't manually
choose a fulfillment center" — but Dashboard → Settings → Store settings →
Orders → Order fulfillment centers opts out of backup facilities, which is what
causes surprise long-distance dispatch. Worth doing; the cost is that a
stock-out delays an order rather than rerouting it.

## What the code does now

`validateFulfillmentData` records `departsFrom`, `customsFeesPossible` and
`quotedFor` on the shipping method, which carries them onto the order. That is
the only moment the dispatch country exists: Printful states it in the rate
response, and the order afterwards holds a price and an address and nothing
that could recover it.

It is not bookkeeping. **Art 369g(2) makes the OSS return itemise supplies per
Member State of dispatch**, and the small-enterprise quarterly report needs the
Latvian column. An order that did not write this down cannot be reported
correctly in January.

A failed quote does not fail the attach: Medusa has already priced the option
by then, and turning a Printful blip into an uncompletable checkout to record a
fact needed in three months is the wrong trade. The absence is written as
`null`, which the return preparation can see and ask about.

## What is not built, and why

- **The sellability rule** — refusing an option where `departsFrom` equals the
  destination and that country is not Estonia or an `EX`-exempt state.
  **Not built, and now deliberately not:** the operator accepted the Spanish
  exposure and closed no country, so the rule has nothing left to refuse. It
  stays written down because the October gap is real — until EMTA communicates
  the `EX` number, an LV→LV sale is in the same position Spain is — and because
  a future operator may decide differently. The counter is what covers the gap
  in the meantime: a Latvian supply before the confirmation date shows up in
  the same report line.
- **`vatRateFor` returning 0 for `EX`-exempt destinations.** An LV-terminating
  supply under the exemption bears no VAT, so grossing Latvian postage up by
  21% would charge tax nobody owes — the same wrong direction P14b fixed for
  Luxembourg. It waits on EMTA confirming the exemption's scope, because
  guessing it wrong charges a real buyer.

## What EMTA is asked

Added to `013`'s list:

1. Confirm that once the `EX` covers Latvia, **all** supplies located there —
   domestic, distance sales merely ending there, and the certificate to Latvian
   consumers — fall under the exemption and the quarterly report rather than
   OSS. Cite Explanatory Notes §7.1.1–7.1.2, Scenario 2.
2. Whether LV-dispatched exports to third countries belong in the Latvian
   column and count toward the €50,000.
3. Confirm that US-dispatched B2C sales to EU buyers, absent IOSS, create no
   Estonian or OSS declaration duty — and confirm the SME/IOSS exclusivity.
4. **The exact date the Latvian exemption takes effect**, so the code's flag
   flips on a documented day rather than an assumption.

**Closed by the operator, 2026-09-10.** These questions are settled at the position stated above, along with the rest of `013`'s list; see [`013`](./013-the-vat-arrangement.md) for what closing them means and what it does not. In short: the arrangement proceeds on the reading recorded here, nothing about it reaches a buyer's total, and the first OSS return in January 2027 is when any of it becomes a practical question again.
