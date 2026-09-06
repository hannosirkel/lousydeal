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
 * **What this cannot do is send the § 56⁴(4) receipt.** That needs email,
 * which is LD-02's, so the confirmation page renders the statement, the date
 * and the time and tells the buyer to keep it — and says plainly that we will
 * confirm by email once we can. § 56(2⁵) puts the burden of proving withdrawal
 * on the consumer, so a page they can save is worth more to them than a
 * reassurance they cannot keep.
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
  "Keep this page. Under § 56(2⁵) it is for you to show that you withdrew, and this is the record of it — print it, or save it as a PDF from your browser.",
  "Your withdrawal takes effect from the moment you sent it, not the moment we read it: § 56(2¹) makes a notice timely if it was sent inside the 14 days.",
  "We do not yet send a confirmation by email, though § 56(2⁴) says we should. Until we do, this page is the confirmation, and writing to us is what gets a person to answer.",
] as const;

/** The label on every page that has to say where the button is — § 54(1) p 13¹. */
export const WITHDRAWAL_ROUTE_LABEL = "Withdraw from a contract";
