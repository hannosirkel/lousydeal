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

import {
  ADDRESS_HEADING,
  ADDRESS_LABELS,
  ADDRESS_NOTE,
  CART_LABELS,
  SHIPPING_LABEL,
  SHIPPING_PENDING_NOTICE,
} from "../src/content/checkout";
import { PaymentForm, PayButton } from "../src/app/checkout/PaymentForm";
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
      // Gate D finding 17 moved the card out of this form and the Stripe
      // client with it: what used to be `useStripe() !== null` is now a flag,
      // and the card fields are a slot. `true` here renders what a buyer with
      // a loaded Stripe client sees, which is what these tests are about.
      stripeReady: true,
      confirmPayment: (async () => ({})) as never,
      onPostageSettled: () => undefined,
      cardSlot: null,
    }),
  );

const renderPaymentForm = (needsAddress: boolean) =>
  renderToStaticMarkup(
    createElement(PaymentForm, {
      cartId: "cart_1",
      stripePublishableKey: "pk_test_fixture",
      countries: [{ iso_2: "ee", display_name: "Estonia" }],
      needsAddress,
      needsConsent: true,
      currencyCode: "usd",
      initialTotal: needsAddress ? 38.48 : 6,
      items: [{ label: "Lousy Deal", value: "$5.00" }],
      surcharge: { label: "Discount (BALDRICK20)", value: "+$1.00" },
    }),
  );

describe("a cart with nothing to post", () => {
  it("shows the backend total immediately", () => {
    const html = renderPaymentForm(false);
    expect(html).toContain(CART_LABELS.total);
    expect(html).toContain("$6.00");
  });

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
    expect(renderPaymentForm(false)).not.toContain(SHIPPING_LABEL);
  });

  it("still offers the country field, which resolves a tax region", () => {
    // A certificate ships nowhere, and the country stands in for an address
    // without being one. That is unchanged by this slice.
    expect(render(false)).toContain("checkout-country");
  });
});

describe("a cart with a parcel in it", () => {
  it("does not present the goods-only total as final before postage is settled", () => {
    const html = renderPaymentForm(true);
    expect(html).toContain(CART_LABELS.total);
    expect(html).toContain(SHIPPING_PENDING_NOTICE);
    expect(html).not.toContain("$38.48");
  });

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
    const html = renderPaymentForm(true);
    expect(html).toContain(SHIPPING_LABEL);
    expect(html).toContain(SHIPPING_PENDING_NOTICE);
  });

  it("offers no figure for the postage before one has been quoted", () => {
    // §11: the row must not show a number nobody quoted, and $0.00 would be
    // the worst available one — it is the site's own signature line, and true
    // of the certificate.
    const html = renderPaymentForm(true);
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
    // **Both places, and `&& !quoting` in both.** The control and the submit
    // handler are separate rules on purpose -- `requestSubmit()` ignores
    // `disabled` -- which is exactly why they have to agree about this one.
    const settled = source.match(/shippingSettled: !needsAddress \|\| \(shippingAmount !== null && !quoting\),/g);
    expect(settled).toHaveLength(2);
    // And the stripping is checked, so a broken regex cannot pass by deleting
    // the file.
    expect(source).toContain("export function PayButton");
  });

  it("starts no quote while a payment is being taken", () => {
    // A quote that starts between confirmation and completion can make the
    // enclosing Medusa refresh fail while trying to cancel the payment.
    const source = readFileSync(new URL("../src/app/checkout/PaymentForm.tsx", import.meta.url), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
      .replace(/\/\/.*$/gm, "");
    const effect = source.slice(source.indexOf("if (submitting || orderId !== null) return;"));
    expect(effect).toContain("if (submitting || orderId !== null) return;");
    // Before the address check, or an incomplete address still clears the
    // figure the buyer is in the middle of paying against.
    expect(source.indexOf("if (submitting || orderId !== null) return;")).toBeLessThan(
      source.indexOf("if (!needsAddress) return;"),
    );
    expect(source.indexOf("if (!needsAddress) return;")).toBeLessThan(
      source.indexOf("if (!addressComplete(address, countryCode))"),
    );
    // In the dependencies, or an edit made during a failed submit is never
    // quoted afterwards and the button stays dark for ever.
    expect(source).toContain(
      "}, [needsAddress, address, countryCode, fetchJson, cartId, submitting, orderId, onPostageSettled]);",
    );
  });

  it("serializes quote writes and lets the newest address go last", () => {
    const source = readFileSync(new URL("../src/app/checkout/PaymentForm.tsx", import.meta.url), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
      .replace(/\/\/.*$/gm, "");
    expect(source).toContain("const quoteChainRef = useRef<Promise<void>>(Promise.resolve());");
    expect(source).toContain("const quoteGeneration = ++quoteGenerationRef.current;");
    expect(source).toMatch(
      /quoteChainRef\.current\s*=\s*quoteChainRef\.current\s*\.catch\(\(\) => undefined\)\s*\.then\(async \(\) => \{/,
    );
    expect(source).toContain("if (quoteGeneration !== quoteGenerationRef.current) return;");
    const incomplete = source.slice(
      source.indexOf("if (!addressComplete(address, countryCode))"),
      source.indexOf("let cancelled = false;", source.indexOf("if (!addressComplete(address, countryCode))")),
    );
    expect(incomplete).toContain("setQuoting(false);");
  });

  it("does not quote a cart after checkout completes", () => {
    const source = readFileSync(new URL("../src/app/checkout/PaymentForm.tsx", import.meta.url), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
      .replace(/\/\/.*$/gm, "");
    expect(source).toContain("if (submitting || orderId !== null) return;");
    expect(source).toMatch(/\[needsAddress, address, countryCode, fetchJson, cartId, submitting, orderId, onPostageSettled\]/);
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

describe("when the payment session is created", () => {
  /**
   * **Gate D finding 17, which broke every order with a parcel in it.**
   *
   * The session used to be created on mount, chained onto the payment
   * collection, against the goods-only total — before the buyer had typed an
   * address. Attaching the shipping method then changes the cart total, and
   * Medusa answers a changed total by deleting the payment session
   * (`refresh-payment-collection.js`: `valueIsEqual` false → parallelize
   * `deletePaymentSessionsWorkflow`, `updatePaymentCollectionStep`). For the
   * Stripe provider `deletePayment` is `cancelPayment` is
   * `paymentIntents.cancel`. Nothing re-created one, so the buyer filled in
   * the card form against a cancelled PaymentIntent and `confirmPayment`
   * failed at the last step with Stripe's own developer-facing wording.
   *
   * Deterministic, not a race — and the irony is that `shippingSettled`
   * guaranteed the pay control only lit up *after* the session had been
   * destroyed.
   *
   * Read off the source: the sequencing is between two effects and a network
   * call, and no static render can see it. `baldrick-widget.test.ts` settled
   * this disposition; the comments say which claim each line stands for.
   */
  const source = readFileSync(new URL("../src/app/checkout/PaymentForm.tsx", import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\/.*$/gm, "");

  it("does not initiate one in the same breath as the collection", () => {
    // The exact shape of the bug: `createPaymentCollection(...).then(id =>
    // initiateStripePaymentSession(...))`. One chain, one session, made
    // before an address existed.
    expect(source).not.toMatch(/createPaymentCollection\([^)]*\)\s*\.then\([^)]*initiateStripePaymentSession/);
    expect(source).toContain("createPaymentCollection(fetchJson, cartId)");
  });

  it("asks the rule rather than carrying a copy of it", () => {
    // The condition is `paymentSessionNeeded` in `checkout-rules.ts`, where it
    // can be tested against every combination instead of read off the file --
    // this suite has no DOM, so an effect's own body is unreachable. The
    // exhaustive tests are in `checkout-session.test.ts`; what is asserted
    // here is that the effect calls it and records what it created.
    expect(source).toMatch(/if \(!paymentSessionNeeded\(\{ paymentCollectionId, needsAddress, postage, clientSecret, sessionPostage \}\)\) return;/);
    expect(source).toContain("setSessionPostage(postage);");
  });

  it("distrusts the held session while a new quote is unresolved", () => {
    const handler = source.slice(source.indexOf("const onCartPriceChange"), source.indexOf("let paymentContent"));
    expect(handler).toContain("setPostage(null);");
    expect(handler).toContain("setSessionPostage(null);");
    expect(handler).toContain("startedSessionForRef.current = null;");
  });

  it("does not enable payment before the replacement session matches the quote", () => {
    expect(source).toMatch(
      /const paymentSessionReady\s*=\s*stripeReady\s*&&\s*\(!needsAddress \|\| \(postage !== null && sessionPostage === postage\)\)/,
    );
    expect(source).toContain("stripeReady={paymentSessionReady}");
  });

  it("reports pending, settled and unavailable cart-price states", () => {
    const quoteEffect = source.slice(
      source.indexOf("useEffect(() => {", source.indexOf("export function PayButton")),
      source.indexOf("async function handleSubmit"),
    );
    expect(quoteEffect).toContain('onPostageSettled({ status: "pending" })');
    expect(quoteEffect).toMatch(
      /onPostageSettled\(\{\s*status: "settled",\s*total: applied\.total,\s*shippingAmount: applied\.shippingAmount,?\s*\}\)/,
    );
    expect(quoteEffect).toContain('onPostageSettled({ status: "unavailable" })');
    expect(quoteEffect.indexOf('status: "settled"')).toBeGreaterThan(
      quoteEffect.indexOf("setShippingAmount(applied.shippingAmount)"),
    );
  });

  it("remounts the Elements subtree for a new session rather than re-binding", () => {
    // The installed `@stripe/react-stripe-js` treats `options.clientSecret` as
    // immutable -- it warns "Unsupported prop change: options.clientSecret is
    // not a mutable property" and keeps the old one. Without the key a new
    // session would be created and then ignored, which is the same failure
    // with a longer story.
    expect(source).toMatch(/<Elements key=\{clientSecret\}/);
  });

  it("keeps the buyer's typing outside that subtree, so a remount cannot take it", () => {
    // The email, the address, the inscription and the gift all live in
    // `PayButton`, which is now the parent of the card rather than its child.
    // If `<Elements>` wrapped the form, every postage change would empty it.
    const elementsBlock = source.slice(source.indexOf("<Elements key={clientSecret}"), source.indexOf("</Elements>"));
    expect(elementsBlock).toContain("<CardSection");
    expect(elementsBlock).not.toContain("<PayButton");
    expect(source).toMatch(/cardSlot=\{/);
  });

  it("closes the pay gate while no session is bound", () => {
    // `registerConfirm(null)` on unmount, and `stripeReady` follows it. A
    // control that stays lit between two sessions is a click that reaches
    // `confirmPayment` with nothing to confirm against.
    expect(source).toContain("setStripeReady(confirm !== null);");
    const section = source.slice(source.indexOf("function CardSection("));
    expect(section).toContain("registerConfirm(null);");
  });

  it("shows the cursor for the collection, not for the session", () => {
    // Waiting for the session would show a blinking cursor in place of the
    // very address form that produces one.
    expect(source).toContain("if (paymentCollectionId === null) {");
    expect(source).not.toContain("if (clientSecret === null) {\n    return (");
  });

  it("reads the stripping, so a broken regex cannot pass by emptying the file", () => {
    expect(source).toContain("export function PayButton");
  });
});
