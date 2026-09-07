/**
 * §6's gift block, as the checkout renders it.
 *
 * Asserted off real markup for the reason `checkout-inscription.test.ts`
 * gives: what matters is the document a buyer receives, not the component's
 * intentions. `handleSubmit` needs a browser, a DOM and a live Stripe, so the
 * link between the fields and the cart write is asserted against the source
 * and against a stubbed writer.
 */

import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  GIFT_CONFIRMATION_NOTE,
  GIFT_LABELS,
  GIFT_NOTICE,
  GIFT_PREVIEW_EMPTY,
  GIFT_PREVIEW_LABEL,
  GIFT_SUMMARY,
  INSCRIPTION_NOTICE,
} from "../src/content/checkout";
import { NO_INSCRIPTION } from "../src/content/certificate";
import { GIFT_LIMITS, GIFT_METADATA } from "../src/lib/gift";
import type { FetchJson, StoreFetchInit } from "../src/lib/medusa-client";
import { INSCRIPTION_METADATA, setCartInscriptionAndGift } from "../src/lib/store-checkout";

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

describe("the disclosure", () => {
  it("is a details element, so it opens without scripting", () => {
    // The surrounding checkout does need scripting -- it is the one route on
    // this site that does, because of the card form -- so this is not a claim
    // that the gift flow degrades. It is that the disclosure adds no
    // dependency of its own, and that a control screen readers already
    // understand beats a div with a click handler.
    expect(html).toContain("<details");
    expect(html).toContain(`<summary>${GIFT_SUMMARY}</summary>`);
  });

  it("is closed by default, because most orders are not gifts", () => {
    // Four fields a buyer has to read past to reach the pay button would tax
    // every ordinary purchase for the sake of the occasional one.
    expect(html).not.toMatch(/<details[^>]*\bopen\b/);
  });

  it("does not reach for a click handler where an element already exists", () => {
    // `onToggle` records what the element did; it does not drive it. A
    // `useState`-driven conditional render would have made the block's
    // existence depend on hydration.
    expect(source).toContain("onToggle");
    expect(source).not.toMatch(/onClick=\{[^}]*setGiftOpen/);
  });
});

describe("the four fields §6 names", () => {
  it("collects exactly them, and labels each", () => {
    for (const label of Object.values(GIFT_LABELS)) {
      expect(html).toContain(label);
    }
    for (const id of [
      "checkout-gift-email",
      "checkout-gift-recipient",
      "checkout-gift-sender",
      "checkout-gift-message",
    ]) {
      expect(html, id).toContain(`id="${id}"`);
    }
  });

  it("marks only the address required, and only while the block is open", () => {
    // **Asserted against the source, not the closed markup.** With the block
    // shut, `required={giftOpen}` renders no attribute at all -- so checking
    // that the other three lack `required` in this HTML would pass however the
    // address were written, which is a test agreeing with itself.
    //
    // The address is the one field a gift cannot lack: the send has nowhere to
    // go without it, and `readGift` decides a gift on it. The other three are
    // §6's own optionals and must never acquire a `required`.
    expect(source).toMatch(/id="checkout-gift-email"[\s\S]{0,240}required=\{giftOpen\}/);
    for (const id of ["checkout-gift-recipient", "checkout-gift-sender", "checkout-gift-message"]) {
      const field = source.slice(source.indexOf(`id="${id}"`), source.indexOf(`id="${id}"`) + 280);
      expect(field, id).not.toContain("required");
    }

    // And a closed block asks nothing of the buyer, which is what makes the
    // ordinary purchase unaffected by this row.
    expect(html).not.toMatch(/id="checkout-gift-email"[^>]*required/);
  });

  it("uses type=email on the address, which is the enforcing half", () => {
    // `requestSubmit()` runs constraint validation, so an open block cannot
    // reach `handleSubmit` without a usable address -- the same reason C3b's
    // own address field needs no second check.
    const address = html.slice(html.indexOf('id="checkout-gift-email"') - 120, html.indexOf('id="checkout-gift-email"') + 200);
    expect(address).toContain('type="email"');
  });

  it("caps each field at the limit the backend will apply", () => {
    for (const [field, id] of [
      ["recipientEmail", "checkout-gift-email"],
      ["recipientName", "checkout-gift-recipient"],
      ["senderName", "checkout-gift-sender"],
      ["message", "checkout-gift-message"],
    ] as const) {
      const around = html.slice(html.indexOf(`id="${id}"`), html.indexOf(`id="${id}"`) + 240);
      expect(around, field).toContain(`maxLength="${String(GIFT_LIMITS[field])}"`);
    }
  });

  it("does not autofill a stranger's details from the buyer's browser", () => {
    // `autoComplete="off"` on all four. The buyer's own address is
    // `autoComplete="email"` because it is theirs; a recipient's is not, and a
    // browser offering the buyer's own saved address here would be offering to
    // send the gift to themselves by accident.
    for (const id of ["checkout-gift-email", "checkout-gift-recipient", "checkout-gift-sender", "checkout-gift-message"]) {
      const around = html.slice(html.indexOf(`id="${id}"`), html.indexOf(`id="${id}"`) + 240);
      expect(around, id).toContain('autoComplete="off"');
    }
  });
});

describe("what the buyer is told, before they pay", () => {
  it("says the certificate is emailed to somebody else", () => {
    // §23 wants a buyer to know what their money does. A person who did not
    // realise a stranger would receive mail has been surprised by us.
    expect(html).toContain(GIFT_NOTICE);
    expect(GIFT_NOTICE).toMatch(/emailed to the address you give/i);
  });

  it("distinguishes these four from §5's two, which are the opposite", () => {
    // A buyer who put the recipient's name into `NAME ON THE CERTIFICATE`
    // expecting privacy, or their own into the gift block expecting it to be
    // printed, has been misled by this page.
    expect(GIFT_NOTICE).toMatch(/not printed on the certificate|published anywhere/i);
    expect(GIFT_NOTICE).toMatch(/the two fields above are the public ones/i);
    expect(INSCRIPTION_NOTICE).not.toMatch(/gift/i);
  });

  it("says the buyer's own confirmation still comes to them", () => {
    // LD-03's constraint 5: the recipient gets a certificate, not a contract.
    // A buyer who expects the certificate themselves and does not get it is a
    // support message, and this sentence is cheaper than the reply.
    expect(html).toContain(GIFT_CONFIRMATION_NOTE);
  });

  it("previews what the recipient will actually read", () => {
    expect(html).toContain(GIFT_PREVIEW_LABEL);
    // **Not the certificate's placeholder.** `NO_INSCRIPTION` reads "The
    // bearer", which names who a certificate is made out to and is nonsense
    // under "what they will read" -- it would claim the recipient reads the
    // words "The bearer". Found by rendering the block and looking at it,
    // while every other assertion here passed.
    expect(html).toContain(GIFT_PREVIEW_EMPTY);
    expect(html.slice(html.indexOf(GIFT_PREVIEW_LABEL), html.indexOf(GIFT_PREVIEW_LABEL) + 300)).not.toContain(
      NO_INSCRIPTION,
    );
    // The filter runs on the preview, so a buyer who typed a URL sees it
    // vanish here rather than discovering later that we removed it.
    expect(source).toContain("previewGiftText");
  });
});

describe("what reaches the cart", () => {
  function stub(): { fetchJson: FetchJson; body: () => unknown } {
    let seenBody: unknown;
    const fetchJson = (async <T>(path: string, init?: StoreFetchInit): Promise<T> => {
      seenBody = init?.body === undefined ? undefined : JSON.parse(String(init.body));
      return { cart: { id: "cart_1" } } as T;
    }) as FetchJson;
    return { fetchJson, body: () => seenBody };
  }

  it("writes the four gift keys beside the inscription, in one call", async () => {
    // **One call, because Medusa replaces the whole `metadata` object.** Two
    // would mean the second erasing the first's keys, and the inscription
    // arriving at issuance as an absence.
    const { fetchJson, body } = stub();
    await setCartInscriptionAndGift(fetchJson, "cart_1", {
      displayName: "Jane",
      dedication: "worth every cent",
      gift: {
        recipientName: "A. Recipient",
        recipientEmail: "recipient@example.test",
        senderName: "A. Buyer",
        message: "Happy birthday",
      },
    });

    expect(body()).toEqual({
      metadata: {
        [INSCRIPTION_METADATA.displayName]: "Jane",
        [INSCRIPTION_METADATA.dedication]: "worth every cent",
        [GIFT_METADATA.recipientName]: "A. Recipient",
        [GIFT_METADATA.recipientEmail]: "recipient@example.test",
        [GIFT_METADATA.senderName]: "A. Buyer",
        [GIFT_METADATA.message]: "Happy birthday",
      },
    });
  });

  it("sends four nulls when the block is closed", async () => {
    const { fetchJson, body } = stub();
    await setCartInscriptionAndGift(fetchJson, "cart_1", { displayName: "", dedication: "", gift: null });

    const metadata = (body() as { metadata: Record<string, unknown> }).metadata;
    for (const key of Object.values(GIFT_METADATA)) {
      expect(Object.keys(metadata), key).toContain(key);
      expect(metadata[key], key).toBeNull();
    }
  });

  it("sends what the buyer typed, not what the preview showed", () => {
    // The preview is a disclosure; the backend's filter at issuance is the
    // boundary. `POST /store/carts/:id` is public, so a filter on this side
    // protects nothing anyway.
    const { fetchJson, body } = stub();
    return setCartInscriptionAndGift(fetchJson, "cart_1", {
      displayName: "",
      dedication: "",
      gift: {
        recipientName: "",
        recipientEmail: "recipient@example.test",
        senderName: "",
        message: "Claim your prize at https://evil.test",
      },
    }).then(() => {
      const metadata = (body() as { metadata: Record<string, unknown> }).metadata;
      expect(metadata[GIFT_METADATA.message]).toBe("Claim your prize at https://evil.test");
    });
  });

  it("is written before the card is charged", () => {
    // A rejected write should cost the buyer nothing.
    const writes = source.indexOf("setCartInscriptionAndGift(fetchJson, cartId");
    const confirms = source.indexOf("stripe.confirmPayment");
    expect(writes).toBeGreaterThan(-1);
    expect(writes).toBeLessThan(confirms);
  });

  it("sends no gift when the block was closed, whatever was typed into it", () => {
    // A buyer who typed a recipient, changed their mind and closed the block
    // has not ordered a gift. The state is read at submit, not remembered.
    expect(source).toMatch(/gift:\s*giftOpen/);
  });
});
