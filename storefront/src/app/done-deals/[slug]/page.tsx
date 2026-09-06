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
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { certificateLayout } from "../../../lib/certificate-layouts";
import { createStoreFetchJson } from "../../../lib/medusa-client";
import { getDeal } from "../../../lib/store-deal";
import { requireStoreClientConfig } from "../../../lib/store-session";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface DoneDealPageProps {
  readonly params: Promise<{ readonly slug: string }>;
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

  return (
    <main>
      <Layout certificate={certificate} />
    </main>
  );
}
