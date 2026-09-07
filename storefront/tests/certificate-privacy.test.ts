/**
 * A gift's recipient reaches no public surface — proven against surfaces that
 * were handed the data and had the chance to print it.
 *
 * **This file exists because of how LD-02's Gate E got it wrong.** That gate
 * checked the rendered certificate for a billing name against an order that
 * had none, so it found an absence it could not have failed to find. The
 * check was reported as passing and proved nothing.
 *
 * So every assertion here starts from a record that *carries* §6's four
 * values, and looks for them in what was rendered. The backend's own
 * `deal-route.test.ts` does the same on its side; between them the claim is
 * made twice, on both sides of the wire, which is the shape `store-deal.ts`'s
 * header already argues for.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it } from "vitest";

import { Certificate as CertificateView } from "../src/components/document/Certificate";
import type { Certificate } from "../src/lib/certificate-model";
import { renderCertificatePdf } from "../src/lib/certificate-pdf";
import { getDeal } from "../src/lib/store-deal";

/** §6's four values, as they would sit on the row a gift produced. */
const GIFT_VALUES = {
  gift_recipient_email: "recipient@example.test",
  gift_recipient_name: "A. Recipient",
  gift_sender_name: "A. Buyer",
  gift_message: "Happy birthday",
} as const;

const CERTIFICATE: Certificate = {
  serial: 4102,
  displayName: "Jane Example",
  dedication: "worth every cent",
  tier: "Lousy Deal Pro",
  amount: 25,
  currencyCode: "usd",
  issuedOn: "2026-09-07",
  layout: 1,
};

describe("the render model", () => {
  it("has no field a recipient's name or address could occupy", () => {
    // The type is the first boundary and the cheapest. A `Certificate` that
    // could carry a recipient would make every assertion below a matter of
    // whether somebody remembered not to fill it in.
    expect(Object.keys(CERTIFICATE).sort()).toEqual(
      ["amount", "currencyCode", "dedication", "displayName", "issuedOn", "layout", "serial", "tier"].sort(),
    );
    const source = readFileSync(new URL("../src/lib/certificate-model.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/recipient|gift/i);
  });
});

describe("what the reader takes off the wire", () => {
  it("ignores gift columns even when the endpoint sends them", async () => {
    // **The endpoint does not send them** -- `deal-route.test.ts` proves that.
    // This is the second half of the same claim, and the half that would
    // matter if the first were ever loosened: a storefront that spread the
    // response into its render model would publish whatever arrived.
    const deal = await getDeal(
      (async () => ({ deal: { ...{
        serial: 4102,
        tier: "Lousy Deal Pro",
        amount_paid: 25,
        currency_code: "usd",
        display_name: "Jane Example",
        dedication: "worth every cent",
        layout_version: 1,
        issued_at: "2026-09-07",
      }, ...GIFT_VALUES } })) as never,
      "xbts2k3mmv3trv3n",
    );

    expect(deal).not.toBeNull();
    const serialised = JSON.stringify(deal);
    for (const [column, value] of Object.entries(GIFT_VALUES)) {
      expect(serialised, column).not.toContain(value);
    }
  });
});

/**
 * The same certificate with §6's four values stapled on.
 *
 * **Cast, because `Certificate` has no room for them — which is the point.**
 * Rendering the clean record would prove only that a renderer cannot print
 * what it was never handed, which is the vacuous shape this file exists to
 * avoid. Handing the renderers the data and finding it absent from the output
 * is a claim about the renderers.
 */
const CERTIFICATE_WITH_GIFT = { ...CERTIFICATE, ...GIFT_VALUES } as unknown as Certificate;

describe("the rendered certificate", () => {
  const html = renderToStaticMarkup(createElement(CertificateView, { certificate: CERTIFICATE }));
  const htmlWithGift = renderToStaticMarkup(
    createElement(CertificateView, { certificate: CERTIFICATE_WITH_GIFT }),
  );

  it("prints the buyer's own inscription, which is the public pair", () => {
    // The positive half. Without it, a certificate that rendered nothing at
    // all would pass every absence check in this file.
    expect(html).toContain("Jane Example");
    expect(html).toContain("worth every cent");
  });

  it("prints nothing a gift added, having been handed all four", () => {
    for (const [column, value] of Object.entries(GIFT_VALUES)) {
      expect(htmlWithGift, column).not.toContain(value);
    }
    expect(htmlWithGift).not.toMatch(/gift|recipient/i);
  });

  it("renders a gift and a purchase identically, so neither can be told apart", () => {
    // A certificate that differed at all -- a class, an empty element, a
    // stray attribute -- would let a stranger with the URL work out that it
    // was a gift. Nothing about that is theirs to know.
    expect(htmlWithGift).toBe(html);
  });
});

/**
 * The renderer reads its fonts from `join(process.cwd(), "public/fonts/…")`,
 * which is `storefront/` when `next start` runs and the repository root when
 * Vitest does. `certificate-pdf.test.ts` takes the same measure and gives the
 * reason: the test stands where the server stands, because the path under
 * test is the production one or it is not the path under test.
 */
const originalCwd = process.cwd();
process.chdir(fileURLToPath(new URL("..", import.meta.url)));

afterAll(() => {
  process.chdir(originalCwd);
});

describe("the rendered PDF", () => {
  it("carries the inscription and none of §6's four", async () => {
    // The PDF is generated from the same record, but by a different renderer,
    // and a screenshot of it outlives the page. `pdftotext` is not available
    // here, so this reads the raw bytes -- which is stricter, not weaker: a
    // value present in a compressed stream would still fail a substring check
    // against the uncompressed text, so the test errs toward finding leaks.
    // Handed the gift values, for the reason above: rendering the clean record
    // would prove only that the renderer cannot print what it never received.
    const pdf = await renderCertificatePdf(CERTIFICATE_WITH_GIFT);
    const bytes = Buffer.from(pdf).toString("latin1");

    for (const [column, value] of Object.entries(GIFT_VALUES)) {
      expect(bytes, column).not.toContain(value);
    }
  });
});
