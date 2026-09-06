/**
 * The four legal documents, as one list.
 *
 * **It sits beside `content/legal/` rather than inside it.**
 * `no-unresolved-placeholder.test.ts` walks that directory and requires every
 * file in it to export a legal document, which is the guard that catches a
 * document hiding in a subdirectory. A routing table is not a document, so
 * putting it there would have meant loosening the walk to admit one exception
 * -- and an exception is how the next document hides.
 *
 * **Everything that points at a legal document reads this.** The footer's LEGAL
 * column, the `/legal` index and the tier page's withdrawal link all take their
 * routes and labels from here, so a fifth document is added by adding a row and
 * a renamed route cannot leave one surface pointing at a 404 while the others
 * move. `tests/legal-routes.test.ts` checks each `href` against the files under
 * `src/app`, which is the half a content file cannot guarantee about itself.
 *
 * **The order is the order a reader needs them**, not alphabetical: what you
 * agreed to, how to undo it, the button that undoes it, what we do with your
 * data, and who we are.
 *
 * The labels are `brand.md` §4's, which names the column's four entries. They
 * are sentence case because §2 sets the register for everything that is not a
 * label or a stamp, and a link is neither.
 *
 * **"Privacy" here is deliberate and is not the document's title.** §4 names
 * the footer entry `Privacy`; §5 calls the document itself `Privacy Policy`.
 * A link label and a document title are allowed to differ -- the column has
 * four entries and a width -- so this follows §4 for the link and leaves the
 * title to the document.
 */

/** One legal document, as every surface that links to it needs it. */
export interface LegalRoute {
  /** The path under `src/app`, and what a link's `href` must be. */
  readonly href: string;
  /** What a link to it says. */
  readonly label: string;
  /** One line for the `/legal` index, so the list is more than four words. */
  readonly summary: string;
}

export const LEGAL_ROUTES: readonly LegalRoute[] = [
  {
    href: "/legal/terms",
    label: "Terms of service",
    summary: "What you are buying, what it costs, and what governs the sale.",
  },
  {
    href: "/legal/refunds",
    label: "Refunds and withdrawal",
    summary: "Your 14-day right to withdraw, when it applies, and how to use it.",
  },
  {
    href: "/legal/privacy",
    label: "Privacy",
    summary: "What this site collects, who else handles it, and for how long.",
  },
  {
    href: "/legal/withdraw",
    label: "Withdraw from a contract",
    summary: "The § 56⁴ withdrawal button, reachable from every page for the whole period.",
  },
  {
    href: "/legal/imprint",
    label: "Imprint",
    summary: "Who operates this site, and how to reach a person here.",
  },
];

/** `brand.md` §4's three-column footer. The third column is the trader line. */
export const FOOTER_COLUMNS = {
  legal: "Legal",
  company: "Company",
} as const;

/** The `/legal` index itself, which is a document like the others. */
export const LEGAL_INDEX = {
  title: "Legal",
  form: "Form LD-L",
  revision: "Rev. 2026-09",
  intro:
    "Four documents. The first two decide what you can do about a purchase, and the second two say who you bought from and what became of your data.",
} as const;

/**
 * The tier page's link to the withdrawal document, which `brand.md` §4 gives
 * its notice.
 *
 * It is here rather than in `deal.ts` because it is the same route the footer
 * uses, and a second copy of `/legal/refunds` is the thing this file exists to
 * prevent. **It also has a legal effect**: § 54(1) p 12 requires the conditions,
 * the time limit and the procedure for withdrawal to be given before the
 * contract is concluded, and § 56(1⁶) runs the period to 12 months instead of
 * 14 days where that duty was breached. Until this row, nothing on the site
 * linked the document at all.
 */
export const WITHDRAWAL_ROUTE: LegalRoute = (() => {
  const found = LEGAL_ROUTES.find((route) => route.href === "/legal/refunds");
  // Looked up rather than indexed: `LEGAL_ROUTES[1]` is correct until someone
  // reorders the list, and reordering it is a reasonable thing to do.
  if (found === undefined) throw new Error("the withdrawal document is missing from LEGAL_ROUTES");
  return found;
})();
