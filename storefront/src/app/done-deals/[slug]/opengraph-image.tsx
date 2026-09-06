/**
 * The card a shared certificate link unfurls into.
 *
 * `brand.md` §4 anticipated this one: "Certificate images arrive with LD-02,
 * when there is a certificate to render." The home card renders the offer
 * ledger; this renders the certificate's own — which is the whole reason a
 * shared link is worth sharing, since the serial is the thing somebody is
 * showing off.
 *
 * **Dynamic, and here it could not be otherwise.** `src/app/opengraph-image.tsx`
 * has a comment about V13 shipping a card baked at build time with no store
 * reachable; a per-deal card cannot be prerendered at all, because the deal
 * does not exist when the image is built. `connection()` says so explicitly
 * rather than relying on the dynamic segment to imply it.
 *
 * **It carries no billing name, because there is none to carry.** Constraint 13
 * holds by construction: `getDeal` yields a record with no field for one, and
 * C4's endpoint publishes none. What this file adds is that the *alt text* is
 * built from the serial rather than the inscription — a card's alt is read
 * aloud by a screen reader on somebody else's timeline, and the inscription is
 * already in the picture.
 */

import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { PALETTE } from "../../palette";
import {
  CERTIFICATE_LABELS,
  CERTIFICATE_TITLE,
  NO_INSCRIPTION,
  SHARE_CARD_ALT,
} from "../../../content/certificate";
import { formatSerial } from "../../../lib/certificate-model";
import { sanitiseInscription } from "../../../lib/inscription";
import { createStoreFetchJson } from "../../../lib/medusa-client";
import { formatMoney } from "../../../lib/money";
import { getDeal } from "../../../lib/store-deal";
import { requireStoreClientConfig } from "../../../lib/store-session";

export const alt = SHARE_CARD_ALT;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const { paper: PAPER, ink: INK, inkSoft: INK_SOFT, stamp: STAMP } = PALETTE;

/** Read once, at module scope: the bytes do not depend on the request. */
const [regular, bold] = await Promise.all([
  readFile(join(process.cwd(), "public/fonts/IBMPlexMono-Regular.ttf")),
  readFile(join(process.cwd(), "public/fonts/IBMPlexMono-Bold.ttf")),
]);

/**
 * A ledger row, in the card's own idiom.
 *
 * The leader is dashed and the page's is dotted, which `brand.md` §4 records as
 * the one deviation on any surface: Satori rejects `borderStyle: "dotted"`
 * outright.
 */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", width: "100%", gap: 16 }}>
      <span style={{ color: INK_SOFT, letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 26 }}>
        {label}
      </span>
      <span style={{ flexGrow: 1, borderBottom: `2px dashed ${INK_SOFT}`, transform: "translateY(-8px)" }} />
      <span style={{ color: INK, fontSize: 30, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

interface CardProps {
  readonly params: Promise<{ readonly slug: string }>;
}

export default async function CertificateCard({ params }: CardProps) {
  await connection();

  const { slug } = await params;
  const certificate = await getDeal(createStoreFetchJson(requireStoreClientConfig()), slug);

  // The same answer the page and the PDF give. A card for a certificate that
  // does not exist -- or one an operator has hidden -- would be the one place
  // the hidden state leaked, since an image is fetched by whoever was sent the
  // link rather than by the person who has it.
  if (certificate === null) notFound();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: PAPER,
          color: INK,
          fontFamily: "IBM Plex Mono",
          padding: 72,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 34, letterSpacing: "0.08em", textTransform: "uppercase", color: INK_SOFT }}>
            {CERTIFICATE_TITLE}
          </div>
          <div style={{ width: "100%", height: 2, background: INK, marginTop: 16, marginBottom: 24 }} />
          {/* The one display figure, and the reason the link is worth opening. */}
          <div style={{ fontSize: 128, fontWeight: 700, color: STAMP }}>{formatSerial(certificate.serial)}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Row
            label={CERTIFICATE_LABELS.bearer}
            value={sanitiseInscription(certificate.displayName) ?? NO_INSCRIPTION}
          />
          <Row label={CERTIFICATE_LABELS.item} value={certificate.tier} />
          <Row
            label={CERTIFICATE_LABELS.wasted}
            value={formatMoney(certificate.amount, certificate.currencyCode)}
          />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "IBM Plex Mono", data: regular, style: "normal", weight: 400 },
        { name: "IBM Plex Mono", data: bold, style: "normal", weight: 700 },
      ],
    },
  );
}
