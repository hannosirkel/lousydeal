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

/** The same four labels the home page's offer block uses. */
export const DEAL_LABELS = {
  item: "Item",
  price: "Price",
  value: "Value",
  return: "Return",
} as const;

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
 * `brand.md` §4 has this linking to Refunds & Withdrawal. That route arrives
 * with V10 and V12 adds the link; a link that 404s is worse than an absent one.
 */
export const WITHDRAWAL_NOTICE =
  "This is digital content supplied immediately. At checkout you are asked to consent to supply beginning at once, and to acknowledge that you thereby lose the 14-day right of withdrawal. The box is not ticked for you.";
