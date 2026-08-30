import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

// The declared subpath, the same spelling `stripePaymentModule` registers:
// `backend/package.json` declares `@medusajs/medusa` and does not declare
// `@medusajs/payment-stripe`, so a bare-name import of the latter would resolve
// only by hoisting -- which is what T6a changed the production `resolve` to
// escape. Its `default` is the `ModuleProvider(...)` value:
// `node_modules/@medusajs/medusa/dist/modules/payment-stripe.js:22` re-exports
// the package with `__exportStar`, which skips `default`, and line 23 then
// assigns `exports.default` explicitly.
import stripePaymentStripe from "@medusajs/medusa/payment-stripe";

import { STRIPE_PAYMENT_PROVIDER_ID, stripePaymentModule } from "../src/config/payment";

// `ModuleProviderExports.services` is typed `Constructor<any>[]`, which does not
// carry the static `identifier` the composition assertion below reads.
const registeredServices = stripePaymentStripe.services as unknown as ReadonlyArray<{
  readonly name: string;
  readonly identifier: string;
}>;

describe("@medusajs/medusa/payment-stripe", () => {
  // The list `node_modules/@medusajs/payment-stripe/dist/index.js:5-17` hands
  // `ModuleProvider(Modules.PAYMENT, { services })`, read off the installed
  // package rather than counted in a comment -- this is what makes the "all
  // eight of its services" claim on `stripePaymentModule` go red if a future
  // version of the package adds, drops or renames one.
  it("registers exactly these eight services", () => {
    expect(registeredServices.map((service) => service.name)).toEqual([
      "BancontactProviderService",
      "BlikProviderService",
      "GiropayProviderService",
      "IdealProviderService",
      "StripeProviderService",
      "Przelewy24ProviderService",
      "PromptpayProviderService",
      "OxxoProviderService",
    ]);
  });
});

describe("STRIPE_PAYMENT_PROVIDER_ID", () => {
  // Composed here the same way `providers.js:45` composes it -- from the
  // installed `StripeProviderService.identifier` and the `id` this module's
  // own output registers -- rather than a second `"pp_stripe_stripe"`
  // literal. A test asserting equality between two literals would pass
  // whether or not either half of the real composition ever changed; this one
  // goes red if `stripePaymentModule` registers a different `id`, or if a
  // future `@medusajs/payment-stripe` renamed `StripeProviderService.identifier`.
  //
  // The service is picked out by class name, not by its `identifier`: picking
  // it by the value under test would make the assertion circular.
  it("equals pp_<StripeProviderService.identifier>_<the registered id>, composed the way @medusajs/payment's provider loader composes it", () => {
    const stripeProviderService = registeredServices.find(
      (service) => service.name === "StripeProviderService",
    );
    expect(stripeProviderService).toBeDefined();

    const registeredId = stripePaymentModule({
      apiKey: "irrelevant-for-this-assertion",
      webhookSecret: "irrelevant-for-this-assertion",
      paymentMethodConfiguration: undefined,
    }).options.providers[0].id;

    // node_modules/@medusajs/payment/dist/loaders/providers.js:45
    const composed = `pp_${stripeProviderService?.identifier}${
      registeredId ? `_${registeredId}` : ""
    }`;

    expect(STRIPE_PAYMENT_PROVIDER_ID).toBe(composed);
  });
});

describe("stripePaymentModule", () => {
  const config = {
    apiKey: "stripe-secret-key-value",
    webhookSecret: "stripe-webhook-secret-value",
    paymentMethodConfiguration: "pmc_test_value",
  };

  it("carries the values it was handed, not a default or a copy", () => {
    const options = stripePaymentModule(config).options.providers[0].options;

    expect(options.apiKey).toBe(config.apiKey);
    expect(options.webhookSecret).toBe(config.webhookSecret);
    expect(options.paymentMethodConfiguration).toBe(config.paymentMethodConfiguration);
  });

  it("leaves paymentMethodConfiguration undefined when the runtime config has none", () => {
    const options = stripePaymentModule({ ...config, paymentMethodConfiguration: undefined })
      .options.providers[0].options;
    expect(options.paymentMethodConfiguration).toBeUndefined();
  });

  // capture and automaticPaymentMethods are fixed, not read from config.
  it("pins capture and automaticPaymentMethods, and pins no payment_method_types", () => {
    const options = stripePaymentModule(config).options.providers[0].options;

    expect(options.capture).toBe(true);
    expect(options.automaticPaymentMethods).toBe(true);
    expect(options).not.toHaveProperty("payment_method_types");
  });

  it("resolves the Payment module and the Stripe provider by their subpath spelling", () => {
    const module = stripePaymentModule(config);

    expect(module.resolve).toBe("@medusajs/medusa/payment");
    expect(module.options.providers[0].resolve).toBe("@medusajs/medusa/payment-stripe");
  });
});

describe("no Stripe key or webhook secret is a literal", () => {
  // Real Stripe secret keys and webhook signing secrets carry these prefixes
  // (a `sk_test_…`/`sk_live_…`/`rk_…` API key, or a `whsec_…` webhook signing
  // secret). No configuration source should contain a string matching this
  // shape in place of a runtime read -- this is what would go red if someone
  // pasted a real one in.
  const STRIPE_SECRET_LITERAL_PATTERN = /\b(sk|rk)_(test|live)_\w+\b|\bwhsec_\w+\b/;

  // Every `.ts` in `src/config` as it is on disk, plus `medusa-config.ts` --
  // globbed rather than listed, so a file added to that directory is covered
  // the day it lands rather than the day someone remembers to extend a list.
  const configDirectory = join(__dirname, "../src/config");
  const sources: Array<[string, string]> = [
    ...readdirSync(configDirectory)
      .filter((name) => name.endsWith(".ts"))
      .sort()
      .map((name): [string, string] => [
        `src/config/${name}`,
        readFileSync(join(configDirectory, name), "utf8"),
      ]),
    ["medusa-config.ts", readFileSync(join(__dirname, "../medusa-config.ts"), "utf8")],
  ];

  it("scans every .ts in src/config, plus medusa-config.ts", () => {
    expect(sources.map(([file]) => file)).toContain("src/config/payment.ts");
    expect(sources.map(([file]) => file)).toContain("src/config/env.ts");
    expect(sources.map(([file]) => file)).toContain("medusa-config.ts");
  });

  it.each(sources)(
    "%s carries no literal shaped like a Stripe secret key or webhook secret",
    (_file, source) => {
      expect(source).not.toMatch(STRIPE_SECRET_LITERAL_PATTERN);
    },
  );
});
