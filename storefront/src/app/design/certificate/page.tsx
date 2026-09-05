/**
 * The certificate, rendered from a specimen so it can be reviewed before
 * LD-02 has anything real to render.
 *
 * **Deliberately not at a `/done-deals/` URL.** Contract §5 fixes the public
 * route at `lousydeal.com/done-deals/{slug}`, with an opaque non-enumerable
 * slug. A fabricated deal must never occupy an address a real deal could have,
 * and `AGENTS.md` forbids publishing a fabricated transaction at all — so this
 * lives under `/design/`, which says what it is, and the certificate says so
 * on its own face as well.
 *
 * LD-02 mounts the same component at the real route against a real record.
 */

import type { Metadata } from "next";

import { Certificate } from "../../../components/document/Certificate";
import { SPECIMEN_NOTICE } from "../../../content/certificate";
import { SPECIMEN_CERTIFICATE } from "../../../lib/certificate-model";

/**
 * A design surface is not a page a search engine should carry. It is behind
 * Cloudflare Access today; `noindex` is what keeps that true on the day the
 * site publishes.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function CertificateSpecimenPage() {
  return (
    <main>
      <Certificate certificate={SPECIMEN_CERTIFICATE} notice={SPECIMEN_NOTICE} />
    </main>
  );
}
