"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { emitAnalyticsEvent, loadAnalyticsVendors, mayLoadAnalyticsForPath, setAnalyticsEnabled, type AnalyticsVendorConfig } from "../../lib/analytics";
import { CONSENT_STORAGE_KEY, parseStoredConsent, serialiseConsent, type ConsentDecision } from "../../lib/consent";

export type ConsentManagerProps = AnalyticsVendorConfig;

/** The hydrated boundary between an explicit choice and any vendor resource. */
export function ConsentManager({ googleTagId, metaPixelId }: ConsentManagerProps) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [decision, setDecision] = useState<ConsentDecision | null>(null);
  const [open, setOpen] = useState(false);

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
    if (!ready || decision !== "granted" || !mayLoadAnalyticsForPath(pathname)) {
      setAnalyticsEnabled(false);
      return;
    }
    setAnalyticsEnabled(true);
    const unload = loadAnalyticsVendors({ googleTagId, metaPixelId });
    if (window.location.pathname === "/") emitAnalyticsEvent("landing_view", { routeClass: "landing" });
    return () => {
      setAnalyticsEnabled(false);
      unload();
    };
  }, [decision, googleTagId, metaPixelId, pathname, ready]);

  useEffect(() => {
    if (!ready || decision !== "granted") return;
    const handler = (event: Event): void => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const boundary = target.closest<HTMLElement>("[data-analytics-event]");
      if (boundary === null) return;
      if ((event.type === "click" && boundary.tagName !== "A") || (event.type === "submit" && boundary.tagName !== "FORM")) return;
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
    try { window.localStorage.setItem(CONSENT_STORAGE_KEY, serialiseConsent(next)); } catch { /* storage is optional */ }
    setDecision(next);
    setOpen(false);
  }

  function revoke(): void {
    try { window.localStorage.setItem(CONSENT_STORAGE_KEY, serialiseConsent("declined")); } catch { /* refusal still works */ }
    setAnalyticsEnabled(false);
    setDecision("declined");
    setOpen(true);
  }

  if (!ready) return null;
  return (
    <aside className="consent-manager" aria-label="Analytics preferences">
      {open ? (
        <div className="consent-manager-dialog" role="dialog" aria-labelledby="analytics-consent-title">
          <p id="analytics-consent-title">May we use Google Analytics and Meta Pixel for the site&apos;s fixed, non-personal purchase funnel? They stay off unless you agree.</p>
          <p className="fine-print"><a href="/legal/privacy">Read the Privacy policy</a>.</p>
          <p className="consent-manager-actions">
            <button className="button is-primary" type="button" onClick={() => choose("granted")}>Agree</button>
            <button className="button is-secondary" type="button" onClick={() => choose("declined")}>Refuse</button>
          </p>
        </div>
      ) : <button className="consent-manager-control" type="button" onClick={() => setOpen(true)}>Privacy choices</button>}
      {decision === "granted" && !open ? <button className="consent-manager-control" type="button" onClick={revoke}>Stop analytics</button> : null}
    </aside>
  );
}
