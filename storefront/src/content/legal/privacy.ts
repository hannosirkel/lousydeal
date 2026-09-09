/**
 * The Privacy Policy.
 *
 * **Every claim here was measured against this repository and the platform
 * repository, at `de0fb6a`.** The row that first drafted it measured only this
 * one, and got three things wrong in the direction that matters.
 *
 * What V11's Gate D found, and what changed:
 *
 *   §2  **"This site sets one cookie" was false.** Stripe.js writes two more,
 *       first-party, on this site's own hostname: `__stripe_mid`, which takes
 *       the library's default lifetime of 365 days, and `__stripe_sid` at 30
 *       minutes. Read from `https://js.stripe.com/v3`: the writer defaults
 *       `expiresIn` to `31536e6` ms and the caller passes
 *       `domain: "." + document.location.hostname`. The plan's own row had said
 *       "the cart id **and Stripe's own**" and the draft dropped the second
 *       half. Three cookies are described now, and the consent question is put
 *       rather than answered by an inventory of one.
 *   §2  **the request log did not hold what the document said.** Medusa's
 *       morgan is installed and does log `client_ip` — but the store API is
 *       reached only through this site's own server, whose proxy forwards
 *       `content-type`, `accept` and `stripe-signature` and nothing else. With
 *       no `x-forwarded-for`, `req.ip` is the storefront pod's address, the
 *       referrer logs `-`, and the user-agent key is dropped entirely. The
 *       visitor's own address is Cloudflare's, which §5 already disclosed.
 *   §3  **"there is nowhere on this site to type them" was false**, and
 *       contradicted §4 two paragraphs later. `<PaymentElement>` overrides only
 *       `wallets`, so Stripe's default billing-details fields — name, email,
 *       phone, address — render inside an element this site mounts on its own
 *       checkout page.
 *   §5  **Backblaze was named as a current processor and holds nothing.** The
 *       platform repository's backup jobs are nine, and none is this shop.
 *       Naming it is exactly the defect this document avoided for Printful.
 *
 * **Stripe is not only a processor**, which §5 had implied by saying no named
 * company may use data for its own purposes. It is a processor for taking the
 * payment and an independent controller for fraud and regulatory checks — the
 * same processing §3 describes as "Stripe's own". Both are now stated, with a
 * route to Stripe's own notice.
 *
 * **Three Article 13 elements the first draft omitted** are now present:
 * 13(2)(e), whether providing the data is a requirement and what follows from
 * refusing; 13(2)(f), the automated decision Stripe's fraud check makes, which
 * is live because it can decline a payment; and 13(1)(f)'s means of obtaining
 * a copy of the transfer safeguards.
 *
 * **No cookie table.** `brand.md` §5's document is sections of prose, and one
 * table earns its shape at four rows. Three cookies with different owners and
 * different reasons read better as three sentences than as a grid.
 *
 * **LD-04 P11 added a third recipient, and two sentences here were false the
 * moment P7 shipped an address field.** §5 said "Two companies handle data when
 * you use this site, and these are both of them", and §4 said "There is no name
 * on it, because our own code never asks for one". The checkout asks for a
 * delivery name now.
 *
 * **The Data Privacy Framework claim is the one this row would have got wrong
 * from memory.** Stripe and Cloudflare both participate, so the natural edit is
 * to add Printful to that sentence. **Printful does not participate**: its
 * certification was withdrawn in 2021 and the Framework's own list records it
 * inactive, which was checked against `dataprivacyframework.gov` rather than
 * against Printful's marketing. Its transfers rest on the 2021 standard
 * contractual clauses alone, and §7 says so separately from the sentence about
 * the other two.
 *
 * **Where the carriers are, the document declines to take a position.**
 * Printful's data processing terms do not classify a carrier — not as a
 * sub-processor, not as an independent controller. Silence. So §5 says what a
 * carrier receives and why, and says plainly that Printful's terms do not
 * settle the relationship, rather than picking the answer that reads better.
 *
 * **What Printful actually receives today is less than a reader would assume**,
 * and §5 says which: the delivery address goes with the shipping quote, without
 * a name, while the buyer is still typing. The order does not go at all —
 * `fulfilment-provider.ts`'s `createFulfillment` is deliberately inert and P8
 * is the row that places the order. `third-party-disclosure.test.ts` holds the
 * document to that: **the sentence and the stub have to change together.**
 *
 * **Retention states periods, not mechanisms that exist.** Nothing in either
 * repository deletes or ages out an order; the only expiries that run are the
 * cookies and the platform's 30-day log window. The seven-year accounting
 * obligation is real and nothing has reached it, so §7 states it — and the
 * missing deletion job is a gate item rather than a promise made here.
 */

import type { LegalDocument } from "./types";

export const PRIVACY: LegalDocument = {
  // `brand.md` §5 names the document "Privacy Policy". §4 names the footer
  // entry "Privacy", which is the link's label and not this.
  title: "Privacy policy",
  form: "Form LD-P",
  revision: "Rev. 2026-09",
  updated: "2026-09-05",
  sections: [
    {
      number: "1",
      heading: "Who is responsible",
      body: [
        "The controller is {merchantLegalName}, {merchantAddress}, registry code {merchantRegistryCode}.",
        "Write to {merchantEmail} about anything in this document and a person will read it.",
      ],
    },
    {
      number: "2",
      heading: "Cookies, and what is recorded when you visit",
      body: [
        "Three cookies can be set on this site. One is ours and two are Stripe's, and the two are set only if you go to the payment page.",
        "Ours is called lousydeal_cart_id. It holds an opaque identifier for your basket and nothing else, and it ends when you close your browser. Without it the cart and the checkout have no way to find what you put in them.",
        "Stripe's are called __stripe_mid and __stripe_sid. They are set by Stripe's script under this site's own domain, and they identify the browser you are paying from so that Stripe can tell an ordinary payment from a fraudulent one. __stripe_sid lasts 30 minutes. __stripe_mid lasts a year, which makes it the longest-lived thing this site puts on your machine.",
        "We do not ask you to consent to any of the three. For ours that is straightforward: a basket that cannot be found is not a shop. For Stripe's two we take the view that identifying the device is part of accepting a card payment safely rather than something separate we do to you, and they are set only when you reach the page where a payment happens. If you never go there, they are never set.",
        "There is no analytics here. No measurement, no advertising pixel, no error reporter of our own, no third-party font and no content delivery network. The payment page loads Stripe, because that is what taking a card payment consists of; apart from it, this site is rendered on our own server and fetches nothing from anywhere else.",
        "Printful, which §5 describes, is not an exception to that. Your browser never contacts it. Everything that goes to Printful goes from our own server, so it sets nothing on your machine and sees nothing of you beyond what we send it.",
        "Our own services record a line for each request they handle: what was asked for, whether it worked, and how long it took. Those lines do not carry your address. The shop's interior is reached only through this site's own server, so the address in them is that server's, and it is the same for everyone. They are kept for 30 days and then discarded, and they are not sent to anyone.",
        "Your own address is seen by Cloudflare, which is how this site reaches you at all. §5 says what that means.",
      ],
    },
    {
      number: "3",
      heading: "When you buy something",
      body: [
        "Our own code asks you for three things: your email address, the country you are in, and the consent described in Refunds and Withdrawal. If your order contains something that has to be posted, it asks for a fourth: where to send it.",
        "That fourth is a delivery name, a street, a town, a postcode, and in a few countries a state or province. It is asked for only when there is a parcel, and a certificate is never a parcel. None of it is printed on a certificate and none of it is published. §4 says what happens to it and §5 says who else sees it.",
        "The email address is where the order confirmation we owe you goes, and we send it: § 55(1) requires that confirmation on a durable medium, and an email is one. Sending it is a legal obligation rather than anything you consented to, which is why §7 lists it there and nothing here asks for consent. §4 says what happens to the address and §7 how long it is kept.",
        "The payment itself happens inside a frame that Stripe serves and controls, which we place on our checkout page. Stripe decides what that frame asks for. Today it asks for your card details, and depending on how you pay it may also ask for your name, your email address, your telephone number or a billing address — and if you pay with Apple Pay, Google Pay or Link, those services hand Stripe what they hold about you. None of it is typed into anything we wrote, and none of it reaches us except as §4 describes.",
        "Stripe's script also collects signals about the device and browser you are paying from. It uses them to judge whether a payment is fraudulent, and that judgement is made automatically: a payment can be declined by it without a person looking. If that happens to you and you think it is wrong, write to {merchantEmail} and a person will look.",
        "If you buy it as a gift, the checkout also asks for the recipient's email address and optionally their name, a name for you, and a short message. We use the address to send them the certificate once, and we do not write to them again. §6 is addressed to them, and you should know that giving us somebody else's address is you telling us we may write to them.",
        "You do not have to give any of this. It is what a card payment requires, so if you would rather not, the consequence is simply that you cannot buy anything here. Nothing else on the site is affected.",
      ],
    },
    {
      number: "4",
      heading: "What an order leaves behind",
      body: [
        "An order record holds its number, what you bought, what you paid, the currency, the country you selected, the email address you gave, and the time. Where the order contained something to post, it also holds the delivery name and address you typed.",
        "This section used to say there was no name on an order at all, because our own code never asked for one. That was true until this shop began posting things and it is not true now. What is still true is narrower: we never ask for your billing name, and nothing here asks for a name except the one a parcel has to be addressed to.",
        "It also holds what Stripe tells us about the payment. That record is stored as Stripe returns it, and it can include the brand of your card, its last four digits, its expiry, and any billing details Stripe collected in its own frame — details that reach our database without ever passing through this site's code. We use them only to reconcile the payment, and they are not shown to anyone.",
      ],
    },
    {
      // **"There is no other third party" was checked, not assumed.** A fable
      // review on 2026-09-08 raised it against the gift message: that message
      // is the only processing of a recipient's address, and it leaves through
      // an SMTP submission host. If that host were operated by somebody else,
      // this sentence would be false about the one processor touching a person
      // who never gave us anything. The operator confirmed the host is
      // Aislopica OÜ's own machine, so no processor is involved and the
      // sentence stands. Recorded here because the next person to add a
      // sending path has to ask the same question.
      number: "5",
      heading: "Who else handles your data",
      body: [
        "Three companies handle data when you use this site, and these are all of them. A fourth kind of party — whoever carries a parcel — is described at the end of this section.",
        "Stripe processes payments and holds the payment record. For that it acts on our instructions. For the fraud and regulatory checks described in §3 it acts for itself, deciding on its own account what to collect and what to conclude, and for those we are not the only one responsible. Its own privacy notice is at stripe.com/privacy and it governs that half.",
        "Cloudflare provides this site's DNS and the connection through which it is reached, and gates the administrative interface. It therefore sees the address each of your requests comes from. This is not optional: it is how the site is delivered at all.",
        "Printful prints and posts anything physical you order. The company we contract with is Printful, Inc., a Delaware corporation; AS “Printful Latvia” is its representative in the European Union. It acts on our instructions, and its data processing terms say so and form part of the terms of service we accepted, so they bind it without anything having been signed separately. It may not sell what it receives, share it for anyone's advertising, or use it outside our arrangement, and it does not use it to market to you.",
        "One thing it does for itself rather than for us: it checks a recipient against the sanctions lists its own law obliges it to apply. That is its legal obligation and not our instruction, and it is here for the same reason §3 describes Stripe's fraud check — it is processing that happens to you and is not done on our behalf.",
        "While you are still filling the form in, the delivery address is sent to Printful to get a price for the parcel. Your name is not sent with it. That happens before you pay, and it happens whether or not you go on to pay, because the postage is quoted rather than guessed.",
        "When you pay for something that has to be posted, the order goes to Printful so the item can be made: the delivery name and address, and which items they are. Nothing else of yours goes with it — not your email address, not what you paid, and not the certificate or anything written on it.",
        "A parcel has to be carried by somebody, and a carrier is given what it needs to deliver it: the address, and a way to reach you if there is a problem at your door or at a customs desk. Which carrier that is depends on where the item was made and where it is going, and neither we nor you choose it.",
        "Printful's published terms do not say whether it treats a carrier as a company acting on its instructions or as one answering for itself. We are not going to state a position its own documents do not support, so what we tell you instead is what a carrier receives and why.",
        "There is no other third party. We do not sell data, we share it for nobody's advertising, and no company is named here that is not in the path today.",
      ],
    },
    {
      number: "6",
      heading: "If somebody sent you a certificate as a gift",
      body: [
        "This section is for you, not for the person who bought it. You did not buy anything, you have no contract with us, and you did not give us your address — the buyer typed it in.",
        "We hold your email address, and your name if they gave one. We used them to send you the certificate, once. You are not on a list, there is nothing to unsubscribe from, and we will not write to you again.",
        "We may do that because the buyer paid for you to have it. The regulation calls that a legitimate interest — ours in delivering what the buyer paid for, and yours in receiving it — and it is one you can object to. Article 14 of the GDPR is the rule for data we get from someone other than the person it is about, and it is why the message we sent you says where your address came from.",
        "Your address stays on the order record. Accounting law makes us keep the order for seven years — but it cares about the money, not about you, so if you ask us to remove your address from it we will, and the order stays.",
        "You can ask what we hold, have it corrected or deleted, or object. Write to {merchantEmail} and say which certificate it was — we have no account to look you up by. §9 lists the rest of your rights, and they are yours as much as the buyer's.",
      ],
    },
    {
      number: "7",
      heading: "Where it is, and what leaves the European Economic Area",
      body: [
        "Your data is processed in the European Economic Area. The servers that run this shop and its database are within it.",
        "Stripe and Cloudflare are United States companies, and using them means some data is processed in the United States. Each participates in the EU–US Data Privacy Framework, and standard contractual clauses apply where it does not cover a transfer.",
        "Printful is a United States company too, and it does not participate in that Framework. Its certification was withdrawn in 2021 and the Framework's own public list records it as inactive, so what covers those transfers is standard contractual clauses alone — the 2021 clauses, the controller-to-processor module between us and it, and the processor-to-processor module for anyone it engages.",
        "Printful also prints in more places than it is registered in. Its own facilities are in Latvia, Spain, the United Kingdom, the United States, Mexico and Canada, and it uses partner facilities in Brazil, Japan and Australia. Of those, only Latvia and Spain are inside the European Economic Area. Which one makes your item is decided by its system according to what you ordered and where it is going, and it is not a choice either of us gets to make — so we cannot promise you a parcel printed inside the Area, and we are not going to imply one.",
        "Write to {merchantEmail} and we will send you a copy of the clauses we rely on.",
      ],
    },
    {
      number: "8",
      heading: "On what basis, and for how long",
      body: [
        "Having a thing made and posted to you is performance of a contract, and the delivery name and address are what performing it takes: without them there is nowhere to send the parcel. Taking your order and giving you what you paid for is performance of a contract. Keeping the accounting record, and confirming your order to you on a durable medium, are legal obligations. Operating and defending the site, and checking that a payment is not fraudulent, are our legitimate interests and Stripe's. Nothing on this site runs on consent, which is why nothing on it asks you for any.",
        "Sending a gift certificate to the person a buyer named is our legitimate interest in delivering what they paid for, and theirs in receiving it — §6 says so to them directly. It is not consent either: the recipient was never asked, which is exactly why Article 14 applies rather than Article 13.",
        "The cart cookie ends with your browser session. Stripe's last 30 minutes and a year, as §2 says.",
        "Estonian accounting law requires us to keep the record of an order for seven years from the end of the financial year it falls in, and we keep it no longer than that. The payment details described in §4 are part of that record, and so is your email address; both are kept with it and for as long.",
        "A gift recipient's address and name sit on the same order record. The accounting law requires the order; it does not require knowing who the certificate went to. We keep those details so we can show, if the buyer disputes it, that we sent what they paid for — and we remove them if the recipient asks.",
        "The request lines described in §2 are kept for 30 days.",
        "Printful keeps what we send it for as long as our arrangement with it lasts, and afterwards for as long as its own legal obligations require. It publishes no fixed period for that and we are not going to invent one on its behalf. The order record here is kept as the paragraphs above describe, whatever Printful does with its copy.",
        "Cloudflare keeps its own record of the requests it carries, under its own retention and not ours. We do not control how long it holds them, and §5 says what it sees.",
        "If you write to us we keep the message and your address for two years after the last message in the conversation, so that we can find it again if you come back about the same order.",
      ],
    },
    {
      number: "9",
      heading: "Your rights",
      body: [
        "You may ask what we hold about you, ask for it to be corrected, ask for it to be deleted, ask us to stop or limit what we do with it, ask for a copy in a portable form, or object to processing we do on the basis of our legitimate interests. Write to {merchantEmail}.",
        "We hold no billing name — our own code never asks for one — so an order is identified by its number, by the email address you gave, and by the payment behind it. Where an order had something posted we also hold the delivery name you typed, and where somebody was sent a certificate as a gift we hold theirs; §4 and §6 say so. If you ask us about an order, write from that address or tell us which order it is, or we will not be able to find you in our own records.",
        "If you think we have got it wrong you may complain to your national data protection authority. In Estonia that is the Data Protection Inspectorate (Andmekaitse Inspektsioon), Tatari 39, 10134 Tallinn, info@aki.ee.",
      ],
    },
  ],
};
