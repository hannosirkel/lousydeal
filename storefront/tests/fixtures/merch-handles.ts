/**
 * The four handles, written out once.
 *
 * **Hand-written rather than imported from the backend.** The storefront
 * cannot import `backend/src/modules/printful/catalogue.ts`, and a test that
 * derived this list from the same place the code does would agree with the
 * code about a mistake. `backend/tests/merch-seed.test.ts` pins the catalogue
 * end; this pins the storefront's.
 */
export const MERCH_CATALOGUE_HANDLES = [
  "original-purchase-receipt",
  "this-mug-cost-extra",
  "lousy-deals-trucker-cap",
  "certified-worthless",
] as const;
