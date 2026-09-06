/**
 * §5's two inscription fields at the checkout, and the preview that is the
 * disclosure §5 asks for.
 *
 * §5: both fields are "entered at checkout, both shown to the buyer as public
 * before they pay". The showing is the part with a legal edge — §7 of the
 * Terms promises a buyer that markup, links, domains, addresses and telephone
 * numbers are removed, and a filter that silently eats what somebody typed is
 * worse than one that says so.
 *
 * **What this file cannot reach** is the same boundary `checkout-email.test.ts`
 * names: `handleSubmit` needs a browser, a DOM and a live Stripe. The fields
 * and the preview are asserted off real markup, `setCartInscription` against a
 * stub, and the link between them against the source.
 */

import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { NO_INSCRIPTION } from "../src/content/certificate";
import { INSCRIPTION_LABELS, INSCRIPTION_NOTICE, INSCRIPTION_PREVIEW_LABEL } from "../src/content/checkout";
import { INSCRIPTION_LIMITS } from "../src/lib/inscription";
import type { FetchJson, StoreFetchInit } from "../src/lib/medusa-client";
import { INSCRIPTION_METADATA, setCartInscription } from "../src/lib/store-checkout";

vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: unknown }) => children,
  PaymentElement: () => createElement("div"),
  useStripe: () => ({}),
  useElements: () => ({}),
}));
vi.mock("@stripe/stripe-js", () => ({ loadStripe: () => Promise.resolve(null) }));

const { PayButton } = await import("../src/app/checkout/PaymentForm");

const html = renderToStaticMarkup(
  createElement(PayButton, {
    cartId: "cart_1",
    fetchJson: (async () => ({})) as never,
    countries: [{ iso_2: "ee", display_name: "Estonia" }],
  }),
);

const source = readFileSync(new URL("../src/app/checkout/PaymentForm.tsx", import.meta.url), "utf8");

describe("the two inscription fields", () => {
  it("are both on the form and neither is required", () => {
    // §5: most buyers leave both blank, and the certificate has to look
    // deliberate when they do. A required field would make the empty pair
    // unreachable, which is the case the design is for.
    expect(html).toContain('id="checkout-display-name"');
    expect(html).toContain('id="checkout-dedication"');
    expect(html).not.toMatch(/<input[^>]*id="checkout-display-name"[^>]*required/);
    expect(html).not.toMatch(/<input[^>]*id="checkout-dedication"[^>]*required/);
  });

  it("carry §5's two limits, the dedication's being the contract's own figure", () => {
    expect(html).toMatch(new RegExp(`<input[^>]*id="checkout-display-name"[^>]*maxLength="${String(INSCRIPTION_LIMITS.displayName)}"`, "i"));
    expect(html).toMatch(new RegExp(`<input[^>]*id="checkout-dedication"[^>]*maxLength="${String(INSCRIPTION_LIMITS.dedication)}"`, "i"));
    expect(INSCRIPTION_LIMITS.dedication).toBe(120);
  });

  it("are labelled, and the notice is attached to both for a screen reader", () => {
    expect(html).toContain(INSCRIPTION_LABELS.displayName);
    expect(html).toContain(INSCRIPTION_LABELS.dedication);
    expect(html).toMatch(/<input[^>]*id="checkout-display-name"[^>]*aria-describedby="checkout-inscription-notice"/);
    expect(html).toMatch(/<input[^>]*id="checkout-dedication"[^>]*aria-describedby="checkout-inscription-notice"/);
  });

  it("say all three things §5 requires before the buyer types anything", () => {
    // Both public; the billing name is never used, so blank does not fall back
    // to it; and some of what is typed is removed.
    expect(html).toContain(INSCRIPTION_NOTICE);
    expect(INSCRIPTION_NOTICE).toMatch(/both are public/i);
    expect(INSCRIPTION_NOTICE).toMatch(/billing name is never printed/i);
    expect(INSCRIPTION_NOTICE).toMatch(/removed automatically/i);
  });
});

describe("the preview", () => {
  it("shows the certificate's no-inscription state before anything is typed", () => {
    // The empty pair is the ordinary case and the preview has to render it the
    // way the certificate will, not as a blank.
    expect(html).toContain(INSCRIPTION_PREVIEW_LABEL);
    expect(html).toContain(NO_INSCRIPTION);
  });

  it("is run through the same filter the certificate renders with", () => {
    // Asserted against the source: the preview only changes under a browser's
    // `onChange`, which no static render reaches. What matters is that it is
    // not a second, kinder filter -- a preview that flattered would be worse
    // than none, because §5's disclosure is the whole reason it exists.
    expect(source).toMatch(/sanitiseInscription\(displayName\)/);
    expect(source).toMatch(/sanitiseInscription\(dedication\)/);
    expect(source).toContain('from "../../lib/inscription"');
  });

  it("announces itself when it changes, since it changes as the buyer types", () => {
    expect(html).toContain('aria-live="polite"');
  });
});

describe("setCartInscription", () => {
  function stub(): { fetchJson: FetchJson; body: () => unknown; path: () => string } {
    let seenBody: unknown;
    let seenPath = "";
    const fetchJson = (async <T>(path: string, init?: StoreFetchInit): Promise<T> => {
      seenPath = path;
      seenBody = init?.body === undefined ? undefined : JSON.parse(String(init.body));
      return { cart: { id: "cart_1" } } as T;
    }) as FetchJson;
    return { fetchJson, body: () => seenBody, path: () => seenPath };
  }

  it("writes both fields under the keys the backend reads", () => {
    const { fetchJson, body, path } = stub();

    return setCartInscription(fetchJson, "cart_1", {
      displayName: "Jane Example",
      dedication: "worth every cent",
    }).then(() => {
      expect(path()).toBe("/store/carts/cart_1");
      expect(body()).toEqual({
        metadata: {
          [INSCRIPTION_METADATA.displayName]: "Jane Example",
          [INSCRIPTION_METADATA.dedication]: "worth every cent",
        },
      });
    });
  });

  it("sends what the buyer typed, not what the preview showed", () => {
    // The preview is a disclosure; the backend's filter at issuance is the
    // boundary. Filtering here as well would make the two look agreed when
    // only one of them is load-bearing -- and `POST /store/carts/:id` is
    // public, so a filter on this side protects nothing anyway.
    const { fetchJson, body } = stub();

    return setCartInscription(fetchJson, "cart_1", {
      displayName: "<script>alert(1)</script>",
      dedication: "buy at evil.example.com",
    }).then(() => {
      expect(body()).toEqual({
        metadata: {
          [INSCRIPTION_METADATA.displayName]: "<script>alert(1)</script>",
          [INSCRIPTION_METADATA.dedication]: "buy at evil.example.com",
        },
      });
    });
  });

  it("sends null for a blank field, so there is one no-inscription state and not two", () => {
    const { fetchJson, body } = stub();

    return setCartInscription(fetchJson, "cart_1", { displayName: "", dedication: "   " }).then(() => {
      expect(body()).toEqual({
        metadata: {
          [INSCRIPTION_METADATA.displayName]: null,
          [INSCRIPTION_METADATA.dedication]: null,
        },
      });
    });
  });

  it("is called before the card is charged", () => {
    const writes = source.indexOf("setCartInscription(fetchJson, cartId");
    const confirms = source.indexOf("stripe.confirmPayment");

    expect(writes).toBeGreaterThan(-1);
    expect(writes).toBeLessThan(confirms);
  });
});
