/**
 * `GET /done-deals/{slug}/certificate.pdf` — the second of the two URLs
 * contract §5 fixes for a certificate.
 *
 * A Route Handler rather than a page, because the response is bytes with a
 * content type. It reads the same deal the page reads, through the same
 * `getDeal`, so the two cannot disagree about what the certificate says.
 *
 * **Served by the application, cached by nobody who matters.** §5: "Cache it if
 * it earns the cache, but treat the cache as disposable and the deal record as
 * the source of truth." Nothing here caches. A certificate is rendered in a few
 * milliseconds from a row, and a cache would be a second place an operator's
 * decision to hide one has to reach.
 */

import { notFound } from "next/navigation";
import { connection } from "next/server";

import { renderCertificatePdf } from "../../../../lib/certificate-pdf";
import { createStoreFetchJson } from "../../../../lib/medusa-client";
import { getDeal } from "../../../../lib/store-deal";
import { requireStoreClientConfig } from "../../../../lib/store-session";

interface CertificatePdfRouteContext {
  readonly params: Promise<{ readonly slug: string }>;
}

export async function GET(_request: Request, { params }: CertificatePdfRouteContext): Promise<Response> {
  await connection();

  const { slug } = await params;
  const certificate = await getDeal(createStoreFetchJson(requireStoreClientConfig()), slug);

  // The same answer the page gives, for the same reason: `null` covers a slug
  // that addresses nothing and one an operator has hidden, and C4 answers
  // those identically so the address cannot be enumerated.
  if (certificate === null) notFound();

  const pdf = await renderCertificatePdf(certificate);

  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-length": String(pdf.byteLength),
      // `inline`, so a browser shows it rather than dropping it in Downloads.
      // The filename is the serial, which is the certificate's name -- never
      // the slug, which §5 keeps out of everything but the address bar, and
      // never the buyer's, which there is none of.
      "content-disposition": `inline; filename="lousy-deal-${String(certificate.serial)}.pdf"`,
      // An unguessable URL that a crawler publishes is a guessable URL. The
      // page carries the same instruction in its metadata; a Route Handler has
      // no metadata, so it says so in a header.
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
