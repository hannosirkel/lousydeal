/**
 * The social image: the letterhead and the offer ledger, at 1200×630.
 *
 * **The same identity, not a picture of it.** `brand.md` §3's paper, ink, soft
 * ink and stamp; the one typeface; a rule under the wordmark and dotted leaders
 * in the ledger. No shadow, no radius, no gradient, and nothing here that the
 * site itself would not render.
 *
 * ## The font is the unmodified upstream file, and that is the whole reason
 *
 * The pages are served `LD Mono` — subsets, which OFL 1.1 clause 3 makes
 * Modified Versions and so forbids from carrying the Reserved Font Name. Satori
 * cannot read woff2 at all, so this route needs a different file, and the file
 * it needs is the **unmodified** upstream TTF. Unmodified copies may keep the
 * name, so `public/fonts/` carries IBM Plex Mono under its own name while
 * `src/fonts/` carries the renamed subsets. Two names for one typeface is not
 * an inconsistency; it is what the licence asks for.
 *
 * Both files were fetched from IBM/plex at the commit `src/fonts/plex-mono.ts`
 * already records, and their SHA-256 sums match the ones that file recorded
 * for the sources it subsetted:
 *
 *   Regular fe11304a5fe956d5744e9b6a246cc83d90425245e75a62230044966ca96a7f50
 *   Bold    ca403c56931baef307d20ba64b69acb71abcad61f75e66414661d57484b690ec
 *
 * `tests/opengraph.test.ts` re-checks both against that file, so provenance is
 * executed rather than asserted — and a font swapped for a lookalike fails.
 *
 * ## Why the price may be absent
 *
 * The figures come from the Store API, exactly as the home page's do; no amount
 * is written here, which is also what `tests/store-cart.test.ts` enforces
 * across `src`. When the store cannot be reached the card renders without the
 * two rows that need it rather than failing or inventing them. A social image
 * is chrome, and a missing row costs a reader nothing they could have used —
 * decision `004`'s reasoning about optional prose, applied to a picture. What
 * it must never do is show a number that is not the number.
 *
 * `RETURN -100%` survives either way. It is a ratio rather than an amount, so
 * it is true of every tier and comes from no API.
 */

import { ImageResponse } from "next/og";
import { connection } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { MASTHEAD_LINE, MASTHEAD_MARK } from "../content/chrome";
import { PALETTE } from "./palette";
import { OFFER_LABELS, OFFER_RETURN } from "../content/home";
import { createStoreFetchJson, listTiers } from "../lib/medusa-client";
import { formatMoney } from "../lib/money";
import { requireStoreClientConfig } from "../lib/store-session";
import { cheapest, NO_VALUE } from "../lib/tier-rows";

export const alt = `${MASTHEAD_MARK} — ${MASTHEAD_LINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Satori renders in Node with no stylesheet, so `var(--paper)` reaches it as
 * the string `var(--paper)` and paints nothing. `palette.ts` is the one other
 * declared home for a colour, and `tests/tokens.test.ts` holds it to `:root`.
 */
const { paper: PAPER, ink: INK, inkSoft: INK_SOFT, stamp: STAMP } = PALETTE;

/** Read once, at module scope: the bytes do not depend on the request. */
const [regular, bold] = await Promise.all([
  readFile(join(process.cwd(), "public/fonts/IBMPlexMono-Regular.ttf")),
  readFile(join(process.cwd(), "public/fonts/IBMPlexMono-Bold.ttf")),
]);

/** The offer, or nothing at all if the store cannot be reached. */
async function offerRows(): Promise<readonly (readonly [string, string])[]> {
  try {
    // The home page's own two lines. A second fetch written by hand here would
    // be a second thing to keep in step with the proxy's headers and the
    // publishable key.
    const tiers = await listTiers(createStoreFetchJson(requireStoreClientConfig()));
    const offer = cheapest(tiers);
    if (offer === undefined) return [];
    return [
      [OFFER_LABELS.item, offer.title],
      [OFFER_LABELS.price, formatMoney(offer.amount, offer.currencyCode)],
      [OFFER_LABELS.value, formatMoney(NO_VALUE, offer.currencyCode)],
    ];
  } catch (error) {
    // The card is chrome: a store outage costs it two rows, not the image. But
    // a silent catch is how a permanent breakage looks exactly like a
    // temporary one, so it is logged -- the storefront's only other log line is
    // the proxy's, for the same reason.
    console.error("opengraph-image: the offer could not be read", error);
    return [];
  }
}

/**
 * A ledger row: label, leader, value. `brand.md` §3's one list form.
 *
 * **The leader is dashed and the site's is dotted**, which is a deviation and
 * not a choice. Satori rejects `borderStyle: "dotted"` outright — "Allowed
 * values: solid | dashed" — so the options were the nearest thing it renders or
 * a hand-drawn row of glyphs, and a row of full stops sets to a different
 * rhythm at every width. It is recorded in the plan rather than left for
 * someone to find by comparing a share card with the page.
 */
function Row({ label, value, tone }: { label: string; value: string; tone?: "stamp" }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", width: "100%", gap: 16 }}>
      <span style={{ color: INK_SOFT, letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 28 }}>
        {label}
      </span>
      <span style={{ flexGrow: 1, borderBottom: `2px dashed ${INK_SOFT}`, transform: "translateY(-8px)" }} />
      <span style={{ color: tone === "stamp" ? STAMP : INK, fontSize: 32, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

export default async function OpengraphImage() {
  // **Dynamic, like every other route here.** Next prerenders an
  // `opengraph-image` by default, and a card baked at build time is baked with
  // whatever the build could reach -- which is no store at all, since the image
  // is built once and run in two environments. Decision `002` is the rule it
  // breaks: nothing environment-specific belongs in the artifact, and a price
  // is the most environment-specific thing here. `connection()` is the same
  // marker `layout.tsx` and every page use.
  await connection();

  const rows = await offerRows();

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
          <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: "0.08em" }}>{MASTHEAD_MARK}</div>
          <div style={{ width: "100%", height: 2, background: INK, marginTop: 16, marginBottom: 16 }} />
          <div style={{ fontSize: 28, color: INK_SOFT, fontStyle: "italic" }}>{MASTHEAD_LINE}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {rows.map(([label, value]) => (
            <Row key={label} label={label} value={value} />
          ))}
          <Row label={OFFER_LABELS.return} value={OFFER_RETURN} tone="stamp" />
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
