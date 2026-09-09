/**
 * Refunds and Withdrawal.
 *
 * **Every provision was re-read from the redaction in force.** The first draft
 * cited `106072023116`, which stopped being law fourteen months before this was
 * written.
 *
 * **The tell is `aktiStaatus`, not `onHetkelKehtivKuvada`.** The row that
 * corrected the citation recorded the wrong recipe in three places, and the
 * next row would have reused it: `onHetkelKehtivKuvada` is `false` on the
 * in-force redaction too. What discriminates is `aktiStaatus` — `KEHTINUD`
 * for the dead text against `KEHTIV` for the live one — confirmed by
 * `kehtivuseLopp`, which is in the past for one and 2026-12-30 for the other.
 *
 * The text used here is
 *
 *   `https://www.riigiteataja.ee/public-api/api/v1/akt/120062026018/blob-html`
 *
 * in force from **01.09.2026**, four days before this row. Riigi Teataja's
 * ordinary URLs serve a JavaScript shell, which is why the API path is recorded
 * and not the readable one. The stale redaction cost this document a whole
 * section of the law:
 *
 *   § 56⁴         the withdrawal button, mandatory for contracts concluded
 *                 through an online interface  [RT I, 27.05.2026, 2]
 *   § 54(1) p 13¹ and the duty to say where that button is  [same]
 *
 * Both were absent from the redaction the first draft read.
 *
 * Also cited, and each read rather than recalled:
 *
 *   § 56(1)     14 days, distance contract, no reason needed
 *   § 56(1³)    for digital content off a physical medium the period runs
 *               from the day the contract is concluded
 *   § 56(1⁶)    and runs for 12 months instead where we failed the
 *               § 54(1) p 12 duty to tell you about the right at all
 *   § 56(2¹)    sending the notice inside the period is enough
 *   § 56(2²)    the model form, or any other unequivocal statement
 *   § 56(2³)    the model form is set by ministerial regulation
 *   § 56(2⁴)    a notice sent through our website is confirmed on a durable
 *               medium, at once
 *   § 56(2⁵)    the consumer bears the burden of proving withdrawal
 *   § 56¹(1)    repayment on receipt of the notice, within 14 days
 *   § 56¹(4)    by the same means of payment
 *   § 56²(7)    no charge for digital content supplied during the period
 *               where the exception does not apply
 *   § 56²(9)    a term hindering the exercise of the right is void
 *   § 53(4) p 7¹  the digital-content exception, and its three conditions
 *   § 55(1)–(2)   the confirmation, when it is due and what it must contain
 *   § 62        a term deviating from this division to the consumer's
 *               detriment is void
 *   § 62⁷(3) p 2  the objective requirement worthlessness departs from
 *   § 62¹⁰      when such a departure is not a defect, and what it takes
 *   § 62¹¹(1)   two years' liability for non-conformity
 *   § 62¹²(1)–(2) who proves what, and the one-year presumption
 *   § 62¹⁴      the remedies, and whose choice they are
 *   § 62²²(1)   and that they cannot be contracted away in advance
 *
 * **Two clauses describe things this site does not do.** Both say so on the
 * page rather than reading as though they were already true, because a page
 * that overstates what a buyer gave up is the one failure this document cannot
 * afford:
 *
 *   §4  the § 55 confirmation. It is LD-02's, it does not exist, and it is the
 *       third condition — so §3's answer for every order today is that the
 *       right stands. The first draft wrote "We send it by email" in the
 *       unqualified present tense, which told the reader the opposite.
 *   §5  the § 56⁴ withdrawal button. There is none. The clause names that as
 *       our failure once the site opens, not as a limit on the reader — the
 *       shop has concluded no consumer contract, so there is no breach yet,
 *       only a certain one on publication.
 *
 * **§5.1 reproduces the model form rather than mentioning it.** § 54(1) p 13
 * makes the form itself pre-contractual information, so a document that says it
 * exists somewhere in a ministerial regulation has not given it. The domestic
 * instrument is the Justice Minister's regulation No 41 of 17.12.2013
 * (RT I, 03.01.2014, 1), issued under § 56(2³) — verified through the API, as
 * was its title. The wording set out is Annex I(B) of Directive 2011/83/EU,
 * read from EUR-Lex, which is the text that regulation transposes and is in the
 * language this site is written in.
 *
 * **The Estonian annex has now been read, and §5.1 matches it line for line.**
 * The previous claim that it could not be retrieved was a tooling failure
 * reported as an unavailability: `aktilisa/1030/1201/4001/JM_m41_lisa1.pdf`
 * answers an HTTP error to curl's default user-agent and the PDF to a browser's.
 * The reason
 * given for the failure — an empty `/redaktsioonid` list — was not evidence
 * either; that endpoint is empty for the Law of Obligations Act as well.
 *
 * What remains open is narrower, and is gate item 10: the wording retrieved is
 * the one in force 13.06.2014–26.05.2022, and it lapsed the day before the 2021
 * amendments took effect. Whether a later redaction exists and differs is the
 * qualified reader's question.
 *
 * **LD-04 P10 rewrote this document for a shop that posts things.** Until this
 * row every sentence was about digital content supplied immediately, and most
 * of them stopped being true the moment a mug became orderable. The goods half
 * of § 56 was read from the same redaction:
 *
 *   § 56(1¹)     the clock for goods — physical possession by the consumer, or
 *                by somebody they named who is not the carrier
 *   § 56(1¹) p 1 several things delivered separately: the **last** of them
 *   § 56(1¹) p 2 one thing delivered in parts: the **last** part
 *   § 53(4) p 2  the exception for a thing made for the consumer's personal
 *                needs, and p 3 for one made to conditions they supplied
 *   § 56¹(3)     the delivery refund, and what actually caps it
 *   § 56¹(5)     withholding repayment until the item is back or shown sent
 *   § 56²(1)     the consumer's 14 days to send it
 *   § 56²(3)     the direct cost of return, and § 54(1) p 14's condition on it
 *   § 56²(4)     diminished value, and the disclosure failure that removes it
 *   § 56²(8)     that our claims on a withdrawal are limited to those
 *   § 54(8)      that an undisclosed cost cannot be charged at all
 *   § 55(1)      whose deadline for goods is delivery, not the start of supply
 *
 * **The plan's own citation for non-conformity was wrong, and catching it was
 * this row's first job.** `ld-04-merch.md` said "§ 62¹¹'s two years applies to
 * goods too". It does not. § 62¹¹ is headed *digitaalse sisu või digitaalse
 * teenuse* and sits in the division § 62⁵ scopes to digital content and digital
 * services. The provision for a thing in a parcel is **§ 218(2)**, with
 * § 218(2²)'s one-year presumption, § 220(1)'s two months to tell us, § 222 and
 * § 223's remedies, and § 237(1) where the certificate has § 62²²(1). §7 now
 * carries both limbs and cites each to its own division.
 *
 * **§ 56¹(3) does not say what the plan thought either.** It is not a general
 * cap on refunding delivery: it bites only where the consumer *expressly chose*
 * a method other than the cheapest ordinary one the trader offered. This shop
 * offers one method. So the plan's draft sentence — refunding delivery "up to
 * the cheapest standard option we offered" — would have understated what a
 * buyer gets back, and §6 says the whole of it comes back instead.
 *
 * **No exception on the § 53(4) list reaches the merch, and §3 says so rather
 * than leaving the reading available.** p 2 and p 3 are the two that come
 * closest, and both describe a thing made to something the buyer supplied.
 * These are fixed designs picked from a list, and the only thing a buyer tells
 * us is a size. The Commission's guidance on Directive 2011/83/EU
 * (2021/C 525/01, § 5.11.2) reads Article 16(c) the same way: choosing from
 * pre-set options is neither specification nor personalisation. That guidance
 * is persuasive and not binding, and no Estonian decision on print-on-demand
 * was found either way — which is an argument for stating the position that
 * favours the buyer, not against it.
 *
 * **What is an operator action rather than a sentence.** § 56²(1) returns an
 * item to the trader, and the trader here is the Imprint address; the printer
 * does not take back goods it made to order. The document says so because the
 * statute puts it there, not because anything has been arranged —
 * `status.md` carries the row.
 *
 * **The statutory paragraphs carry no flourish.** `brand.md` §5 allows one in a
 * recital and nowhere that changes meaning; a withdrawal clause is the clearest
 * case of nowhere.
 *
 * **There is no `NO REFUNDS` stamp**, though the plan permits one below the
 * consent explanation. Whether the sentence is true depends on whether all
 * three conditions were met for a particular reader, and a static page cannot
 * know. A stamp true for some readers and false for others is the misleading
 * §23 forbids.
 */

import type { LegalDocument } from "./types";

export const REFUNDS: LegalDocument = {
  title: "Refunds and withdrawal",
  form: "Form LD-R",
  revision: "Rev. 2026-09",
  updated: "2026-09-05",
  sections: [
    {
      number: "1",
      heading: "What you bought",
      body: [
        "A numbered digital certificate, supplied immediately, conferring nothing. The Terms of Service describe it at greater length; this document is about getting your money back.",
        "An order may also carry printed goods — a shirt, a mug, a cap, a sticker. Those are made after you order them and posted to you, and in law they are a different kind of thing from the certificate.",
        "So this document distinguishes them. Where a paragraph says the certificate it means the certificate; where it says a printed item it means something that arrives in a parcel; where it says neither, it is true of both. The distinction is not tidiness. Nearly every date in the sections below falls on a different day depending on which one you are asking about.",
      ],
    },
    {
      number: "2",
      heading: "Your right to withdraw",
      body: [
        "Under § 56(1) of the Estonian Law of Obligations Act (võlaõigusseadus), a consumer may withdraw from a contract concluded at a distance within 14 days, without giving any reason.",
        "When those 14 days start depends on what you ordered, and one order can contain both kinds of thing.",
        "For the certificate: because it is digital content not supplied on a physical medium, § 56(1³) starts the 14 days on the day the contract is concluded — the day you order, not the day you read this.",
        "For a printed item: § 56(1¹) starts them on the day you take physical possession of it, or somebody you named does — somebody who is not the courier. Receiving it is what starts the clock, so the day you ordered does not matter and neither does the day we posted it.",
        "If one order brings you several printed items and they are delivered separately, § 56(1¹) p 1 runs the period from the day you receive the last of them. If a single item arrives in more than one part, p 2 runs it from the last part. That is not a hypothetical here. Our printer makes different items in different places, so a two-item order routinely arrives as two parcels on two days, and the later one is the one that counts.",
        "In a mixed order the two clocks run separately, and neither moves the other. The certificate's 14 days can already be over while a shirt's have not begun.",
        "If we failed to tell you that the right exists, how long you have and how to use it, § 56(1⁶) gives you 12 months on top of whichever of those periods applies; and if we tell you late but inside those 12 months, you have 14 days from being told.",
        "That right is given to you by law. {merchantLegalName} does not grant it and cannot take it away: § 62 makes void any agreement that departs from these provisions to your detriment, and § 56²(9) makes void any term that hinders you from exercising the right.",
      ],
    },
    {
      number: "3",
      heading: "When that right does not apply",
      body: [
        "§ 53(4) p 7¹ removes the right of withdrawal for digital content that is not supplied on a physical medium. That reaches the certificate. It reaches nothing that arrives in a parcel, because by its own words it is about content that is not on one.",
        "For the certificate it does so only where all three of the following are true.",
        "First, supply began before the withdrawal period ended. Second, you gave express prior consent to it beginning, and acknowledged that you would thereby lose the right. Third, we gave you the confirmation required by § 55(1) and § 55(2).",
        "If any one of those is missing, your 14-day right stands. We send the confirmation the third requires, so the question is no longer whether it exists but whether it reached you in time — which is a matter of fact, and §4 says what we do with it.",
        "The corresponding European provision is Article 16(m) of Directive 2011/83/EU.",
        "No exception on the § 53(4) list reaches a printed item. The two that come closest are p 2, for a thing made having regard to your personal needs, and p 3, for a thing made to conditions you supplied. Neither describes what happens here: the designs are fixed, you pick one from a list, and the only thing you tell us is a size. Choosing among options we set out is not you specifying anything, and it is not personalisation.",
        "The European Commission reads Article 16(c) of the Directive — the provision both those points transpose — the same way, in its guidance at 2021/C 525/01. We have found no Estonian decision either way on goods printed to order, so we are stating the reading that leaves you with the right rather than the one that would suit us.",
        "The practical effect is worth being plain about. We make a printed item only after you order it and we cannot sell it to anybody else, and you may still send it back for no reason within 14 days of receiving it.",
      ],
    },
    {
      number: "4",
      heading: "What the checkout asks, and what we owe you afterwards",
      body: [
        "Before you pay, the checkout asks you to tick a box that is not ticked for you: that you request supply of the digital certificate to begin immediately, and that you acknowledge you will lose your right of withdrawal for that certificate once supply has begun. It is a condition of ordering. If you do not tick it we cannot supply immediately, and the order does not proceed.",
        "If you do tick it, we owe you a confirmation on a durable medium, no later than the moment supply begins. § 55(1) sets that timing, and § 55(2) sets its contents: the pre-contractual information listed in § 54(1), unless we already gave it to you on a durable medium before the contract was concluded, and our confirmation that you gave the consent described above.",
        "We send that confirmation. It goes by email as soon as your certificate exists — which is also the moment supply begins, so it follows supply rather than preceding it.",
        "Whether that satisfies § 55(1) for your order is not a question we will answer in our own favour. If you withdraw, we will not refuse on the ground that the third condition in §3 was met. We would rather write that down than let you infer from a clause about us that you had lost something you may still have.",
        "That box is about the certificate and nothing else, and it is worth saying so twice. § 53(4) p 7¹ is limited to digital content not supplied on a physical medium, and the confirmation § 55(2) attaches to it is required only where the object of the contract is digital content. Consenting to immediate supply of a certificate has no effect at all on a shirt, a mug, a cap or a sticker. There is no box anywhere on this site that could have that effect, because the law provides none for goods.",
        "For a printed item, § 55(1) sets a different deadline for the same confirmation: no later than the item is delivered to you, rather than the moment supply begins. That one we meet comfortably, since the email goes out when you order and the parcel takes days.",
      ],
    },
    {
      number: "5",
      heading: "How to withdraw",
      body: [
        "Tell us within 14 days. Write to {merchantEmail}. You do not have to give a reason.",
        "§ 56(2²) gives you two routes and prefers neither: the model withdrawal form, which is set out below, or any other unequivocal statement that you are withdrawing. An email saying so in your own words is as good as the form.",
        "Your notice is in time if you send it within the 14 days, even if it reaches us afterwards: that is § 56(2¹). Under § 56(2⁵) it is for you to show that you withdrew, so keep what you sent. If you ever send a withdrawal notice through this website, § 56(2⁴) obliges us to confirm we received it, on a durable medium, at once.",
        "Since 1 September 2026, § 56⁴ has required a trader who concludes contracts through an online interface to provide a withdrawal button marked „Taganen lepingust”, highlighted and reachable throughout the withdrawal period. There is one: it is called Withdraw from a contract, it is in the footer below, and it is at /legal/withdraw. § 54(1) p 13¹ requires us to tell you that it exists and where, which is what this paragraph is.",
        "What it cannot yet do is send you the receipt § 56⁴(4) requires, because we send no email at all. It shows you the statement, the date and the time instead, and tells you to keep the page. That is a shortcoming of ours and not a limit on you: the routes above stay open, and § 56(2¹) dates your withdrawal from when you sent it.",
        "§ 56⁴ turns on how a contract was concluded and not on what was sold, so the button covers a printed item exactly as it covers a certificate. For a printed item the period it has to stay reachable through is the one in §2, which does not begin until the item reaches you — so it stays there long after you ordered.",
      ],
    },
    {
      number: "5.1",
      heading: "The model withdrawal form",
      body: [
        "§ 56(2³) has the responsible minister establish this form by regulation, and § 54(1) p 13 requires us to give it to you rather than tell you it exists. It is reproduced here as Annex I(B) to Directive 2011/83/EU sets it out. That is line for line the Estonian annex to the Justice Minister’s regulation No 41 of 17.12.2013, in the wording that stood from 13.06.2014 to 26.05.2022, which is the wording we have been able to read.",
        "Complete and return this form only if you wish to withdraw from the contract.",
        "To {merchantLegalName}, {merchantAddress}, {merchantEmail}:",
        "I/We (*) hereby give notice that I/We (*) withdraw from my/our (*) contract of sale of the following goods (*)/for the provision of the following service (*),",
        "Ordered on (*)/received on (*),",
        "Name of consumer(s),",
        "Address of consumer(s),",
        "Signature of consumer(s) (only if this form is notified on paper),",
        "Date.",
        "(*) Delete as appropriate.",
      ],
    },
    {
      number: "6",
      heading: "What we do then",
      body: [
        "Under § 56¹(1) we return everything you paid, without delay and no later than 14 days after we receive your withdrawal notice. That includes what you paid to have the item delivered to you: § 56¹(1) names the delivery costs you bore, not merely the price. Under § 56¹(4) we do it by the same means of payment you used, unless you expressly ask for another. There is no fee for withdrawing.",
        "§ 56¹(3) would let us keep back part of the postage, but only in a case that cannot arise here: it applies where a buyer expressly chose a delivery method other than the cheapest ordinary one the trader offered, and caps the refund at what the ordinary one would have cost. We offer one method. There is nothing dearer for you to have chosen, so the whole of the postage comes back.",
        "Where an order contained a printed item, § 56¹(5) lets us hold the repayment back until you have returned the item to us or shown us that you have sent it, whichever happens first. It is a right the statute gives for goods and for nothing else, so nothing is ever held back on a certificate — there is nothing to send. The same subsection removes the right from a trader who has agreed to collect the item, and we have not agreed to collect it.",
        "Where all three conditions in §3 are met, there is nothing to return on a withdrawal from the certificate. That follows from what you consented to, having been told what you were consenting to, and it does not touch §7, which is a different right and survives it.",
        "Where they are not all met, § 56²(7) says you owe us nothing for what was supplied to you during the period. You do not pay for having had the certificate while you thought about it.",
        "§ 56²(8) closes the list: what we may claim from you because you withdrew is limited to what §6.1 sets out and to the § 56¹(3) case above. There is nothing else to pay, and no term of ours could add anything, because § 56²(9) makes void any term that makes withdrawing harder.",
      ],
    },
    {
      number: "6.1",
      heading: "Sending a printed item back",
      body: [
        "This section is about printed items. A certificate is not sent back to anybody.",
        "Under § 56²(1) you send the item to us without delay and no later than 14 days after you told us you were withdrawing. You have met that deadline if you have sent it within the 14 days, even if it reaches us later — the same rule as for the notice itself.",
        "It goes to {merchantLegalName}, {merchantAddress}, which is the address in the Imprint. Write to {merchantEmail} first if you would rather tell us it is coming.",
        "You pay the direct cost of sending it back. § 56²(3) puts that cost on you only where we told you about it beforehand, and § 54(1) p 14 is the duty to tell you: this paragraph is us doing that. If we had not, § 54(8) and the second sentence of § 56²(3) would mean you did not have to pay it at all.",
        "You are welcome to handle a printed item as you could handle it in a shop — to see what it is, what it is like, and whether it works. Under § 56²(4) you answer for a loss in value only where you went further than that. And if we ever failed the duties in § 54(1) p 12 and p 13, to tell you the right exists and to give you the form, the last sentence of § 56²(4) says you answer for no loss in value at all.",
        "One thing you should know because it is true rather than because it helps us: our printer makes each item after you order it and does not take them back, so a returned item comes to us and is not sold to anybody else. That is our problem and not a reason for you to keep something you do not want.",
      ],
    },
    {
      number: "7",
      heading: "If what you received is not what was described",
      body: [
        "Your rights when a purchase does not conform to the contract are separate from withdrawal, and nothing above affects them. This is the reminder § 54(1) p 18 requires, and it covers a printed item as much as the certificate. An agreement reached before you notify us that departs from these rules to your detriment is void — § 62²²(1) for the certificate, § 237(1) for a printed item.",
        "The two are governed by different divisions of the Act, and this document cites each to its own rather than borrowing one for both. The plan for this row got that wrong before the row corrected it: § 62¹¹ is about digital content and digital services, and a mug is neither.",
        "For the certificate: under § 62¹⁴(1) you may require us to bring it into conformity, where that is possible and does not cost us unreasonably. Under § 62¹⁴(3) you may instead reduce the price or terminate the contract: where bringing it into conformity is impossible or unreasonably costly, where we have not brought it into conformity, where the fault persists despite our attempt, where it is serious enough to justify going straight there, or where it is clear we will not fix it. Which of those you take is your choice, not ours. Termination under § 62¹⁴(5) needs the non-conformity to be more than minor, and the law presumes it is. Under § 62¹¹(1) we are liable for a non-conformity that existed at supply and appears within two years of it; under § 62¹²(2) one appearing within one year is presumed to have existed then, and under § 62¹²(1) it is for us to prove the certificate was supplied as § 62⁶ requires, not merely that it was supplied.",
        "For a printed item: under § 218(2) we are liable for a non-conformity appearing within two years of the item being handed over to you, and under § 218(2²) one that appears within the first year is presumed to have been there at handover, unless that would sit badly with the nature of the item or of the fault. Under § 222(1) you may require repair or replacement, and under § 222(2¹) we may decline only where neither is possible or where it would cost us disproportionately. Under § 223(1) you may terminate on any of five grounds — we did not finish the repair or replacement, we refused it, the fault is still there after we tried, it is serious enough to go straight there, or it is clear we will not put it right in reasonable time without significant inconvenience to you. Which you take is your choice again, not ours.",
        "One duty there runs against you, so it is stated rather than left out: under § 220(1) you must tell us about a fault in a printed item within two months of learning of it.",
        "Write to {merchantEmail} and we will put it right.",
        "A certificate that confers nothing is not us falling short of that: it is what this site describes and what you chose to buy. Whether that description also takes it outside the objective requirements of § 62⁷(3) p 2 is a different question, and § 62¹⁰ answers it only where you were told specifically about the deviation and agreed to it expressly and separately when the contract was concluded. The checkout asks you for one thing, the consent in §4. So we do not treat worthlessness as removing anything in this section from you.",
        "That whole paragraph is about the certificate. It has nothing to say about a printed item: a shirt is meant to be a shirt, and if what arrives is not one, the goods limb above is your answer.",
      ],
    },
    {
      number: "8",
      heading: "Complaints and disputes",
      body: [
        "Write to {merchantEmail} first.",
        "If we cannot resolve it between us, a consumer may put the matter to the Consumer Disputes Committee (tarbijavaidluste komisjon) at the Consumer Protection and Technical Regulatory Authority, Endla 10A, 10122 Tallinn, avaldus@komisjon.ee, +372 620 1700.",
        "The Committee ordinarily takes disputes worth at least 30 euros. A certificate on its own costs less than that, so it would not reach the threshold. An order of printed goods, with the postage, may well be above it. Which yours is depends on what you ordered, and we would rather say that than tell you the route is closed when it may not be — the sentence here used to say every item sold was below the threshold, and that stopped being true when the shop began selling things in boxes.",
        "A consumer resident in another European Union country may also approach the European Consumer Centre network, and the courts remain open to you wherever you live.",
      ],
    },
  ],
};
