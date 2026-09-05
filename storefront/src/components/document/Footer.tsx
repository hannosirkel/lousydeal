/**
 * The trader line every page carries — contract §2b's details a customer must
 * be able to find, rendered from `src/content/chrome.ts` rather than from
 * strings in this file. See decision `004` for why the copy lives there.
 *
 * **Two of `brand.md` §4's three footer columns are not here yet.** The LEGAL
 * column links Terms, Refunds & Withdrawal, Privacy and Imprint, none of which
 * has a route until V8 to V11, and a link that 404s is worse than an absent
 * one. The COMPANY column is V12's too. This row renders the one part that has
 * something behind it today.
 */

import { CONTACT_LINE, INCOMPLETE_NOTICE, TRADER_LINE } from "../../content/chrome";
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
      <p className="fine-print">
        <Parts parts={trader} /> <Contact merchant={merchant} />
      </p>
      {hasGap(trader) || hasGap(contact) ? <p className="fine-print gap">{INCOMPLETE_NOTICE}</p> : null}
    </footer>
  );
}
