/**
 * The § 56⁴ withdrawal function, as copy.
 *
 * In force since 01.09.2026: a trader who concludes contracts through an
 * online interface must let the consumer withdraw using a **withdrawal
 * button**, highlighted and marked "Taganen lepingust" or wording just as
 * unambiguous; permanently and easily reachable throughout the withdrawal
 * period; leading to a form that takes the consumer's name, details
 * identifying the contract, and an electronic address for the receipt; and a
 * **confirmation button** marked "Kinnitan taganemise". § 54(1) p 13¹ makes
 * the button's existence and location pre-contractual information.
 *
 * **The site is in English, so the labels are.** The statute names the two
 * Estonian phrases and then admits "või mõne muu samasuguse ühemõttelise ja
 * kergesti loetava tekstiga" — any other unambiguous, easily legible wording.
 * The Estonian is kept in parentheses so a reader looking for the statutory
 * phrase finds it.
 *
 * **C14 sends the § 56⁴(4) receipt.** This said "what this cannot do is send
 * the § 56⁴(4) receipt", which was true while there was no mail; C9 through
 * C11 gave both deployments a transport, and the confirmation control now
 * posts to `POST /store/withdrawals`, which acknowledges on a durable medium.
 *
 * The page still renders the statement, the date and the time, and still tells
 * the buyer to keep it. That is not redundant with the email: § 56(2⁵) puts
 * the burden of proving withdrawal on the consumer, and two records they hold
 * are better than one — particularly when one of them depends on our mail
 * server.
 *
 * **Which is why there are three closing wordings and not one.** The receipt
 * can be sent, or the withdrawal received and the receipt not sent, or the
 * request not have reached us at all. § 56(2¹) makes the withdrawal effective
 * when the consumer sent it in every one of those cases, so none of the three
 * may suggest it failed — but only the first may claim a receipt exists.
 */

export const WITHDRAWAL_DOCUMENT = {
  title: "Withdraw from a contract",
  form: "Form LD-W",
  revision: "Rev. 2026-09",
} as const;

export const WITHDRAWAL_INTRO = [
  "This is the withdrawal function § 56⁴ of the Law of Obligations Act requires. Use it to withdraw from a purchase within 14 days, or write to us in any other unequivocal way — § 56(2²) gives both equal standing.",
  "You do not have to give a reason, and nothing on this page asks you for one.",
] as const;

export const WITHDRAWAL_FIELDS = {
  name: { name: "consumerName", label: "Your name" },
  contract: { name: "contractDetails", label: "Which purchase (order number, or the date and what you bought)" },
  contact: { name: "contactAddress", label: "Email address for our confirmation" },
} as const;

/** § 56⁴(1): the button's own words. */
export const WITHDRAWAL_BUTTON_LABEL = "I withdraw from the contract (Taganen lepingust)";

/** § 56⁴(3): the second control, which is what actually transmits it. */
export const WITHDRAWAL_CONFIRM_LABEL = "I confirm the withdrawal (Kinnitan taganemise)";

export const WITHDRAWAL_CONFIRM_INTRO =
  "Check it, then confirm. Nothing has been sent yet.";

export const WITHDRAWAL_DONE_TITLE = "Withdrawal recorded";

export const WITHDRAWAL_DONE_LINES = [
  "Keep this page. Under § 56(2⁵) it is for you to show that you withdrew, and this is a record of it — print it, or save it as a PDF from your browser.",
  "Your withdrawal takes effect from the moment you sent it, not the moment we read it: § 56(2¹) makes a notice timely if it was sent inside the 14 days.",
] as const;

/**
 * Which of the three things happened, named rather than inferred.
 *
 * The action puts one of these in the URL and the page reads it. They are
 * values in a query string, so they are stable words rather than prose.
 */
export const WITHDRAWAL_RECORD_STATES = {
  /** Received, and the § 56⁴(4) receipt is on its way. */
  sent: "sent",
  /** Received by us, but the receipt could not be sent. */
  received: "received",
  /** The request did not reach us. Effective anyway — § 56(2¹). */
  unrecorded: "unrecorded",
} as const;

/**
 * The closing line for each state.
 *
 * **None of them says the withdrawal failed**, because under § 56(2¹) none of
 * them did: the notice was sent. What differs is what *we* can be said to
 * hold, and the third is the one that has to be honest about holding nothing.
 */
export const WITHDRAWAL_RECORD_LINES = {
  sent: "We have sent a confirmation to the address above, as § 56⁴(4) requires. If it has not arrived in a few minutes, check the spam folder and then write to us.",
  received: "We received this, and § 56⁴(4) says we owe you a confirmation by email. Ours did not go out just now, so this page is the record until it does — keep it, and write to us if you would rather have the confirmation in your hand.",
  unrecorded: "We could not reach our own system to record this, so we may not hold it. Your withdrawal still counts — § 56(2¹) fixes it at the moment you sent it, and this page is your evidence of that — but please also write to us so a person sees it.",
} as const;

/** The label on every page that has to say where the button is — § 54(1) p 13¹. */
export const WITHDRAWAL_ROUTE_LABEL = "Withdraw from a contract";
