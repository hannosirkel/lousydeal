/**
 * The address a parcel goes to, and the rules the checkout applies to it.
 *
 * **Separate from `gift.ts` on purpose.** A gift recipient's address is an
 * email address and is used once; this is a postal address, used by a courier,
 * and the two have nothing in common but the word. LD-03's §6 privacy work
 * covers the first; P11 covers this one.
 *
 * **Only asked for when something is being posted.** A form that asked
 * everyone for a postcode in order to sell them a PDF would be collecting data
 * it does not need — the principle LD-02 applied to the certificate's fields
 * and LD-03 to the gift's.
 */

/** In the shape `GIFT_LIMITS` uses. Postal fields, so generous rather than tight. */
export const ADDRESS_LIMITS = {
  name: 60,
  line1: 120,
  city: 60,
  postcode: 20,
  province: 60,
} as const;

export interface ShippingAddressInput {
  readonly name: string;
  readonly line1: string;
  readonly city: string;
  readonly postcode: string;
  /** Empty where the country does not use one. */
  readonly province: string;
}

export const EMPTY_SHIPPING_ADDRESS: ShippingAddressInput = {
  name: "",
  line1: "",
  city: "",
  postcode: "",
  province: "",
};

/**
 * Countries whose addresses Printful will not quote without a subdivision.
 *
 * Measured on 2026-09-08: the United States and Australia answer "State code
 * is missing", and Japan asks for a prefecture. The list is short because it is
 * what was observed, not what might be true — a country added here on a guess
 * would block a checkout nobody could complete.
 */
export const PROVINCE_REQUIRED_COUNTRIES: readonly string[] = ["US", "AU", "CA", "JP"];

export function needsProvince(countryCode: string): boolean {
  return PROVINCE_REQUIRED_COUNTRIES.includes(countryCode.trim().toUpperCase());
}

/**
 * Which fields are missing, in the order they appear on the form.
 *
 * Returns the field names rather than a boolean so the page can say *which*,
 * and so the pay control's own gate and the message a buyer reads cannot
 * disagree about it.
 */
export function missingAddressFields(
  address: ShippingAddressInput,
  countryCode: string,
): readonly (keyof ShippingAddressInput)[] {
  const missing: (keyof ShippingAddressInput)[] = [];
  for (const field of ["name", "line1", "city", "postcode"] as const) {
    if (address[field].trim().length === 0) missing.push(field);
  }
  if (needsProvince(countryCode) && address.province.trim().length === 0) missing.push("province");
  return missing;
}

/** Whether this cart can be paid for, as far as the address is concerned. */
export function addressComplete(address: ShippingAddressInput, countryCode: string): boolean {
  return missingAddressFields(address, countryCode).length === 0;
}
