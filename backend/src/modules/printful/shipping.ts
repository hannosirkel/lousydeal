/**
 * What it costs to post something, quoted live and never guessed.
 *
 * Printful answers `POST /v2/shipping-rates` for every destination LD-04 tried
 * — Estonia to Brazil, in one request, with the real artwork URL in the
 * payload. So the shop does not need a rate table, a zone map, or a flat
 * charge that is wrong everywhere except one place.
 *
 * **A failed rate call does not produce a number.** §11 forbids a fabricated
 * figure and §23 requires the final price to be explicit, so this throws and
 * the checkout says the rate could not be fetched. A guessed shipping charge
 * is the one thing worse than a slow checkout: it is a price the buyer did not
 * agree to, arrived at by a machine that did not know.
 *
 * **The quote is grossed up, and that is not a markup.** Decision `013`, and
 * Art 78(b) with it: transport charged to the customer is inside the taxable
 * amount, and decision `007` makes every price on this site VAT-inclusive. So
 * a $5.22 rate shown at $5.22 nets $4.11 after VAT while Printful charges the
 * full $5.22 — the pass-through quietly loses about a fifth of itself on every
 * order. Grossing up recovers exactly Printful's charge and no more. The buyer
 * still sees one number and pays exactly that number, which is all
 * `PRICE_NOTICE` promises.
 *
 * **Only for an EU destination.** An export bears no EU VAT, so grossing up a
 * parcel to Brazil would be charging a tax nobody owes. `WORST_VAT_RATE` is
 * used rather than the buyer's own, for the same reason the shelf prices are
 * derived at it: one number, safe everywhere, and no rate table to go stale.
 * It over-recovers by at most ten points against a buyer in Luxembourg, which
 * is the direction that cannot hurt anybody.
 */

import { EU_MEMBER_STATE_CODES } from "../../commerce/tax-model";
import { WORST_VAT_RATE, printfulLineFor } from "./catalogue";
import type { PrintfulClient } from "./client";

export interface ShippingAddress {
  readonly address1: string;
  readonly city: string;
  readonly countryCode: string;
  readonly postcode: string;
  /**
   * Required by Printful for some countries and refused for others.
   * Measured 2026-09-08: the United States and Australia answer "State code is
   * missing" without one, and Japan asks for a prefecture.
   */
  readonly stateCode?: string | undefined;
}

/** One merch line to be posted, by the SKU `catalogue.ts` declares. */
export interface ShippingLine {
  readonly sku: string;
  readonly quantity: number;
}

export interface ShippingQuote {
  /** Printful's own identifier for the service. */
  readonly id: string;
  readonly name: string;
  /** Minor units, VAT-inclusive, what the buyer is charged. */
  /** Major units, like every other amount on this path. See `chargeForRate`. */
  readonly amount: number;
  /** Printful's estimate, repeated and attributed; `null` where it gave none. */
  readonly minDeliveryDays: number | null;
  readonly maxDeliveryDays: number | null;
  /**
   * Where Printful says it will dispatch from, in ISO-2, or `null`.
   *
   * **This was assumed unknowable and is not.** Decision `013` reasons about
   * Latvia- and Spain-dispatched orders in the abstract because Printful's
   * routing is not controllable — which is true, and turns out to be a
   * different thing from not being *knowable*. Printful states the departure
   * country in the rate response, before the buyer has paid, and that is the
   * fact the whole VAT treatment turns on.
   *
   * P14 uses it; nothing in this row does. It is captured here because the
   * only place it exists is the quote.
   */
  readonly departsFrom: string | null;
  /**
   * Whether Printful thinks customs charges are possible on this route.
   *
   * §54(1) requires import charges to be disclosed before the ordering process
   * begins where the trader does not collect them. A blanket warning on every
   * order would be true of almost none of them; this makes the disclosure a
   * fact about the parcel.
   */
  readonly customsFeesPossible: boolean | null;
}

/**
 * Printful's answer, in the field names it actually uses.
 *
 * **Read off a live response, not guessed.** The first draft of this module
 * read `id` and `name`, dropped every option, and refused every quote —
 * Printful calls them `shipping` and `shipping_method_name`. The unit tests
 * agreed with the guess, because the fixtures were written from it.
 */
interface RateResponse {
  readonly data?: ReadonlyArray<{
    readonly shipping?: unknown;
    readonly shipping_method_name?: unknown;
    readonly rate?: unknown;
    readonly currency?: unknown;
    readonly min_delivery_days?: unknown;
    readonly max_delivery_days?: unknown;
    readonly shipments?: ReadonlyArray<{
      readonly departure_country?: unknown;
      readonly customs_fees_possible?: unknown;
    }>;
  }>;
}

export class ShippingQuoteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShippingQuoteError";
  }
}

const number = (value: unknown): number | null => {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
};

/** Whether this destination bears EU VAT at all. */
export function isEuDestination(countryCode: string): boolean {
  return EU_MEMBER_STATE_CODES.includes(countryCode.trim().toUpperCase());
}

/**
 * What the buyer is charged for a rate Printful quoted, **in major units**.
 *
 * Rounded up to the cent. A rounding that went down would leave the merchant a
 * cent short of Printful's charge on some orders, which is the whole failure
 * this function exists to prevent, reached by being tidy.
 *
 * **It returned minor units until P7c, and that was a hundredfold
 * overcharge.** The scale is not a matter of taste. `calculatePrice`'s answer
 * becomes a shipping option's `amount`, and
 * `core-flows/dist/cart/workflows/list-shipping-options-for-cart-with-pricing.js:320-338`
 * builds that field from two branches into one shape: a **flat** option takes
 * it from the pricing module's `calculated_amount`, a **calculated** one takes
 * it from whatever the provider returned. Both write `amount` on the same
 * object, so the two are necessarily on one scale — and
 * `storefront/src/lib/money.ts` establishes which, citing
 * `pricing-module.js:238-240` and the `amountMinor / 100` every price is
 * seeded with. Major units.
 *
 * So a $5.22 rate to Estonia was `Math.ceil(5.22 * 1.27 * 100)` = **663**,
 * which the cart would have read as **$663.00 of postage** and the checkout
 * shown as exactly that. P7a's own test asserted `663` for the untaxed case as
 * correct, so the suite agreed with the bug throughout.
 */
export function chargeForRate(rate: number, countryCode: string): number {
  const gross = isEuDestination(countryCode) ? rate * (1 + WORST_VAT_RATE) : rate;
  // Ceil at the cent, then express in major units. The rounding rule is about
  // money and the scale is about Medusa; doing both in one expression is how
  // the two came to be confused.
  return Math.ceil(gross * 100) / 100;
}

export async function quoteShipping(
  client: PrintfulClient,
  lines: readonly ShippingLine[],
  address: ShippingAddress,
  artworkBaseUrl: string,
): Promise<readonly ShippingQuote[]> {
  if (lines.length === 0) throw new ShippingQuoteError("Nothing to post: shipping was quoted for no lines");

  const items = lines.map((line) => {
    const printful = printfulLineFor(line.sku);
    if (printful === null) throw new ShippingQuoteError(`No Printful line for SKU ${line.sku}`);
    return {
      source: "catalog",
      catalog_variant_id: printful.catalogVariantId,
      quantity: line.quantity,
      placements: [
        {
          placement: printful.placement,
          technique: printful.technique,
          layers: [{ type: "file", url: `${artworkBaseUrl.replace(/\/+$/, "")}/${printful.printFile.file}` }],
        },
      ],
    };
  });

  const response = await client.request<RateResponse>("POST", "/v2/shipping-rates", {
    recipient: {
      address1: address.address1,
      city: address.city,
      country_code: address.countryCode,
      zip: address.postcode,
      ...(address.stateCode === undefined || address.stateCode.length === 0
        ? {}
        : { state_code: address.stateCode }),
    },
    order_items: items,
    currency: "USD",
  });

  const quotes = (response.data ?? []).flatMap((option): ShippingQuote[] => {
    const rate = number(option.rate);
    const id = typeof option.shipping === "string" && option.shipping.length > 0 ? option.shipping : null;
    // An option with no rate or no identity is not a shipping option. Dropping
    // it is safe because the empty-result refusal below is what catches the
    // case where every option was dropped.
    if (rate === null || id === null) return [];

    const shipment = option.shipments?.[0];
    const departure = shipment?.departure_country;
    const customs = shipment?.customs_fees_possible;

    return [
      {
        id,
        // Printful pads its own names ("Flat Rate (Estimated delivery: Sep 14) ")
        // and puts a date inside them. The date is repeated in the delivery
        // fields, so the name is trimmed and otherwise left alone rather than
        // rewritten -- it is Printful's, and this site quotes it as Printful's.
        name:
          typeof option.shipping_method_name === "string" && option.shipping_method_name.trim().length > 0
            ? option.shipping_method_name.trim()
            : id,
        amount: chargeForRate(rate, address.countryCode),
        minDeliveryDays: number(option.min_delivery_days),
        maxDeliveryDays: number(option.max_delivery_days),
        departsFrom: typeof departure === "string" && departure.length > 0 ? departure.toUpperCase() : null,
        customsFeesPossible: typeof customs === "boolean" ? customs : null,
      },
    ];
  });

  if (quotes.length === 0) {
    throw new ShippingQuoteError(`Printful quoted no usable shipping option to ${address.countryCode}`);
  }

  // Cheapest first. § 56¹(3) caps a withdrawal refund at the cheapest ordinary
  // delivery offered, so which one that is has to be a fact about the list
  // rather than about the order Printful happened to return it in.
  return [...quotes].sort((first, second) => first.amount - second.amount);
}
