/**
 * The shipping option Medusa can actually charge for.
 *
 * A quote is not a charge. P7 asks Printful what postage costs; this is what
 * turns that answer into a line on the cart, so Stripe collects it and the
 * order total agrees with what the buyer was shown. §7 lists "fulfillment
 * creation" among the things to handle, and this is the half that makes the
 * fulfilment a real Medusa fulfilment rather than a side effect.
 *
 * **It fulfils nothing.** `createFulfillment` records what Medusa needs and
 * places no Printful order; P8 does that, from the order subscriber, where the
 * idempotency argument lives. A provider that both priced and fulfilled would
 * put the money-spending call inside a method Medusa may retry.
 *
 * **Calculated, not flat.** Printful quotes per address and per parcel — $13.56
 * to Estonia, $25.56 to Brazil, measured — so a flat rate would be wrong
 * everywhere except one place.
 *
 * **This declines Medusa's own advice, deliberately.** Its docstring for
 * `calculatePrice` says: "ensure to handle errors gracefully, such as by
 * falling back to a default price, if you don't want a failure in the
 * third-party service to block checkout." A default price here is a number
 * nobody quoted, charged to a buyer who agreed to it — §11 forbids a
 * fabricated figure and §23 requires the final price to be explicit. So a
 * failed quote blocks the checkout, which is the outcome this shop prefers: a
 * buyer who cannot pay is annoyed, and a buyer charged a made-up postage is
 * misled.
 */

import { AbstractFulfillmentProviderService, ModuleProvider, Modules } from "@medusajs/framework/utils";

import { createPrintfulClient, type PrintfulClient } from "./client";
import { quoteShipping, ShippingQuoteError, type ShippingAddress, type ShippingLine } from "./shipping";

export const PRINTFUL_FULFILMENT_IDENTIFIER = "printful";

/**
 * What Medusa actually registers the provider under, and what a shipping
 * option's `provider_id` has to be.
 *
 * **Not the identifier.** Medusa composes a provider's id from the service's
 * `static identifier` and the `id` given in the module options — its own
 * manual provider ends up as `manual_manual` — so this deployment's is
 * `printful_printful`. Measured against a real database on 2026-09-09:
 * `select id from fulfillment_provider` answers exactly that, and
 * `shipping_option.provider_id` is a foreign key to it.
 *
 * P7b used the bare identifier and the application refused to configure with
 * `Could not resolve 'fp_printful'`. Two names for one thing is one name too
 * many, so the composition is written once, here, beside the identifier it is
 * built from.
 */
export const PRINTFUL_FULFILMENT_PROVIDER_ID = `${PRINTFUL_FULFILMENT_IDENTIFIER}_${PRINTFUL_FULFILMENT_IDENTIFIER}`;

/** The one option this provider offers. Which service is chosen is Printful's. */
export const PRINTFUL_FULFILMENT_OPTION = "printful-standard";

/**
 * What `calculatePrice` needs out of Medusa's context, or `null`.
 *
 * Read defensively and in one place, because the context is assembled by a
 * workflow rather than typed at this boundary: an address may be half-filled
 * while a buyer is still typing, and a cart may hold a certificate with no SKU
 * of ours at all.
 */
export interface ShippingContext {
  readonly address: ShippingAddress;
  readonly lines: readonly ShippingLine[];
}

interface ContextLike {
  readonly shipping_address?: {
    readonly address_1?: unknown;
    readonly city?: unknown;
    readonly country_code?: unknown;
    readonly postal_code?: unknown;
    readonly province?: unknown;
  } | null;
  readonly items?: ReadonlyArray<{
    readonly variant_sku?: unknown;
    readonly quantity?: unknown;
    readonly variant?: { readonly sku?: unknown } | null;
  }> | null;
}

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

export function readShippingContext(context: unknown): ShippingContext | null {
  const cart = context as ContextLike | null | undefined;
  const address = cart?.shipping_address;

  const address1 = text(address?.address_1);
  const city = text(address?.city);
  const countryCode = text(address?.country_code);
  const postcode = text(address?.postal_code);
  // Every one of the four is required by Printful. A partial address is not a
  // cheaper quote, it is a rejected request, and reporting "no price yet" is
  // both true and what the checkout needs while somebody is still typing.
  if (address1 === null || city === null || countryCode === null || postcode === null) return null;

  const lines = (cart?.items ?? []).flatMap((item): ShippingLine[] => {
    const sku = text(item.variant_sku) ?? text(item.variant?.sku);
    const quantity = typeof item.quantity === "number" ? item.quantity : Number(item.quantity);
    // A line with no SKU is the certificate, which is not posted. Skipping it
    // is the mechanism that keeps a certificate out of a shipping quote.
    if (sku === null || !Number.isFinite(quantity) || quantity < 1) return [];
    return [{ sku, quantity }];
  });

  if (lines.length === 0) return null;
  // **`stateCode` was declared above and never read**, so it never reached
  // Printful -- which answers "State code is missing" for the United States
  // and Australia, measured. The checkout demands the province in exactly
  // those countries, marks the field required, and blocks the quote until it
  // is filled; the quote then discarded it and failed. Every US, AU, CA and JP
  // merch checkout showed the unavailable notice. Gate D found it.
  const province = text(address?.province);
  return {
    address: {
      address1,
      city,
      countryCode: countryCode.toUpperCase(),
      postcode,
      ...(province === null ? {} : { stateCode: province }),
    },
    lines,
  };
}

export interface PrintfulFulfilmentOptions {
  readonly apiToken: string;
  readonly artworkBaseUrl: string;
}

export class PrintfulFulfilmentProviderService extends AbstractFulfillmentProviderService {
  static identifier = PRINTFUL_FULFILMENT_IDENTIFIER;

  private readonly client: PrintfulClient;
  private readonly artworkBaseUrl: string;

  constructor(_container: unknown, options: PrintfulFulfilmentOptions, client?: PrintfulClient) {
    super();
    // The client is injectable so a test drives this without a network and
    // without a token, which is the same seam `seed-product.ts` uses.
    this.client = client ?? createPrintfulClient({ token: options.apiToken });
    this.artworkBaseUrl = options.artworkBaseUrl;
  }

  getFulfillmentOptions(): Promise<{ id: string }[]> {
    // One option. Printful chooses the carrier and the service; the buyer
    // chooses whether to buy a mug.
    return Promise.resolve([{ id: PRINTFUL_FULFILMENT_OPTION }]);
  }

  validateFulfillmentData(
    _optionData: Record<string, unknown>,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return Promise.resolve(data);
  }

  validateOption(data: Record<string, unknown>): Promise<boolean> {
    return Promise.resolve(data.id === PRINTFUL_FULFILMENT_OPTION);
  }

  canCalculate(): Promise<boolean> {
    return Promise.resolve(true);
  }

  async calculatePrice(
    _optionData: Record<string, unknown>,
    _data: Record<string, unknown>,
    context: unknown,
  ): Promise<{ calculated_amount: number; is_calculated_price_tax_inclusive: boolean }> {
    const shipping = readShippingContext(context);
    if (shipping === null) {
      throw new ShippingQuoteError("Shipping cannot be priced without a complete address and something to post");
    }

    const quotes = await quoteShipping(this.client, shipping.lines, shipping.address, this.artworkBaseUrl);
    const cheapest = quotes[0];
    // **Unreachable by construction, and kept anyway.** `quoteShipping` throws
    // rather than returning an empty list, so this branch cannot run today —
    // which is why no test drives it, and saying so is better than writing one
    // that pretends to. It is kept because the alternative to a throw here is
    // `calculated_amount: undefined`, which Medusa would read as a price, and
    // the cost of the line is one comparison against a silent zero charge.
    if (cheapest === undefined) throw new ShippingQuoteError("Printful returned no shipping option");

    return {
      calculated_amount: cheapest.amount,
      // Decision `007`: every price on this site includes VAT, and `shipping.ts`
      // grosses the quote up so the net recovers Printful's charge exactly.
      is_calculated_price_tax_inclusive: true,
    };
  }

  createFulfillment(): Promise<{ data: Record<string, unknown>; labels: never[] }> {
    // Deliberately inert, and `labels` is empty rather than absent because
    // Medusa's `CreateFulfillmentResult` requires the key. P8 places the
    // Printful order from the subscriber, where a unique index and Printful's
    // `external_id` make it exactly once. Spending money inside a method
    // Medusa may retry is the failure that argument exists to prevent.
    return Promise.resolve({ data: {}, labels: [] });
  }

  cancelFulfillment(): Promise<Record<string, unknown>> {
    return Promise.resolve({});
  }
}

/**
 * **The default export is a `ModuleProvider`, not the class.**
 *
 * Medusa loads a provider module and reads `services` off it —
 * `modules-sdk/dist/loaders/utils/load-internal.js:185-191` takes
 * `moduleService`, else `services`, else *the module itself*, and then
 * iterates. A bare class satisfies none of those and is not iterable, so the
 * application dies at boot with `moduleProviderServices is not iterable`
 * before any request is served.
 *
 * `@medusajs/fulfillment-manual/dist/index.js` is the shape, and it is four
 * lines: `ModuleProvider(Modules.FULFILLMENT, { services })`.
 *
 * **Nothing caught this for four rows**, and the reason is worth keeping.
 * `fulfilment-module.test.ts` asserts the *configuration object*
 * `config/fulfilment.ts` builds — resolve path, id, options — and every one of
 * those assertions was correct. What it could not assert is that Medusa can
 * load what the path points at. And the provider was never loaded anywhere,
 * because §23 keeps the Printful token out of every deployment: the module is
 * registered only when a token exists, so **the first boot with one was the
 * first boot that could fail**.
 */
export default ModuleProvider(Modules.FULFILLMENT, { services: [PrintfulFulfilmentProviderService] });
