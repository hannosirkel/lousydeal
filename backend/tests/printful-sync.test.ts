/**
 * Reconciling the Printful store to `catalogue.ts`.
 *
 * Driven with a stub client, so the whole reconciliation — create, update,
 * leave alone, report an orphan — is exercised without touching Printful.
 * `printful-client.test.ts` covers the transport; nothing here retries.
 */

import { describe, expect, it } from "vitest";

import { MERCH_CATALOGUE } from "../src/modules/printful/catalogue";
import type { PrintfulClient } from "../src/modules/printful/client";
import { assertPinnedArtworkBase, syncMerchProducts } from "../src/modules/printful/sync";

const ART = "https://raw.githubusercontent.com/hannosirkel/lousydeal/0123456789abcdef0123456789abcdef01234567/design/merch/print-files";

interface Sent {
  readonly method: string;
  readonly path: string;
  readonly body: unknown;
}

/** A Printful whose store contents a test declares. */
function store(products: ReadonlyArray<{ id: number; handle: string; name: string; variants?: unknown[] }>) {
  const sent: Sent[] = [];
  const client: PrintfulClient = {
    request: <T,>(method: string, path: string, body?: unknown): Promise<T> => {
      sent.push({ method, path, body });
      if (method === "GET" && path.startsWith("/store/products?")) {
        return Promise.resolve({
          result: products.map(({ id, handle, name }) => ({ id, external_id: handle, name })),
        } as T);
      }
      if (method === "GET") {
        const id = Number(path.split("/").pop());
        const product = products.find((candidate) => candidate.id === id)!;
        return Promise.resolve({
          result: { sync_product: { id, external_id: product.handle, name: product.name }, sync_variants: product.variants ?? [] },
        } as T);
      }
      return Promise.resolve({ result: { id: 1 } } as T);
    },
  };
  return { client, sent };
}

/** What Printful would return for a product that already matches the table. */
const inAgreement = (handle: string) => {
  const product = MERCH_CATALOGUE.find((candidate) => candidate.handle === handle)!;
  return product.variants.map((variant) => ({
    id: variant.printfulVariantId,
    variant_id: variant.printfulVariantId,
    retail_price: (product.retailPrice / 100).toFixed(2),
    files: [{ type: product.placement, url: `${ART}/${product.printFile.file}` }],
  }));
};

describe("the artwork base, which is where a print file lives for ever", () => {
  it("accepts a commit-pinned raw URL", () => {
    expect(() => { assertPinnedArtworkBase(ART); }).not.toThrow();
  });

  it("refuses a branch, because artwork must not change under a placed order", () => {
    // The failure this prevents is quiet and permanent: a buyer receives a
    // shirt printed from bytes this repository can no longer produce, because
    // the URL that named them now resolves to something else.
    for (const url of [
      "https://raw.githubusercontent.com/hannosirkel/lousydeal/main/design/merch/print-files",
      "https://raw.githubusercontent.com/hannosirkel/lousydeal/v1.0/design/merch/print-files",
      "https://example.test/print-files",
      "https://raw.githubusercontent.com/hannosirkel/lousydeal/0123456/design/merch/print-files",
    ]) {
      expect(() => { assertPinnedArtworkBase(url); }, url).toThrow(/commit-pinned/);
    }
  });

  it("refuses before it reads the store, so a bad base cannot half-run", () => {
    const { client, sent } = store([]);
    return expect(syncMerchProducts(client, { artworkBaseUrl: "https://example.test" }))
      .rejects.toThrow(/commit-pinned/)
      .then(() => { expect(sent).toEqual([]); });
  });
});

describe("running it against an empty store", () => {
  it("creates all four, and nothing else", async () => {
    const { client, sent } = store([]);
    const result = await syncMerchProducts(client, { artworkBaseUrl: ART });

    expect(result.created).toEqual(MERCH_CATALOGUE.map((product) => product.handle));
    expect(result.updated).toEqual([]);
    expect(result.unchanged).toEqual([]);
    expect(sent.filter((call) => call.method === "POST")).toHaveLength(4);
    expect(sent.filter((call) => call.method === "PUT")).toHaveLength(0);
  });

  it("sets external_id to the handle, which is what makes a second run idempotent", async () => {
    // Printful assigns its own when none is given -- the four products created
    // by hand on 2026-09-08 carry values like `6aa0168fc91b89`, which match
    // nothing and say nothing. This is the join.
    const { client, sent } = store([]);
    await syncMerchProducts(client, { artworkBaseUrl: ART });

    const posted = sent.filter((call) => call.method === "POST").map((call) => call.body as { sync_product: { external_id: string } });
    expect(posted.map((payload) => payload.sync_product.external_id)).toEqual(
      MERCH_CATALOGUE.map((product) => product.handle),
    );
  });

  it("sends the catalogue's variant, price and artwork, and no other price", async () => {
    const { client, sent } = store([]);
    await syncMerchProducts(client, { artworkBaseUrl: ART });

    const tee = sent.find(
      (call) => call.method === "POST" && (call.body as { sync_product: { external_id: string } }).sync_product.external_id === "original-purchase-receipt",
    )!.body as { sync_variants: ReadonlyArray<{ variant_id: number; retail_price: string; files: ReadonlyArray<{ type: string; url: string }> }> };

    expect(tee.sync_variants).toHaveLength(6);
    expect(tee.sync_variants.map((variant) => variant.variant_id)).toEqual([473, 504, 535, 566, 597, 628]);
    expect([...new Set(tee.sync_variants.map((variant) => variant.retail_price))]).toEqual(["32.00"]);
    expect(tee.sync_variants[0]?.files).toEqual([{ type: "front", url: `${ART}/tee-front.png` }]);
  });
});

describe("running it twice", () => {
  it("changes nothing the second time", async () => {
    // The property the plan asks for in as many words: run it twice, get four
    // products, not eight.
    const stocked = MERCH_CATALOGUE.map((product, index) => ({
      id: 100 + index,
      handle: product.handle,
      name: product.title,
      variants: inAgreement(product.handle),
    }));
    const { client, sent } = store(stocked);
    const result = await syncMerchProducts(client, { artworkBaseUrl: ART });

    expect(result.unchanged).toEqual(MERCH_CATALOGUE.map((product) => product.handle));
    expect(result.created).toEqual([]);
    expect(result.updated).toEqual([]);
    expect(sent.filter((call) => call.method !== "GET")).toEqual([]);
  });
});

describe("reconciling, which is why this is not just a create script", () => {
  const stockedWith = (handle: string, variants: unknown[]) =>
    MERCH_CATALOGUE.map((product, index) => ({
      id: 100 + index,
      handle: product.handle,
      name: product.title,
      variants: product.handle === handle ? variants : inAgreement(product.handle),
    }));

  it("updates a product whose price has moved in the table", async () => {
    // The drift the review warned about, in the direction that matters: a
    // stale price on a real shelf, changed in the repository and not in
    // Printful, with nothing to notice it.
    const stale = inAgreement("this-mug-cost-extra").map((variant) => ({ ...variant, retail_price: "12.00" }));
    const { client, sent } = store(stockedWith("this-mug-cost-extra", stale));
    const result = await syncMerchProducts(client, { artworkBaseUrl: ART });

    expect(result.updated).toEqual(["this-mug-cost-extra"]);
    expect(result.unchanged).toHaveLength(3);
    expect(sent.filter((call) => call.method === "PUT")).toHaveLength(1);
  });

  it("updates a product whose artwork has moved to a new commit", async () => {
    const old = inAgreement("certified-worthless").map((variant) => ({
      ...variant,
      files: [{ type: "default", url: "https://raw.githubusercontent.com/hannosirkel/lousydeal/ffffffffffffffffffffffffffffffffffffffff/design/merch/print-files/sticker.png" }],
    }));
    const { client } = store(stockedWith("certified-worthless", old));
    const result = await syncMerchProducts(client, { artworkBaseUrl: ART });
    expect(result.updated).toEqual(["certified-worthless"]);
  });

  it("updates a product printed on a different blank", async () => {
    const wrong = inAgreement("lousy-deals-trucker-cap").map((variant) => ({ ...variant, variant_id: 4816 }));
    const { client } = store(stockedWith("lousy-deals-trucker-cap", wrong));
    expect((await syncMerchProducts(client, { artworkBaseUrl: ART })).updated).toEqual(["lousy-deals-trucker-cap"]);
  });

  it("updates a product that has lost a size", async () => {
    const short = inAgreement("original-purchase-receipt").slice(0, 4);
    const { client } = store(stockedWith("original-purchase-receipt", short));
    expect((await syncMerchProducts(client, { artworkBaseUrl: ART })).updated).toEqual(["original-purchase-receipt"]);
  });

  it("updates a product that has gained a variant nobody put in the table", async () => {
    // **Found by mutation.** The "lost a size" case above is caught by the
    // per-variant lookup, so the length comparison looked redundant. It is not:
    // a size added in Printful's dashboard leaves every table variant present
    // and correct, and only the count disagrees. Without it, a shelf could
    // offer a 4XL this repository has never priced.
    const extra = [
      ...inAgreement("original-purchase-receipt"),
      { id: 9999, variant_id: 9999, retail_price: "32.00", files: [{ type: "front", url: `${ART}/tee-front.png` }] },
    ];
    const { client } = store(stockedWith("original-purchase-receipt", extra));
    expect((await syncMerchProducts(client, { artworkBaseUrl: ART })).updated).toEqual(["original-purchase-receipt"]);
  });

  it("updates a renamed product", async () => {
    const stocked = MERCH_CATALOGUE.map((product, index) => ({
      id: 100 + index,
      handle: product.handle,
      name: product.handle === "this-mug-cost-extra" ? "Old Mug Name" : product.title,
      variants: inAgreement(product.handle),
    }));
    const { client } = store(stocked);
    expect((await syncMerchProducts(client, { artworkBaseUrl: ART })).updated).toEqual(["this-mug-cost-extra"]);
  });

  it("treats Printful's own placement name as agreement, because it renames ours", async () => {
    // **Both of these were found by a live run, not by this file**, and this
    // file passed before and after the fix until these two cases were added.
    //
    // Printful normalises the placement it is sent. The shirt is created with
    // `front` and stored as `default`; the cap's `front_dtf_hat` survives.
    // Comparing what we sent against what it kept compares our vocabulary to
    // theirs, so every run reported a change and tried to write — and the
    // write then failed, which is the only reason it was noticed at all.
    const renamed = inAgreement("original-purchase-receipt").map((variant) => ({
      ...variant,
      files: [{ type: "default", url: `${ART}/tee-front.png` }],
    }));
    const { client, sent } = store(stockedWith("original-purchase-receipt", renamed));
    const result = await syncMerchProducts(client, { artworkBaseUrl: ART });

    expect(result.unchanged).toContain("original-purchase-receipt");
    expect(sent.filter((call) => call.method === "PUT")).toEqual([]);
  });

  it("carries each existing sync variant's id on an update", async () => {
    // Without it Printful reads every variant in the payload as a new one and
    // refuses the whole request: "Variant with this external_id already exists
    // in store. External_id: LD-TEE-S". A second run against a populated store
    // failed outright.
    const stale = inAgreement("original-purchase-receipt").map((variant, index) => ({
      ...variant,
      id: 900 + index,
      retail_price: "28.00",
    }));
    const { client, sent } = store(stockedWith("original-purchase-receipt", stale));
    await syncMerchProducts(client, { artworkBaseUrl: ART });

    const put = sent.find((call) => call.method === "PUT")!.body as {
      sync_variants: ReadonlyArray<{ id?: number; variant_id: number }>;
    };
    expect(put.sync_variants.map((variant) => variant.id)).toEqual([900, 901, 902, 903, 904, 905]);
  });

  it("omits the id for a variant Printful does not hold yet", async () => {
    // A size added to the table after the product exists: there is no sync
    // variant to update, so it must be sent as a creation.
    const partial = inAgreement("original-purchase-receipt")
      .slice(0, 3)
      .map((variant, index) => ({ ...variant, id: 900 + index }));
    const { client, sent } = store(stockedWith("original-purchase-receipt", partial));
    await syncMerchProducts(client, { artworkBaseUrl: ART });

    const put = sent.find((call) => call.method === "PUT")!.body as {
      sync_variants: ReadonlyArray<{ id?: number }>;
    };
    expect(put.sync_variants.map((variant) => variant.id)).toEqual([900, 901, 902, undefined, undefined, undefined]);
  });

  it("ignores fields Printful adds and the table does not have", async () => {
    // Thumbnails, mockup urls and timestamps come back on every detail read.
    // Comparing them would make every run report an update, which would make
    // the report useless and the writes constant.
    const noisy = inAgreement("this-mug-cost-extra").map((variant) => ({
      ...variant,
      name: "Printful's own name",
      synced: true,
      product: { image: "https://files.cdn.printful.com/x.png" },
      files: [
        { type: "preview", url: "https://files.cdn.printful.com/preview.png" },
        ...variant.files,
      ],
    }));
    const { client } = store(stockedWith("this-mug-cost-extra", noisy));
    expect((await syncMerchProducts(client, { artworkBaseUrl: ART })).unchanged).toHaveLength(4);
  });
});

describe("what it refuses to do", () => {
  it("reports a product the table does not know about, and does not delete it", async () => {
    // Deleting is a decision with an order history attached to it. The four
    // products LD-04 created by hand carry Printful's own external ids, so
    // this is exactly what a first real run will report.
    const stocked = [
      ...MERCH_CATALOGUE.map((product, index) => ({
        id: 100 + index,
        handle: product.handle,
        name: product.title,
        variants: inAgreement(product.handle),
      })),
      { id: 999, handle: "6aa0168fc91b89", name: "Original Purchase Receipt", variants: [] },
    ];
    const { client, sent } = store(stocked);
    const result = await syncMerchProducts(client, { artworkBaseUrl: ART });

    expect(result.unrecognised).toEqual(["999 Original Purchase Receipt"]);
    expect(sent.filter((call) => call.method === "DELETE")).toEqual([]);
  });

  it("writes nothing on a dry run, and reports the same answer", async () => {
    const { client, sent } = store([]);
    const result = await syncMerchProducts(client, { artworkBaseUrl: ART, dryRun: true });

    expect(result.created).toHaveLength(4);
    expect(sent.every((call) => call.method === "GET")).toBe(true);
  });
});
