/**
 * `lousydeal.com/done-deals/{slug}` — a certificate, at the address contract §5
 * fixes for it.
 *
 * A Server Component reading the backend directly, the pattern T9 established
 * and `cart/page.tsx` and `checkout/page.tsx` both follow: the `/api/store/*`
 * proxy exists so a *browser* can reach the Store API without learning the
 * backend's origin, and nothing on this page runs in one.
 *
 * **The slug is the whole of the authorisation**, and that is C4's reasoning
 * rather than this file's: there are no accounts (§12), so this request
 * succeeding is the permission, which is tolerable only because §5 makes the
 * slug unenumerable.
 *
 * **`noindex, nofollow`.** An unguessable URL that a crawler publishes is a
 * guessable URL. It is behind Cloudflare Access today; this is what keeps the
 * guarantee true on the day the site publishes. Sharing still works — a link
 * somebody sends is not a link a crawler found — and C7 adds the card that
 * makes a shared link look like something.
 */

import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { ShareRow } from "../../../components/document/ShareRow";
import { CERTIFICATE_TITLE } from "../../../content/certificate";
import { certificateLayout } from "../../../lib/certificate-layouts";
import { createStoreFetchJson } from "../../../lib/medusa-client";
import { formatSerial } from "../../../lib/certificate-model";
import { getDeal } from "../../../lib/store-deal";
import { requireStoreClientConfig } from "../../../lib/store-session";

interface DoneDealPageProps {
  readonly params: Promise<{ readonly slug: string }>;
}

/**
 * The title a shared link shows, and the instruction that keeps the address
 * out of an index.
 *
 * `generateMetadata` rather than a static `metadata`, because the title now
 * carries the serial — and a link that unfurls as "Certificate of lousy
 * judgment" for every certificate is a link nobody can tell apart from
 * anybody else's. The card `opengraph-image.tsx` generates is attached by
 * Next from the file's presence in this segment; nothing here names it.
 *
 * **`noindex` survives having a title.** It was a static export before C7 and
 * had to move here with it, which is exactly the kind of thing that gets lost
 * — so `tests/done-deals-page.test.ts` asserts it through this function rather
 * than off a constant.
 */
export async function generateMetadata({ params }: DoneDealPageProps): Promise<Metadata> {
  const { slug } = await params;
  const certificate = await getDeal(createStoreFetchJson(requireStoreClientConfig()), slug);

  return {
    // An unguessable URL that a crawler publishes is a guessable URL. It is
    // behind Cloudflare Access today; this is what keeps the guarantee true on
    // the day the site publishes.
    robots: { index: false, follow: false },
    title:
      certificate === null
        ? CERTIFICATE_TITLE
        : `${CERTIFICATE_TITLE} ${formatSerial(certificate.serial)}`,
  };
}

export default async function DoneDealPage({ params }: DoneDealPageProps) {
  // Dynamic, and it has to be: a certificate is read from a database row, and
  // the alternative is a page built at image time from a store that was not
  // running. V13 shipped exactly that defect on the social image and had to
  // fix it.
  await connection();

  const { slug } = await params;
  const certificate = await getDeal(createStoreFetchJson(requireStoreClientConfig()), slug);

  // `null` covers a slug that addresses nothing and a certificate an operator
  // has hidden. C4 answers those identically so that the address cannot be
  // enumerated, and this page cannot tell them apart either.
  if (certificate === null) notFound();

  // Constraint 7: the layout the deal was *issued* under, resolved from the
  // stored version. `certificateLayout` refuses a version this build does not
  // know rather than falling back to the current one.
  const Layout = certificateLayout(certificate.layout);

  // **The request's own host, not a configured base URL.** There is none in
  // this storefront, and adding one would put an environment-specific value
  // somewhere `next build` could see it -- decision `002`. `x-forwarded-proto`
  // is what the ingress sets; `https` is the fallback because every deployed
  // hostname is behind TLS and a share link that said `http` would be wrong
  // everywhere it matters.
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";

  return (
    <main>
      <Layout certificate={certificate} />
      <ShareRow url={`${protocol}://${host}/done-deals/${slug}`} />
    </main>
  );
}
