/**
 * Refunds and Withdrawal.
 *
 * Every provision cited here was read from the consolidated text at
 * `https://www.riigiteataja.ee/public-api/api/v1/akt/106072023116/blob-html`
 * — Riigi Teataja's ordinary URLs serve a JavaScript shell rather than the
 * statute, which is why that path is recorded and not the pretty one.
 *
 *   § 56(1)    14 days, distance contract, no reason needed
 *   § 56(2¹)   sending the notice inside the period is enough
 *   § 56(2²)   the model form, or any other unequivocal statement
 *   § 56(2³)   the model form is set by ministerial regulation
 *   § 56(2⁵)   the consumer bears the burden of proving withdrawal
 *   § 53(4) p 7¹  the digital-content exception, and its three conditions
 *   § 55(1)–(2)   the confirmation on a durable medium, and what it must say
 *   § 62       a term deviating from this division to the consumer's
 *              detriment is void
 *
 * **The statutory paragraphs carry no flourish.** `brand.md` §5 allows one in
 * a recital and nowhere that changes meaning; a withdrawal clause is the
 * clearest case of nowhere.
 *
 * **There is no `NO REFUNDS` stamp on this page**, though the plan permits one
 * below the consent explanation. Whether the sentence is true depends on
 * whether all three conditions were met for a particular reader, and a static
 * page cannot know. A stamp that is true for some readers and false for others
 * is the misleading §23 forbids, and this document is the last place to make
 * a claim that only usually holds.
 *
 * **§4 describes an email that does not exist yet.** It is LD-02's, and it is
 * the third condition — so until it ships, §3's answer for every buyer is that
 * the right stands. That is stated on the page rather than left implicit.
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
        "Under § 56(1) of the Estonian Law of Obligations Act (võlaõigusseadus), you may withdraw from a contract concluded at a distance within 14 days, without giving any reason.",
        "That right is given to you by law. {merchantLegalName} does not grant it and cannot take it away: § 62 of the same Act makes void any agreement that departs from these provisions to your detriment.",
      ],
    },
    {
      number: "3",
      heading: "When that right does not apply",
      body: [
        "§ 53(4) p 7¹ removes the right of withdrawal for digital content that is not supplied on a physical medium. It does so only where all three of the following are true.",
        "First, supply began before the withdrawal period ended. Second, you gave express prior consent to it beginning, and acknowledged that you would thereby lose the right. Third, we gave you the confirmation required by § 55(1) and § 55(2) of the Act.",
        "If any one of those is missing, your 14-day right stands. It stands in particular if we did not send you the confirmation described in §4, whatever you consented to at checkout.",
        "The corresponding European provision is Article 16(m) of Directive 2011/83/EU.",
      ],
    },
    {
      number: "4",
      heading: "What the checkout asks, and what we owe you afterwards",
      body: [
        "Before you pay, the checkout asks you to tick a box that is not ticked for you: that you request supply of the certificate to begin immediately, and that you acknowledge you will lose your right of withdrawal once supply has begun. You do not have to tick it, and if you do not, we cannot supply immediately and the order does not proceed.",
        "If you do tick it, we owe you a confirmation on a durable medium, no later than when supply begins, stating that you gave that consent. § 55(1) and § 55(2) require it and § 53(4) p 7¹ depends on it. We send it by email. Keep it: it is the document that decides which of §2 and §3 applies to you.",
      ],
    },
    {
      number: "5",
      heading: "How to withdraw",
      body: [
        "Where your right has not been excluded under §3, tell us within 14 days. Write to {merchantEmail}.",
        "You may use the model withdrawal form established by ministerial regulation under § 56(2³), or say it in any other unequivocal way — § 56(2²) gives you both, and neither is better than the other. You do not have to give a reason.",
        "Your notice is in time if you send it within the 14 days, even if it reaches us afterwards: that is § 56(2¹). Under § 56(2⁵) it is for you to show that you withdrew, so keep what you sent.",
      ],
    },
    {
      number: "6",
      heading: "What we do then",
      body: [
        "We refund everything you paid, without undue delay and no later than 14 days after we receive your notice, by the same means of payment you used, and at no cost to you.",
        "Where §3 applies in full, the sale is final and there is nothing to refund. That is a consequence of what you consented to, having been told what you were consenting to, and it is the only circumstance in which we will say no.",
      ],
    },
    {
      number: "7",
      heading: "If what you received is not what was described",
      body: [
        "Your rights when a purchase does not conform to the contract are separate from withdrawal, and nothing above affects them. If the certificate was not delivered, is not reachable, or is not what this site described, write to {merchantEmail} and we will put it right or refund you.",
        "A certificate being worth nothing is not a defect. It is the specification, it is stated on every page that sells one, and it is the thing you were buying.",
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
