/**
 * The tier page's copy, per `docs/current/brand.md` §4.
 *
 * In a content file for the reason decision `004` gives about the trader line:
 * copy the operator or a lawyer will want to change should be changeable by
 * editing content. No price appears here — every figure is formatted from what
 * the Store API returned.
 */

export const DEAL_DOCUMENT = {
  title: "Quotation",
  form: "Form LD-2",
  revision: "Rev. 2026-09",
} as const;

/**
 * The same four labels and the same return figure the home page's offer block
 * uses — re-exported, not restated. `brand.md` §2 requires the same word for
 * the same thing on every page, and two copies of a figure drift: editing
 * `OFFER_RETURN` would have changed the home page and silently not this one.
 */
export { OFFER_LABELS as DEAL_LABELS, OFFER_RETURN } from "./home";

export const UPGRADES_TITLE = "Upgrades available";

/** `brand.md` §4 gives this line verbatim. It is the joke, stated as a fact. */
export const UPGRADES_LINE = "Pay more. Receive the same.";

/** Shown in place of the upgrade list on the most expensive tier. */
export const NO_UPGRADES_LINE = "This is the worst deal available. There is nothing further to pay for.";

/**
 * The withdrawal notice, worded against the statute rather than around it.
 *
 * VÕS § 53(4) p 7¹ removes the 14-day right of § 56(1) only where supply began
 * on the buyer's express prior consent **and** acknowledgement, **and** the
 * trader gave the § 55(1)–(2) confirmation on a durable medium. The checkout
 * collects the first; LD-02's order email is the second. So this says what the
 * checkout will ask, and does not report a right as already lost.
 *
 * **"thereby lose" was still too flat**, and V10's Gate D caught it as the
 * third surface saying the opposite of what Refunds §3 says. It is the surface
 * a buyer reads *before* paying, which makes it the worst of the three to be
 * wrong on. The conditional is the statute's own, and the missing confirmation
 * is stated rather than left for a reader to discover two documents later.
 *
 * `brand.md` §4 has this linking to Refunds & Withdrawal. V12 adds the link;
 * naming the document is the most this can do until then.
 */
export const WITHDRAWAL_NOTICE =
  "This is digital content supplied immediately. At checkout you are asked to consent to supply beginning at once, and to acknowledge that you would thereby lose the 14-day right of withdrawal. The box is not ticked for you. Losing that right also takes a confirmation we do not yet send, so today it survives the box. Refunds and Withdrawal sets out why.";
