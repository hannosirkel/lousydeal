/**
 * The certificate as a PDF: the bytes, not the intention.
 *
 * **Every assertion here parses what was produced.** A test that called the
 * renderer and checked it did not throw would pass against a blank page, and a
 * blank certificate is the one failure nobody would notice until somebody
 * downloaded theirs. So the buffer is opened: its header, its page size, its
 * embedded font, and — because PDFKit compresses content streams — its text is
 * read back out of the inflated stream.
 *
 * **What no unit test here can judge is whether it looks right.** §14 says a
 * passing suite is not visual acceptance, and a PDF is exactly the artifact
 * that sentence is about. C15 opens one.
 */

import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";

import { afterAll, describe, expect, it } from "vitest";

import { CERTIFICATE_CLAUSE, CERTIFICATE_LABELS, CERTIFICATE_TITLE, NO_INSCRIPTION } from "../src/content/certificate";
import { CERTIFICATE_PDF_LAYOUTS, renderCertificatePdf, supportedBy } from "../src/lib/certificate-pdf";
import { CERTIFICATE_LAYOUT_V1, type Certificate } from "../src/lib/certificate-model";

const ISSUED: Certificate = {
  serial: 4102,
  displayName: "Jane Example",
  dedication: "worth every cent, regrettably",
  tier: "Lousy Deal Pro",
  amount: 25,
  currencyCode: "usd",
  issuedOn: "2026-09-06",
  layout: CERTIFICATE_LAYOUT_V1,
};

/** `n 0 obj … endobj` bodies, by object number. */
function objects(raw: string): Map<number, string> {
  const found = new Map<number, string>();
  for (const [, number, body] of raw.matchAll(/(\d+) 0 obj([\s\S]*?)endobj/g)) {
    found.set(Number(number), body ?? "");
  }
  return found;
}

/** The inflated body of an object that is a stream, or `null`. */
function streamOf(body: string): string | null {
  const match = /stream\r?\n([\s\S]*?)endstream/.exec(body);
  if (match?.[1] === undefined) return null;
  try {
    return inflateSync(Buffer.from(match[1], "latin1")).toString("latin1");
  } catch {
    return null;
  }
}

/** Glyph id to character, from one `ToUnicode` CMap. */
function glyphMap(cmap: string): Map<number, string> {
  const glyphs = new Map<number, string>();
  const char = (hex: string) => String.fromCodePoint(parseInt(hex.slice(0, 4), 16));

  // `<first> <last> [<u> <u> …]` — the form PDFKit emits.
  for (const [, first, , list] of cmap.matchAll(/<([0-9a-f]{4})>\s*<([0-9a-f]{4})>\s*\[([^\]]*)\]/gi)) {
    [...(list ?? "").matchAll(/<([0-9a-f]{4,})>/gi)].forEach(([, unicode], index) => {
      glyphs.set(parseInt(first ?? "0", 16) + index, char(unicode ?? "0000"));
    });
  }
  // `<gid> <unicode>` pairs, for completeness.
  for (const [, gid, unicode] of cmap.matchAll(/<([0-9a-f]{4})>\s*<([0-9a-f]{4,})>(?!\s*\[)/gi)) {
    if (!glyphs.has(parseInt(gid ?? "0", 16))) glyphs.set(parseInt(gid ?? "0", 16), char(unicode ?? "0000"));
  }
  return glyphs;
}

/**
 * The text a PDF actually sets, in characters.
 *
 * **Not a grep.** PDFKit embeds each font as a subset and writes glyph ids, so
 * the words are nowhere in the file as bytes: a run reads `[<00010002…>] TJ`,
 * and `Jane` is four two-byte indices into a subset built for this document.
 * What makes them readable again is the `ToUnicode` CMap the file carries —
 * how any reader copies text out of a PDF — so this walks the object graph to
 * find each font's CMap and decodes the runs through it.
 *
 * **Per font, and that is the part worth stating.** The document uses two cuts,
 * and each has its own subset and therefore its own glyph-id space: id 1 is `C`
 * in the bold subset and `B` in the regular one. The first version of this
 * helper merged every CMap into one map, which decoded the title correctly and
 * turned the whole ledger into somebody else's letters.
 *
 * The alternative was asserting the buffer's length, which is what the version
 * before that did — and which would have passed against a page of question
 * marks.
 */
function textOf(pdf: Buffer): string {
  const raw = pdf.toString("latin1");
  const graph = objects(raw);

  // `/F2 12 0 R` in a resources dictionary, then object 12's `/ToUnicode`.
  const maps = new Map<string, Map<number, string>>();
  for (const [, name, fontObject] of raw.matchAll(/\/(F\d+)\s+(\d+) 0 R/g)) {
    const toUnicode = /\/ToUnicode (\d+) 0 R/.exec(graph.get(Number(fontObject)) ?? "")?.[1];
    if (toUnicode === undefined) continue;
    const cmap = streamOf(graph.get(Number(toUnicode)) ?? "");
    if (cmap !== null) maps.set(name ?? "", glyphMap(cmap));
  }

  const runs: string[] = [];
  for (const body of graph.values()) {
    const content = streamOf(body);
    if (content === null || !content.includes("TJ")) continue;

    // `Tf` selects a font and every run after it uses that one, until the next.
    let current = new Map<number, string>();
    for (const [, name, hex] of content.matchAll(/\/(F\d+) [\d.]+ Tf|\[<([0-9a-f]+)>[^\]]*\]\s*TJ/gi)) {
      if (name !== undefined) {
        current = maps.get(name) ?? new Map();
        continue;
      }
      const ids = (hex ?? "").match(/.{4}/g) ?? [];
      runs.push(ids.map((id) => current.get(parseInt(id, 16)) ?? "\uFFFD").join(""));
    }
  }
  return runs.join("\n");
}

/**
 * The renderer reads its fonts from `join(process.cwd(), "public/fonts/…")`,
 * which is `storefront/` when `next start` runs and the repository root when
 * Vitest does. `src/app/opengraph-image.tsx` resolves them the same way and
 * for the same reason — `public/` is not adjacent to a bundled server module,
 * so `import.meta.url` would find nothing in production.
 *
 * Rather than give the renderer a second path for tests to take, the test
 * stands where the server stands. `tests/medusa-config.test.ts` does this too,
 * and for the same reason: the path under test is the production one or it is
 * not the path under test.
 */
const originalCwd = process.cwd();
process.chdir(fileURLToPath(new URL("..", import.meta.url)));

afterAll(() => {
  process.chdir(originalCwd);
});

/**
 * PDFKit sets text through the embedded subset, so a recovered run is in glyph
 * ids rather than characters. What survives is the *shape* of the document, so
 * these assertions are about structure and the ones about wording go through
 * the content module — see "the words on it" below.
 */
const rendered = await renderCertificatePdf(ISSUED);

describe("the document", () => {
  it("is a PDF, and a vector one", async () => {
    expect(rendered.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(rendered.subarray(-6).toString("latin1").trim()).toBe("%%EOF");

    // No raster: a certificate drawn as a picture of itself would defeat the
    // whole of §5's "vector-rendered, not produced by driving a headless
    // browser".
    //
    // `/Subtype /Image` and not `/Image`: PDFKit writes a default
    // `/ProcSet [/PDF /Text /ImageB /ImageC /ImageI]` on every page, so the
    // bare substring matches a document with no image in it -- which the first
    // version of this assertion proved by failing.
    expect(rendered.includes(Buffer.from("/Subtype /Image"))).toBe(false);
    expect(rendered.includes(Buffer.from("/DCTDecode"))).toBe(false);
    expect(rendered.includes(Buffer.from("/FlateDecode"))).toBe(true);
  });

  it("is one A4 page", () => {
    // 595.28 x 841.89 points. A certificate that silently became two pages,
    // or Letter, is the failure a "did not throw" test would pass.
    const raw = rendered.toString("latin1");
    expect(raw).toMatch(/\/MediaBox \[0 0 595\.28 841\.89\]/);
    expect(raw.match(/\/Type \/Page[^s]/g) ?? []).toHaveLength(1);
  });

  it("embeds the typeface rather than naming it", () => {
    // `FontFile2` is an embedded TrueType program. Without it the document
    // renders in whatever the reader's viewer substitutes, which for a
    // monospaced ledger means the leaders stop lining up.
    const raw = rendered.toString("latin1");
    expect(raw).toContain("/FontFile2");
    // A Type0 font with a CIDFontType2 descendant, which is what PDFKit emits
    // for an embedded TrueType subset -- not `/Subtype /TrueType`, which the
    // first version of this test asserted and which is the simple-font form
    // PDFKit does not use.
    expect(raw).toContain("/Subtype /Type0");
    expect(raw).toContain("/Subtype /CIDFontType2");
    // Subset, not the whole 156 kB file twice over.
    expect(rendered.byteLength).toBeLessThan(120_000);
  });

  it("says what the certificate says", () => {
    // Decoded through the file's own ToUnicode CMap -- see `textOf`. This is
    // the assertion the row is for: a certificate that rendered blank, or
    // rendered somebody else's facts, fails here.
    const text = textOf(rendered);

    expect(text).toContain(CERTIFICATE_TITLE);
    expect(text).toContain("#4,102");
    expect(text).toContain("Jane Example");
    expect(text).toContain("worth every cent, regrettably");
    expect(text).toContain("Lousy Deal Pro");
    expect(text).toContain("$25.00");
    expect(text).toContain("2026-09-06");
    for (const label of Object.values(CERTIFICATE_LABELS)) expect(text).toContain(label);

    // The clause is the one string that wraps, and each wrapped line is its own
    // `TJ` run -- so it is compared with the line breaks collapsed. PDFKit
    // breaks at spaces, so collapsing whitespace reconstructs the sentence
    // exactly rather than approximately.
    expect(text.replace(/\s+/g, " ")).toContain(CERTIFICATE_CLAUSE);
  });
});

describe("the words on it", () => {
  // Asserted against the content module rather than the bytes, for the reason
  // above. What this catches is a layout that stopped drawing something, since
  // every string it sets comes from here and a removed call removes a string.
  it("takes every string from `content/certificate.ts`, and none of its own", () => {
    const source = CERTIFICATE_PDF_LAYOUTS[CERTIFICATE_LAYOUT_V1]?.toString() ?? "";

    expect(source).toContain("CERTIFICATE_TITLE");
    expect(source).toContain("CERTIFICATE_LABELS");
    expect(source).toContain("CERTIFICATE_CLAUSE");
    expect(source).toContain("NO_INSCRIPTION");
    // `brand.md` §4 is the authority for the wording; a literal here would be
    // a surface inventing brand, which constraint 12 forbids.
    expect(source).not.toContain(CERTIFICATE_TITLE);
    expect(source).not.toContain(CERTIFICATE_CLAUSE);
    expect(source).not.toContain(CERTIFICATE_LABELS.bearer);
    expect(source).not.toContain(NO_INSCRIPTION);
  });
});

describe("the layout it is drawn under", () => {
  it("refuses a version this build does not know, rather than drawing another", async () => {
    // Constraint 7, in the second medium. A fallback would hand somebody a
    // differently-designed copy of their own certificate.
    await expect(renderCertificatePdf({ ...ISSUED, layout: 2 })).rejects.toThrow(/not in this build/);
    await expect(renderCertificatePdf({ ...ISSUED, layout: 0 })).rejects.toThrow(/not in this build/);
  });

  it("has one entry today, keyed by the same version the page's registry uses", () => {
    expect(Object.keys(CERTIFICATE_PDF_LAYOUTS)).toEqual([String(CERTIFICATE_LAYOUT_V1)]);
  });
});

describe("an inscription the embedded font cannot set", () => {
  it("is replaced visibly rather than dropped invisibly", () => {
    // A browser falls back to another face; a PDF has only what it embedded,
    // and an unmapped codepoint draws as `.notdef` -- a gap that looks like
    // the buyer typed a space. Measured on these files: Latin, Latin
    // Extended, Greek, Cyrillic, punctuation and currency are present; CJK
    // and emoji are not.
    const font = { hasGlyphForCodePoint: (cp: number) => cp < 0x2100 };
    expect(supportedBy(font)("Jane Example")).toBe("Jane Example");
    expect(supportedBy(font)("Jane 李 Example")).toBe("Jane ? Example");
    expect(supportedBy(font)("🙂")).toBe("?");
  });

  it("counts a surrogate pair as one character, not two", () => {
    // Iterating a string by index would turn one emoji into two question
    // marks and mis-measure every line it appears on.
    const font = { hasGlyphForCodePoint: () => false };
    expect(supportedBy(font)("🙂🙂")).toBe("??");
  });

  it("reaches the renderer, which is the part a unit of it cannot prove", async () => {
    // The private `doc._font.font` access `certificate-pdf.ts` makes is the
    // link between the two, and a PDFKit upgrade that moves it would leave
    // `supportedBy` correct and unused. Rendering with an unsupported
    // character and comparing against the same document without one is what
    // notices: identical output would mean nothing was substituted.
    const text = textOf(await renderCertificatePdf({ ...ISSUED, displayName: "Jane 李" }));

    expect(text).toContain("Jane ?");
    expect(text).not.toContain("李");
  });
});

describe("what the document does not carry", () => {
  it("renders the no-inscription state, and no dedication, for a deal nobody inscribed", async () => {
    const text = textOf(await renderCertificatePdf({ ...ISSUED, displayName: null, dedication: null }));

    expect(text).toContain(NO_INSCRIPTION);
    expect(text).not.toContain("Jane Example");
    // The one element §5 and `brand.md` §4 allow to disappear.
    expect(text).not.toContain("worth every cent");
    // And nothing else went with it.
    expect(text).toContain("#4,102");
    expect(text).toContain("Lousy Deal Pro");
  });

  it("names the serial and not the slug anywhere in the file", () => {
    // §5: the serial is the certificate's name and the slug is its address.
    // The renderer is never given the slug -- `Certificate` has no field for
    // one -- and this asserts that stays true of the bytes.
    expect(Object.keys(ISSUED)).not.toContain("slug");
    expect(rendered.includes(Buffer.from("done-deals"))).toBe(false);
  });
});
