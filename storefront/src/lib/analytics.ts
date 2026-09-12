/** The entire analytics vocabulary. Adding a name here is a product/privacy decision. */
export const ANALYTICS_EVENT_NAMES = [
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
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];
export type AnalyticsPayload = Readonly<{
  route_class?: "landing" | "tier" | "goods" | "cart" | "checkout" | "certificate" | "withdrawal" | "legal" | "other";
  product_handle?: string;
  currency?: string;
  amount?: number;
}>;

type AnalyticsTransport = (name: AnalyticsEventName, payload: AnalyticsPayload) => void;

let enabled = false;
let transport: AnalyticsTransport | null = null;

const ROUTE_CLASSES = new Set<NonNullable<AnalyticsPayload["route_class"]>>([
  "landing", "tier", "goods", "cart", "checkout", "certificate", "withdrawal", "legal", "other",
]);
const HANDLE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function setAnalyticsEnabled(next: boolean): void {
  enabled = next;
}

/** Exported for the loader and tests; callers never receive vendor globals. */
export function setAnalyticsTransport(next: AnalyticsTransport | null): void {
  transport = next;
}

export function sanitiseAnalyticsPayload(value: unknown): AnalyticsPayload {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const input = value as Record<string, unknown>;
  const payload: { route_class?: AnalyticsPayload["route_class"]; product_handle?: string; currency?: string; amount?: number } = {};
  if (typeof input.routeClass === "string" && ROUTE_CLASSES.has(input.routeClass as NonNullable<AnalyticsPayload["route_class"]>)) {
    payload.route_class = input.routeClass as NonNullable<AnalyticsPayload["route_class"]>;
  }
  if (typeof input.productHandle === "string" && HANDLE.test(input.productHandle)) payload.product_handle = input.productHandle;
  if (typeof input.currency === "string" && /^[a-zA-Z]{3}$/.test(input.currency)) payload.currency = input.currency.toUpperCase();
  if (typeof input.amount === "number" && Number.isSafeInteger(input.amount) && input.amount >= 0) payload.amount = input.amount;
  return payload;
}

export function emitAnalyticsEvent(name: string, payload: unknown = {}): boolean {
  if (!(ANALYTICS_EVENT_NAMES as readonly string[]).includes(name) || !enabled || transport === null) return false;
  try {
    transport(name as AnalyticsEventName, sanitiseAnalyticsPayload(payload));
  } catch {
    // Analytics must never affect a navigation, a redirect, or a purchase.
  }
  return true;
}

export interface AnalyticsVendorConfig {
  readonly googleTagId: string | null;
  readonly metaPixelId: string | null;
}

/** Sensitive pages are useful without sending their bearer URLs to a vendor. */
export function mayLoadAnalyticsForPath(pathname: string): boolean {
  return !pathname.startsWith("/done-deals/") && pathname !== "/legal/withdraw";
}

declare global {
  interface Window {
    dataLayer?: unknown[][];
    fbq?: MetaPixelQueue;
  }
}

interface MetaPixelQueue {
  (...args: unknown[]): void;
  queue?: unknown[][];
}

/**
 * Loads both vendors only after a granted decision. The vendor calls are made
 * through one defensive transport so an extension, CSP, or vendor outage is a
 * measurement miss and never an application failure.
 */
export function loadAnalyticsVendors(config: AnalyticsVendorConfig, document: Document = window.document): () => void {
  const scripts: HTMLScriptElement[] = [];
  try {
    const google = config.googleTagId;
    if (google !== null) {
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(google)}`;
      document.head.append(script);
      scripts.push(script);
      window.dataLayer ??= [];
      const gtag = (...args: unknown[]): void => { window.dataLayer?.push(args); };
      gtag("js", new Date());
      // No automatic page view or history measurement; only the approved events below are sent.
      gtag("config", google, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      });
      setAnalyticsTransport((name, payload) => gtag("event", name, payload));
    }
    const meta = config.metaPixelId;
    if (meta !== null) {
      const fbq: MetaPixelQueue = window.fbq ?? Object.assign(
        (...args: unknown[]): void => { fbq.queue?.push(args); },
        { queue: [] as unknown[][] },
      );
      window.fbq = fbq;
      fbq("init", meta);
      const script = document.createElement("script");
      script.async = true;
      script.src = "https://connect.facebook.net/en_US/fbevents.js";
      document.head.append(script);
      scripts.push(script);
      const previous = transport;
      setAnalyticsTransport((name, payload) => {
        previous?.(name, payload);
        fbq("trackCustom", name, payload);
      });
    }
  } catch {
    // A failed vendor setup is intentionally indistinguishable from no vendor.
  }
  return () => {
    setAnalyticsTransport(null);
    for (const script of scripts) script.remove();
  };
}
