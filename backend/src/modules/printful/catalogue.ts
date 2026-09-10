/**
 * The four things this shop prints, written down once.
 *
 * Every later row reads this table. Nothing hard-codes a Printful variant id
 * at a call site, because a number like `4811` means nothing where it is used
 * and everything where it is declared.
 *
 * **Every figure here was measured against the live API on 2026-09-08**, at
 * the per-variant price endpoint — not the bulk price list, which returns rows
 * misaligned with the variant list and would have priced the shirt about four
 * dollars wrong. Costs are variant price *plus* placement, because Printful
 * adds the second to the first.
 *
 * **Money is in cents**, like Medusa's, so a margin assertion compares integers
 * rather than floats.
 */

/** What a variant costs to fulfil, and which Printful variant it is. */
export interface MerchVariant {
  /** Stable within this repository; Medusa's SKU and this table's key. */
  readonly sku: string;
  readonly size: string | null;
  readonly printfulVariantId: number;
  /** Variant technique price plus placement price, in cents. Measured. */
  readonly fulfilmentCost: number;
}

export interface MerchPrintFile {
  /** Under `design/merch/print-files/`, committed so Printful can fetch it. */
  readonly file: string;
  readonly width: number;
  readonly height: number;
  readonly dpi: number;
}

export interface MerchProduct {
  readonly key: string;
  readonly title: string;
  /**
   * What the object actually is, in the plainest words available.
   *
   * **The titles are jokes and a buyer cannot shop from a joke.** "Original
   * Purchase Receipt" is a shirt and "Certified Worthless" is a sticker, and
   * somebody deciding whether to spend $32 needs to know which. This is the
   * line that tells them, and it is deliberately not funny.
   *
   * It lives here rather than in the storefront because deriving it from the
   * handle would be a second source of truth for the same fact.
   */
  readonly kind: string;
  readonly handle: string;
  readonly printfulProductId: number;
  readonly technique: string;
  readonly placement: string;
  readonly printFile: MerchPrintFile;
  /**
   * What a buyer pays, in cents, **VAT included** — decision `007` makes every
   * price on this site tax-inclusive, and `009` has the merchant absorb the
   * VAT rather than add it at checkout.
   */
  readonly retailPrice: number;
  readonly variants: readonly MerchVariant[];
}

/** The operator's rule: fulfilment cost plus this, at least. */
export const MARGIN_FLOOR = 0.25;

/**
 * The highest standard VAT rate this shop can meet, and therefore the rate
 * every price has to survive.
 *
 * Hungary's. Decision `013` sends every intra-EU cross-border sale through
 * Union OSS at the buyer's rate, so a single worldwide price is net of
 * somewhere between 17% and 27% depending on who buys it. Pricing at the
 * Estonian rate would clear the floor at home and quietly miss it abroad —
 * which is what the first two versions of this table did.
 */
export const WORST_VAT_RATE = 0.27;

/**
 * Printful's own VAT on the wholesale leg, which is **not measured yet**.
 *
 * Printful charges VAT on orders it fulfils in Latvia, Spain, the UK and
 * Northern Ireland, and its zero rate applies only where fulfilment happens in
 * the country of the VAT number given — Printful has no Estonian facility, so
 * an Estonian number may never reach it. None of it is recoverable on the
 * Estonian return, and a Directive 2008/9 reclaim is not worth filing at this
 * volume, so it is cost of goods.
 *
 * **21% is Latvia's rate and a placeholder for arithmetic, not a measurement.**
 * `catalogue.test.ts` reports what it would do to every margin rather than
 * asserting against it, because asserting on a guess would be worse than not
 * asserting at all. Decision `013` sends P4 to a real invoice; until one
 * exists this constant exists to make the exposure visible.
 */
export const UNMEASURED_WHOLESALE_VAT_RATE = 0.21;

/**
 * One price across every size.
 *
 * The operator settled this on 2026-09-08 and gave the reason: no customer is
 * charged more for being larger. It costs something — a 3XL costs $19.58 to
 * fulfil and a small $15.58 — and $32 is what clears the floor on the most
 * expensive size at the worst VAT rate. The alternative shapes were a size
 * surcharge, which the operator rejected, and dropping 3XL, which narrows the
 * range to avoid a pricing problem rather than for any reason about the range.
 */
const TEE_SIZES: ReadonlyArray<readonly [string, number, number]> = [
  ["S", 473, 1558],
  ["M", 504, 1558],
  ["L", 535, 1558],
  ["XL", 566, 1745],
  ["2XL", 597, 1758],
  ["3XL", 628, 1958],
];

export const MERCH_CATALOGUE: readonly MerchProduct[] = [
  {
    key: "tee",
    title: "Original Purchase Receipt",
    kind: "T-Shirt",
    handle: "original-purchase-receipt",
    printfulProductId: 12,
    technique: "dtg",
    placement: "front",
    printFile: { file: "tee-front.png", width: 1800, height: 2400, dpi: 150 },
    retailPrice: 3200,
    variants: TEE_SIZES.map(([size, printfulVariantId, fulfilmentCost]) => ({
      sku: `LD-TEE-${size}`,
      size,
      printfulVariantId,
      fulfilmentCost,
    })),
  },
  {
    key: "mug",
    title: "This Mug Cost Extra",
    kind: "Mug",
    handle: "this-mug-cost-extra",
    printfulProductId: 19,
    technique: "sublimation",
    placement: "default",
    printFile: { file: "mug-wrap.png", width: 2700, height: 1050, dpi: 300 },
    retailPrice: 1500,
    variants: [{ sku: "LD-MUG-11", size: "11 oz", printfulVariantId: 1320, fulfilmentCost: 895 }],
  },
  {
    key: "cap",
    title: "Lousy Deals Trucker Cap",
    kind: "Trucker Cap",
    handle: "lousy-deals-trucker-cap",
    printfulProductId: 100,
    // DTF, not embroidery, and the reason is the copy: "I make my Lousy Deals
    // at lousydeal.com" is 38 characters, which embroidery cannot render
    // legibly at cap-front size. The v1 mockup generator lists only this
    // product's embroidery placements, which reads like a restriction and is
    // not one -- `/store/products` accepts `front_dtf_hat`, measured.
    technique: "dtfilm",
    placement: "front_dtf_hat",
    printFile: { file: "cap-front.png", width: 1890, height: 765, dpi: 300 },
    retailPrice: 2900,
    variants: [{ sku: "LD-CAP-OS", size: "One size", printfulVariantId: 4811, fulfilmentCost: 1810 }],
  },
  {
    key: "sticker",
    title: "Certified Worthless",
    kind: "Sticker",
    handle: "certified-worthless",
    printfulProductId: 358,
    technique: "digital",
    placement: "default",
    printFile: { file: "sticker.png", width: 1200, height: 1200, dpi: 300 },
    retailPrice: 600,
    variants: [{ sku: "LD-STK-4", size: '4″×4″', printfulVariantId: 10164, fulfilmentCost: 325 }],
  },
];

/** Every variant in the catalogue, flattened, with its product beside it. */
export function merchVariants(): ReadonlyArray<{ product: MerchProduct; variant: MerchVariant }> {
  return MERCH_CATALOGUE.flatMap((product) => product.variants.map((variant) => ({ product, variant })));
}

/**
 * What the merchant keeps on one sale, in cents, at a given VAT rate.
 *
 * The price is VAT-inclusive, so the merchant's revenue is the price divided
 * by one plus the rate — not the price minus the rate, which is the arithmetic
 * error that cost the first two versions of this table their margins.
 */
export function netRevenue(retailPrice: number, vatRate: number): number {
  return retailPrice / (1 + vatRate);
}

/** Realised margin over fulfilment cost, as a fraction. */
export function margin(retailPrice: number, fulfilmentCost: number, vatRate: number): number {
  return (netRevenue(retailPrice, vatRate) - fulfilmentCost) / fulfilmentCost;
}

/** A variant's Printful identity, for P5 and P8. Never assembled at a call site. */
export function printfulLineFor(sku: string): {
  readonly catalogVariantId: number;
  readonly technique: string;
  readonly placement: string;
  readonly printFile: MerchPrintFile;
} | null {
  for (const product of MERCH_CATALOGUE) {
    const variant = product.variants.find((candidate) => candidate.sku === sku);
    if (variant === undefined) continue;
    return {
      catalogVariantId: variant.printfulVariantId,
      technique: product.technique,
      placement: product.placement,
      printFile: product.printFile,
    };
  }
  return null;
}
