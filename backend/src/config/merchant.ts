/**
 * The trader's identity, as the confirmation email must state it.
 *
 * **The storefront already reads these six**, from the same variable names, in
 * `storefront/src/config/runtime-config.ts`. This is a second reader and not a
 * second source: decision `004` puts the identity in runtime configuration
 * precisely so that neither workspace carries it as a literal, and Orange
 * injects it into both from one private inventory.
 *
 * **The two readers differ in what they do with an absence, and they should.**
 * The storefront renders a named visible gap — `[LEGAL NAME NOT CONFIGURED]` —
 * because a page missing a detail is still a page, and saying so is better than
 * a blank. An email is not: VÕS § 55(2) requires the confirmation to carry the
 * § 54(1) information, and a confirmation that says
 * `[LEGAL NAME NOT CONFIGURED]` has not given it. So this returns `null` for an
 * incomplete identity and `order-confirmation.ts` refuses to build a message
 * from one — a confirmation that is not sent is a duty unperformed and
 * recoverable; a confirmation that is sent and deficient is a duty performed
 * badly, which is worse and cannot be taken back.
 */

import { type Environment, optionalEnv } from "./env";

/** Every field § 54(1) and § 55(2) need the confirmation to carry. */
export interface MerchantIdentity {
  readonly legalName: string;
  readonly address: string;
  readonly email: string;
  readonly registryCode: string;
  readonly vatNumber: string;
  readonly phoneNumber: string;
}

/** The variable behind each field, spelled as the storefront and Orange spell them. */
export const MERCHANT_ENVIRONMENT_VARIABLES = {
  legalName: "MERCHANT_LEGAL_NAME",
  address: "MERCHANT_ADDRESS",
  email: "MERCHANT_EMAIL",
  registryCode: "MERCHANT_REGISTRY_CODE",
  vatNumber: "MERCHANT_VAT_NUMBER",
  phoneNumber: "MERCHANT_PHONE_NUMBER",
} as const;

/**
 * The identity, or `null` if any part of it is missing.
 *
 * **All six or none**, and unlike `readSmtpRuntimeConfig` a partial set does
 * not throw. The difference is what a partial set means: half a mail
 * configuration is a mistake nobody makes on purpose and cannot be worked
 * around, whereas the identity is genuinely absent in a deployment Orange has
 * not yet patched — which both environments were until 2026-09-06, and which a
 * developer's own checkout still is. Refusing to boot on it would make the
 * backend unrunnable locally to protect an email that is not being sent.
 */
export function readMerchantIdentity(environment: Environment): MerchantIdentity | null {
  const read = (field: keyof MerchantIdentity) => optionalEnv(environment, MERCHANT_ENVIRONMENT_VARIABLES[field]);

  const identity = {
    legalName: read("legalName"),
    address: read("address"),
    email: read("email"),
    registryCode: read("registryCode"),
    vatNumber: read("vatNumber"),
    phoneNumber: read("phoneNumber"),
  };

  return Object.values(identity).every((value) => value !== undefined) ? (identity as MerchantIdentity) : null;
}
