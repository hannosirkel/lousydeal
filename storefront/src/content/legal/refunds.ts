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
      ],
    },
    {
      number: "2",
      heading: "Your right to withdraw",
      body: [
        "Under § 56(1) of the Estonian Law of Obligations Act (võlaõigusseadus), a consumer may withdraw from a contract concluded at a distance within 14 days, without giving any reason.",
        "Because a certificate is digital content not supplied on a physical medium, § 56(1³) starts those 14 days on the day the contract is concluded — the day you order, not the day you read this.",
        "If we failed to tell you that the right exists, how long you have and how to use it, § 56(1⁶) gives you 12 months on top of the 14 days; and if we tell you late but inside those 12 months, you have 14 days from being told.",
        "That right is given to you by law. {merchantLegalName} does not grant it and cannot take it away: § 62 makes void any agreement that departs from these provisions to your detriment, and § 56²(9) makes void any term that hinders you from exercising the right.",
      ],
    },
    {
      number: "3",
      heading: "When that right does not apply",
      body: [
        "§ 53(4) p 7¹ removes the right of withdrawal for digital content that is not supplied on a physical medium. It does so only where all three of the following are true.",
        "First, supply began before the withdrawal period ended. Second, you gave express prior consent to it beginning, and acknowledged that you would thereby lose the right. Third, we gave you the confirmation required by § 55(1) and § 55(2).",
        "If any one of those is missing, your 14-day right stands. As things are today the third is missing for every order, for the reason §4 gives, and so the right stands whatever you answered at checkout.",
        "The corresponding European provision is Article 16(m) of Directive 2011/83/EU.",
      ],
    },
    {
      number: "4",
      heading: "What the checkout asks, and what we owe you afterwards",
      body: [
        "Before you pay, the checkout asks you to tick a box that is not ticked for you: that you request supply of the digital certificate to begin immediately, and that you acknowledge you will lose your right of withdrawal once supply has begun. It is a condition of ordering. If you do not tick it we cannot supply immediately, and the order does not proceed.",
        "If you do tick it, we owe you a confirmation on a durable medium, no later than the moment supply begins. § 55(1) sets that timing, and § 55(2) sets its contents: the pre-contractual information listed in § 54(1), unless we already gave it to you on a durable medium before the contract was concluded, and our confirmation that you gave the consent described above.",
        "We do not send that confirmation yet. Until we do, the third condition in §3 is not met for any order placed here, and your right under §2 is intact. We would rather write that down than let you infer from a clause about us that you had lost something you still have.",
      ],
    },
    {
      number: "5",
      heading: "How to withdraw",
      body: [
        "Tell us within 14 days. Write to {merchantEmail}. You do not have to give a reason.",
        "§ 56(2²) gives you two routes and prefers neither: the model withdrawal form, which is set out below, or any other unequivocal statement that you are withdrawing. An email saying so in your own words is as good as the form.",
        "Your notice is in time if you send it within the 14 days, even if it reaches us afterwards: that is § 56(2¹). Under § 56(2⁵) it is for you to show that you withdrew, so keep what you sent. If you ever send a withdrawal notice through this website, § 56(2⁴) obliges us to confirm we received it, on a durable medium, at once.",
        "Since 1 September 2026, § 56⁴ has required a trader who concludes contracts through an online interface to provide a withdrawal button marked „Taganen lepingust”, highlighted and reachable throughout the withdrawal period, with a confirmation control and a receipt on a durable medium. This site does not have one. When it opens for business without one, that is our failure and not a restriction on you: the routes above are open, and nothing here makes withdrawal harder than the law allows.",
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
        "Under § 56¹(1) we return everything you paid, without delay and no later than 14 days after we receive your withdrawal notice. Under § 56¹(4) we do it by the same means of payment you used, unless you expressly ask for another. There is no fee for withdrawing.",
        "Where all three conditions in §3 are met, there is nothing to return on a withdrawal. That follows from what you consented to, having been told what you were consenting to, and it does not touch §7, which is a different right and survives it.",
        "Where they are not all met, § 56²(7) says you owe us nothing for what was supplied to you during the period. You do not pay for having had the certificate while you thought about it.",
      ],
    },
    {
      number: "7",
      heading: "If what you received is not what was described",
      body: [
        "Your rights when a purchase does not conform to the contract are separate from withdrawal, and nothing above affects them. This is the reminder § 54(1) p 18 requires, and § 62²²(1) makes void any agreement reached before you notify us that departs from these rules to your detriment.",
        "Under § 62¹⁴(1) you may require us to bring the certificate into conformity, where that is possible and does not cost us unreasonably. Under § 62¹⁴(3) you may instead reduce the price or terminate the contract: where bringing it into conformity is impossible or unreasonably costly, where we have not brought it into conformity, where the fault persists despite our attempt, where it is serious enough to justify going straight there, or where it is clear we will not fix it. Which of those you take is your choice, not ours. Termination under § 62¹⁴(5) needs the non-conformity to be more than minor, and the law presumes it is.",
        "Under § 62¹¹(1) we are liable for a non-conformity that existed at supply and appears within two years of it. Under § 62¹²(2), a non-conformity appearing within one year is presumed to have existed at supply, and under § 62¹²(1) it is for us to prove the certificate was supplied as § 62⁶ requires, not merely that it was supplied.",
        "Write to {merchantEmail} and we will put it right.",
        "A certificate that confers nothing is not us falling short of that: it is what this site describes and what you chose to buy. Whether that description also takes it outside the objective requirements of § 62⁷(3) p 2 is a different question, and § 62¹⁰ answers it only where you were told specifically about the deviation and agreed to it expressly and separately when the contract was concluded. The checkout asks you for one thing, the consent in §4. So we do not treat worthlessness as removing anything in this section from you.",
      ],
    },
    {
      number: "8",
      heading: "Complaints and disputes",
      body: [
        "Write to {merchantEmail} first.",
        "If we cannot resolve it between us, a consumer may put the matter to the Consumer Disputes Committee (tarbijavaidluste komisjon) at the Consumer Protection and Technical Regulatory Authority, Endla 10A, 10122 Tallinn, avaldus@komisjon.ee, +372 620 1700. The Committee ordinarily takes disputes worth at least 30 euros, which is more than anything sold here costs.",
        "A consumer resident in another European Union country may also approach the European Consumer Centre network, and the courts remain open to you wherever you live.",
      ],
    },
  ],
};
