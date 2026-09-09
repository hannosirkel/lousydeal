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
import fulfilmentProviderModule, {
  PRINTFUL_FULFILMENT_IDENTIFIER,
  PRINTFUL_FULFILMENT_PROVIDER_ID,
  PrintfulFulfilmentProviderService,
} from "../src/modules/printful/fulfilment-provider";

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

describe("what the provider module exports, which is what Medusa loads", () => {
  /**
   * **The application would not boot, and four rows passed with it broken.**
   *
   * `modules-sdk/dist/loaders/utils/load-internal.js:185-191` reads
   * `moduleService`, else `services`, else *the module itself*, and then
   * iterates. A bare class satisfies none of those and is not iterable, so a
   * deployment with a Printful token dies at startup with
   * `moduleProviderServices is not iterable` before serving a request.
   *
   * `fulfilment-module.test.ts`'s other tests assert the *configuration
   * object* — resolve path, id, options — and every one of them was correct.
   * What none could assert is that Medusa can load what the path points at.
   * And nothing ever loaded it: §23 keeps the token out of every deployment,
   * the module is registered only when a token exists, so **the first boot
   * with one was the first boot that could fail**. It did.
   */
  it("exports a module provider carrying the service, not the service", () => {
    // Imported at the top rather than dynamically: `tsconfig.test.json`
    // resolves as `node16`, where a relative dynamic import needs a file
    // extension the source does not have.
    const provider = fulfilmentProviderModule as unknown as { services?: unknown[] };
    expect(Array.isArray(provider.services)).toBe(true);
    expect(provider.services).toContain(PrintfulFulfilmentProviderService);
  });

  it("names the provider the way Medusa composes it, not the way we call it", () => {
    // Medusa builds a provider's id from the service's `static identifier` and
    // the `id` in the module options -- its own manual provider is
    // `manual_manual`. Measured against a real database:
    // `select id from fulfillment_provider` answers `printful_printful`, and
    // `shipping_option.provider_id` is a foreign key to it.
    //
    // P7b used the bare identifier and `configure:commerce` refused with
    // `Could not resolve 'fp_printful'`.
    expect(PRINTFUL_FULFILMENT_PROVIDER_ID).toBe(`${PRINTFUL_FULFILMENT_IDENTIFIER}_${PRINTFUL_FULFILMENT_IDENTIFIER}`);
    expect(PRINTFUL_FULFILMENT_PROVIDER_ID).toBe("printful_printful");
  });

  it("still registers under the identifier, which is the module option and not the provider id", () => {
    // The two are different strings for different jobs, and conflating them is
    // what P7b did. `id` here is what Medusa appends to the identifier.
    expect(fulfilmentModule(CONFIG)?.options.providers[0]?.id).toBe(PRINTFUL_FULFILMENT_IDENTIFIER);
  });
});
