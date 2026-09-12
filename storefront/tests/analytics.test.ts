import { describe, expect, it, vi } from "vitest";

import {
  ANALYTICS_EVENT_NAMES,
  emitAnalyticsEvent,
  mayLoadAnalyticsForPath,
  sanitiseAnalyticsPayload,
  setAnalyticsEnabled,
  setAnalyticsTransport,
} from "../src/lib/analytics";
import { CONSENT_STORAGE_KEY, parseStoredConsent, serialiseConsent } from "../src/lib/consent";

describe("analytics consent storage", () => {
  it("accepts only the one versioned first-party preference value", () => {
    expect(CONSENT_STORAGE_KEY).toBe("lousydeal.analytics-consent.v1");
    expect(parseStoredConsent(serialiseConsent("granted"))).toBe("granted");
    expect(parseStoredConsent(serialiseConsent("declined"))).toBe("declined");
    expect(parseStoredConsent("granted")).toBeNull();
    expect(parseStoredConsent("v0:granted")).toBeNull();
  });
});

describe("the fixed analytics boundary", () => {
  it("exposes exactly the approved funnel names", () => {
    expect(ANALYTICS_EVENT_NAMES).toEqual([
      "landing_view",
      "tier_selected",
      "baldrick_opened",
      "baldrick_intent",
      "bad_discount_issued",
      "bad_discount_accepted",
      "gift_selected",
      "merch_added",
      "checkout_started",
      "purchase_completed",
      "certificate_shared",
    ]);
  });

  it("keeps only fixed route class, product handle, currency and integer money", () => {
    expect(
      sanitiseAnalyticsPayload({
        routeClass: "certificate",
        productHandle: "lousy-deal",
        currency: "usd",
        amount: 500,
        href: "/done-deals/secret-slug?token=secret",
        title: "Certificate 001",
        serial: "LD-001",
        formData: "a person's email address",
      }),
    ).toEqual({ route_class: "certificate", product_handle: "lousy-deal", currency: "USD", amount: 500 });
  });

  it("does not load vendor code on certificate or withdrawal pages carrying private URL state", () => {
    expect(mayLoadAnalyticsForPath("/done-deals/unguessable-slug")).toBe(false);
    expect(mayLoadAnalyticsForPath("/legal/withdraw")).toBe(false);
    expect(mayLoadAnalyticsForPath("/checkout")).toBe(true);
  });

  it("rejects unknown events and remains non-fatal when vendors throw", () => {
    const transport = vi.fn(() => {
      throw new Error("blocked");
    });
    setAnalyticsEnabled(true);
    setAnalyticsTransport(transport);

    expect(emitAnalyticsEvent("not_an_event", { href: "/private?value=one" })).toBe(false);
    expect(() => emitAnalyticsEvent("checkout_started", { currency: "usd", amount: 500 })).not.toThrow();
    expect(transport).toHaveBeenCalledWith("checkout_started", { currency: "USD", amount: 500 });

    setAnalyticsEnabled(false);
    setAnalyticsTransport(null);
  });
});
