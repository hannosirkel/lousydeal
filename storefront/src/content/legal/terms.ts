/**
 * The Terms of Service.
 *
 * Every factual claim is checked against this repository rather than written
 * from memory: the VAT reading is decision `009`, the inscription rules are
 * contract §5, the withdrawal position is VÕS § 56(1) and § 53(4) p 7¹ read
 * from Riigi Teataja, and the trader identity is §2b through decision `004`'s
 * resolver.
 *
 * **No price appears here.** Two reasons, and either would be enough. A price
 * written twice drifts, and the offer page's figures come from the Store API;
 * and `tests/store-cart.test.ts` forbids a currency literal anywhere under
 * `storefront/src`, which includes this file. So the terms say what governs a
 * price rather than what one is.
 *
 * **Four clauses describe mechanisms that do not exist yet.** Gate D found two
 * more than the first draft named, which is the argument for listing them
 * where they can be counted:
 *
 *   §5  the order confirmation, and the email address it is sent to — the
 *       checkout collects no email address today. Both are LD-02's.
 *   §6  its reliance on that confirmation, which is the third condition
 *       § 53(4) p 7¹ requires. Also LD-02's.
 *   §7  the entry-side inscription filter — LD-02's checkout field. The
 *       render-side filter the same clause describes does exist:
 *       `src/lib/inscription.ts`, shipped with the certificate.
 *   §6  the cross-reference to Refunds and Withdrawal, which is V10's route.
 *
 * Nothing here may outlive an unpublished site: §23's gate precedes
 * publication and this document does not close it.
 *
 * **Gifting is not mentioned.** LD-03 has no backend, and a term about a
 * feature nobody can use is noise a lawyer would have to read and a buyer
 * would have to disregard. The row that builds gifting writes its clause.
 */

import type { LegalDocument } from "./types";

export const TERMS: LegalDocument = {
  title: "Terms of service",
  form: "Form LD-T",
  revision: "Rev. 2026-09",
  updated: "2026-09-05",
  sections: [
    {
      number: "1",
      heading: "Who you are contracting with",
      body: [
        "These terms govern your purchase from {merchantLegalName}, a private limited company entered in the Estonian commercial register (äriregister) under registry code {merchantRegistryCode}, at {merchantAddress}. Our VAT number is {merchantVatNumber}.",
        "You can reach us at {merchantEmail}. Our full trader details are in the Imprint.",
      ],
    },
    {
      number: "2",
      heading: "What you are buying",
      body: [
        "You are buying a numbered digital certificate. You receive that and nothing else of value.",
        "That is the description of the product, not a limitation on it. The certificate confers no rights, no ownership, no entitlement, no membership, no service, no discount and no benefit of any kind, now or later. It is not an investment, it is not a security, and it cannot be redeemed for anything.",
        "Three variants are sold. They cost different amounts and they deliver the same thing. Paying more does not get you more.",
      ],
    },
    {
      number: "3",
      heading: "Price and tax",
      body: [
        "The price shown on the offer page is the price charged. It includes value added tax where value added tax applies, and nothing is added at checkout: no tax line, no fee, and no charge you were not shown before you paid.",
        "Where you are in the European Union, value added tax on this supply is currently accounted for in Estonia, because {merchantLegalName}'s cross-border supplies of this kind remain below the threshold in Article 59c of Directive 2006/112/EC. It is contained in the price rather than added to it, {merchantLegalName} bears it, and your total does not change because of where you are.",
      ],
    },
    {
      number: "4",
      heading: "How an order is made",
      body: [
        "Displaying an item on this site is an invitation to order, not an offer. Your order is an offer to buy, and the contract is concluded when we accept it by confirming your order.",
        "Before you pay, you are shown what you are buying, the total you will be charged, and the consent described in §6. Payment is processed by Stripe Payments Europe, Ltd. We do not receive or store your card details.",
      ],
    },
    {
      number: "5",
      heading: "Delivery",
      body: [
        "The certificate is digital content supplied immediately after payment: it is shown to you, and a confirmation is sent to the email address you gave. There is nothing to ship and there is no delivery charge.",
      ],
    },
    {
      number: "6",
      heading: "Your right of withdrawal",
      body: [
        "Under § 56(1) of the Estonian Law of Obligations Act (võlaõigusseadus), a consumer may withdraw from a distance contract within 14 days without giving a reason.",
        "§ 53(4) p 7¹ of that Act removes the right for digital content not supplied on a physical medium, but only where supply began before the withdrawal period ended, you gave express prior consent to it beginning and acknowledged that you would thereby lose the right, and we gave you the confirmation required by § 55(1) and § 55(2) of the Act.",
        "The checkout asks for that consent, with the box unticked, and we send that confirmation by email. If any of those conditions is not met, your 14-day right stands. This is set out in full in Refunds and Withdrawal, which states rights you have rather than rights we grant.",
      ],
    },
    {
      number: "7",
      heading: "What you may put on a certificate",
      body: [
        "A certificate never carries your billing name. It carries what you chose to type, which you were shown would be public before you paid.",
        "You must not submit anything unlawful, abusive, hateful, harassing, impersonating, or that discloses another person's identity or contact details.",
        "Markup, scripts, links, domain names, email addresses and telephone numbers are removed automatically, both when you submit them and each time a certificate is rendered. That is a mechanical filter against this site becoming a billboard or a means of reaching people who did not ask to be reached. It is not a judgement about what you wrote.",
        "We may remove, blank or further reduce an inscription at any time. Doing so does not cancel your certificate, does not change its number, and does not entitle you to a refund.",
      ],
    },
    {
      number: "8",
      heading: "Availability and changes",
      body: [
        "We may change what is offered, and we may change these terms. A change applies to orders placed after it is published and never to an order already placed. The date at the foot of this document is when it last changed.",
      ],
    },
    {
      number: "9",
      heading: "Our liability",
      body: [
        "We are liable to you as Estonian law requires. Nothing in these terms limits our liability for intentional or grossly negligent conduct, for death or personal injury, or for anything else that cannot be limited by law.",
        "In all other cases, our liability for a breach of these terms is limited to the amount you paid for the order concerned. That limit does not apply to any liability arising otherwise than under these terms, including liability under Article 82 of the General Data Protection Regulation.",
      ],
    },
    {
      number: "10",
      heading: "Governing law",
      body: [
        "Estonian law governs these terms. If you are a consumer, that does not deprive you of the protection of the mandatory rules of the country where you live.",
      ],
    },
    {
      number: "11",
      heading: "Complaints and disputes",
      body: [
        "Write to {merchantEmail} first. We would rather hear it than not.",
        "If we cannot resolve it between us, a consumer may put the matter to the Consumer Disputes Committee (tarbijavaidluste komisjon) at the Consumer Protection and Technical Regulatory Authority, Endla 10A, 10122 Tallinn, avaldus@komisjon.ee, +372 620 1700.",
        "You should know before you write: the Committee ordinarily takes disputes worth at least 30 euros, and every item sold here costs less than that. We are telling you because a route that will not carry your claim is worse than no route at all.",
        "A consumer resident in another European Union country may also approach the European Consumer Centre network, and the courts remain open to you wherever you live.",
      ],
    },
  ],
};
