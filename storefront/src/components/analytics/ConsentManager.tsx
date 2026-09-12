"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { emitAnalyticsEvent, mountAnalyticsFrame, setAnalyticsEnabled, setAnalyticsTransport, type AnalyticsVendorConfig } from "../../lib/analytics";
import { CONSENT_STORAGE_KEY, parseStoredConsent, serialiseConsent, type ConsentDecision } from "../../lib/consent";

export type ConsentManagerProps = AnalyticsVendorConfig;

/** The hydrated boundary between an explicit choice and any vendor resource. */
export function ConsentManager({ googleTagId, metaPixelId }: ConsentManagerProps) {
  const [ready, setReady] = useState(false);
  const [decision, setDecision] = useState<ConsentDecision | null>(null);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const stop = useRef<(() => void) | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const control = useRef<HTMLButtonElement>(null);
  const focusRequested = useRef(false);

  useEffect(() => {
    try {
      const stored = parseStoredConsent(window.localStorage.getItem(CONSENT_STORAGE_KEY));
      setDecision(stored);
      setOpen(stored === null);
    } catch {
      setOpen(true);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready || decision !== "granted" || (googleTagId === null && metaPixelId === null)) {
      return;
    }
    const frame = mountAnalyticsFrame({ googleTagId, metaPixelId });
    setAnalyticsTransport((name, payload) => { frame.emit(name, payload); });
    setAnalyticsEnabled(true);
    const destroy = () => {
      setAnalyticsTransport(null);
      setAnalyticsEnabled(false);
      frame.destroy();
    };
    stop.current = destroy;
    return () => { destroy(); stop.current = null; };
  }, [decision, googleTagId, metaPixelId, ready]);

  useEffect(() => {
    if (ready && decision === "granted" && pathname === "/") emitAnalyticsEvent("landing_view", { routeClass: "landing" });
  }, [decision, pathname, ready]);

  useEffect(() => {
    if (!focusRequested.current) return;
    if (open) panel.current?.focus();
    else control.current?.focus();
    focusRequested.current = false;
  }, [open]);

  useEffect(() => {
    if (!ready || decision !== "granted") return;
    const handler = (event: Event): void => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const boundary = target.closest<HTMLElement>("[data-analytics-event]");
      if (boundary === null) return;
      if (event.type === "click" && boundary.tagName !== "A") return;
      if (event.type === "submit" && (boundary.tagName !== "FORM" || !["tier_selected", "checkout_started"].includes(boundary.dataset.analyticsEvent ?? ""))) return;
      emitAnalyticsEvent(boundary.dataset.analyticsEvent ?? "", {
        routeClass: boundary.dataset.analyticsRouteClass,
        productHandle: boundary.dataset.analyticsProductHandle,
        currency: boundary.dataset.analyticsCurrency,
        amount: boundary.dataset.analyticsAmount === undefined ? undefined : Number(boundary.dataset.analyticsAmount),
      });
    };
    document.addEventListener("click", handler, true);
    document.addEventListener("submit", handler, true);
    return () => {
      document.removeEventListener("click", handler, true);
      document.removeEventListener("submit", handler, true);
    };
  }, [decision, ready]);

  function choose(next: ConsentDecision): void {
    if (next === "declined") stop.current?.();
    try { window.localStorage.setItem(CONSENT_STORAGE_KEY, serialiseConsent(next)); } catch { /* storage is optional */ }
    setDecision(next);
    focusRequested.current = true;
    setOpen(false);
  }

  function revoke(): void {
    stop.current?.();
    try { window.localStorage.setItem(CONSENT_STORAGE_KEY, serialiseConsent("declined")); } catch { /* refusal still works */ }
    setAnalyticsTransport(null);
    setAnalyticsEnabled(false);
    setDecision("declined");
    focusRequested.current = true;
    setOpen(true);
  }

  if (!ready) return null;
  return (
    <aside className="consent-manager" aria-label="Analytics preferences">
      {open ? (
        <div ref={panel} tabIndex={-1} className="consent-manager-dialog" role="dialog" aria-labelledby="analytics-consent-title">
          <p id="analytics-consent-title">May we use Google Analytics and Meta Pixel to measure the shop&apos;s purchase steps? They receive limited events and browser/network information. They stay off unless you agree.</p>
          <p className="fine-print"><a href="/legal/privacy">Read the Privacy policy</a>.</p>
          <p className="consent-manager-actions">
            <button className="button is-primary" type="button" onClick={() => choose("granted")}>Agree</button>
            <button className="button is-secondary" type="button" onClick={() => choose("declined")}>Refuse</button>
          </p>
        </div>
      ) : <button ref={control} className="consent-manager-control" type="button" onClick={() => { focusRequested.current = true; setOpen(true); }}>Privacy choices</button>}
      {decision === "granted" && !open ? <button className="consent-manager-control" type="button" onClick={revoke}>Stop analytics</button> : null}
    </aside>
  );
}
