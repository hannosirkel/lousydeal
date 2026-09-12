/** The sole, versioned browser preference used for optional analytics. */
export type ConsentDecision = "granted" | "declined";

export const CONSENT_STORAGE_KEY = "lousydeal.analytics-consent.v1";

const STORAGE_VERSION = "v1";

export function serialiseConsent(decision: ConsentDecision): string {
  return `${STORAGE_VERSION}:${decision}`;
}

/** Malformed, old, or absent values deliberately ask again rather than load a vendor. */
export function parseStoredConsent(value: string | null | undefined): ConsentDecision | null {
  if (value === serialiseConsent("granted")) return "granted";
  if (value === serialiseConsent("declined")) return "declined";
  return null;
}
