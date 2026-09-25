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
  GIFT_ADDRESS_NOTE,
  giftAddressNote,
  ADDRESS_HEADING,
  ADDRESS_LABELS,
  ADDRESS_NOTE,
  CART_LABELS,
  COUNTRY_HINT,
  COUNTRY_PLACEHOLDER,
  ORDER_PLACED_HEADING,
  SHIPPING_LABEL,
  SHIPPING_PENDING_NOTICE,
} from "../src/content/checkout";
import { OrderPlaced } from "../src/app/checkout/OrderPlaced";
import { GiftAddressNote, PaymentForm, PayButton } from "../src/app/checkout/PaymentForm";
import { giftRecipientSent } from "../src/lib/gift";
import { QUOTE_DEBOUNCE_MS, needsProvince, quoteReady } from "../src/lib/shipping-address";
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

describe("why a cart with nothing to post is asked for a country", () => {
  // LD-11 J9, from G3's finding 5: on this cart the control moves no figure,
  // and the page offered no answer to what it was for.
  // The copy has nothing React escapes, so the raw string is what renders; a
  // later edit that adds an apostrophe fails here loudly rather than passing.
  const hint = `<span id="checkout-country-hint">${COUNTRY_HINT}</span>`;

  it("says why, with that exact text", () => {
    expect(render(false)).toContain(hint);
  });

  it("ties the reason to the control, so a screen reader hears it there", () => {
    expect(render(false)).toMatch(/<select id="checkout-country"[^>]* aria-describedby="checkout-country-hint"[^>]*>/);
  });

  it("says it after the control rather than before the label", () => {
    const html = render(false);
    expect(html.indexOf(hint)).toBeGreaterThan(html.indexOf("</select>"));
  });

  it("is not said with a parcel, where the address note already says why", () => {
    const html = render(true);
    expect(html).not.toContain("checkout-country-hint");
    expect(html).toContain(ADDRESS_NOTE);
  });

  it("names the tax, allows for none, and says the price does not move", () => {
    // The three claims the reason rests on, each one a claim the Terms make
    // in "Price and tax" and `legal-consistency.test.ts` holds them to.
    expect(COUNTRY_HINT).toMatch(/\bVAT\b/);
    expect(COUNTRY_HINT).toMatch(/\bif any\b/);
    expect(COUNTRY_HINT).toMatch(/\bwhat you pay does not change\b/);
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
    const effect = source.slice(source.indexOf("if (submitting || orderId !== null || charged) return;"));
    expect(effect).toContain("if (submitting || orderId !== null || charged) return;");
    // Before the address check, or an incomplete address still clears the
    // figure the buyer is in the middle of paying against.
    expect(source.indexOf("if (submitting || orderId !== null || charged) return;")).toBeLessThan(
      source.indexOf("if (!needsAddress) return;"),
    );
    expect(source.indexOf("if (!needsAddress) return;")).toBeLessThan(
      source.indexOf("if (!quoteReady(address, countryCode))"),
    );
    // In the dependencies, or an edit made during a failed submit is never
    // quoted afterwards and the button stays dark for ever.
    expect(source).toContain(
      "}, [needsAddress, address, countryCode, fetchJson, cartId, submitting, orderId, charged, onPostageSettled]);",
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
      source.indexOf("if (!quoteReady(address, countryCode))"),
      source.indexOf("let cancelled = false;", source.indexOf("if (!quoteReady(address, countryCode))")),
    );
    expect(incomplete).toContain("setQuoting(false);");
  });

  it("does not quote a cart after checkout completes", () => {
    const source = readFileSync(new URL("../src/app/checkout/PaymentForm.tsx", import.meta.url), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
      .replace(/\/\/.*$/gm, "");
    expect(source).toContain("if (submitting || orderId !== null || charged) return;");
    expect(source).toMatch(/\[needsAddress, address, countryCode, fetchJson, cartId, submitting, orderId, charged, onPostageSettled\]/);
  });

  it("asks for a province only where Printful demands one", () => {
    // Measured: the United States and Australia answer "State code is missing"
    // without one. Estonia is quoted without. **Since LD-11 H4 no country is
    // chosen on render**, so the field appears only once the buyer picks one
    // that needs it; the rule and its binding are what can be asserted here.
    expect(needsProvince("US")).toBe(true);
    expect(needsProvince("EE")).toBe(false);
    expect(needsProvince("")).toBe(false);
    expect(render(true, [{ iso_2: "US", display_name: "United States" }])).not.toContain("checkout-address-province");
    const source = readFileSync(new URL("../src/app/checkout/PaymentForm.tsx", import.meta.url), "utf8");
    expect(source).toMatch(/\{needsProvince\(countryCode\) \? \(\s*<p className="field">\s*<label htmlFor="checkout-address-province">/);
  });
});

/**
 * LD-11 H4. The country is the buyer's choice, it comes first, and nothing is
 * quoted before it is chosen or while the address is still being typed.
 */
describe("the country, and when postage is quoted", () => {
  const countries = [
    { iso_2: "ee", display_name: "Estonia" },
    { iso_2: "us", display_name: "United States" },
  ];

  it("starts on the empty choice, which cannot be submitted", () => {
    for (const needsAddress of [true, false]) {
      const html = render(needsAddress, countries);
      expect(html).toContain(`<option value="" selected="">${COUNTRY_PLACEHOLDER}</option>`);
      // J9 added `aria-describedby` after `required` on a certificate cart.
      expect(html).toMatch(/<select id="checkout-country" required=""[ >]/);
      expect(html).not.toMatch(/<option value="ee" selected="">/);
    }
  });

  it("comes first in the address it governs, and stands alone without one", () => {
    const parcel = render(true, countries);
    const fieldset = parcel.indexOf('<fieldset class="address">');
    const country = parcel.indexOf('id="checkout-country"');
    expect(fieldset).toBeGreaterThan(-1);
    expect(country).toBeGreaterThan(fieldset);
    expect(country).toBeLessThan(parcel.indexOf('id="checkout-address-name"'));
    expect(parcel.match(/id="checkout-country"/g)).toHaveLength(1);

    const certificate = render(false, countries);
    expect(certificate).not.toContain('<fieldset class="address">');
    expect(certificate.match(/id="checkout-country"/g)).toHaveLength(1);
  });

  it("is not quoted until a country is chosen and the address is complete", () => {
    const complete = { name: "A Buyer", line1: "1 Street", city: "Town", postcode: "10111", province: "" };
    expect(quoteReady(complete, "")).toBe(false);
    expect(quoteReady(complete, "  ")).toBe(false);
    expect(quoteReady(complete, "ee")).toBe(true);
    expect(quoteReady({ ...complete, postcode: "" }, "ee")).toBe(false);
    expect(quoteReady(complete, "us")).toBe(false);
    expect(quoteReady({ ...complete, province: "NY" }, "us")).toBe(true);
  });

  it("waits for the address to stand still before it writes it", () => {
    // The debounce itself is timer behaviour in an effect this suite cannot
    // run; the rule it waits on is tested above, and this binds the effect
    // to it. The end-to-end count of PaymentIntents is not asserted here.
    // Long enough to outlast a keystroke, short enough not to feel stuck. A
    // bound on zero let `1` through, which is no debounce at all.
    expect(QUOTE_DEBOUNCE_MS).toBeGreaterThanOrEqual(300);
    expect(QUOTE_DEBOUNCE_MS).toBeLessThanOrEqual(1500);
    const source = readFileSync(new URL("../src/app/checkout/PaymentForm.tsx", import.meta.url), "utf8");
    expect(source).toMatch(/const timer = window\.setTimeout\(\(\) => \{\s*quoteChainRef\.current = quoteChainRef\.current/);
    expect(source).toMatch(/\}, QUOTE_DEBOUNCE_MS\);\s*return \(\) => \{\s*cancelled = true;\s*window\.clearTimeout\(timer\);/);
    expect(source).toMatch(/if \(!quoteReady\(address, countryCode\)\) \{/);
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

describe("whose address it is, on a gift with a parcel", () => {
  // **Order #1.** The buyer entered the *recipient's* postal address here,
  // which was right and which nothing on the page told them to do. The gift
  // block collects an email and no postal address, so a buyer sending a hat
  // has to work out unaided that this field is where it goes and that it is
  // not derived from the block above.
  //
  // The storefront suite runs under `environment: "node"` with no DOM, so the
  // gift-open state cannot be reached by rendering `PayButton`. `giftAddressNote`
  // holds the decision and `GiftAddressNote` renders what it returns, so the
  // rule, the markup and the text are bound and every combination is driven
  // here. An earlier draft rendered the constant beside the rule instead, and
  // the suite then passed whether the branch rendered nothing or the wrong
  // notice.

  it("is said on a cart that is both a gift and carrying a parcel", () => {
    expect(giftAddressNote({ isGift: true, needsAddress: true })).toBe(GIFT_ADDRESS_NOTE);
  });

  it("reaches the markup, with that exact text", () => {
    // **The assertion the first draft of this row did not have.** It asserted
    // the rule, and separately asserted the constant, and never bound them:
    // the suite passed when the branch rendered nothing at all, and passed
    // when it rendered `ADDRESS_NOTE` instead. `GiftAddressNote` renders what
    // the rule returns, and this renders `GiftAddressNote`.
    const rendered = renderToStaticMarkup(
      createElement(GiftAddressNote, { isGift: true, needsAddress: true }),
    );
    expect(rendered).toContain(GIFT_ADDRESS_NOTE);
    expect(rendered).not.toContain(ADDRESS_NOTE);
  });

  it("renders nothing at all in the other three cases", () => {
    for (const props of [
      { isGift: true, needsAddress: false },
      { isGift: false, needsAddress: true },
      { isGift: false, needsAddress: false },
    ] as const) {
      expect(renderToStaticMarkup(createElement(GiftAddressNote, props))).toBe("");
    }
  });

  it("survives React's HTML escaping", () => {
    // **A canary, not a tautology.** React escapes `'`, `"`, `&`, `<` and `>`;
    // a straight apostrophe in this copy once made every `toContain` against
    // rendered markup silently vacuous, including the two absence checks
    // below. If the copy regains such a character this fails here, loudly,
    // rather than quietly disarming the rest of this block.
    expect(renderToStaticMarkup(createElement("p", null, GIFT_ADDRESS_NOTE))).toContain(
      GIFT_ADDRESS_NOTE,
    );
  });

  it("is not said on a gift that is only a certificate", () => {
    expect(giftAddressNote({ isGift: true, needsAddress: false })).toBeNull();
  });

  it("is not said on a parcel that is not a gift", () => {
    // The buyer is the recipient; `ADDRESS_NOTE` already covers it and a
    // second sentence would be noise on the ordinary purchase.
    expect(giftAddressNote({ isGift: false, needsAddress: true })).toBeNull();
  });

  it("is not said when there is neither", () => {
    expect(giftAddressNote({ isGift: false, needsAddress: false })).toBeNull();
  });

  it("names the recipient rather than repeating the address note", () => {
    // It has to add the one fact `ADDRESS_NOTE` does not carry: whose address
    // this is. A sentence that only restated where the parcel goes would leave
    // order #1's buyer exactly where they were.
    expect(GIFT_ADDRESS_NOTE).not.toBe(ADDRESS_NOTE);
    expect(GIFT_ADDRESS_NOTE.toLowerCase()).toContain("recipient");
  });
});

describe("the gift address note, as the checkout renders it", () => {
  it("is absent from a parcel cart while the gift block is closed", () => {
    // The end-to-end half of the four cases above: a static render starts with
    // the disclosure closed, which is the not-a-gift case.
    expect(render(true)).not.toContain(GIFT_ADDRESS_NOTE);
  });

  it("is absent from a certificate-only cart", () => {
    expect(render(false)).not.toContain(GIFT_ADDRESS_NOTE);
  });

  it("is wired to the disclosure's own state, not to a second source of truth", () => {
    // Asserted against the source, because the gift-open case is the one a
    // `node` environment cannot render: `giftOpen` only changes under a
    // browser's `onToggle`. The rendered assertions above cover what the
    // component does with each combination; this covers only that the form
    // hands it the disclosure's own state rather than a second flag.
    const source = readFileSync(new URL("../src/app/checkout/PaymentForm.tsx", import.meta.url), "utf8");
    expect(source).toMatch(/<GiftAddressNote\s+isGift=\{giftOpen\}\s+needsAddress=\{needsAddress\}\s*\/>/);
  });
});

/**
 * LD-11 H1. Where the checkout ends.
 *
 * It ended on `Order placed: order_01…` — a Medusa id a buyer can do nothing
 * with — under a line promising the certificate had been shown. The end state
 * now says where the certificate's link went and what else is coming.
 * `OrderPlaced` is rendered directly because a completed order is a state a
 * `node` render of `PayButton` cannot reach.
 */
describe("the end state", () => {
  const placed = (props: { giftRecipientEmail: string | null; hasPostedGoods: boolean }) =>
    renderToStaticMarkup(createElement(OrderPlaced, { email: "buyer@example.com", ...props }));

  it("names where the certificate went, what the mail is called and what it carries", () => {
    const html = placed({ giftRecipientEmail: null, hasPostedGoods: false });
    expect(html).toContain(ORDER_PLACED_HEADING);
    expect(html).toContain("buyer@example.com");
    expect(html).toContain("\u201cYour lousy deal\u201d");
    expect(html).toMatch(/the link to your certificate and the receipt for what you paid/);
    expect(html).toMatch(/write to the address in the Imprint/);
  });

  it("announces itself, since the form it replaces had focus", () => {
    expect(placed({ giftRecipientEmail: null, hasPostedGoods: false })).toMatch(/^<section role="status">/);
  });

  it("says a second mail follows the parcel only when there is one", () => {
    const parcel = /another email says when they are posted/;
    expect(placed({ giftRecipientEmail: null, hasPostedGoods: true })).toMatch(parcel);
    expect(placed({ giftRecipientEmail: null, hasPostedGoods: false })).not.toMatch(parcel);
  });

  it("names the recipient's address only on a gift", () => {
    expect(placed({ giftRecipientEmail: "friend@example.com", hasPostedGoods: false })).toMatch(
      /A separate email with the link to the certificate is on its way to friend@example\.com\./,
    );
    expect(placed({ giftRecipientEmail: null, hasPostedGoods: false })).not.toMatch(/separate email/);
  });

  it("is not shown before the order is placed", () => {
    expect(render(false)).not.toContain(ORDER_PLACED_HEADING);
    expect(render(true)).not.toContain(ORDER_PLACED_HEADING);
  });
});

describe("whose gift mail the end state announces", () => {
  // Only one the backend will send. `readGift` drops a gift whose address it
  // cannot use, and the order becomes an ordinary purchase; announcing a mail
  // to that address would be a promise nothing keeps.
  it("is the address, trimmed, when the block was open and the address is usable", () => {
    expect(giftRecipientSent({ open: true, recipientEmail: "  friend@example.com " })).toBe("friend@example.com");
  });

  it("is nobody when the block was closed, whatever it still holds", () => {
    expect(giftRecipientSent({ open: false, recipientEmail: "friend@example.com" })).toBeNull();
  });

  it("is nobody when the address is one the backend drops", () => {
    for (const recipientEmail of ["", "   ", "friend", "friend@example", "a b@example.com"]) {
      expect(giftRecipientSent({ open: true, recipientEmail })).toBeNull();
    }
  });

  it("is what the checkout hands the end state, with the buyer's address and the cart's shape", () => {
    // A source match, for `GiftAddressNote`'s reason above: the completed
    // state is unreachable in a `node` render. The rendered assertions cover
    // what each input does; this covers only that the form passes these.
    const source = readFileSync(new URL("../src/app/checkout/PaymentForm.tsx", import.meta.url), "utf8");
    expect(source).toMatch(
      /<OrderPlaced\s+email=\{email\.trim\(\)\}\s+giftRecipientEmail=\{giftRecipientSent\(\{ open: giftOpen, recipientEmail: giftRecipientEmail \}\)\}\s+hasPostedGoods=\{needsAddress\}\s*\/>/,
    );
    expect(source).not.toMatch(/Order placed: \{orderId\}/);
  });
});

