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
        "Our own services record a line for each request they handle: what was asked for, whether it worked, and how long it took. Those lines do not carry your address. The shop's interior is reached only through this site's own server, so the address in them is that server's, and it is the same for everyone. They are kept for 30 days and then discarded, and they are not sent to anyone.",
        "Your own address is seen by Cloudflare, which is how this site reaches you at all. §5 says what that means.",
      ],
    },
    {
      number: "3",
      heading: "When you buy something",
      body: [
        "Our own code asks you for two things: the country you are in, and the consent described in Refunds and Withdrawal. Nothing else we have written asks you for anything.",
        "The payment itself happens inside a frame that Stripe serves and controls, which we place on our checkout page. Stripe decides what that frame asks for. Today it asks for your card details, and depending on how you pay it may also ask for your name, your email address, your telephone number or a billing address — and if you pay with Apple Pay, Google Pay or Link, those services hand Stripe what they hold about you. None of it is typed into anything we wrote, and none of it reaches us except as §4 describes.",
        "Stripe's script also collects signals about the device and browser you are paying from. It uses them to judge whether a payment is fraudulent, and that judgement is made automatically: a payment can be declined by it without a person looking. If that happens to you and you think it is wrong, write to {merchantEmail} and a person will look.",
        "You do not have to give any of this. It is what a card payment requires, so if you would rather not, the consequence is simply that you cannot buy anything here. Nothing else on the site is affected.",
      ],
    },
    {
      number: "4",
      heading: "What an order leaves behind",
      body: [
        "An order record holds its number, what you bought, what you paid, the currency, the country you selected, and the time. There is no name and no email address on it, because our own code never asked for either.",
        "It also holds what Stripe tells us about the payment. That record is stored as Stripe returns it, and it can include the brand of your card, its last four digits, its expiry, and any billing details Stripe collected in its own frame — details that reach our database without ever passing through this site's code. We use them only to reconcile the payment, and they are not shown to anyone.",
      ],
    },
    {
      number: "5",
      heading: "Who else handles your data",
      body: [
        "Two companies handle data when you use this site, and these are both of them.",
        "Stripe processes payments and holds the payment record. For that it acts on our instructions. For the fraud and regulatory checks described in §3 it acts for itself, deciding on its own account what to collect and what to conclude, and for those we are not the only one responsible. Its own privacy notice is at stripe.com/privacy and it governs that half.",
        "Cloudflare provides this site's DNS and the connection through which it is reached, and gates the administrative interface. It therefore sees the address each of your requests comes from. This is not optional: it is how the site is delivered at all.",
        "There is no other third party. We do not sell data, we share it for nobody's advertising, and no company is named here that is not in the path today.",
      ],
    },
    {
      number: "6",
      heading: "Where it is, and what leaves the European Economic Area",
      body: [
        "Your data is processed in the European Economic Area. The servers that run this shop and its database are within it.",
        "Stripe and Cloudflare are United States companies, and using them means some data is processed in the United States. Each participates in the EU–US Data Privacy Framework, and standard contractual clauses apply where it does not cover a transfer. Write to {merchantEmail} and we will send you a copy of the clauses we rely on.",
      ],
    },
    {
      number: "7",
      heading: "On what basis, and for how long",
      body: [
        "Taking your order and giving you what you paid for is performance of a contract. Keeping the accounting record is a legal obligation. Operating and defending the site, and checking that a payment is not fraudulent, are our legitimate interests and Stripe's. Nothing on this site runs on consent, which is why nothing on it asks you for any.",
        "The cart cookie ends with your browser session. Stripe's last 30 minutes and a year, as §2 says.",
        "Estonian accounting law requires us to keep the record of an order for seven years from the end of the financial year it falls in, and we keep it no longer than that. The payment details described in §4 are part of that record and are kept with it.",
        "The request lines described in §2 are kept for 30 days.",
        "If you write to us we keep the message and your address for two years after the last message in the conversation, so that we can find it again if you come back about the same order.",
      ],
    },
    {
      number: "8",
      heading: "Your rights",
      body: [
        "You may ask what we hold about you, ask for it to be corrected, ask for it to be deleted, ask us to stop or limit what we do with it, ask for a copy in a portable form, or object to processing we do on the basis of our legitimate interests. Write to {merchantEmail}.",
        "Because we hold no name and no email address, an order is identified by its number and by the payment behind it. If you ask us about an order, tell us which one, or we will not be able to find you in our own records.",
        "If you think we have got it wrong you may complain to your national data protection authority. In Estonia that is the Data Protection Inspectorate (Andmekaitse Inspektsioon), Tatari 39, 10134 Tallinn, info@aki.ee.",
      ],
    },
  ],
};
