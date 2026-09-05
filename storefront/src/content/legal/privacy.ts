/**
 * The Privacy Policy.
 *
 * **Every claim here was measured against this repository, not written from a
 * template.** That mattered more than usual: the first survey of the data flows
 * was run against a checkout ten commits behind `main` and reported that the
 * certificate, the inscription filter and five routes did not exist. What is
 * described below was re-checked at `cbc248f`.
 *
 * What the measurement found, and why the document is short:
 *
 *   one cookie      `lousydeal_cart_id` -- httpOnly, secure, sameSite lax, and
 *                   no `maxAge`, so it ends with the browser session
 *                   (`src/lib/store-session.ts`)
 *   two fields      a country `<select>` and the consent checkbox
 *                   (`src/app/checkout/PaymentForm.tsx`). That is the whole of
 *                   what this site's own code receives from a visitor.
 *   no email        `grep -rni email src/` finds no input and no request body
 *                   carrying one. LD-02 is not built.
 *   no analytics    no pixel, no beacon, no error reporter; the storefront's
 *                   dependencies are Stripe, Next and React and nothing else.
 *                   Medusa telemetry is off at `backend/Dockerfile`.
 *   no third party  on any page except `/checkout`. Every other route is a
 *                   Server Component making one in-cluster call.
 *
 * **So there is no consent banner and this document does not pretend there
 * is.** Nothing here runs on consent, because nothing here is optional
 * measurement. A cookie notice would be theatre.
 *
 * **Three things are disclosed that a template would have missed**, each
 * verified in the installed code rather than assumed:
 *
 *   §3  Stripe's `advancedFraudSignals`. `loadStripe` is called without
 *       `setLoadParameters`, so device fingerprinting is on by default on the
 *       payment page. It is the closest thing to tracking on this site.
 *   §4  the payment record. `@medusajs/payment-stripe` retrieves the
 *       PaymentIntent with `expand: ["payment_method"]` and Medusa writes the
 *       result into `payment.data`. So billing details a buyer typed into
 *       Stripe's own frame land in this site's database, having never passed
 *       through its code.
 *   §2  the request log. Medusa installs morgan, `LOG_LEVEL` is set nowhere so
 *       it defaults to `http`, and `trust proxy` is on -- an IP address, user
 *       agent, referrer and path for every request.
 *
 * **No cookie table.** `brand.md` §5's document is sections of prose, and
 * plepic's four-row table earns its shape by having four rows. One cookie is a
 * sentence. The type is not extended for it.
 *
 * **Retention is stated as the law's period, not as a mechanism that exists.**
 * Nothing in either repository deletes or ages out anything; the only expiry
 * that runs today is the cart cookie ending with the session. The seven-year
 * accounting period is a real obligation and nothing has yet reached it, so
 * §7 states it -- and the missing deletion is a build item in the plan's gate
 * list rather than a promise made here.
 *
 * **The log retention period is stated as a criterion, which Article 13(2)(a)
 * permits.** Nothing in these repositories ships or archives those logs, but
 * the platform they run on is a third repository outside this work, so naming a
 * number would be asserting something not established. That too is in the gate
 * list.
 */

import type { LegalDocument } from "./types";

export const PRIVACY: LegalDocument = {
  title: "Privacy",
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
      heading: "When you are only looking",
      body: [
        "This site sets one cookie. It is called lousydeal_cart_id, it holds an opaque identifier for your basket and nothing else, and it ends when you close your browser. It is strictly necessary: without it the cart and the checkout have no way to find what you put in them. There is nothing to consent to and so you are not asked.",
        "There is no analytics here. No measurement, no advertising pixel, no error reporter, no third-party font and no content delivery network. The payment page loads Stripe, because that is what taking a card payment consists of; apart from it, this site is rendered on our own server and fetches nothing from anywhere else.",
        "The service that runs the shop records a line for each request it receives: your IP address, the identifier your browser sends about itself, the page you came from if your browser sent one, the page you asked for, and how long it took. This is the ordinary operating log of a web service and it is what lets us see that the site is working and being attacked. It is not sent to anyone and it is not used to build a picture of you.",
      ],
    },
    {
      number: "3",
      heading: "When you buy something",
      body: [
        "The checkout asks you for two things: the country you are in, and the consent described in Refunds and Withdrawal. That is everything this site's own code receives from you. We do not ask for your name, your address, your telephone number or your email address, and there is nowhere on this site to type them.",
        "Your card details go to Stripe and never to us. They are typed into a frame that Stripe serves and controls, and the payment is confirmed by your browser talking to Stripe directly.",
        "Stripe's script also collects signals about the device and browser you are paying from, which it uses to detect fraud. That happens on the payment page only, it is Stripe's own processing, and it is part of what taking a card payment safely consists of.",
      ],
    },
    {
      number: "4",
      heading: "What an order leaves behind",
      body: [
        "An order record holds its number, what you bought, what you paid, the currency, the country you selected, and the time. There is no name and no email address on it, because we never asked for either.",
        "It also holds what Stripe tells us about the payment. That record is stored as Stripe returns it, and it can include the brand of your card, its last four digits, its expiry, and any billing details you gave Stripe in its own frame — details that reach our database without ever passing through this site's code. We do not use them for anything except reconciling the payment, and they are not shown to anyone.",
      ],
    },
    {
      number: "5",
      heading: "Who else handles your data",
      body: [
        "These are the companies that handle data when you use this site, and this is all of them.",
        "Stripe processes payments, holds the payment record, and performs the fraud checks described in §3.",
        "Cloudflare provides this site's DNS and the connection through which it is reached, and gates the administrative interface. It therefore sees the address your request comes from.",
        "Backblaze holds our encrypted database backups. Everything sent there is encrypted before it leaves our server.",
        "There is no other third party. We do not sell data, we do not share it for anyone's advertising, and no company named here may use it for its own purposes beyond the service it provides us.",
      ],
    },
    {
      number: "6",
      heading: "Where it is, and what leaves the European Economic Area",
      body: [
        "Your data is processed in the European Economic Area. The servers that run this shop, its database and its backups are all within it.",
        "Stripe and Cloudflare are United States companies, and using them means some data is processed in the United States. Each participates in the EU–US Data Privacy Framework, and standard contractual clauses apply where it does not cover a transfer.",
      ],
    },
    {
      number: "7",
      heading: "On what basis, and for how long",
      body: [
        "Taking your order and giving you what you paid for is performance of a contract. Keeping the accounting record is a legal obligation. Operating and defending the site, and checking that a payment is not fraudulent, are our legitimate interests. Nothing on this site runs on consent, which is why nothing on it asks you for any.",
        "The cart cookie ends with your browser session.",
        "Estonian accounting law requires us to keep the record of an order for seven years from the end of the financial year it falls in, and we keep it no longer than that.",
        "The request log described in §2 is kept for as long as it is useful for operating and defending the site, and it is not archived or handed to anyone.",
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
