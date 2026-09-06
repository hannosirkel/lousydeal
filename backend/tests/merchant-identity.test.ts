/**
 * The trader identity and the site's own address, as the backend reads them.
 *
 * **The backend needs both because of what § 55(2) requires.** The confirmation
 * must carry the § 54(1) information, and a link to `/legal/terms` is the
 * trader saying "it is somewhere you can reach" — which is what § 54(1) asks
 * for *before* the contract and not what § 55(2) asks for after it. So the six
 * values the storefront already renders have to be reproduced in an email, and
 * a subscriber running on a queue has no request to learn its own hostname
 * from.
 *
 * C9b is the row that builds the message. This is the row that makes the facts
 * available to it, and the one decision here is what an absence means.
 */

import { describe, expect, it } from "vitest";

import { MERCHANT_ENVIRONMENT_VARIABLES, readMerchantIdentity, type MerchantIdentity } from "../src/config/merchant";
import { readBackendRuntimeConfig } from "../src/config/runtime";

const MERCHANT: MerchantIdentity = {
  legalName: "Example Trader OÜ",
  address: "Example tn 1, 10000 Tallinn, Estonia",
  email: "trader@example.test",
  registryCode: "10000000",
  vatNumber: "EE100000000",
  phoneNumber: "+372 00 00000",
};

/** The six variables, spelled as Orange and the storefront spell them. */
const CONFIGURED: Record<string, string> = Object.fromEntries(
  Object.entries(MERCHANT_ENVIRONMENT_VARIABLES).map(([field, name]) => [
    name,
    MERCHANT[field as keyof MerchantIdentity],
  ]),
);

/** Everything the backend requires, so `readBackendRuntimeConfig` can be exercised. */
const REQUIRED: Record<string, string> = {
  JWT_SECRET: "j",
  COOKIE_SECRET: "c",
  DATABASE_HOST: "db",
  DATABASE_PORT: "5432",
  DATABASE_NAME: "n",
  DATABASE_USER: "u",
  DATABASE_PASSWORD: "p",
  REDIS_HOST: "r",
  REDIS_PORT: "6379",
  REDIS_PASSWORD: "rp",
  STRIPE_SECRET_KEY: "sk",
  STRIPE_WEBHOOK_SECRET: "wh",
};

describe("the trader identity", () => {
  it("reads all six from the same variables the storefront and Orange use", () => {
    // One private inventory, two readers. Decision `004` puts the identity in
    // runtime configuration precisely so neither workspace carries it as a
    // literal.
    expect(readMerchantIdentity(CONFIGURED)).toEqual(MERCHANT);
    expect(Object.values(MERCHANT_ENVIRONMENT_VARIABLES).sort()).toEqual([
      "MERCHANT_ADDRESS",
      "MERCHANT_EMAIL",
      "MERCHANT_LEGAL_NAME",
      "MERCHANT_PHONE_NUMBER",
      "MERCHANT_REGISTRY_CODE",
      "MERCHANT_VAT_NUMBER",
    ]);
  });

  it("is all six or nothing, so five never reaches a document that needs six", () => {
    // The consequence lands in C9b: an incomplete identity yields no
    // confirmation at all rather than one naming no trader. This is where
    // "incomplete" is decided, and a reader that returned five fields and a
    // hole would move that decision somewhere nobody is looking.
    for (const name of Object.values(MERCHANT_ENVIRONMENT_VARIABLES)) {
      const partial = { ...CONFIGURED };
      delete partial[name];
      expect(readMerchantIdentity(partial), name).toBeNull();
    }
    expect(readMerchantIdentity({})).toBeNull();
  });

  it("treats an empty or whitespace-only value as absent, which is what a Secret projects", () => {
    // A Kubernetes Secret or a `.env` line routinely projects `""` for a
    // variable nobody set. `""` as a legal name is worse than none: it renders
    // as a document that names no trader while claiming to name one.
    for (const blank of ["", "   ", "\t"]) {
      expect(readMerchantIdentity({ ...CONFIGURED, MERCHANT_LEGAL_NAME: blank }), JSON.stringify(blank)).toBeNull();
    }
  });

  it("trims what it reads, because a Secret carries a trailing newline", () => {
    expect(readMerchantIdentity({ ...CONFIGURED, MERCHANT_EMAIL: " trader@example.test\n" })?.email).toBe(
      "trader@example.test",
    );
  });

  it("does not throw where it is absent, unlike the mail configuration", () => {
    // The difference is what an absence means. Half a mail configuration is a
    // mistake nobody makes on purpose; an absent identity is the ordinary
    // state of a checkout Orange has not patched, including a developer's.
    // Refusing to boot on it would make the backend unrunnable locally to
    // protect an email that is not being sent.
    expect(() => readBackendRuntimeConfig(REQUIRED)).not.toThrow();
    expect(readBackendRuntimeConfig(REQUIRED).merchant).toBeNull();
    expect(readBackendRuntimeConfig({ ...REQUIRED, ...CONFIGURED }).merchant).toEqual(MERCHANT);
  });
});

describe("the site's own base URL", () => {
  it("is read from SITE_BASE_URL, and is null where nothing set one", () => {
    // The storefront needs no such value: it always has a request, and C7's
    // share row reads the host from one. A subscriber runs on a queue.
    expect(readBackendRuntimeConfig(REQUIRED).siteBaseUrl).toBeNull();
    expect(readBackendRuntimeConfig({ ...REQUIRED, SITE_BASE_URL: "https://lousydeal.com" }).siteBaseUrl).toBe(
      "https://lousydeal.com",
    );
  });

  it("loses a trailing slash, once, rather than at every use", () => {
    // A configured `https://lousydeal.com/` would otherwise produce
    // `//legal/withdraw`, which resolves and reads as a defect in a legal
    // document.
    for (const configured of ["https://lousydeal.com/", "https://lousydeal.com///"]) {
      expect(readBackendRuntimeConfig({ ...REQUIRED, SITE_BASE_URL: configured }).siteBaseUrl, configured).toBe(
        "https://lousydeal.com",
      );
    }
  });

  it("is not confused by an empty value", () => {
    expect(readBackendRuntimeConfig({ ...REQUIRED, SITE_BASE_URL: "  " }).siteBaseUrl).toBeNull();
  });
});
