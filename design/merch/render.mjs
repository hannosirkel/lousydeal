/**
 * The four print files, rendered at Printful's exact sizes.
 *
 * **The dependency is not settled and this file says so rather than pretending
 * otherwise.** A headless browser is the only renderer here that can lay out
 * the site's own woff2 at print sizes, and it is ~150MB of devDependency for
 * four files that change rarely. So Playwright is resolved from an environment
 * variable rather than installed: LD-04's P2 takes the decision in the open,
 * and until it does, this runs against whatever browser the machine already
 * has.
 *
 *   PLAYWRIGHT=/path/to/node_modules/playwright/index.mjs \
 *   OUT=design/merch/print-files node design/merch/render.mjs
 *
 * Nothing in the application imports this. It is a design tool that writes
 * build artefacts, and the artefacts are committed because Printful fetches
 * them by URL -- there is no route that hands it bytes.
 */

const PLAYWRIGHT = process.env.PLAYWRIGHT;
if (!PLAYWRIGHT) throw new Error("set PLAYWRIGHT to a playwright index.mjs; see this file's header");
const { chromium } = await import(PLAYWRIGHT);
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const REPO = new URL("../..", import.meta.url).pathname;
const OUT = process.env.OUT ?? new URL("./print-files", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const font = (f) => readFileSync(`${REPO}storefront/src/fonts/${f}`).toString("base64");
const REG = font("LDMono-Regular.woff2");
const BOLD = font("LDMono-Bold.woff2");

const INK = "#141412";
const STAMP = "#b3261e";
// Pure white, not --paper, for the one file that reverses out of black: a RIP
// given #fafaf7 lays white ink plus a faint tint pass, which looks dirty on a
// black cap. On fabric this is indistinguishable from paper.
const REVERSE = "#ffffff";

// One tracking token for labels, matching --tracking-label, and one documented
// display value for a masthead set four times larger than any label. The first
// draft used seven ad-hoc values.
const TRACK = "0.08em";
const TRACK_DISPLAY = "0.05em";

const shell = (w, h, body, css = "", just = "center") => `
<style>
@font-face{font-family:LD;src:url(data:font/woff2;base64,${REG})format("woff2");font-weight:400}
@font-face{font-family:LD;src:url(data:font/woff2;base64,${BOLD})format("woff2");font-weight:700}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${w}px;height:${h}px;background:transparent}
body{font-family:LD,monospace;font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased}
.sheet{width:${w}px;height:${h}px;display:flex;flex-direction:column;justify-content:${just};align-items:center}
${css}
</style>
<div class="sheet">${body}</div>`;

/* ---------------- 1. T-shirt: a till receipt, tall and narrow -------------
   1800x2400 @150dpi = 12in x 16in.
   The first draft set an 11.2in-wide block centred vertically: it read as a
   spreadsheet, and its top edge sat 4in down the print area, which puts a
   masthead at mid-torso. Now 7.5in wide, top-aligned 1in in. Narrowness is
   half of why a receipt is funny.                                          */
const row = (label, value, colour = INK) => `
  <div class="row"><span class="lbl">${label}</span><span class="lead"></span><span class="val" style="color:${colour}">${value}</span></div>`;

const tee = shell(1800, 2400, `
  <div class="receipt">
    <div class="mast">LOUSYDEAL.COM</div>
    <div class="rule double"></div>
    <div class="sub">ORIGINAL PURCHASE</div>
    <div class="rule"></div>
    <div class="rows">
      ${row("ITEM", "NOTHING")}
      ${row("PRICE", "$5.00")}
      ${row("VALUE", "$0.00")}
      ${row("ROI", "-100%", STAMP)}
    </div>
    <div class="rule"></div>
    ${row("STATUS", "COMPLETED")}
    <div class="rule double"></div>
  </div>`, `
  .receipt{width:1125px;color:${INK};padding-top:150px}
  .mast{font-weight:700;font-size:96px;letter-spacing:${TRACK_DISPLAY};text-align:center;padding-bottom:32px}
  .sub{font-size:44px;letter-spacing:${TRACK};text-align:center;padding:28px 0;color:${INK}}
  .rule{height:5px;background:${INK}}
  .rule.double{height:5px;box-shadow:0 14px 0 ${INK}}
  .rows{padding:64px 0 20px}
  .row{display:flex;align-items:baseline;gap:22px;padding:30px 0}
  /* §3's two-step rule: the label is the quieter half. */
  .lbl{font-size:52px;letter-spacing:${TRACK}}
  .val{font-size:70px;font-weight:700;letter-spacing:0.02em}
  /* 8px = 0.053in at 150dpi, above DTG's ~1mm detail floor with margin. */
  .lead{flex:1 1 auto;border-bottom:8px dotted ${INK};transform:translateY(-16px)}
  .rows + .rule{margin-top:22px}
  .row:last-of-type{padding:32px 0}`, "flex-start");

/* ---------------- 2. Mug: 2700x1050 @300dpi -------------------------------
   The two ends meet at the handle, so blocks centred at 25% and 75% sit 90
   degrees either side of it. Sentence case, not caps: brand.md's Never list
   has "ALL-CAPS shouting outside the label style", and this is a sentence,
   not a label. Padding keeps the first glyph clear of the handle seam.    */
const mugBlock = `
  <div class="block">
    <div class="l1">I paid $5 for nothing.</div>
    <div class="l2">This mug cost extra.</div>
  </div>`;
const mug = shell(2700, 1050, `<div class="wrap">${mugBlock}${mugBlock}</div>`, `
  .wrap{width:2700px;height:1050px;display:flex}
  .block{flex:1 1 50%;display:flex;flex-direction:column;justify-content:center;align-items:center;color:${INK}}
  .l1,.l2{white-space:nowrap;font-size:78px;letter-spacing:0;text-align:center}
  .l1{font-weight:700;padding-bottom:32px}`);

/* ---------------- 3. Cap: 1890x765 @300dpi, reversed out of black ---------
   Rebuilt. The first draft was the only piece with no rule, no ledger and no
   label style -- two centred lines with the URL louder than the statement,
   which reads as an ad footer. Rules above and below, both lines bold and
   equal, and held to 4.5in so the ends stay off the panel's curve.        */
const cap = shell(1890, 765, `
  <div class="cap">
    <div class="rule double"></div>
    <div class="c">I make my Lousy Deals</div>
    <div class="c">at lousydeal.com</div>
    <div class="rule doubleup"></div>
  </div>`, `
  .cap{width:1260px;text-align:center;color:${REVERSE}}
  .c{white-space:nowrap;font-weight:700;font-size:104px;letter-spacing:0.01em;padding:6px 0}
  .rule{height:5px;background:${REVERSE}}
  .rule.double{margin-bottom:52px;box-shadow:0 14px 0 ${REVERSE}}
  .rule.doubleup{margin-top:52px;box-shadow:0 -14px 0 ${REVERSE}}`);

/* ---------------- 4. Sticker: 1200x1200 @300dpi ---------------------------
   Scaled up: the first draft printed 3.4 x 3.1in on a 4in sticker and was not
   square. Now 1080px (3.6in) with 60px of margin for the cutter.
   CERTIFIED WORTHLESS becomes the StampMark rather than free-floating red
   caps -- --stamp's licensed list includes the stamp mark and does not
   include loose red text, and a sticker is the one surface where a stamp is
   doing its actual job.                                                    */
const stampMark = (lines) => {
  const lh = 15, first = ((lines.length - 1) * lh) / 2;
  return `<svg class="stamp" viewBox="0 0 120 120">
    <circle cx="60" cy="60" r="57"></circle><circle cx="60" cy="60" r="51"></circle>
    ${lines.map((l, i) => `<text x="60" y="${60 - first + i * lh}" text-anchor="middle">${l}</text>`).join("")}
  </svg>`;
};
const sticker = shell(1200, 1200, `
  <div class="st">
    <div class="dom">LOUSYDEAL.COM</div>
    <div class="r"></div>
    <div class="cap2">VALUE</div>
    <div class="fig">$0.00</div>
    <div class="r"></div>
    ${stampMark(["Certified", "worthless"])}
  </div>`, `
  .st{width:1080px;color:${INK};text-align:center;border:10px solid ${INK};padding:96px 56px 66px;position:relative}
  .dom{font-weight:700;font-size:78px;letter-spacing:${TRACK_DISPLAY};padding-bottom:34px}
  .r{height:5px;background:${INK}}
  .cap2{font-size:44px;letter-spacing:${TRACK};color:${INK};padding:48px 0 10px}
  .fig{font-weight:700;font-size:248px;letter-spacing:0.02em;padding-bottom:44px}
  .stamp{width:300px;height:300px;fill:none;stroke:${STAMP};stroke-width:1.5;
         display:block;margin:-104px auto 0;background:transparent}
  .stamp text{fill:${STAMP};stroke:none;font-size:11px;font-weight:700;
              letter-spacing:${TRACK};text-transform:uppercase}`);

const jobs = [
  ["tee-front", tee, 1800, 2400],
  ["mug-wrap", mug, 2700, 1050],
  ["cap-front", cap, 1890, 765],
  ["sticker", sticker, 1200, 1200],
];

const b = await chromium.launch();
for (const [name, html, w, h] of jobs) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.setContent(html);
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: `${OUT}/${name}.png`, omitBackground: true });
  await p.close();
}

/* Measure what was actually drawn, in inches, rather than trusting the CSS. */
const measure = async (page, file, w, h, dpi) => {
  await page.setContent(`<body style="margin:0"><img id="i" src="data:image/png;base64,${
    readFileSync(`${OUT}/${file}`).toString("base64")}"></body>`);
  return page.evaluate(async ([w, h, dpi]) => {
    const img = document.getElementById("i");
    await img.decode();
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const x = c.getContext("2d");
    x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let px = 0; px < w; px++) {
      if (d[(y * w + px) * 4 + 3] > 8) {
        if (px < x0) x0 = px; if (px > x1) x1 = px;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    const inch = (n) => (n / dpi).toFixed(2);
    return `${inch(x1 - x0 + 1)}in x ${inch(y1 - y0 + 1)}in, top edge ${inch(y0)}in, left ${inch(x0)}in`;
  }, [w, h, dpi]);
};
const mp = await b.newPage({ viewport: { width: 400, height: 400 } });
for (const [name, , w, h, dpi] of [["tee-front", 0, 1800, 2400, 150], ["mug-wrap", 0, 2700, 1050, 300],
                                   ["cap-front", 0, 1890, 765, 300], ["sticker", 0, 1200, 1200, 300]]) {
  console.log(`${name.padEnd(12)} ${await measure(mp, name + ".png", w, h, dpi)}`);
}
await mp.close();

const png = (n) => "data:image/png;base64," + readFileSync(`${OUT}/${n}.png`).toString("base64");
const sheet = `
<style>body{background:#e8e8e4;font-family:system-ui;margin:0;padding:40px}
h2{font:600 13px/1 ui-monospace;letter-spacing:.1em;text-transform:uppercase;color:#666;margin:32px 0 12px}
.tile{background:#fff;display:inline-block;padding:24px;border:1px solid #ccc}
.dark{background:#111}
img{display:block}</style>
<h2>T-shirt front — white cotton, full 12x16in print area shown</h2>
<div class="tile"><img src="${png("tee-front")}" style="width:440px"></div>
<h2>Mug wrap — 11oz, both halves; the ends meet at the handle</h2>
<div class="tile"><img src="${png("mug-wrap")}" style="width:900px"></div>
<h2>Cap front — reversed out of a black cap</h2>
<div class="tile dark"><img src="${png("cap-front")}" style="width:620px"></div>
<h2>Sticker — 4x4in kiss-cut</h2>
<div class="tile"><img src="${png("sticker")}" style="width:360px"></div>`;
writeFileSync(`${process.env.SHEET ?? OUT}/sheet.html`, sheet);
const p = await b.newPage({ viewport: { width: 1100, height: 2000 }, deviceScaleFactor: 2 });
await p.goto("file://" + (process.env.SHEET ?? OUT) + "/sheet.html");
await p.screenshot({ path: `${process.env.SHEET ?? OUT}/sheet.png`, fullPage: true });
await b.close();
