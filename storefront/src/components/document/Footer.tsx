/**
 * The footer `brand.md` §4 specifies: three columns — LEGAL, COMPANY, and the
 * fine-print trader line resolved from runtime configuration.
 *
 * **V2 shipped the trader line and deferred the rest, correctly**: the LEGAL
 * column's four links had no routes until V8 to V11, and a link that 404s is
 * worse than an absent one. All four exist now.
 *
 * **The COMPANY column had no owner until V12.** V2's review found it folded
 * silently into the trader line and named by no row, which is how a
 * three-column footer quietly never arrives. It carries the contact address,
 * which is the one thing in §2b a reader can act on from any page.
 *
 * **Linking the withdrawal document has a legal effect, not just a structural
 * one.** § 54(1) p 12 requires the conditions, time limit and procedure for
 * withdrawal to be given before the contract is concluded, and § 56(1⁶) runs
 * the period to 12 months rather than 14 days where that duty was breached.
 * Until this row nothing on the site linked the document at all — which is why
 * the plan's gate item 12 exists, and why this narrows it rather than closing
 * it: whether a footer link discharges § 54(1) p 12 is the qualified reader's
 * question.
 *
 * The links come from `content/legal-routes.ts`, so this file names no route.
 * A renamed document moves every surface at once or fails
 * `tests/legal-routes.test.ts`.
 */

import { CONTACT_LINE, INCOMPLETE_NOTICE, TRADER_LINE } from "../../content/chrome";
import { FOOTER_COLUMNS, LEGAL_ROUTES } from "../../content/legal-routes";
import { hasGap, resolveText, type MerchantIdentity } from "../../content/merchant";
import { Parts } from "./Parts";

/**
 * The contact address, as a link when it is configured and as the vocabulary's
 * own gap when it is not. Resolved through `resolveText` rather than branched
 * on by hand, so the label is not written a second time here.
 */
function Contact({ merchant }: { readonly merchant: MerchantIdentity }) {
  const parts = resolveText(CONTACT_LINE, merchant);
  const email = parts.find((part) => part.kind === "text");
  return email === undefined ? <Parts parts={parts} /> : <a href={`mailto:${email.text}`}>{email.text}</a>;
}

export function Footer({ merchant }: { readonly merchant: MerchantIdentity }) {
  const trader = resolveText(TRADER_LINE, merchant);
  const contact = resolveText(CONTACT_LINE, merchant);

  return (
    <footer className="footer">
      <hr />

      <div className="footer-columns">
        {/* Each column is a nav with its own accessible name, so a screen
            reader hears "Legal" rather than a fourth unlabelled list. */}
        <nav className="footer-column" aria-labelledby="footer-legal">
          <h2 id="footer-legal" className="footer-heading">
            {FOOTER_COLUMNS.legal}
          </h2>
          <ul role="list">
            {LEGAL_ROUTES.map((route) => (
              <li key={route.href}>
                <a href={route.href}>{route.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <section className="footer-column" aria-labelledby="footer-company">
          <h2 id="footer-company" className="footer-heading">
            {FOOTER_COLUMNS.company}
          </h2>
          <p>
            <Contact merchant={merchant} />
          </p>
        </section>
      </div>

      <p className="fine-print">
        <Parts parts={trader} />
      </p>
      {hasGap(trader) || hasGap(contact) ? <p className="fine-print gap">{INCOMPLETE_NOTICE}</p> : null}
    </footer>
  );
}
