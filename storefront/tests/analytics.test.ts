import { describe, expect, it, vi } from "vitest";

import {
  ANALYTICS_EVENT_NAMES,
  emitAnalyticsEvent,
  mountAnalyticsFrame,
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

  it("does not retain unconsented interactions for replay after acceptance", () => {
    const events: string[] = [];
    setAnalyticsEnabled(false);
    setAnalyticsTransport((name) => { events.push(name); });
    expect(emitAnalyticsEvent("bad_discount_issued")).toBe(false);
    setAnalyticsEnabled(true);
    emitAnalyticsEvent("certificate_shared");
    expect(events).toEqual(["certificate_shared"]);
    setAnalyticsEnabled(false);
    setAnalyticsTransport(null);
  });
});

/**
 * A document that records instead of rendering.
 *
 * **`mountAnalyticsFrame` takes its document as an argument, and that is what
 * makes the mount assertable here.** The storefront project is
 * `environment: "node"`; buying a DOM implementation to read four properties
 * off one element would be a dependency argued for by a single test, and
 * `analytics-frame.test.ts` already drives the frame's own script this way.
 *
 * What it is for: the static scan in `third-party-disclosure.test.ts` proves no
 * file outside the frame *names* a vendor, and the guard beside it proves no
 * file outside `ConsentManager` mounts one. Neither can say what the mount
 * actually does. This does -- and the first assertion is the one that matters,
 * because a `createElement("script")` added to this function would be the
 * page-context leak the whole design exists to prevent.
 */
function harness() {
  const posted: unknown[] = [];
  const created: string[] = [];
  const appended: unknown[] = [];
  const contentWindow = { postMessage: (message: unknown) => { posted.push(message); } };
  const tokens = new Set<string>();
  const frame: Record<string, unknown> = {
    sandbox: { add: (token: string) => tokens.add(token) },
    contentWindow,
    remove: () => { frame.removed = true; },
    removed: false,
  };
  let listener: (event: unknown) => void = () => undefined;

  const document = {
    createElement: (tag: string) => { created.push(tag); return frame; },
    body: { append: (element: unknown) => { appended.push(element); } },
    defaultView: {
      addEventListener: (_type: string, fn: (event: unknown) => void) => { listener = fn; },
      removeEventListener: () => { listener = () => undefined; },
    },
  };

  const mounted = mountAnalyticsFrame(
    { googleTagId: "G-EXAMPLE", metaPixelId: "123456789" },
    document as unknown as Document,
  );

  return {
    appended,
    created,
    frame,
    mounted,
    posted,
    tokens,
    ready: () => { listener({ source: contentWindow, data: { kind: "lousydeal.analytics.ready" } }); },
  };
}

describe("the mount, which is the only way a vendor can reach a page", () => {
  it("creates one sandboxed first-party iframe and never a script element", () => {
    const probe = harness();
    // An `iframe` and nothing else. A second entry here -- above all a
    // "script" -- is a vendor running in the storefront's own origin.
    expect(probe.created).toEqual(["iframe"]);
    expect([...probe.tokens]).toEqual(["allow-scripts"]);
    expect(probe.frame.src).toBe("/analytics/frame");
    expect(probe.frame.referrerPolicy).toBe("no-referrer");
    expect(probe.frame.hidden).toBe(true);
    expect(probe.appended).toEqual([probe.frame]);
  });

  it("sends nothing at all until the frame says it is ready", () => {
    const probe = harness();
    probe.mounted.emit("checkout_started", { currency: "USD", amount: 500 });
    expect(probe.posted).toEqual([]);

    probe.ready();
    // Configuration first, then what was queued -- so an account id never
    // arrives after the events it is supposed to scope.
    expect(probe.posted).toEqual([
      { kind: "lousydeal.analytics.configure", googleTagId: "G-EXAMPLE", metaPixelId: "123456789" },
      { kind: "lousydeal.analytics", name: "checkout_started", payload: { currency: "USD", amount: 500 } },
    ]);
  });

  it("goes silent and removes itself when the choice is withdrawn", () => {
    const probe = harness();
    probe.ready();
    probe.mounted.destroy();
    probe.mounted.emit("purchase_completed", {});
    // One message ever: the configure from before the revocation. Nothing the
    // visitor did afterwards reached anybody.
    expect(probe.posted).toHaveLength(1);
    expect(probe.frame.removed).toBe(true);
  });
});
