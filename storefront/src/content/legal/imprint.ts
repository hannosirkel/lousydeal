/**
 * The imprint — the trader details a customer must be able to find.
 *
 * **This is the document decision `004`'s visible-gap rule was written for.**
 * An imprint that quietly loses its registration number renders as a complete
 * legal notice that is not one, so every field here is a placeholder and an
 * unconfigured one is named on the page rather than dropped.
 *
 * Two of the five are expected to stay unconfigured until the operator
 * supplies them: the registry code and the VAT number. §2b is explicit that
 * those two are each their own decision, separate from the legal name, address
 * and contact address it does publish. **In the deployed environments all five
 * are unconfigured**, because the row that supplies `MERCHANT_*` in the
 * overlays is V14 and has not landed.
 *
 * **It does not close the legal gate.** §23 makes that an operator gate a
 * qualified human reader closes. This is drafted at the operator's instruction
 * and waits on that acceptance like the other three.
 */

import type { LegalDocument } from "./types";

export const IMPRINT: LegalDocument = {
  title: "Imprint",
  form: "Form LD-I",
  revision: "Rev. 2026-09",
  updated: "2026-09-05",
  sections: [
    {
      number: "1",
      heading: "Who operates this site",
      body: [
        "This site is operated by {merchantLegalName}, a private limited company entered in the Estonian commercial register (äriregister).",
        "Registry code: {merchantRegistryCode}",
        "Registered address: {merchantAddress}",
        "VAT number: {merchantVatNumber}",
      ],
    },
    {
      number: "2",
      heading: "How to reach us",
      body: [
        "Write to {merchantEmail}.",
        "There is no telephone number. A shop selling a certificate that confers nothing does not need a call centre, and the address above is the route we answer on.",
      ],
    },
    {
      number: "3",
      heading: "What is sold here",
      body: [
        "A numbered digital certificate, and nothing else of value. That is stated at greater length in the Terms of Service, and it is not a disclaimer: it is the description of the product.",
      ],
    },
    {
      number: "4",
      heading: "Supervision and disputes",
      body: [
        "Consumer matters in Estonia are supervised by the Consumer Protection and Technical Regulatory Authority (Tarbijakaitse ja Tehnilise Järelevalve Amet), Endla 10a, 10122 Tallinn, info@ttja.ee.",
        "A consumer resident in Estonia who cannot resolve a complaint with us may refer it to the Consumer Disputes Committee at that authority. A consumer resident elsewhere in the European Union may approach the European Consumer Centre network instead; the Committee's own procedure is open to consumers resident in Estonia.",
      ],
    },
  ],
};
