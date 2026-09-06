/**
 * Certificate layout 1, as a printed document.
 *
 * **It is allowed to differ from the page, and it does.** Contract §5: "It is a
 * second layout, and it is allowed to drift from the HTML certificate: the page
 * and the document are each free to be right for their own medium. Two layouts
 * is the accepted cost of not shipping a browser in the backend image." So this
 * is not a transcription of `Certificate.tsx`. It is set on A4 with print
 * margins, the ledger's dotted leaders are drawn rather than inherited from a
 * stylesheet, and the stamp is two circles and two lines of type rather than an
 * inline SVG.
 *
 * **What it may not differ on is the facts.** The serial, the tier, the amount,
 * the date and the inscription are the same values the page renders, from the
 * same record. `brand.md` §4 is the authority for the wording, and every string
 * here comes from `content/certificate.ts` rather than being retyped.
 *
 * **Every colour comes from `app/palette.ts`.** A PDF has no cascade, exactly
 * as Satori has none — `tokens.test.ts` bans a hex literal anywhere else under
 * `src`, and that rule is why this file imports rather than writes them.
 *
 * Coordinates are PostScript points, 72 to the inch, with the origin at the
 * top left. A4 is 595.28 × 841.89.
 */

import { PALETTE } from "../app/palette";
import {
  CERTIFICATE_CLAUSE,
  CERTIFICATE_LABELS,
  CERTIFICATE_TITLE,
  NO_INSCRIPTION,
  STAMP_LINES,
} from "../content/certificate";
import type { Certificate } from "./certificate-model";
import { formatSerial } from "./certificate-model";
import { sanitiseInscription } from "./inscription";
import { formatMoney } from "./money";

const PAGE = { width: 595.28, height: 841.89 } as const;

/** The measure the document is set to, and the margins that follow from it. */
const MARGIN = 72;
const MEASURE = PAGE.width - MARGIN * 2;

const SIZE = { title: 20, serial: 44, body: 11, fine: 8.5, stamp: 7 } as const;

/** A rule the width of the measure, at `y`. Two of them, top and bottom, as the page has. */
function doubleRule(doc: PDFKit.PDFDocument, y: number): void {
  for (const offset of [0, 3]) {
    doc
      .moveTo(MARGIN, y + offset)
      .lineTo(MARGIN + MEASURE, y + offset)
      .lineWidth(0.75)
      .strokeColor(PALETTE.ink)
      .stroke();
  }
}

/**
 * One ledger row: label left, value right, dotted leader between.
 *
 * Drawn rather than styled. The page gets its leader from `globals.css`; here
 * the dots are a dashed rule, which is what makes the figures line up on paper
 * without a layout engine.
 */
function ledgerRow(doc: PDFKit.PDFDocument, y: number, label: string, value: string): void {
  doc.font("regular").fontSize(SIZE.body).fillColor(PALETTE.ink);

  const labelWidth = doc.widthOfString(label);
  const valueWidth = doc.widthOfString(value);

  doc.text(label, MARGIN, y, { lineBreak: false });
  doc.text(value, MARGIN + MEASURE - valueWidth, y, { lineBreak: false });

  // The leader stops short of both, by a space's width at each end.
  const gap = doc.widthOfString(" ");
  const from = MARGIN + labelWidth + gap;
  const to = MARGIN + MEASURE - valueWidth - gap;
  if (to > from) {
    doc
      .moveTo(from, y + SIZE.body * 0.8)
      .lineTo(to, y + SIZE.body * 0.8)
      .lineWidth(0.5)
      .dash(1, { space: 2.5 })
      .strokeColor(PALETTE.inkSoft)
      .stroke()
      .undash();
  }
}

/** The stamp: two concentric circles and two lines of type, in the one accent colour. */
function stamp(doc: PDFKit.PDFDocument, centreX: number, centreY: number): void {
  for (const radius of [34, 30]) {
    doc.circle(centreX, centreY, radius).lineWidth(1).strokeColor(PALETTE.stamp).stroke();
  }

  doc.font("bold").fontSize(SIZE.stamp).fillColor(PALETTE.stamp);
  STAMP_LINES.forEach((line, index) => {
    const width = doc.widthOfString(line);
    doc.text(line, centreX - width / 2, centreY - SIZE.stamp - 1 + index * (SIZE.stamp + 2), { lineBreak: false });
  });
}

/** Sets `text` centred on the measure at `y`, and answers the height it took. */
function centred(doc: PDFKit.PDFDocument, text: string, y: number, size: number, font: "regular" | "bold"): number {
  doc.font(font).fontSize(size).fillColor(PALETTE.ink);
  doc.text(text, MARGIN, y, { width: MEASURE, align: "center" });
  return doc.heightOfString(text, { width: MEASURE });
}

export function drawCertificateLayout1(
  doc: PDFKit.PDFDocument,
  certificate: Certificate,
  supported: (text: string) => string,
): void {
  doc.rect(0, 0, PAGE.width, PAGE.height).fillColor(PALETTE.paper).fill();

  doubleRule(doc, MARGIN);

  let y = MARGIN + 40;
  y += centred(doc, CERTIFICATE_TITLE, y, SIZE.title, "bold") + 24;

  // The one display figure the document is allowed, per `brand.md` §3.
  y += centred(doc, formatSerial(certificate.serial), y, SIZE.serial, "bold") + 40;

  // Filtered here as well as at entry, which is what §5 asks for in those
  // words -- and separately per field, so an operator can blank one without
  // touching the other. `supported` then replaces anything the embedded font
  // cannot set; see `certificate-pdf.ts` for why that is visible rather than
  // silent.
  const bearer = supported(sanitiseInscription(certificate.displayName) ?? NO_INSCRIPTION);
  const dedication = sanitiseInscription(certificate.dedication);

  for (const [label, value] of [
    [CERTIFICATE_LABELS.bearer, bearer],
    [CERTIFICATE_LABELS.item, certificate.tier],
    [CERTIFICATE_LABELS.wasted, formatMoney(certificate.amount, certificate.currencyCode)],
    [CERTIFICATE_LABELS.issued, certificate.issuedOn],
  ] as const) {
    ledgerRow(doc, y, label, value);
    y += SIZE.body * 2;
  }

  y += 20;

  // The one element that disappears when empty, for the reason `brand.md` §4
  // gives: an empty quotation is not a deliberate blank, it is a pair of
  // quotation marks around nothing. The marks are written here rather than
  // drawn by a stylesheet, because a PDF has no `::before`.
  if (dedication !== null) {
    y += centred(doc, `“${supported(dedication)}”`, y, SIZE.body, "regular") + 28;
  }

  stamp(doc, PAGE.width / 2, y + 34);
  y += 96;

  doc.font("regular").fontSize(SIZE.fine).fillColor(PALETTE.inkSoft);
  doc.text(CERTIFICATE_CLAUSE, MARGIN, y, { width: MEASURE, align: "center" });
  y += doc.heightOfString(CERTIFICATE_CLAUSE, { width: MEASURE });

  // **The closing rule follows the content, it does not sit at the page
  // foot.** Placed at `PAGE.height - MARGIN` it left roughly 270 points of
  // white between the clause and the rule, which reads as a document that
  // stopped rather than one that finished. Measured by rendering it and
  // looking, which is the only way this class of defect is ever found -- §14's
  // "a passing unit suite is not visual acceptance", in one page.
  doubleRule(doc, y + 36);
}
