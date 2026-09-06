/**
 * The certificate as a PDF, rendered by this application and served by it.
 *
 * **Vector, and not a screenshot.** Contract §5: "The PDF is vector-rendered,
 * not produced by driving a headless browser. It is a second layout, and it is
 * allowed to drift from the HTML certificate." And: "No object storage. The
 * PDF is rendered by the application and served by the application. There is
 * no bucket, no external storage credential, and no storage outage that can
 * take a certificate offline."
 *
 * Those two sentences rule out almost everything. No Puppeteer, no Chromium in
 * the image, no S3. What is left is a drawing library, and PDFKit is the one
 * that takes a font as a `Buffer` — which matters here more than it looks:
 * `public/fonts/IBMPlexMono-*.ttf` are already committed for `next/og`, with
 * their SHA-256 pinned against upstream in `tests/opengraph.test.ts`, so the
 * page's social card and this document set in the same bytes from one
 * provenance-checked source.
 *
 * **Never a standard-14 font.** PDFKit's built-in Helvetica and friends need
 * the AFM metric files it ships in `js/data`, which is the part of the package
 * that is awkward under a bundler. Registering a real font and never asking
 * for a built-in one means those files are never read. `next.config.ts` lists
 * `pdfkit` under `serverExternalPackages` for the same reason from the other
 * side.
 *
 * **Constraint 7 applies here too.** An issued certificate keeps the layout it
 * was issued under, and the PDF is a layout. So this dispatches on the stored
 * version through its own registry, refuses one it does not know, and never
 * falls back — the same rule and the same reasoning as
 * `./certificate-layouts`, which does it for the HTML.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import PDFDocument from "pdfkit";

import type { Certificate } from "./certificate-model";
import { CERTIFICATE_LAYOUT_V1 } from "./certificate-model";
import { drawCertificateLayout1 } from "./pdf-layout-1";

/** The two cuts a certificate is set in, as bytes PDFKit embeds. */
export interface CertificateFonts {
  readonly regular: Buffer;
  readonly bold: Buffer;
}

/** What a layout needs to draw one, beyond the document itself. */
export type CertificatePdfLayout = (
  doc: PDFKit.PDFDocument,
  certificate: Certificate,
  supported: (text: string) => string,
) => void;

/**
 * Every PDF layout this build can draw, by version.
 *
 * Parallel to `CERTIFICATE_LAYOUTS` in `./certificate-layouts` and separate
 * from it on purpose: §5 lets the two media drift, so layout 3 of the page and
 * layout 3 of the document are not required to arrive together. What they do
 * share is the version stored on the deal.
 */
export const CERTIFICATE_PDF_LAYOUTS: Readonly<Record<number, CertificatePdfLayout>> = {
  [CERTIFICATE_LAYOUT_V1]: drawCertificateLayout1,
};

/** Loaded once per process. The files never change under a running server; they are in the image. */
let fonts: Promise<CertificateFonts> | undefined;

function certificateFonts(): Promise<CertificateFonts> {
  fonts ??= (async () => ({
    regular: await readFile(join(process.cwd(), "public/fonts/IBMPlexMono-Regular.ttf")),
    bold: await readFile(join(process.cwd(), "public/fonts/IBMPlexMono-Bold.ttf")),
  }))();
  return fonts;
}

/**
 * Replaces characters the embedded font cannot set.
 *
 * **A browser falls back and a PDF cannot.** The page renders an inscription
 * in whatever face the reader's system can supply; this document has exactly
 * the glyphs in the file it embedded, and a codepoint outside them draws as
 * `.notdef` — an invisible gap, silently, with no error anywhere. Measured on
 * these files: Latin, Latin Extended, Greek, Cyrillic, general punctuation and
 * currency are all present; CJK, emoji and the right-to-left scripts are not.
 *
 * **A visible substitution beats an invisible hole**, which is the whole of
 * the argument for doing anything here. `?` is not a good rendering of
 * somebody's name — nothing available is — but it says a character was lost,
 * where a blank says the buyer typed a space. The real fix is a fallback font
 * in the image, which is a row of its own and is recorded in the plan rather
 * than smuggled into this one.
 */
export function supportedBy(font: { hasGlyphForCodePoint(codePoint: number): boolean }) {
  return (text: string): string =>
    [...text].map((character) => (font.hasGlyphForCodePoint(character.codePointAt(0) ?? 0) ? character : "?")).join("");
}

/**
 * The certificate, as PDF bytes.
 *
 * Buffered rather than streamed. A certificate is a few kilobytes and the
 * caller is an HTTP route that needs a `Content-Length`; streaming would buy
 * nothing and cost the ability to fail cleanly before a byte has been sent.
 */
export async function renderCertificatePdf(certificate: Certificate): Promise<Buffer> {
  const draw = CERTIFICATE_PDF_LAYOUTS[certificate.layout];
  if (draw === undefined) {
    throw new Error(
      `certificate PDF layout ${String(certificate.layout)} is not in this build; refusing to draw it as another layout`,
    );
  }

  const { regular, bold } = await certificateFonts();

  return await new Promise<Buffer>((resolve, reject) => {
    // A4. The reader is an Estonian company's customer and the document may be
    // printed; Letter would be the wrong default for the addresses on the
    // imprint. `margin: 0` because the layout positions everything absolutely
    // -- a ledger with a dotted leader is set by coordinate, not by flow.
    const doc = new PDFDocument({ size: "A4", margin: 0, autoFirstPage: true });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.registerFont("regular", regular);
    doc.registerFont("bold", bold);

    // **Reaching for `doc._font.font` is a private access, and it is the only
    // one here.** PDFKit exposes no public way to ask a registered font
    // whether it can set a codepoint, and the alternative -- depending on
    // `fontkit` directly, which PDFKit already depends on -- would add a
    // second package to answer one question. `tests/certificate-pdf.test.ts`
    // pins the shape, so a PDFKit upgrade that moves it fails there rather
    // than silently turning every inscription into question marks.
    //
    // The regular cut decides what is representable: it is the one the
    // inscription -- the only buyer-supplied text on the document -- is set
    // in.
    doc.font("regular");
    const embedded = (doc as unknown as { _font: { font: { hasGlyphForCodePoint(codePoint: number): boolean } } })._font;

    draw(doc, certificate, supportedBy(embedded.font));

    doc.end();
  });
}
