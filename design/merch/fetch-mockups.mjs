/**
 * The four product photographs, fetched once and committed.
 *
 * **Not the mockup generator.** The review expected `POST /mockup-generator`
 * with task polling, rate limits and URLs that expire in a day. Measured
 * against the live store on 2026-09-10, none of that is needed: a synced
 * product already carries a `preview` file per variant, and its `preview_url`
 * is a real on-garment photograph of this artwork on this blank — the shirt
 * with the receipt printed on it, the black cap with the line reversed out.
 * `sync.ts` produced them as a side effect of creating the products and P5's
 * record was right that "mockups come free" on the sync path.
 *
 * **Fetched once, when a product is added, and not again** — the operator's
 * condition on admitting photographs at all (`brand.md` §6, amended
 * 2026-09-10). A page that regenerates its own illustrations is a page whose
 * appearance nobody has approved. So this is a tool somebody runs, like
 * `render.mjs` beside it, and never something the site does.
 *
 * It is also why the files are committed rather than hotlinked: `brand.md`
 * §6's admission says the site loads nothing from anybody else's server, and
 * Printful's CDN URLs are not promised to outlive the product.
 *
 *   PRINTFUL_API_TOKEN=... node design/merch/fetch-mockups.mjs
 *
 * Writes `storefront/public/goods/<handle>.png`, one per product, named by the
 * handle the storefront already routes on — so nothing has to store a URL.
 */

import { writeFileSync, mkdirSync } from "node:fs";

const TOKEN = process.env.PRINTFUL_API_TOKEN;
if (!TOKEN) throw new Error("set PRINTFUL_API_TOKEN; see this file's header");

const OUT = new URL("../../storefront/public/goods/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const api = async (path) => {
  const response = await fetch(`https://api.printful.com${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!response.ok) throw new Error(`GET ${path} -> ${String(response.status)}`);
  return response.json();
};

const { result: products } = await api("/store/products?limit=50");

for (const summary of products) {
  const { result } = await api(`/store/products/${String(summary.id)}`);
  const handle = result.sync_product?.external_id;
  // `sync.ts` sets `external_id` to the handle. A product without one is not
  // this shop's, and guessing a filename for it would put somebody else's
  // photograph on a page.
  if (typeof handle !== "string" || handle.length === 0) {
    console.log(`  skipped ${String(summary.name)}: no external id`);
    continue;
  }

  // The first variant's preview. Every variant of one product carries the same
  // artwork on the same blank -- the sizes differ and the photograph does not.
  const preview = (result.sync_variants ?? [])
    .flatMap((variant) => variant.files ?? [])
    .find((file) => file.type === "preview" && typeof file.preview_url === "string");

  if (preview === undefined) {
    console.log(`  MISSING ${handle}: no preview file; the page will show nothing`);
    continue;
  }

  // A browser user agent, because the CDN refuses the default one -- measured,
  // not guessed: it answers 403 to Node's own.
  const image = await fetch(preview.preview_url, { headers: { "user-agent": "Mozilla/5.0" } });
  if (!image.ok) throw new Error(`${handle}: preview -> ${String(image.status)}`);

  const bytes = Buffer.from(await image.arrayBuffer());
  writeFileSync(`${OUT}${handle}.png`, bytes);
  console.log(`  ${handle}.png  ${String(Math.round(bytes.length / 1024))} KB`);
}
