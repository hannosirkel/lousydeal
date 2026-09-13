import { ANALYTICS_FRAME_TITLE } from "./analytics-frame";

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
const enabledListeners = new Set<() => void>();

const ROUTE_CLASSES = new Set<NonNullable<AnalyticsPayload["route_class"]>>([
  "landing", "tier", "goods", "cart", "checkout", "certificate", "withdrawal", "legal", "other",
]);
const HANDLE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function setAnalyticsEnabled(next: boolean): void {
  const changed = enabled !== next;
  enabled = next;
  if (changed && next) for (const listener of enabledListeners) listener();
}

/** Registers a currently visible surface, never past interaction history. */
export function onAnalyticsEnabled(listener: () => void): () => void {
  enabledListeners.add(listener);
  if (enabled) listener();
  return () => { enabledListeners.delete(listener); };
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
  if (typeof input.productHandle === "string" && input.productHandle.length <= 80 && HANDLE.test(input.productHandle)) payload.product_handle = input.productHandle;
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

/** Mounts vendors in an opaque, revocable document instead of the storefront window. */
export function mountAnalyticsFrame(config: AnalyticsVendorConfig, document: Document = window.document): { emit: AnalyticsTransport; destroy(): void } {
  const frame = document.createElement("iframe");
  frame.sandbox.add("allow-scripts");
  frame.referrerPolicy = "no-referrer";
  frame.title = ANALYTICS_FRAME_TITLE;
  frame.hidden = true;
  frame.src = "/analytics/frame";
  let live = true;
  let ready = false;
  const queued: { kind: string; name: AnalyticsEventName; payload: AnalyticsPayload }[] = [];
  const send = (message: unknown): void => {
    try { frame.contentWindow?.postMessage(message, "*"); } catch { /* optional measurement */ }
  };
  const initialise = (event: MessageEvent): void => {
    if (!live || ready || event.source !== frame.contentWindow || event.data?.kind !== "lousydeal.analytics.ready") return;
    ready = true;
    send({ kind: "lousydeal.analytics.configure", ...config });
    for (const message of queued.splice(0)) send(message);
  };
  document.defaultView?.addEventListener("message", initialise);
  try { document.body.append(frame); } catch { live = false; }
  return {
    emit(name, payload) {
      if (!live) return;
      const message = { kind: "lousydeal.analytics", name, payload };
      if (ready) send(message);
      else if (queued.length < 100) queued.push(message);
    },
    destroy() {
      live = false;
      queued.length = 0;
      document.defaultView?.removeEventListener("message", initialise);
      frame.remove();
    },
  };
}
