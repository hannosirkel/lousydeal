/**
 * The order confirmation's words.
 *
 * **This is the document the publication gate has been waiting on.** VÕS
 * § 53(4) p 7¹ removes the right of withdrawal for digital content only where
 * three conditions are met, and the third is the trader's § 55(1)–(2)
 * confirmation on a durable medium. Until this exists, every order keeps a
 * 14-day right whatever the buyer ticked, and four documents on the site say
 * so.
 *
 * ## What § 55(2) actually requires
 *
 * The confirmation must carry "the information referred to in § 54(1)" unless
 * the trader already gave that information on a durable medium before the
 * contract was concluded. A web page is not a durable medium — that is the
 * whole reason this email exists — so the information is reproduced here
 * rather than linked. A link to `/legal/terms` would be the trader saying
 * "the information is somewhere you can reach", which is what § 54(1) asks
 * for *before* the contract and not what § 55(2) asks for after it.
 *
 * So the sections below are not a receipt with a courtesy paragraph. Each one
 * discharges a numbered duty, and the section headings say which.
 *
 * ## What is deliberately not claimed
 *
 * **It does not say the right of withdrawal is gone.** Sending this
 * confirmation is what makes the third condition capable of being met, but
 * whether it was met for a given order depends on the consent having been
 * given *before* supply began and on this arriving no later than the moment
 * supply began. The email states what happened and lets the reader draw the
 * conclusion; a sentence asserting the right had lapsed would be the trader
 * deciding a question in its own favour.
 *
 * ## The model form
 *
 * §5.1 of the site's Refunds and Withdrawal document carries the same lines,
 * and `tests/order-confirmation.test.ts` asserts the two are identical.
 * Directive 2011/83/EU Annex I(B) fixes the wording; two copies of a statutory
 * text that disagree is worse than either.
 */

/** The subject line. The serial, because a buyer with two certificates needs to tell the emails apart. */
export const CONFIRMATION_SUBJECT = (serial: string): string => `Your lousy deal ${serial}`;

export const CONFIRMATION_HEADINGS = {
  opening: "Your order",
  what: "What you bought",
  paid: "What you paid",
  trader: "Who you bought it from",
  withdrawal: "Your right of withdrawal",
  consent: "What you agreed to at checkout",
  form: "The model withdrawal form",
  complaints: "If something is wrong",
} as const;

export const CONFIRMATION_LABELS = {
  serial: "Certificate",
  item: "Item",
  total: "Total paid",
  issued: "Issued",
  certificate: "Your certificate",
} as const;

/**
 * The opening. It says what this email is, in the terms the law uses, because
 * a buyer who later wants to exercise a right needs to recognise the document
 * that carries it.
 */
/**
 * One line, added to `What you bought` when the order was a gift. G4.
 *
 * **The confirmation gains a line and loses none.** § 55(2) requires the
 * § 54(1) information and the consent recital whatever the order was for; a
 * confirmation that became a gift message because the buyer ticked a box would
 * breach it. So this sits inside the existing section rather than replacing
 * anything.
 *
 * **It names the address, because that is what the buyer can still act on.**
 * A mistyped recipient is the one error this email can catch in time, and
 * "sent to the recipient" would not let them notice. The address is the
 * buyer's own input being read back to them, not new personal data disclosed
 * to a third party — they typed it.
 */
export const CONFIRMATION_GIFT = (recipientAddress: string): string =>
  `You bought this as a gift. The certificate has been sent to ${recipientAddress}, with your message if you wrote one. Your own right of withdrawal is unaffected and is set out below — the recipient has the certificate, and you have the contract.`;

export const CONFIRMATION_OPENING =
  "This is the confirmation of your order, on a durable medium, that § 55 of the Estonian Law of Obligations Act requires us to send you. Keep it: it is the record of what you bought and of the rights you have.";

/**
 * § 54(1) p 4: the main characteristics of what was supplied.
 *
 * **Said of the certificate, and only of the certificate.** Gate D found this
 * asserting "nothing else of value" on the durable record of an order that
 * also contained a mug — which is worth what a mug is worth, as Terms §2 now
 * says. {@link CONFIRMATION_ALSO_POSTED} is the additive half.
 */
export const CONFIRMATION_WHAT =
  "A numbered digital certificate, and nothing else of value. It confers no rights, no ownership, no entitlement, no membership, no service, no discount and no benefit of any kind, now or later. It is not an investment, it is not a security, and it cannot be redeemed for anything. You view it in a web browser: there is no account, no software to install, no file to download, and no technical protection measure applied to it.";

/**
 * The printed goods, where there were any.
 *
 * Additive, the way `CONFIRMATION_GIFT` is: § 55(2) requires the § 54(1)
 * information about the whole order, so this joins the section rather than
 * replacing what is said about the certificate.
 */
export const CONFIRMATION_ALSO_POSTED =
  "This order also contained printed goods, listed in your order summary. Those are ordinary objects: they are worth what such objects are worth, they were made after you ordered them, and they are posted to the address you gave. Nothing above about worthlessness is true of them.";

/**
 * § 54(1) p 6: the total price including taxes.
 *
 * **"Nothing was added at checkout" was false for a parcel**, which Gate D
 * found — postage is added, and Terms §3 was corrected for exactly this a row
 * earlier while the durable record kept the old sentence.
 */
export const CONFIRMATION_PAID = (hasPostedGoods: boolean, hasSurcharge: boolean): string => {
  if (hasSurcharge) {
    return hasPostedGoods
      ? "Every price shown was the price charged, and it includes value added tax where value added tax applies. Postage and the code increase were added, and each was quoted and shown to you as its own line before you paid. There was no tax line or charge you were not shown first."
      : "The price shown was the price charged. It includes value added tax where value added tax applies. The code increase was added, quoted and shown to you as its own line before you paid. There was no tax line or charge you were not shown first.";
  }

  return hasPostedGoods
    ? "Every price shown was the price charged, and it includes value added tax where value added tax applies. Postage was the one thing added, and it was quoted and shown to you as its own line before you paid. There was no tax line, no fee, and no charge you were not shown first."
    : "The price shown was the price charged. It includes value added tax where value added tax applies, and nothing was added at checkout: no tax line, no fee, and no charge you were not shown before you paid.";
};

/**
 * § 54(1) pp 12 and 13: the conditions, the time limit and the procedure for
 * withdrawal, and the § 56⁴ button.
 *
 * **It states the third condition as a fact about this order**, because that is
 * what the buyer needs and what the site's own documents already say. The
 * `{ }` placeholders are resolved against the trader identity.
 */
export const CONFIRMATION_WITHDRAWAL = (hasPostedGoods: boolean): readonly string[] => [
  hasPostedGoods
    ? // **Two clocks, and Gate D found this stating only one.** § 56(1¹) runs
      // a printed item's period from physical possession — p 1 from the last
      // parcel where an order arrives in several — and § 56(1³) runs the
      // certificate's from conclusion. Stating only the second on the durable
      // record understates the buyer's right on the document they keep, which
      // is the failure this shop least wants to make.
      "Under § 56(1) of the Law of Obligations Act you may withdraw from a distance contract within 14 days, without giving a reason. When those days start depends on what you ordered. For the certificate, § 56(1³) starts them the day the contract was concluded, which for this order is the day of this email. For a printed item, § 56(1¹) starts them the day it reaches you — and where an order arrives as more than one parcel, the day the last of them does."
    : "Under § 56(1) of the Law of Obligations Act you may withdraw from a distance contract within 14 days, without giving a reason. The period runs from the day the contract was concluded, which for this order is the day of this email.",
  "§ 53(4) p 7¹ removes that right for digital content not supplied on a physical medium, but only where all three of these are true: supply began before the period ended, you gave express prior consent to it beginning and acknowledged that you would thereby lose the right, and we gave you the confirmation § 55(1) and § 55(2) require. This email is that confirmation.",
  "To withdraw, use the button at {siteBaseUrl}/legal/withdraw, or tell us in any unambiguous way — the form below is one, and you are not obliged to use it. Write to {merchantEmail} if you would rather.",
  "If we return anything to you, § 56¹(1) gives us 14 days from receiving your notice and § 56¹(4) requires us to use the same means of payment you did, unless you expressly ask otherwise. There is no fee for withdrawing.",
  // § 54(1) p 14, and § 56²(3) makes the cost shift *conditional* on having
  // said it. Refunds §6.1 discharges it and the checkout repeats it; a durable
  // record that omitted it would be the one document a dispute reads.
  ...(hasPostedGoods
    ? [
        "If you withdraw from a printed item you send it back within 14 days of telling us, and you pay the direct cost of doing so — § 54(1) p 14 requires us to say that, and this is us saying it. We return the price and the postage you paid. Send it to the address above.",
      ]
    : []),
];

/**
 * § 53(4) p 7¹'s consent, recorded as it was given.
 *
 * A confirmation that asserted the buyer had consented without saying what to
 * would be the trader's account of the buyer's state of mind. This reproduces
 * the box.
 */
export const CONFIRMATION_CONSENT = (hasPostedGoods: boolean): readonly string[] => [
  "Before paying, you ticked a box that was not ticked for you. It read:",
  // **Quoted, and Gate D found the quotation wrong.** The box has said "for
  // that certificate" since P10c, which added those words precisely so no
  // buyer could read it as waiving anything about a mug. This reproduced the
  // unscoped sentence — the durable record claiming the buyer signed a wider
  // waiver than the one they were shown. `confirmation-consent.test.ts` reads
  // the storefront's own constant and compares.
  "I request that supply of the digital certificate begin immediately, and I acknowledge that I will lose my right of withdrawal for that certificate once supply has begun.",
  "Supply began when the certificate was issued, which is the moment your payment succeeded.",
  ...(hasPostedGoods
    ? [
        "That box was about the certificate and nothing else. It has no effect on the printed goods in this order: § 53(4) p 7¹ reaches only digital content not supplied on a physical medium, and no exception on that list covers them.",
      ]
    : []),
];

/**
 * Annex I(B) to Directive 2011/83/EU, reproduced.
 *
 * § 54(1) p 13 requires the trader to *give* the form rather than mention it.
 * These lines are identical to §5.1 of the site's Refunds and Withdrawal
 * document, and a test asserts it — the wording is statutory and two copies
 * that disagree is worse than either.
 */
export const CONFIRMATION_FORM_INTRO = "Complete and return this form only if you wish to withdraw from the contract.";

export const CONFIRMATION_FORM_LINES = [
  "To {merchantLegalName}, {merchantAddress}, {merchantEmail}:",
  "I/We (*) hereby give notice that I/We (*) withdraw from my/our (*) contract of sale of the following goods (*)/for the provision of the following service (*),",
  "Ordered on (*)/received on (*),",
  "Name of consumer(s),",
  "Address of consumer(s),",
  "Signature of consumer(s) (only if this form is notified on paper),",
  "Date.",
  "(*) Delete as appropriate.",
] as const;

/** § 54(1) p 18 and § 62¹⁴: where a complaint goes, and the limit the buyer should know before writing. */
export const CONFIRMATION_COMPLAINTS = [
  "Write to {merchantEmail} first. We would rather hear it than not.",
  "If we cannot resolve it between us, a consumer may put the matter to the Consumer Disputes Committee (tarbijavaidluste komisjon) at the Consumer Protection and Technical Regulatory Authority, Endla 10A, 10122 Tallinn, avaldus@komisjon.ee, +372 620 1700. You should know before you write that the Committee ordinarily takes disputes worth at least 30 euros. A certificate on its own costs less than that; an order of printed goods, with the postage, may be more. Which yours is depends on what you ordered.",
  "A consumer resident in another European Union country may also approach the European Consumer Centre network, and the courts remain open to you wherever you live.",
] as const;

/** § 54(1) pp 2 and 3, and Directive 2000/31/EC Art 5(1)(d) and (g): who the trader is and how to reach them. */
export const CONFIRMATION_TRADER = [
  "{merchantLegalName}, a private limited company entered in the Estonian commercial register (äriregister) under registry code {merchantRegistryCode}.",
  "{merchantAddress}",
  "{merchantEmail} · {merchantPhoneNumber}",
  "VAT number {merchantVatNumber}",
] as const;
