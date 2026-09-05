/**
 * The certificate, per `docs/current/brand.md` §4 — the identity's most
 * designed surface, and the one people will screenshot.
 *
 * **Derived, never stored.** Contract §5 requires that a rendered certificate
 * is always computed from the deal record, so an operator can sanitise, hide
 * or blank an inscription later without a schema change, a new serial or a
 * reissue. Everything here is a function of its props.
 *
 * **An empty inscription must look deliberate.** Most buyers leave it blank,
 * and §5 says the certificate has to look finished when they do — so the
 * bearer line reads `THE BEARER` rather than collapsing, and no row is
 * conditionally absent. "Empty" here means `null`, `""`, whitespace, or
 * anything §5's filter removes entirely: `??` alone caught only the first, and
 * an empty string left the bearer row blank with its leader running to the
 * edge, half the height of its neighbours.
 *
 * **The inscription is filtered here as well as at entry**, which is what §5
 * asks for in those words. A derivation that trusts what it was given is not a
 * filter, and §5's requirement that an operator can blank an inscription later
 * without reissuing only holds if the render does the work every time.
 *
 * The serial is the one figure at the display step, which is `brand.md` §3's
 * budget of one per page, and the stamp is that page's one stamp.
 */

import { CERTIFICATE_CLAUSE, CERTIFICATE_LABELS, CERTIFICATE_TITLE, NO_INSCRIPTION, STAMP_LINES } from "../../content/certificate";
import { type Certificate as CertificateRecord, formatSerial } from "../../lib/certificate-model";
import { sanitiseInscription } from "../../lib/inscription";
import { formatMoney } from "../../lib/money";
import { FinePrint } from "./FinePrint";
import { Ledger, LedgerRow } from "./LedgerRow";
import { DoubleRule } from "./Rule";
import { StampMark } from "./StampMark";

export interface CertificateProps {
  readonly certificate: CertificateRecord;
  /**
   * Rendered under the clause when this is not a record of a real deal. The
   * specimen route passes it; a real certificate never does.
   */
  readonly notice?: string;
}

export function Certificate({ certificate, notice }: CertificateProps) {
  return (
    <article className="certificate">
      <DoubleRule />
      <h1 className="certificate-title">{CERTIFICATE_TITLE}</h1>
      {/* The serial is the certificate's name. `brand.md` §3 allows one figure
          at the display step per page, and on this page it is this one. */}
      <p className="certificate-serial">{formatSerial(certificate.serial)}</p>

      <Ledger>
        <LedgerRow label={CERTIFICATE_LABELS.bearer} value={sanitiseInscription(certificate.inscription) ?? NO_INSCRIPTION} />
        <LedgerRow label={CERTIFICATE_LABELS.item} value={certificate.tier} />
        <LedgerRow
          label={CERTIFICATE_LABELS.wasted}
          value={formatMoney(certificate.amount, certificate.currencyCode)}
        />
        {/* The issue date as stored: an ISO date reads the same everywhere,
            and a locale format would move with the reader's runtime on a
            document whose whole point is being screenshotted and shared. */}
        <LedgerRow label={CERTIFICATE_LABELS.issued} value={<time dateTime={certificate.issuedOn}>{certificate.issuedOn}</time>} />
      </Ledger>

      <StampMark lines={[...STAMP_LINES]} />

      <FinePrint>{CERTIFICATE_CLAUSE}</FinePrint>
      {notice === undefined ? null : <FinePrint>{notice}</FinePrint>}
      <DoubleRule />
    </article>
  );
}
