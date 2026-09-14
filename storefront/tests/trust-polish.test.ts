/** Focused contracts for LD-10 U's storefront trust and polish surfaces. */

import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

import { Footer } from "../src/components/document/Footer";
import { MerchForm } from "../src/components/document/MerchForm";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => undefined, refresh: () => undefined }) }));
vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: unknown }) => children,
  PaymentElement: () => createElement("div"),
  useStripe: () => ({}),
  useElements: () => ({}),
}));
vi.mock("@stripe/stripe-js", () => ({ loadStripe: () => Promise.resolve(null) }));

const merchant = {
  legalName: "Example Trader OÜ",
  address: "Example tn 1, 10000 Tallinn, Estonia",
  email: "trader@example.test",
  registryCode: "10000000",
  vatNumber: "EE100000000",
  phoneNumber: "+372 00 00000",
} as const;

const STRIPE_PAYMENT_NOTICE =
  "Stripe provides the card form. Lousy Deal does not receive or store your full card number.";

describe("the primary social footer links", () => {
  it("renders exactly the canonical TikTok, Instagram and X profiles", () => {
    const html = renderToStaticMarkup(createElement(Footer, { merchant }));
    const externalLinks = [...html.matchAll(/<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>/g)].map((match) => match[1]);

    expect(externalLinks).toEqual([
      "https://www.tiktok.com/@lousydeal",
      "https://www.instagram.com/lousydealcom",
      "https://x.com/lousydealcom",
    ]);
    expect(html.match(/<svg\b/g)).toHaveLength(3);
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
    expect(html.indexOf('id="footer-social"')).toBeLessThan(html.indexOf('class="footer-columns"'));
    for (const label of ["TikTok", "Instagram", "X"]) {
      expect(html).toContain(`aria-label="${label}"`);
    }
  });

  it("keeps the footer a server component with inline, dependency-free icons", () => {
    const source = readFileSync(new URL("../src/components/document/Footer.tsx", import.meta.url), "utf8");
    expect(source).not.toContain('"use client"');
    expect(source).toContain("<svg");
    expect(source).not.toMatch(/from ["'](?:@|https?:)/);
  });
});

describe("the favicon fallback", () => {
  it("contains 16px and 32px stamp-colour images in a conventional ICO", async () => {
    const bytes = readFileSync(new URL("../src/app/favicon.ico", import.meta.url));
    expect(bytes.readUInt16LE(0)).toBe(0);
    expect(bytes.readUInt16LE(2)).toBe(1);
    const count = bytes.readUInt16LE(4);
    expect(count).toBeGreaterThanOrEqual(2);

    const entries = Array.from({ length: count }, (_, index) => {
      const entry = 6 + index * 16;
      return {
        size: bytes[entry] === 0 ? 256 : bytes[entry],
        image: bytes.subarray(bytes.readUInt32LE(entry + 12), bytes.readUInt32LE(entry + 12) + bytes.readUInt32LE(entry + 8)),
      };
    });
    const sizes = entries.map((entry) => entry.size);
    expect(sizes).toEqual(expect.arrayContaining([16, 32]));

    const icon = readFileSync(new URL("../src/app/icon.svg", import.meta.url), "utf8");
    const paper = icon.match(/fill="(#[0-9a-f]{6})"/)?.[1];
    const stamp = icon.match(/stroke="(#[0-9a-f]{6})"/)?.[1];
    expect(paper).toBeDefined();
    expect(stamp).toBeDefined();
    expect(paper).toBe("#fafaf7");
    expect(stamp).toBe("#b3261e");
    const source = icon.replace(/<!--[\s\S]*?-->/g, "");

    for (const size of [16, 32]) {
      const matchingEntry = entries.find((entry) => entry.size === size);
      expect(matchingEntry).toBeDefined();
      const sourcePixels = await sharp(Buffer.from(source)).resize(size, size).ensureAlpha().raw().toBuffer();
      const faviconPixels = await sharp(matchingEntry!.image).ensureAlpha().raw().toBuffer();
      expect(faviconPixels).toEqual(sourcePixels);
    }
  });
});

describe("local control spacing", () => {
  it("separates merch controls with a named wrapper and design-token gap", () => {
    const html = renderToStaticMarkup(createElement(MerchForm, {
      action: async () => undefined,
      title: "A Thing",
      variants: [
        { variantId: "small", size: "S" },
        { variantId: "large", size: "L" },
      ],
      storeOpen: true,
    }));
    const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
    expect(html).toContain('class="merch-controls"');
    expect(css).toMatch(/\.merch-controls\s*\{[^}]*gap:\s*var\(--space-\d+\)/s);
  });

  it("puts the cart code form and checkout button in a named, spaced wrapper", () => {
    const cartSource = readFileSync(new URL("../src/app/cart/page.tsx", import.meta.url), "utf8");
    const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
    expect(cartSource).toContain("cart-code-controls");
    expect(css).toMatch(/\.cart-code-controls\s*\{[^}]*gap:\s*var\(--space-\d+\)/s);
    expect(css).not.toMatch(/^(?:button|input|select|textarea)\s*\{[^}]*margin:/ms);
  });
});

describe("the card form disclosure", () => {
  it("puts the factual Stripe disclosure immediately before the card slot", async () => {
    const { PayButton } = await import("../src/app/checkout/PaymentForm");
    const html = renderToStaticMarkup(createElement(PayButton, {
      cartId: "cart_1",
      fetchJson: (async () => ({})) as never,
      countries: [{ iso_2: "ee", display_name: "Estonia" }],
      needsAddress: false,
      needsConsent: false,
      currencyCode: "usd",
      stripeReady: true,
      confirmPayment: async () => ({}),
      onPostageSettled: () => undefined,
      cardSlot: createElement("span", { "data-card-slot": true }, "Card fields"),
    }));
    const noticeAt = html.indexOf(STRIPE_PAYMENT_NOTICE);
    const cardAt = html.indexOf('data-card-slot="true"');

    expect(STRIPE_PAYMENT_NOTICE).toMatch(/Stripe provides the card form/i);
    expect(STRIPE_PAYMENT_NOTICE).toMatch(/Lousy Deal does not receive or store.*full card number/i);
    expect(noticeAt).toBeGreaterThan(-1);
    expect(cardAt).toBeGreaterThan(noticeAt);
    expect(html.slice(noticeAt + STRIPE_PAYMENT_NOTICE.length, cardAt)).toMatch(/^<\/span><\/p>/);
  });
});
