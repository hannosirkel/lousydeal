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
 * **No clause here describes a mechanism that does not exist.** This said
 * "Four clauses describe mechanisms that do not exist yet" and listed them so
 * they could be counted, which is what makes the list checkable now that LD-02
 * has closed every one:
 *
 *   §5  the order confirmation and the email address it goes to. C3b added the
 *       field, C9 built the message, and C10 and C11 gave both deployments a
 *       transport and credentials. The clause states the act now, and the
 *       timing, because the timing is what the third condition turns on.
 *   §6  its reliance on that confirmation. Sending it makes § 53(4) p 7¹'s
 *       third condition *capable* of being met; §6 says why that is not the
 *       same as it having been met.
 *   §7  the entry-side inscription filter — C3c's checkout fields, sharing
 *       `src/lib/inscription.ts` with the render-side filter character for
 *       character.
 *   §6  the cross-reference to Refunds and Withdrawal, V10's route.
 *
 * A fifth would need adding here and to `tests/legal-terms.test.ts`, which
 * counts them. The list is kept rather than deleted because a document that
 * once described four absent things is worth being able to prove no longer
 * does.
 *
 * **V10's Gate D corrected two clauses here**, because a row that finds a
 * neighbouring document wrong owns the correction:
 *
 *   §5  said the certificate "is shown to you, and a confirmation is sent",
 *       which puts the confirmation after supply. § 55(1) requires it no later
 *       than the moment supply begins, and Refunds §4 said so first. A
 *       confirmation that arrives late does not satisfy the third condition of
 *       § 53(4) p 7¹, so the ordering is the whole of the clause's effect.
 *   §4  did not disclose that the consent is a condition of ordering. The
 *       harsher term was stated only in Refunds, which is the document a buyer
 *       is less likely to reach.
 *
 * Nothing here may outlive an unpublished site: §23's gate precedes
 * publication and this document does not close it.
 *
 * **§8 is gifting, and G7 is the row that wrote it.** This said "gifting is not
 * mentioned … the row that builds gifting writes its clause", which was right
 * while LD-03 had no backend. It has one now, so the clause is here and the
 * sections after it moved down by one.
 *
 * Its one job is to say who holds what. The buyer is the consumer and keeps
 * every right including the 14 days; the recipient has a certificate and no
 * contract. A clause that let a reader think otherwise would be worse than the
 * silence it replaces.
 *
 * **Merch was on the "not yet" list and LD-04 took it off.** `legal-terms`
 * banned the word "t-shirt" here, for the same reason it once banned gifting:
 * a term about a feature nobody can use is noise a lawyer has to read. P10
 * inverts that guard rather than deleting it — the claim it protected is now
 * false, and a guard asserting a false thing is worse than none. What the
 * document has to carry instead:
 *
 *   §2  that two kinds of thing are sold, and that the worthlessness clauses
 *       are about one of them. A mug is worth what a mug is worth.
 *   §3  postage, which is the one charge added after the offer page; and the
 *       import duty a customs authority outside the EU may levy, which
 *       § 54(1) p 6 requires be flagged even though the amount is unknowable.
 *       **The Article 59c sentence is gone, and Gate D is why.** It rested
 *       the certificate's Estonian rate on being *below* that threshold —
 *       a simplification decision `013` surrendered by registering for the
 *       Union OSS on 2026-09-09, which is destination-rate taxation by
 *       definition. One sentence now covers both kinds of thing, because
 *       after `013` there is only one rule: your rate, our return.
 *   §4  that conclusion and supply coincide for the certificate and cannot for
 *       a thing that does not exist yet.
 *   §5  the § 209(6) thirty-day outside limit, and **§ 209(4) with § 214(2)**:
 *       in a consumer sale the handover is complete when the parcel reaches
 *       the buyer, so it travels at our risk. The tempting clause — risk
 *       passing to the buyer on handover to the courier — is one the statute
 *       does not allow, and Printful's own terms pass risk to *us* at exactly
 *       that point, which is where the temptation comes from.
 *   §6  the § 56(1¹) clock, and that no § 53(4) exception reaches the goods.
 *   §12 the disputes threshold, which a shirt is above.
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
        "Two kinds of thing are sold here, and they are not alike.",
        "The first is a numbered digital certificate. You receive that and nothing else of value.",
        "That is the description of the product, not a limitation on it. The certificate confers no rights, no ownership, no entitlement, no membership, no service, no discount and no benefit of any kind, now or later. It is not an investment, it is not a security, and it cannot be redeemed for anything.",
        "Three variants are sold. They cost different amounts and they deliver the same thing. Paying more does not get you more.",
        "The second is printed goods: a shirt, a mug, a cap, a sticker, carrying the same joke as everything else here. Those are ordinary objects. They are worth what such objects are worth, they are made after you order them, and they are posted to you.",
        "Nothing in the paragraphs above about worthlessness is true of a printed item, and no clause below treats one as though it were. Where these terms say the certificate they mean the certificate; where they say a printed item they mean something that arrives in a parcel.",
      ],
    },
    {
      number: "3",
      heading: "Price and tax",
      body: [
        "Every price shown includes value added tax where value added tax applies. There is no tax line at checkout, no fee, and no charge you were not shown before you paid.",
        "For the certificate the price shown on the offer page is the price charged, and nothing whatever is added to it.",
        "A printed item has to be posted, so postage is the one thing that is added — and it is quoted and shown to you as its own line before you pay, never afterwards. The certificate is not posted and carries none.",
        "Value added tax follows where you are rather than where we are, for the certificate and for a printed item alike: a buyer in the European Union is charged their own country's rate, and we account for all of it in Estonia through a Union One Stop Shop return instead of registering in each country. The rate differs from one country to the next. The price you are shown does not: the tax is inside it, {merchantLegalName} bears it, and a buyer in Hungary and a buyer in Luxembourg pay the same figure for the same thing.",
        "If you are outside the European Union, the customs authority where you live may charge import duty or local tax on the parcel before it is released to you. That is charged by them, it is not ours to collect and not ours to keep, and we cannot tell you the amount in advance. § 54(1) p 6 of the Law of Obligations Act requires us to say that such a charge may fall due, and this is us saying it.",
      ],
    },
    {
      number: "4",
      heading: "How an order is made",
      body: [
        "Displaying an item on this site is an invitation to order, not an offer. Your order is an offer to buy. We accept it when your payment succeeds, and the contract is concluded at that moment.",
        "For the certificate that is also the moment supply begins under §5, because there is nothing to prepare and nothing to send. For a printed item it is not: the item does not exist yet when the contract is concluded, and §5 says what happens next.",
        "Before you pay, you are shown what you are buying, the total you will be charged including any postage, and the consent described in §6. That box is not ticked for you, and it is a condition of ordering: without it we cannot supply the certificate immediately, and the order does not proceed. Payment is processed by Stripe Payments Europe, Ltd. We do not receive or store your card details.",
      ],
    },
    {
      number: "5",
      heading: "Delivery",
      body: [
        "The certificate is digital content supplied immediately after payment: it is shown to you as soon as you have paid, at the moment §4 says the contract is concluded. There is nothing to ship and there is no delivery charge.",
        "You view it in a web browser. There is no account to create, no software to install, no file to download and no technical protection measure applied to it: a web browser is the whole of what you need. It is not interoperable with anything, because there is nothing for it to work with.",
        "We owe you a confirmation on a durable medium no later than the moment supply begins. § 55(1) sets that timing, and we send it: an email goes out as soon as your certificate exists, carrying what § 55(2) requires it to carry.",
        "Because supply here is the certificate existing, that email follows supply by moments rather than preceding it. §6 says what we do about that.",
        "A printed item is made after you order it and sent to the address you gave. We do not promise a date. § 209(6) sets the outside limit where no date is agreed, and it binds us: without delay, and no later than 30 days after the contract is concluded. If it is going to take longer than that, we will tell you and you may treat the contract as at an end.",
        "The parcel travels at our risk, not yours. Under § 209(4) our obligation to hand the item over is discharged when it reaches your possession — not when we hand it to a courier — and under § 214(2) the risk of loss or damage passes to you at the same moment. So if it does not arrive, or arrives broken, that is ours to put right. Write to {merchantEmail}.",
        "For a printed item § 55(1) sets a later deadline for the same confirmation than it does for the certificate: no later than the item is delivered to you. The email goes out when you order, so it is comfortably inside it.",
      ],
    },
    {
      number: "6",
      heading: "Your right of withdrawal",
      body: [
        "Under § 56(1) of the Estonian Law of Obligations Act (võlaõigusseadus), a consumer may withdraw from a distance contract within 14 days without giving a reason.",
        "When those 14 days begin depends on what you bought. For the certificate § 56(1³) starts them the day the contract is concluded. For a printed item § 56(1¹) starts them the day it reaches you, and where an order arrives as more than one parcel, the day the last of them does. In a mixed order the two run separately.",
        "§ 53(4) p 7¹ of that Act removes the right for digital content not supplied on a physical medium, but only where supply began before the withdrawal period ended, you gave express prior consent to it beginning and acknowledged that you would thereby lose the right, and we gave you the confirmation required by § 55(1) and § 55(2) of the Act.",
        "That point reaches the certificate and reaches nothing in a parcel. No exception on the § 53(4) list covers a printed item sold here: the two that come closest, p 2 and p 3, are about things made for your personal needs or to conditions you supplied, and these are fixed designs picked from a list. Your 14 days on a printed item run in full, and the consent box has no effect on them.",
        "The checkout asks for that consent, with the box unticked, and we do send that confirmation. Whether all three conditions were met for your order is a question of fact, and the third turns on timing: on this site supply begins the instant your payment succeeds, and the confirmation follows it.",
        "We do not answer that question in our own favour. If you tell us you are withdrawing, we will not refuse on the ground that § 53(4) p 7¹ has removed your right. This is set out in full in Refunds and Withdrawal, which states rights you have rather than rights we grant.",
        "If we did not tell you about the right of withdrawal, its time limit and how to use it, § 56(1⁶) extends the period to 12 months after the ordinary 14 days; and if we tell you late but within those 12 months, you have 14 days from being told.",
        "The withdrawal button § 56⁴ requires is in the footer below, called Withdraw from a contract, at /legal/withdraw.",
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
      heading: "Buying one as a gift",
      body: [
        "You may have the certificate sent to somebody else. The checkout asks for their email address, and optionally their name, a name for you and a short message. We send them one message with the certificate in it and we do not write to them again.",
        "The contract is still yours. You are the consumer, you paid, and every right in §6 above is yours and not theirs — including the 14 days. The recipient has a certificate; you have the contract. If you withdraw, we settle it with you.",
        "The recipient's name and address are never printed on the certificate and are never published. The two fields that do appear are the ones you fill in about the certificate itself, and the checkout says which is which before you pay.",
        "By giving us somebody else's address you are telling us that you may. We have no way to check, and they receive nothing from us beyond that one message, but it goes out because you asked for it.",
        "Your message to them is filtered the way §7's inscription is, and for a sharper reason: it is text we send to an address on somebody else's say-so. Links, domain names, email addresses and telephone numbers are removed.",
      ],
    },
    {
      number: "9",
      heading: "Availability and changes",
      body: [
        "We may change what is offered, and we may change these terms. A change applies to orders placed after it is published and never to an order already placed. The date at the foot of this document is when it last changed.",
      ],
    },
    {
      number: "10",
      heading: "Our liability",
      body: [
        "We are liable to you as Estonian law requires. Nothing in these terms limits our liability for intentional or grossly negligent conduct, for death or personal injury, or for anything else that cannot be limited by law.",
        "In all other cases, our liability for a breach of these terms is limited to the amount you paid for the order concerned. That limit does not apply to any liability arising otherwise than under these terms, including liability under Article 82 of the General Data Protection Regulation.",
      ],
    },
    {
      number: "11",
      heading: "Governing law",
      body: [
        "Estonian law governs these terms. If you are a consumer, that does not deprive you of the protection of the mandatory rules of the country where you live.",
      ],
    },
    {
      number: "12",
      heading: "Complaints and disputes",
      body: [
        "Write to {merchantEmail} first. We would rather hear it than not.",
        "If we cannot resolve it between us, a consumer may put the matter to the Consumer Disputes Committee (tarbijavaidluste komisjon) at the Consumer Protection and Technical Regulatory Authority, Endla 10A, 10122 Tallinn, avaldus@komisjon.ee, +372 620 1700.",
        "You should know before you write: the Committee ordinarily takes disputes worth at least 30 euros. A certificate on its own costs less than that and would not reach it. An order of printed goods, with the postage, may be above it. Which yours is depends on what you ordered, and we are telling you because a route that will not carry your claim is worse than no route at all — and because this clause used to say every item sold here cost less, which stopped being true when the shop began posting things.",
        "A consumer resident in another European Union country may also approach the European Consumer Centre network, and the courts remain open to you wherever you live.",
      ],
    },
  ],
};
