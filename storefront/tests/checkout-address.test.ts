/**
 * The address block, rendered.
 *
 * **It renders the real component**, for the reason `checkout-consent.test.ts`
 * gives at its own head: V6b declared the pay gate's rule inside its test and
 * asserted that, and Gate D then defaulted the consent box to ticked and
 * deleted the gate from `PaymentForm` entirely, with all 295 tests passing.
 * `shipping-address.test.ts` holds the rules; this holds the markup.
 */

import { readFileSync } from "node:fs";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ADDRESS_HEADING, ADDRESS_LABELS, ADDRESS_NOTE, SHIPPING_LABEL, SHIPPING_PENDING_NOTICE } from "../src/content/checkout";
import { PayButton } from "../src/app/checkout/PaymentForm";
import type { FetchJson } from "../src/lib/medusa-client";

vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: unknown }) => children,
  PaymentElement: () => createElement("div"),
  useStripe: () => ({}),
  useElements: () => ({}),
}));
vi.mock("@stripe/stripe-js", () => ({ loadStripe: () => Promise.resolve(null) }));

const render = (needsAddress: boolean, countries = [{ iso_2: "ee", display_name: "Estonia" }]) =>
  renderToStaticMarkup(
    createElement(PayButton, {
      cartId: "cart_1",
      fetchJson: (() => Promise.resolve({})) as unknown as FetchJson,
      countries,
      needsAddress,
      needsConsent: true,
      currencyCode: "usd",
    }),
  );

describe("a cart with nothing to post", () => {
  it("shows no address block at all", () => {
    // Not a disabled block, not a collapsed one: absent. A form that asked
    // everyone for a postcode in order to sell them a PDF would be collecting
    // data the shop does not need — the principle LD-02 applied to the
    // certificate's own fields and LD-03 to the gift's.
    const html = render(false);
    expect(html).not.toContain(ADDRESS_HEADING);
    expect(html).not.toContain(ADDRESS_NOTE);
    // Asserted on the ids, not the labels. "Name" is legitimately elsewhere on
    // this form -- the gift block asks for two of them -- so a label is copy
    // that may appear twice, and an id is the thing that cannot.
    for (const field of Object.keys(ADDRESS_LABELS)) expect(html).not.toContain(`checkout-address-${field}`);
  });

  it("shows no postage row, because there is no postage", () => {
    expect(render(false)).not.toContain(SHIPPING_LABEL);
  });

  it("still offers the country field, which resolves a tax region", () => {
    // A certificate ships nowhere, and the country stands in for an address
    // without being one. That is unchanged by this slice.
    expect(render(false)).toContain("checkout-country");
  });
});

describe("a cart with a parcel in it", () => {
  it("asks for the four fields every address needs", () => {
    const html = render(true);
    expect(html).toContain(ADDRESS_HEADING);
    for (const field of ["name", "line1", "city", "postcode"] as const) {
      expect(html).toContain(`checkout-address-${field}`);
      expect(html).toContain(ADDRESS_LABELS[field]);
    }
  });

  it("says why it is asked for, and who receives it, before it is given", () => {
    // The shape `INSCRIPTION_NOTE` and the gift note both take. Printful is a
    // processor, and a buyer is owed that before they type rather than in a
    // policy they have to go and find.
    expect(render(true)).toContain(ADDRESS_NOTE);
  });

  it("labels every field, and marks every one required", () => {
    // **Counting `required` was not enough**, and mutation showed it: the
    // consent box and the country select carry one too, so removing it from
    // all four address inputs still left the count above the threshold. Each
    // input is now checked on its own tag.
    const html = render(true);
    for (const field of ["name", "line1", "city", "postcode"] as const) {
      expect(html).toMatch(new RegExp(`for="checkout-address-${field}"`));
      const tag = html.slice(html.indexOf(`id="checkout-address-${field}"`));
      expect(`${field}: ${tag.slice(0, tag.indexOf(">")).includes("required") ? "required" : "optional"}`).toBe(
        `${field}: required`,
      );
    }
  });

  it("bounds every field, in the shape the other limits use", () => {
    const html = render(true);
    expect(html).toMatch(/maxlength="60"/i);
    expect(html).toMatch(/maxlength="120"/i);
    expect(html).toMatch(/maxlength="20"/i);
  });

  it("lets a browser fill it in", () => {
    // A buyer typing a postal address into a form that refuses to autofill is
    // a buyer typing a postal address.
    const html = render(true);
    for (const token of ["address-line1", "address-level2", "postal-code"]) {
      expect(html).toContain(token);
    }
  });

  it("shows the postage row, and says it is not yet known rather than showing nothing", () => {
    // A blank where a figure goes reads as free. §23 wants the final price
    // explicit, and "not yet" is the honest state before an address exists.
    const html = render(true);
    expect(html).toContain(SHIPPING_LABEL);
    expect(html).toContain(SHIPPING_PENDING_NOTICE);
  });

  it("offers no figure for the postage before one has been quoted", () => {
    // §11: the row must not show a number nobody quoted, and $0.00 would be
    // the worst available one — it is the site's own signature line, and true
    // of the certificate.
    const html = render(true);
    const row = html.slice(html.indexOf(SHIPPING_LABEL));
    expect(row.slice(0, 400)).not.toMatch(/\$\d/);
  });

  it("hands the pay gate the postage it computed, not a constant", () => {
    // **Asserted against the source, because a render cannot see it.** With no
    // quote the control is disabled anyway -- the consent box is unticked --
    // so `shippingSettled: true` hard-coded looks identical in the markup.
    // Mutation found exactly that. `baldrick-widget.test.ts` settled the same
    // question the same way: wiring a render cannot reach is read off the
    // file, and the comment says which it is.
    const source = readFileSync(new URL("../src/app/checkout/PaymentForm.tsx", import.meta.url), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
      .replace(/\/\/.*$/gm, "");
    expect(source).toContain("shippingSettled: !needsAddress || shippingAmount !== null,");
    // And the stripping is checked, so a broken regex cannot pass by deleting
    // the file.
    expect(source).toContain("export function PayButton");
  });

  it("asks for a province only where Printful demands one", () => {
    // Measured: the United States and Australia answer "State code is missing"
    // without one. Estonia is quoted without.
    expect(render(true)).not.toContain("checkout-address-province");
    const us = render(true, [{ iso_2: "US", display_name: "United States" }]);
    expect(us).toContain("checkout-address-province");
    expect(us).toContain(ADDRESS_LABELS.province);
  });
});
