/**
 * Registering the Printful fulfilment provider — and, more to the point, not
 * registering it.
 *
 * This file exists because a mutation found the gap: removing the `null` guard
 * from `fulfilmentModule` left every other test in the suite green, and the
 * result would have been a deployment offering to ship things it has no token
 * to ship.
 */

import { describe, expect, it } from "vitest";

import { FULFILMENT_PROVIDER_PATH, fulfilmentModule } from "../src/config/fulfilment";
import { PRINTFUL_FULFILMENT_IDENTIFIER } from "../src/modules/printful/fulfilment-provider";

const CONFIG = {
  apiToken: "tok-fixture",
  artworkBaseUrl: "https://raw.githubusercontent.com/o/r/0123456789abcdef0123456789abcdef01234567/design/merch/print-files",
};

describe("when the deployment has no Printful", () => {
  it("registers nothing at all", () => {
    // §23 keeps a live Printful store out until the publication gate, so the
    // live deployment has no token — and must still boot. A registered
    // provider with no token would offer a shipping option that cannot be
    // priced, which is a control that does nothing: `brand.md` calls that a
    // lie, and it would fail at the moment a buyer tried to pay.
    expect(fulfilmentModule(null)).toBeNull();
  });
});

describe("when it does", () => {
  it("registers one provider, under the identifier the service declares", () => {
    const module = fulfilmentModule(CONFIG);
    expect(module?.resolve).toBe("@medusajs/medusa/fulfillment");
    expect(module?.options.providers).toHaveLength(1);
    expect(module?.options.providers[0]?.id).toBe(PRINTFUL_FULFILMENT_IDENTIFIER);
  });

  it("resolves the provider by the path Medusa will look it up at", () => {
    // Medusa resolves this against the directory the process was started in,
    // not against this file — the same trap `config/deal.ts` documents.
    expect(fulfilmentModule(CONFIG)?.options.providers[0]?.resolve).toBe(FULFILMENT_PROVIDER_PATH);
    expect(FULFILMENT_PROVIDER_PATH).toBe("./src/modules/printful/fulfilment-provider");
  });

  it("hands the provider its token and its artwork base, and nothing else", () => {
    expect(fulfilmentModule(CONFIG)?.options.providers[0]?.options).toEqual(CONFIG);
  });
});
