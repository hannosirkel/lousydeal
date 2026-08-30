import type { BackendRuntimeConfig } from "./runtime";

type StripeConfig = BackendRuntimeConfig["stripe"];

/**
 * The provider's own identifier: `StripeProviderService.identifier` in
 * `@medusajs/payment-stripe`. Confirmed at
 * `node_modules/@medusajs/payment-stripe/dist/services/stripe-provider.js:16`
 * (`StripeProviderService.identifier = types_1.PaymentProviderKeys.STRIPE`)
 * and `dist/types/index.js:13` (`STRIPE: "stripe"`).
 */
const STRIPE_PROVIDER_IDENTIFIER = "stripe";

/** The `id` this deployment registers that provider under. */
const STRIPE_PROVIDER_INSTANCE_ID = "stripe";

/**
 * What the Payment module registers the provider as.
 *
 * `node_modules/@medusajs/payment/dist/loaders/providers.js:45` composes the
 * registration key as
 * `` `pp_${klass.identifier}${pluginOptions.id ? `_${pluginOptions.id}` : ""}` ``,
 * so with the two constants above this is `pp_stripe_stripe` -- composed here
 * the same way rather than written out, so a change to either half moves both
 * this constant and the registration together.
 */
export const STRIPE_PAYMENT_PROVIDER_ID =
  `pp_${STRIPE_PROVIDER_IDENTIFIER}_${STRIPE_PROVIDER_INSTANCE_ID}` as const;

/**
 * One Medusa-owned Stripe provider, in the subpath spelling
 * (`@medusajs/medusa/payment-stripe`) T6a established for this array -- see
 * `src/config/redis.ts` for that convention and why it is not a bare package
 * name. Registering this package registers all eight of its services
 * (`dist/index.js:5-17` hardcodes them into
 * `ModuleProvider(Modules.PAYMENT, { services })`), unconditionally; there is
 * no supported option to subset them --
 * `node_modules/@medusajs/modules-sdk/dist/loaders/module-provider-loader.js:32-35`
 * throws on an empty `services` and then maps over all of them with no filter.
 *
 * `payment_method_types` is deliberately never set here: the default
 * provider's `paymentIntentOptions` getter returns `{}`
 * (`dist/services/stripe-provider.js:12`), and
 * `dist/core/stripe-base.js:34-45` sends `payment_method_types` to Stripe only
 * when session data or `paymentIntentOptions` supplies it.
 */
export function stripePaymentModule(config: StripeConfig) {
  return {
    resolve: "@medusajs/medusa/payment",
    options: {
      providers: [
        {
          resolve: "@medusajs/medusa/payment-stripe",
          id: STRIPE_PROVIDER_INSTANCE_ID,
          options: {
            apiKey: config.apiKey,
            webhookSecret: config.webhookSecret,
            capture: true,
            automaticPaymentMethods: true,
            paymentMethodConfiguration: config.paymentMethodConfiguration,
          },
        },
      ],
    },
  } as const;
}
